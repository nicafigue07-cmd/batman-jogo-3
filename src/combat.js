/** Combat timing and damage are independent of the renderer and input system. */
export const ATTACKS = Object.freeze({
  light: Object.freeze({ key: 'KeyJ', duration: 0.28, cooldown: 0.36, baseDamage: 1, range: 4.8 }),
  heavy: Object.freeze({ key: 'KeyK', duration: 0.6, cooldown: 1.25, baseDamage: 3, range: 5.5, stun: 0.9, needsGrounded: true }),
  slam: Object.freeze({ key: 'KeyL', duration: 0.9, cooldown: 3.5, baseDamage: 2, radius: 7, needsAirborne: true }),
  smoke: Object.freeze({ key: 'KeyZ', duration: 0.3, cooldown: 9, baseDamage: 0, radius: 10, stun: 3 }),
});

const COMBO_WINDOW = 1.6;
const EPSILON = 1e-8;

export function createCombatState() {
  return {
    cooldowns: { light: 0, heavy: 0, slam: 0, smoke: 0 },
    comboStep: 0,
    comboTimer: 0,
    animation: null,
    animationTime: 0,
    animationDuration: 0,
    lastAttack: null,
  };
}

/** Timers use seconds. A paused tab cannot skip cooldowns with one huge frame. */
export function tickCombat(state, dt) {
  if (!Number.isFinite(dt) || dt <= 0) return state;
  const elapsed = Math.min(dt, 0.1);
  const decrease = (value) => value - elapsed > EPSILON ? value - elapsed : 0;
  for (const type of Object.keys(ATTACKS)) {
    state.cooldowns[type] = decrease(state.cooldowns[type]);
  }
  state.comboTimer = decrease(state.comboTimer);
  if (state.comboTimer === 0) state.comboStep = 0;
  state.animationTime = decrease(state.animationTime);
  if (state.animationTime === 0) state.animation = null;
  return state;
}

/** A rejected attack never consumes a cooldown or advances the combo. */
export function beginAttack(state, type, { grounded = true, grappling = false, armorDamage = 1 } = {}) {
  if (!Object.hasOwn(ATTACKS, type)) return { ok: false, reason: 'unknown' };
  const attack = ATTACKS[type];
  if (grappling) return { ok: false, reason: 'grappling' };
  if (attack.needsGrounded && !grounded) return { ok: false, reason: 'airborne' };
  if (attack.needsAirborne && grounded) return { ok: false, reason: 'grounded' };
  if (state.cooldowns[type] > EPSILON) return { ok: false, reason: 'cooldown' };

  const multiplier = Number.isFinite(armorDamage) && armorDamage > 0 ? Math.min(10, armorDamage) : 1;
  const comboStep = type === 'light' ? (state.comboTimer > 0 ? state.comboStep % 3 + 1 : 1) : 0;
  const finisher = type === 'light' && comboStep === 3;
  const damage = (finisher ? 2 : attack.baseDamage) * multiplier;

  state.cooldowns[type] = attack.cooldown;
  state.comboStep = comboStep;
  state.comboTimer = type === 'light' ? COMBO_WINDOW : 0;
  state.animation = type;
  state.animationTime = attack.duration;
  state.animationDuration = attack.duration;
  state.lastAttack = type;

  return {
    ok: true,
    type,
    damage,
    range: attack.range ?? 0,
    radius: attack.radius ?? 0,
    stun: finisher ? 0.35 : attack.stun ?? 0,
    comboStep,
    duration: attack.duration,
  };
}
