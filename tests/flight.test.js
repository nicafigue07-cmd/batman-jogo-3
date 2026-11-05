import test from 'node:test';
import assert from 'node:assert/strict';
import { crossedGlideGate } from '../src/flight.js';

const gate = { x: 4, y: 84, z: 23 };
const before = { x: 4, y: 84, z: 22 };
const after = { x: 4, y: 84, z: 24 };
const gliding = { gliding: true };

test('a forward glide crosses at the gate center and can end exactly on its plane', () => {
  assert.equal(crossedGlideGate(before, after, gate, gliding), true);
  assert.equal(crossedGlideGate(before, { ...after, z: gate.z }, gate, gliding), true);
});

test('walking, grappling and diving through the gate never complete it', () => {
  assert.equal(crossedGlideGate(before, after, gate), false);
  for (const mode of [{ gliding: false }, { gliding: true, grappling: true }, { gliding: true, slamming: true }]) {
    assert.equal(crossedGlideGate(before, after, gate, mode), false);
  }
});

test('standing inside, moving within one side and entering backward do not count', () => {
  assert.equal(crossedGlideGate(gate, gate, gate, gliding), false);
  assert.equal(crossedGlideGate(gate, after, gate, gliding), false);
  assert.equal(crossedGlideGate(before, { ...before, x: 5 }, gate, gliding), false);
  assert.equal(crossedGlideGate(after, before, gate, gliding), false);
  assert.equal(crossedGlideGate(after, { ...after, z: 25 }, gate, gliding), false);
});

test('the intersection must fit the circular opening at the correct height', () => {
  assert.equal(crossedGlideGate({ ...before, y: 92 }, { ...after, y: 92 }, gate, gliding), true);
  assert.equal(crossedGlideGate({ ...before, y: 92.01 }, { ...after, y: 92.01 }, gate, gliding), false);
  assert.equal(crossedGlideGate({ ...before, x: 10, y: 90 }, { ...after, x: 10, y: 90 }, gate, gliding), false, 'a square corner lies outside the circular opening');
  assert.equal(crossedGlideGate({ ...before, x: 7 }, { ...after, x: 7 }, gate, { ...gliding, radius: 2 }), false);
});

test('diagonal flights use the interpolated crossing instead of the final position', () => {
  assert.equal(crossedGlideGate(
    { x: gate.x + 9, y: gate.y, z: gate.z - 1 },
    { x: gate.x + 7, y: gate.y, z: gate.z + 3 },
    gate, gliding,
  ), false, 'an endpoint inside the circle cannot rescue an outside crossing');
  assert.equal(crossedGlideGate(
    { x: gate.x + 7, y: gate.y, z: gate.z - 3 },
    { x: gate.x + 9, y: gate.y, z: gate.z + 1 },
    gate, gliding,
  ), false);
  assert.equal(crossedGlideGate(
    { x: gate.x + 7, y: gate.y - 1, z: gate.z - 1 },
    { x: gate.x + 9, y: gate.y + 1, z: gate.z + 3 },
    gate, gliding,
  ), true, 'an endpoint outside the circle can follow a valid intersection');
});

test('negligible horizontal movement and teleports are rejected', () => {
  assert.equal(crossedGlideGate({ ...before, z: gate.z - .025 }, { ...after, z: gate.z + .025 }, gate, gliding), false);
  assert.equal(crossedGlideGate({ ...before, z: gate.z - 4 }, { ...after, z: gate.z + 4 }, gate, gliding), false);
  assert.equal(crossedGlideGate({ ...before, z: gate.z - 30 }, { ...after, z: gate.z + 30 }, gate, gliding), false);
  assert.equal(crossedGlideGate({ ...before, y: gate.y - 5 }, { ...after, y: gate.y + 5 }, gate, gliding), false, 'large vertical jumps are also teleports');
  assert.equal(crossedGlideGate({ ...before, z: gate.z - .44 }, { ...after, z: gate.z + .44 }, gate, gliding), true, 'normal 22 m/s flight at a .04 second frame counts');
});

test('an explicit reverse course accepts only the opposite crossing direction', () => {
  const returning = { ...gate, directionZ: -1 };
  assert.equal(crossedGlideGate(after, before, returning, gliding), true);
  assert.equal(crossedGlideGate(before, after, returning, gliding), false);
  assert.equal(crossedGlideGate(before, after, { ...gate, directionZ: 0 }, gliding), false);
});

test('the active gate alone controls sequential progress at different heights', () => {
  const gates = [{ x: 4, y: 84, z: 23 }, { x: 4, y: 77, z: 63 }, { x: 4, y: 70, z: 103 }];
  let active = 0;
  for (const [index, target] of gates.entries()) {
    const previous = { x: target.x, y: target.y, z: target.z - .5 };
    const current = { x: target.x, y: target.y, z: target.z + .5 };
    if (index > 0) assert.equal(crossedGlideGate(previous, current, gates[index - 1], gliding), false);
    if (crossedGlideGate(previous, current, gates[active], gliding)) active++;
    assert.equal(active, index + 1);
    assert.equal(crossedGlideGate(current, { ...current, z: current.z + 1 }, target, gliding), false);
  }
  assert.equal(active, gates.length);
});

test('invalid coordinates and radii fail safely without mutating valid input', () => {
  for (const coordinate of [NaN, Infinity, undefined, '23']) {
    assert.equal(crossedGlideGate({ ...before, x: coordinate }, after, gate, gliding), false);
    assert.equal(crossedGlideGate(before, { ...after, y: coordinate }, gate, gliding), false);
    assert.equal(crossedGlideGate(before, after, { ...gate, z: coordinate }, gliding), false);
  }
  for (const radius of [-1, NaN, Infinity]) {
    assert.equal(crossedGlideGate(before, after, gate, { ...gliding, radius }), false);
  }
  assert.equal(crossedGlideGate(null, after, gate, gliding), false);
  const previous = Object.freeze({ ...before });
  const current = Object.freeze({ ...after });
  const target = Object.freeze({ ...gate });
  const options = Object.freeze({ ...gliding });
  assert.equal(crossedGlideGate(previous, current, target, options), true);
  assert.deepEqual(previous, before);
  assert.deepEqual(current, after);
  assert.deepEqual(target, gate);
});
