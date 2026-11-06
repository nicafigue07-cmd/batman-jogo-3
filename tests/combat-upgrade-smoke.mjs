import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

// Only the encounter seed is fixed. Combat state stays read-only and every action
// uses the same keyboard/mouse input as the player.
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true,
  args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'],
});
const errors = [];
let page;
const snapshot = () => page.evaluate(() => window.__gotham.snapshot());
const normalize = angle => Math.atan2(Math.sin(angle), Math.cos(angle));
const horizontal = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const active = state => state.enemies.filter(enemy => enemy.active && enemy.alive);

async function face(target) {
  for (let attempt = 0; attempt < 6; attempt++) {
    const state = await snapshot();
    const desired = Math.atan2(state.position.x - target.x, state.position.z - target.z);
    const difference = normalize(desired - state.cameraYaw);
    if (Math.abs(difference) < .025) return;
    const turn = Math.max(-.8, Math.min(.8, difference));
    await page.mouse.move(320, 280); await page.mouse.down();
    await page.mouse.move(320 - turn / .004, 280, { steps: 2 }); await page.mouse.up();
    await page.waitForTimeout(60);
  }
}
async function walkTo(target, radius = 1.2) {
  await face(target); await page.keyboard.down('KeyW');
  try {
    await page.waitForFunction(({ target, radius }) => {
      const state = window.__gotham.snapshot();
      return state.mode !== 'playing' || Math.hypot(state.position.x - target.x, state.position.z - target.z) < radius;
    }, { target, radius }, { timeout: 60000 });
  } finally { await page.keyboard.up('KeyW'); }
  assert.equal((await snapshot()).mode, 'playing', 'the player survives the approach');
}
async function waitForAttackOpportunity() {
  await page.waitForFunction(() => {
    const s = window.__gotham.snapshot();
    if (s.mode !== 'playing') return true;
    if (s.combat.defenseCooldown > .001) return false;
    const melee = s.enemies.some(e => e.active && e.alive && e.archetype !== 'shooter'
      && (e.attackPhase ?? e.attackState) === 'windup'
      && (e.attackRemaining ?? e.attackTime) > 0 && (e.attackRemaining ?? e.attackTime) < .11
      && Math.hypot(e.position.x - s.position.x, e.position.z - s.position.z) < 4);
    const projectiles = s.hostileProjectileDetails ?? s.projectileDetails ?? [];
    const projectile = projectiles.some(p => {
      const pos = p.position ?? p;
      const velocity = p.velocity;
      const distance = Math.hypot(pos.x - s.position.x, (pos.y ?? s.position.y + 1.4) - s.position.y - 1.4, pos.z - s.position.z);
      const speed = velocity ? Math.hypot(velocity.x, velocity.y, velocity.z) : 22;
      return distance > .7 && distance / speed < .11;
    });
    return melee || projectile;
  }, null, { timeout: 30000 });
}

try {
  await mkdir('test-results', { recursive: true });
  const context = await browser.newContext({ viewport: { width: 640, height: 480 }, deviceScaleFactor: .5, reducedMotion: 'reduce' });
  await context.addInitScript(() => { Date.now = () => 3; });
  page = await context.newPage();
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto(process.env.GOTHAM_URL || 'http://127.0.0.1:5173', { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__gotham?.snapshot().rendererCalls > 0);
  await page.selectOption('#intro-graphics-quality', 'low');
  await page.click('#patrol-button');
  let state = await snapshot();
  assert.equal(state.playStyle, 'patrol');
  assert.ok(active(state).some(e => e.archetype === 'shooter'), 'encounter includes a ranged guard');
  assert.ok(active(state).some(e => e.archetype === 'brawler'), 'encounter includes a melee guard');
  assert.equal(state.combat.focus, 0);
  await page.keyboard.press('KeyB');
  assert.equal((await snapshot()).combat.focus, 0, 'an empty focus bar cannot pay for a finisher');

  const site = state.objectives.find(o => o.id === state.currentObjectiveId);
  await walkTo({ x: site.x, y: site.y, z: site.z + 7 }, 1.2);
  let confirmedParries = 0, protectedHits = 0;
  for (let attempt = 0; attempt < 12; attempt++) {
    state = await snapshot();
    if (state.combat.focus >= 100) break;
    assert.equal(state.mode, 'playing', 'player survives until the focus bar is ready');
    assert.ok(active(state).length > 0, 'at least one enemy remains available for the finisher');
    await waitForAttackOpportunity();
    state = await snapshot();
    const focusBefore = state.combat.focus, healthBefore = state.health;
    await page.keyboard.press('KeyX');
    await page.waitForFunction(({ focusBefore, healthBefore }) => {
      const s = window.__gotham.snapshot();
      return s.mode !== 'playing' || s.combat.focus > focusBefore || s.health < healthBefore || s.combat.defenseCooldown <= .001;
    }, { focusBefore, healthBefore }, { timeout: 10000 });
    state = await snapshot();
    if (state.combat.focus > focusBefore) {
      confirmedParries++;
      if (state.health === healthBefore) protectedHits++;
      assert.ok(state.combat.focus >= Math.min(100, focusBefore + 20), 'confirmed defense earns focus');
      console.log(`PASS parry: focus ${focusBefore} -> ${state.combat.focus}, health ${state.health}`);
    }
  }
  state = await snapshot();
  assert.ok(confirmedParries >= 1, 'at least one actual incoming hit was parried');
  assert.ok(protectedHits >= 1, 'a successful defense prevents an actual incoming hit from damaging health');
  assert.equal(state.combat.focus, 100, 'normal defenses fill the focus bar');

  const target = active(state).sort((a, b) => horizontal(a.position, state.position) - horizontal(b.position, state.position))[0];
  assert.ok(target, 'a valid enemy remains for the finisher');
  const targetHP = target.health;
  if (horizontal(target.position, state.position) > 6.5) {
    await page.keyboard.press('KeyB');
    assert.equal((await snapshot()).combat.focus, 100, 'out-of-range finisher does not spend the bar');
  }
  for (let attempt = 0; attempt < 6; attempt++) {
    state = await snapshot();
    const live = active(state).find(e => e.site === target.site && e.archetype === target.archetype) ?? active(state)[0];
    if (!live || horizontal(live.position, state.position) < 5.5) break;
    await walkTo(live.position, 4.7);
  }
  await page.keyboard.press('KeyB');
  await page.waitForFunction(() => window.__gotham.snapshot().combat.focus === 0, null, { timeout: 5000 });
  state = await snapshot();
  assert.equal(state.combat.lastAttack, 'finisher');
  assert.equal(state.combat.focus, 0, 'a finisher spends exactly one full bar');
  const remainingTarget = state.enemies.find(e => e.active && e.site === target.site && e.archetype === target.archetype);
  assert.ok(!remainingTarget || !remainingTarget.alive || remainingTarget.health <= targetHP - 8, 'finisher applies its damage to a real target');
  await page.keyboard.press('KeyB');
  assert.equal((await snapshot()).combat.focus, 0, 'repeating the button cannot buy a second finisher');
  assert.deepEqual(errors, [], 'no JavaScript or console errors');
  await page.screenshot({ path: 'test-results/combat-upgrade.png' });
  console.log('PASS real telegraphed enemy attacks, parries, focus gain and finisher');
} catch (error) {
  if (page) {
    const { collisionBuildings, buildingStyles, ...state } = await snapshot();
    console.error('COMBAT STATE', JSON.stringify(state));
    await page.screenshot({ path: 'test-results/combat-upgrade-failure.png' });
  }
  throw error;
} finally { await browser.close(); }
