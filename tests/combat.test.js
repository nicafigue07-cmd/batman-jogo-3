import test from 'node:test';
import assert from 'node:assert/strict';
import { ATTACKS, beginAttack, createCombatState, tickCombat, beginParry, resolveDefense, registerHit, beginFinisher, FOCUS_MAX, PARRY_WINDOW } from '../src/combat.js';

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


test('parry must meet an incoming hit inside its short active window', () => {
  const early = createCombatState();
  assert.equal(resolveDefense(early).parried, false);
  assert.equal(beginParry(early).ok, true);
  const perfect = resolveDefense(early);
  assert.equal(perfect.parried, true);
  assert.equal(perfect.perfect, true);
  assert.equal(perfect.counterDamage, 3);
  assert.equal(perfect.stun, 1.8);
  assert.equal(early.focus, 20);
  assert.equal(resolveDefense(early).parried, false, 'one input counters at most one incoming hit');
  assert.equal(early.focus, 20);

  const late = createCombatState();
  beginParry(late);
  advance(late, 0.2);
  const normal = resolveDefense(late);
  assert.equal(normal.parried, true);
  assert.equal(normal.perfect, false);
  assert.equal(normal.counterDamage, 1);
  assert.equal(normal.stun, 0.9);

  const expired = createCombatState();
  beginParry(expired);
  advance(expired, PARRY_WINDOW);
  assert.equal(resolveDefense(expired).parried, false);
  assert.equal(expired.focus, 0, 'an empty parry earns no focus');
});

test('invalid parries and cooldown retries preserve combat state', () => {
  const state = createCombatState();
  for (const options of [{ grounded: false }, { grappling: true }]) {
    const before = structuredClone(state);
    assert.equal(beginParry(state, options).ok, false);
    assert.deepEqual(state, before);
  }
  beginParry(state);
  let before = structuredClone(state);
  assert.equal(beginParry(state).reason, 'cooldown');
  assert.deepEqual(state, before);
  assert.equal(resolveDefense(state, { parryable: false }).parried, false);
  assert.deepEqual(state, before, 'an unblockable attack does not spend the pending window');
  advance(state, 0.75);
  assert.equal(beginParry(state).ok, true);
});

test('focus is earned from confirmed hits and caps without overflow', () => {
  const state = createCombatState();
  assert.equal(registerHit(state).focusGained, 8);
  assert.equal(registerHit(state, { silent: true }).focusGained, 15);
  assert.equal(state.focus, 23);
  for (let i = 0; i < 20; i++) registerHit(state);
  assert.equal(state.focus, FOCUS_MAX);
  assert.deepEqual(registerHit(state), { focus: 100, focusGained: 0, ready: true });
  beginParry(state);
  assert.equal(resolveDefense(state).focusGained, 0, 'counter does not overflow a full bar');
  assert.equal(state.focus, 100);
  assert.equal(createCombatState().focus, 0, 'new fights have independent focus');
});

test('finisher spends focus only when its target, movement and bar are valid', () => {
  const state = createCombatState();
  assert.equal(beginFinisher(state, { hasTarget: true }).reason, 'focus');
  state.focus = 100;
  for (const [options, reason] of [
    [{ hasTarget: false }, 'target'],
    [{ hasTarget: true, grounded: false }, 'airborne'],
    [{ hasTarget: true, grappling: true }, 'grappling'],
  ]) {
    const before = structuredClone(state);
    assert.equal(beginFinisher(state, options).reason, reason);
    assert.deepEqual(state, before, 'rejected finishers never consume the full bar');
  }
  beginAttack(state, 'light');
  const result = beginFinisher(state, { hasTarget: true });
  assert.deepEqual(result, { ok: true, type: 'finisher', damage: 8, range: 6, stun: 2, duration: 0.85 });
  assert.equal(state.focus, 0);
  assert.equal(state.comboStep, 0);
  assert.equal(state.animation, 'finisher');
  assert.equal(state.animationTime, 0.85);
  const before = structuredClone(state);
  assert.equal(beginFinisher(state, { hasTarget: true }).reason, 'finishing');
  assert.equal(beginParry(state).reason, 'finishing');
  assert.equal(beginAttack(state, 'light').reason, 'finishing');
  assert.deepEqual(state, before, 'finisher animation cannot be overwritten by queued attacks');
  advance(state, 0.85);
  assert.equal(state.animation, null);
  assert.equal(beginFinisher(state, { hasTarget: true }).reason, 'focus');
});

test('defense clocks pause on invalid dt and clamp long frames consistently', () => {
  const state = createCombatState();
  beginParry(state);
  const before = structuredClone(state);
  for (const dt of [0, -1, NaN, Infinity, '0.1']) tickCombat(state, dt);
  assert.deepEqual(state, before);
  tickCombat(state, 10);
  assert.ok(Math.abs(state.defenseWindow - 0.22) < 1e-8);
  assert.ok(Math.abs(state.defenseCooldown - 0.65) < 1e-8);
  assert.ok(Math.abs(state.defenseElapsed - 0.1) < 1e-8);
});
