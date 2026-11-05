import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

// Exercise the public UI and real browser input; never modify the game snapshot/save.
const baseURL = process.env.GOTHAM_URL || 'http://127.0.0.1:5173';
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
  headless: true,
  args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'],
});
const errors = [];
let page;
const snapshot = () => page.evaluate(() => window.__gotham.snapshot());
const savedProfile = () => page.evaluate(() => localStorage.getItem('gotham.progress.v1'));

async function frames(count = 2) {
  await page.evaluate(count => new Promise(resolve => {
    const next = () => --count <= 0 ? resolve() : requestAnimationFrame(next);
    requestAnimationFrame(next);
  }), count);
}

async function waitForPlayStyle(playStyle) {
  await page.waitForFunction(style => {
    const state = window.__gotham.snapshot();
    return state.mode === 'playing' && state.playStyle === style;
  }, playStyle);
  return snapshot();
}

async function tapTouch(client, selector) {
  const box = await page.locator(selector).boundingBox();
  assert.ok(box && box.width && box.height, `${selector} is visible`);
  const point = { x: box.x + box.width / 2, y: box.y + box.height / 2, radiusX: 4, radiusY: 4, force: 1, id: 1 };
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point] });
  await frames();
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await frames();
}

async function assertControlsFit() {
  const controls = await page.locator('.touch-actions button[data-action="crouch"], .touch-actions button[data-action="takedown"]').evaluateAll(buttons => buttons.map(button => {
    const rect = button.getBoundingClientRect();
    return { action: button.dataset.action, x: rect.x, y: rect.y, width: rect.width, height: rect.height, screenWidth: innerWidth, screenHeight: innerHeight };
  }));
  assert.equal(controls.length, 2);
  for (const control of controls) {
    assert.ok(control.width > 0 && control.height > 0, `${control.action} is visible`);
    assert.ok(control.x >= -1 && control.y >= -1
      && control.x + control.width <= control.screenWidth + 1
      && control.y + control.height <= control.screenHeight + 1,
    `${control.action} fits the tablet viewport: ${JSON.stringify(control)}`);
  }
}

function assertPatrol(state) {
  assert.equal(state.playStyle, 'patrol');
  assert.ok(['ambush', 'rescue', 'bomb', 'chase'].includes(state.patrol?.type));
  assert.ok(Number.isInteger(state.patrol.round) && state.patrol.round >= 1);
  assert.ok(Number.isFinite(state.patrol.remaining) && state.patrol.remaining > 0);
  assert.equal(state.patrol.finished, false);
  assert.ok(Array.isArray(state.patrol.history));
  assert.equal(typeof state.crouching, 'boolean');
  for (const enemy of state.enemies.filter(enemy => enemy.active && !enemy.boss)) {
    assert.ok(Number.isFinite(enemy.awareness), 'active guards expose real awareness');
    assert.equal(typeof enemy.alerted, 'boolean');
  }
}

try {
  await mkdir('test-results', { recursive: true });
  const context = await browser.newContext({ viewport: { width: 960, height: 720 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto(baseURL, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__gotham?.snapshot().rendererCalls > 0);
  await page.selectOption('#intro-graphics-quality', 'low');
  await page.selectOption('#platform-mode', 'pc');

  // Persist a genuine profile through the existing equipment screen.
  await page.click('#armory-button');
  await page.locator('#armory-list button:not(:disabled)').first().click();
  await page.click('#close-armory');
  const originalProfile = await savedProfile();
  assert.ok(originalProfile);

  await page.click('#patrol-button');
  let state = await waitForPlayStyle('patrol');
  assertPatrol(state);
  assert.equal(await savedProfile(), originalProfile, 'starting a patrol does not award XP or replace the campaign profile');
  const firstType = state.patrol.type;
  const initialCrouch = state.crouching;
  await page.keyboard.press('KeyC');
  await page.waitForFunction(before => window.__gotham.snapshot().crouching !== before, initialCrouch);
  await page.keyboard.press('KeyC');
  await page.waitForFunction(before => window.__gotham.snapshot().crouching === before, initialCrouch);
  assert.equal((await snapshot()).patrol.completed, 0, 'crouching alone cannot complete a patrol');
  console.log(`PASS patrol entry: ${firstType}, running timer, keyboard crouch and campaign save preserved`);

  await page.keyboard.press('KeyM');
  await page.locator('#missions-overlay').waitFor({ state: 'visible' });
  await page.locator('[data-mission="rescue"]').click();
  state = await waitForPlayStyle('campaign');
  assert.equal(state.missionId, 'rescue');
  assert.equal(state.crouching, false, 'starting a story mission resets the stealth pose');
  assert.equal(await savedProfile(), originalProfile);
  await page.keyboard.press('KeyM');
  await page.locator('#missions-overlay').waitFor({ state: 'visible' });
  await page.click('#patrol-board-button');
  state = await waitForPlayStyle('patrol');
  assertPatrol(state);
  assert.equal(await savedProfile(), originalProfile);
  console.log('PASS campaign/patrol switching: rescue keeps its mission and the saved progression remains intact');

  // Return to the normal platform selector, preserving the same actual save.
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__gotham?.snapshot().rendererCalls > 0);
  await page.selectOption('#platform-mode', 'tablet');
  await page.click('#patrol-button');
  state = await waitForPlayStyle('patrol');
  assertPatrol(state);
  assert.equal(await page.locator('#touch-controls').isVisible(), true);
  const actions = await page.locator('.touch-actions [data-action]').evaluateAll(buttons => buttons.map(button => button.dataset.action));
  assert.ok(actions.includes('crouch') && actions.includes('takedown'), 'both stealth actions are available on touch');
  const client = await context.newCDPSession(page);
  for (const viewport of [{ width: 1280, height: 800 }, { width: 800, height: 1280 }]) {
    await page.setViewportSize(viewport);
    await frames();
    await assertControlsFit();
    const before = (await snapshot()).crouching;
    await tapTouch(client, '[data-action="crouch"]');
    await page.waitForFunction(before => window.__gotham.snapshot().crouching !== before, before);
    await tapTouch(client, '[data-action="crouch"]');
    await page.waitForFunction(before => window.__gotham.snapshot().crouching === before, before);
    await page.screenshot({ path: `test-results/variety-tablet-${viewport.width}x${viewport.height}.png` });
  }
  assert.equal(await savedProfile(), originalProfile);
  assert.deepEqual(errors, [], 'no JavaScript exceptions or console errors');
  console.log('PASS tablet stealth: real touch toggles crouch in landscape and portrait; new actions fit and profile is preserved');
  console.log('PASS variety smoke. This verifies browser UI/input; no physical tablet or PlayStation hardware was used.');
  await context.close();
} catch (error) {
  if (page && !page.isClosed()) {
    const state = await snapshot().catch(() => null);
    console.error('Variety failure state:', JSON.stringify({ mode: state?.mode, playStyle: state?.playStyle, patrol: state?.patrol, crouching: state?.crouching, missionId: state?.missionId, errors }));
    await page.screenshot({ path: 'test-results/variety-failure.png' }).catch(() => {});
  }
  throw error;
} finally {
  await browser.close();
}
