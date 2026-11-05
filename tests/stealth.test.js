import test from 'node:test';
import assert from 'node:assert/strict';
import { canSilentTakedown, updateAwareness } from '../src/stealth.js';

const visible = { dt: 0.1, distance: 12, angleCos: 1, lineOfSight: true };

test('a visible guard builds awareness, alerts, and remembers until it falls below 20%', () => {
  const state = { awareness: 0, alerted: false };
  for (let frame = 0; frame < 17; frame++) updateAwareness(state, visible);
  assert.deepEqual(state, { awareness: 1, alerted: true });
  updateAwareness(state, { ...visible, dt: 0.5, lineOfSight: false });
  assert.equal(state.awareness, 0.5);
  assert.equal(state.alerted, true);
  updateAwareness(state, { ...visible, dt: 0.31, lineOfSight: false });
  assert.ok(state.awareness < 0.2);
  assert.equal(state.alerted, false);
});

test('crouching shortens the detection range and delays full awareness', () => {
  const standing = { awareness: 0, alerted: false };
  const crouching = { awareness: 0, alerted: false };
  updateAwareness(standing, { ...visible, dt: 1.7 });
  updateAwareness(crouching, { ...visible, dt: 1.7, crouching: true });
  assert.equal(standing.alerted, true);
  assert.equal(crouching.awareness, 0);
  updateAwareness(crouching, { ...visible, dt: 1.7, distance: 8, crouching: true });
  assert.ok(crouching.awareness > 0.56 && crouching.awareness < 0.57);
  assert.equal(crouching.alerted, false);
  updateAwareness(crouching, { ...visible, dt: 1.3, distance: 8, crouching: true });
  assert.equal(crouching.alerted, true);
});

test('guards see only their cone except at close range or when an attack reveals the player', () => {
  for (const [distance, angleCos, attacking, detected] of [
    [8, -1, false, false], [8, 0.45, false, false], [8, 0.46, false, true],
    [3, -1, false, true], [3.01, -1, false, false],
    [18, -1, true, true], [18.01, 1, true, false],
  ]) {
    const state = { awareness: 0, alerted: false };
    updateAwareness(state, { ...visible, distance, angleCos, attacking });
    assert.equal(state.awareness > 0, detected, JSON.stringify({ distance, angleCos, attacking }));
  }
});

test('walls and smoke break detection even when close or attacking', () => {
  for (const blocker of [{ lineOfSight: false }, { smoked: true }]) {
    const state = { awareness: 0.6, alerted: false };
    updateAwareness(state, { ...visible, distance: 1, attacking: true, ...blocker });
    assert.equal(state.awareness, 0.5);
  }
});

test('invalid timings cannot create alerts or alter valid state', () => {
  const state = { awareness: 0.5, alerted: true };
  for (const dt of [undefined, NaN, Infinity, -1, 0, '1']) {
    updateAwareness(state, { ...visible, dt });
    assert.deepEqual(state, { awareness: 0.5, alerted: true });
  }
});

test('invalid spatial data loses awareness safely and malformed stored awareness is normalized', () => {
  for (const invalid of [
    { distance: NaN }, { distance: Infinity }, { distance: -1 },
    { angleCos: NaN }, { angleCos: Infinity }, { angleCos: 2 },
  ]) {
    const state = { awareness: 0.5, alerted: false };
    updateAwareness(state, { ...visible, ...invalid });
    assert.equal(state.awareness, 0.4);
  }
  assert.deepEqual(updateAwareness({ awareness: NaN, alerted: 'yes' }, { dt: 0 }), {
    awareness: 0, alerted: false,
  });
});

test('silent takedown requires an unalerted ordinary guard within reach and behind the guard', () => {
  const target = { distance: 2.5, angleCos: -1, alerted: false };
  assert.equal(canSilentTakedown(target), true);
  assert.equal(canSilentTakedown({ ...target, distance: 3 }), true);
  for (const change of [
    { distance: 3.01 }, { distance: -1 }, { distance: NaN }, { distance: Infinity },
    { angleCos: -0.2 }, { angleCos: 0.5 }, { angleCos: -2 }, { angleCos: NaN },
    { alerted: true }, { boss: true }, { heightDifference: 2 },
    { heightDifference: -2 }, { heightDifference: NaN },
  ]) assert.equal(canSilentTakedown({ ...target, ...change }), false, JSON.stringify(change));
  assert.equal(canSilentTakedown({ ...target, heightDifference: -1.99 }), true);
  assert.equal(canSilentTakedown(), false);
});
