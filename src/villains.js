// Original low-poly characters. Each mission has its own silhouette and combat profile.
export const VILLAINS = Object.freeze({
  signals: Object.freeze({ id: 'firefly', name: 'Vagalume', health: 6, damage: 13, speed: 4.2, attackRange: 17, attackInterval: 2.3, attackStyle: 'fire', color: 0xff8738 }),
  rescue: Object.freeze({ id: 'penguin', name: 'Pinguim', health: 7, damage: 12, speed: 2.3, attackRange: 20, attackInterval: 2.0, attackStyle: 'umbrella', color: 0xb49cff }),
  evidence: Object.freeze({ id: 'riddler', name: 'Charada', health: 6, damage: 10, speed: 3.8, attackRange: 16, attackInterval: 1.75, attackStyle: 'riddle', color: 0x70ef78 }),
  finale: Object.freeze({ id: 'bane', name: 'Bane', health: 10, damage: 24, speed: 2.8, attackRange: 4.2, attackInterval: 2.6, attackStyle: 'heavy', color: 0x99ef53 }),
  flight: Object.freeze({ id: 'man-bat', name: 'Morcego Humano', health: 8, damage: 17, speed: 5.8, attackRange: 5.2, attackInterval: 2.1, attackStyle: 'swoop', color: 0xd29a65 }),
});

const REST = Object.freeze({});

function makeRig(THREE, definition) {
  const root = new THREE.Group();
  root.name = definition.name;
  root.userData.villainId = definition.id;
  const upper = new THREE.Group();
  upper.name = 'upper-body';
  root.add(upper);
  // Unit geometries and materials are shared by every compatible part of this model.
  const geometry = {
    box: new THREE.BoxGeometry(1, 1, 1),
    sphere: new THREE.SphereGeometry(1, 12, 8),
    cylinder: new THREE.CylinderGeometry(1, 1, 1, 12),
    cone: new THREE.ConeGeometry(1, 1, 12),
  };
  const materials = {};
  function material(name, color, options = {}) {
    return materials[name] ??= new THREE.MeshStandardMaterial({ color, roughness: 0.72, ...options });
  }
  function part(name, type, mat, x, y, z, sx, sy, sz, parent = upper) {
    const mesh = new THREE.Mesh(geometry[type], mat);
    mesh.name = name;
    mesh.position.set(x, y, z);
    mesh.scale.set(sx, sy, sz);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }
  function group(name, x, y, z, parent = upper) {
    const node = new THREE.Group();
    node.name = name;
    node.position.set(x, y, z);
    parent.add(node);
    return node;
  }
  function arm(name, x, y, length, width, mat, handMat = mat) {
    const node = group(name, x, y, 0);
    part(`${name}-sleeve`, 'box', mat, 0, -length / 2, 0, width, length, width, node);
    part(`${name}-hand`, 'sphere', handMat, 0, -length, 0.035, width * 0.62, width * 0.68, width * 0.68, node);
    return node;
  }
  function leg(name, x, hip, length, width, mat, boots) {
    const node = group(name, x, hip, 0, root);
    part(`${name}-trouser`, 'box', mat, 0, -length / 2, 0, width, length, width * 1.12, node);
    part(`${name}-boot`, 'box', boots, 0, -hip + 0.11, 0.09, width * 1.25, 0.22, width * 1.7, node);
    return node;
  }
  return { THREE, root, upper, geometry, material, part, group, arm, leg };
}

function firefly(rig) {
  const { part, group, arm, leg, material } = rig;
  const armor = material('armor', 0x714a32, { metalness: 0.6, roughness: 0.4 });
  const orange = material('orange', 0xe87a24, { metalness: 0.45 });
  const dark = material('dark', 0x141f2b);
  const steel = material('steel', 0x61717b, { metalness: 0.85, roughness: 0.35 });
  const glow = material('glow', 0xffbc43, { emissive: 0xff6814, emissiveIntensity: 1.8 });
  const visor = material('visor', 0x152832, { metalness: 0.9, roughness: 0.15 });
  part('armored-chest', 'box', armor, 0, 1.49, 0, 0.85, 0.9, 0.54);
  part('orange-chest-plate', 'box', orange, 0, 1.56, 0.29, 0.64, 0.48, 0.1);
  part('helmet', 'sphere', orange, 0, 2.18, 0.02, 0.34, 0.36, 0.33);
  part('wide-black-visor', 'box', visor, 0, 2.23, 0.3, 0.53, 0.18, 0.12);
  part('respirator', 'box', steel, 0, 2.02, 0.32, 0.32, 0.14, 0.13);
  const jetpack = group('jetpack', 0, 1.55, -0.43);
  part('fuel-housing', 'box', dark, 0, 0, 0, 0.7, 0.8, 0.32, jetpack);
  const flames = [];
  for (const side of [-1, 1]) {
    part('jet-tank', 'cylinder', steel, side * 0.28, 0, -0.09, 0.17, 0.9, 0.17, jetpack);
    part('jet-nozzle', 'cylinder', dark, side * 0.28, -0.48, -0.09, 0.19, 0.16, 0.19, jetpack);
    const flame = part('jet-flame', 'cone', glow, side * 0.28, -0.76, -0.09, 0.12, 0.5, 0.12, jetpack);
    flame.rotation.z = Math.PI;
    flames.push(flame);
    const fin = part('jet-fin', 'box', orange, side * 0.65, 0.12, -0.09, 0.65, 0.12, 0.45, jetpack);
    fin.rotation.z = side * -0.4;
  }
  const leftArm = arm('left-arm', -0.57, 1.88, 0.72, 0.27, armor, dark);
  const rightArm = arm('right-arm', 0.57, 1.88, 0.72, 0.27, orange, dark);
  part('flamethrower', 'cylinder', steel, 0, -0.85, 0.08, 0.15, 0.58, 0.15, rightArm);
  part('flamethrower-light', 'sphere', glow, 0, -1.15, 0.08, 0.07, 0.05, 0.07, rightArm);
  const leftLeg = leg('left-leg', -0.23, 0.98, 0.86, 0.29, dark, armor);
  const rightLeg = leg('right-leg', 0.23, 0.98, 0.86, 0.29, dark, armor);
  return { leftArm, rightArm, leftLeg, rightLeg, flames };
}

function penguin(rig) {
  const { part, group, arm, leg, material } = rig;
  const coat = material('coat', 0x171323);
  const skin = material('skin', 0xddb89c);
  const white = material('white', 0xe8e0d9);
  const purple = material('purple', 0x713c91);
  const black = material('black', 0x111821, { metalness: 0.2 });
  const gold = material('gold', 0xd6ad61, { metalness: 0.8 });
  part('round-overcoat', 'sphere', coat, 0, 1.04, 0, 0.67, 0.7, 0.48);
  part('shirt-front', 'sphere', white, 0, 1.19, 0.39, 0.28, 0.45, 0.12);
  part('purple-cravat', 'box', purple, 0, 1.45, 0.52, 0.18, 0.3, 0.04);
  part('head', 'sphere', skin, 0, 1.84, 0.04, 0.29, 0.3, 0.28);
  const nose = part('long-pointed-nose', 'cone', skin, 0, 1.82, 0.4, 0.1, 0.36, 0.1);
  nose.rotation.x = Math.PI / 2;
  part('top-hat-brim', 'cylinder', black, 0, 2.08, 0.02, 0.42, 0.07, 0.36);
  part('top-hat', 'cylinder', black, 0, 2.34, 0.02, 0.25, 0.48, 0.25);
  part('hat-ribbon', 'cylinder', purple, 0, 2.17, 0.02, 0.255, 0.12, 0.255);
  const monocle = new rig.THREE.Mesh(new rig.THREE.TorusGeometry(0.085, 0.014, 5, 12), gold);
  monocle.name = 'monocle';
  monocle.position.set(-0.12, 1.91, 0.3);
  monocle.castShadow = true;
  monocle.receiveShadow = true;
  rig.upper.add(monocle);
  const leftArm = arm('left-arm', -0.56, 1.52, 0.64, 0.28, coat, white);
  const rightArm = arm('right-arm', 0.56, 1.52, 0.64, 0.28, coat, white);
  const umbrella = group('umbrella', 0.09, -0.59, 0.18, rightArm);
  part('umbrella-shaft', 'cylinder', gold, 0, 0.66, 0, 0.026, 1.65, 0.026, umbrella);
  const canopy = part('umbrella-canopy', 'cone', purple, 0, 1.45, 0, 0.72, 0.25, 0.72, umbrella);
  canopy.rotation.y = Math.PI / 8;
  part('umbrella-tip', 'cone', gold, 0, 1.66, 0, 0.035, 0.18, 0.035, umbrella);
  const leftLeg = leg('left-leg', -0.23, 0.58, 0.46, 0.29, coat, black);
  const rightLeg = leg('right-leg', 0.23, 0.58, 0.46, 0.29, coat, black);
  return { leftArm, rightArm, leftLeg, rightLeg, umbrella };
}

function riddler(rig) {
  const { part, group, arm, leg, material } = rig;
  const green = material('green', 0x238b48);
  const skin = material('skin', 0xd9b391);
  const purple = material('purple', 0x5c2c7a);
  const dark = material('dark', 0x152d29);
  const lime = material('lime', 0xa2f370, { emissive: 0x497a1a, emissiveIntensity: 0.5 });
  part('tailored-green-jacket', 'box', green, 0, 1.43, 0, 0.7, 0.92, 0.4);
  part('purple-tie', 'box', purple, 0, 1.62, 0.23, 0.1, 0.45, 0.035);
  part('head', 'sphere', skin, 0, 2.12, 0.02, 0.27, 0.33, 0.26);
  part('purple-eye-mask', 'box', purple, 0, 2.18, 0.26, 0.45, 0.12, 0.08);
  part('bowler-brim', 'cylinder', dark, 0, 2.38, 0, 0.38, 0.07, 0.32);
  part('green-bowler', 'sphere', green, 0, 2.47, 0, 0.28, 0.2, 0.26);
  const leftArm = arm('left-arm', -0.47, 1.85, 0.8, 0.22, green, purple);
  const rightArm = arm('right-arm', 0.47, 1.85, 0.8, 0.22, green, purple);
  const cane = group('question-mark-cane', 0.09, -0.76, 0.19, rightArm);
  part('cane-stem', 'cylinder', lime, 0, -0.28, 0, 0.033, 1.03, 0.033, cane);
  const hookGeometry = new rig.THREE.TorusGeometry(0.15, 0.033, 6, 16, Math.PI * 1.55);
  const hook = new rig.THREE.Mesh(hookGeometry, lime);
  hook.name = 'question-mark-hook';
  hook.position.set(-0.04, 0.36, 0);
  hook.rotation.z = -Math.PI / 2;
  hook.castShadow = hook.receiveShadow = true;
  cane.add(hook);
  part('question-mark-stem', 'box', lime, 0, 0.16, 0, 0.065, 0.14, 0.065, cane);
  part('question-mark-dot', 'sphere', lime, 0, 0.04, 0, 0.045, 0.045, 0.045, cane);
  // A second large question mark makes the suit readable from the chase camera.
  const emblem = group('question-mark', -0.15, 1.5, 0.24);
  const suitHook = new rig.THREE.Mesh(hookGeometry, lime);
  suitHook.name = 'jacket-question-mark';
  suitHook.scale.setScalar(0.7);
  suitHook.position.y = 0.11;
  suitHook.rotation.z = -Math.PI / 2;
  suitHook.castShadow = suitHook.receiveShadow = true;
  emblem.add(suitHook);
  part('jacket-question-dot', 'sphere', lime, 0.03, -0.09, 0, 0.035, 0.035, 0.035, emblem);
  const leftLeg = leg('left-leg', -0.2, 1, 0.88, 0.24, green, dark);
  const rightLeg = leg('right-leg', 0.2, 1, 0.88, 0.24, green, dark);
  return { leftArm, rightArm, leftLeg, rightLeg, cane };
}

function bane(rig) {
  const { THREE, part, group, arm, leg, material } = rig;
  const skin = material('skin', 0xb49877);
  const dark = material('dark', 0x192027);
  const mask = material('mask', 0x464c4d, { metalness: 0.5 });
  const green = material('venom', 0x9aff37, { emissive: 0x54d01e, emissiveIntensity: 1.3 });
  const red = material('eyes', 0xff6656, { emissive: 0xdb1f18, emissiveIntensity: 1.1 });
  part('massive-torso', 'sphere', skin, 0, 1.84, 0, 0.9, 0.7, 0.5);
  part('waist', 'box', dark, 0, 1.14, 0, 0.78, 0.38, 0.5);
  part('chest-harness', 'box', dark, 0, 1.84, 0.47, 0.34, 1.0, 0.08);
  for (const side of [-1, 1]) {
    part('harness-strap', 'box', dark, side * 0.54, 1.98, 0.4, 0.16, 0.94, 0.12);
    part('shoulder-muscle', 'sphere', skin, side * 0.94, 2.16, 0, 0.4, 0.41, 0.4);
  }
  part('masked-head', 'sphere', dark, 0, 2.62, 0, 0.35, 0.39, 0.33);
  part('mask-center-stripe', 'box', mask, 0, 2.66, 0.31, 0.13, 0.65, 0.08);
  part('mouth-respirator', 'box', mask, 0, 2.45, 0.33, 0.49, 0.17, 0.16);
  part('red-eye-left', 'box', red, -0.16, 2.69, 0.31, 0.15, 0.08, 0.08);
  part('red-eye-right', 'box', red, 0.16, 2.69, 0.31, 0.15, 0.08, 0.08);
  const leftArm = arm('left-arm', -1, 2.16, 1.01, 0.47, skin, dark);
  const rightArm = arm('right-arm', 1, 2.16, 1.01, 0.47, skin, dark);
  for (const node of [leftArm, rightArm]) part('reinforced-gauntlet', 'box', dark, 0, -0.83, 0.02, 0.51, 0.4, 0.48, node);
  const tubes = group('venom-tubes', 0, 0, 0);
  for (const side of [-1, 1]) {
    part('venom-tank', 'cylinder', green, side * 0.29, 1.87, -0.57, 0.17, 0.85, 0.17);
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * 0.29, 2.2, -0.58),
      new THREE.Vector3(side * 0.63, 2.63, -0.43),
      new THREE.Vector3(side * 0.95, 2.47, -0.13),
      new THREE.Vector3(side * 1.13, 2.02, 0.07),
    ]);
    const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 12, 0.045, 5, false), green);
    tube.name = 'venom-tube';
    tube.castShadow = tube.receiveShadow = true;
    tubes.add(tube);
  }
  const leftLeg = leg('left-leg', -0.3, 1.05, 0.93, 0.39, dark, dark);
  const rightLeg = leg('right-leg', 0.3, 1.05, 0.93, 0.39, dark, dark);
  return { leftArm, rightArm, leftLeg, rightLeg, venom: green };
}

function manBat(rig) {
  const { THREE, part, group, arm, leg, material } = rig;
  const fur = material('fur', 0x6c4634);
  const skin = material('skin', 0xa77a59);
  const membrane = material('membrane', 0x633a37, { side: THREE.DoubleSide });
  const dark = material('dark', 0x241a20);
  const ivory = material('ivory', 0xe8d5ae);
  const eyes = material('eyes', 0xffce72, { emissive: 0xfa942f, emissiveIntensity: 1.4 });
  part('fur-torso', 'sphere', fur, 0, 1.65, 0, 0.65, 0.74, 0.4);
  part('chest', 'sphere', skin, 0, 1.72, 0.27, 0.44, 0.57, 0.22);
  part('bat-head', 'sphere', fur, 0, 2.41, 0.02, 0.39, 0.37, 0.32);
  part('snout', 'sphere', skin, 0, 2.29, 0.32, 0.26, 0.18, 0.2);
  part('nose', 'sphere', dark, 0, 2.39, 0.47, 0.12, 0.08, 0.06);
  for (const side of [-1, 1]) {
    const ear = part('large-bat-ear', 'cone', fur, side * 0.27, 2.91, 0, 0.19, 0.72, 0.12);
    ear.rotation.z = side * -0.2;
    part('glowing-eye', 'sphere', eyes, side * 0.18, 2.49, 0.32, 0.065, 0.05, 0.05);
    const fang = part('fang', 'cone', ivory, side * 0.13, 2.16, 0.44, 0.045, 0.18, 0.045);
    fang.rotation.z = Math.PI;
  }
  const leftArm = arm('left-arm', -0.6, 2.1, 0.85, 0.23, fur, skin);
  const rightArm = arm('right-arm', 0.6, 2.1, 0.85, 0.23, fur, skin);
  const wings = group('bat-wings', 0, 2.09, -0.12);
  const wingGeometry = new THREE.BufferGeometry();
  // A scalloped membrane is stretched between elongated bat fingers.
  wingGeometry.setAttribute('position', new THREE.Float32BufferAttribute([
    0, 0, 0, 2.17, 0.38, -0.1, 1.7, -0.55, 0,
    0, 0, 0, 1.7, -0.55, 0, 1.15, -0.27, 0,
    0, 0, 0, 1.15, -0.27, 0, 1.05, -1.02, 0.04,
    0, 0, 0, 1.05, -1.02, 0.04, 0.58, -0.59, 0.07,
    0, 0, 0, 0.58, -0.59, 0.07, 0.24, -1.03, 0.08,
  ], 3));
  wingGeometry.computeVertexNormals();
  const wingNodes = [];
  for (const side of [-1, 1]) {
    const wing = group(side < 0 ? 'left-wing' : 'right-wing', side * 0.44, 0, 0, wings);
    wing.scale.x = side;
    const mesh = new THREE.Mesh(wingGeometry, membrane);
    mesh.name = 'wing-membrane';
    mesh.castShadow = mesh.receiveShadow = true;
    wing.add(mesh);
    for (const [x, y, length, angle] of [[1.04, 0.18, 2.22, -1.4], [0.72, -0.22, 1.55, -1.85], [0.5, -0.51, 1.17, -2.37]]) {
      const finger = part('wing-finger', 'cylinder', skin, x, y, -0.012, 0.035, length, 0.035, wing);
      finger.rotation.z = angle;
    }
    wingNodes.push(wing);
  }
  const leftLeg = leg('left-leg', -0.27, 1.08, 0.96, 0.29, fur, dark);
  const rightLeg = leg('right-leg', 0.27, 1.08, 0.96, 0.29, fur, dark);
  for (const node of [leftLeg, rightLeg]) {
    for (const x of [-0.12, 0, 0.12]) {
      const claw = part('foot-claw', 'cone', ivory, x, -0.99, 0.39, 0.05, 0.19, 0.05, node);
      claw.rotation.x = Math.PI / 2;
    }
  }
  return { leftArm, rightArm, leftLeg, rightLeg, wingNodes };
}

const BUILDERS = Object.freeze({ firefly, penguin, riddler, bane, 'man-bat': manBat });

/** Feet are at y=0; the face and attack props point towards local +Z. */
export function createVillain(THREE, missionId) {
  if (!Object.hasOwn(VILLAINS, missionId)) throw new RangeError(`Unknown villain mission: ${String(missionId)}`);
  const definition = VILLAINS[missionId];
  const rig = makeRig(THREE, definition);
  const limbs = BUILDERS[definition.id](rig);
  rig.root.userData.update = (state = REST) => {
    const time = Number.isFinite(state.time) ? state.time : 0;
    const stunned = Boolean(state.stunned);
    const attacking = Boolean(state.attacking) && !stunned;
    const stride = state.moving && !stunned ? Math.sin(time * 8) * 0.32 : 0;
    limbs.leftLeg.rotation.x = stride;
    limbs.rightLeg.rotation.x = -stride;
    limbs.leftArm.rotation.x = stunned ? 0.15 : attacking ? -1.25 : -stride;
    limbs.rightArm.rotation.x = stunned ? 0.15 : attacking ? -1.5 : stride;
    rig.upper.position.y = stunned ? 0 : Math.sin(time * 2) * 0.013;
    rig.upper.rotation.z = stunned ? Math.sin(time * 18) * 0.07 : 0;
    if (definition.id === 'bane') {
      const raised = attacking && !state.exposed;
      limbs.leftArm.rotation.x = raised ? -2.2 : limbs.leftArm.rotation.x;
      limbs.rightArm.rotation.x = raised ? -2.2 : limbs.rightArm.rotation.x;
      limbs.venom.emissiveIntensity = stunned ? 0.35 : state.exposed ? 0.65 : 1.3 + Math.sin(time * 4) * 0.25;
    }
    if (limbs.flames) {
      const power = stunned ? 0.04 : state.moving || attacking ? 1.3 : 0.65;
      for (let i = 0; i < limbs.flames.length; i++) {
        limbs.flames[i].scale.y = 0.5 * power * (1 + Math.sin(time * 24 + i * 2) * 0.16);
      }
    }
    if (limbs.wingNodes) {
      const flap = stunned ? -0.36 : Math.sin(time * (attacking ? 11 : 4.8)) * (state.moving ? 0.43 : 0.19);
      limbs.wingNodes[0].rotation.y = flap;
      limbs.wingNodes[1].rotation.y = -flap;
      limbs.leftArm.rotation.z = stunned ? 0.2 : -0.7;
      limbs.rightArm.rotation.z = stunned ? -0.2 : 0.7;
    }
  };
  rig.root.userData.update();
  return rig.root;
}
