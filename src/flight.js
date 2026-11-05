const finite = value => typeof value === 'number' && Number.isFinite(value);
const point = value => value != null && ['x', 'y', 'z'].every(axis => finite(value[axis]));

/** Count only a short, forward flight segment crossing the active gate's plane. */
export function crossedGlideGate(previous, current, gate, {
  gliding = false, grappling = false, slamming = false, radius = 8,
} = {}) {
  if (gliding !== true || grappling || slamming ||
      !point(previous) || !point(current) || !point(gate) ||
      !finite(radius) || radius < 0) return false;

  const direction = gate.directionZ ?? 1;
  if (direction !== 1 && direction !== -1) return false;
  const dx = current.x - previous.x;
  const dy = current.y - previous.y;
  const dz = current.z - previous.z;
  if (Math.hypot(dx, dz) <= .05 || Math.hypot(dx, dy, dz) >= 8) return false;
  if ((previous.z - gate.z) * direction >= 0 ||
      (current.z - gate.z) * direction < 0) return false;

  const progress = (gate.z - previous.z) / dz;
  const hitX = previous.x + dx * progress;
  const hitY = previous.y + dy * progress;
  return Math.hypot(hitX - gate.x, hitY - gate.y) <= radius;
}
