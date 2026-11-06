import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import * as THREE from 'three';
import { createBatman, createEnemy } from '../src/world.js';

// These fixtures were recorded from visible vertices, transformed normals and
// material colors BEFORE batching. They check that combining rigid meshes keeps
// the rendered silhouette and animation, rather than merely checking a mesh count.
function surfaceFingerprint(model) {
  model.updateMatrixWorld(true);
  const surface = new Set();
  model.traverseVisible(part => {
    if (!part.isMesh) return;
    const positions = part.geometry.attributes.position;
    const normals = part.geometry.attributes.normal;
    const normalMatrix = new THREE.Matrix3().getNormalMatrix(part.matrixWorld);
    for (let index = 0; index < positions.count; index++) {
      const point = new THREE.Vector3().fromBufferAttribute(positions, index).applyMatrix4(part.matrixWorld);
      const normal = new THREE.Vector3().fromBufferAttribute(normals, index).applyNormalMatrix(normalMatrix);
      // Quantize to 1 cm / .01 normal units, allowing Float32 transform storage.
      const values = [...point.toArray(), ...normal.toArray()].map(value => Math.round(value * 100 + 1e-4));
      surface.add(`${values.join(',')}|${part.material.color.getHexString()}`);
    }
  });
  return createHash('sha256').update([...surface].sort().join('\n')).digest('hex');
}

const visibleMeshes = model => {
  let count = 0;
  model.traverseVisible(part => { if (part.isMesh) count++; });
  return count;
};

test('batching preserves Batman surfaces in idle, glide, punch and kick poses', () => {
  const poses = [
    [{}, '9864f0df61bcd9346c90cf7886a3a42cad99aebd40b059cc492a8512f7006573'],
    [{time:1.5,gliding:true}, 'cc2fd83c848aa70268a88b1b8619e446c2103aa3ecc3164d6ab1332ffd437a2e'],
    [{time:.7,attacking:true,attackType:'punch',attackPhase:.6}, '4bdd1e27a772ce5d0c39e77ff895d93af79f52ada8b82554bf6f42b520edd2e3'],
    [{time:.4,attacking:true,attackType:'heavy',attackPhase:.7}, '1ff82d8ef15dfc49eda1e475018f5cec7c20d814e49fd71980e8a44fa5ba027e'],
  ];
  for (const [pose, fingerprint] of poses) {
    const hero = createBatman(THREE);
    hero.userData.update(pose);
    assert.equal(surfaceFingerprint(hero), fingerprint, JSON.stringify(pose));
    assert.ok(visibleMeshes(hero) <= 15, 'Vigilante stays within its visible mesh budget');
  }
});

test('all armor accessories retain surfaces and material changes after batching', () => {
  const fingerprints = {
    tactical:'d9b3038aadc0fdad07adb3dd36c83246b443b321abe86beb1902666b34dbdb6b',
    rescue:'7b9ee46a2aea54145ad7e314012d76ce822c76c689a373e07ab28aeefb40f810',
    detective:'a8865a773f48535b09779c4140740165d492194a439fab7a84d8aa04d37e3b1b',
    armored:'0a4a1f789aa0bf14e91acd2bec65e3f9fe1e2a2ed45b108fd96d0df982247106',
  };
  const hero = createBatman(THREE);
  for (const [armor, fingerprint] of Object.entries(fingerprints)) {
    hero.userData.setArmor(armor);
    assert.equal(surfaceFingerprint(hero), fingerprint, armor);
    assert.ok(visibleMeshes(hero) <= 24, `${armor} stays within its visible mesh budget`);
  }
});

test('guard body batching preserves its surfaces and independently animated limbs', () => {
  const guard = createEnemy(THREE);
  assert.equal(surfaceFingerprint(guard), '4ed9dd095a9d08bc3a22a6472a0dd60cdacc038eb05066c543b7f5c9507e3614');
  assert.equal(visibleMeshes(guard), 7);
  const idle = surfaceFingerprint(guard);
  guard.userData.update({time:.7,moving:true,attacking:true});
  assert.notEqual(surfaceFingerprint(guard), idle);
  guard.userData.update();
  assert.equal(surfaceFingerprint(guard), idle, 'resetting the pose restores the same visible surfaces');
});

test('defense and finisher poses animate without altering armor selection', () => {
  const hero = createBatman(THREE);
  hero.userData.setArmor('tactical');
  const idle = surfaceFingerprint(hero);
  hero.userData.update({defending:true});
  const defending = surfaceFingerprint(hero);
  assert.notEqual(defending, idle);
  hero.userData.update({finisher:true,attackPhase:.4});
  assert.notEqual(surfaceFingerprint(hero), defending);
  assert.equal(hero.userData.armorId, 'tactical');
  hero.userData.update();
  assert.equal(surfaceFingerprint(hero), idle);
});
