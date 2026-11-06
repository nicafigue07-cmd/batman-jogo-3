import test from 'node:test';
import assert from 'node:assert/strict';
import { ENEMY_ARCHETYPES, createEnemyAttackState, updateEnemyAttack } from '../src/enemy-ai.js';

function advance(state, seconds, options = {}) {
  const events = [];
  for (let left = seconds; left > 1e-8; left -= 0.02) {
    events.push(updateEnemyAttack(state, { dt: Math.min(0.02, left), inRange: true, ...options }));
  }
  return events;
}

test('every archetype warns before hitting and emits exactly one attack per windup', () => {
  for (const archetype of Object.keys(ENEMY_ARCHETYPES)) {
    const def = ENEMY_ARCHETYPES[archetype];
    const state = createEnemyAttackState({ cooldown: 0 });
    assert.equal(updateEnemyAttack(state, { dt: 0.02, inRange: true, archetype }).started, true);
    assert.equal(state.phase, 'windup');
    const early = advance(state, def.telegraphTime - 0.03, { archetype });
    assert.equal(early.some(event => event.attack), false, `${archetype} cannot damage during its warning`);
    const impact = advance(state, 0.05, { archetype });
    assert.equal(impact.filter(event => event.attack).length, 1);
    assert.equal(state.phase, 'recovery');
    const recovery = advance(state, def.recoveryTime - 0.1, { archetype });
    assert.equal(recovery.some(event => event.attack || event.started), false, 'recovery leaves an opening to counter');
  }
});

test('moving out of range avoids the prepared hit and still forces recovery', () => {
  const state = createEnemyAttackState({ cooldown: 0 });
  updateEnemyAttack(state, { dt: 0.02, inRange: true });
  const events = advance(state, 0.8, { inRange: false });
  assert.equal(events.some(event => event.attack), false);
  assert.equal(state.phase, 'recovery');
});

test('stun cancels a prepared hit and delays the next attempt', () => {
  const state = createEnemyAttackState({ cooldown: 0 });
  updateEnemyAttack(state, { dt: 0.02, inRange: true });
  advance(state, 0.5);
  const cancelled = updateEnemyAttack(state, { dt: 0.02, inRange: true, stunned: true });
  assert.equal(cancelled.cancelled, true);
  assert.equal(cancelled.attack, false);
  assert.equal(state.phase, 'ready');
  const grace = advance(state, 0.38);
  assert.equal(grace.some(event => event.started || event.attack), false);
  assert.equal(updateEnemyAttack(state, { dt: 0.02, inRange: true }).started, true);
});

test('idle enemies do not wind up, invalid time pauses and a long frame cannot skip a warning', () => {
  const state = createEnemyAttackState();
  advance(state, 2, { inRange: false });
  assert.equal(state.phase, 'ready');
  const before = structuredClone(state);
  for (const dt of [undefined, 0, -1, NaN, Infinity, '0.1']) updateEnemyAttack(state, { dt, inRange: true });
  assert.deepEqual(state, before);
  updateEnemyAttack(state, { dt: 10, inRange: true });
  assert.equal(state.phase, 'windup');
  updateEnemyAttack(state, { dt: 10, inRange: true });
  assert.equal(state.phase, 'windup', 'a long frame advances at most 0.1s');
});

test('enemy state is independent and prototype keys never select a definition', () => {
  const first = createEnemyAttackState({ cooldown: 0 });
  const second = createEnemyAttackState();
  updateEnemyAttack(first, { dt: 0.02, inRange: true, archetype: '__proto__' });
  assert.equal(first.remaining, ENEMY_ARCHETYPES.brawler.telegraphTime);
  assert.deepEqual(second, createEnemyAttackState());
  for (const cooldown of [NaN, Infinity, -1, '1']) assert.equal(createEnemyAttackState({ cooldown }).cooldown, 0.8);
});
