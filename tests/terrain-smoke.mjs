import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

// Runs the street rescue and cape-flight missions using only normal UI and input.
const baseURL = process.env.GOTHAM_URL || 'http://127.0.0.1:5173';
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
  headless: true,
  args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'],
});
const errors = [];
const snapshot = page => page.evaluate(() => window.__gotham.snapshot());
const horizontalDistance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const normalize = angle => Math.atan2(Math.sin(angle), Math.cos(angle));
const objective = state => state.objectives.find(site => site.id === state.currentObjectiveId);
let page;

async function face(target) {
  for (let attempt = 0; attempt < 6; attempt++) {
    const state = await snapshot(page);
    const desired = Math.atan2(state.position.x - target.x, state.position.z - target.z);
    const difference = normalize(desired - state.cameraYaw);
    if (Math.abs(difference) < .02) return;
    const turn = Math.max(-.8, Math.min(.8, difference));
    await page.mouse.move(320, 288);
    await page.mouse.down();
    await page.mouse.move(320 - turn / .004, 288, { steps: 2 });
    await page.mouse.up();
    await page.waitForTimeout(100);
  }
}

async function walkTo(target, radius = 1.2) {
  await face(target);
  await page.keyboard.down('KeyW');
  try {
    await page.waitForFunction(({ target, radius }) => {
      const state = window.__gotham.snapshot();
      return state.mode !== 'playing' || Math.hypot(state.position.x - target.x, state.position.z - target.z) < radius;
    }, { target, radius }, { timeout: 60000 });
  } finally { await page.keyboard.up('KeyW'); }
  const state = await snapshot(page);
  assert.equal(state.mode, 'playing', 'player survives the street approach');
  assert.ok(horizontalDistance(state.position, target) < radius);
  assert.ok(Math.abs(state.position.y - target.y) < .1, 'walking stays on the street');
}

async function selectMission(id) {
  const state = await snapshot(page);
  if (state.mode === 'intro') await page.locator('#missions-button').click();
  else if (state.mode === 'ended') await page.locator('#end-missions-button').click();
  else await page.keyboard.press('KeyM');
  await page.locator(`[data-mission="${id}"]`).click();
  await page.waitForFunction(id => {
    const state = window.__gotham.snapshot();
    return state.mode === 'playing' && state.missionId === id;
  }, id);
}

async function clearEncounter(site) {
  const before = await snapshot(page);
  const guards = before.enemies.filter(enemy => enemy.site === site.id && enemy.alive);
  assert.ok(guards.some(enemy => enemy.boss), 'encounter has its named villain');
  await page.keyboard.press('KeyF');
  assert.equal((await snapshot(page)).currentObjectiveId, site.id, 'living enemies block interaction');
  await page.keyboard.press('KeyZ');
  for (let attempt = 0; attempt < 220; attempt++) {
    const state = await snapshot(page);
    assert.equal(state.mode, 'playing', 'player survives the villain encounter');
    if (!state.enemies.some(enemy => enemy.site === site.id && enemy.alive)) {
      console.log(`PASS ${site.id}: guards and named villain defeated with J/K/Q/Z`);
      return;
    }
    await page.keyboard.press('KeyK');
    await page.keyboard.press('KeyJ');
    await page.keyboard.press('KeyQ');
    await page.keyboard.press('KeyZ');
    await page.waitForTimeout(250);
  }
  assert.fail(`enemies still alive at ${site.id}`);
}

async function rescue() {
  await selectMission('rescue');
  let state = await snapshot(page);
  const site = objective(state);
  assert.deepEqual(site && { x: site.x, y: site.y, z: site.z }, { x: -28, y: 0, z: 112 });
  assert.equal(site.terrain, 'ground');
  assert.equal(state.position.y, 0);
  assert.equal(state.enemies.find(enemy => enemy.site === site.id && enemy.boss).villainId, 'penguin');
  const initialXP = state.profile.xp;
  await walkTo(site);
  await clearEncounter(site);
  await page.keyboard.press('KeyF');
  state = await snapshot(page);
  assert.equal(state.escort?.released, true);
  assert.equal(state.currentObjectiveId, site.id, 'releasing the civilian does not finish the mission');
  assert.deepEqual(state.escort.extraction, { x: -28, y: 0, z: 100 });
  await walkTo(state.escort.extraction);
  await page.waitForFunction(() => {
    const state = window.__gotham.snapshot(), escort = state.escort;
    return escort && Math.hypot(escort.position.x - escort.extraction.x, escort.position.z - escort.extraction.z) < 3.2;
  }, null, { timeout: 60000 });
  await page.keyboard.press('KeyF');
  state = await snapshot(page);
  assert.equal(state.finished, true);
  assert.deepEqual(state.completedMissionIds, ['rescue']);
  assert.equal(state.profile.xp - initialXP, 140);
  assert.ok(state.unlockedArmors.includes('rescue'));
  console.log('PASS street rescue: release, escort, extraction, 140 XP and Rescue armor');
}

async function flight() {
  await selectMission('flight');
  let state = await snapshot(page);
  const initialXP = state.profile.xp;
  assert.deepEqual(state.position, { x: 6, y: 84, z: -168 });
  assert.equal(objective(state).terrain, 'air');
  await page.keyboard.press('KeyF');
  assert.equal((await snapshot(page)).currentObjectiveId, 'flight-gate-1', 'F cannot replace cape flight');
  await page.keyboard.down('Space');
  await page.keyboard.down('KeyW');
  try {
    for (const id of ['flight-gate-1', 'flight-gate-2', 'flight-gate-3']) {
      state = await snapshot(page);
      assert.equal(state.currentObjectiveId, id);
      await face(objective(state));
      await page.waitForFunction(id => {
        const state = window.__gotham.snapshot();
        return state.currentObjectiveId !== id || state.mode !== 'playing';
      }, id, { timeout: 60000 });
      state = await snapshot(page);
      assert.equal(state.mode, 'playing', 'player survives the aerial route');
      assert.equal(state.gliding, true, 'gate is crossed with the cape open');
      assert.equal(state.grappling, false, 'gate is crossed without the grapple');
      assert.ok(state.objectives.find(site => site.id === id).disabled);
      console.log(`PASS ${id}: actual cape crossing at ${JSON.stringify(state.position)}`);
    }
  } finally {
    await page.keyboard.up('KeyW');
    await page.keyboard.up('Space');
  }
  state = await snapshot(page);
  const finale = objective(state);
  assert.equal(finale.id, 'flight-finale');
  assert.equal(finale.terrain, 'roof');
  assert.equal(state.enemies.find(enemy => enemy.site === finale.id && enemy.boss).villainId, 'man-bat');
  await face(finale);
  await page.waitForTimeout(150);
  state = await snapshot(page);
  assert.ok(state.selectedAnchor, 'final rooftop has a reachable grapple anchor');
  await page.keyboard.press('KeyE');
  await page.waitForFunction(() => window.__gotham.snapshot().grappling, null, { timeout: 4000 });
  await page.waitForFunction(() => !window.__gotham.snapshot().grappling, null, { timeout: 60000 });
  state = await snapshot(page);
  assert.ok(Math.hypot(state.position.x - finale.x, state.position.y - finale.y, state.position.z - finale.z) < 5, 'grapple lands on the final rooftop');
  await clearEncounter(finale);
  await page.keyboard.press('KeyF');
  state = await snapshot(page);
  assert.equal(state.finished, true);
  assert.deepEqual(state.completedMissionIds, ['flight']);
  assert.equal(state.profile.xp - initialXP, 180);
  assert.ok(state.profile.completedMissions.includes('flight'));
  console.log('PASS aerial mission: three cape gates, Man-Bat, rooftop landing and 180 XP');
}

try {
  await mkdir('test-results', { recursive: true });
  const context = await browser.newContext({ viewport: { width: 640, height: 480 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto(baseURL, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__gotham?.snapshot().rendererCalls > 0);
  await page.locator('#intro-graphics-quality').selectOption('low');
  if (process.env.GOTHAM_TERRAIN_ONLY !== 'air') await rescue();
  if (process.env.GOTHAM_TERRAIN_ONLY !== 'ground') await flight();
  assert.deepEqual(errors, [], 'no browser exceptions or console errors');
  console.log('PASS terrain smoke');
} catch (error) {
  if (page) {
    const { collisionBuildings, buildingStyles, ...diagnostic } = await snapshot(page);
    console.error('STATE', JSON.stringify(diagnostic));
    await page.screenshot({ path: 'test-results/terrain-failure.png' });
  }
  throw error;
} finally { await browser.close(); }
