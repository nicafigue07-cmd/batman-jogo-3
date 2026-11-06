import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/** Procedural Gotham. All scenery and character meshes are generated locally. */
export function createWorld(THREE, scene) {
  let seed = 8307;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  // Decorative variation has its own stream. Never consume the layout RNG for
  // new effects: missions and collision roofs depend on its original sequence.
  let detailSeed = 481516;
  const detailRandom = () => {
    detailSeed = (detailSeed * 1664525 + 1013904223) >>> 0;
    return detailSeed / 4294967296;
  };
  const group = new THREE.Group();
  group.name = 'Los Angeles';
  scene.add(group);
  const ambientDetails = new THREE.Group();
  ambientDetails.name = 'City ambient details';
  const highDetails = new THREE.Group();
  highDetails.name = 'City high quality details';
  group.add(ambientDetails, highDetails);
  let quality = 'medium';
  const buildings = [];
  const rooftops = [];
  const collisionBuildings = [];
  const buildingStyles = [];
  const anchors = [];
  const boxes = { concrete: [], metal: [], gold: [], blue: [], lamps: [], road: [] };
  const materials = {
    concrete: new THREE.MeshStandardMaterial({ color: 0xc3b7a3, roughness: .89, metalness: .18 }),
    metal: new THREE.MeshStandardMaterial({ color: 0x33414a, roughness: .65, metalness: .65 }),
    gold: new THREE.MeshStandardMaterial({ color: 0xc39a52, emissive: 0x765026, emissiveIntensity: .35, metalness: .6, roughness: .45 }),
    blue: new THREE.MeshBasicMaterial({ color: 0x5fcbcf, transparent: true, opacity: .65 }),
    lamps: new THREE.MeshBasicMaterial({ color: 0xffd09a }),
    road: new THREE.MeshBasicMaterial({ color: 0x7b7860, transparent: true, opacity: .45 }),
  };
  function surfaceMaps(size, roof = false) {
    const roughness = new Uint8Array(size * size * 4);
    const normals = new Uint8Array(size * size * 4);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const noise = detailRandom();
      const seam = roof && (x % 32 < 2 || y % 32 < 2);
      const wet = Math.sin(x * .12) * Math.cos(y * .09) > .18;
      const value = seam ? 235 : roof ? 155 + noise * 70 : (wet ? 55 : 95) + noise * 55;
      roughness.set([value, value, value, 255], i);
      normals.set([128 + (noise - .5) * (roof ? 18 : 12), seam ? 145 : 128 + (noise - .5) * 12, 252, 255], i);
    }
    const make = data => {
      const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      texture.magFilter = THREE.LinearFilter;
      texture.minFilter = THREE.LinearMipmapLinearFilter;
      texture.generateMipmaps = true;
      texture.repeat.set(roof ? 4 : 40, roof ? 4 : 40);
      texture.needsUpdate = true;
      return texture;
    };
    return { roughnessMap: make(roughness), normalMap: make(normals) };
  }
  const roofMaterial = new THREE.MeshStandardMaterial({ color: 0xb6b0a0, roughness: .85, metalness: .28, normalScale: new THREE.Vector2(.3, .3), ...surfaceMaps(128, true) });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), new THREE.MeshStandardMaterial({ color: 0x60676a, roughness: .55, metalness: .62, normalScale: new THREE.Vector2(.22, .22), ...surfaceMaps(128) }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  group.add(ground);

  function facade(tint) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    const emissiveCanvas = document.createElement('canvas');
    emissiveCanvas.width = 256;
    emissiveCanvas.height = 512;
    const glow = emissiveCanvas.getContext('2d');
    const roughness = new Uint8Array(256 * 512 * 4);
    const normals = new Uint8Array(256 * 512 * 4);
    ctx.fillStyle = tint === 'warm' ? '#25313b' : '#233d47';
    ctx.fillRect(0, 0, 256, 512);
    glow.fillStyle = '#000000';
    glow.fillRect(0, 0, 256, 512);
    for (let i = 0; i < 1600; i++) {
      ctx.fillStyle = detailRandom() > .5 ? 'rgba(158,181,185,.06)' : 'rgba(0,0,0,.1)';
      ctx.fillRect(detailRandom() * 256, detailRandom() * 512, 1, 2 + detailRandom() * 8);
    }
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 8; x++) {
        // These two layout-RNG calls intentionally match the original facade.
        const illuminated = random() > .38;
        const color = illuminated ? (random() > .6 ? '#ecd2a1' : tint === 'warm' ? '#ab8651' : '#89adb5') : '#101c25';
        const wx = x * 32 + 8, wy = y * 32 + 7;
        ctx.fillStyle = '#101b24';
        ctx.fillRect(wx - 2, wy - 2, 18, 24);
        ctx.fillStyle = '#3d5360';
        ctx.fillRect(wx - 1, wy - 1, 16, 22);
        ctx.fillStyle = color;
        ctx.fillRect(wx, wy, 14, 20);
        if (illuminated) {
          glow.fillStyle = color;
          glow.fillRect(wx, wy, 14, 20);
          ctx.fillStyle = 'rgba(255,240,195,.15)';
          ctx.fillRect(wx + 1, wy, 3, 19);
          const blind = detailRandom() > .62 ? 5 + detailRandom() * 8 : 0;
          ctx.fillStyle = '#34434a';
          ctx.fillRect(wx, wy, 14, blind);
          glow.fillStyle = '#071016';
          glow.fillRect(wx, wy, 14, blind);
        }
        ctx.fillStyle = '#293d47';
        ctx.fillRect(wx + 6, wy, 1, 20);
        ctx.fillRect(wx, wy + 10, 14, 1);
        glow.fillStyle = '#0a141c';
        glow.fillRect(wx + 6, wy, 1, 20);
        glow.fillRect(wx, wy + 10, 14, 1);
      }
      ctx.fillStyle = '#162c36';
      ctx.fillRect(0, y * 32 + 30, 256, 2);
      ctx.fillStyle = '#42606a';
      ctx.fillRect(0, y * 32 + 29, 256, 1);
    }
    for (let y = 0; y < 512; y++) for (let x = 0; x < 256; x++) {
      const i = (y * 256 + x) * 4;
      const lx = x % 32, ly = y % 32;
      const window = lx >= 8 && lx <= 22 && ly >= 7 && ly <= 27;
      const bevelX = lx === 7 ? -28 : lx === 23 ? 28 : 0;
      const bevelY = ly === 6 ? 24 : ly === 28 ? -24 : 0;
      const r = window ? 67 : 190 + detailRandom() * 30;
      roughness.set([r, r, r, 255], i);
      normals.set([128 + bevelX, 128 + bevelY, 250, 255], i);
    }
    const texture = new THREE.CanvasTexture(canvas);
    const emission = new THREE.CanvasTexture(emissiveCanvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    emission.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = texture.wrapT = emission.wrapS = emission.wrapT = THREE.RepeatWrapping;
    texture.anisotropy = 4;
    const dataTexture = values => {
      const map = new THREE.DataTexture(values, 256, 512, THREE.RGBAFormat);
      map.wrapS = map.wrapT = THREE.RepeatWrapping;
      map.magFilter = THREE.LinearFilter;
      map.flipY = true;
      map.needsUpdate = true;
      return map;
    };
    return new THREE.MeshStandardMaterial({ map: texture, emissiveMap: emission, emissive: 0xe6f0f2, emissiveIntensity: .62, roughnessMap: dataTexture(roughness), normalMap: dataTexture(normals), normalScale: new THREE.Vector2(.35,.35), roughness: .85, metalness: .35 });
  }
  // Generate these three first: their layout-RNG calls preserve every original
  // city height. Additional architecture uses only the decorative RNG.
  const originalFacades = [facade('warm'), facade('cold'), facade('cold')];
  const architectureNames = ['art-deco', 'glass-office', 'brick-apartments', 'industrial', 'gothic', 'twin-towers', 'modern-terraces'];
  function architectureFacade(style) {
    const canvas = document.createElement('canvas');
    const emission = document.createElement('canvas');
    canvas.width = emission.width = 256;
    canvas.height = emission.height = 512;
    const ctx = canvas.getContext('2d'), glow = emission.getContext('2d');
    const backgrounds = ['#35424b', '#1e3b49', '#563c38', '#35403f', '#353944', '#29444f', '#59636b'];
    ctx.fillStyle = backgrounds[style]; ctx.fillRect(0, 0, 256, 512);
    glow.fillStyle = '#000000'; glow.fillRect(0, 0, 256, 512);
    // Brick courses, ashlar stone and factory siding remain visibly different
    // even when a building's windows are dark.
    const course = style === 2 ? 12 : style === 4 ? 32 : 64;
    if (style !== 1 && style !== 5) {
      for (let y = 0; y < 512; y += course) {
        ctx.fillStyle = style === 6 ? '#839099' : '#1e2a31';
        ctx.fillRect(0, y, 256, style === 2 ? 1 : 2);
        const step = style === 2 ? 32 : 64;
        for (let x = (y / course % 2) * step / 2; x < 256; x += step) ctx.fillRect(x, y, 1, course);
      }
    }
    const columns = [8, 10, 6, 5, 5, 8, 4][style];
    const rows = [16, 26, 15, 9, 7, 22, 12][style];
    const cellW = 256 / columns, cellH = 512 / rows;
    for (let row = 0; row < rows; row++) for (let col = 0; col < columns; col++) {
      const lit = detailRandom() > (style === 3 ? .55 : .38);
      const inset = style === 1 || style === 5 ? 1.5 : style === 6 ? 3 : 7;
      const x = col * cellW + inset, y = row * cellH + (style === 4 ? 8 : 4);
      const width = cellW - inset * 2, height = cellH - (style === 4 ? 14 : 8);
      const light = style === 2 || style === 4 ? '#d8ae70' : style === 3 ? '#abd0b8' : '#94c3d4';
      ctx.fillStyle = style === 2 ? '#9a7461' : '#556a74';
      ctx.fillRect(x - 2, y - 2, width + 4, height + 4);
      ctx.fillStyle = lit ? light : '#112632';
      glow.fillStyle = lit ? light : '#000000';
      if (style === 4) {
        for (const context of [ctx, glow]) {
          context.beginPath(); context.moveTo(x, y + height);
          context.lineTo(x, y + 12); context.lineTo(x + width / 2, y);
          context.lineTo(x + width, y + 12); context.lineTo(x + width, y + height);
          context.closePath(); context.fill();
        }
      } else {
        ctx.fillRect(x, y, width, height); glow.fillRect(x, y, width, height);
      }
      for (const context of [ctx, glow]) {
        context.fillStyle = '#263a43';
        if (style === 3) {
          for (let pane = 1; pane < 4; pane++) context.fillRect(x + width * pane / 4, y, 1.5, height);
          context.fillRect(x, y + height / 2, width, 1.5);
        } else if (style === 2 || style === 4) {
          context.fillRect(x + width / 2, y + (style === 4 ? 8 : 0), 2, height);
          context.fillRect(x, y + height * .55, width, 2);
        }
        if (style === 5 && row % 4 === 0) context.fillRect(x, y + height - 3, width, 3);
      }
      if (style === 1 && (col + row) % 5 === 0) {
        ctx.fillStyle = 'rgba(204,230,240,.2)'; ctx.fillRect(x, y, width * .35, height);
      }
    }
    if (style === 3) {
      ctx.fillStyle = '#718078';
      for (let x = 0; x < 256; x += 51.2) ctx.fillRect(x, 0, 4, 512);
    }
    const material = originalFacades[style % 3].clone();
    material.map = new THREE.CanvasTexture(canvas);
    material.emissiveMap = new THREE.CanvasTexture(emission);
    for (const texture of [material.map, material.emissiveMap]) {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      texture.anisotropy = 4;
    }
    material.roughness = style === 1 || style === 5 ? .3 : .86;
    material.metalness = style === 1 || style === 5 ? .65 : .16;
    material.normalScale = new THREE.Vector2(.17, .17);
    return material;
  }
  const facades = architectureNames.map((_, style) => style === 0 ? originalFacades[0] : architectureFacade(style));
  for (const material of [...facades, roofMaterial]) material.vertexColors = true;
  // All 49 structures, including their setbacks, share eight static meshes.
  // Vertex colors vary each address without creating per-building draw calls.
  const roofBatch = facades.length;
  const buildingBatches = Array.from({ length: facades.length + 1 }, () => ({ position: [], normal: [], uv: [], color: [] }));
  const batch = (key, x, y, z, w, h, d, ry = 0) => boxes[key].push({ x, y, z, w, h, d, ry });
  const billboard = (text, color, x, y, z, width, height, ry = 0) => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#101a22';
    ctx.fillRect(0, 0, 512, 128);
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.strokeRect(5, 5, 502, 118);
    ctx.font = '600 40px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 13;
    ctx.fillText(text, 256, 64);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide }));
    mesh.position.set(x, y, z);
    mesh.rotation.y = ry;
    group.add(mesh);
  };

  function solidVolume(x, z, w, d, h, style, tint, windowShift = 0) {
    // Every structural box starts at street level. The union of these exact
    // volumes is also the physics shape, so setbacks have no invisible walls.
    const geom = new THREE.BoxGeometry(w, h, d);
    const uv = geom.attributes.uv;
    for (let face = 0; face < 6; face++) {
      for (let p = 0; p < 4; p++) {
        const i = face * 4 + p;
        uv.setXY(i, uv.getX(i) * ((face < 2 ? d : w) / 25) + windowShift, uv.getY(i) * (h / 46));
      }
    }
    geom.translate(x, h / 2, z);
    const position = geom.attributes.position;
    const normal = geom.attributes.normal;
    for (const face of geom.groups) {
      const target = buildingBatches[face.materialIndex === 2 || face.materialIndex === 3 ? roofBatch : style];
      for (let i = face.start; i < face.start + face.count; i++) {
        const vertex = geom.index.getX(i);
        target.position.push(position.getX(vertex), position.getY(vertex), position.getZ(vertex));
        target.normal.push(normal.getX(vertex), normal.getY(vertex), normal.getZ(vertex));
        target.uv.push(uv.getX(vertex), uv.getY(vertex));
        target.color.push(tint.r, tint.g, tint.b);
      }
    }
    geom.dispose();
    collisionBuildings.push({ x, z, w, d, h });
  }

  function building(x, z, originalW, originalD, h, index) {
    const wayne = x === 0 && z === -168;
    const style = wayne ? 0 : index % architectureNames.length;
    const variation = Math.floor(index / architectureNames.length);
    const side = variation % 2 ? -1 : 1;
    const baseW = style === 5 ? Math.max(38, originalW) : originalW;
    const baseD = originalD;
    const w = wayne ? originalW : Math.max(28, baseW * [ .76, .87, .88, .82, .79, .73, .77 ][style]);
    const d = wayne ? originalD : Math.max(28, baseD * [ .78, .88, .86, .79, .81, .88, .77 ][style]);
    const tint = new THREE.Color().setHSL(.53 + (index % 9) * .007, .09 + (variation % 3) * .035, .78 + (index % 5) * .035);
    const shift = (index * .173) % 1;
    const volumes = [];
    const volume = (vx, vz, vw, vd, vh, material = style, color = tint) => {
      solidVolume(vx, vz, vw, vd, vh, material, color, shift);
      volumes.push({ x: vx, z: vz, w: vw, d: vd, h: vh });
    };
    const trim = (key, height, width, depth, vx = x, vz = z, thickness = .35) => batch(key, vx, height, vz, width, thickness, depth);
    // All upper decks have a clear central 24 × 24 m landing square. Mission
    // markers and grapple landings therefore retain their original positions.
    if (style === 0) {
      volume(x, z, baseW, baseD, h * .31);
      volume(x, z, Math.max(w, baseW * .9), Math.max(d, baseD * .9), h * .68);
      volume(x, z, w, d, h);
      trim('gold', h * .31, baseW + .4, baseD + .4);
      trim('metal', h * .68, Math.max(w, baseW * .9) + .4, Math.max(d, baseD * .9) + .4);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        batch('metal', x + sx * (w / 2 - .18), h / 2, z + sz * (d / 2 - .18), .55, h, .55);
      }
      batch('gold', x, h - 2, z + d / 2 + .08, w * .82, .18, .12);
    } else if (style === 1) {
      volume(x, z, baseW, baseD, h * .19);
      volume(x, z, w, d, h);
      const wingW = (baseW - w) / 2;
      if (wingW > .3) volume(x + side * (w / 2 + wingW / 2), z, wingW, baseD, h * (.54 + variation * .025));
      for (let rib = -2; rib <= 2; rib++) {
        batch('metal', x + rib * w / 5, h / 2, z + d / 2 + .09, .16, h, .16);
        batch('metal', x + w / 2 + .09, h / 2, z + rib * d / 5, .16, h, .16);
      }
      trim('blue', h - .5, w + .25, d + .25, x, z, .12);
    } else if (style === 2) {
      volume(x, z, baseW, baseD, h * .24);
      volume(x, z, w, d, h);
      const projection = Math.max(.6, (baseD - d) / 2);
      for (const sx of [-1, 1]) volume(x + sx * (w / 2 - 2), z + d / 2, 4, projection * 2, h * .84);
      // Shallow balcony rails sit along the facade rather than across rooftops.
      const floors = Math.max(3, Math.floor(h / 4.2));
      for (let floor = 1; floor < floors; floor++) {
        const by = floor * h / floors;
        for (let bay = -1; bay <= 1; bay++) {
          batch('metal', x + bay * w * .23, by, z + d / 2 + .38, 4.1, .15, .72);
          batch('concrete', x + bay * w * .23, by + .72, z + d / 2 + .72, 4.1, .15, .12);
          for (const rail of [-1, 1]) batch('metal', x + bay * w * .23 + rail * 1.9, by + .37, z + d / 2 + .7, .1, .7, .1);
        }
      }
      trim('concrete', h - .65, w + .55, d + .55, x, z, .5);
    } else if (style === 3) {
      volume(x, z, baseW, baseD, h * .43);
      volume(x, z, w, d, h);
      const wing = (baseW - w) / 2;
      if (wing > .3) volume(x - side * (w / 2 + wing / 2), z, wing, baseD, h * .7);
      // A pair of full-height boiler stacks is solid from the pavement upward.
      const stackTint = new THREE.Color(0x4c514f);
      for (const sx of [-1, 1]) {
        const cx = x + sx * (baseW / 2 - 1.1), cz = z - baseD / 2 + 1.1;
        volume(cx, cz, 1.6, 1.6, h + 3 + variation * .4, 3, stackTint);
        batch('metal', cx, h + 2.6 + variation * .4, cz, 2, .45, 2);
      }
      for (let band = 1; band <= 3; band++) trim('metal', h * band / 4, w + .25, d + .25);
      batch('gold', x + side * (w / 2 - .8), h - 1.4, z + d / 2 + .1, 1.2, 1.8, .13);
    } else if (style === 4) {
      volume(x, z, baseW, baseD, h * .32);
      volume(x, z, w, d, h);
      // Corner turrets and buttresses give Old Gotham a stone silhouette. They
      // are narrow grounded volumes, leaving the central roof unobstructed.
      const stoneTint = new THREE.Color(0x9099a0);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        const tx = x + sx * (baseW / 2 - 1.15), tz = z + sz * (baseD / 2 - 1.15);
        volume(tx, tz, 2.3, 2.3, h + 1.2 + variation * .2, 4, stoneTint);
        volume(tx, tz, 1.15, 1.15, h + 3 + variation * .3, 4, stoneTint);
        batch('gold', tx, h + 3.15 + variation * .3, tz, .23, .3, .23);
      }
      for (const sx of [-1, 1]) {
        const buttressW = Math.max(.5, (baseW - w) / 2);
        for (const sz of [-1, 0, 1]) volume(x + sx * (w / 2 + buttressW / 2), z + sz * d * .33, buttressW, 1.7, h * .82);
      }
      trim('concrete', h - 1.1, w + .65, d + .65, x, z, .7);
    } else if (style === 5) {
      volume(x, z, baseW, baseD, h * .23);
      volume(x, z, w, d, h);
      const towerW = (baseW - w) / 2;
      for (const sx of [-1, 1]) {
        const tx = x + sx * (w / 2 + towerW / 2);
        const towerH = h + 3.2 + variation * .3;
        volume(tx, z, towerW, baseD, towerH);
        trim('blue', towerH - .4, towerW + .2, baseD + .2, tx, z, .16);
        for (const sz of [-1, 1]) batch('metal', tx, towerH / 2, z + sz * (baseD / 2 + .05), .24, towerH, .2);
      }
      // Broad horizontal connector bands join the taller flanking towers.
      for (const level of [.36, .72]) batch('metal', x, h * level, z + d / 2 + .12, baseW, .8, .25);
      trim('blue', h - .5, w, d, x, z, .13);
    } else {
      volume(x, z, baseW, baseD, h * .24);
      volume(x, z, w, d, h);
      const wing = (baseW - w) / 2;
      if (wing > .3) volume(x + side * (w / 2 + wing / 2), z, wing, baseD, h * .73);
      const rearDepth = (baseD - d) / 2;
      if (rearDepth > .3) volume(x, z - side * (d / 2 + rearDepth / 2), baseW, rearDepth, h * .49);
      for (const [height, width, depth] of [[h * .24, baseW, baseD], [h * .73, w + wing, d], [h, w, d]]) {
        trim('concrete', height - .15, width + .35, depth + .35, x, z, .4);
      }
      for (let fin = -2; fin <= 2; fin++) batch('metal', x + fin * w / 5, h * .7, z - d / 2 - .07, .3, h * .5, .25);
    }
    const data = { x, z, w, d, h, baseW, baseD, architecture: architectureNames[style] };
    buildings.push(data);
    rooftops.push(data);
    anchors.push({ x, y: h + 2.4, z });
    buildingStyles.push({
      x, z, architecture: architectureNames[style], variation, orientation: side,
      tint: tint.getHexString(), windowOffset: shift, solidVolumes: volumes.length,
      // Includes observable shape and facade variation, not just an address ID.
      fingerprint: [architectureNames[style], variation, side, tint.getHexString(), baseW.toFixed(3), baseD.toFixed(3), w.toFixed(3), d.toFixed(3), h.toFixed(3), shift.toFixed(3)].join(':'),
    });
    // Parapets leave the playable roof open and define its silhouette.
    batch('concrete', x, h + .35, z - d / 2, w + .7, .7, .6);
    batch('concrete', x, h + .35, z + d / 2, w + .7, .7, .6);
    batch('concrete', x - w / 2, h + .35, z, .6, .7, d);
    batch('concrete', x + w / 2, h + .35, z, .6, .7, d);
    batch('concrete', x, .14, z, baseW + 5, .25, baseD + 5);
    // HVAC, water tanks and antennas are deliberately kept near roof edges.
    if (index % 2 === 0) {
      const ventX = x - w / 2 + 1.05, ventZ = z + d / 2 - 1.05;
      batch('metal', ventX, h + .8, ventZ, 1.7, 1.6, 1.7);
      for (let v = 0; v < 3; v++) batch('concrete', ventX, h + 1.63, ventZ - .5 + v * .5, 1.45, .1, .15);
    }
    if (index % 4 === 0) {
      const mastX = x + w / 2 - .75, mastZ = z - d / 2 + .75;
      batch('metal', mastX, h + 3, mastZ, .13, 6, .13);
      batch('lamps', mastX, h + 6.1, mastZ, .3, .25, .3);
      batch('metal', mastX, h + 4.8, mastZ, 1.4, .09, .09);
    }
    return data;
  }

  let index = 0;
  for (let row = -3; row <= 3; row++) {
    for (let col = -3; col <= 3; col++) {
      let h = 17 + random() * 43;
      let w = 30 + random() * 11;
      let d = 29 + random() * 12;
      const x = col * 56;
      const z = row * 56;
      if (col === 0 && row === 2) { h = 29; w = 40; d = 40; }
      if (col === 1 && row === 1) { h = 35; w = 39; d = 39; }
      if (col === -2 && row === -1) { h = 47; w = 39; d = 39; }
      if (col === 1 && row === -2) { h = 52; w = 40; d = 40; }
      if (col === 0 && row === -3) h = 76;
      const data = building(x, z, w, d, h, index++);
      if (col === 0 && row === -3) {
        // Wayne tower's crown: a stepped silhouette with a narrow golden spire.
        batch('metal', x, h + 2.5, z, w * .72, 5, d * .72);
        batch('concrete', x, h + 6.5, z, w * .5, 3, d * .5);
        batch('gold', x, h + 16, z, .55, 18, .55);
        billboard('NAMI', '#d7b77a', x, h - 5.5, z + d / 2 + .12, 19, 4.6);
      }
      if (index === 30) billboard('GOTHAM GAZETTE', '#80c5c9', x, h - 6, z + data.d / 2 + .12, data.w * .9, 4);
      if (index === 19) billboard('MONARCH', '#d3a76a', x, h - 5, z + data.d / 2 + .12, data.w * .8, 5);
      if (index === 10) billboard('ACE CHEMICALS', '#76bfa6', x, h - 5, z + data.d / 2 + .12, data.w * .9, 4);
    }
  }

  buildingBatches.forEach((attributes, i) => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(attributes.position, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(attributes.normal, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(attributes.uv, 2));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(attributes.color, 3));
    geometry.computeBoundingSphere();
    const mesh = new THREE.Mesh(geometry, i === roofBatch ? roofMaterial : facades[i]);
    mesh.name = i === roofBatch ? 'Building roofs and setbacks' : `Building facades: ${architectureNames[i]}`;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  });

  // Road markings, warm street lamps and tiny parked cars.
  for (let line = -4; line <= 3; line++) {
    const coord = line * 56 + 28;
    for (let k = -24; k <= 24; k++) {
      batch('road', coord, .045, k * 8, .12, .025, 3);
      batch('road', k * 8, .045, coord, 3, .025, .12);
    }
    for (let k = -3; k <= 3; k++) {
      const z = k * 56 + 18;
      batch('metal', coord - 9.5, 3.4, z, .16, 6.8, .16);
      batch('metal', coord - 8.5, 6.6, z, 2, .16, .16);
      batch('lamps', coord - 7.5, 6.5, z, 1.1, .16, .48);
      batch('gold', coord - 7.5, .09, z, 2.5, .035, 5);
      if (random() > .38) {
        const carZ = k * 56 + random() * 25;
        batch('metal', coord + 5.5, .7, carZ, 2, 1.4, 4.2);
        batch('concrete', coord + 5.5, 1.6, carZ - .2, 1.7, .65, 2);
        batch('lamps', coord + 4.85, .65, carZ - 2.15, .35, .2, .08);
        batch('lamps', coord + 6.15, .65, carZ - 2.15, .35, .2, .08);
      }
    }
  }

  // A distant, dark skyline surrounds the playable blocks.
  const skylineMat = new THREE.MeshStandardMaterial({ color: 0x13232d, roughness: 1 });
  const skylineBoxes = [];
  for (let side = 0; side < 4; side++) {
    for (let k = -6; k <= 6; k++) {
      const h = 25 + random() * 65;
      skylineBoxes.push({ x: side < 2 ? k * 45 : (side === 2 ? -285 : 285), y: h / 2 - 5, z: side < 2 ? (side === 0 ? -285 : 285) : k * 45, w: 25 + random() * 18, h, d: 25 + random() * 20, ry: 0 });
    }
  }
  // The distant suspension bridge sits beyond the playable boundary. Its deck,
  // towers and lights join the existing batches rather than adding draw calls.
  batch('metal', 0, 19, -250, 455, 2, 10);
  for (const x of [-155, 155]) {
    for (const z of [-255, -245]) batch('concrete', x, 45, z, 4.5, 90, 4.5);
    batch('metal', x, 76, -250, 6.5, 2.5, 16);
    batch('metal', x, 49, -250, 6.5, 2, 16);
    batch('lamps', x, 91, -250, 1.1, .6, 1.1);
  }
  for (let x = -220; x <= 220; x += 11) batch('gold', x, 20.3, -244.8, 1.1, .18, .18);
  const cableVertices = [];
  const cableHeight = x => 27 + Math.pow(Math.abs(x) / 155, 2) * 58;
  for (const z of [-255,-245]) {
    for (let x = -155; x < 155; x += 5) cableVertices.push(x,cableHeight(x),z,x+5,cableHeight(x+5),z);
    for (let x = -150; x <= 150; x += 15) cableVertices.push(x,20,z,x,cableHeight(x),z);
    for (const side of [-1,1]) cableVertices.push(side*155,85,z,side*225,20,z);
  }
  const bridgeCables = new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(cableVertices,3)),new THREE.LineBasicMaterial({color:0x506b73}));
  bridgeCables.name = 'Distant bridge cables';
  ambientDetails.add(bridgeCables);
  // Art Deco neon ribs provide silhouettes in the otherwise dark streets.
  buildings.forEach((b,i) => {
    if(i % 5 !== 0) return;
    for (const side of [-1,1]) batch('blue',b.x+side*(b.w/2-.55),b.h*.57,b.z+b.d/2+.12,.13,b.h*.73,.13);
    batch('gold',b.x,b.h*.19,b.z+b.d/2+.14,b.w*.68,.12,.15);
  });
  function instance(items, material) {
    const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), material, items.length);
    const matrix = new THREE.Matrix4();
    const quaternion = new THREE.Quaternion();
    const axis = new THREE.Vector3(0, 1, 0);
    const position = new THREE.Vector3();
    const scale = new THREE.Vector3();
    items.forEach((item, i) => {
      position.set(item.x, item.y, item.z);
      scale.set(item.w, item.h, item.d);
      quaternion.setFromAxisAngle(axis, item.ry);
      matrix.compose(position, quaternion, scale);
      mesh.setMatrixAt(i, matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  }
  for (const [key, values] of Object.entries(boxes)) instance(values, materials[key]);
  instance(skylineBoxes, skylineMat);

  const glowCanvas = document.createElement('canvas');
  glowCanvas.width = glowCanvas.height = 128;
  const glowContext = glowCanvas.getContext('2d');
  const roadGlow = glowContext.createRadialGradient(64,64,0,64,64,64);
  roadGlow.addColorStop(0,'rgba(255,255,255,.8)');
  roadGlow.addColorStop(.2,'rgba(255,255,255,.35)');
  roadGlow.addColorStop(.6,'rgba(255,255,255,.09)');
  roadGlow.addColorStop(1,'rgba(255,255,255,0)');
  glowContext.fillStyle = roadGlow;
  glowContext.fillRect(0,0,128,128);
  const glowTexture = new THREE.CanvasTexture(glowCanvas);
  function surfaceInstances(items, material, name) {
    const mesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(1,1), material, items.length);
    mesh.name = name;
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    items.forEach((item,i) => {
      dummy.position.set(item.x,item.y,item.z);
      dummy.rotation.set(-Math.PI/2,0,item.angle||0);
      dummy.scale.set(item.w,item.d,1);
      dummy.updateMatrix();
      mesh.setMatrixAt(i,dummy.matrix);
      mesh.setColorAt(i,color.setHex(item.color));
    });
    mesh.instanceMatrix.needsUpdate = true;
    ambientDetails.add(mesh);
    return mesh;
  }
  const pools = [], puddles = [], reflections = [];
  for (let line=-4; line<=3; line++) {
    const road = line*56+28;
    for (let k=-3; k<=3; k++) {
      pools.push({x:road-7.5,y:.11,z:k*56+18,w:12,d:19,color:0xe3ac68});
      const cyan = (line+k)%3 === 0;
      reflections.push({x:road-5.5+detailRandom()*3,y:.12,z:k*56+13,w:1.1+detailRandom()*2,d:15+detailRandom()*14,color:cyan?0x55c2d3:0xf3c287});
      for (let p=0;p<2;p++) puddles.push({x:road-7+detailRandom()*14,y:.06,z:k*56+detailRandom()*39-18,w:2+detailRandom()*5,d:4+detailRandom()*10,angle:detailRandom()*.6-.3,color:0x1f3a46});
    }
  }
  for (const b of buildings) {
    puddles.push({x:b.x-b.w*.18,y:b.h+.025,z:b.z+b.d*.22,w:b.w*.28,d:b.d*.18,angle:detailRandom()*.7,color:0x31444d});
  }
  surfaceInstances(puddles,new THREE.MeshStandardMaterial({map:glowTexture,transparent:true,opacity:.5,roughness:.08,metalness:.8,depthWrite:false}),'Wet street and roof puddles');
  surfaceInstances(pools,new THREE.MeshBasicMaterial({map:glowTexture,transparent:true,opacity:.24,blending:THREE.AdditiveBlending,depthWrite:false}),'Street lamp light pools');
  surfaceInstances(reflections,new THREE.MeshBasicMaterial({map:glowTexture,transparent:true,opacity:.2,blending:THREE.AdditiveBlending,depthWrite:false}),'Wet road light reflections');

  // Soft procedural cloud cards. Only a few transparent surfaces are needed.
  const cloudCanvas = document.createElement('canvas');
  cloudCanvas.width = 512; cloudCanvas.height = 256;
  const cloudContext = cloudCanvas.getContext('2d');
  for(let i=0;i<42;i++) {
    const x=detailRandom()*512,y=80+detailRandom()*105,r=35+detailRandom()*85;
    const gradient=cloudContext.createRadialGradient(x,y,0,x,y,r);
    gradient.addColorStop(0,'rgba(173,202,208,.22)');
    gradient.addColorStop(.55,'rgba(139,170,183,.1)');
    gradient.addColorStop(1,'rgba(125,161,180,0)');
    cloudContext.fillStyle=gradient;
    cloudContext.fillRect(x-r,y-r,r*2,r*2);
  }
  // Gradients may overlap the canvas boundary. Fade all four texture edges to
  // zero alpha so a bright horizon never reveals the rectangular cloud cards.
  cloudContext.globalCompositeOperation='destination-in';
  const horizontalFade=cloudContext.createLinearGradient(0,0,512,0);
  horizontalFade.addColorStop(0,'rgba(255,255,255,0)');
  horizontalFade.addColorStop(.15,'rgba(255,255,255,1)');
  horizontalFade.addColorStop(.85,'rgba(255,255,255,1)');
  horizontalFade.addColorStop(1,'rgba(255,255,255,0)');
  cloudContext.fillStyle=horizontalFade;
  cloudContext.fillRect(0,0,512,256);
  const verticalFade=cloudContext.createLinearGradient(0,0,0,256);
  verticalFade.addColorStop(0,'rgba(255,255,255,0)');
  verticalFade.addColorStop(.2,'rgba(255,255,255,1)');
  verticalFade.addColorStop(.8,'rgba(255,255,255,1)');
  verticalFade.addColorStop(1,'rgba(255,255,255,0)');
  cloudContext.fillStyle=verticalFade;
  cloudContext.fillRect(0,0,512,256);
  cloudContext.globalCompositeOperation='source-over';
  const cloudTexture=new THREE.CanvasTexture(cloudCanvas);
  const cloudMaterial=new THREE.MeshBasicMaterial({map:cloudTexture,color:0x8db0bd,transparent:true,opacity:.38,depthWrite:false,side:THREE.DoubleSide,fog:false});
  const cloudLayers=[];
  for(let i=0;i<4;i++) {
    const cloud=new THREE.Mesh(new THREE.PlaneGeometry(i<2?500:370,i<2?90:185),cloudMaterial);
    cloud.position.set(i%2 ? 70 : -60,103+i*13,-230-i*22);
    cloud.rotation.z=i%2?.06:-.035;
    cloud.name=`Atmospheric cloud layer ${i+1}`;
    (i<2?ambientDetails:highDetails).add(cloud);
    cloudLayers.push({mesh:cloud,x:cloud.position.x});
  }

  const signalCanvas=document.createElement('canvas');
  signalCanvas.width=signalCanvas.height=256;
  const signalContext=signalCanvas.getContext('2d');
  const signalGlow=signalContext.createRadialGradient(128,128,20,128,128,126);
  signalGlow.addColorStop(0,'rgba(255,233,169,.42)');
  signalGlow.addColorStop(.65,'rgba(232,218,177,.3)');
  signalGlow.addColorStop(.82,'rgba(224,216,186,.13)');
  signalGlow.addColorStop(1,'rgba(221,220,193,0)');
  signalContext.fillStyle=signalGlow;
  signalContext.fillRect(0,0,256,256);
  signalContext.fillStyle='rgba(12,25,32,.87)';
  signalContext.beginPath();
  // A curling wave replaces the old bat-shaped projection.
  [[-.66,.18],[-.51,-.05],[-.3,-.24],[-.07,-.35],[.17,-.34],[.37,-.22],[.45,-.04],[.41,.12],[.29,.2],[.16,.18],[.09,.08],[.12,-.02],[.2,-.05],[.29,-.01],[.23,-.13],[.1,-.17],[-.04,-.12],[-.16,.01],[-.26,.18],[-.41,.29],[-.59,.3],[.66,.3],[.66,.4],[-.66,.4]].forEach(([x,y],i)=>{
    if(i===0) signalContext.moveTo(128+x*128,128+y*128);
    else signalContext.lineTo(128+x*128,128+y*128);
  });
  signalContext.closePath(); signalContext.fill();
  const batSignal = new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(signalCanvas),transparent:true,opacity:.8,depthWrite:false,fog:false}));
  batSignal.name='Sinal das ondas nas nuvens';
  batSignal.position.set(98,124,-224);
  batSignal.scale.set(56,48,1);
  batSignal.visible=false;ambientDetails.add(batSignal);
  const signalBase=new THREE.Vector3(112,44,-168);
  const signalDirection=batSignal.position.clone().sub(signalBase);
  const signalBeam=new THREE.Mesh(new THREE.CylinderGeometry(22,.22,signalDirection.length(),20,1,true),new THREE.MeshBasicMaterial({color:0xe4dcb6,transparent:true,opacity:.024,side:THREE.DoubleSide,depthWrite:false,blending:THREE.AdditiveBlending}));
  signalBeam.position.copy(signalBase).addScaledVector(signalDirection,.5);
  signalBeam.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),signalDirection.normalize());
  highDetails.add(signalBeam);

  // Traffic is decorative and lives on the road grid. It is updated only on
  // high quality; there are no physics objects, extra point lights or passes.
  let trafficEnabled=true;
  const traffic=[];
  for(let i=0;i<36;i++) traffic.push({road:(i%7-3)*56+28,lane:i%2?3.8:-3.8,phase:detailRandom()*448,speed:7+detailRandom()*8,direction:i%2?1:-1});
  const trafficBody=new THREE.InstancedMesh(new THREE.BoxGeometry(1.8,.8,3.8),new THREE.MeshStandardMaterial({color:0x253842,metalness:.65,roughness:.4}),traffic.length);
  const trafficFront=new THREE.InstancedMesh(new THREE.BoxGeometry(1.3,.13,.1),new THREE.MeshBasicMaterial({color:0xffdb9d}),traffic.length);
  const trafficBack=new THREE.InstancedMesh(new THREE.BoxGeometry(1.2,.12,.1),new THREE.MeshBasicMaterial({color:0xbc4945}),traffic.length);
  const trafficMeshes=[trafficBody,trafficFront,trafficBack];
  for(const mesh of trafficMeshes) {
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.frustumCulled=false;
    highDetails.add(mesh);
  }
  const trafficDummy=new THREE.Object3D();
  function updateTraffic(time) {
    traffic.forEach((car,i)=>{
      const z=((car.phase+time*car.speed*car.direction+100000)%448)-224;
      trafficDummy.rotation.set(0,car.direction>0?0:Math.PI,0);
      for(let part=0;part<3;part++) {
        trafficDummy.position.set(car.road+car.lane,part===0?.78:.88,z+(part===1?2:part===2?-2:0)*car.direction);
        trafficDummy.updateMatrix();
        trafficMeshes[part].setMatrixAt(i,trafficDummy.matrix);
      }
    });
    for(const mesh of trafficMeshes) mesh.instanceMatrix.needsUpdate=true;
  }
  updateTraffic(0);

  const spawn = { x: 0, y: 29, z: 112 };
  const missionSites = [
    { x: 56, y: 35, z: 56, name: 'Distrito financeiro' },
    { x: -112, y: 47, z: -56, name: 'Old Gotham' },
    { x: 56, y: 52, z: -112, name: 'Torre de transmissão' },
  ];

  // Large moon and a soft halo make the city readable without external assets.
  const moon = new THREE.Mesh(new THREE.SphereGeometry(12, 28, 20), new THREE.MeshBasicMaterial({ color: 0xbbcdd0, fog: false }));
  moon.name = 'Moon';
  moon.position.set(-143, 148, -280);
  moon.visible=false;group.add(moon);
  const haloCanvas = document.createElement('canvas');
  haloCanvas.width = haloCanvas.height = 128;
  const haloCtx = haloCanvas.getContext('2d');
  const gradient = haloCtx.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, 'rgba(185, 211, 218, .24)');
  gradient.addColorStop(.35, 'rgba(154, 187, 204, .14)');
  gradient.addColorStop(1, 'rgba(132, 166, 187, 0)');
  haloCtx.fillStyle = gradient;
  haloCtx.fillRect(0, 0, 128, 128);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(haloCanvas), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  halo.name = 'Moon halo';
  halo.position.copy(moon.position);
  halo.scale.set(85, 85, 1);
  halo.visible=false;group.add(halo);

  // Searchlights sweep above Gotham's buildings.
  const beams = [];
  const beamMaterial = new THREE.MeshBasicMaterial({ color: 0x93b8c7, transparent: true, opacity: .035, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending });
  for (const [x, z] of [[-190, -130], [145, -170]]) {
    const beam = new THREE.Mesh(new THREE.ConeGeometry(14, 130, 24, 1, true), beamMaterial);
    const pivot = new THREE.Group();
    pivot.position.set(x, 5, z);
    beam.rotation.z = Math.PI;
    beam.position.y = 65;
    pivot.add(beam);
    group.add(pivot);
    beams.push(pivot);
  }
  function setQuality(level = 'medium') {
    quality = ['low','medium','high'].includes(level) ? level : 'medium';
    ambientDetails.visible = quality !== 'low';
    highDetails.visible = quality === 'high';
    group.userData.quality = quality;
    return quality;
  }
  setQuality();
  return {
    buildings, rooftops, collisionBuildings, buildingStyles, anchors, missionSites, spawn, group, setQuality,
    setTrafficEnabled(enabled=true) {
      trafficEnabled=!!enabled;
      for(const mesh of trafficMeshes)mesh.visible=trafficEnabled;
    },
    update(time) {
      beams.forEach((beam, i) => {
        beam.rotation.z = Math.sin(time * .13 + i * 2) * .34;
        beam.rotation.x = .18 + Math.cos(time * .1 + i) * .2;
      });
      if (quality !== 'low') {
        cloudLayers.forEach(({mesh,x},i) => {
          if (i<2 || quality==='high') mesh.position.x=x+Math.sin(time*.018+i)*18;
        });
        batSignal.material.opacity=.74+Math.sin(time*.3)*.06;
      }
      if (quality==='high'&&trafficEnabled) updateTraffic(time);
    },
  };
}

// Merge rigid pieces only within their existing animation pivots. Limbs and
// armor groups remain separate, so their transforms and visibility still work.
function batchRigidParts(THREE, parent, excluded = new Set()) {
  const byMaterial = new Map();
  for (const child of [...parent.children]) {
    if (child.isGroup) batchRigidParts(THREE, child, excluded);
    if (!child.isMesh || child.isInstancedMesh || excluded.has(child) ||
        Array.isArray(child.material) || child.geometry.morphAttributes.position) continue;
    const pieces = byMaterial.get(child.material) || [];
    pieces.push(child);
    byMaterial.set(child.material, pieces);
  }
  for (const [material, pieces] of byMaterial) {
    if (pieces.length < 2) continue;
    const copies = pieces.map(piece => {
      piece.updateMatrix();
      const geometry = piece.geometry.index ? piece.geometry.toNonIndexed() : piece.geometry.clone();
      geometry.applyMatrix4(piece.matrix);
      geometry.clearGroups();
      return geometry;
    });
    const geometry = mergeGeometries(copies, false);
    for (const copy of copies) copy.dispose();
    if (!geometry) continue;
    geometry.computeBoundingSphere();
    const merged = new THREE.Mesh(geometry, material);
    merged.name = 'Batched rigid character parts';
    merged.userData.parts = pieces.map(piece => piece.name).filter(Boolean);
    merged.castShadow = pieces.some(piece => piece.castShadow);
    merged.receiveShadow = pieces.some(piece => piece.receiveShadow);
    merged.matrixAutoUpdate = false;
    for (const piece of pieces) parent.remove(piece);
    parent.add(merged);
  }
}

function visibleMeshCount(model) {
  let count=0;
  model.traverseVisible(part=>{if(part.isMesh)count++;});
  return count;
}

function batShape(THREE) {
  const shape = new THREE.Shape();
  const points = [[0,-.17],[-.11,-.065],[-.22,-.11],[-.27,.005],[-.43,-.04],[-.4,.14],[-.3,.08],[-.17,.04],[-.075,.1],[-.06,.2],[0,.13],[.06,.2],[.075,.1],[.17,.04],[.3,.08],[.4,.14],[.43,-.04],[.27,.005],[.22,-.11],[.11,-.065]];
  points.forEach(([x,y], i) => i ? shape.lineTo(x,y) : shape.moveTo(x,y));
  shape.closePath();
  return new THREE.ShapeGeometry(shape);
}

export function createBatman(THREE) {
  const hero = new THREE.Group();
  hero.name = 'Batman';
  const suit = new THREE.MeshStandardMaterial({ color: 0x34414b, roughness: .55, metalness: .5 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x0b121c, roughness: .6, metalness: .3 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xc59c50, roughness: .4, metalness: .75 });
  const skin = new THREE.MeshStandardMaterial({ color: 0xbc9679, roughness: .8 });
  const eye = new THREE.MeshBasicMaterial({ color: 0xe1f3f5 });
  const accent = new THREE.MeshStandardMaterial({ color: 0xc59c50, emissive: 0xc59c50, emissiveIntensity: .28, roughness: .4, metalness: .65 });
  const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
  const sphereGeometry = new THREE.SphereGeometry(1, 10, 8);
  function box(parent, material, w,h,d,x,y,z) {
    const mesh = new THREE.Mesh(boxGeometry, material);
    mesh.position.set(x,y,z);
    mesh.scale.set(w,h,d);
    mesh.castShadow = true;
    parent.add(mesh);
    return mesh;
  }
  function sphere(parent, material, radius, x,y,z, sx=1,sy=1,sz=1) {
    const mesh = new THREE.Mesh(sphereGeometry, material);
    mesh.position.set(x,y,z);
    mesh.scale.set(radius*sx,radius*sy,radius*sz);
    mesh.castShadow = true;
    parent.add(mesh);
    return mesh;
  }
  sphere(hero, suit, .48, 0, 1.61, 0, 1.02,1.2,.58).name = 'Batsuit chest';
  box(hero, dark, .55,.38,.37, 0,1.12,0);
  box(hero, gold, .69,.11,.43, 0,1.17,.01);
  box(hero, gold, .16,.16,.1, 0,1.18,.26);
  for (const x of [-.25,.25]) box(hero, gold, .12,.16,.12, x,1.17,.24);
  const emblem = new THREE.Mesh(batShape(THREE), gold);
  emblem.position.set(0,1.72,.278);
  emblem.scale.set(.75,.75,.75);
  hero.add(emblem);
  box(hero, dark, .36,.17,.32, 0,2.08,0);
  sphere(hero, dark, .29, 0,2.32,0, .9,1.05,.8);
  box(hero, skin, .29,.17,.12, 0,2.2,.195);
  box(hero, dark, .34,.08,.08, 0,2.31,.235);
  for (const side of [-1,1]) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(.095,.37,4), dark);
    ear.position.set(side*.19,2.65,-.025);
    ear.rotation.z = -side*.12;
    hero.add(ear);
    const slit = box(hero, eye, .115,.025,.02, side*.115,2.37,.226);
    slit.rotation.z = side*.14;
  }
  const arms = [];
  const legs = [];
  for (const side of [-1,1]) {
    const arm = new THREE.Group();
    arm.position.set(side*.5,1.91,0);
    sphere(arm, dark, .23, 0,0,0,1, .8,1);
    box(arm, suit, .23,.43,.25, 0,-.29,0);
    box(arm, dark, .26,.38,.29, 0,-.64,.015);
    sphere(arm, dark, .15, 0,-.87,.03);
    for (let j=0;j<3;j++) {
      const fin = new THREE.Mesh(new THREE.ConeGeometry(.09,.16,3), dark);
      fin.position.set(side*.18,-.5-j*.12,-.06);
      fin.rotation.z = -side*Math.PI/2;
      arm.add(fin);
    }
    hero.add(arm);
    arms.push(arm);
    const leg = new THREE.Group();
    leg.position.set(side*.22,1.02,0);
    box(leg, suit, .28,.49,.29, 0,-.24,0);
    sphere(leg, dark, .17, 0,-.48,.05,1,.75,.8);
    box(leg, dark, .3,.42,.33, 0,-.73,0);
    box(leg, dark, .32,.15,.47, 0,-.95,.07);
    hero.add(leg);
    legs.push(leg);
  }
  // A cloth strip grid is reshaped for walking, falling and gliding.
  const cols = 18;
  const rows = 9;
  const positions = [];
  const indices = [];
  for (let row=0;row<=rows;row++) {
    for (let col=0;col<=cols;col++) positions.push(0,0,0);
  }
  for (let row=0;row<rows;row++) for (let col=0;col<cols;col++) {
    const a=row*(cols+1)+col, b=a+cols+1;
    indices.push(a,b,a+1,b,b+1,a+1);
  }
  const capeGeometry = new THREE.BufferGeometry();
  capeGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions,3));
  capeGeometry.attributes.position.setUsage(THREE.DynamicDrawUsage);
  capeGeometry.setIndex(indices);
  const capeMaterial = new THREE.MeshStandardMaterial({ color: 0x080e18, roughness: .75, metalness: .16, side: THREE.DoubleSide });
  const cape = new THREE.Mesh(capeGeometry, capeMaterial);
  cape.name = 'Cape';
  cape.castShadow = true;
  // Cloth changes its bounds when opening; the hero stays close to the camera.
  cape.frustumCulled = false;
  hero.add(cape);

  // Construct accessories once. Switching armor only changes colors and group
  // visibility, so the arm and cape animations keep their existing pivots.
  const armorGroups = Object.fromEntries(['vigilante','tactical','rescue','detective','armored'].map(id => [id, []]));
  function armorGroup(id, parent = hero, suffix = '') {
    const group = new THREE.Group();
    group.name = `Armor ${id}${suffix ? ` ${suffix}` : ''}`;
    group.userData.armorId = id;
    parent.add(group);
    armorGroups[id].push(group);
    return group;
  }
  armorGroup('vigilante');
  const tactical = armorGroup('tactical');
  box(tactical, dark, .48,.55,.22, 0,1.66,-.4);
  box(tactical, accent, .32,.07,.025, 0,1.8,-.525);
  const rescue = armorGroup('rescue');
  box(rescue, suit, .57,.67,.3, 0,1.61,-.43);
  box(rescue, accent, .13,.38,.025, 0,1.62,-.594);
  box(rescue, accent, .36,.12,.025, 0,1.62,-.595);
  const detective = armorGroup('detective');
  box(detective, eye, .4,.065,.045, 0,2.37,.25).name = 'Detective visor';
  box(detective, dark, .59,.12,.47, 0,2.01,-.02);
  box(detective, accent, .32,.055,.035, 0,1.36,.285);
  const armored = armorGroup('armored');
  for (const side of [-1,1]) {
    box(armored, suit, .35,.44,.18, side*.19,1.7,.225);
    box(armored, accent, .24,.045,.03, side*.2,1.91,.33);
  }
  box(armored, dark, .49,.15,.14, 0,1.36,.26);
  for (const [i, arm] of arms.entries()) {
    const side = i ? 1 : -1;
    const tacticalArm = armorGroup('tactical', arm, `arm ${i}`);
    box(tacticalArm, suit, .35,.18,.4, side*.02,.035,0);
    box(tacticalArm, accent, .23,.035,.025, side*.02,.075,.215);
    const rescueArm = armorGroup('rescue', arm, `arm ${i}`);
    box(rescueArm, suit, .34,.2,.39, side*.02,.015,0);
    box(rescueArm, accent, .28,.12,.32, 0,-.53,.015);
    const detectiveArm = armorGroup('detective', arm, `arm ${i}`);
    box(detectiveArm, accent, .26,.06,.33, 0,-.56,.025);
    const armoredArm = armorGroup('armored', arm, `arm ${i}`);
    box(armoredArm, suit, .48,.27,.47, side*.035,.035,0);
    box(armoredArm, dark, .32,.35,.38, 0,-.63,.015);
    box(armoredArm, accent, .22,.055,.025, 0,-.6,.22);
  }
  const armorPalettes = {
    vigilante: { suit:0x34414b, dark:0x0b121c, gold:0xc59c50, eye:0xe1f3f5, cape:0x080e18, accent:0xc59c50 },
    tactical: { suit:0x142b42, dark:0x080f1c, gold:0x5bc6d8, eye:0xa3efff, cape:0x071323, accent:0x4fc9e1 },
    rescue: { suit:0xc3ccd0, dark:0x3b4b56, gold:0xe79a42, eye:0xffdca0, cape:0x667982, accent:0xf49b40 },
    detective: { suit:0x44334f, dark:0x110f1b, gold:0x4bbbad, eye:0x9effef, cape:0x171020, accent:0x43d1c0 },
    armored: { suit:0x59636b, dark:0x171e28, gold:0xd6ab57, eye:0xff8570, cape:0x101822, accent:0xd14f48 },
  };
  hero.userData.setArmor = (armorId = 'vigilante') => {
    const id = Object.hasOwn(armorPalettes, armorId) ? armorId : 'vigilante';
    const palette = armorPalettes[id];
    suit.color.setHex(palette.suit);
    dark.color.setHex(palette.dark);
    gold.color.setHex(palette.gold);
    eye.color.setHex(palette.eye);
    capeMaterial.color.setHex(palette.cape);
    accent.color.setHex(palette.accent);
    accent.emissive.setHex(palette.accent);
    suit.metalness = id === 'armored' ? .8 : .5;
    suit.roughness = id === 'rescue' ? .67 : .55;
    for (const [preset, groups] of Object.entries(armorGroups)) {
      for (const group of groups) group.visible = preset === id;
    }
    emblem.position.z = id === 'armored' ? .335 : .278;
    hero.userData.armorId = id;
    return id;
  };
  hero.userData.setArmor();
  const pose = new THREE.Group();
  pose.name = 'Batman pose';
  for (const part of [...hero.children]) pose.add(part);
  hero.add(pose);
  const beforeBatch=visibleMeshCount(hero);
  batchRigidParts(THREE,pose,new Set([emblem,cape]));
  hero.userData.renderStats={beforeMeshes:beforeBatch,afterMeshes:visibleMeshCount(hero)};
  const capeCoordinates=[];
  for(let row=0;row<=rows;row++)for(let col=0;col<=cols;col++) {
    const u=col/cols*2-1,v=row/rows;
    capeCoordinates.push({u,v,scallop:row===rows?Math.abs(Math.sin((u+1)*Math.PI*3)):0,wavePhase:u*7+v*5});
  }
  hero.userData.update = ({ time=0, moving=false, gliding=false, attacking=false, grappling=false, defending=false, finisher=false, attackType=null, attackPhase=0 }={}) => {
    const phase = Number.isFinite(attackPhase) ? THREE.MathUtils.clamp(attackPhase,0,1) : 0;
    const strike = Math.sin(phase*Math.PI);
    pose.position.y=0;
    pose.rotation.set(0,0,0);
    for (const limb of arms) {
      limb.rotation.y=0;
      limb.rotation.z=0;
    }
    for (const limb of legs) {
      limb.rotation.y=0;
      limb.rotation.z=0;
    }
    const stride = moving ? Math.sin(time*12)*.65 : Math.sin(time*1.8)*.025;
    legs[0].rotation.x = stride;
    legs[1].rotation.x = -stride;
    arms[0].rotation.x = gliding ? -.2 : attacking ? -1.65 : -stride*.7;
    arms[1].rotation.x = gliding ? -.2 : grappling ? -2.6 : stride*.7;
    arms[0].rotation.z = gliding ? -1.15 : .12;
    arms[1].rotation.z = gliding ? 1.15 : -.12;
    let capeFlare=0;
    if (!gliding && !grappling && (defending || attackType==='parry')) {
      arms[0].rotation.x=-1.45;
      arms[1].rotation.x=-1.45;
      arms[0].rotation.y=-.55;
      arms[1].rotation.y=.55;
      pose.rotation.x=.08;
      pose.position.y=-.08;
      capeFlare=.15;
    } else if (!gliding && !grappling && (finisher || attackType==='finisher')) {
      arms[0].rotation.x=-1.95*strike;
      arms[1].rotation.x=-1.4*strike;
      legs[1].rotation.x=-1.5*strike;
      pose.rotation.y=Math.sin(phase*Math.PI*2)*.75;
      pose.position.y=-.12*strike;
      capeFlare=strike*.8;
    } else if (!gliding && !grappling && attackType==='punch') {
      arms[0].rotation.x=-1.85*strike;
      arms[0].rotation.y=-.3*strike;
      arms[1].rotation.x=-.45*strike;
      pose.rotation.y=.25*strike;
      capeFlare=strike*.2;
    } else if (!gliding && !grappling && attackType==='heavy') {
      // Cross-body kick: the right leg extends ahead while the arms balance it.
      legs[1].rotation.x=-1.85*strike;
      legs[1].rotation.z=.3*strike;
      legs[0].rotation.x=.18*strike;
      arms[0].rotation.x=-1.15*strike;
      arms[1].rotation.x=.65*strike;
      pose.rotation.y=-.4*strike;
      pose.rotation.x=-.1*strike;
      capeFlare=strike*.55;
    } else if (!grappling && attackType==='slam') {
      const impact=Math.sin(Math.PI*Math.max(0,(phase-.3)/.7));
      const swing=phase<.42 ? -2.2-phase/.42*.65 : THREE.MathUtils.lerp(-2.85,.35,(phase-.42)/.58);
      arms[0].rotation.x=swing;
      arms[1].rotation.x=swing;
      arms[0].rotation.z=.25+strike*.25;
      arms[1].rotation.z=-.25-strike*.25;
      legs[0].rotation.x=.36*impact;
      legs[1].rotation.x=-.25*impact;
      pose.position.y=-.32*impact;
      pose.rotation.x=.2*impact;
      capeFlare=strike;
    }
    const attribute = capeGeometry.attributes.position;
    for(let i=0;i<capeCoordinates.length;i++) {
        const {u,v,scallop,wavePhase}=capeCoordinates[i];
        const width=gliding ? .45+v*2.15 : .43+v*(.45+capeFlare*.8);
        const x=u*width;
        const y=gliding ? 1.96-v*.65-scallop*.2 : 1.97-v*1.85+scallop*.16;
        const z=-.28-v*(gliding?1.15:(moving?.58:.14)+capeFlare*.55)+Math.sin(time*5+wavePhase)*v*.075;
        attribute.setXYZ(i,x,y,z);
    }
    attribute.needsUpdate=true;
    capeGeometry.computeVertexNormals();
  };
  hero.userData.update();
  return hero;
}

export function createEnemy(THREE) {
  const enemy = new THREE.Group();
  enemy.name = 'Miliciano';
  const coat = new THREE.MeshStandardMaterial({color:0x762e30,roughness:.85});
  const dark = new THREE.MeshStandardMaterial({color:0x17202a,roughness:.7});
  const skin = new THREE.MeshStandardMaterial({color:0xb28a6c,roughness:.85});
  function add(material,w,h,d,x,y,z) {
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);
    mesh.position.set(x,y,z);
    mesh.castShadow=true;
    enemy.add(mesh);
    return mesh;
  }
  add(coat,.65,.8,.4,0,1.35,0);
  add(dark,.45,.24,.36,0,.85,0);
  add(skin,.34,.39,.33,0,2,0);
  add(dark,.37,.15,.36,0,2.14,0);
  add(dark,.36,.12,.08,0,1.92,.19);
  const arms=[add(coat,.21,.7,.25,-.45,1.31,0),add(coat,.21,.7,.25,.45,1.31,0)];
  const legs=[add(dark,.25,.78,.29,-.19,.45,0),add(dark,.25,.78,.29,.19,.45,0)];
  add(dark,.29,.17,.4,-.19,.09,.055);
  add(dark,.29,.17,.4,.19,.09,.055);
  const beforeBatch=visibleMeshCount(enemy);
  batchRigidParts(THREE,enemy,new Set([...arms,...legs]));
  enemy.userData.renderStats={beforeMeshes:beforeBatch,afterMeshes:visibleMeshCount(enemy)};
  enemy.userData.update=({time=0,moving=false,attacking=false}={})=>{
    const stride=moving?Math.sin(time*9)*.35:0;
    legs[0].rotation.x=stride;
    legs[1].rotation.x=-stride;
    arms[0].rotation.x=attacking?-1.5:-stride;
    arms[1].rotation.x=stride;
  };
  return enemy;
}
