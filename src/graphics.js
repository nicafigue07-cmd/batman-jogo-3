import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

export const GRAPHICS_PRESETS = Object.freeze({
  low: {pixelRatio:1, shadows:false, bloom:false},
  medium: {pixelRatio:1.4, shadows:true, bloom:false},
  high: {pixelRatio:1.7, shadows:true, bloom:true},
});

export function createGraphics(renderer, scene, camera, light, world) {
  let quality='medium', composer=null;
  const target=new THREE.Object3D(); scene.add(target); light.target=target;
  light.shadow.mapSize.set(1024,1024);
  Object.assign(light.shadow.camera,{left:-72,right:72,top:72,bottom:-72,near:.5,far:400});
  light.shadow.camera.updateProjectionMatrix();
  light.shadow.bias=-.00025; light.shadow.normalBias=.12;
  renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  const sky = new THREE.Mesh(new THREE.SphereGeometry(680,24,16),new THREE.ShaderMaterial({
    side:THREE.BackSide,depthWrite:false,
    uniforms:{top:{value:new THREE.Color('#040c19')},bottom:{value:new THREE.Color('#243c49')}},
    vertexShader:'varying vec3 direction; void main(){direction=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader:'uniform vec3 top;uniform vec3 bottom;varying vec3 direction;void main(){float h=normalize(direction).y;gl_FragColor=vec4(mix(bottom,top,smoothstep(-0.08,0.65,h)),1.0);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}',
  }));
  sky.renderOrder=-10; scene.add(sky);
  function makeComposer() {
    const result=new EffectComposer(renderer);
    result.addPass(new RenderPass(scene,camera));
    result.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth,innerHeight),.34,.45,.8));
    result.addPass(new OutputPass());
    return result;
  }
  function setQuality(value) {
    quality=Object.hasOwn(GRAPHICS_PRESETS,value)?value:'medium';
    const preset=GRAPHICS_PRESETS[quality];
    renderer.setPixelRatio(Math.min(devicePixelRatio,preset.pixelRatio));
    renderer.setSize(innerWidth,innerHeight);
    renderer.shadowMap.enabled=preset.shadows; light.castShadow=preset.shadows;
    renderer.shadowMap.needsUpdate=true;
    if(preset.bloom&&!composer)composer=makeComposer();
    if(composer){composer.setPixelRatio(renderer.getPixelRatio());composer.setSize(innerWidth,innerHeight);}
    world.setQuality?.(quality);
    document.body.dataset.quality=quality;
    return quality;
  }
  return {
    setQuality,
    getQuality:()=>quality,
    resize(){renderer.setSize(innerWidth,innerHeight);if(composer)composer.setSize(innerWidth,innerHeight);},
    update(position){
      sky.position.copy(position);
      target.position.copy(position);
      light.position.set(position.x-75,position.y+140,position.z-90);
      target.updateMatrixWorld();
    },
    render(){if(GRAPHICS_PRESETS[quality].bloom)composer.render();else renderer.render(scene,camera);},
  };
}
