import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/** The playable character is original; every surface is generated locally. */
export const KAITO_PROFILE = Object.freeze({
  name: 'Kaito Nami', age: 12, origin: 'Okinawa, Japão',
  personality: Object.freeze(['divertido', 'corajoso', 'inteligente', 'curioso', 'protetor dos amigos']),
});
const EQUIPMENT = Object.freeze({
  vigilante: { name: 'Aventureiro', accent: 0xffd263 },
  tactical: { name: 'Explorador', accent: 0x79e0cb },
  rescue: { name: 'Resgate', accent: 0xffb765 },
  detective: { name: 'Detetive', accent: 0xb5a2f1 },
  armored: { name: 'Proteção', accent: 0x93b8e8 },
});

function floralTexture(THREE) {
  const size=128, data=new Uint8Array(size*size*4);
  const flowers=[ [.13,.20,.085], [.65,.13,.075], [.40,.57,.09], [.91,.65,.075], [.16,.89,.065], [.75,.92,.06] ];
  for(let y=0;y<size;y++)for(let x=0;x<size;x++) {
    const u=x/size,v=y/size;let color=[31,119,142];
    for(let i=0;i<flowers.length;i++) {
      const [cx,cy,radius]=flowers[i];
      const dx=((u-cx+1.5)%1)-.5,dy=((v-cy+1.5)%1)-.5;
      const angle=Math.atan2(dy,dx),distance=Math.hypot(dx,dy);
      if(distance<radius*(.72+.28*Math.cos(angle*5)))color=i%2?[249,160,133]:[255,232,183];
      if(distance<radius*.19)color=[244,190,66];
      const leafX=dx+radius*.62,leafY=dy-radius*.75;
      if((leafX*leafX/.0024+leafY*leafY/.00045)<1)color=[91,167,145];
    }
    const offset=(y*size+x)*4;data.set([...color,255],offset);
  }
  const texture=new THREE.DataTexture(data,size,size,THREE.RGBAFormat);
  texture.name='Estampa floral local da bermuda';texture.colorSpace=THREE.SRGBColorSpace;
  texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.needsUpdate=true;
  return texture;
}

/** Merge only within an animation pivot; semantic part names remain metadata. */
function batchParts(THREE, parent) {
  for(const child of [...parent.children])if(child.isGroup)batchParts(THREE,child);
  const materials=new Map();
  for(const mesh of parent.children)if(mesh.isMesh&&!Array.isArray(mesh.material)) {
    if(!materials.has(mesh.material))materials.set(mesh.material,[]);materials.get(mesh.material).push(mesh);
  }
  for(const [material,meshes] of materials) {
    if(meshes.length<2)continue;
    const copies=meshes.map(mesh=>{
      mesh.updateMatrix();const geometry=mesh.geometry.index?mesh.geometry.toNonIndexed():mesh.geometry.clone();
      geometry.applyMatrix4(mesh.matrix);geometry.clearGroups();return geometry;
    });
    const geometry=mergeGeometries(copies,false);for(const copy of copies)copy.dispose();
    if(!geometry)continue;
    const merged=new THREE.Mesh(geometry,material);merged.name='Peças rígidas de Kaito';
    merged.userData.parts=meshes.flatMap(mesh=>mesh.userData.parts||[mesh.name]).filter(Boolean);
    merged.castShadow=meshes.some(mesh=>mesh.castShadow);merged.receiveShadow=true;
    for(const mesh of meshes)parent.remove(mesh);parent.add(merged);
  }
}

export function createKaito(THREE) {
  const hero=new THREE.Group();hero.name='Kaito Nami';
  const pose=new THREE.Group();pose.name='Corpo de Kaito';hero.add(pose);
  const materials={
    skin:new THREE.MeshStandardMaterial({color:0xe6b99a,roughness:.83}),
    blue:new THREE.MeshStandardMaterial({color:0x247bc4,roughness:.84}),
    collar:new THREE.MeshStandardMaterial({color:0x1663a5,roughness:.85}),
    hair:new THREE.MeshStandardMaterial({color:0x10161c,roughness:.76}),
    frame:new THREE.MeshStandardMaterial({color:0x343f48,roughness:.32,metalness:.7}),
    lens:new THREE.MeshStandardMaterial({color:0xc92136,emissive:0x450510,emissiveIntensity:.15,roughness:.22,metalness:.12,transparent:true,opacity:.84,depthWrite:false,side:THREE.DoubleSide}),
    white:new THREE.MeshStandardMaterial({color:0xfff1dc,roughness:.7}),
    red:new THREE.MeshStandardMaterial({color:0xe64741,roughness:.77}),
    deepRed:new THREE.MeshStandardMaterial({color:0xb82d34,roughness:.83}),
    turquoise:new THREE.MeshStandardMaterial({color:0x4ed5cd,roughness:.56}),
    sole:new THREE.MeshStandardMaterial({color:0x202d40,roughness:.9}),
    mouth:new THREE.MeshStandardMaterial({color:0x9f6558,roughness:.9}),
    shorts:new THREE.MeshStandardMaterial({color:0xffffff,map:floralTexture(THREE),roughness:.85}),
    gear:new THREE.MeshStandardMaterial({color:EQUIPMENT.vigilante.accent,roughness:.55,metalness:.25}),
  };
  materials.blue.name='Camiseta azul';materials.red.name='Mochila vermelha';materials.lens.name='Lentes vermelhas';
  const cube=new THREE.BoxGeometry(1,1,1),sphere=new THREE.SphereGeometry(1,12,10);
  const add=(parent,geometry,material,name,x,y,z,sx=1,sy=1,sz=1)=>{
    const mesh=new THREE.Mesh(geometry,material);mesh.name=name;mesh.position.set(x,y,z);mesh.scale.set(sx,sy,sz);
    mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;
  };
  const box=(parent,material,name,x,y,z,w,h,d)=>add(parent,cube,material,name,x,y,z,w,h,d);
  const ball=(parent,material,name,x,y,z,rx,ry=rx,rz=rx)=>add(parent,sphere,material,name,x,y,z,rx,ry,rz);
  const group=(parent,name)=>{const part=new THREE.Group();part.name=name;parent.add(part);return part;};
  const ribbon=(parent,points,material,radius=.008,name='Costura')=>{
    const curve=new THREE.CatmullRomCurve3(points.map(point=>new THREE.Vector3(...point)));
    return add(parent,new THREE.TubeGeometry(curve,Math.max(6,points.length*3),radius,5,false),material,name,0,0,0);
  };

  // Loose cotton T-shirt on a normal, slender child torso.
  const torso=group(pose,'Camiseta azul larga com onda');
  add(torso,new THREE.CylinderGeometry(.84,1,1,16),materials.blue,'Camiseta larga',0,1.365,0,.30,.56,.175);
  box(torso,materials.blue,'Ombros da camiseta',0,1.575,0,.53,.16,.28);
  add(torso,new THREE.TorusGeometry(.085,.017,5,20),materials.collar,'Gola azul',0,1.66,0,1,1,1).rotation.x=Math.PI/2;
  ball(torso,materials.skin,'Pescoço',0,1.685,0,.073,.105,.067);
  const wave=new THREE.Shape();
  wave.moveTo(-.16,-.055);wave.bezierCurveTo(-.08,-.025,-.065,.09,.055,.10);
  wave.bezierCurveTo(.145,.105,.17,.045,.125,.008);wave.bezierCurveTo(.16,.095,.055,.083,.035,.015);
  wave.bezierCurveTo(.02,-.018,.105,-.039,.17,-.028);wave.bezierCurveTo(.11,-.10,-.065,-.11,-.16,-.055);
  add(torso,new THREE.ShapeGeometry(wave),materials.white,'Desenho de onda',0,1.395,.179);
  ribbon(torso,[[-.15,1.285,.177],[-.06,1.268,.186],[.04,1.285,.18],[.14,1.275,.17]],materials.turquoise,.009,'Espuma da onda');

  const head=group(pose,'Rosto infantil e cabelo curto');
  ball(head,materials.skin,'Rosto infantil natural',0,1.865,.005,.177,.196,.154);
  for(const side of [-1,1]) {
    ball(head,materials.skin,'Orelha',side*.177,1.856,.003,.032,.047,.025);
    ball(head,materials.hair,'Olho',side*.074,1.879,.148,.015,.018,.006);
  }
  ball(head,materials.skin,'Nariz',0,1.829,.157,.024,.026,.032);
  ribbon(head,[[-.041,1.782,.143],[0,1.773,.152],[.041,1.782,.143]],materials.mouth,.0045,'Sorriso');
  const hairGeometry=new THREE.SphereGeometry(.191,14,9,0,Math.PI*2,0,Math.PI*.58);
  add(head,hairGeometry,materials.hair,'Cabelo preto curto',0,1.887,-.005,1,1,.88);
  for(let i=0;i<9;i++) {
    const tuft=add(head,new THREE.DodecahedronGeometry(1,0),materials.hair,'Mecha bagunçada',
      Math.sin(i*2.4)*.138,2.019+(i%3)*.016,.015+Math.cos(i*2.1)*.10,.055,.065,.068);
    tuft.rotation.set(.16*(i%3),i*.71,.2*Math.sin(i));
  }
  for(const side of [-1,1]) {
    const fringe=add(head,new THREE.ConeGeometry(.055,.105,5),materials.hair,'Franja curta',side*.088,1.987,.113);
    fringe.rotation.z=side*.65;fringe.rotation.x=.32;
  }
  // Curved red sports lenses with a narrow metal bridge and wraparound temples.
  const lensShape=new THREE.Shape();
  lensShape.moveTo(-.079,.022);lensShape.quadraticCurveTo(-.045,.058,.062,.035);
  lensShape.quadraticCurveTo(.084,.018,.065,-.026);lensShape.quadraticCurveTo(.015,-.051,-.056,-.032);
  lensShape.quadraticCurveTo(-.078,-.02,-.079,.022);
  for(const side of [-1,1]) {
    const glasses=group(head,side<0?'Óculos esportivos esquerdo':'Óculos esportivos direito');
    glasses.position.set(side*.087,1.881,.17);glasses.rotation.y=side*.19;glasses.rotation.z=-side*.045;
    const outline=add(glasses,new THREE.ShapeGeometry(lensShape),materials.frame,'Armação Juliete',0,0,-.003,1.13,1.16,1);
    outline.material.side=THREE.DoubleSide;
    add(glasses,new THREE.ShapeGeometry(lensShape),materials.lens,'Lente vermelha',0,0,.003);
    box(glasses,materials.white,'Reflexo da lente',-.027,.023,.005,.032,.003,.002).rotation.z=.17;
    ribbon(head,[[side*.161,1.888,.16],[side*.19,1.894,.055],[side*.18,1.886,-.065]],materials.frame,.009,'Haste dos óculos');
  }
  ribbon(head,[[-.024,1.895,.174],[0,1.906,.178],[.024,1.895,.174]],materials.frame,.008,'Ponte dos óculos');

  // A preteen has a smaller head relative to the body than a toddler. Scale
  // the complete facial rig about its center, preserving the eyewear alignment.
  head.scale.setScalar(.81);head.position.y=1.865*(1-.81);

  const arms=[],forearms=[],legs=[],knees=[];
  for(const side of [-1,1]) {
    const arm=group(pose,side<0?'Braço esquerdo':'Braço direito');arm.position.set(side*.305,1.57,0);
    add(arm,new THREE.CylinderGeometry(.105,.11,.23,10),materials.blue,'Manga larga',0,-.075,0,1,1,.86);
    ball(arm,materials.skin,'Braço infantil',0,-.255,0,.064,.135,.061);
    const forearm=group(arm,'Antebraço');forearm.position.y=-.32;
    ball(forearm,materials.skin,'Antebraço infantil',0,-.12,.002,.057,.13,.054);
    ball(forearm,materials.skin,'Mão infantil',0,-.266,.012,.063,.078,.044);
    ball(forearm,materials.skin,'Polegar',-side*.05,-.255,.04,.023,.038,.026);
    arms.push(arm);forearms.push(forearm);
    const leg=group(pose,side<0?'Perna esquerda':'Perna direita');leg.position.set(side*.139,1.035,0);
    add(leg,new THREE.CylinderGeometry(.129,.147,.45,12),materials.shorts,'Bermuda florida',0,-.16,0,1,1,1.08);
    ball(leg,materials.skin,'Joelho',0,-.448,.005,.073,.075,.074);
    const knee=group(leg,'Canela');knee.position.y=-.45;
    ball(knee,materials.skin,'Canela infantil',0,-.235,0,.061,.237,.060);
    box(knee,materials.sole,'Sola de chinelo',0,-.554,.06,.17,.034,.29);
    ball(knee,materials.skin,'Pé com dedos',0,-.505,.061,.075,.04,.125);
    ribbon(knee,[[-.068,-.49,.032],[0,-.468,.1],[.068,-.49,.03]],materials.turquoise,.012,'Tira do chinelo');
    ribbon(knee,[[0,-.47,.1],[0,-.493,.164]],materials.turquoise,.01,'Tira frontal do chinelo');
    legs.push(leg);knees.push(knee);
  }
  box(torso,materials.shorts,'Cós da bermuda',0,1.085,0,.43,.13,.292);
  ribbon(torso,[[-.026,1.091,.155],[0,1.058,.167],[.034,1.077,.159]],materials.white,.005,'Cordão da bermuda');

  const backpack=group(pose,'Mochila vermelha');
  box(backpack,materials.red,'Corpo da mochila',0,1.37,-.23,.39,.48,.19);
  ball(backpack,materials.red,'Topo arredondado da mochila',0,1.585,-.231,.194,.068,.096);
  box(backpack,materials.deepRed,'Bolso da mochila',0,1.278,-.345,.31,.19,.055);
  ribbon(backpack,[[-.15,1.385,-.377],[0,1.398,-.38],[.15,1.385,-.377]],materials.white,.005,'Zíper da mochila');
  for(const side of [-1,1])ribbon(backpack,[[side*.15,1.61,-.17],[side*.205,1.57,.12],[side*.185,1.30,.15],[side*.15,1.18,-.13]],materials.deepRed,.019,'Alça da mochila');
  const equipmentClip=group(backpack,'Acessórios do equipamento');
  box(equipmentClip,materials.gear,'Identificação do equipamento',-.11,1.31,-.382,.065,.075,.014);
  const wristDevice=group(forearms[0],'Equipamento de pulso');
  box(wristDevice,materials.frame,'Pulseira de exploração',0,-.17,.012,.125,.045,.12);
  box(wristDevice,materials.gear,'Marcador do equipamento',0,-.17,.079,.061,.032,.014);

  const boardDeck=materials.white.clone(),boardAccent=materials.turquoise.clone(),boardInk=materials.red.clone();
  boardDeck.name="Prancha base";boardAccent.name="Prancha faixa";boardInk.name="Prancha desenho";
  const board=group(hero,'Prancha de surf personalizada');
  const boardShape=new THREE.Shape();boardShape.moveTo(0,1.055);
  boardShape.bezierCurveTo(.19,.97,.335,.46,.315,-.30);boardShape.quadraticCurveTo(.30,-.87,.215,-.985);
  boardShape.quadraticCurveTo(0,-.92,-.215,-.985);boardShape.quadraticCurveTo(-.30,-.87,-.315,-.30);
  boardShape.bezierCurveTo(-.335,.46,-.19,.97,0,1.055);
  const boardGeometry=new THREE.ExtrudeGeometry(boardShape,{depth:.05,bevelEnabled:true,bevelThickness:.018,bevelSize:.022,bevelSegments:2,steps:1,curveSegments:14});
  boardGeometry.translate(0,0,-.025);boardGeometry.rotateX(Math.PI/2);
  add(board,boardGeometry,boardDeck,'Prancha de espuma e fibra',0,0,0);
  const stripe=new THREE.Shape();stripe.moveTo(-.09,-.94);stripe.lineTo(.09,-.94);stripe.lineTo(.052,.88);stripe.quadraticCurveTo(0,1.02,-.052,.88);stripe.closePath();
  const stripeGeometry=new THREE.ShapeGeometry(stripe);stripeGeometry.rotateX(Math.PI/2);
  add(board,stripeGeometry,boardAccent,'Faixa turquesa da prancha',0,.048,0).material.side=THREE.DoubleSide;
  const boardWave=wave.clone();const boardWaveGeometry=new THREE.ShapeGeometry(boardWave);boardWaveGeometry.rotateX(Math.PI/2);
  add(board,boardWaveGeometry,boardInk,'Onda personalizada da prancha',0,.052,.35,1.35,1,1.35).material.side=THREE.DoubleSide;
  // KN initials are geometry, so the board needs no web font or image request.
  box(board,boardInk,'Inicial K',-.10,.056,-.20,.022,.009,.18);
  for(const direction of [-1,1]) {
    const stroke=box(board,boardInk,'Inicial K diagonal',-.061,.056,-.20+direction*.041,.021,.009,.12);
    stroke.rotation.y=direction*.63;
  }
  box(board,boardInk,'Inicial N esquerda',.047,.056,-.20,.018,.009,.18);
  box(board,boardInk,'Inicial N direita',.13,.056,-.20,.018,.009,.18);
  const diagonal=box(board,boardInk,'Inicial N diagonal',.09,.056,-.20,.018,.009,.2);diagonal.rotation.y=.46;
  const fin=new THREE.Mesh(new THREE.ConeGeometry(.095,.15,3),boardAccent);
  fin.name='Quilha da prancha';fin.position.set(0,-.10,-.61);fin.rotation.z=Math.PI;board.add(fin);
  ribbon(board,[[-.17,-.026,-.90],[-.27,-.035,-1.04],[-.12,-.031,-1.08]],materials.frame,.006,'Cordinha da prancha');

  const rawMeshes=()=>{let count=0;hero.traverseVisible(part=>{if(part.isMesh)count++;});return count;};
  const beforeMeshes=rawMeshes();
  // Glasses never move relative to the head. Flatten their small static groups
  // so both lenses, highlights and metal frames share material batches.
  head.updateWorldMatrix(true,true);
  const facialMeshes=[];head.traverse(part=>{if(part.isMesh&&part.parent!==head)facialMeshes.push(part);});
  for(const mesh of facialMeshes)head.attach(mesh);
  batchParts(THREE,pose);batchParts(THREE,board);
  hero.userData={
    characterId:'kaito-nami',profile:KAITO_PROFILE,armorId:'vigilante',
    physicalDimensions:Object.freeze({height:2.08,radius:.40,eyeHeight:1.88}),
    features:Object.freeze({hair:'preto, curto e bagunçado',face:'infantil natural',glasses:'esportivos estilo Juliete, lentes vermelhas',shirt:'azul larga com desenho de onda',shorts:'bermuda florida',footwear:'chinelos',backpack:'vermelha',surfboard:'personalizada com onda e iniciais KN'}),
    renderStats:{beforeMeshes,afterMeshes:rawMeshes()},
  };
  hero.userData.setBoardStyle=(id='classic')=>{const styles={classic:[0xfff1dc,0x4ed5cd,0xe64741],sunset:[0xffdfb0,0xf4a15e,0x8d4c87],abyss:[0x243b69,0x71e4dc,0xf0f6ff]};if(!styles[id])id='classic';const palette=styles[id];boardDeck.color.setHex(palette[0]);boardAccent.color.setHex(palette[1]);boardInk.color.setHex(palette[2]);hero.userData.boardStyle=id;return id;};
  hero.userData.setBoardStyle();
  hero.userData.setArmor=(requested='vigilante')=>{
    const id=Object.hasOwn(EQUIPMENT,requested)?requested:'vigilante';
    materials.gear.color.setHex(EQUIPMENT[id].accent);equipmentClip.visible=id!=='vigilante';wristDevice.visible=id!=='vigilante';
    hero.userData.armorId=id;hero.userData.equipmentName=EQUIPMENT[id].name;
    return id;
  };
  const finite=(value,fallback=0)=>Number.isFinite(value)?value:fallback;
  hero.userData.update=({time=0,moving=false,gliding=false,swimming=false,wallRunning=false,surfTrickPhase=0,landing=0,rolling=false,rollPhase=0,attacking=false,grappling=false,defending=false,finisher=false,attackType=null,attackPhase=0}={})=>{
    const t=finite(time),phase=THREE.MathUtils.clamp(finite(attackPhase),0,1),strike=Math.sin(phase*Math.PI);
    pose.position.set(0,0,0);pose.rotation.set(0,0,0);
    const stride=moving?Math.sin(t*11)*.45:0;
    arms.forEach((arm,i)=>{arm.rotation.set((i?-1:1)*stride*.8,0,(i?1:-1)*.06);});
    forearms.forEach(arm=>arm.rotation.set(-.08,0,0));
    legs.forEach((leg,i)=>{leg.position.set((i?1:-1)*.139,1.035,0);leg.rotation.set((i?1:-1)*stride,0,0);});
    knees.forEach((knee,i)=>knee.rotation.set(moving?Math.max(0,Math.sin(t*11+(i?Math.PI:0)))*.32:0,0,0));
    board.position.set(.30,1.12,-.41);board.rotation.set(-Math.PI/2,.03,-.31);
    board.visible=!swimming;
    if(wallRunning){pose.rotation.z=.16;arms[0].rotation.x=-1.4;arms[1].rotation.x=-.7;knees[0].rotation.x=.55;knees[1].rotation.x=.3;
    }else if(swimming){pose.rotation.x=-1.25;pose.position.y=.65;arms[0].rotation.x=Math.sin(t*5)*1.8;arms[1].rotation.x=-Math.sin(t*5)*1.8;legs[0].rotation.x=Math.sin(t*7)*.3;legs[1].rotation.x=-Math.sin(t*7)*.3;
    } else if(rolling){pose.rotation.x=-Math.max(0,Math.min(1,rollPhase))*Math.PI*2;pose.position.y=.5;arms[0].rotation.x=arms[1].rotation.x=-1.4;
    } else if(gliding) {
      pose.position.y=.10;pose.rotation.y=.43+Math.max(0,Math.min(1,surfTrickPhase))*Math.PI*2;pose.rotation.z=Math.sin(t*1.5)*.025;
      arms[0].rotation.set(-.34,0,-.75);arms[1].rotation.set(.19,0,.76);
      forearms[0].rotation.x=-.32;forearms[1].rotation.x=-.26;
      legs[0].position.z=.16;legs[1].position.z=-.16;legs[0].rotation.set(-.15,0,-.08);legs[1].rotation.set(.15,0,.09);
      knees[0].rotation.x=.18;knees[1].rotation.x=.2;
      board.position.set(0,.037,0);board.rotation.set(.035*Math.sin(t*1.7),0,.025*Math.sin(t*1.5));
    } else if(grappling) {
      arms[1].rotation.set(-2.65,0,.13);arms[0].rotation.x=-.55;legs[0].rotation.x=.20;legs[1].rotation.x=-.16;
      forearms[1].rotation.x=-.12;pose.rotation.x=-.07;
    } else if(defending||attackType==='parry') {
      arms[0].rotation.set(-1.08,-.42,-.11);arms[1].rotation.set(-1.08,.42,.11);
      forearms[0].rotation.x=forearms[1].rotation.x=-.85;pose.position.y=-.06;pose.rotation.x=.06;
    } else if(finisher||attackType==='finisher') {
      arms[0].rotation.x=-1.75*strike;arms[1].rotation.x=-1.30*strike;forearms[0].rotation.x=-.5;
      legs[1].rotation.x=-1.30*strike;pose.rotation.y=Math.sin(phase*Math.PI*2)*.65;
    } else if(attackType==='heavy') {
      legs[1].rotation.x=-1.6*strike;legs[1].rotation.z=.2*strike;arms[0].rotation.x=-.8*strike;arms[1].rotation.x=.35*strike;pose.rotation.y=-.35*strike;
    } else if(attackType==='slam') {
      arms[0].rotation.x=arms[1].rotation.x=-2.4*strike;legs[0].rotation.x=.25*strike;legs[1].rotation.x=-.3*strike;pose.rotation.x=.14*strike;
    } else if(attacking||attackType==='punch'||attackType==='light') {
      arms[0].rotation.x=-1.65*strike;forearms[0].rotation.x=-.25;arms[1].rotation.x=-.35*strike;pose.rotation.y=.22*strike;
    } else if(moving) {
      pose.position.y=Math.abs(Math.sin(t*11))*.018;board.rotation.z=-.31+Math.sin(t*11)*.015;
    }
    if(!gliding&&!swimming&&landing>0){const settle=Math.max(0,Math.min(1,landing));pose.position.y-=settle*.05;legs[0].rotation.x-=settle*.15;legs[1].rotation.x-=settle*.15;knees[0].rotation.x+=settle*.3;knees[1].rotation.x+=settle*.3;}
    hero.userData.boardState=gliding?'surf':'back';hero.userData.boardMode=gliding?'surfing':'carried';hero.userData.surfing=!!gliding;
  };
  hero.userData.setArmor();hero.userData.update();
  return hero;
}
