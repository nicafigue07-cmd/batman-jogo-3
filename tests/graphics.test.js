import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createGraphics, createResolutionController, GRAPHICS_PRESETS } from '../src/graphics.js';

test('resolution waits for sustained load and never drops below the selected preset minimum', () => {
  for (const preset of Object.values(GRAPHICS_PRESETS)) {
    const controller = createResolutionController({minimumScale:preset.minimumScale});
    for (let frame=0;frame<39;frame++)assert.equal(controller.sample(70), false);
    assert.equal(controller.snapshot().scale, 1);
    assert.equal(controller.sample(70), true);
    assert.equal(controller.snapshot().scale, .9);
    for (let frame=0;frame<1000;frame++)controller.sample(70);
    assert.equal(controller.snapshot().scale, preset.minimumScale);
  }
});

test('invalid/background intervals do not affect resolution and recovery is gradual', () => {
  const controller = createResolutionController();
  for (let frame=0;frame<80;frame++)controller.sample(55);
  const loaded = controller.snapshot();
  for (const invalid of [0, NaN, Infinity, -5, 500, 10000])assert.equal(controller.sample(invalid), false);
  assert.deepEqual(controller.snapshot(), loaded);
  for (let frame=0;frame<100;frame++)controller.sample(16.7);
  assert.equal(controller.snapshot().scale, loaded.scale, 'one short fast spell does not oscillate resolution');
  for (let frame=0;frame<2500;frame++)controller.sample(16.7);
  assert.equal(controller.snapshot().scale, 1);
  controller.reset(.7);
  assert.deepEqual(controller.snapshot(), {scale:1,frameMilliseconds:0});
});

test('menus freeze adaptive resolution, gameplay adjusts it without changing the chosen preset', () => {
  const old = Object.fromEntries(['document','innerWidth','innerHeight','devicePixelRatio'].map(key => [key, globalThis[key]]));
  Object.assign(globalThis, {document:{body:{dataset:{}}},innerWidth:800,innerHeight:600,devicePixelRatio:2});
  try {
    let ratio=1;
    const renderer={shadowMap:{},setPixelRatio(value){ratio=value;},getPixelRatio(){return ratio;},setSize(){},render(){}};
    const world={setQuality(value){this.quality=value;}};
    const graphics=createGraphics(renderer,new THREE.Scene(),new THREE.PerspectiveCamera(),new THREE.DirectionalLight(),world);
    graphics.setQuality('medium');
    const position=new THREE.Vector3();
    for(let frame=0;frame<400;frame++){graphics.update(position,.06,false);graphics.render();}
    assert.equal(graphics.getStats().scale, 1);
    for(let frame=0;frame<400;frame++){graphics.update(position,.06,true);graphics.render();}
    assert.equal(graphics.getStats().scale, .65);
    assert.equal(graphics.getQuality(), 'medium');
    assert.equal(world.quality, 'medium');
    assert.equal(document.body.dataset.quality, 'medium');
    assert.equal(ratio, 1.4*.65);
    graphics.setQuality('low');
    assert.equal(graphics.getStats().scale, 1);
    assert.equal(renderer.shadowMap.enabled, false);
    assert.equal(ratio, 1);
  } finally {
    for(const [key,value] of Object.entries(old)) {
      if(value===undefined)delete globalThis[key];else globalThis[key]=value;
    }
  }
});
