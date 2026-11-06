import test from 'node:test';
import assert from 'node:assert/strict';
import { clampCameraBoom } from '../src/camera.js';

const wall = { x: 5, z: 0, w: 2, d: 8, h: 8 };
const target = { x: 0, y: 2, z: 0 };
const desired = { x: 12, y: 2, z: 0 };
const closeTo = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-7, `${actual} ~= ${expected}`);

test('a clear boom preserves the desired endpoint and never mutates inputs', () => {
  const before = structuredClone({ target, desired, wall });
  assert.deepEqual(clampCameraBoom(target, desired, []), { ...desired, occluded: false, distance: 12 });
  assert.deepEqual(clampCameraBoom(target, { x: 0, y: 2, z: 12 }, [wall]), { x: 0, y: 2, z: 12, occluded: false, distance: 12 });
  clampCameraBoom(target, desired, [wall]);
  assert.deepEqual({ target, desired, wall }, before);
});

test('continuous collision stops before thin pillars between old sample positions', () => {
  const pillar = { x: 3.37, z: 0, w: .02, d: .02, h: 10 };
  const result = clampCameraBoom(target, desired, [pillar], { margin: 0, minDistance: 0 });
  assert.equal(result.occluded, true);
  closeTo(result.x, 3.21);
  closeTo(result.distance, 3.21);
  assert.equal(result.y, target.y);
});

test('the nearest face wins regardless of building order and a close wall overrides minimum distance', () => {
  const far = { ...wall, x: 9 };
  const a = clampCameraBoom(target, desired, [wall, far]);
  const b = clampCameraBoom(target, desired, [far, wall]);
  assert.deepEqual(a, b);
  closeTo(a.x, 3.3);
  const near = clampCameraBoom(target, desired, [{ ...wall, x: 1.05, w: .1 }]);
  assert.equal(near.occluded, true);
  closeTo(near.distance, .3);
  assert.ok(near.distance < 1.1, 'minimum camera distance cannot put the camera across a wall');
});

test('parallel and corner-grazing booms remain stable', () => {
  const box = { x: 0, z: 0, w: 10, d: 10, h: 10 };
  const parallel = clampCameraBoom({ x: 5.55, y: 2, z: -8 }, { x: 5.55, y: 2, z: 8 }, [box]);
  assert.equal(parallel.occluded, false, 'touching the outer padding face is not an interior crossing');
  const corner = clampCameraBoom({ x: -8, y: 2, z: -2 }, { x: -2, y: 2, z: -8 }, [box], { margin: 0 });
  assert.equal(corner.occluded, false, 'one-point corner contact does not collapse the boom');
  const throughCorner = clampCameraBoom({ x: -8, y: 2, z: 4 }, { x: 4, y: 2, z: -8 }, [box], { margin: 0 });
  assert.equal(throughCorner.occluded, true);
  assert.ok(throughCorner.x < -5);
});

test('a rooftop does not block a camera above it but catches a descending boom', () => {
  const building = { x: 0, z: 0, w: 20, d: 20, h: 10 };
  const above = clampCameraBoom({ x: 0, y: 12, z: 0 }, { x: 8, y: 15, z: 0 }, [building]);
  assert.equal(above.occluded, false);
  const descending = clampCameraBoom({ x: 0, y: 12, z: 0 }, { x: 8, y: 5, z: 0 }, [building]);
  assert.equal(descending.occluded, true);
  assert.ok(descending.y > building.h + .55);
});

test('a target inside facade padding can leave it, but cannot look through the solid', () => {
  const building = { x: 0, z: 0, w: 10, d: 10, h: 10 };
  const paddingTarget = { x: 5.3, y: 2, z: 0 };
  const outward = clampCameraBoom(paddingTarget, { x: 12, y: 2, z: 0 }, [building]);
  assert.equal(outward.occluded, false);
  assert.equal(outward.x, 12);
  const inward = clampCameraBoom(paddingTarget, { x: -12, y: 2, z: 0 }, [building]);
  assert.equal(inward.occluded, true);
  assert.equal(inward.distance, 0);
  assert.equal(inward.x, paddingTarget.x);
  const shortInward = clampCameraBoom(paddingTarget, { x: 5.1, y: 2, z: 0 }, [building]);
  assert.equal(shortInward.distance, 0, 'even a short inward boom cannot approach the wall through padding');
  const embedded = clampCameraBoom({ x: 0, y: 2, z: 0 }, desired, [building]);
  assert.equal(embedded.occluded, true);
  assert.equal(embedded.distance, 0);
});

test('overlapping stepped volumes and invalid inputs never produce a non-finite camera', () => {
  const volumes = [wall, { ...wall, w: 1, d: 2, h: 12 }, { ...wall, x: 7, w: 2 }];
  assert.deepEqual(clampCameraBoom(target, desired, volumes), clampCameraBoom(target, desired, [wall]));
  for (const result of [
    clampCameraBoom(null, undefined, null),
    clampCameraBoom({ x: Number.NaN, y: Infinity, z: 0 }, desired, [null, {}, { ...wall, w: -1 }]),
    clampCameraBoom(target, { x: Infinity, y: Number.NaN }, [], { margin: Number.NaN, minDistance: Infinity }),
    clampCameraBoom(target, target, [wall]),
    clampCameraBoom({ x: 1e308, y: 2, z: 0 }, { x: -1e308, y: 2, z: 0 }, [wall]),
  ]) {
    assert.ok(['x', 'y', 'z', 'distance'].every(key => Number.isFinite(result[key])));
    assert.equal(typeof result.occluded, 'boolean');
  }
});
