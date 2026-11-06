/** Small, renderer-independent helpers. Player positions refer to their feet. */
const RADIUS = 0.55;
const HEIGHT = 2.5;
const EPSILON = 0.0001;
const WORLD_BOUND = 230;

export function distance3(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

function overlapsFootprint(position, building, radius) {
  return position.x + radius > building.x - building.w / 2 + EPSILON &&
    position.x - radius < building.x + building.w / 2 - EPSILON &&
    position.z + radius > building.z - building.d / 2 + EPSILON &&
    position.z - radius < building.z + building.d / 2 - EPSILON;
}

function intersectsHeight(position, building, height) {
  return position.y < building.h - EPSILON && position.y + height > EPSILON;
}

const bodyDimension = (value, fallback) => typeof value === 'number' &&
  Number.isFinite(value) && value > EPSILON ? value : fallback;

/**
 * Integrate one movement step against solid, ground-based buildings.
 * Apply gravity to velocity.y before calling this function. Both arguments are
 * mutated so callers may use THREE.Vector3 or ordinary coordinate objects.
 * Optional body dimensions allow the child protagonist and adult NPCs to use
 * the same solver. Invalid dimensions keep the original adult defaults.
 */
export function moveAndCollide(position, velocity, dt, buildings, grounded = false, body = {}) {
  if (!Number.isFinite(dt) || dt <= 0) return { grounded, landed: false };
  const radius = bodyDimension(body?.radius, RADIUS);
  const height = bodyDimension(body?.height, HEIGHT);
  // Keep movement steps shorter than the body diameter, including smaller
  // actors, so a fast crossing cannot skip a thin wall.
  const maximumStep = Math.min(0.4, radius);
  const steps = Math.max(1, Math.ceil(Math.max(
    Math.abs(velocity.x), Math.abs(velocity.y), Math.abs(velocity.z),
  ) * dt / maximumStep));
  const step = dt / steps;
  let onGround = false;

  for (let i = 0; i < steps; i++) {
    // Solve horizontal axes separately, allowing movement along walls.
    for (const axis of ['x', 'z']) {
      const movement = velocity[axis] * step;
      position[axis] += movement;
      if (movement !== 0) {
        for (const building of buildings) {
          if (!intersectsHeight(position, building, height) || !overlapsFootprint(position, building, radius)) continue;
          const halfSize = (axis === 'x' ? building.w : building.d) / 2;
          position[axis] = building[axis] + (movement > 0 ? -1 : 1) * (halfSize + radius);
          velocity[axis] = 0;
        }
      }
      const lower=axis==='x'&&Number.isFinite(body?.minX)?Math.min(-radius,body.minX):-WORLD_BOUND;
      const constrained = Math.max(lower, Math.min(WORLD_BOUND, position[axis]));
      if (constrained !== position[axis]) velocity[axis] = 0;
      position[axis] = constrained;
    }

    const previousY = position.y;
    position.y += velocity.y * step;
    onGround = false;

    if (velocity.y <= 0) {
      // Choose the highest roof crossed in this step, independent of list order.
      let surface = 0;
      for (const building of buildings) {
        if (overlapsFootprint(position, building, radius) &&
            previousY >= building.h - EPSILON && position.y <= building.h + EPSILON) {
          surface = Math.max(surface, building.h);
        }
      }
      if (position.y <= surface + EPSILON) {
        position.y = surface;
        velocity.y = 0;
        onGround = true;
      }
    }
    if (position.y < 0) {
      position.y = 0;
      velocity.y = Math.max(0, velocity.y);
      onGround = velocity.y === 0;
    }
  }
  return { grounded: onGround, landed: onGround && !grounded };
}

/** Pick a visible-direction rooftop anchor; never select behind the player. */
export function selectGrappleAnchor(position, forward, anchors, maxDistance = 95) {
  const forwardLength = Math.hypot(forward.x, forward.z);
  if (forwardLength < EPSILON) return null;
  let best = null;
  let bestScore = -Infinity;
  for (const anchor of anchors) {
    const dx = anchor.x - position.x;
    const dz = anchor.z - position.z;
    const dy = anchor.y - position.y;
    const horizontal = Math.hypot(dx, dz);
    const distance = Math.hypot(horizontal, dy);
    if (distance < 5 || distance > maxDistance || horizontal < 1) continue;
    const alignment = (dx * forward.x + dz * forward.z) / (horizontal * forwardLength);
    if (alignment < 0.2) continue;
    // Prefer center-of-view, nearby rooftops with a modest upward advantage.
    const score = alignment * 65 - distance * 0.4 + Math.min(25, Math.max(-25, dy)) * 0.45;
    if (score > bestScore) {
      bestScore = score;
      best = anchor;
    }
  }
  return best;
}
