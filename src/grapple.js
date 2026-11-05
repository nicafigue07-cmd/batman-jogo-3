/** Renderer-independent rooftop targeting and collision-safe grapple paths. */
const PLAYER_RADIUS = 0.55;
const ROOF_CLEARANCE = 3;
const MAX_ARC_HEIGHT = 90;
const LAUNCH_FRACTION = 0.22;
const DESCENT_START = 0.68;
const EPSILON = 0.00001;

const clamp = value => Math.max(0, Math.min(1, typeof value === 'number' && !Number.isNaN(value) ? value : 0));
const smooth = value => value * value * (3 - 2 * value);
const pointIsValid = point => point && ['x','y','z'].every(axis => Number.isFinite(point[axis]));
const copyPoint = point => ({ x: point.x, y: point.y, z: point.z });
const buildingIsValid = building => building && ['x','z','w','d','h'].every(key => Number.isFinite(building[key])) && building.w > 0 && building.d > 0 && building.h >= 0;

function roofAt(target, buildings) {
  let roof = null;
  for (const building of buildings) {
    if (!buildingIsValid(building) || building.w <= PLAYER_RADIUS * 2 || building.d <= PLAYER_RADIUS * 2) continue;
    if (Math.abs(target.x - building.x) > building.w / 2 - PLAYER_RADIUS ||
        Math.abs(target.z - building.z) > building.d / 2 - PLAYER_RADIUS) continue;
    if (!roof || building.h > roof.h) roof = building;
  }
  return roof;
}

function insideFootprint(point, building) {
  return Math.abs(point.x - building.x) < building.w / 2 + PLAYER_RADIUS - EPSILON &&
    Math.abs(point.z - building.z) < building.d / 2 + PLAYER_RADIUS - EPSILON;
}

/** Closed interval of the straight horizontal route inside an expanded box. */
function crossingInterval(start, target, building) {
  let enter = 0, exit = 1;
  for (const [axis,size] of [['x','w'],['z','d']]) {
    const delta = target[axis] - start[axis];
    const minimum = building[axis] - building[size] / 2 - PLAYER_RADIUS;
    const maximum = building[axis] + building[size] / 2 + PLAYER_RADIUS;
    if (Math.abs(delta) < EPSILON) {
      if (start[axis] <= minimum + EPSILON || start[axis] >= maximum - EPSILON) return null;
      continue;
    }
    const a = (minimum - start[axis]) / delta;
    const b = (maximum - start[axis]) / delta;
    enter = Math.max(enter, Math.min(a,b));
    exit = Math.min(exit, Math.max(a,b));
    if (exit < enter + EPSILON) return null;
  }
  return exit >= 0 && enter <= 1 ? { enter: clamp(enter), exit: clamp(exit) } : null;
}

function inverseSmooth(value) {
  let low = 0, high = 1;
  for (let step = 0; step < 32; step++) {
    const middle = (low + high) / 2;
    if (smooth(middle) < value) low = middle; else high = middle;
  }
  return (low + high) / 2;
}

function descentAt(travelProgress) {
  return smooth(clamp((travelProgress - DESCENT_START) / (1 - DESCENT_START)));
}

/**
 * Build a vertical launch followed by a smooth pull and late rooftop landing.
 * Horizontal travel is monotonic along a straight segment. Height only falls
 * during that travel, so every obstacle's exit is its lowest crossing point.
 */
export function planGrapple(position, target, { speed = 58, buildings = [] } = {}) {
  if (!pointIsValid(position) || !pointIsValid(target) || !Number.isFinite(speed) || speed <= 0 || !Array.isArray(buildings)) return null;
  const start = copyPoint(position), destination = copyPoint(target);
  const solids = buildings.filter(buildingIsValid);
  let landingRoof = null;
  if (solids.length) {
    landingRoof = roofAt(destination, solids);
    if (!landingRoof || Math.abs(destination.y - landingRoof.h) > 4) return null;
    destination.y = landingRoof.h;
  }
  const horizontal = Math.hypot(destination.x - start.x, destination.z - start.z);
  const distance = Math.hypot(horizontal, destination.y - start.y);
  if (!Number.isFinite(distance) || distance < EPSILON) return null;

  const baseHeight = Math.max(start.y, destination.y);
  let peakHeight = baseHeight + Math.max(8, Math.min(22, horizontal * 0.1));
  for (const building of solids) {
    // An invalid initial overlap cannot be repaired by moving through the solid.
    if (insideFootprint(start,building) && start.y < building.h - EPSILON) return null;
    if (building === landingRoof) continue;
    const interval = crossingInterval(start,destination,building);
    if (!interval) continue;
    const travelProgress = inverseSmooth(interval.exit);
    const remainingHeight = 1 - descentAt(travelProgress);
    const neededHeight = building.h + ROOF_CLEARANCE;
    if (neededHeight <= destination.y) continue;
    if (remainingHeight < EPSILON) return null;
    peakHeight = Math.max(peakHeight, destination.y + (neededHeight - destination.y) / remainingHeight);
  }
  const arcHeight = peakHeight - baseHeight;
  if (!Number.isFinite(arcHeight) || arcHeight > MAX_ARC_HEIGHT + EPSILON) return null;
  const duration = Math.max(0.55, (distance + arcHeight * 0.45) / speed);
  if (!Number.isFinite(duration)) return null;
  return {
    start,
    target: destination,
    peakHeight,
    arcHeight,
    launchFraction: LAUNCH_FRACTION,
    duration,
  };
}

export function sampleGrapple(plan, progress) {
  if (!plan || !pointIsValid(plan.start) || !pointIsValid(plan.target) || !Number.isFinite(plan.peakHeight) ||
      !Number.isFinite(plan.launchFraction) || plan.launchFraction <= 0 || plan.launchFraction >= 1) return null;
  const t = clamp(progress);
  if (t === 0) return copyPoint(plan.start);
  if (t === 1) return copyPoint(plan.target);
  if (t <= plan.launchFraction) {
    const launch = t / plan.launchFraction;
    // A quick initial rise eases into the pull without crossing a nearby wall.
    const rise = 1 - (1 - launch) ** 3;
    return { x: plan.start.x, y: plan.start.y + (plan.peakHeight - plan.start.y) * rise, z: plan.start.z };
  }
  const travel = (t - plan.launchFraction) / (1 - plan.launchFraction);
  const horizontal = smooth(travel);
  return {
    x: plan.start.x + (plan.target.x - plan.start.x) * horizontal,
    y: plan.peakHeight + (plan.target.y - plan.peakHeight) * descentAt(travel),
    z: plan.start.z + (plan.target.z - plan.start.z) * horizontal,
  };
}

/** Preserve useful forward momentum when E or Space releases the cable. */
export function releaseGrapple(plan, progress) {
  const t = clamp(progress);
  const dx = plan?.target?.x - plan?.start?.x;
  const dz = plan?.target?.z - plan?.start?.z;
  const length = Math.hypot(dx,dz);
  const validDirection = Number.isFinite(length) && length > EPSILON;
  const speed = 14 + t * 10;
  return { x: validDirection ? dx / length * speed : 0, y: 12 - t * 4, z: validDirection ? dz / length * speed : -speed };
}

/** Aim first, then validate candidates until a reachable landing is found. */
export function selectGrappleTarget(position, forward, anchors, buildings, maxDistance = 145) {
  if (!pointIsValid(position) || !forward || !Number.isFinite(forward.x) || !Number.isFinite(forward.z) ||
      !Array.isArray(anchors) || !Array.isArray(buildings) || !Number.isFinite(maxDistance) || maxDistance <= 0) return null;
  const forwardLength = Math.hypot(forward.x,forward.z);
  if (!Number.isFinite(forwardLength) || forwardLength < EPSILON) return null;
  const candidates = [];
  for (const anchor of anchors) {
    if (!pointIsValid(anchor)) continue;
    const roof = roofAt(anchor,buildings);
    if (!roof || Math.abs(anchor.y - roof.h) > 4) continue;
    const dx = anchor.x - position.x, dz = anchor.z - position.z;
    const horizontal = Math.hypot(dx,dz);
    if (horizontal < 3) continue;
    const target = { ...anchor, y: roof.h };
    const elevation = target.y - position.y;
    const distance = Math.hypot(horizontal,elevation);
    if (!Number.isFinite(distance) || distance > maxDistance || distance < 5) continue;
    const alignment = dx / horizontal * (forward.x / forwardLength) + dz / horizontal * (forward.z / forwardLength);
    if (alignment < 0.35) continue;
    const score = alignment ** 4 * 160 - distance * 0.22 + Math.max(-25,Math.min(40,elevation)) * 0.1;
    candidates.push({ target, score });
  }
  candidates.sort((a,b) => b.score - a.score);
  for (const {target} of candidates) if (planGrapple(position,target,{buildings})) return target;
  return null;
}
