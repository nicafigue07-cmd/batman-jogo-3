/** Local procedural mission props. Interaction and progression belong to main. */
const resourceCache = new WeakMap();

function resources(THREE) {
  if (resourceCache.has(THREE)) return resourceCache.get(THREE);
  const shared = {
    box: new THREE.BoxGeometry(1, 1, 1),
    cylinder: new THREE.CylinderGeometry(1, 1, 1, 12),
    sphere: new THREE.SphereGeometry(1, 10, 8),
    ring: new THREE.RingGeometry(2.65, 2.82, 48),
    halo: new THREE.RingGeometry(1.18, 1.26, 32),
    torus: new THREE.TorusGeometry(1.12, .065, 6, 24),
    marker: new THREE.OctahedronGeometry(.34),
    beam: new THREE.CylinderGeometry(.13, .38, 52, 8, 1, true),
    metal: new THREE.MeshStandardMaterial({ color: 0x536570, metalness: .75, roughness: .35 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x172630, metalness: .5, roughness: .6 }),
    skin: new THREE.MeshStandardMaterial({ color: 0xcaa086, roughness: .85 }),
    coat: new THREE.MeshStandardMaterial({ color: 0xc37a37, roughness: .78 }),
    teal: new THREE.MeshStandardMaterial({ color: 0x439c9a, roughness: .8 }),
  };
  resourceCache.set(THREE, shared);
  return shared;
}

/**
 * @param {{id:string,kind:'signal'|'rescue'|'evidence'|'finale',x:number,y:number,z:number,name:string}} objective
 * @returns {{group:object,update:function,setState:function,setEscort:function,dispose:function}}
 */
export function createMissionObject(THREE, scene, objective) {
  const shared = resources(THREE);
  const group = new THREE.Group();
  group.name = `Mission ${objective.id}`;
  group.position.set(objective.x, objective.y, objective.z);
  group.userData.objectiveId = objective.id;
  group.userData.kind = objective.kind;
  scene.add(group);
  const kindColor = objective.kind === 'rescue' ? 0x7fcfc1 : objective.kind === 'evidence' ? 0x7fd9ef : 0xef756c;
  const highlight = new THREE.MeshBasicMaterial({ color: 0xeac377, side: THREE.DoubleSide, transparent: true, opacity: .9 });
  const light = new THREE.MeshBasicMaterial({ color: kindColor });
  const beamMaterial = new THREE.MeshBasicMaterial({ color: 0xe8bd70, transparent: true, opacity: .12, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending });
  const markerMaterial = new THREE.MeshBasicMaterial({ color: kindColor, transparent: true, opacity: .9 });
  const item = new THREE.Group();
  item.name = 'Mission prop';
  group.add(item);
  let state = { active: false, completed: false };
  let animatedRing = null;
  let briefcase = null;
  let civilian = null;
  let civilianArms = [];
  let extractionPad = null;
  let escort = { released: false, offset: { x: 0, z: 0 }, evacuated: false };
  let hover = null;
  const mesh = (geometry, material, parent, x, y, z, sx = 1, sy = 1, sz = 1) => {
    const part = new THREE.Mesh(geometry, material);
    part.position.set(x, y, z);
    part.scale.set(sx, sy, sz);
    parent.add(part);
    return part;
  };
  const box = (material, parent, x, y, z, w, h, d) => mesh(shared.box, material, parent, x, y, z, w, h, d);
  const cylinder = (material, parent, x, y, z, radius, height) => mesh(shared.cylinder, material, parent, x, y, z, radius, height, radius);

  const isFlight=objective.kind==='flight';
  const groundRing = mesh(shared.ring, highlight, group, 0, .075, 0);
  groundRing.name = 'Objective ground ring';
  groundRing.rotation.x = -Math.PI / 2;
  const beacon = mesh(shared.beam, beamMaterial, group, 0, 26, 0);
  beacon.name = 'Active objective beacon';
  const marker = mesh(shared.marker, markerMaterial, group, 0, ['finale','flight-finale'].includes(objective.kind) ? 7.3 : objective.kind === 'signal' ? 5.3 : 3.6, 0);
  marker.name = 'Objective marker';
  let markerHeight = marker.position.y;

  if(isFlight) {
    const ringMaterial=new THREE.MeshBasicMaterial({color:0xffd376,transparent:true,opacity:.9,side:THREE.DoubleSide});
    animatedRing=mesh(new THREE.TorusGeometry(8,.18,8,64),ringMaterial,item,0,0,0);
    const inner=mesh(new THREE.TorusGeometry(7.55,.035,5,64),markerMaterial,item,0,0,0);
    inner.name='Glide gate inner edge';
    marker.position.y=10;markerHeight=10;
  } else if (objective.kind === 'rescue') {
    civilian = new THREE.Group();
    civilian.name = 'Civilian';
    item.add(civilian);
    // The orange rescue jacket and teal shirt distinguish the civilian from guards.
    box(shared.coat, civilian, 0, 1.28, 0, .64, .76, .36);
    box(shared.teal, civilian, 0, 1.34, .19, .2, .54, .025);
    box(shared.skin, civilian, 0, 1.93, 0, .34, .4, .32);
    box(shared.dark, civilian, 0, 2.12, -.025, .37, .13, .34);
    box(shared.dark, civilian, -.18, .47, 0, .24, .82, .28);
    box(shared.dark, civilian, .18, .47, 0, .24, .82, .28);
    box(shared.dark, civilian, -.18, .095, .05, .27, .17, .39);
    box(shared.dark, civilian, .18, .095, .05, .27, .17, .39);
    for (const side of [-1, 1]) {
      const arm = new THREE.Group();
      arm.position.set(side * .4, 1.57, 0);
      box(shared.coat, arm, 0, -.24, 0, .2, .48, .24);
      mesh(shared.sphere, shared.skin, arm, 0, -.54, .02, .105, .13, .105);
      civilian.add(arm);
      civilianArms.push(arm);
    }
    const safeArea = mesh(shared.halo, markerMaterial, item, 0, .085, 0, 1.5, 1.5, 1.5);
    safeArea.rotation.x = -Math.PI / 2;
    // A visible tie around the joined hands is removed once the hostage is freed.
    const restraint = box(shared.dark, civilian, 0, 1.02, .53, .34, .07, .08);
    restraint.name = 'Restraint';
    civilian.userData.restraint = restraint;
    extractionPad = new THREE.Group();
    extractionPad.name = 'Extraction pad';
    extractionPad.position.set(objective.terrain==='ground'?0:9,.09,objective.terrain==='ground'?-12:-8);
    const padMaterial = new THREE.MeshBasicMaterial({ color: 0x8ee5c3, transparent: true, opacity: .8, side: THREE.DoubleSide });
    const padRing = mesh(shared.ring, padMaterial, extractionPad, 0, 0, 0);
    padRing.rotation.x = -Math.PI / 2;
    box(padMaterial, extractionPad, -.6, .005, 0, .13, .02, 1.5);
    box(padMaterial, extractionPad, .6, .005, 0, .13, .02, 1.5);
    box(padMaterial, extractionPad, 0, .005, 0, 1.2, .02, .13);
    item.add(extractionPad);
  } else if (objective.kind === 'evidence') {
    cylinder(shared.dark, item, 0, .15, 0, .85, .3);
    const scanner = mesh(shared.halo, markerMaterial, item, 0, .36, 0, .7, .7, .7);
    scanner.rotation.x = -Math.PI / 2;
    briefcase = new THREE.Group();
    briefcase.name = 'Evidence case';
    briefcase.position.y = 1.2;
    item.add(briefcase);
    box(shared.metal, briefcase, 0, 0, 0, 1.2, .72, .38);
    box(shared.dark, briefcase, 0, .47, 0, .46, .22, .17);
    box(light, briefcase, 0, .015, .2, .84, .07, .025);
    box(shared.dark, briefcase, -.42, .28, .2, .12, .13, .07);
    box(shared.dark, briefcase, .42, .28, .2, .12, .13, .07);
    const holo = new THREE.Mesh(new THREE.PlaneGeometry(.36, .42), new THREE.MeshBasicMaterial({ color: kindColor, transparent: true, opacity: .35, side: THREE.DoubleSide, depthWrite: false }));
    holo.position.set(0, .85, 0);
    holo.rotation.z = Math.PI / 4;
    briefcase.add(holo);
    hover = briefcase;
  } else if (['finale','flight-finale'].includes(objective.kind)) {
    box(shared.dark, item, 0, .16, 0, 2.7, .32, 2.1);
    box(shared.metal, item, 0, 1.55, 0, 1.8, 2.7, 1.4);
    box(shared.dark, item, 0, 1.58, .72, 1.5, 2.3, .08);
    // One instanced draw submits all server vents and one all indicator lights.
    const vents = new THREE.InstancedMesh(shared.box, shared.metal, 7);
    const indicators = new THREE.InstancedMesh(shared.box, light, 7);
    const matrix = new THREE.Matrix4();
    for (let i = 0; i < 7; i++) {
      matrix.makeScale(1.05, .07, .04);
      matrix.setPosition(-.1, .65 + i * .29, .78);
      vents.setMatrixAt(i, matrix);
      matrix.makeScale(.1, .1, .05);
      matrix.setPosition(.62, .65 + i * .29, .79);
      indicators.setMatrixAt(i, matrix);
    }
    item.add(vents, indicators);
    cylinder(shared.metal, item, 0, 4.25, -.3, .09, 3);
    box(shared.metal, item, 0, 5.5, -.3, 2.4, .09, .09);
    cylinder(shared.metal, item, -.85, 5.5, -.3, .04, 1.1);
    cylinder(shared.metal, item, .85, 5.5, -.3, .04, 1.1);
    mesh(shared.sphere, light, item, 0, 5.88, -.3, .17, .17, .17);
    animatedRing = mesh(shared.torus, light, item, 0, 4.25, -.3, 1.15, 1.15, 1.15);
  } else {
    cylinder(shared.dark, item, 0, .3, 0, 1.2, .6);
    cylinder(shared.metal, item, 0, 2.15, 0, .13, 3.7);
    box(shared.dark, item, .43, 1.2, 0, .58, .86, .45);
    box(light, item, .43, 1.25, .24, .3, .08, .025);
    animatedRing = mesh(shared.torus, light, item, 0, 3.1, 0);
    mesh(shared.sphere, light, item, 0, 4.2, 0, .2, .2, .2);
  }

  function syncCivilian() {
    if (!civilian) return;
    civilian.position.set(escort.offset.x, 0, escort.offset.z);
    civilian.visible = !escort.evacuated;
    civilian.userData.released = escort.released;
    civilian.userData.evacuated = escort.evacuated;
    civilian.userData.restraint.visible = !escort.released && !state.completed && !escort.evacuated;
    extractionPad.visible = escort.released && !escort.evacuated && !state.completed;
    for (let i = 0; i < civilianArms.length; i++) {
      const arm = civilianArms[i];
      const side = i ? 1 : -1;
      arm.rotation.x = state.completed ? -.15 : escort.released ? -.08 : -.95;
      arm.rotation.z = state.completed ? side * 2.55 : escort.released ? side * .12 : -side * .35;
    }
  }

  function setEscort({ released = false, offset = { x: 0, z: 0 }, evacuated = false } = {}) {
    const nextOffset = {
      x: Number.isFinite(offset?.x) ? offset.x : 0,
      z: Number.isFinite(offset?.z) ? offset.z : 0,
    };
    if (civilian && released) {
      const dx = nextOffset.x - escort.offset.x;
      const dz = nextOffset.z - escort.offset.z;
      if (Math.hypot(dx, dz) > .001) civilian.rotation.y = Math.atan2(dx, dz);
    } else if (civilian) civilian.rotation.y = 0;
    escort = { released: !!released, offset: nextOffset, evacuated: !!evacuated };
    syncCivilian();
  }

  function setState({ active = false, completed = false } = {}) {
    state = { active: !!active, completed: !!completed };
    group.visible = state.active || state.completed;
    const showTarget = state.active && !state.completed;
    beacon.visible=showTarget&&!isFlight;
    marker.visible = showTarget;
    groundRing.visible=!isFlight&&(state.active||state.completed);
    highlight.color.setHex(state.completed ? 0x79a99e : 0xeac377);
    highlight.opacity = state.completed ? .28 : .9;
    light.color.setHex(state.completed ? 0x5e8e85 : kindColor);
    markerMaterial.opacity = state.completed ? .25 : .9;
    if (briefcase) briefcase.visible = !state.completed;
    syncCivilian();
  }

  function update(time = 0) {
    if (!group.visible) return;
    const pulse = .5 + Math.sin(time * 2.6) * .5;
    const scale = 1 + Math.sin(time * 2.6) * .035;
    groundRing.scale.set(scale, scale, scale);
    if (!state.completed) {
      beamMaterial.opacity = .085 + pulse * .055;
      marker.position.y = markerHeight + Math.sin(time * 2) * .15;
      marker.rotation.y = time * .75;
      if(animatedRing) {if(isFlight)animatedRing.rotation.z=time*.2;else animatedRing.rotation.y=time*1.25;}
    }
    if (hover && !state.completed) {
      hover.position.y = 1.2 + Math.sin(time * 2.2) * .12;
      hover.rotation.y = time * .38;
    }
    if (civilian && state.completed) {
      civilianArms[0].rotation.z = -2.55 + Math.sin(time * 3) * .1;
      civilianArms[1].rotation.z = 2.55 - Math.sin(time * 3) * .1;
    }
    if (civilian && escort.released && !escort.evacuated && !state.completed) {
      civilianArms[0].rotation.x = -.08 + Math.sin(time * 4) * .13;
      civilianArms[1].rotation.x = -.08 - Math.sin(time * 4) * .13;
      extractionPad.children[0].material.opacity = .62 + pulse * .25;
    }
  }

  let disposed = false;
  function dispose() {
    if (disposed) return;
    disposed = true;
    group.removeFromParent();
    const cached = new Set(Object.values(shared));
    const local = new Set([highlight, light, beamMaterial, markerMaterial]);
    group.traverse(part => {
      if (part.geometry && !cached.has(part.geometry)) local.add(part.geometry);
      const materials = Array.isArray(part.material) ? part.material : [part.material];
      for (const material of materials) {
        if (material && !cached.has(material)) local.add(material);
      }
      // Instance buffers belong to this prop even when its geometry is cached.
      if (part.isInstancedMesh) part.dispose();
    });
    for (const resource of local) resource.dispose();
  }

  setState();
  return { group, update, setState, setEscort, dispose };
}
