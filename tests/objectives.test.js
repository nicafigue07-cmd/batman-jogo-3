import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createMissionObject } from '../src/objectives.js';

function collectResources(group) {
  const resources = new Set();
  group.traverse(part => {
    if (part.geometry) resources.add(part.geometry);
    for (const material of Array.isArray(part.material) ? part.material : [part.material]) {
      if (material) resources.add(material);
    }
  });
  return resources;
}

for (const kind of ['signal', 'rescue', 'evidence', 'finale', 'flight']) {
  test(`disposing a ${kind} prop releases its resources once and preserves cached resources`, () => {
    const scene = new THREE.Scene();
    const descriptor = { id: kind, kind, x: 0, y: 0, z: 0, terrain: 'ground' };
    const first = createMissionObject(THREE, scene, descriptor);
    const second = createMissionObject(THREE, scene, { ...descriptor, id: `${kind}-next` });
    const firstResources = collectResources(first.group);
    const secondResources = collectResources(second.group);
    const shared = [...firstResources].filter(resource => secondResources.has(resource));
    const local = [...firstResources].filter(resource => !secondResources.has(resource));
    assert.ok(shared.length > 0);
    assert.ok(local.length > 0);
    const disposed = new Map();
    for (const resource of firstResources) {
      disposed.set(resource, 0);
      resource.addEventListener('dispose', () => disposed.set(resource, disposed.get(resource) + 1));
    }
    first.dispose();
    first.dispose();
    assert.equal(first.group.parent, null);
    assert.deepEqual(scene.children, [second.group]);
    for (const resource of shared) assert.equal(disposed.get(resource), 0, 'cache survives other prop disposal');
    for (const resource of local) assert.equal(disposed.get(resource), 1, 'local geometry and materials are released once');
    second.setState({ active: true });
    second.update(2);
    assert.equal(second.group.visible, true);
    second.dispose();
    assert.equal(scene.children.length, 0);
    for (const resource of shared) assert.equal(disposed.get(resource), 0, 'final prop disposal also retains the reusable cache');
  });
}
