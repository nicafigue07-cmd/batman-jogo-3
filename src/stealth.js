const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

/**
 * Updates one guard's awareness in place. angleCos is the dot product of the
 * guard's forward direction and the direction from the guard to the player.
 * An attack is audible within the standing detection radius, provided the
 * player is not hidden by smoke or a wall.
 */
export function updateAwareness(state, {
  dt, distance, angleCos, lineOfSight, crouching = false,
  smoked = false, attacking = false,
} = {}) {
  if (!state || typeof state !== 'object') state = {};
  state.awareness = Number.isFinite(state.awareness) ? clamp(state.awareness, 0, 1) : 0;
  state.alerted = state.alerted === true;
  if (!Number.isFinite(dt) || dt <= 0) return state;

  const validPosition = Number.isFinite(distance) && distance >= 0
    && Number.isFinite(angleCos) && angleCos >= -1 && angleCos <= 1;
  const radius = crouching && !attacking ? 10 : 18;
  const detected = validPosition && lineOfSight === true && !smoked
    && distance <= radius && (distance <= 3 || angleCos > 0.45 || attacking);

  if (detected) {
    const secondsToAlert = crouching && !attacking ? 3 : 1.7;
    state.awareness = clamp(state.awareness + dt / secondsToAlert, 0, 1);
  } else {
    state.awareness = clamp(state.awareness - dt, 0, 1);
  }

  // Hysteresis keeps a pursuing guard from instantly forgetting the player.
  if (state.awareness >= 1 - 1e-10) {
    state.awareness = 1;
    state.alerted = true;
  } else if (state.awareness < 0.2) {
    state.alerted = false;
  }
  return state;
}

/** True only for a close, unalerted ordinary guard approached from behind. */
export function canSilentTakedown({
  distance, angleCos, alerted, boss = false, heightDifference = 0,
} = {}) {
  return Number.isFinite(distance) && distance >= 0 && distance <= 3
    && Number.isFinite(angleCos) && angleCos >= -1 && angleCos < -0.2
    && Number.isFinite(heightDifference) && Math.abs(heightDifference) < 2
    && !alerted && !boss;
}
