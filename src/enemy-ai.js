/** Enemy attack clocks are separate from rendering, detection and damage. */
export const ENEMY_ARCHETYPES = Object.freeze({
  brawler: Object.freeze({
    id: 'brawler', name: 'Capanga', color: 0xd99755,
    health: 3, speed: 3.2, range: 2.8, damage: 9,
    telegraphTime: 0.68, recoveryTime: 1.1, preferredDistance: 2.2,
    attackStyle: 'melee',
  }),
  bruiser: Object.freeze({
    id: 'bruiser', name: 'Brutamontes', color: 0xce626b,
    health: 6, speed: 2.1, range: 3.6, damage: 17,
    telegraphTime: 1.05, recoveryTime: 1.6, preferredDistance: 2.8,
    attackStyle: 'heavy',
  }),
  shooter: Object.freeze({
    id: 'shooter', name: 'Atirador', color: 0x769fd1,
    health: 3, speed: 2.5, range: 19, damage: 10,
    telegraphTime: 0.9, recoveryTime: 1.9, preferredDistance: 10,
    attackStyle: 'ranged',
  }),
});

const EPSILON = 1e-8;
const validTime = value => Number.isFinite(value) && value >= 0;

export function createEnemyAttackState({ cooldown = 0.8 } = {}) {
  return { phase: 'ready', remaining: 0, cooldown: validTime(cooldown) ? cooldown : 0.8 };
}

/**
 * Call once per active enemy per simulation frame. During 'windup', the actor
 * should hold position and display a warning. Apply damage/projectile only when
 * `attack` is true, rechecking position/line of sight in the scene integration.
 * A windup that loses range still reaches recovery, but produces no hit.
 */
export function updateEnemyAttack(state, {
  dt, inRange = false, stunned = false, archetype = 'brawler',
} = {}) {
  const definition = Object.hasOwn(ENEMY_ARCHETYPES, archetype)
    ? ENEMY_ARCHETYPES[archetype] : ENEMY_ARCHETYPES.brawler;
  const result = { attack: false, started: false, cancelled: false, phase: state.phase, telegraph: 0 };
  if (!Number.isFinite(dt) || dt <= 0) return result;
  const elapsed = Math.min(dt, 0.1);
  state.cooldown = Math.max(0, state.cooldown - elapsed);
  if (stunned) {
    result.cancelled = state.phase === 'windup';
    state.phase = 'ready';
    state.remaining = 0;
    state.cooldown = Math.max(state.cooldown, 0.4);
  } else if (state.phase === 'windup') {
    state.remaining = Math.max(0, state.remaining - elapsed);
    if (state.remaining <= EPSILON) {
      result.attack = inRange === true;
      state.phase = 'recovery';
      state.remaining = definition.recoveryTime;
    }
  } else if (state.phase === 'recovery') {
    state.remaining = Math.max(0, state.remaining - elapsed);
    if (state.remaining <= EPSILON) state.phase = 'ready';
  } else if (inRange === true && state.cooldown <= EPSILON) {
    state.phase = 'windup';
    state.remaining = definition.telegraphTime;
    result.started = true;
  }
  result.phase = state.phase;
  result.telegraph = state.phase === 'windup'
    ? Math.max(0, Math.min(1, 1 - state.remaining / definition.telegraphTime)) : 0;
  return result;
}
