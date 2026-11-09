import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { CITY_LIFE_PRESETS, createCityLife, sampleCityRoute } from '../src/city-life.js';
import { createWorld } from '../src/world.js';

function makeWorld() {
  const previous = globalThis.document;
  globalThis.document = { createElement() {
    const context = new Proxy({}, {
      get(target, key) {
        if (String(key).startsWith('create')) return () => ({ addColorStop() {} });
        return target[key] ?? (() => {});
      },
      set(target, key, value) { target[key] = value; return true; },
    });
    return { width: 0, height: 0, getContext: () => context };
  } };
  try { return createWorld(THREE, new THREE.Scene()); }
  finally { if (previous === undefined) delete globalThis.document; else globalThis.document = previous; }
}

test('quality changes update actor counts without allocating new scene resources', () => {
  const scene = new THREE.Scene();
  const life = createCityLife(THREE, scene);
  const resources = life.group.children.map(mesh => [mesh, mesh.geometry, mesh.material]);
  assert.equal(scene.children.includes(life.group), true);
  for (const quality of ['high', 'low', 'medium', 'high', 'low']) {
    assert.equal(life.setQuality(quality), quality);
    const stats = life.getStats();
    assert.equal(stats.cars, CITY_LIFE_PRESETS[quality].cars);
    assert.equal(stats.pedestrians, CITY_LIFE_PRESETS[quality].pedestrians);
    assert.ok(stats.drawCalls <= 9, 'all city actors remain batched into nine draw calls');
    assert.equal(stats.positions.cars.length, stats.cars);
    assert.equal(stats.positions.pedestrians.length, stats.pedestrians);
    assert.deepEqual(life.group.children.map(mesh => [mesh, mesh.geometry, mesh.material]), resources);
    assert.equal(life.group.children.some(child => child.isLight), false, 'headlights add no dynamic lights');
  }
  assert.equal(life.setQuality('unknown'), 'medium');
});

test('cars and residents travel through the actual clear street union, with model width allowed', () => {
  const world = makeWorld();
  const life = createCityLife(THREE, new THREE.Scene());
  life.setQuality('high');
  for (let time = 0; time <= 800; time += 2.5) {
    life.update(time);
    const stats = life.getStats();
    for (const [kind, positions] of Object.entries(stats.positions)) for (const actor of positions) {
      const radius = kind === 'cars' ? 1.05 : .95; // Include the widest umbrella canopy.
      assert.ok(Math.abs(actor.x) <= 221 && Math.abs(actor.z) <= 221);
      for (const building of world.collisionBuildings) {
        const inside = Math.abs(actor.x - building.x) < building.w / 2 + radius &&
          Math.abs(actor.z - building.z) < building.d / 2 + radius;
        assert.equal(inside, false, `${actor.id} must not cross a building at time ${time}`);
      }
    }
  }
});

test('routes wrap at city edges, preserve lanes and move in both directions', () => {
  const north = { axis: 'z', road: 28, lane: 1.9, direction: 1, phase: 219, speed: 8 };
  const south = { ...north, lane: -1.9, direction: -1 };
  assert.deepEqual(sampleCityRoute(north, 0), { x: 29.9, y: 0, z: 219, heading: 0 });
  assert.equal(sampleCityRoute(north, 1).z, -213);
  assert.equal(sampleCityRoute(south, 1).z, 211);
  const east = sampleCityRoute({ ...north, axis: 'x' }, 0);
  assert.equal(east.x, 219);
  assert.equal(east.z, 29.9);
  assert.equal(east.heading, Math.PI / 2);
});

test('reduced motion softens movement and stats are detached from live actor state', () => {
  const ordinary = createCityLife(THREE, new THREE.Scene());
  const reduced = createCityLife(THREE, new THREE.Scene(), { reducedMotion: true });
  const origin = ordinary.getStats().positions.cars[0];
  ordinary.update(2); reduced.update(2);
  const full = ordinary.getStats().positions.cars[0];
  const soft = reduced.getStats().positions.cars[0];
  assert.ok(Math.abs(soft.z - origin.z) < Math.abs(full.z - origin.z));
  const copied = ordinary.getStats();
  copied.positions.cars[0].x = 10000;
  copied.positions.pedestrians.length = 0;
  assert.notEqual(ordinary.getStats().positions.cars[0].x, 10000);
  assert.ok(ordinary.getStats().positions.pedestrians.length > 0);
  const before = ordinary.getStats();
  ordinary.update(Number.NaN);
  assert.deepEqual(ordinary.getStats(), before, 'invalid time cannot corrupt actor matrices');
});

test('proximity culling hides distant actors without discarding routes or allocating a new city',()=>{
 const scene=new THREE.Scene(),city=createCityLife(THREE,scene);city.setQuality('high');const children=city.group.children.slice();city.update(12,{x:-640,z:0});assert.equal(city.getStats().renderedCars,0);assert.equal(city.getStats().renderedPedestrians,0);assert.equal(city.getStats().positions.cars.length,12);city.update(12);assert.equal(city.getStats().renderedCars,12);assert.equal(city.getStats().renderedPedestrians,20);assert.deepEqual(city.group.children,children);
});
