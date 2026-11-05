import test from 'node:test';
import assert from 'node:assert/strict';
import { PATROL_TYPES, createPatrolRun, nextEncounter, finishEncounter } from '../src/patrol.js';

const locations = [
  { id: 'street-a', x: -28, y: 0, z: 112, terrain: 'ground' },
  { id: 'street-b', x: 28, y: 0, z: 0, terrain: 'ground' },
  { id: 'street-c', x: -84, y: 0, z: -28, terrain: 'ground' },
  { id: 'roof-a', x: 56, y: 35, z: 56, terrain: 'roof' },
  { id: 'roof-b', x: -112, y: 47, z: -56, terrain: 'roof' },
];

function resolve(state, options = {}) {
  return finishEncounter(state, { success: true, elapsed: 20, damageTaken: 2, ...options });
}

test('the same seed and actions reproduce the same encounters and rewards', () => {
  const first = createPatrolRun({ seed: 381 });
  const second = createPatrolRun({ seed: 381 });
  for (let round = 0; round < 50; round++) {
    assert.deepEqual(nextEncounter(first, locations), nextEncounter(second, locations));
    assert.deepEqual(resolve(first), resolve(second));
  }
  assert.deepEqual(first, second);
});

test('patrols vary all four objectives and avoid both of the last two types and sites', () => {
  const state = createPatrolRun({ seed: 40 });
  const types = new Set();
  for (let round = 0; round < 100; round++) {
    const previous = state.history.slice(-2);
    const encounter = nextEncounter(state, locations);
    assert.ok(previous.every(entry => entry.type !== encounter.type));
    assert.ok(previous.every(entry => entry.locationId !== encounter.locationId));
    types.add(encounter.type);
    if (encounter.type === 'rescue' || encounter.type === 'chase') assert.equal(encounter.terrain, 'ground');
    resolve(state);
  }
  assert.deepEqual([...types].sort(), Object.keys(PATROL_TYPES).sort());
});

test('an ongoing encounter cannot be rerolled and its source descriptor remains untouched', () => {
  const source = structuredClone(locations);
  const state = createPatrolRun({ seed: 4 });
  const encounter = nextEncounter(state, source);
  assert.equal(nextEncounter(state, source), encounter);
  assert.equal(state.round, 1);
  encounter.x += 20;
  assert.deepEqual(source, locations);
});

test('small pools still work and never place a rescue or courier on a roof', () => {
  for (const pool of [[locations[0]], [locations[3]], locations.slice(3)]) {
    const state = createPatrolRun({ seed: 0 });
    for (let round = 0; round < 20; round++) {
      const encounter = nextEncounter(state, pool);
      assert.ok(pool.some(location => location.id === encounter.locationId));
      if (encounter.terrain === 'roof') assert.ok(['ambush', 'bomb'].includes(encounter.type));
      resolve(state);
    }
  }
});

test('empty or invalid locations fail without advancing the run', () => {
  const state = createPatrolRun({ seed: 4 });
  const before = structuredClone(state);
  for (const pool of [[], null, [{ id: 'bad', x: NaN, y: 0, z: 0, terrain: 'ground' }]]) {
    assert.throws(() => nextEncounter(state, pool), RangeError);
    assert.deepEqual(state, before);
  }
});

test('rewards combine the objective with bounded clean and silent bonuses exactly once', () => {
  const state = createPatrolRun({ seed: 5 });
  const encounter = nextEncounter(state, locations);
  const result = resolve(state, { damageTaken: 0, stealth: true });
  assert.equal(result.ok, true);
  assert.equal(result.success, true);
  assert.equal(result.bonusEarned, 20);
  assert.equal(result.xpEarned, encounter.reward + 20);
  assert.equal(state.score, result.xpEarned);
  assert.equal(state.completed, 1);
  assert.equal(state.failed, 0);
  assert.equal(encounter.finished, true);
  const awarded = structuredClone(state);
  assert.equal(resolve(state).ok, false);
  assert.deepEqual(state, awarded);
});

test('failure and late completion give no XP but advance the varied patrol history', () => {
  const state = createPatrolRun({ seed: 9 });
  nextEncounter(state, locations);
  const failed = resolve(state, { success: false, damageTaken: 0, stealth: true });
  assert.deepEqual([failed.success, failed.xpEarned, failed.bonusEarned], [false, 0, 0]);
  const next = nextEncounter(state, locations);
  const late = resolve(state, { elapsed: next.timeLimit + .1 });
  assert.equal(late.success, false);
  assert.equal(late.xpEarned, 0);
  assert.equal(state.completed, 0);
  assert.equal(state.failed, 2);
  assert.equal(state.score, 0);
  assert.equal(state.history.length, 2);
});

test('invalid measurements cannot award XP or consume the encounter', () => {
  const state = createPatrolRun({ seed: 5 });
  nextEncounter(state, locations);
  const before = structuredClone(state);
  for (const options of [{ elapsed: NaN }, { elapsed: -1 }, { elapsed: undefined }, { damageTaken: -3 }, { damageTaken: Infinity }]) {
    assert.equal(resolve(state, options).ok, false);
    assert.deepEqual(state, before);
  }
  assert.equal(resolve(state).ok, true);
});

test('history remains bounded while counters and score cover the entire run', () => {
  const state = createPatrolRun({ seed: 17 });
  let totalXP = 0;
  for (let round = 0; round < 40; round++) {
    const encounter = nextEncounter(state, locations);
    assert.equal(encounter.id, `patrol-${round + 1}`);
    totalXP += resolve(state).xpEarned;
  }
  assert.equal(state.history.length, 12);
  assert.equal(state.history[0].id, 'patrol-29');
  assert.equal(state.completed, 40);
  assert.equal(state.score, totalXP);
});
