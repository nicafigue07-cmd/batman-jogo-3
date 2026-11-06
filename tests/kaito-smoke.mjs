import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

// Verify the character change through the public interface. The only fixture is
// an existing version-one progression save; live character/game state is read-only.
const baseURL = process.env.GOTHAM_URL || 'http://127.0.0.1:5173';
const previousProfile = {
  version: 1, xp: 120, completedMissions: ['signals'], equippedArmor: 'tactical',
};
const previousProfileJSON = JSON.stringify(previousProfile);
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true,
  args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'],
});
const errors = [];
let page;
const snapshot = () => page.evaluate(() => window.__gotham.snapshot());
const savedProfile = () => page.evaluate(() => localStorage.getItem('gotham.progress.v1'));
const normalize = value => Math.atan2(Math.sin(value), Math.cos(value));

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
    return state.mode === 'playing' && state.missionId === id;
  }, id);
}
async function face(target) {
  for (let attempt = 0; attempt < 6; attempt++) {
    const state = await snapshot();
    const desired = Math.atan2(state.position.x - target.x, state.position.z - target.z);
    const difference = normalize(desired - state.cameraYaw);
    if (Math.abs(difference) < .02) return;
    const turn = Math.max(-.8, Math.min(.8, difference));
    await page.mouse.move(320, 280); await page.mouse.down();
    await page.mouse.move(320 - turn / .004, 280, { steps: 2 }); await page.mouse.up();
    await frames(2);
  }
}
function assertKaito(state) {
  assert.equal(state.character?.id, 'kaito-nami');
  assert.equal(state.character.name, 'Kaito Nami');
  assert.equal(state.character.age, 12);
  assert.equal(state.character.origin, 'Okinawa, Japão');
  assert.deepEqual(state.profile, previousProfile, 'the new protagonist keeps existing progression');
  assert.equal(state.armorId, 'tactical');
  assert.ok(state.heroBody?.height >= 1.9 && state.heroBody.height <= 2.2, 'collision height fits the child model');
  assert.ok(state.heroBody.radius > .3 && state.heroBody.radius <= .55, 'body radius remains finite and reasonable');
}

try {
  await mkdir('test-results', { recursive: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 }, deviceScaleFactor: .75, reducedMotion: 'reduce',
    storageState: {
      cookies: [],
      origins: [{ origin: new URL(baseURL).origin, localStorage: [{ name: 'gotham.progress.v1', value: previousProfileJSON }] }],
    },
  });
  page = await context.newPage(); page.setDefaultTimeout(45000);
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto(baseURL, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__gotham?.snapshot().rendererCalls > 0);
  await page.selectOption('#intro-graphics-quality', 'low');
  assert.match(await page.title(), /Kaito Nami/i);
  assert.doesNotMatch(await page.locator('#intro').innerText(), /Batman|Batcaverna|WAYNE/i);
  let state = await snapshot(); assertKaito(state);
  assert.equal(state.character.boardMode, 'carried');
  const introState = state;
  await page.click('#character-button');
  await page.locator('#character-overlay').waitFor({ state: 'visible' });
  await page.waitForFunction(() => window.__gotham.snapshot().mode === 'character');
  state = await snapshot();
  assert.equal(state.characterPreview?.open, true);
  const profileText = await page.locator('#character-overlay').innerText();
  for (const requirement of [/12 anos/i, /Okinawa/i, /Japão/i, /Juliete/i, /lentes vermelhas/i,
    /camiseta azul/i, /onda/i, /bermuda florida/i, /chinelos/i, /mochila vermelha/i, /prancha/i,
    /divertido/i, /corajoso/i, /inteligente/i, /curioso/i, /amigos/i]) {
    assert.match(profileText, requirement, `character profile includes ${requirement}`);
  }
  await frames(5);
  await page.screenshot({ path: 'test-results/kaito-profile-front.png' });
  const frontPreview = (await snapshot()).characterPreview;
  await page.click('#character-view-button');
  await frames(8);
  const backPreview = (await snapshot()).characterPreview;
  if (Number.isFinite(frontPreview.angle) && Number.isFinite(backPreview.angle)) {
    assert.ok(Math.abs(backPreview.angle - frontPreview.angle) > .1, 'turn button changes the inspection angle');
  }
  await page.screenshot({ path: 'test-results/kaito-profile-back.png' });
  state = await snapshot();
  assert.deepEqual(state.position, introState.position, 'viewing the model never moves the player');
  assert.deepEqual(state.completedMissionIds, introState.completedMissionIds);
  if (Number.isFinite(state.clockRunning)) assert.equal(state.clockRunning, introState.clockRunning, 'the character view pauses gameplay time');
  assert.equal(await savedProfile(), previousProfileJSON);
  await page.click('#close-character');
  await page.waitForFunction(() => window.__gotham.snapshot().mode === 'intro');
  assert.equal((await snapshot()).characterPreview.open, false);
  console.log('PASS Kaito profile: identity, requested appearance, inspection, paused player and compatible save');

  // Portrait mode keeps the complete character card reachable rather than
  // testing fixed coordinates that could hide the close/turn controls.
  await page.setViewportSize({ width: 800, height: 1280 });
  await page.click('#character-button');
  await page.locator('#character-overlay').waitFor({ state: 'visible' });
  await page.locator('#character-view-button').scrollIntoViewIfNeeded();
  await page.click('#character-view-button');
  await frames(3);
  await page.screenshot({ path: 'test-results/kaito-profile-portrait.png' });
  await page.locator('#close-character').scrollIntoViewIfNeeded();
  await page.click('#close-character');
  assert.equal((await snapshot()).mode, 'intro');

  await page.setViewportSize({ width: 640, height: 480 });
  await chooseMission('flight');
  state = await snapshot(); assertKaito(state);
  assert.deepEqual(state.position, { x: 6, y: 84, z: -168 });
  const firstGate = state.objectives.find(site => site.id === 'flight-gate-1');
  await face(firstGate);
  await page.keyboard.down('Space'); await page.keyboard.down('KeyW');
  try {
    await page.waitForFunction(() => {
      const state = window.__gotham.snapshot();
      return state.mode !== 'playing' || state.gliding;
    }, null, { timeout: 60000 });
    state = await snapshot();
    assert.equal(state.mode, 'playing');
    assert.equal(state.gliding, true);
    assert.equal(state.character.boardMode, 'surfing', 'gliding uses Kaito’s surfboard');
    await page.screenshot({ path: 'test-results/kaito-surfing.png' });
    await page.waitForFunction(() => {
      const state = window.__gotham.snapshot();
      return state.mode !== 'playing' || state.currentObjectiveId !== 'flight-gate-1';
    }, null, { timeout: 60000 });
    state = await snapshot();
    assert.equal(state.mode, 'playing', 'Kaito survives the first aerial passage');
    assert.equal(state.currentObjectiveId, 'flight-gate-2');
    assert.ok(state.objectives.find(site => site.id === 'flight-gate-1').disabled);
  } finally { await page.keyboard.up('KeyW'); await page.keyboard.up('Space'); }
  console.log('PASS Kaito surfing: real jump/board flight crosses the existing first aerial gate');

  await chooseMission('rescue');
  await page.waitForFunction(() => {
    const state = window.__gotham.snapshot();
    return state.grounded && state.character.boardMode === 'carried';
  });
  state = await snapshot(); assertKaito(state);
  assert.equal(state.character.boardMode, 'carried');
  const start = { ...state.position };
  await page.keyboard.down('KeyW');
  try {
    await page.waitForFunction(start => {
      const state = window.__gotham.snapshot();
      return Math.hypot(state.position.x - start.x, state.position.z - start.z) > 1;
    }, start, { timeout: 15000 });
  } finally { await page.keyboard.up('KeyW'); }
  state = await snapshot();
  assert.equal(state.mode, 'playing'); assert.equal(state.position.y, 0);
  assert.equal(state.character.boardMode, 'carried', 'the board returns to the backpack on the ground');
  assert.equal(await savedProfile(), previousProfileJSON);
  assert.deepEqual(errors, [], 'no JavaScript exceptions, shader failures or console errors');
  console.log('PASS Kaito ground movement: child character walks with carried board and retains XP/equipment');
  console.log('PASS Kaito smoke');
  await context.close();
} catch (error) {
  if (page && !page.isClosed()) {
    const state = await snapshot().catch(() => null);
    console.error('Kaito failure:', JSON.stringify({
      mode: state?.mode, character: state?.character, characterPreview: state?.characterPreview,
      heroBody: state?.heroBody, position: state?.position, missionId: state?.missionId,
      objectiveId: state?.currentObjectiveId, profile: state?.profile, errors,
    }));
    await page.screenshot({ path: 'test-results/kaito-failure.png' }).catch(() => {});
  }
  throw error;
} finally { await browser.close(); }
