// Streets between the city blocks form optional cape routes, away from the
// story's flight gates. Lift is acceleration; boost is an added speed limit.
export const WIND_CURRENTS = Object.freeze([
  { id: 'west-tower', x: -140, z: -112, bottom: 3, top: 100, radius: 10, lift: 12, boost: 8 },
  { id: 'west-harbor', x: -140, z: 112, bottom: 3, top: 82, radius: 10, lift: 12, boost: 8 },
  { id: 'east-crossing', x: 140, z: 0, bottom: 3, top: 94, radius: 10, lift: 12, boost: 8 },
  { id: 'east-harbor', x: 140, z: 112, bottom: 3, top: 86, radius: 10, lift: 12, boost: 8 },
].map(current => Object.freeze(current)));

export function sampleWind(position, { gliding = false, grappling = false, slamming = false } = {}) {
  if (gliding && !grappling && !slamming && position &&
      [position.x, position.y, position.z].every(Number.isFinite)) {
    for (const current of WIND_CURRENTS) {
      if (position.y < current.bottom || position.y > current.top) continue;
      const dx = position.x - current.x, dz = position.z - current.z;
      if (dx * dx + dz * dz <= current.radius * current.radius) {
        return { active: true, lift: current.lift, boost: current.boost, id: current.id };
      }
    }
  }
  return { active: false, lift: 0, boost: 0, id: null };
}

/** Two draw calls for every current together: spiral particles and guide rings. */
export function createWindCurrents(THREE, scene) {
  const group = new THREE.Group();
  group.name = 'cape-wind-currents';
  const particlesPerCurrent = 48;
  const points = new Float32Array(WIND_CURRENTS.length * particlesPerCurrent * 3);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(points, 3));
  const material = new THREE.PointsMaterial({
    color: 0x87e5ee, size: .32, transparent: true, opacity: .52,
    depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const particles = new THREE.Points(geometry, material);
  // Animated particles move over each full column, so do not cull by the
  // first frame's particle bounds.
  particles.frustumCulled = false;
  group.add(particles);

  const ringVertices = [];
  for (const current of WIND_CURRENTS) {
    for (const fraction of [0, .5, 1]) {
      const y = current.bottom + (current.top - current.bottom) * fraction;
      for (let i = 0; i < 40; i++) {
        const start = i / 40 * Math.PI * 2;
        const end = (i + 1) / 40 * Math.PI * 2;
        ringVertices.push(
          current.x + Math.cos(start) * current.radius, y, current.z + Math.sin(start) * current.radius,
          current.x + Math.cos(end) * current.radius, y, current.z + Math.sin(end) * current.radius,
        );
      }
    }
  }
  const ringGeometry = new THREE.BufferGeometry();
  ringGeometry.setAttribute('position', new THREE.Float32BufferAttribute(ringVertices, 3));
  const rings = new THREE.LineSegments(ringGeometry, new THREE.LineBasicMaterial({
    color: 0x71c7da, transparent: true, opacity: .2, depthWrite: false,
  }));
  group.add(rings);
  scene.add(group);

  function update(elapsed) {
    if (!Number.isFinite(elapsed)) return;
    let offset = 0;
    for (const [currentIndex, current] of WIND_CURRENTS.entries()) {
      const height = current.top - current.bottom;
      for (let i = 0; i < particlesPerCurrent; i++) {
        const phase = i / particlesPerCurrent;
        const rise = ((phase + elapsed * .09) % 1 + 1) % 1;
        const angle = phase * Math.PI * 10 + elapsed * .75 + currentIndex;
        const radius = current.radius * (.48 + (i % 5) * .09);
        points[offset++] = current.x + Math.cos(angle) * radius;
        points[offset++] = current.bottom + rise * height;
        points[offset++] = current.z + Math.sin(angle) * radius;
      }
    }
    geometry.attributes.position.needsUpdate = true;
  }
  update(0);
  return { currents: WIND_CURRENTS, group, update };
}
