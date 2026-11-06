import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

export const GRAPHICS_PRESETS = Object.freeze({
  low: {pixelRatio:1, shadows:false, bloom:false, shadowSize:512, minimumScale:.7},
  medium: {pixelRatio:1.4, shadows:true, bloom:false, shadowSize:1024, minimumScale:.65},
  high: {pixelRatio:1.7, shadows:true, bloom:true, shadowSize:1536, minimumScale:.6},
});

/** Hysteresis prevents resolution changes after one busy frame or a tab switch. */
export function createResolutionController({minimumScale=.65}={}) {
  let minimum=Number.isFinite(minimumScale)?Math.max(.4,Math.min(1,minimumScale)):.65;
  let scale=1, average=0, slow=0, fast=0;
  return {
    reset(nextMinimum=minimum){minimum=Math.max(.4,Math.min(1,nextMinimum));scale=1;average=0;slow=0;fast=0;},
    sample(milliseconds) {
      if(!Number.isFinite(milliseconds)||milliseconds<4||milliseconds>250)return false;
      average=average?average*.92+milliseconds*.08:milliseconds;
      slow=average>36?slow+1:0;
      fast=average<23?fast+1:0;
      if(slow>=40&&scale>minimum){scale=Math.max(minimum,Math.round((scale-.1)*100)/100);slow=0;fast=0;return true;}
      if(fast>=160&&scale<1){scale=Math.min(1,Math.round((scale+.05)*100)/100);slow=0;fast=0;return true;}
      return false;
    },
    snapshot:()=>({scale,frameMilliseconds:average}),
  };
}

export function createGraphics(renderer, scene, camera, light, world) {
  let quality='medium', composer=null, lastFrame=0, lastShadow=0, adaptive=true, adaptiveActive=true, frameDelta=null;
  const resolution=createResolutionController();
  const target=new THREE.Object3D(); scene.add(target); light.target=target;
  light.shadow.mapSize.set(1024,1024);
  Object.assign(light.shadow.camera,{left:-72,right:72,top:72,bottom:-72,near:.5,far:400});
  light.shadow.camera.updateProjectionMatrix();
  light.shadow.bias=-.00025; light.shadow.normalBias=.12;
  renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  // Keep the shadow pass at most 30 Hz. Camera/player rendering remains at the
  // display rate; changing a graphics setting always refreshes the shadow map.
  renderer.shadowMap.autoUpdate=false;
  const sky = new THREE.Mesh(new THREE.SphereGeometry(680,24,16),new THREE.ShaderMaterial({
    side:THREE.BackSide,depthWrite:false,
    uniforms:{top:{value:new THREE.Color('#438fc4')},bottom:{value:new THREE.Color('#e7d5b9')}},
    vertexShader:'varying vec3 direction; void main(){direction=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader:`uniform vec3 top;uniform vec3 bottom;varying vec3 direction;
      float starHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      void main(){
        vec3 d=normalize(direction);float h=d.y;
        vec3 color=mix(bottom,top,smoothstep(-0.08,0.65,h));
        color+=vec3(.075,.038,.018)*exp(-abs(h-.012)*19.0);
        vec2 uv=vec2(atan(d.z,d.x)*.15915494+.5,asin(clamp(d.y,-1.0,1.0))*.31830989+.5);
        vec2 cells=uv*vec2(1200.0,600.0);float seed=starHash(floor(cells));
        float dotShape=1.0-smoothstep(.08,.36,length(fract(cells)-.5));
        float stars=step(.99915,seed)*dotShape*smoothstep(.12,.42,h);
        color+=vec3(.38,.53,.62)*stars;
        gl_FragColor=vec4(color,1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  }));
  sky.renderOrder=-10; scene.add(sky);
  function makeComposer() {
    const result=new EffectComposer(renderer);
    result.addPass(new RenderPass(scene,camera));
    result.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth,innerHeight),.34,.45,.8));
    result.addPass(new OutputPass());
    return result;
  }
  function disposeComposer() {
    if(!composer)return;
    for(const pass of composer.passes)pass.dispose?.();
    composer.dispose();composer=null;
  }
  function applyResolution() {
    const preset=GRAPHICS_PRESETS[quality];
    renderer.setPixelRatio(Math.min(devicePixelRatio,preset.pixelRatio)*resolution.snapshot().scale);
    renderer.setSize(innerWidth,innerHeight);
    if(composer){composer.setPixelRatio(renderer.getPixelRatio());composer.setSize(innerWidth,innerHeight);}
    document.body.dataset.renderScale=String(resolution.snapshot().scale);
  }
  function setQuality(value) {
    quality=Object.hasOwn(GRAPHICS_PRESETS,value)?value:'medium';
    const preset=GRAPHICS_PRESETS[quality];
    resolution.reset(preset.minimumScale);lastFrame=0;
    renderer.shadowMap.enabled=preset.shadows; light.castShadow=preset.shadows;
    if(light.shadow.mapSize.x!==preset.shadowSize) {
      light.shadow.mapSize.set(preset.shadowSize,preset.shadowSize);
      light.shadow.map?.dispose();light.shadow.map=null;
    }
    renderer.shadowMap.needsUpdate=true;
    if(preset.bloom&&!composer)composer=makeComposer();
    if(!preset.bloom)disposeComposer();
    applyResolution();
    world.setQuality?.(quality);
    document.body.dataset.quality=quality;
    return quality;
  }
  return {
    setQuality,
    getQuality:()=>quality,
    getStats:()=>({quality,adaptive,...resolution.snapshot()}),
    setAdaptiveResolution(enabled=true){adaptive=!!enabled;resolution.reset();lastFrame=0;applyResolution();},
    resize:applyResolution,
    update(position, delta, active=true){
      frameDelta=Number.isFinite(delta)?delta*1000:null;adaptiveActive=active!==false;
      sky.position.copy(position);
      // Snap the light's tracking origin to shadow texels to reduce shimmer on
      // facades while the camera moves continuously through the streets.
      const texel=144/GRAPHICS_PRESETS[quality].shadowSize;
      const x=Math.round(position.x/texel)*texel,z=Math.round(position.z/texel)*texel;
      target.position.set(x,position.y,z);
      light.position.set(x-75,position.y+140,z-90);
      target.updateMatrixWorld();
    },
    render(){
      const now=performance.now();
      if(adaptive&&adaptiveActive&&lastFrame&&resolution.sample(frameDelta??now-lastFrame))applyResolution();
      lastFrame=now;
      if(GRAPHICS_PRESETS[quality].shadows&&now-lastShadow>=1000/30){renderer.shadowMap.needsUpdate=true;lastShadow=now;}
      if(GRAPHICS_PRESETS[quality].bloom)composer.render();else renderer.render(scene,camera);
    },
  };
}
