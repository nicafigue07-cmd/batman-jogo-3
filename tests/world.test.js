import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createWorld } from '../src/world.js';
import { moveAndCollide } from '../src/physics.js';
import { planGrapple, sampleGrapple } from '../src/grapple.js';

// World geometry is independent of WebGL. A canvas recorder is sufficient for
// its local procedural textures; these tests exercise real meshes and physics.
function makeWorld() {
  const previousDocument = globalThis.document;
  globalThis.document = {
    createElement() {
      const context = new Proxy({}, {
        get(target, key) {
          if (String(key).startsWith('create')) return () => ({ addColorStop() {} });
          return target[key] ?? (() => {});
        },
        set(target, key, value) { target[key] = value; return true; },
      });
      return { width: 0, height: 0, getContext: () => context };
    },
  };
  try { return createWorld(THREE, new THREE.Scene()); }
  finally {
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
  }
}

const world = makeWorld();
const wayne = world.buildings.find(building => building.x === 0 && building.z === -168);
// Match the actual solid crown added by the game above the base city geometry.
const solids = [...world.collisionBuildings,
  { ...wayne, w: wayne.w * .72, d: wayne.d * .72, h: wayne.h + 5 },
  { ...wayne, w: wayne.w * .5, d: wayne.d * .5, h: wayne.h + 8 },
  { ...wayne, w: .55, d: .55, h: wayne.h + 25 },
];
const feet = building => building === wayne
  ? { x: 6, y: building.h + 8, z: building.z }
  : { x: building.x, y: building.h, z: building.z };
const anchor = building => building === wayne
  ? { x: 6, y: building.h + 10.4, z: building.z }
  : { x: building.x, y: building.h + 2.4, z: building.z };

function assertUnobstructed(point, label) {
  for (const solid of solids) {
    const overlaps = Math.abs(point.x - solid.x) < solid.w / 2 + .55 - 1e-5 &&
      Math.abs(point.z - solid.z) < solid.d / 2 + .55 - 1e-5;
    if (overlaps && point.y < solid.h - 1e-5) {
      assert.fail(`${label}: feet at ${JSON.stringify(point)} intersect solid ${JSON.stringify(solid)}`);
    }
  }
}

test('the city keeps distinct architecture and the original playable roof locations', () => {
  assert.equal(world.buildings.length, 49);
  assert.equal(world.rooftops.length, 49);
  assert.equal(new Set(world.buildingStyles.map(style => style.architecture)).size, 7);
  assert.equal(new Set(world.buildingStyles.map(style => style.fingerprint)).size, 49);
  assert.deepEqual(world.spawn, { x: 0, y: 29, z: 112 });
  for (const [x, z, height] of [[0, 112, 29], [56, 56, 35], [-112, -56, 47], [56, -112, 52], [0, -168, 76]]) {
    assert.equal(world.rooftops.find(roof => roof.x === x && roof.z === z)?.h, height);
  }
  // A future facade change must not consume the deterministic layout RNG.
  for (const [x, z, height] of [
    [-168, -168, 30.82968863612041], [0, -112, 27.723271276801825],
    [0, 0, 38.393037151079625], [168, 168, 55.84918784489855],
  ]) assert.equal(world.rooftops.find(roof => roof.x === x && roof.z === z)?.h, height);
  const repeated = makeWorld();
  assert.deepEqual(repeated.buildings.map(({ x, z, h }) => ({ x, z, h })),
    world.buildings.map(({ x, z, h }) => ({ x, z, h })));
});

test('normal rooftops support a clear central landing square and setbacks stay open', () => {
  let openSetbacks = 0;
  for (const building of world.rooftops) {
    if (building === wayne) continue; // Its higher crown has a dedicated landing.
    assert.ok(building.w >= 24 && building.d >= 24);
    for (const [dx, dz] of [[0, 0], [-12, -12], [12, -12], [-12, 12], [12, 12], [9, -8]]) {
      const position = { x: building.x + dx, y: building.h + .5, z: building.z + dz };
      const velocity = { x: 0, y: -4, z: 0 };
      const contact = moveAndCollide(position, velocity, .3, solids);
      assert.equal(contact.grounded, true, `roof ${building.x},${building.z}`);
      assert.equal(position.y, building.h, 'landing height matches the actual center deck');
    }
    const corner = { x: building.x + building.baseW / 2 - .6, y: building.h + .5, z: building.z + building.baseD / 2 - .6 };
    const supported = solids.some(solid => Math.abs(corner.x - solid.x) < solid.w / 2 + .55 &&
      Math.abs(corner.z - solid.z) < solid.d / 2 + .55 && solid.h >= building.h);
    if (!supported) {
      moveAndCollide(corner, { x: 0, y: -10, z: 0 }, .15, solids);
      assert.ok(corner.y < building.h, 'a setback corner must not have an invisible full-height floor');
      openSetbacks++;
    }
  }
  assert.ok(openSetbacks > 0, 'architecture includes genuine playable setbacks');
  const crown = feet(wayne);
  crown.y += .5;
  moveAndCollide(crown, { x: 0, y: -4, z: 0 }, .3, solids);
  assert.equal(crown.y, wayne.h + 8);
});

test('street objectives, enemy positions and the cape flight corridor remain unobstructed', () => {
  const streetPoints = [
    ['rescue', -28, 112], ['rescue spawn', -28, 127], ['extraction', -28, 100],
    ['evidence', -28, 56], ['evidence spawn', -28, 71], ['second evidence', 28, 0],
  ];
  for (const [name, x, z] of streetPoints) assertUnobstructed({ x, y: 0, z }, name);
  for (const [name, x, z] of [streetPoints[0], streetPoints[3], streetPoints[5]]) {
    for (const [dx, dz] of [[-3, -3.5], [-3, 3], [3, 3]]) {
      assertUnobstructed({ x: x + dx, y: 0, z: z + dz }, `${name} enemy`);
    }
  }
  for (const [y, z] of [[84, -145], [77, -105], [70, -65]]) {
    assertUnobstructed({ x: 28, y, z }, 'flight gate');
  }
  for (let z = -145; z <= -65; z += .5) assertUnobstructed({ x: 28, y: 0, z }, 'street below flight route');
});

test('every nearby roof anchor admits a collision-free grapple across the actual city union', () => {
  let routes = 0;
  const reached = new Set();
  for (const destination of world.rooftops) for (const source of world.rooftops) {
    if (source === destination) continue;
    const start = feet(source), target = anchor(destination);
    if (Math.hypot(target.x - start.x, target.y - start.y, target.z - start.z) > 145) continue;
    const label = `${source.x},${source.z} to ${destination.x},${destination.z}`;
    const plan = planGrapple(start, target, { buildings: solids });
    assert.ok(plan, `reachable neighboring anchor ${label} must not be rejected by overlapping solids`);
    for (let step = 0; step <= 200; step++) assertUnobstructed(sampleGrapple(plan, step / 200), label);
    assert.deepEqual(sampleGrapple(plan, 1), feet(destination));
    reached.add(destination);
    routes++;
  }
  assert.equal(reached.size, world.rooftops.length, 'every roof is reachable from another roof');
  assert.ok(routes > world.rooftops.length, 'validation covers multiple departure directions per roof');
});
