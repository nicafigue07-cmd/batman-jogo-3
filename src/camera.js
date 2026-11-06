/** Continuous camera-boom collision, independent of rendering and frame rate. */
const EPSILON = 1e-8;
const AXES = ['x', 'y', 'z'];
const finite = value => typeof value === 'number' && Number.isFinite(value);

function point(value, fallback) {
  return {
    x: finite(value?.x) ? value.x : fallback.x,
    y: finite(value?.y) ? value.y : fallback.y,
    z: finite(value?.z) ? value.z : fallback.z,
  };
}

function validBuilding(building) {
  return building && ['x', 'z', 'w', 'd', 'h'].every(key => finite(building[key])) &&
    building.w > 0 && building.d > 0 && building.h > 0;
}

function bounds(building, margin) {
  return {
    min: { x: building.x - building.w / 2 - margin, y: 0, z: building.z - building.d / 2 - margin },
    max: { x: building.x + building.w / 2 + margin, y: building.h + margin, z: building.z + building.d / 2 + margin },
  };
}

function contains(box, origin) {
  return AXES.every(axis => origin[axis] > box.min[axis] + EPSILON && origin[axis] < box.max[axis] - EPSILON);
}

/** Slab intersection returns an interval, so a narrow obstacle cannot be skipped. */
function intersect(origin, delta, box) {
  let enter = -Infinity, exit = Infinity;
  for (const axis of AXES) {
    if (Math.abs(delta[axis]) <= EPSILON) {
      // A segment on a boundary only touches the padding; it does not enter it.
      if (origin[axis] <= box.min[axis] + EPSILON || origin[axis] >= box.max[axis] - EPSILON) return null;
      continue;
    }
    const first = (box.min[axis] - origin[axis]) / delta[axis];
    const second = (box.max[axis] - origin[axis]) / delta[axis];
    enter = Math.max(enter, Math.min(first, second));
    exit = Math.min(exit, Math.max(first, second));
    if (enter >= exit - EPSILON) return null;
  }
  // Touching an end point or leaving a boundary is safe. Only its interior
  // intersection shortens the boom.
  if (exit <= EPSILON || enter >= 1 - EPSILON) return null;
  return { enter: Math.max(0, enter), exit: Math.min(1, exit) };
}

/**
 * Return the furthest safe point along target -> desired.
 * minDistance is a comfort preference; a closer wall always takes precedence.
 * If the target is within padding but outside the actual building, an outward
 * or tangential segment may leave that padding without collapsing the camera.
 */
export function clampCameraBoom(target, desired, buildings = [], options = {}) {
  const origin = point(target, { x: 0, y: 1.7, z: 0 });
  const destination = point(desired, origin);
  const margin = finite(options?.margin) && options.margin >= 0 ? options.margin : .55;
  const minDistance = finite(options?.minDistance) && options.minDistance >= 0 ? options.minDistance : 1.1;
  const delta = { x: destination.x - origin.x, y: destination.y - origin.y, z: destination.z - origin.z };
  const length = Math.hypot(delta.x, delta.y, delta.z);
  if (!Number.isFinite(length)) return { ...origin, occluded: true, distance: 0 };
  let nearest = 1;
  for (const building of Array.isArray(buildings) ? buildings : []) {
    if (!validBuilding(building)) continue;
    const expanded = bounds(building, margin);
    if (contains(expanded, origin)) {
      const solid = bounds(building, 0);
      if (contains(solid, origin)) {
        nearest = 0; // Never jump across a wall when the initial state overlaps it.
        break;
      }
      // The target can graze a facade because of the added camera padding.
      // Permit it to move away, but not through the real wall behind that padding.
      let outward = 0;
      for (const axis of AXES) {
        const nearestFace = Math.max(solid.min[axis], Math.min(solid.max[axis], origin[axis]));
        outward += (origin[axis] - nearestFace) * delta[axis];
      }
      if (outward < -EPSILON || intersect(origin, delta, solid)) nearest = 0;
      continue;
    }
    const hit = intersect(origin, delta, expanded);
    if (hit) nearest = Math.min(nearest, hit.enter);
  }
  const occluded = nearest < 1;
  if (!occluded || length <= EPSILON) return { ...destination, occluded, distance: length };
  const hitDistance = nearest * length;
  let distance = Math.max(0, hitDistance - .15);
  if (hitDistance > minDistance + EPSILON) distance = Math.max(distance, minDistance);
  distance = Math.min(length, distance);
  const fraction = distance / length;
  return {
    x: origin.x + delta.x * fraction,
    y: origin.y + delta.y * fraction,
    z: origin.z + delta.z * fraction,
    occluded, distance,
  };
}
