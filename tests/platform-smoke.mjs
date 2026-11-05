import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

const baseURL = process.env.GOTHAM_URL || 'http://127.0.0.1:5173';
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
  headless: true,
  args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'],
});
const errors = [];
const issues = [];
let activePage;
const snapshot = page => page.evaluate(() => window.__gotham.snapshot());
const horizontalDistance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

async function frames(page, count = 2) {
  await page.evaluate(count => new Promise(resolve => {
    const next = () => --count <= 0 ? resolve() : requestAnimationFrame(next);
    requestAnimationFrame(next);
  }), count);
}

async function ready(context) {
  const page = await context.newPage();
  activePage = page;
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto(baseURL, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__gotham?.snapshot().rendererCalls > 0);
  await page.selectOption('#intro-graphics-quality', 'low');
  return page;
}

async function assertOnscreen(page, selector) {
  const boxes = await page.locator(selector).evaluateAll(elements => elements.map(element => {
    const rect = element.getBoundingClientRect();
    return {
      text: element.textContent.trim(), x: rect.x, y: rect.y, width: rect.width, height: rect.height,
      viewportWidth: innerWidth, viewportHeight: innerHeight,
      clipped: element.scrollWidth > element.clientWidth + 1,
    };
  }));
  assert.ok(boxes.length, `${selector} exists`);
  for (const box of boxes) {
    assert.ok(box.width > 0 && box.height > 0, `${selector}: ${box.text} is visible`);
    assert.ok(box.x >= -1 && box.y >= -1 && box.x + box.width <= box.viewportWidth + 1 && box.y + box.height <= box.viewportHeight + 1,
      `${selector}: ${box.text} fits the viewport: ${JSON.stringify(box)}`);
    assert.equal(box.clipped, false, `${selector}: ${box.text} is not horizontally clipped`);
  }
}

async function touch(client, type, x, y) {
  await client.send('Input.dispatchTouchEvent', {
    type,
    touchPoints: type === 'touchEnd' ? [] : [{ x, y, radiusX: 5, radiusY: 5, force: 1, id: 1 }],
  });
}

async function checkDesktopAndTablet() {
  const context = await browser.newContext({ viewport: { width: 640, height: 480 }, deviceScaleFactor: 1 });
  const page = await ready(context);
  assert.equal(await page.evaluate(() => matchMedia('(pointer:fine)').matches), true, 'tablet selection is tested with a desktop fine pointer');

  // Save through the actual equipment UI, without injecting profile data.
  await page.click('#armory-button');
  await page.locator('#armory-list button:not(:disabled)').first().click();
  await page.click('#close-armory');
  const savedProfile = await page.evaluate(() => localStorage.getItem('gotham.progress.v1'));
  assert.ok(savedProfile, 'equipping an unlocked suit saves a real profile');
  for (const platform of ['pc', 'tablet', 'gamepad', 'tablet', 'pc']) {
    await page.selectOption('#platform-mode', platform);
    assert.equal((await snapshot(page)).platformMode, platform);
    assert.equal(await page.evaluate(() => localStorage.getItem('gotham.progress.v1')), savedProfile);
  }
  await page.selectOption('#intro-graphics-quality', 'medium');
  await page.selectOption('#intro-graphics-quality', 'low');
  assert.equal(await page.evaluate(() => localStorage.getItem('gotham.progress.v1')), savedProfile);

  await page.click('#missions-button');
  await page.locator('[data-mission="rescue"]').click();
  await page.waitForFunction(() => window.__gotham.snapshot().mode === 'playing' && window.__gotham.snapshot().missionId === 'rescue');
  assert.equal(await page.locator('#touch-controls').isVisible(), false);
  let before = await snapshot(page);
  await page.keyboard.down('KeyW');
  try {
    await page.waitForFunction(origin => {
      const p = window.__gotham.snapshot().position;
      return Math.hypot(p.x - origin.x, p.z - origin.z) > .5;
    }, before.position);
  } finally { await page.keyboard.up('KeyW'); }
  assert.ok(horizontalDistance((await snapshot(page)).position, before.position) > .5);
  before = await snapshot(page);
  await page.mouse.move(320, 270);
  await page.mouse.down();
  await page.mouse.move(360, 270, { steps: 2 });
  await page.mouse.up();
  assert.ok(Math.abs((await snapshot(page)).cameraYaw - before.cameraYaw) > .1, 'mouse drag rotates the camera');
  console.log('PASS PC: keyboard movement and mouse camera; platform/quality choices preserve the saved profile');

  // Reload normally to return to the platform selector, retaining the real save.
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__gotham?.snapshot().rendererCalls > 0);
  assert.equal(await page.evaluate(() => localStorage.getItem('gotham.progress.v1')), savedProfile);
  await page.selectOption('#platform-mode', 'tablet');
  await page.click('#missions-button');
  await page.locator('[data-mission="rescue"]').click();
  await page.waitForFunction(() => window.__gotham.snapshot().mode === 'playing');
  try {
    await page.locator('#boss-panel').waitFor({ state: 'visible', timeout: 10000 });
  } catch {
    const state = await snapshot(page);
    const panel = await page.locator('#boss-panel').evaluate(element => ({ hidden: element.hidden, display: getComputedStyle(element).display, body: document.body.className }));
    const diagnostic = { panel, mode: state.mode, currentObjectiveId: state.currentObjectiveId, bosses: state.enemies.filter(enemy => enemy.boss && enemy.missionId === 'rescue') };
    issues.push(`Rescue boss HUD remains hidden: ${JSON.stringify(diagnostic)}`);
    console.error(issues.at(-1));
  }
  const client = await context.newCDPSession(page);
  const expected = ['grapple', 'attack', 'heavy', 'jump', 'slam', 'dodge', 'interact', 'batarang', 'smoke', 'crouch', 'takedown'];
  assert.deepEqual(await page.locator('.touch-actions [data-action]').evaluateAll(buttons => buttons.map(button => button.dataset.action)), expected);

  for (const viewport of [{ width: 1280, height: 800 }, { width: 800, height: 1280 }]) {
    await page.setViewportSize(viewport);
    await frames(page);
    assert.equal(await page.locator('#touch-controls').isVisible(), true, 'explicit tablet mode shows touch controls on a fine pointer');
    await assertOnscreen(page, '.touch-actions button, .touch-direction button');
    await assertOnscreen(page, '#mission-terrain, #mission-villain');
    if (await page.locator('#boss-panel').isVisible()) await assertOnscreen(page, '#boss-name, #boss-health-value');
    if (viewport.width > viewport.height) {
      const button = await page.locator('[data-key="KeyW"]').boundingBox();
      const origin = (await snapshot(page)).position;
      await touch(client, 'touchStart', button.x + button.width / 2, button.y + button.height / 2);
      try {
        await page.waitForFunction(origin => {
          const p = window.__gotham.snapshot().position;
          return Math.hypot(p.x - origin.x, p.z - origin.z) > .5;
        }, origin);
      } finally { await touch(client, 'touchEnd'); }
      assert.ok(horizontalDistance((await snapshot(page)).position, origin) > .5, 'real touch pointer input moves the hero');
    }
    await page.screenshot({ path: `test-results/platform-tablet-${viewport.width}x${viewport.height}.png` });
  }
  assert.equal(await page.evaluate(() => localStorage.getItem('gotham.progress.v1')), savedProfile);
  console.log('PASS tablet: 11 actions and 4 movement buttons fit landscape/portrait; touch moves the hero; mission/boss labels fit');
  await context.close();
}

async function setPad(page, { axes, buttons, connected } = {}) {
  await page.evaluate(({ axes, buttons, connected }) => {
    const pad = window.__platformTestPad;
    if (axes) pad.axes = [...axes];
    if (buttons) pad.buttons = Array.from({ length: 16 }, (_, index) => ({ pressed: buttons.includes(index), value: buttons.includes(index) ? 1 : 0 }));
    if (connected !== undefined) pad.connected = connected;
  }, { axes, buttons, connected });
  await frames(page);
}

async function pressPad(page, button) {
  await setPad(page, { buttons: [button] });
  await setPad(page, { buttons: [] });
}

async function checkSimulatedController() {
  const context = await browser.newContext({ viewport: { width: 640, height: 480 }, deviceScaleFactor: 1 });
  await context.addInitScript(() => {
    window.__platformTestPad = {
      id: 'Simulated standard-layout controller for browser QA',
      index: 0, mapping: 'standard', connected: true,
      axes: [0, 0, 0, 0],
      buttons: Array.from({ length: 16 }, () => ({ pressed: false, value: 0 })),
    };
    Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: () => [window.__platformTestPad] });
  });
  const page = await ready(context);
  await page.selectOption('#platform-mode', 'gamepad');
  await page.click('#intro-title');
  await page.waitForFunction(() => window.__gotham.snapshot().controllerConnected);
  await pressPad(page, 0);
  await page.waitForFunction(() => window.__gotham.snapshot().mode === 'playing');
  assert.equal(await page.locator('#touch-controls').isVisible(), false);
  let before = await snapshot(page);
  await setPad(page, { axes: [0, -1, 0, 0] });
  try {
    await page.waitForFunction(origin => {
      const p = window.__gotham.snapshot().position;
      return Math.hypot(p.x - origin.x, p.z - origin.z) > .5;
    }, before.position);
  } finally { await setPad(page, { axes: [0, 0, 0, 0] }); }
  before = await snapshot(page);
  await setPad(page, { axes: [0, 0, 1, 0] });
  try {
    await page.waitForFunction(yaw => Math.abs(window.__gotham.snapshot().cameraYaw - yaw) > .12, before.cameraYaw);
  } finally { await setPad(page, { axes: [0, 0, 0, 0] }); }
  await pressPad(page, 9);
  assert.equal((await snapshot(page)).mode, 'paused', 'OPTIONS pauses');
  const paused = (await snapshot(page)).position;
  await setPad(page, { axes: [0, -1, 0, 0] });
  await frames(page, 3);
  assert.ok(horizontalDistance((await snapshot(page)).position, paused) < .001, 'paused analog input cannot move the hero');
  await setPad(page, { axes: [0, 0, 0, 0] });
  await pressPad(page, 9);
  assert.equal((await snapshot(page)).mode, 'playing', 'OPTIONS resumes');
  await pressPad(page, 15);
  assert.equal(await page.locator('#missions-overlay').isVisible(), true, 'D-pad right opens missions');
  await pressPad(page, 0);
  await page.waitForFunction(() => window.__gotham.snapshot().mode === 'playing' && window.__gotham.snapshot().selectedMissionId === 'signals');
  assert.equal(await page.locator('#missions-overlay').isVisible(), false, 'Cross confirms the focused mission');
  await setPad(page, { connected: false });
  assert.equal((await snapshot(page)).controllerConnected, false);
  console.log('PASS simulated standard controller: Cross starts/selects, both sticks work, OPTIONS pauses/resumes, D-pad opens missions, disconnect clears connection');
  await context.close();
}

try {
  await mkdir('test-results', { recursive: true });
  await checkDesktopAndTablet();
  await checkSimulatedController();
  assert.deepEqual(errors, [], 'no JavaScript or console errors');
  assert.deepEqual(issues, [], 'all expected HUD panels are visible');
  console.log('PASS platforms. Controller input was simulated; no physical PlayStation or tablet hardware was used.');
} catch (error) {
  if (activePage && !activePage.isClosed()) {
    await activePage.screenshot({ path: 'test-results/platform-failure.png' }).catch(() => {});
    const state = await snapshot(activePage).catch(() => null);
    console.error('Platform failure state:', JSON.stringify({ mode: state?.mode, platform: state?.platformMode, controllerConnected: state?.controllerConnected, missionId: state?.missionId, position: state?.position, errors }));
  }
  throw error;
} finally { await browser.close(); }
