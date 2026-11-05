import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { VILLAINS, createVillain } from '../src/villains.js';

function meshes(root) {
  const result = [];
  root.traverse(node => { if (node.isMesh) result.push(node); });
  return result;
}

test('each mission has a different named boss and combat style', () => {
  assert.deepEqual(Object.keys(VILLAINS).sort(), ['evidence', 'finale', 'flight', 'rescue', 'signals']);
  assert.equal(new Set(Object.values(VILLAINS).map(villain => villain.id)).size, 5);
  assert.equal(new Set(Object.values(VILLAINS).map(villain => villain.attackStyle)).size, 5);
  assert.deepEqual(Object.values(VILLAINS).map(villain => villain.health), [6, 7, 6, 10, 8]);
  for (const definition of Object.values(VILLAINS)) {
    assert.ok(definition.name.length > 3);
    for (const key of ['health', 'damage', 'speed', 'attackRange', 'attackInterval', 'color']) {
      assert.ok(Number.isFinite(definition[key]) && definition[key] > 0, `${definition.id}: ${key}`);
    }
    assert.ok(definition.attackInterval >= 1.5, 'bosses leave time to dodge their attacks');
    assert.ok(Object.isFrozen(definition));
  }
  assert.ok(VILLAINS.finale.damage > VILLAINS.rescue.damage);
  assert.ok(VILLAINS.flight.speed > VILLAINS.finale.speed);
  assert.ok(VILLAINS.rescue.attackRange > VILLAINS.finale.attackRange);
});

test('boss models stand at ground level, face +Z, and cast shadows without a renderer', () => {
  for (const [missionId, definition] of Object.entries(VILLAINS)) {
    const model = createVillain(THREE, missionId);
    assert.ok(model.isGroup);
    assert.equal(model.name, definition.name);
    assert.equal(model.userData.villainId, definition.id);
    const bounds = new THREE.Box3().setFromObject(model);
    assert.ok(Math.abs(bounds.min.y) < 1e-6, `${definition.id} feet at y=0, got ${bounds.min.y}`);
    assert.ok(bounds.max.y > 2 && bounds.max.y < 3.5);
    const parts = meshes(model);
    assert.ok(parts.length >= 18, `${definition.id} should have a complete silhouette`);
    assert.ok(parts.every(part => part.castShadow && part.receiveShadow));
    const face = model.getObjectByName({ firefly: 'wide-black-visor', penguin: 'long-pointed-nose', riddler: 'purple-eye-mask', bane: 'mouth-respirator', 'man-bat': 'snout' }[definition.id]);
    assert.ok(face.position.z > 0, 'face points along local +Z');
    assert.ok(new Set(parts.map(part => part.geometry)).size < parts.length / 2, 'simple parts share geometry');
    assert.ok(new Set(parts.map(part => part.material)).size < parts.length / 2, 'simple parts share materials');
  }
});

test('recognizable props and body proportions distinguish all five villains', () => {
  const models = Object.fromEntries(Object.keys(VILLAINS).map(id => [id, createVillain(THREE, id)]));
  assert.ok(models.signals.getObjectByName('jetpack'));
  assert.equal(meshes(models.signals).filter(part => part.name === 'jet-flame').length, 2);
  assert.ok(models.rescue.getObjectByName('top-hat'));
  assert.ok(models.rescue.getObjectByName('umbrella'));
  assert.ok(models.evidence.getObjectByName('question-mark'));
  assert.ok(models.evidence.getObjectByName('question-mark-cane'));
  assert.ok(models.finale.getObjectByName('venom-tubes'));
  assert.ok(models.finale.getObjectByName('massive-torso'));
  assert.ok(models.flight.getObjectByName('bat-wings'));
  const size = id => new THREE.Box3().setFromObject(models[id]).getSize(new THREE.Vector3());
  assert.ok(size('flight').x > size('finale').x * 1.6, 'Man-Bat has a broad wingspan');
  assert.ok(size('finale').x > size('evidence').x * 1.5, 'Bane has a much larger build than the Riddler');
  assert.ok(models.rescue.getObjectByName('round-overcoat').scale.x > models.evidence.getObjectByName('tailored-green-jacket').scale.x * 0.8);
});

test('poses animate existing parts and never move the AI-controlled root', () => {
  for (const missionId of Object.keys(VILLAINS)) {
    const model = createVillain(THREE, missionId);
    model.position.set(10, 22, -7);
    model.rotation.y = 0.73;
    const before = meshes(model).map(part => [part, part.geometry, part.material]);
    model.userData.update({ time: 0.15, moving: true, attacking: false });
    assert.notEqual(model.getObjectByName('left-leg').rotation.x, 0);
    model.userData.update({ time: 0.3, moving: false, attacking: true });
    assert.ok(model.getObjectByName('right-arm').rotation.x < -1);
    model.userData.update({ time: 0.4, moving: true, attacking: true, stunned: true });
    assert.equal(model.getObjectByName('left-leg').rotation.x, 0);
    assert.equal(model.getObjectByName('right-arm').rotation.x, 0.15);
    for (let i = 0; i < 120; i++) model.userData.update({ time: i / 30, moving: true, attacking: i % 2 === 0 });
    assert.deepEqual(meshes(model).map(part => [part, part.geometry, part.material]), before);
    assert.deepEqual(model.position.toArray(), [10, 22, -7]);
    assert.equal(model.rotation.y, 0.73);
  }
});

test('special poses respond to vulnerable and stunned states', () => {
  const bane = createVillain(THREE, 'finale');
  bane.userData.update({ time: 0, attacking: true });
  assert.equal(bane.getObjectByName('right-arm').rotation.x, -2.2);
  const venom = bane.getObjectByName('venom-tank').material;
  const charged = venom.emissiveIntensity;
  bane.userData.update({ time: 0, attacking: true, exposed: true });
  assert.ok(venom.emissiveIntensity < charged);
  assert.notEqual(bane.getObjectByName('right-arm').rotation.x, -2.2);
  const firefly = createVillain(THREE, 'signals');
  firefly.userData.update({ time: 0, moving: true });
  const fullFlame = firefly.getObjectByName('jet-flame').scale.y;
  firefly.userData.update({ time: 0, stunned: true });
  assert.ok(firefly.getObjectByName('jet-flame').scale.y < fullFlame * 0.1);
  const bat = createVillain(THREE, 'flight');
  bat.userData.update({ time: 0.2, moving: true });
  assert.notEqual(bat.getObjectByName('left-wing').rotation.y, 0);
  assert.equal(bat.getObjectByName('left-wing').rotation.y, -bat.getObjectByName('right-wing').rotation.y);
});

test('unknown mission IDs are rejected and missing or invalid animation time remains finite', () => {
  for (const missionId of ['unknown', '__proto__', 'toString', undefined]) {
    assert.throws(() => createVillain(THREE, missionId), RangeError);
  }
  for (const missionId of Object.keys(VILLAINS)) {
    const model = createVillain(THREE, missionId);
    for (const time of [undefined, NaN, Infinity, '3']) {
      model.userData.update({ time, moving: true, attacking: true });
      model.traverse(part => {
        assert.ok(part.position.toArray().every(Number.isFinite));
        assert.ok(part.rotation.toArray().slice(0, 3).every(Number.isFinite));
        assert.ok(part.scale.toArray().every(Number.isFinite));
      });
    }
    model.userData.update();
  }
});
