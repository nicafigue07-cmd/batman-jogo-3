import test from 'node:test';
import assert from 'node:assert/strict';
import { selectGrappleTarget, planGrapple, sampleGrapple, releaseGrapple } from '../src/grapple.js';

const EPSILON = 1e-6;
const start = { x: 0, y: 10, z: 0 };
const forward = { x: 0, z: -1 };
const sourceRoof = { x: 0, z: 0, w: 20, d: 20, h: 10 };
const roof = (x, z, h, w = 24, d = 24) => ({ x, z, w, d, h });
const anchor = building => ({ x: building.x, y: building.h + 2.4, z: building.z });
const point = building => ({ x: building.x, y: building.h, z: building.z });

function assertFinitePoint(value) {
  assert.ok(['x', 'y', 'z'].every(axis => Number.isFinite(value[axis])), 'all coordinates are finite');
}

function assertClears(plan, obstacle) {
  let crossed = false;
  for (let index = 0; index <= 2000; index++) {
    const position = sampleGrapple(plan, index / 2000);
    assertFinitePoint(position);
    const overlaps = Math.abs(position.x - obstacle.x) <= obstacle.w / 2 + .55 &&
      Math.abs(position.z - obstacle.z) <= obstacle.d / 2 + .55;
    if (overlaps) {
      crossed = true;
      assert.ok(position.y >= obstacle.h + 3 - EPSILON,
        `player feet at ${position.y} must clear roof ${obstacle.h} at progress ${index / 2000}`);
    }
  }
  assert.equal(crossed, true, 'the sampled route crosses the obstacle footprint');
}

test('grapple aim prefers the centered roof over a nearer roof to the side', () => {
  const centered = roof(0, -80, 20);
  const side = roof(32, -32, 15, 20, 20);
  const selected = selectGrappleTarget(start, forward, [anchor(side), anchor(centered)], [sourceRoof, side, centered]);
  assert.ok(selected);
  assert.deepEqual({ x: selected.x, y: selected.y, z: selected.z }, point(centered));
});

test('selected targets are detached from anchors and land at the exact actual roof height', () => {
  const destination = roof(0, -60, 31);
  const originalAnchor = anchor(destination);
  const anchors = [originalAnchor];
  const buildings = [sourceRoof, destination];
  const original = structuredClone({ start, forward, anchors, buildings });
  const selected = selectGrappleTarget(start, forward, anchors, buildings);
  assert.notEqual(selected, originalAnchor);
  assert.deepEqual({ x: selected.x, y: selected.y, z: selected.z }, point(destination));
  assert.deepEqual({ start, forward, anchors, buildings }, original);
});

test('own-roof, rear and out-of-range anchors cannot be selected', () => {
  const rear = roof(0, 45, 20);
  const distant = roof(0, -210, 20);
  const anchors = [{ x: 1, y: 12.4, z: -1 }, anchor(rear), anchor(distant)];
  assert.equal(selectGrappleTarget(start, forward, anchors, [sourceRoof, rear, distant], 145), null);
});

test('selection respects its default range and an explicit longer range', () => {
  const nearLimit = roof(0, -140, start.y);
  const beyondDefault = roof(0, -165, start.y);
  const selectedNear = selectGrappleTarget(start, forward, [anchor(nearLimit)], [sourceRoof, nearLimit]);
  assert.ok(selectedNear, 'a roof 140 meters ahead remains reachable within the default 145-meter range');
  assert.deepEqual({ x: selectedNear.x, y: selectedNear.y, z: selectedNear.z }, point(nearLimit));
  assert.equal(selectGrappleTarget(start, forward, [anchor(beyondDefault)], [sourceRoof, beyondDefault]), null);
  const selectedFar = selectGrappleTarget(start, forward, [anchor(beyondDefault)], [sourceRoof, beyondDefault], 170);
  assert.ok(selectedFar, 'an explicit 170-meter range permits the roof 165 meters ahead');
  assert.deepEqual({ x: selectedFar.x, y: selectedFar.y, z: selectedFar.z }, point(beyondDefault));
});

test('a forward anchor without a valid roof or with an invalid building cannot be selected', () => {
  const ahead = { x: 0, y: 22.4, z: -40 };
  assert.equal(selectGrappleTarget(start, forward, [ahead], [sourceRoof]), null);
  for (const invalidRoof of [roof(0, -40, NaN), roof(0, -40, -5), roof(0, -40, 20, 0, 24)]) {
    assert.equal(selectGrappleTarget(start, forward, [ahead], [sourceRoof, invalidRoof]), null);
  }
  assert.equal(selectGrappleTarget(start, { x: 0, z: 0 }, [ahead], [sourceRoof, roof(0, -40, 20)]), null);
});

test('planning and sampling clear an intervening taller building throughout its expanded footprint', () => {
  const middle = roof(0, -45, 62, 30, 18);
  const destination = roof(0, -100, 25);
  const plan = planGrapple(start, point(destination), { buildings: [sourceRoof, middle, destination] });
  assert.ok(plan);
  assert.ok(plan.arcHeight <= 90);
  assert.ok(Number.isFinite(plan.duration) && plan.duration > 0);
  assertClears(plan, middle);
  assert.deepEqual(sampleGrapple(plan, 0), start);
  assert.deepEqual(sampleGrapple(plan, 1), point(destination));
});

test('vertical launch clears a wall close to the starting roof before horizontal travel', () => {
  const smallSource = roof(0, 0, 10, 8, 8);
  const nearbyWall = roof(0, -8, 55, 20, 4);
  const destination = roof(0, -80, 20);
  const plan = planGrapple(start, point(destination), { buildings: [smallSource, nearbyWall, destination] });
  assert.ok(plan);
  assert.ok(plan.launchFraction > 0 && plan.launchFraction < .5);
  const launch = sampleGrapple(plan, plan.launchFraction / 2);
  assert.equal(launch.x, start.x);
  assert.equal(launch.z, start.z);
  assert.ok(launch.y > start.y);
  const apex = sampleGrapple(plan, plan.launchFraction);
  assert.ok(Math.abs(apex.y - plan.peakHeight) < EPSILON);
  assertClears(plan, nearbyWall);
});

test('an obstacle intersected only by the player radius still receives vertical clearance', () => {
  const grazingObstacle = roof(.7, -40, 60, .4, 12);
  const destination = roof(0, -90, 20);
  const plan = planGrapple(start, point(destination), { buildings: [sourceRoof, grazingObstacle, destination] });
  assert.ok(plan);
  assertClears(plan, grazingObstacle);
});

test('a path requiring more than the maximum arc height is rejected', () => {
  const tooTall = roof(0, -45, 180, 18, 18);
  const destination = roof(0, -100, 20);
  assert.equal(planGrapple(start, point(destination), { buildings: [sourceRoof, tooTall, destination] }), null);
});

test('selection falls back to a reachable side roof when the preferred centered path is blocked', () => {
  const centered = roof(0, -100, 20);
  const alternative = roof(30, -100, 20, 20, 24);
  const wall = roof(0, -45, 180, 18, 18);
  const anchors = [anchor(centered), anchor(alternative)];
  const clearSelection = selectGrappleTarget(start, forward, anchors, [sourceRoof, centered, alternative]);
  assert.deepEqual({ x: clearSelection.x, y: clearSelection.y, z: clearSelection.z }, point(centered));
  const blockedSelection = selectGrappleTarget(start, forward, anchors, [sourceRoof, wall, centered, alternative]);
  assert.ok(blockedSelection);
  assert.deepEqual({ x: blockedSelection.x, y: blockedSelection.y, z: blockedSelection.z }, point(alternative));
});

test('empty-world plans are allowed and a faster armor reduces traversal duration', () => {
  const target = { x: 35, y: 25, z: -100 };
  const standard = planGrapple(start, target, { speed: 48 });
  const tactical = planGrapple(start, target, { speed: 62 });
  assert.ok(standard && tactical);
  assert.ok(tactical.duration < standard.duration);
  assert.deepEqual(sampleGrapple(standard, 1), target);
  assert.deepEqual(sampleGrapple(tactical, 1), target);
});

test('invalid speeds and speeds producing infinite duration do not create unusable plans', () => {
  const target = { x: 0, y: 20, z: -100 };
  for (const speed of [0, NaN, Number.MIN_VALUE]) {
    assert.equal(planGrapple(start, target, { speed }), null);
  }
});

test('invalid starting or target coordinates are rejected without creating a plan', () => {
  const target = { x: 0, y: 20, z: -100 };
  const invalidPositions = [null, undefined, { x: NaN, y: 10, z: 0 }, { x: 0, y: Infinity, z: 0 }, { x: 0, y: 10 }, { x: '0', y: 10, z: 0 }];
  for (const invalid of invalidPositions) {
    assert.equal(planGrapple(invalid, target), null);
    assert.equal(planGrapple(start, invalid), null);
  }
});

test('sampling clamps progress to exact endpoints and never mutates the plan', () => {
  const target = { x: 20, y: 30, z: -80 };
  const originalStart = structuredClone(start);
  const originalTarget = structuredClone(target);
  const plan = planGrapple(start, target);
  const originalPlan = structuredClone(plan);
  assert.deepEqual(sampleGrapple(plan, -1), start);
  assert.deepEqual(sampleGrapple(plan, 2), target);
  assert.deepEqual(sampleGrapple(plan, -Infinity), start);
  assert.deepEqual(sampleGrapple(plan, Infinity), target);
  assert.deepEqual(sampleGrapple(plan, NaN), start);
  for (const progress of [0, .1, .5, .99, 1]) {
    const sampled = sampleGrapple(plan, progress);
    assertFinitePoint(sampled);
    assert.notEqual(sampled, plan.start);
    assert.notEqual(sampled, plan.target);
  }
  assert.deepEqual(plan, originalPlan);
  assert.deepEqual(start, originalStart);
  assert.deepEqual(target, originalTarget);
});

test('release produces bounded forward and upward momentum for ordinary and invalid progress', () => {
  const plan = planGrapple(start, { x: 0, y: 20, z: -100 });
  const original = structuredClone(plan);
  for (const progress of [-2, 0, .2, .5, 1, 3, NaN, Infinity, undefined]) {
    const velocity = releaseGrapple(plan, progress);
    assertFinitePoint(velocity);
    const horizontalSpeed = Math.hypot(velocity.x, velocity.z);
    assert.ok(horizontalSpeed >= 14 - EPSILON && horizontalSpeed <= 24 + EPSILON);
    assert.ok(velocity.y >= 8 - EPSILON && velocity.y <= 12 + EPSILON);
    assert.ok(velocity.z < 0, 'release momentum follows the grapple direction');
  }
  assert.deepEqual(plan, original);
});

test('release remains finite when the plan has no horizontal displacement', () => {
  const plan = planGrapple(start, { x: 0, y: 20, z: -100 });
  const verticalPlan = { ...plan, start: { ...start }, target: { ...start, y: 30 } };
  const zeroDistancePlan = { ...plan, start: { ...start }, target: { ...start } };
  for (const degenerate of [verticalPlan, zeroDistancePlan]) {
    const original = structuredClone(degenerate);
    for (const progress of [0, .5, 1, NaN]) {
      assertFinitePoint(releaseGrapple(degenerate, progress));
    }
    assert.deepEqual(degenerate, original);
  }
});

test('Wayne tower lands beside its spire on the upper crown instead of inside the base roof', () => {
  const source = roof(56, -112, 30, 40, 40);
  const launch = point(source);
  const wayneBase = roof(0, -168, 76, 40, 40);
  const lowerCrown = roof(0, -168, 81, 40 * .72, 40 * .72);
  const upperCrown = roof(0, -168, 84, 40 * .5, 40 * .5);
  const spire = roof(0, -168, 101, .55, .55);
  const buildings = [source, wayneBase, lowerCrown, upperCrown, spire];
  const aim = { x: 6 - launch.x, z: -168 - launch.z };
  const selected = selectGrappleTarget(launch, aim, [{ x: 6, y: 86.4, z: -168 }], buildings);
  assert.ok(selected, 'the offset crown anchor remains reachable');
  assert.deepEqual({ x: selected.x, y: selected.y, z: selected.z }, { x: 6, y: 84, z: -168 });
  const plan = planGrapple(launch, selected, { buildings });
  assert.ok(plan);
  assert.deepEqual(sampleGrapple(plan, 1), { x: 6, y: 84, z: -168 });
  for (let index = 0; index <= 2000; index++) {
    const position = sampleGrapple(plan, index / 2000);
    for (const solid of buildings) {
      const overlaps = Math.abs(position.x - solid.x) < solid.w / 2 + .55 - EPSILON &&
        Math.abs(position.z - solid.z) < solid.d / 2 + .55 - EPSILON;
      if (overlaps) assert.ok(position.y >= solid.h - EPSILON,
        `Wayne route enters a solid of height ${solid.h} at progress ${index / 2000}`);
    }
  }
  assert.equal(selectGrappleTarget(launch, aim, [{ x: 0, y: 78.4, z: -168 }], buildings), null,
    'the old center anchor cannot land beneath the crown and spire');
});
