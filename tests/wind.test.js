import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { WIND_CURRENTS, sampleWind, createWindCurrents } from '../src/wind.js';

const current = WIND_CURRENTS[0];
const inside = { x: current.x, y: (current.bottom + current.top) / 2, z: current.z };

test('cape lift requires gliding, and grappling or diving cannot collect it', () => {
  const active = sampleWind(inside, { gliding: true });
  assert.deepEqual(active, { active: true, lift: 12, boost: 8, id: current.id });
  for (const options of [{}, { gliding: false }, { gliding: true, grappling: true }, { gliding: true, slamming: true }]) {
    assert.deepEqual(sampleWind(inside, options), { active: false, lift: 0, boost: 0, id: null });
  }
});

test('wind occupies a finite cylinder with inclusive edges', () => {
  for (const y of [current.bottom, current.top]) {
    assert.equal(sampleWind({ ...inside, x: current.x + current.radius, y }, { gliding: true }).active, true);
  }
  for (const position of [
    { ...inside, y: current.bottom - .01 },
    { ...inside, y: current.top + .01 },
    { ...inside, x: current.x + current.radius + .01 },
    { ...inside, x: current.x + current.radius, z: current.z + current.radius },
  ]) assert.equal(sampleWind(position, { gliding: true }).active, false);
});

test('every optional current is reachable on a street and avoids story flight gates', () => {
  assert.equal(new Set(WIND_CURRENTS.map(item => item.id)).size, WIND_CURRENTS.length);
  for (const item of WIND_CURRENTS) {
    assert.ok(Math.abs(item.x) === 140);
    assert.ok(item.bottom < item.top && item.radius > 0 && item.lift > 0 && item.boost > 0);
    assert.ok(Math.abs(item.x - 28) > item.radius + 8);
    assert.equal(sampleWind({ x: item.x, y: item.bottom + 1, z: item.z }, { gliding: true }).id, item.id);
  }
});

test('invalid and missing coordinates cannot apply forces or mutate input', () => {
  for (const position of [null, undefined, {}, { ...inside, x: NaN }, { ...inside, y: Infinity }, { ...inside, z: '0' }]) {
    assert.equal(sampleWind(position, { gliding: true }).active, false);
  }
  const frozen = Object.freeze({ ...inside });
  sampleWind(frozen, { gliding: true });
  assert.deepEqual(frozen, inside);
});

test('all current visuals share two drawable objects and animate finite in-bounds points', () => {
  const scene = new THREE.Scene();
  const visuals = createWindCurrents(THREE, scene);
  assert.equal(scene.children[0], visuals.group);
  assert.equal(visuals.group.children.length, 2);
  const particles = visuals.group.children.find(child => child.isPoints);
  const initial = Array.from(particles.geometry.attributes.position.array);
  visuals.update(2);
  const positions = particles.geometry.attributes.position.array;
  assert.notDeepEqual(Array.from(positions), initial);
  for (let i = 0; i < positions.length / 3; i++) {
    const item = WIND_CURRENTS[Math.floor(i / 48)];
    const x = positions[i * 3], y = positions[i * 3 + 1], z = positions[i * 3 + 2];
    assert.ok(Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z));
    assert.ok(y >= item.bottom - .0001 && y <= item.top + .0001);
    assert.ok(Math.hypot(x - item.x, z - item.z) <= item.radius);
  }
  const valid = Array.from(positions);
  visuals.update(NaN);
  assert.deepEqual(Array.from(positions), valid);
});
