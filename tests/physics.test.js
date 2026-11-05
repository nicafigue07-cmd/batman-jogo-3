import test from 'node:test';
import assert from 'node:assert/strict';
import { distance3, moveAndCollide, selectGrappleAnchor } from '../src/physics.js';

const building = { x: 0, z: 0, w: 12, d: 12, h: 20 };

test('a fast descent lands on a roof rather than tunneling through it', () => {
  const position = { x: 0, y: 30, z: 0 };
  const velocity = { x: 0, y: -100, z: 0 };
  assert.deepEqual(moveAndCollide(position, velocity, 0.2, [building]), { grounded: true, landed: true });
  assert.equal(position.y, 20);
  assert.equal(velocity.y, 0);
  assert.deepEqual(moveAndCollide(position, velocity, 0.016, [building], true), { grounded: true, landed: false });
});

test('horizontal movement stops at a solid building and can slide along it', () => {
  const position = { x: -20, y: 2, z: 0 };
  const velocity = { x: 100, y: 0, z: 5 };
  moveAndCollide(position, velocity, 0.3, [building]);
  assert.equal(position.x, -6.55);
  assert.equal(velocity.x, 0);
  assert.ok(position.z > 1.4);
  assert.equal(velocity.z, 5);
});

test('a character above a building can cross its footprint', () => {
  const position = { x: -10, y: 22, z: 0 };
  const velocity = { x: 100, y: 0, z: 0 };
  moveAndCollide(position, velocity, 0.2, [building]);
  assert.ok(Math.abs(position.x - 10) < 0.001);
  assert.equal(position.y, 22);
});

test('floor landing stops vertical descent and leaving a roof clears support', () => {
  const position = { x: 50, y: 1, z: 50 };
  const velocity = { x: 0, y: -20, z: 0 };
  assert.equal(moveAndCollide(position, velocity, 0.1, [building]).grounded, true);
  assert.equal(position.y, 0);
  const roofPosition = { x: 5, y: 20, z: 0 };
  const roofVelocity = { x: 20, y: 0, z: 0 };
  assert.equal(moveAndCollide(roofPosition, roofVelocity, 0.2, [building], true).grounded, false);
});

test('jumping from a rooftop is not snapped back onto the roof', () => {
  const position = { x: 0, y: 20, z: 0 };
  const velocity = { x: 0, y: 14, z: 0 };
  assert.equal(moveAndCollide(position, velocity, 0.1, [building], true).grounded, false);
  assert.ok(position.y > 21);
});

test('world boundary constrains movement and cancels outward velocity', () => {
  const position = { x: 229, y: 0, z: 0 };
  const velocity = { x: 20, y: 0, z: 0 };
  moveAndCollide(position, velocity, 0.2, []);
  assert.equal(position.x, 230);
  assert.equal(velocity.x, 0);
});

test('grapple selects an elevated forward anchor, not a closer rear one', () => {
  const position = { x: 0, y: 10, z: 0 };
  const rear = { x: 0, y: 15, z: 8 };
  const ahead = { x: 0, y: 30, z: -35 };
  const distant = { x: 0, y: 60, z: -140 };
  assert.equal(selectGrappleAnchor(position, { x: 0, z: -1 }, [rear, ahead, distant]), ahead);
});

test('grapple returns null without a reachable forward anchor', () => {
  assert.equal(selectGrappleAnchor({ x: 0, y: 0, z: 0 }, { x: 0, z: -1 }, [
    { x: 0, y: 0, z: 1 }, { x: 0, y: 0, z: -150 },
  ]), null);
});

test('distance helper includes elevation', () => {
  assert.equal(distance3({ x: 0, y: 0, z: 0 }, { x: 3, y: 4, z: 12 }), 13);
});
