import test from 'node:test';
import assert from 'node:assert/strict';
import { ATTACKS, beginAttack, createCombatState, tickCombat } from '../src/combat.js';

function advance(state, seconds) {
  for (let remaining = seconds; remaining > 1e-8; remaining -= 0.1) {
    tickCombat(state, Math.min(0.1, remaining));
  }
}

test('three light strikes form a stronger finisher, then restart the combo', () => {
  const state = createCombatState();
  const first = beginAttack(state, 'light', { armorDamage: 2 });
  advance(state, 0.36);
  const second = beginAttack(state, 'light', { armorDamage: 2 });
  advance(state, 0.36);
  const third = beginAttack(state, 'light', { armorDamage: 2 });
  advance(state, 0.36);
  const fourth = beginAttack(state, 'light', { armorDamage: 2 });
  assert.deepEqual([first.comboStep, second.comboStep, third.comboStep, fourth.comboStep], [1, 2, 3, 1]);
  assert.deepEqual([first.damage, second.damage, third.damage, fourth.damage], [2, 2, 4, 2]);
  assert.equal(third.stun, 0.35);
  assert.equal(first.stun, 0);
});

test('waiting beyond the combo window starts over', () => {
  const state = createCombatState();
  beginAttack(state, 'light');
  advance(state, 1.6);
  assert.equal(state.comboStep, 0);
  assert.equal(state.comboTimer, 0);
  assert.equal(beginAttack(state, 'light').comboStep, 1);
});

test('cooldown blocks repeated damage without changing state', () => {
  const state = createCombatState();
  beginAttack(state, 'light');
  const snapshot = structuredClone(state);
  assert.deepEqual(beginAttack(state, 'light'), { ok: false, reason: 'cooldown' });
  assert.deepEqual(state, snapshot);
  advance(state, 0.36);
  assert.equal(beginAttack(state, 'light').ok, true);
});

test('heavy strike requires ground, scales damage, and resets the light combo', () => {
  const state = createCombatState();
  assert.deepEqual(beginAttack(state, 'heavy', { grounded: false }), { ok: false, reason: 'airborne' });
  assert.deepEqual(state, createCombatState());
  beginAttack(state, 'light');
  const heavy = beginAttack(state, 'heavy', { armorDamage: 2 });
  assert.equal(heavy.damage, 6);
  assert.equal(heavy.range, 5.5);
  assert.equal(heavy.stun, 0.9);
  assert.equal(heavy.duration, 0.6);
  assert.equal(state.cooldowns.heavy, 1.25);
  assert.equal(state.comboStep, 0);
  assert.equal(state.comboTimer, 0);
});

test('slam is available only in free air, with its own area and cooldown', () => {
  const state = createCombatState();
  assert.deepEqual(beginAttack(state, 'slam'), { ok: false, reason: 'grounded' });
  assert.deepEqual(beginAttack(state, 'slam', { grounded: false, grappling: true }), { ok: false, reason: 'grappling' });
  assert.deepEqual(state, createCombatState());
  const result = beginAttack(state, 'slam', { grounded: false, armorDamage: 2 });
  assert.equal(result.damage, 4);
  assert.equal(result.radius, 7);
  assert.equal(result.duration, 0.9);
  assert.equal(state.cooldowns.slam, 3.5);
});

test('smoke stuns without damage on ground or in air and has a long cooldown', () => {
  for (const grounded of [true, false]) {
    const state = createCombatState();
    const smoke = beginAttack(state, 'smoke', { grounded, armorDamage: 10 });
    assert.equal(smoke.ok, true);
    assert.equal(smoke.damage, 0);
    assert.equal(smoke.radius, 10);
    assert.equal(smoke.stun, 3);
    assert.equal(state.cooldowns.smoke, 9);
    advance(state, 1);
    assert.equal(beginAttack(state, 'smoke', { grounded }).reason, 'cooldown');
    advance(state, 8);
    assert.equal(beginAttack(state, 'smoke', { grounded }).ok, true);
  }
});

test('every attack is blocked during grappling without consuming any state', () => {
  for (const type of Object.keys(ATTACKS)) {
    const state = createCombatState();
    const snapshot = structuredClone(state);
    assert.deepEqual(beginAttack(state, type, { grounded: false, grappling: true }), { ok: false, reason: 'grappling' });
    assert.deepEqual(state, snapshot);
  }
});

test('unsupported attack names, including object prototype keys, are rejected', () => {
  const state = createCombatState();
  for (const type of ['laser', 'toString', '__proto__', undefined]) {
    assert.deepEqual(beginAttack(state, type), { ok: false, reason: 'unknown' });
    assert.deepEqual(state, createCombatState());
  }
});

test('invalid armor multipliers fall back to one and excessive multipliers are capped', () => {
  for (const armorDamage of [NaN, Infinity, -2, 0, '2']) {
    assert.equal(beginAttack(createCombatState(), 'heavy', { armorDamage }).damage, 3);
  }
  assert.equal(beginAttack(createCombatState(), 'heavy', { armorDamage: 100 }).damage, 30);
});

test('animation has remaining and total time and finishes independently of cooldown', () => {
  const state = createCombatState();
  beginAttack(state, 'light');
  assert.equal(state.animation, 'light');
  assert.equal(state.animationTime, 0.28);
  assert.equal(state.animationDuration, 0.28);
  assert.equal(state.lastAttack, 'light');
  advance(state, 0.28);
  assert.equal(state.animation, null);
  assert.equal(state.animationTime, 0);
  assert.ok(state.cooldowns.light > 0);
});

test('invalid frame times do not change timers and large frame times are clamped', () => {
  const state = createCombatState();
  beginAttack(state, 'heavy');
  const snapshot = structuredClone(state);
  for (const dt of [NaN, Infinity, -1, 0, undefined, '0.1']) tickCombat(state, dt);
  assert.deepEqual(state, snapshot);
  tickCombat(state, 20);
  assert.equal(state.cooldowns.heavy, 1.15);
  assert.equal(state.animationTime, 0.5);
});

test('separate combat states do not share cooldowns or combos', () => {
  const first = createCombatState();
  const second = createCombatState();
  beginAttack(first, 'light');
  assert.deepEqual(second, createCombatState());
  assert.equal(beginAttack(second, 'light').comboStep, 1);
  advance(first, 0.36);
  assert.equal(second.cooldowns.light, 0.36);
});
