import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

const baseURL = process.env.GOTHAM_URL || 'http://127.0.0.1:5173';
// A supported save from the previous version, loaded through normal browser
// storage. No live combat/mission state is injected or changed by this test.
const oldSave = {
  version: 1, xp: 120, completedMissions: ['signals'], equippedArmor: 'tactical',
};
const oldSaveJSON = JSON.stringify(oldSave);
const expectedActions = [
  'grapple', 'attack', 'heavy', 'jump', 'slam', 'dodge', 'interact',
  'batarang', 'smoke', 'crouch', 'takedown', 'parry', 'finisher',
];
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true,
  args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'],
});
const errors = [];
let page;
const snapshot = () => page.evaluate(() => window.__gotham.snapshot());
const savedProfile = () => page.evaluate(() => localStorage.getItem('gotham.progress.v1'));

async function ready() {
  await page.waitForFunction(() => window.__gotham?.snapshot().rendererCalls > 0);
}
async function reload() {
  await page.reload({ waitUntil: 'networkidle' });
  await ready();
}
async function frames(count = 3) {
  await page.evaluate(count => new Promise(resolve => {
    const next = () => --count <= 0 ? resolve() : requestAnimationFrame(next);
    requestAnimationFrame(next);
  }), count);
}
async function chooseMission(id) {
  const state = await snapshot();
  if (state.mode === 'intro') await page.click('#missions-button');
  else await page.keyboard.press('KeyM');
  await page.locator('#missions-overlay').waitFor({ state: 'visible' });
  await page.locator(`[data-mission="${id}"]`).click();
  await page.waitForFunction(id => {
    const state = window.__gotham.snapshot();
    return state.mode === 'playing' && state.playStyle === 'campaign' && state.missionId === id;
  }, id);
}
async function assertControlsFit() {
  const controls = await page.locator('.touch-actions button, .touch-direction button').evaluateAll(elements => elements.map(element => {
    const rect = element.getBoundingClientRect();
    return {
      action: element.dataset.action || element.dataset.key,
      x: rect.x, y: rect.y, width: rect.width, height: rect.height,
      screenWidth: innerWidth, screenHeight: innerHeight,
    };
  }));
  assert.equal(controls.length, expectedActions.length + 4);
  for (const control of controls) {
    assert.ok(control.width > 0 && control.height > 0, `${control.action} has a visible control`);
    assert.ok(control.x >= -1 && control.y >= -1
      && control.x + control.width <= control.screenWidth + 1
      && control.y + control.height <= control.screenHeight + 1,
    `${control.action} fits the viewport: ${JSON.stringify(control)}`);
  }
  for (let first = 0; first < controls.length; first++) {
    for (let second = first + 1; second < controls.length; second++) {
      const a = controls[first], b = controls[second];
      const width = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
      const height = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
      assert.ok(width <= 1 || height <= 1, `${a.action} and ${b.action} do not overlap`);
    }
  }
}
async function tapTouch(client, selector) {
  const box = await page.locator(selector).boundingBox();
  assert.ok(box && box.width > 0 && box.height > 0, `${selector} is touchable`);
  const point = { x: box.x + box.width / 2, y: box.y + box.height / 2, radiusX: 5, radiusY: 5, force: 1, id: 1 };
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point] });
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}

try {
  await mkdir('test-results', { recursive: true });
  const context = await browser.newContext({
    viewport: { width: 960, height: 720 }, deviceScaleFactor: .5, reducedMotion: 'reduce',
    storageState: {
      cookies: [],
      origins: [{ origin: new URL(baseURL).origin, localStorage: [{ name: 'gotham.progress.v1', value: oldSaveJSON }] }],
    },
  });
  page = await context.newPage();
  page.setDefaultTimeout(45000);
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto(baseURL, { waitUntil: 'networkidle' });
  await ready();
  await page.selectOption('#intro-graphics-quality', 'low');
  await page.selectOption('#platform-mode', 'pc');
  let state = await snapshot();
  assert.deepEqual(state.profile, oldSave, 'the older version-one progression save loads unchanged');
  assert.equal(state.armorId, 'tactical');
  assert.deepEqual(state.skills.unlocked, []);
  assert.deepEqual(state.skills.points, { earned: 1, spent: 0, available: 1 });

  await page.selectOption('#difficulty-mode', 'story');
  await page.waitForFunction(() => window.__gotham.snapshot().difficulty === 'story');
  await reload();
  assert.equal((await snapshot()).difficulty, 'story', 'difficulty survives a normal reload');
  assert.equal(await page.locator('#difficulty-mode').inputValue(), 'story');
  assert.equal(await savedProfile(), oldSaveJSON, 'difficulty never replaces the XP/armor save');
  console.log('PASS difficulty: accessible preset is saved separately and restores without changing progression');

  await page.click('#armory-button');
  await page.locator('#armory-overlay').waitFor({ state: 'visible' });
  assert.equal(await page.locator('#skills-list button[data-skill]').count(), 9, 'the arsenal exposes all three skill branches');
  const firstSkill = page.locator('#skills-list [data-skill="combat-focus"]');
  const secondSkill = page.locator('#skills-list [data-skill="combat-counter"]');
  assert.equal(await firstSkill.isEnabled(), true);
  assert.equal(await secondSkill.isDisabled(), true, 'a prerequisite cannot be skipped');
  await firstSkill.click();
  await page.waitForFunction(() => window.__gotham.snapshot().skills.unlocked.includes('combat-focus'));
  state = await snapshot();
  assert.deepEqual(state.skills.unlocked, ['combat-focus']);
  assert.deepEqual(state.skills.points, { earned: 1, spent: 1, available: 0 });
  assert.equal(state.skills.bonuses.focusBonus, 5, 'the learned focus bonus reaches gameplay state');
  assert.equal(await secondSkill.isDisabled(), true, 'the next skill cannot be purchased without a remaining point');
  assert.equal(await firstSkill.isDisabled(), true, 'a learned skill cannot spend another point');
  assert.equal(await savedProfile(), oldSaveJSON, 'skills use their own save and spend no XP');
  const savedSkills = await page.evaluate(() => JSON.parse(localStorage.getItem('gotham.skills.v1')));
  assert.deepEqual(savedSkills, { version: 1, unlocked: ['combat-focus'] });
  assert.ok((await page.locator('#skill-points').textContent()).includes('0'));
  await page.screenshot({ path: 'test-results/upgrade-skills.png' });
  await page.click('#close-armory');
  await reload();
  assert.deepEqual((await snapshot()).skills.unlocked, ['combat-focus'], 'the learned build survives reload');
  assert.equal(await savedProfile(), oldSaveJSON);
  console.log('PASS skills: old armor retained, earned point spent once, prerequisites enforced and build persisted');

  // The flight launch is a safe, grounded place to check defense timing without
  // an enemy changing focus or interrupting the input sequence.
  await chooseMission('flight');
  state = await snapshot();
  assert.equal(state.grounded, true);
  assert.equal(state.combat.focus, 0);
  await page.keyboard.press('KeyX');
  const firstDefense = (await snapshot()).combat;
  assert.ok(firstDefense.defenseWindow > 0, 'X opens the parry window');
  assert.ok(firstDefense.defenseCooldown > firstDefense.defenseWindow, 'parry has a deliberate cooldown');
  await frames(3);
  const beforeRepeat = (await snapshot()).combat;
  assert.ok(beforeRepeat.defenseCooldown > 0, 'the immediate repeat is inside cooldown');
  await page.keyboard.press('KeyX');
  const afterRepeat = (await snapshot()).combat;
  assert.ok(afterRepeat.defenseWindow <= beforeRepeat.defenseWindow + .001, 'repeated X cannot restart its defense window');
  assert.ok(afterRepeat.defenseCooldown <= beforeRepeat.defenseCooldown + .001, 'rejected defense cannot extend the cooldown');
  await page.keyboard.press('KeyB');
  state = await snapshot();
  assert.equal(state.combat.focus, 0, 'a rejected finisher spends no focus');
  assert.notEqual(state.combat.animation, 'finisher', 'empty-focus finisher never starts');
  assert.equal(await savedProfile(), oldSaveJSON);
  console.log('PASS defense: real X opens one timed window, repeat is blocked, empty-focus B cannot start a finisher');

  await page.keyboard.press('Escape');
  await page.locator('#pause-overlay').waitFor({ state: 'visible' });
  await page.selectOption('#pause-difficulty-mode', 'knight');
  await page.waitForFunction(() => window.__gotham.snapshot().difficulty === 'knight');
  await page.keyboard.press('Escape');
  await chooseMission('rescue');
  state = await snapshot();
  assert.equal(state.checkpoint?.missionId, 'rescue');
  assert.equal(state.checkpoint?.objectiveId, state.currentObjectiveId, 'checkpoint captures the current objective');
  assert.equal(state.checkpoint?.selectedMissionId, 'rescue');
  await reload();
  state = await snapshot();
  assert.equal(state.difficulty, 'knight', 'pause-menu difficulty also persists');
  assert.equal(state.checkpoint?.missionId, 'rescue', 'booting the intro preserves the last campaign checkpoint');
  await page.locator('#continue-button').waitFor({ state: 'visible' });
  await page.click('#continue-button');
  await page.waitForFunction(() => {
    const state = window.__gotham.snapshot();
    return state.mode === 'playing' && state.playStyle === 'campaign' && state.missionId === 'rescue';
  });
  state = await snapshot();
  assert.equal(state.currentObjectiveId, 'rescue-civilian');
  assert.equal(state.profile.xp, oldSave.xp, 'continuing grants no XP');
  assert.equal(state.armorId, oldSave.equippedArmor);
  assert.deepEqual(state.skills.unlocked, ['combat-focus']);
  assert.equal(await savedProfile(), oldSaveJSON);
  console.log('PASS checkpoint: selected rescue resumes after reload with XP, armor and learned skill preserved');

  await reload();
  await page.selectOption('#platform-mode', 'tablet');
  await chooseMission('flight');
  assert.equal(await page.locator('#touch-controls').isVisible(), true);
  assert.deepEqual(await page.locator('.touch-actions [data-action]').evaluateAll(buttons => buttons.map(button => button.dataset.action)), expectedActions);
  const client = await context.newCDPSession(page);
  for (const viewport of [{ width: 1280, height: 800 }, { width: 800, height: 1280 }]) {
    await page.setViewportSize(viewport);
    await frames();
    await assertControlsFit();
    await page.waitForFunction(() => window.__gotham.snapshot().combat.defenseCooldown <= 0);
    await tapTouch(client, '[data-action="parry"]');
    state = await snapshot();
    assert.ok(state.combat.defenseWindow > 0, 'the parry action also accepts real touch input');
    await tapTouch(client, '[data-action="finisher"]');
    assert.equal((await snapshot()).combat.focus, 0, 'touching an unavailable finisher cannot create or spend focus');
    await page.screenshot({ path: `test-results/upgrade-tablet-${viewport.width}x${viewport.height}.png` });
  }
  state = await snapshot();
  assert.ok(state.cityLife?.cars > 0 && state.cityLife?.pedestrians > 0, 'the procedural city has traffic and residents');
  assert.ok(state.cityLife.drawCalls > 0, 'city actors are rendered');
  const car = state.cityLife.positions.cars[0];
  await frames(6);
  const moved = (await snapshot()).cityLife.positions.cars[0];
  assert.ok(Math.hypot(moved.x - car.x, moved.z - car.z) > 0, 'traffic moves through actual frame updates');
  assert.equal(await savedProfile(), oldSaveJSON);
  assert.deepEqual(errors, [], 'no JavaScript exceptions or console errors');
  console.log('PASS tablet: thirteen actions fit both orientations, touch parry works, city traffic moves and progression stays intact');
  console.log('PASS upgrade smoke. Browser input was simulated; no physical tablet or console was used.');
  await context.close();
} catch (error) {
  if (page && !page.isClosed()) {
    const state = await snapshot().catch(() => null);
    console.error('Upgrade failure:', JSON.stringify({
      mode: state?.mode, playStyle: state?.playStyle, difficulty: state?.difficulty,
      skills: state?.skills, combat: state?.combat, checkpoint: state?.checkpoint,
      missionId: state?.missionId, objectiveId: state?.currentObjectiveId,
      position: state?.position, profile: state?.profile, cityLife: state?.cityLife, errors,
    }));
    await page.screenshot({ path: 'test-results/upgrade-failure.png' }).catch(() => {});
  }
  throw error;
} finally {
  await browser.close();
}
