/** Ambient city actors. These residents and vehicles are scenery, not enemies. */
export const CITY_LIFE_PRESETS = Object.freeze({
  low: Object.freeze({ cars: 6, pedestrians: 6, headlightPools: false }),
  medium: Object.freeze({ cars: 10, pedestrians: 14, headlightPools: true }),
  high: Object.freeze({ cars: 12, pedestrians: 20, headlightPools: true }),
});

const ROAD_LINES = Object.freeze([-140, -84, -28, 28, 84, 140]);
const ROUTE_LENGTH = 440;
const modulo = (value, divisor) => ((value % divisor) + divisor) % divisor;

/** A wrapped, constant-speed route stays in the same clear street corridor. */
export function sampleCityRoute(route, elapsed = 0) {
  const time = Number.isFinite(elapsed) && elapsed >= 0 ? elapsed : 0;
  const along = modulo(route.phase + time * route.speed * route.direction + ROUTE_LENGTH / 2, ROUTE_LENGTH) - ROUTE_LENGTH / 2;
  const cross = route.road + route.lane;
  return {
    x: route.axis === 'x' ? along : cross,
    y: 0,
    z: route.axis === 'x' ? cross : along,
    heading: route.axis === 'x' ? route.direction * Math.PI / 2 : route.direction > 0 ? 0 : Math.PI,
  };
}

export function createCityLife(THREE, scene, { reducedMotion = false } = {}) {
  const group = new THREE.Group();
  group.name = 'Gotham residents and traffic';
  scene.add(group);
  const box = new THREE.BoxGeometry(1, 1, 1);
  const sphere = new THREE.SphereGeometry(1, 7, 5);
  const wheelGeometry = new THREE.CylinderGeometry(1, 1, 1, 8);
  // Geometry rotation keeps wheel matrices in the same car coordinate frame.
  wheelGeometry.rotateZ(Math.PI / 2);
  const canopyGeometry = new THREE.SphereGeometry(1, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2);
  const standard = properties => new THREE.MeshStandardMaterial(properties);
  const meshes = [];
  function instances(name, geometry, material, capacity) {
    const mesh = new THREE.InstancedMesh(geometry, material, capacity);
    mesh.name = name;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    // Bounds move along several streets. A single conservative city bound
    // avoids rebuilding an instanced bounding sphere on every animation frame.
    mesh.frustumCulled = false;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    group.add(mesh);
    meshes.push(mesh);
    return mesh;
  }
  const carBodies = instances('Traffic painted bodies', box, standard({ color: 0xffffff, metalness: .66, roughness: .32 }), 12);
  const carCabins = instances('Traffic glass cabins', box, standard({ color: 0x385260, metalness: .78, roughness: .21 }), 12);
  const wheels = instances('Traffic wheels', wheelGeometry, standard({ color: 0x11191c, metalness: .18, roughness: .9 }), 48);
  const lamps = instances('Traffic headlights and tail lamps', box, new THREE.MeshBasicMaterial({ color: 0xffffff }), 48);
  const poolPixels = new Uint8Array(32 * 64 * 4);
  for (let y = 0; y < 64; y++) for (let x = 0; x < 32; x++) {
    const i = (y * 32 + x) * 4;
    const across = (x / 31 - .5) * 2, along = (y / 63 - .5) * 2;
    const alpha = Math.max(0, 1 - across * across - along * along) ** 2;
    poolPixels.set([255, 255, 255, Math.round(alpha * 255)], i);
  }
  const poolTexture = new THREE.DataTexture(poolPixels, 32, 64, THREE.RGBAFormat);
  poolTexture.magFilter = poolTexture.minFilter = THREE.LinearFilter;
  poolTexture.needsUpdate = true;
  const pools = instances('Traffic reflected headlight pools', new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({
    color: 0xffdbab, map: poolTexture, transparent: true, opacity: .15, depthWrite: false,
    blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  }), 12);
  const coats = instances('Residents winter coats', box, standard({ color: 0xffffff, roughness: .95, metalness: .02 }), 20);
  const heads = instances('Residents heads', sphere, standard({ color: 0xffffff, roughness: .85 }), 20);
  const limbs = instances('Residents walking limbs and umbrella shafts', box, standard({ color: 0x24323b, roughness: .92 }), 100);
  const umbrellas = instances('Residents rain umbrellas', canopyGeometry, standard({ color: 0xffffff, roughness: .71, metalness: .08, side: THREE.DoubleSide }), 20);

  const carPaint = [0x2a485c, 0x495257, 0x8a6234, 0x283d3c, 0x51404e, 0x9b9c91];
  const coatColors = [0x617283, 0x956947, 0x416d68, 0x6d5868, 0x797766];
  const skinColors = [0xc89478, 0x8a6049, 0xd9ae8e, 0x725143, 0xae8064];
  const umbrellaColors = [0x253a4a, 0x5c4451, 0x49615d, 0x6e6549, 0x394c68];
  const color = new THREE.Color();
  const cars = Array.from({ length: 12 }, (_, index) => ({
    id: `traffic-${index + 1}`, axis: 'z', road: ROAD_LINES[index % ROAD_LINES.length],
    direction: index < ROAD_LINES.length ? 1 : -1,
    lane: index < ROAD_LINES.length ? 1.9 : -1.9,
    speed: 7.5 + index % 4 * .85,
    phase: modulo(index * 67 + 19, ROUTE_LENGTH) - ROUTE_LENGTH / 2,
  }));
  const pedestrians = Array.from({ length: 20 }, (_, index) => {
    const direction = index % 2 ? -1 : 1;
    return {
      id: `resident-${index + 1}`, axis: index % 3 === 0 ? 'x' : 'z',
      road: ROAD_LINES[(index * 5 + 2) % ROAD_LINES.length],
      direction, lane: direction * 4.8,
      speed: 1.1 + index % 4 * .12,
      phase: modulo(index * 41 + 79, ROUTE_LENGTH) - ROUTE_LENGTH / 2,
      gait: index * 1.7,
    };
  });
  cars.forEach((_, index) => carBodies.setColorAt(index, color.setHex(carPaint[index % carPaint.length])));
  pedestrians.forEach((_, index) => {
    coats.setColorAt(index, color.setHex(coatColors[index % coatColors.length]));
    heads.setColorAt(index, color.setHex(skinColors[index % skinColors.length]));
    umbrellas.setColorAt(index, color.setHex(umbrellaColors[index % umbrellaColors.length]));
  });
  for (let index = 0; index < 48; index++) lamps.setColorAt(index, color.setHex(index % 4 < 2 ? 0xffe7b6 : 0xe75d4e));
  for (const mesh of meshes) if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

  const dummy = new THREE.Object3D();
  let quality = 'medium';
  let lastElapsed = 0, lastFocus=null;
  let carCount = 0, pedestrianCount = 0;
  const carPositions = [], pedestrianPositions = [];

  function place(mesh, index, actor, x, y, z, sx, sy, sz, tilt = 0, floor = false) {
    const sin = Math.sin(actor.heading), cos = Math.cos(actor.heading);
    dummy.position.set(actor.x + x * cos + z * sin, y, actor.z - x * sin + z * cos);
    dummy.rotation.set(floor ? -Math.PI / 2 : tilt, floor ? 0 : actor.heading, floor ? actor.heading : 0);
    dummy.scale.set(sx, sy, sz);
    dummy.updateMatrix();
    mesh.setMatrixAt(index, dummy.matrix);
  }

  function update(elapsed = lastElapsed,focus=null) {
    lastFocus=focus&&Number.isFinite(focus.x)&&Number.isFinite(focus.z)?{x:focus.x,z:focus.z}:null;
    const range=quality==='low'?100:quality==='high'?190:145;
    let visibleCars=0,visiblePeople=0;
    if (Number.isFinite(elapsed) && elapsed >= 0) lastElapsed = elapsed;
    const time = lastElapsed * (reducedMotion ? .55 : 1);
    carPositions.length = 0;
    pedestrianPositions.length = 0;
    for (let index = 0; index < carCount; index++) {
      const route = cars[index], position = sampleCityRoute(route, time);
      carPositions.push({ id: route.id, ...position });
      if(lastFocus&&Math.hypot(position.x-lastFocus.x,position.z-lastFocus.z)>range)continue;
      const slot=visibleCars++;carBodies.setColorAt(slot,color.setHex(carPaint[index%carPaint.length]));
      place(carBodies, slot, position, 0, .72, 0, 1.85, .73, 3.9);
      place(carCabins, slot, position, 0, 1.25, -.12, 1.48, .58, 1.9);
      for (let wheel = 0; wheel < 4; wheel++) place(wheels, slot * 4 + wheel, position,
        wheel % 2 ? .91 : -.91, .38, wheel < 2 ? 1.22 : -1.22, .19, .27, .27);
      for (let lamp = 0; lamp < 4; lamp++) place(lamps, slot * 4 + lamp, position,
        lamp % 2 ? .61 : -.61, .82, lamp < 2 ? 1.96 : -1.96, .4, .14, .045);
      if (CITY_LIFE_PRESETS[quality].headlightPools) place(pools, slot, position, 0, .055, 5.1, 3.3, 6.4, 1, 0, true);
    }
    for (let index = 0; index < pedestrianCount; index++) {
      const route = pedestrians[index], position = sampleCityRoute(route, time);
      pedestrianPositions.push({ id: route.id, ...position });
      if(lastFocus&&Math.hypot(position.x-lastFocus.x,position.z-lastFocus.z)>range)continue;
      const slot=visiblePeople++;coats.setColorAt(slot,color.setHex(coatColors[index%coatColors.length]));heads.setColorAt(slot,color.setHex(skinColors[index%skinColors.length]));umbrellas.setColorAt(slot,color.setHex(umbrellaColors[index%umbrellaColors.length]));
      const step = Math.sin(time * 5.1 + route.gait) * (reducedMotion ? .08 : .31);
      place(coats, slot, position, 0, 1.16, 0, .5, .79, .31);
      place(heads, slot, position, 0, 1.76, 0, .19, .22, .18);
      // Legs and arms use one batch, even though their size and stride differ.
      place(limbs, slot * 5, position, -.15, .42, step * .24, .17, .76, .18, step);
      place(limbs, slot * 5 + 1, position, .15, .42, -step * .24, .17, .76, .18, -step);
      place(limbs, slot * 5 + 2, position, -.33, 1.15, 0, .14, .65, .15, -step * .7);
      place(limbs, slot * 5 + 3, position, .31, 1.28, .13, .14, .58, .15, -.48);
      place(limbs, slot * 5 + 4, position, .32, 1.9, .14, .025, 1.05, .025);
      place(umbrellas, slot, position, .3, 2.37, .14, .86, .24, .86);
    }
    carBodies.count=carCabins.count=visibleCars;wheels.count=lamps.count=visibleCars*4;pools.count=CITY_LIFE_PRESETS[quality].headlightPools?visibleCars:0;
    coats.count=heads.count=umbrellas.count=visiblePeople;limbs.count=visiblePeople*5;
    for(const mesh of meshes){mesh.visible=mesh.count>0;if(mesh.count)mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;}
  }

  function setQuality(value) {
    quality = Object.hasOwn(CITY_LIFE_PRESETS, value) ? value : 'medium';
    const preset = CITY_LIFE_PRESETS[quality];
    carCount = preset.cars;
    pedestrianCount = preset.pedestrians;
    carBodies.count = carCabins.count = carCount;
    wheels.count = lamps.count = carCount * 4;
    pools.count = preset.headlightPools ? carCount : 0;
    coats.count = heads.count = umbrellas.count = pedestrianCount;
    limbs.count = pedestrianCount * 5;
    for (const mesh of meshes) mesh.visible = mesh.count > 0;
    update(lastElapsed,lastFocus);
    return quality;
  }

  function getStats() {
    return {
      quality, cars: carCount, pedestrians: pedestrianCount,renderedCars:carBodies.count,renderedPedestrians:heads.count,
      drawCalls: group.visible ? meshes.filter(mesh => mesh.visible && mesh.count > 0).length : 0,
      reducedMotion: !!reducedMotion,
      positions: {
        cars: carPositions.map(position => ({ ...position })),
        pedestrians: pedestrianPositions.map(position => ({ ...position })),
      },
    };
  }
  setQuality('medium');
  return { group, update, setQuality, getStats };
}
