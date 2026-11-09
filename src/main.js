import * as THREE from 'three';
import './style.css';
import { createAirborneState,tickAirborne } from './air-combat.js';
import { createWaterTether,stepWaterTether,releaseWaterTether,jumpImpulse } from './water-tether.js';
import { segmentSphereContact } from './collision-queries.js';
import { createControlSettings } from './control-settings.js';
import { createAdventure } from './adventure.js';
import { createLosAngeles } from './los-angeles.js';
import { createWorld, createEnemy } from './world.js';
import { createKaito, KAITO_PROFILE } from './kaito.js';
import { createCharacterPreview } from './character-preview.js';
import { moveAndCollide, distance3 } from './physics.js';
import { MISSIONS, createCampaign, getCurrentMission, getCurrentObjective, advanceObjective } from './missions.js';
import { createMissionObject } from './objectives.js';
import { ARMORS, createProfile, getProfileData, getArmor, getUnlockedArmors, getLevel, getLevelProgress, awardMission, equipArmor } from './progression.js';
import { createChallenge, tickChallenge, submitChallenge } from './activities.js';
import { createCombatState, beginAttack, tickCombat, beginParry, resolveDefense, registerHit, beginFinisher } from './combat.js';
import { selectGrappleTarget, planGrapple, sampleGrapple, releaseGrapple } from './grapple.js';
import { createGraphics } from './graphics.js';
import { VILLAINS, createVillain } from './villains.js';
import { decodeGamepad } from './gamepad.js';
import { crossedGlideGate } from './flight.js';
import { createPatrolRun, nextEncounter, finishEncounter } from './patrol.js';
import { updateAwareness, canSilentTakedown } from './stealth.js';
import { createWindCurrents, sampleWind } from './wind.js';
import { ENEMY_ARCHETYPES, createEnemyAttackState, updateEnemyAttack } from './enemy-ai.js';
import { SKILLS, createSkillProfile, getSkillPoints, canUnlockSkill, unlockSkill, getSkillBonuses } from './skills.js';
import { makeCheckpoint, parseCheckpoint, restoreCheckpoint } from './checkpoint.js';
import { getDifficulty } from './difficulty.js';
import { createCityLife } from './city-life.js';
import { clampCameraBoom } from './camera.js';
import { createSoundscape } from './audio.js';
import { makeSimulationSteps } from './simulation.js';

const $ = (id) => document.getElementById(id);
const setText = (id, value) => { const node=$(id),text=String(value);if(node&&node.textContent!==text)node.textContent=text; };
const show = (id, visible) => { if ($(id)) $(id).hidden = !visible; };
const platformPreset=document.documentElement.dataset.platform||'auto';
let platformMode=platformPreset;
let padButtons=[], padIndex=null, padMove={x:0,z:0}, padJumpHeld=false, controllerConnected=false;
try{if(platformPreset==='auto')platformMode=localStorage.getItem('gotham.platform.v1')||'auto';}catch{/* Use the edition's default. */}
let photoZoom=0;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
let cameraMotion=!reducedMotion;try{const saved=localStorage.getItem('kaito.camera-motion.v1');if(saved!==null)cameraMotion=saved==='true';}catch{}
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
} catch {
  $('game').innerHTML = '<div class="webgl-error">Este jogo precisa de WebGL. Ative a aceleração gráfica do navegador e recarregue a página.</div>';
  $('start-button').disabled = true;
  throw new Error('WebGL indisponível');
}
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.32;
renderer.domElement.setAttribute('aria-label', 'Kaito Nami em uma aventura 3D. Use os controles descritos na ajuda para jogar.');
$('game').appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color('#a5d1e2');
scene.fog = new THREE.FogExp2('#a5d1e2', 0.0025);
scene.add(new THREE.HemisphereLight(0xd9f2ff, 0xb59d76, 2.3));
const moonlight = new THREE.DirectionalLight(0xffdfaa, 3.1);
moonlight.position.set(-75, 140, -90);
scene.add(moonlight);
const rimLight = new THREE.DirectionalLight(0xe6b86c, 1.4);
rimLight.position.set(70, 35, 110);
scene.add(rimLight);
const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 1000);
const world = createWorld(THREE, scene);
const losAngeles=createLosAngeles(THREE,scene);
world.spawn={x:-215,y:.03,z:40};
// Wayne's stepped crown and spire are solid scenery above its base rooftop.
const collisionBuildings=(world.collisionBuildings||world.buildings).map(building=>({...building}));
const wayneTower=world.buildings.find(building=>building.x===0&&building.z===-168);
if(wayneTower) {
  collisionBuildings.push(
    {...wayneTower,w:wayneTower.w*.72,d:wayneTower.d*.72,h:wayneTower.h+5},
    {...wayneTower,w:wayneTower.w*.5,d:wayneTower.d*.5,h:wayneTower.h+8},
    {...wayneTower,w:.55,d:.55,h:wayneTower.h+25},
  );
}
const grappleAnchors=world.anchors.map(anchor=>wayneTower&&anchor.x===0&&anchor.z===-168
  ? {x:6,y:wayneTower.h+10.4,z:wayneTower.z} : anchor);
const windCurrents=createWindCurrents(THREE,scene);
const cityLife=createCityLife(THREE,scene,{reducedMotion});world.setTrafficEnabled?.(false);
const graphics = createGraphics(renderer,scene,camera,moonlight,world);
let graphicsQuality=platformPreset==='tablet'?'low':'medium';
try { graphicsQuality=localStorage.getItem('gotham.graphics.v1') || graphicsQuality; } catch { /* Keep the default when storage is unavailable. */ }
graphicsQuality=graphics.setQuality(graphicsQuality);cityLife.setQuality(graphicsQuality==='ultra'?'high':graphicsQuality);
function setGraphicsQuality(value,persist=true) {
  graphicsQuality=graphics.setQuality(value);cityLife.setQuality(graphicsQuality==='ultra'?'high':graphicsQuality);
  for(const id of ['graphics-quality','intro-graphics-quality'])if($(id))$(id).value=graphicsQuality;
  if(persist)try{localStorage.setItem('gotham.graphics.v1',graphicsQuality);}catch{/* The current selection still works. */}
}
for(const id of ['graphics-quality','intro-graphics-quality']) {
  if($(id)) {$(id).value=graphicsQuality;$(id).addEventListener('change',event=>setGraphicsQuality(event.target.value));}
}
const hero = createKaito(THREE);
const heroBody={radius:.42,height:2.05,minX:-650};
let characterPreview=null,characterPreviousMode='intro';
scene.add(hero);

// Everything is procedural and local: no models, fonts, or texture CDNs at runtime.
const player = {
  position: new THREE.Vector3(), velocity: new THREE.Vector3(),
  grounded: true, health: 100, gliding: false, grapple: null,
  attacking: 0, dodge: 0, facing: Math.PI, jumpAge: 0, combo: 0, comboTimer: 0,
  slam:null, momentumTimer:0, launchGlide:false, slowTimer:0,landing:0,
};
let tether=null,jumpCharging=false,jumpCharge=0,launchCooldown=0;
let waveCooldown=0,waveTime=0;
const surfWave=new THREE.Group();surfWave.name="Onda de impulso";
const curl=new THREE.Mesh(new THREE.TorusGeometry(1.7,.48,8,24,Math.PI*1.45),new THREE.MeshStandardMaterial({color:0x35c7df,transparent:true,opacity:.82,roughness:.3}));curl.rotation.z=-.7;surfWave.add(curl);
const foam=new THREE.Mesh(new THREE.TorusGeometry(1.75,.13,5,24,Math.PI*1.35),new THREE.MeshBasicMaterial({color:0xf0ffff}));foam.position.z=.3;foam.rotation.z=-.7;surfWave.add(foam);surfWave.visible=false;scene.add(surfWave);
let combat=createCombatState();
let targetTimer=0;
let mode = 'intro';
let yaw = 0.23, pitch = 0.38, elapsed = 0;
let selectedMissionId = null;
let campaign = createCampaign();
let playStyle='campaign', patrolRun=null, patrolSite=null, courier=null;
let crouching=false, patrolDamage=0, patrolStealth=0, patrolStarted=0;
let activeWind={active:false,lift:0,boost:0,id:null};
const patrolLocations=[
  ...[-112,0,112].flatMap(z=>[-28,84].map(x=>({id:`street-${x}-${z}`,x,y:0,z,terrain:'ground'}))),
  ...world.rooftops.filter(b=>[56,-56].includes(b.x)&&[56,-56].includes(b.z)).map(b=>({id:`roof-${b.x}-${b.z}`,x:b.x,y:b.h,z:b.z,terrain:'roof'})),
];
const SAVE_KEY = 'gotham.progress.v1';
let storageAvailable = true;
let profile;
try { profile = createProfile(localStorage.getItem(SAVE_KEY)); }
catch { profile = createProfile(); storageAvailable = false; }
if (storageAvailable) {
  try { localStorage.setItem(`${SAVE_KEY}.probe`,'1'); localStorage.removeItem(`${SAVE_KEY}.probe`); }
  catch { storageAvailable = false; }
}
let skillProfile,checkpoint,difficulty=getDifficulty('normal');
try{skillProfile=createSkillProfile(localStorage.getItem('gotham.skills.v1'));}catch{skillProfile=createSkillProfile();}
let skillBonuses=getSkillBonuses(skillProfile);
try{checkpoint=parseCheckpoint(localStorage.getItem('gotham.checkpoint.v1'));}catch{checkpoint=null;}
try{difficulty=getDifficulty(localStorage.getItem('gotham.difficulty.v1'));}catch{/* Balanced default. */}
let lastDefense={kind:null,at:-10};
const soundscape=createSoundscape();
const missionHistory = new Set(profile.completedMissions);
let armoryPreviousMode = 'intro';
let challenge = null;
let scannerActive = false, scanProgress = 0;
const scannedClues = new Set();
let escort = null;
let lastReward = null;
const missionTypeLabels = { signal: 'Sabotagem', rescue: 'Resgate', evidence: 'Investigação', finale: 'Confronto final', flight:'Patrulha aérea' };
let boardPreviousMode = 'intro';
let lastTime = performance.now(), hudTimer = 0, lastStatus = '', toastTimer = 0;
let attackCooldown = 0, batarangCooldown = 0, shake = 0;
const keys = new Set();
const enemies = [];
const objectives = [];
const objectiveById = new Map();
const projectiles = [];
const hostileProjectiles=[];
const previousFlightPosition=new THREE.Vector3();
const particles = [];
const areaEffects = [];
const v1 = new THREE.Vector3(), v2 = new THREE.Vector3();
const clock = { running: 0 };
function setDifficulty(value,persist=true) {
  difficulty=getDifficulty(value);
  for(const id of ['difficulty-mode','pause-difficulty-mode'])if($(id))$(id).value=difficulty.id;
  if(playStyle==='patrol'&&patrolRun?.current&&!patrolRun.current.finished) {
    const encounter=patrolRun.current;
    encounter.timeLimit=Math.round((encounter.baseTimeLimit||encounter.timeLimit)*difficulty.timeMultiplier);
  }
  if(persist)try{localStorage.setItem('gotham.difficulty.v1',difficulty.id);}catch{/* Session preference. */}
}
for(const id of ['difficulty-mode','pause-difficulty-mode'])$(id)?.addEventListener('change',event=>setDifficulty(event.target.value));
setDifficulty(difficulty.id,false);
function skillProgress(){return {level:getLevel(profile),completedMissions:profile.completedMissions};}
function updateCheckpointUI() {
  show('continue-button',!!checkpoint);
  const mission=checkpoint&&MISSIONS.find(item=>item.id===checkpoint.missionId);
  setText('continue-detail',mission?`RETOMAR · ${mission.title}`:'Seu próximo objetivo foi salvo.');
}
function persistCheckpoint() {
  checkpoint=makeCheckpoint(campaign);
  try{if(checkpoint)localStorage.setItem('gotham.checkpoint.v1',JSON.stringify(checkpoint));else localStorage.removeItem('gotham.checkpoint.v1');}catch{storageAvailable=false;}
  updateCheckpointUI();
}
function renderSkills() {
  const list=$('skills-list');if(!list)return;list.replaceChildren();
  const points=getSkillPoints(skillProfile,skillProgress());
  setText('skill-points',`${points.available} PONTO${points.available===1?'':'S'} DISPONÍVE${points.available===1?'L':'IS'} · ${points.spent} HABILIDADES APRENDIDAS`);
  const branches={combat:'COMBATE',traversal:'TRAVESSIA',detective:'DETETIVE'};
  for(const skill of SKILLS) {
    const owned=skillProfile.unlocked.includes(skill.id),available=canUnlockSkill(skillProfile,skill.id,skillProgress()).ok;
    const button=document.createElement('button');button.type='button';button.dataset.skill=skill.id;
    button.className=`skill-card ${owned?'is-unlocked':available?'is-available':'is-locked'}`;button.disabled=owned||!available;
    const prerequisite=SKILLS.find(candidate=>candidate.id===skill.requires);
    for(const [className,text] of [['skill-card-branch',branches[skill.branch]],['skill-card-title',skill.title],['skill-card-description',skill.description],
      ['skill-card-status',owned?'APRENDIDA':available?'APRENDER · 1 PONTO':prerequisite&&!skillProfile.unlocked.includes(prerequisite.id)?`REQUER ${prerequisite.title.toUpperCase()}`:'GANHE NÍVEIS E CONCLUA MISSÕES']]) {
      const span=document.createElement('span');span.className=className;span.textContent=text;button.append(span);
    }
    button.addEventListener('click',()=>{
      if(!unlockSkill(skillProfile,skill.id,skillProgress()).ok)return;
      skillBonuses=getSkillBonuses(skillProfile);
      try{localStorage.setItem('gotham.skills.v1',JSON.stringify(skillProfile));}catch{storageAvailable=false;}
      renderSkills();updateProgressHUD();setText('armory-message',`${skill.title} aprendida. ${skill.description}`);tone(580,.2);
    });list.append(button);
  }
}

function applyPlatform(value,persist=false) {
  platformMode=['auto','pc','tablet','gamepad'].includes(value)?value:'auto';
  const touch=platformMode==='tablet'||(platformMode==='auto'&&!controllerConnected&&matchMedia('(pointer:coarse)').matches);
  document.body.classList.toggle('platform-pc',platformMode==='pc');
  document.body.classList.toggle('platform-tablet',touch);
  document.body.classList.toggle('platform-gamepad',platformMode==='gamepad'||(platformMode==='auto'&&controllerConnected));
  if($('platform-mode'))$('platform-mode').value=platformMode;
  show('gamepad-hints',platformMode==='gamepad'||(platformMode==='auto'&&controllerConnected));
  if(persist)try{localStorage.setItem('gotham.platform.v1',platformMode);}catch{/* Controls still work for this session. */}
}
function topMenu() {
  return ['control-settings','character-overlay','armory-overlay','missions-overlay','help-overlay','pause-overlay','end-overlay','intro']
    .map(id=>$(id)).find(element=>element&&!element.hidden);
}
function controllerMenuInput(frame) {
  const menu=topMenu();if(!menu)return;
  const elements=[...menu.querySelectorAll('button,select,a')].filter(element=>!element.disabled&&element.getClientRects().length);
  let index=elements.indexOf(document.activeElement);
  if(frame.menu.up||frame.menu.down) {
    index=index<0?(frame.menu.down?0:elements.length-1):(index+(frame.menu.down?1:-1)+elements.length)%elements.length;
    elements[index]?.focus();elements[index]?.scrollIntoView({block:'nearest'});
  }
  if((frame.menu.left||frame.menu.right)&&document.activeElement?.tagName==='SELECT') {
    const select=document.activeElement;
    select.selectedIndex=Math.max(0,Math.min(select.options.length-1,select.selectedIndex+(frame.menu.right?1:-1)));
    select.dispatchEvent(new Event('change',{bubbles:true}));
  } else if(frame.menu.left||frame.menu.right) {
    index=index<0?0:(index+(frame.menu.right?1:-1)+elements.length)%elements.length;
    elements[index]?.focus();elements[index]?.scrollIntoView({block:'nearest'});
  }
  if(frame.menu.confirm) (elements.includes(document.activeElement)?document.activeElement:elements[0])?.click();
  if(frame.menu.back) {
    if(mode==='controls')controlSettings.close();
    else if(mode==='character')closeCharacter();
    else if(!$('armory-overlay').hidden)closeArmory();
    else if(!$('missions-overlay').hidden)closeMissions();
    else if(!$('help-overlay').hidden){show('help-overlay',false);if(mode==='paused')pause();}
    else if(mode==='paused')pause();
  }
}
function pollGamepad(dt) {
  let pad=null;
  try{pad=Array.from(navigator.getGamepads?.()||[]).find(item=>item?.connected)||null;}catch{/* Browser may deny Gamepad API. */}
  if(padIndex!==pad?.index){padButtons=[];padIndex=pad?.index??null;}
  const frame=decodeGamepad(pad,padButtons,dt);padButtons=frame.buttons;
  const wasConnected=controllerConnected;controllerConnected=frame.supported;
  if(wasConnected!==controllerConnected)applyPlatform(platformMode);
  setText('controller-status',controllerConnected?'CONTROLE CONECTADO · ✕ CONFIRMA':platformMode==='gamepad'?'CONECTE O CONTROLE E PRESSIONE ✕':'TECLADO / MOUSE / TOQUE');
  if(padJumpHeld&&!frame.jumpHeld&&!keys.has('Space')){player.gliding=false;player.launchGlide=false;}
  padJumpHeld=frame.jumpHeld;padMove=frame.move;
  if(!frame.supported)return;
  if(mode==='challenge') {
    if(frame.menu.back||frame.actions.includes('pause'))closeChallenge();
    else if(challenge?.kind==='signal'&&frame.menu.confirm)challengeInput('sync');
    else if(challenge?.kind==='evidence') {
      if(frame.menu.left)challengeInput('A');
      else if(frame.menu.up)challengeInput('B');
      else if(frame.menu.right)challengeInput('C');
    }
    return;
  }
  if(frame.actions.includes('pause')) {
    if(mode==='controls')controlSettings.close();
    else if(mode==='photo'||mode==='map')adventure.closeView();
    else if(mode==='character')closeCharacter();
    else if(mode==='intro')begin();
    else if(mode==='ended'){if(playStyle==='patrol')beginPatrol(true);else begin(selectedMissionId);}
    else if(mode==='playing')pause();
    else if(mode==='paused'){for(const id of ['armory-overlay','missions-overlay','help-overlay','pause-overlay'])show(id,false);mode='playing';keys.clear();}
    return;
  }
  if(mode!=='playing'||!$('armory-overlay').hidden||!$('missions-overlay').hidden){controllerMenuInput(frame);return;}
  yaw+=frame.look.x;pitch=THREE.MathUtils.clamp(pitch+frame.look.y,-.12,.85);
  for(const name of frame.actions) {
    if(name==='armory'){openArmory();$('armory-list')?.querySelector('button:not(:disabled)')?.focus();}
    else if(name==='missions'){openMissions();$('missions-list')?.querySelector('button')?.focus();}
    else if(frame.buttons[6]&&name==='scan')launchAttack();
    else if(frame.buttons[6]&&name==='interact')adventure.dive();
    else if(frame.buttons[6]&&name==='takedown')toggleTether();
    else if(frame.buttons[6]&&name==='crouch'){if(jumpCharging)releaseChargedJump();else if(player.grounded){jumpCharging=true;jumpCharge=0;}}
    else if(frame.buttons[6]&&({jump:'jet',dodge:'shield',attack:'tentacle',heavy:'ice',grapple:'current',batarang:'tsunami'})[name])adventure.power(({jump:'jet',dodge:'shield',attack:'tentacle',heavy:'ice',grapple:'current',batarang:'tsunami'})[name]);
    else if(!(frame.buttons[6]&&name==='smoke'&&frame.actions.length>1))action(name);
  }
}

// Lightweight synthesized gadget sounds; sound starts only after a user gesture.
let audio, soundEnabled = false;
function tone(frequency = 200, duration = 0.1, type = 'sine', volume = 0.04) {
  if (!soundEnabled) return;
  try {
    audio ||= new AudioContext();
    if (audio.state === 'suspended') audio.resume();
    const oscillator = audio.createOscillator(), gain = audio.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, audio.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(30, frequency * 0.3), audio.currentTime + duration);
    gain.gain.setValueAtTime(volume, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + duration);
    oscillator.connect(gain).connect(audio.destination);
    oscillator.start(); oscillator.stop(audio.currentTime + duration);
  } catch { /* Audio is optional; gameplay never depends on it. */ }
}

function toast(message, duration = 3.5) {
  setText('toast', message);
  $('toast')?.classList.remove('hidden');
  $('toast')?.classList.add('visible');
  show('toast', true);
  toastTimer = duration;
}

const goldMaterial = new THREE.MeshStandardMaterial({ color: 0xe3b85f, emissive: 0x9f611e, emissiveIntensity: 1.8, metalness: 0.7, roughness: 0.3 });
function addEnemy(model,site,{boss=false,health=3,definition=null,index=0,archetype=null}={}) {
  const archetypeId=boss?null:archetype||(index%3===1?'shooter':index%3===2?'bruiser':'brawler');
  const archetypeDefinition=archetypeId?ENEMY_ARCHETYPES[archetypeId]:null;
  if(archetypeDefinition)health=archetypeDefinition.health;
  const baseScale=archetypeId==='bruiser'?1.12:1;
  const offset=site.terrain==='ground'?3:4.5;
  model.position.set(site.x+(index%2?offset:-offset),site.y,site.z+(boss?-3.5:3));
  const elite=boss&&definition.attackStyle==='heavy';
  let shield=null;
  if(elite) {
    shield=new THREE.Mesh(new THREE.TorusGeometry(1.35,.055,6,28),new THREE.MeshBasicMaterial({color:0x64bfd8,transparent:true,opacity:.75}));
    shield.position.set(0,1.5,.48);model.add(shield);
  }
  if(archetypeDefinition) {
    const material=new THREE.MeshStandardMaterial({color:archetypeDefinition.color,metalness:.35,roughness:.6});
    const armor=new THREE.Mesh(new THREE.BoxGeometry(archetypeId==='bruiser'?.8:.48,.48,.15),material);armor.position.set(0,1.45,.29);model.add(armor);
    if(archetypeId==='shooter') {
      const weapon=new THREE.Mesh(new THREE.BoxGeometry(.16,.18,.7),material);weapon.position.set(.48,1.3,.48);model.add(weapon);
    }
  }
  const warning=new THREE.Mesh(new THREE.RingGeometry(.18,.26,12),new THREE.MeshBasicMaterial({color:0xedba68,side:THREE.DoubleSide,depthTest:false,transparent:true,opacity:.8}));
  warning.position.y=boss?4:3.05;warning.rotation.x=-Math.PI/2;warning.visible=false;model.add(warning);
  model.scale.setScalar(baseScale);scene.add(model);
  enemies.push({model,home:model.position.clone(),health,maxHealth:health,site:site.id,missionId:site.missionId,
    terrain:site.terrain,boss,definition,elite,cooldown:boss?2:1.7+index,hurt:0,alive:true,phase:Math.random()*6,
    deadTime:0,shield,warning,baseScale,archetype:archetypeId,attackClock:createEnemyAttackState({cooldown:1.2+index*.35}),elitePhase:'shielded',phaseTime:0,stun:0,attackState:'ready',attackTime:0,awareness:0,alerted:false});
  return enemies[enemies.length-1];
}
for(const mission of MISSIONS) {
  for(const [index,objective] of mission.objectives.entries()) {
    const aerial=objective.kind==='flight', ground=mission.terrain==='ground';
    const building=world.buildings.find(b=>Math.abs(b.x-objective.x)<b.w/2&&Math.abs(b.z-objective.z)<b.d/2);
    if(!ground&&!aerial&&!building)throw new Error(`Objetivo sem telhado: ${objective.id}`);
    const site={...objective,y:aerial?objective.y:ground?0:building.h,missionId:mission.id,
      terrain:aerial?'air':ground?'ground':'roof',disabled:false};
    site.visual=createMissionObject(THREE,scene,site);objectives.push(site);objectiveById.set(site.id,site);
    for(let j=0;j<objective.guardCount;j++)addEnemy(createEnemy(THREE),site,{health:objective.guardHealth,index:j});
    if(index===mission.objectives.length-1) {
      const definition=VILLAINS[mission.id];
      addEnemy(createVillain(THREE,mission.id),site,{boss:true,health:definition.health,definition,index:0});
    }
  }
}

const grappleLineGeometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
const grappleLine = new THREE.Line(grappleLineGeometry, new THREE.LineBasicMaterial({ color: 0xdce5de }));
grappleLine.visible = false; grappleLine.frustumCulled = false; scene.add(grappleLine);
const anchorMarker = new THREE.Mesh(new THREE.OctahedronGeometry(0.5), goldMaterial);
scene.add(anchorMarker);
let selectedAnchor = null;

const rainCount = reducedMotion ? 120 : 650;
const rainPositions = new Float32Array(rainCount * 6);
const rainGeometry = new THREE.BufferGeometry();
rainGeometry.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));
const rain = new THREE.LineSegments(rainGeometry, new THREE.LineBasicMaterial({ color: 0x94b8c8, transparent: true, opacity: 0.19, depthWrite: false }));
rain.visible=false;rain.frustumCulled = false; scene.add(rain);
const rainSeeds = Array.from({ length: rainCount }, () => [Math.random()*110-55, Math.random()*65, Math.random()*110-55]);

function forward() { return v1.set(-Math.sin(yaw), 0, -Math.cos(yaw)); }
function targetObjective() {
  if(playStyle==='patrol')return patrolSite;
  const objective = getCurrentObjective(campaign);
  return objective ? objectiveById.get(objective.id) : null;
}
function currentGuards() {
  const site = targetObjective();
  return site ? enemies.filter(e => e.site === site.id && e.alive).length : 0;
}
function enemyIsActive(enemy) {
  return playStyle==='patrol'?enemy.missionId==='patrol':enemy.missionId===getCurrentMission(campaign)?.id;
}
function maxHealth() { return 100 + (getLevel(profile)-1)*10; }
function persistProfile() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(getProfileData(profile))); storageAvailable = true; }
  catch { storageAvailable = false; }
  updateProgressHUD();
}
function updateProgressHUD() {
  const progress = getLevelProgress(profile);
  setText('level-value', String(progress.level));
  setText('xp-value', progress.maxLevel ? `${profile.xp} XP · MÁXIMO` : `${progress.current} / ${progress.needed} XP`);
  if ($('xp-fill')) $('xp-fill').style.width = `${progress.percent}%`;
  setText('equipped-armor', getArmor(profile).title.toUpperCase());
  setText('armory-level', `NÍVEL ${progress.level} · ${maxHealth()} DE VITALIDADE`);
  setText('armory-xp', `${profile.xp} XP · ${profile.completedMissions.length} / ${MISSIONS.length} MISSÕES CONCLUÍDAS`);
  setText('save-status', storageAvailable ? 'PROGRESSO SALVO NESTE NAVEGADOR' : 'SESSÃO SEM SALVAMENTO · MANTENHA A PÁGINA ABERTA');
}
function renderArmory() {
  const list = $('armory-list');
  if (!list) return;
  list.replaceChildren();
  const unlocked = new Set(getUnlockedArmors(profile).map(armor => armor.id));
  for (const armor of ARMORS) {
    const available = unlocked.has(armor.id), equipped = getArmor(profile).id === armor.id;
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'armor-card'; button.dataset.armor = armor.id;
    button.classList.add(available ? 'is-unlocked' : 'is-locked');
    button.classList.toggle('is-equipped', equipped);
    button.disabled = !available;
    const mission = MISSIONS.find(m => m.id === armor.unlockedBy);
    const stats = armor.id === 'detective' ? 'Scanner: alcance de 40 m e análise em 1 s. Defesa padrão.' : armor.description;
    const rows = [['armor-card-name',armor.title],['armor-card-description',stats],
      ['armor-card-status',equipped ? 'EQUIPADA' : available ? 'EQUIPAR →' : `CONCLUA: ${mission.title}`]];
    for (const [className,text] of rows) {
      const span = document.createElement('span'); span.className = className; span.textContent = text; button.appendChild(span);
    }
    button.addEventListener('click', () => {
      if (!equipArmor(profile,armor.id).ok) return;
      hero.userData.setArmor(armor.id); persistProfile(); renderArmory();
      setText('armory-message', `${armor.title} equipada. ${stats}`); tone(440,.18);
    });
    list.appendChild(button);
  }
  updateProgressHUD();renderSkills();
}
function openArmory() {
  if (mode === 'challenge') return;
  armoryPreviousMode = mode;
  if (mode === 'playing') pause();
  show('pause-overlay',false); show('help-overlay',false);
  renderArmory(); show('armory-overlay',true); $('close-armory')?.focus();
}
function closeArmory() {
  show('armory-overlay',false);
  if (armoryPreviousMode === 'playing' && mode === 'paused') pause();
  else if (armoryPreviousMode === 'paused') show('pause-overlay',true);
}
function objectivePosition() {
  const site = targetObjective();
  if (site?.kind === 'rescue' && escort?.released) return escort.extraction;
  return site;
}
function closeChallenge() {
  challenge = null; show('challenge-overlay',false);
  if (mode === 'challenge') mode = 'playing';
  keys.clear();
}
function openChallenge(site) {
  challenge = createChallenge(site.kind,site.id);
  mode = 'challenge'; keys.clear(); scannerActive = false;
  $('scan-button')?.setAttribute('aria-pressed','false');
  $('scan-button')?.setAttribute('aria-label','Ativar modo detetive');
  document.body.classList.remove('detective-mode');
  setText('challenge-title',site.kind === 'signal' ? 'INVADIR TRANSMISSOR' : 'RECONSTRUIR A FREQUÊNCIA');
  setText('challenge-description',site.kind === 'signal'
    ? 'Pressione Espaço ou SINCRONIZAR quando o cursor estiver na faixa dourada. Acerte três sincronizações.'
    : 'Reproduza a sequência registrada na pista. Use os botões A, B e C na ordem exibida.');
  setText('challenge-feedback','');
  show('timing-track',site.kind === 'signal'); show('challenge-action',site.kind === 'signal');
  show('frequency-controls',site.kind === 'evidence');
  show('frequency-pattern',site.kind === 'evidence');
  setText('frequency-pattern',challenge.pattern.join(' → '));
  show('challenge-overlay',true); updateChallenge(0);
}
function challengeInput(input) {
  if (mode !== 'challenge' || !challenge) return;
  const result = submitChallenge(challenge,input);
  setText('challenge-feedback',result.ok ? 'Frequência confirmada.' : challenge.kind === 'signal' ? 'Fora da faixa. Tente novamente.' : 'Sequência incorreta. Recomece do primeiro símbolo.');
  tone(result.ok ? 500 : 90,.12);
  if (result.complete) {
    const site = targetObjective(); closeChallenge();
    if(playStyle==='patrol')finishPatrol(true);else completeObjective(site);
  } else updateChallenge(0);
}
function updateChallenge(dt) {
  if (!challenge) return;
  tickChallenge(challenge,dt);
  setText('challenge-progress',`${challenge.progress} / ${challenge.kind === 'signal' ? 3 : challenge.pattern.length}`);
  if ($('timing-cursor')) $('timing-cursor').style.left = `${challenge.cursor*100}%`;
  if ($('timing-zone')) { $('timing-zone').style.left = `${challenge.zoneStart*100}%`; $('timing-zone').style.width = `${challenge.zoneWidth*100}%`; }
}
function toggleScanner() {
  if (mode !== 'playing') return;
  scannerActive = !scannerActive;
  document.body.classList.toggle('detective-mode',scannerActive);
  $('scan-button')?.setAttribute('aria-pressed',String(scannerActive));
  $('scan-button')?.setAttribute('aria-label',scannerActive?'Desativar modo detetive':'Ativar modo detetive');
  toast(scannerActive ? 'Visor detetive ativo. Aproxime-se da área de busca para analisar as pistas.' : 'Visor detetive desativado.',3);
}
function updateMissionActivity(dt) {
  const site = targetObjective();
  if (!site) return;
  if(site.kind==='flight') {
    if(crossedGlideGate(previousFlightPosition,player.position,site,{gliding:player.gliding,grappling:!!player.grapple,slamming:!!player.slam,radius:8}))completeObjective(site,{airGate:true});
    previousFlightPosition.copy(player.position);
  }
  if (site.kind === 'evidence' && !scannedClues.has(site.id)) {
    const bonus = getArmor(profile).scanBonus;
    if (scannerActive && distance3(player.position,site) <= 24+bonus*16+skillBonuses.scanBonus) {
      scanProgress += dt;
      if (scanProgress >= (bonus ? 1 : 2)) {
        scannedClues.add(site.id); scanProgress = 0; syncMissionWorld();
        toast('Pista identificada. Aproxime-se e pressione F para reconstruir a frequência.',4);
      }
    } else scanProgress = 0;
    site.visual.group.visible = scannedClues.has(site.id) || (scannerActive && distance3(player.position,site) <= 24+bonus*16+skillBonuses.scanBonus);
  }
  if (site.kind === 'rescue' && escort?.released && !escort.evacuated) {
    const delta = new THREE.Vector3().subVectors(player.position,escort.position);
    const horizontal = Math.hypot(delta.x,delta.z);
    if (Math.abs(delta.y)<3 && horizontal<23 && horizontal>1.7) {
      const step = Math.min(dt*5.5,horizontal-1.7);
      if(site.terrain==='ground') {
        const velocity={x:delta.x/horizontal*5.5,y:-1,z:delta.z/horizontal*5.5};
        moveAndCollide(escort.position,velocity,dt,collisionBuildings,true);
      } else {
        escort.position.x+=delta.x/horizontal*step;escort.position.z+=delta.z/horizontal*step;
        const roof=world.buildings.find(b=>b.x===site.x&&b.z===site.z);
        escort.position.x=THREE.MathUtils.clamp(escort.position.x,site.x-roof.w/2+1,site.x+roof.w/2-1);
        escort.position.z=THREE.MathUtils.clamp(escort.position.z,site.z-roof.d/2+1,site.z+roof.d/2-1);
      }
    }
    site.visual.setEscort({released:true,offset:{x:escort.position.x-site.x,z:escort.position.z-site.z}});
  }
}
function syncMissionWorld() {
  const current = targetObjective();
  for (const site of objectives) {
    site.visual.setState({ active: site.id === current?.id, completed: site.disabled });
    if (site.kind === 'evidence' && site.id === current?.id && !scannedClues.has(site.id)) site.visual.group.visible = false;
  }
  for (const enemy of enemies) enemy.model.visible = enemyIsActive(enemy) && (enemy.alive || enemy.deadTime < 2.2);
}

function renderMissions() {
  const list = $('missions-list');
  if (!list) return;
  list.replaceChildren();
  MISSIONS.forEach((mission, index) => {
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'mission-card'; button.dataset.mission = mission.id;
    const parts = [
      ['mission-card-number', String(index+1).padStart(2,'0')],
      ['mission-card-type', `${mission.terrain==='ground'?'RUAS':mission.terrain==='air'?'VOO COM PRANCHA':'TELHADOS'} · ${VILLAINS[mission.id].name}`],
      ['mission-card-title', mission.title],
      ['mission-card-description', mission.description],
      ['mission-card-status', missionHistory.has(mission.id) ? 'CONCLUÍDA · REPETIR +30 XP →' : (ARMORS.find(a=>a.unlockedBy===mission.id)?`JOGAR · DESBLOQUEIA ${ARMORS.find(a=>a.unlockedBy===mission.id).title.toUpperCase()} →`:'JOGAR · PATRULHA AÉREA +180 XP →')],
    ];
    button.classList.toggle('is-complete', missionHistory.has(mission.id));
    for (const [className, text] of parts) {
      const span = document.createElement('span'); span.className = className; span.textContent = text;
      button.appendChild(span);
    }
    button.addEventListener('click', () => begin(mission.id));
    list.appendChild(button);
  });
}
function openMissions() {
  if (!$('missions-overlay')) return;
  boardPreviousMode = mode;
  if (mode === 'playing') pause();
  show('pause-overlay', false); show('help-overlay', false);
  renderMissions(); show('missions-overlay', true);
  $('close-missions')?.focus();
}
function closeMissions() {
  show('missions-overlay', false);
  if (boardPreviousMode === 'playing' && mode === 'paused') pause();
  else if (boardPreviousMode === 'paused') show('pause-overlay', true);
}

function reset(missionId = null,{resume=null}={}) {
  if(mode==='photo'||mode==='map')adventure.closeView();
  clearPatrolScene();playStyle='campaign';crouching=false;activeWind={active:false,lift:0,boost:0,id:null};
  campaign=restoreCheckpoint(resume)||createCampaign({missionId});
  selectedMissionId=campaign.missionId;
  let spawn = world.spawn;
  const first = targetObjective();
  const mission=getCurrentMission(campaign);
  if(mission.terrain==='ground')spawn={x:first.x,y:0,z:first.z+15};
  else if(mission.terrain==='air')spawn={...mission.launch};
  else if ((missionId||resume) && first) {
    const roof = world.buildings.find(b => b.x === first.x && b.z === first.z+56)
      || world.buildings.filter(b => Math.hypot(b.x-first.x,b.z-first.z)>30)
        .sort((a,b) => Math.hypot(a.x-first.x,a.z-first.z)-Math.hypot(b.x-first.x,b.z-first.z))[0];
    spawn = {x:roof.x,y:roof.h,z:roof.z};
  }
  player.position.set(spawn.x, spawn.y, spawn.z);
  player.velocity.set(0,0,0);
  tether=null;jumpCharging=false;jumpCharge=0;launchCooldown=0;waveCooldown=0;waveTime=0;surfWave.visible=false;combat=createCombatState(); player.slam=null; player.momentumTimer=0; player.launchGlide=false; targetTimer=0; selectedAnchor=null;
  player.health = maxHealth(); player.grounded = true; player.gliding = false; player.grapple = null;
  player.attacking = 0; player.combo = 0; player.facing = Math.PI; player.jumpAge = 0;
  player.dodge = 0; player.comboTimer = 0;
  clock.running=0;lastDefense={kind:null,at:-10}; yaw=first?Math.atan2(spawn.x-first.x,spawn.z-first.z):.23;pitch=.28;keys.clear();
  player.facing=Math.atan2(-Math.sin(yaw),-Math.cos(yaw));player.slowTimer=0;previousFlightPosition.copy(player.position);
  attackCooldown = 0; batarangCooldown = 0; challenge = null; escort = null; scanProgress = 0; scannerActive = false; scannedClues.clear(); lastReward = null;
  document.body.classList.remove('detective-mode'); show('challenge-overlay',false);
  $('scan-button')?.setAttribute('aria-pressed','false');
  hero.userData.setArmor(getArmor(profile).id);
  for (const e of enemies) {
    e.health = e.maxHealth; e.alive = true; e.hurt = 0; e.cooldown = 2; e.deadTime = 0;
    e.model.position.copy(e.home); e.model.rotation.set(0,0,0); e.model.visible = enemyIsActive(e); e.model.scale.setScalar(e.baseScale||1);
    e.airborne=null;e.awareness=0;e.alerted=false;e.attackClock=createEnemyAttackState({cooldown:1.2});if(e.warning)e.warning.visible=false;
    e.elitePhase='shielded';e.phaseTime=0;e.stun=0;e.attackState='ready';e.attackTime=0; if(e.shield)e.shield.visible=true;
  }
  for (const site of objectives) {
    const missionIndex=MISSIONS.findIndex(mission=>mission.id===site.missionId);
    const objectiveIndex=MISSIONS[missionIndex]?.objectives.findIndex(objective=>objective.id===site.id)??-1;
    site.disabled=campaign.completedMissionIds.includes(site.missionId)||(missionIndex===campaign.currentMissionIndex&&objectiveIndex<campaign.objectiveIndex);
    site.visual.setEscort();
    if(site.disabled)for(const enemy of enemies)if(enemy.site===site.id){enemy.alive=false;enemy.deadTime=3;enemy.model.visible=false;}
  }
  for (const p of particles) { scene.remove(p.mesh); p.mesh.geometry.dispose(); p.mesh.material.dispose(); }
  particles.length = 0;
  for(const effect of areaEffects){scene.remove(effect.mesh);effect.geometry.dispose();effect.material.dispose();}
  areaEffects.length=0;
  syncMissionWorld();
  for (const p of projectiles) { scene.remove(p.mesh); p.mesh.geometry.dispose(); p.mesh.material.dispose(); }
  projectiles.length = 0;
  for(const p of hostileProjectiles){scene.remove(p.mesh);p.mesh.geometry.dispose();p.mesh.material.dispose();}hostileProjectiles.length=0;
  hero.position.copy(player.position);
  hero.rotation.y = player.facing;
  hero.userData.update?.({time:elapsed,moving:false,gliding:false,attacking:false,grappling:false});
  updateCamera(1, true);
  updateHUD();
}


function clearPatrolScene() {
  if(patrolSite) {
    const index=objectives.indexOf(patrolSite);if(index>=0)objectives.splice(index,1);
    patrolSite.visual.dispose?.();scene.remove(patrolSite.visual.group);patrolSite=null;
  }
  for(let i=enemies.length-1;i>=0;i--)if(enemies[i].missionId==='patrol') {
    disposeActor(enemies[i].model);enemies.splice(i,1);
  }
  if(courier){disposeActor(courier.model);courier=null;}
}
function disposeActor(model) {
  scene.remove(model);const geometries=new Set(),materials=new Set();
  model.traverse(part=>{if(part.geometry)geometries.add(part.geometry);if(part.material)for(const material of Array.isArray(part.material)?part.material:[part.material])materials.add(material);});
  for(const geometry of geometries)geometry.dispose();for(const material of materials)material.dispose();
}
function beginPatrol(continuing=false) {
  const retainedFocus=continuing?combat.focus:0;
  if(!continuing||!patrolRun)patrolRun=createPatrolRun({seed:Date.now()});
  reset('rescue');playStyle='patrol';combat.focus=retainedFocus;
  const encounter=nextEncounter(patrolRun,patrolLocations);
  encounter.baseTimeLimit=encounter.timeLimit;encounter.timeLimit=Math.round(encounter.timeLimit*difficulty.timeMultiplier);
  patrolSite={...encounter,missionId:'patrol',disabled:false,name:encounter.title,
    kind:encounter.type==='bomb'?'signal':encounter.type==='rescue'?'rescue':encounter.type,
    interaction:encounter.type==='bomb'?'Desarmar bomba':encounter.type==='chase'?'Interceptar mensageiro':encounter.type==='rescue'?'Libertar civil':'Neutralizar grupo'};
  patrolSite.visual=createMissionObject(THREE,scene,{...patrolSite,kind:encounter.type==='chase'?'evidence':patrolSite.kind});
  objectives.push(patrolSite);
  for(let i=0;i<encounter.guardCount;i++) {
    const guard=addEnemy(createEnemy(THREE),patrolSite,{health:i===2?5:3,index:i});
    guard.model.scale.setScalar(guard.baseScale);
    guard.model.position.z+=i===2?4:0;guard.home.copy(guard.model.position);
    guard.model.rotation.y=0;guard.patrolPhase=i*Math.PI;
    guard.indicator=guard.warning;guard.indicator.visible=true;
  }
  if(encounter.type==='chase') {
    const model=createEnemy(THREE);model.position.set(encounter.x,0,encounter.z);scene.add(model);
    const bag=new THREE.Mesh(new THREE.BoxGeometry(.5,.6,.3),goldMaterial.clone());bag.position.set(0,1.4,-.35);model.add(bag);
    courier={model,origin:{x:encounter.x,z:encounter.z},distance:0};
  }
  player.position.set(encounter.x,encounter.y,encounter.z-(encounter.terrain==='roof'?9:18));
  player.velocity.set(0,0,0);player.grounded=true;player.facing=0;yaw=Math.PI;pitch=.25;
  patrolStarted=clock.running;patrolDamage=0;patrolStealth=0;escort=null;
  previousFlightPosition.copy(player.position);hero.position.copy(player.position);hero.rotation.y=0;
  mode='playing';document.body.classList.add('playing');
  for(const id of ['intro','end-overlay','pause-overlay','help-overlay','missions-overlay','armory-overlay'])show(id,false);
  show('next-patrol-button',true);show('patrol-campaign-button',true);show('restart-button',false);show('restart-button',false);
  syncMissionWorld();updateCamera(1,true);updateHUD();
  toast(`${encounter.title} · ${encounter.description} C: agachar · V: finalização por trás.`,7);
}
function finishPatrol(success) {
  if(playStyle!=='patrol'||!patrolRun?.current||patrolRun.current.finished)return;
  const result=finishEncounter(patrolRun,{success,elapsed:clock.running-patrolStarted,damageTaken:patrolDamage,
    stealth:patrolStealth>0&&!enemies.some(e=>e.missionId==='patrol'&&e.alerted)});
  if(!result.ok)return;
  profile=createProfile({...getProfileData(profile),xp:profile.xp+result.xpEarned});persistProfile();
  closeChallenge();mode='ended';keys.clear();
  setText('end-title',result.success?'OCORRÊNCIA RESOLVIDA.':'NOVA ABORDAGEM.');
  setText('end-description',`${result.summary} Patrulha: ${patrolRun.completed} resolvidas. A próxima ocorrência terá outro objetivo e local. Escolha CONTINUAR PATRULHA ou volte à campanha.`);
  show('next-patrol-button',true);show('patrol-campaign-button',true);show('restart-button',false);show('end-overlay',true);
  if(result.success){patrolSite.disabled=true;patrolSite.visual.setState({completed:true});spark(player.position,0x81edc9,16);}
  tone(result.success?620:110,.4);updateHUD();
}
function updatePatrol(dt) {
  if(playStyle!=='patrol'||!patrolSite||patrolRun.current.finished)return;
  if(clock.running-patrolStarted>patrolRun.current.timeLimit){finishPatrol(false);return;}
  if(mode!=='playing')return;
  if(patrolRun.current.type==='ambush'&&!currentGuards()){finishPatrol(true);return;}
  if(courier) {
    courier.distance+=dt*6.2;
    const offset=Math.sin(courier.distance/24)*24;
    const old=courier.model.position.z;
    courier.model.position.z=courier.origin.z+offset;
    courier.model.rotation.y=courier.model.position.z>=old?0:Math.PI;
    courier.model.userData.update?.({time:elapsed,moving:true});
    patrolSite.x=courier.model.position.x;patrolSite.z=courier.model.position.z;
    patrolSite.visual.group.position.set(patrolSite.x,0,patrolSite.z);
  }
}
function toggleCrouch() {
  if(mode!=='playing')return;crouching=!crouching;
  toast(crouching?'Agachado: menos visível. Aproxime-se por trás e pressione V.':'Em pé: movimento normal.',2);
  document.querySelector('[data-action="crouch"]')?.setAttribute('aria-pressed',String(crouching));
}
function silentTakedown() {
  if(mode!=='playing'||!player.grounded||player.grapple)return;
  const enemy=nearbyEnemies(3.6).find(enemy=>{
    const delta=player.position.clone().sub(enemy.model.position),distance=Math.hypot(delta.x,delta.z);
    return canSilentTakedown({distance,angleCos:distance?(Math.sin(enemy.model.rotation.y)*delta.x+Math.cos(enemy.model.rotation.y)*delta.z)/distance:-1,
      alerted:enemy.alerted||playStyle!=='patrol',boss:enemy.boss,heightDifference:delta.y});
  });
  if(!enemy&&combat.focus>=100){useFinisher();return;}
  if(!enemy){toast('Aproxime-se por trás de um guarda não alertado na patrulha livre. C agacha · V finaliza.',3);return;}
  hitEnemy(enemy,enemy.health,0,{silent:true});patrolStealth++;crouching=true;
  tone(100,.2,'triangle',.02);toast('FINALIZAÇÃO SILENCIOSA · área sem alarme',2.5);
}

function begin(missionId = null,{resume=false}={}) {
  reset(missionId,{resume:resume?checkpoint:null}); mode = 'playing';persistCheckpoint();
  show('restart-button',true);
  show('next-patrol-button',false);show('patrol-campaign-button',false);show('restart-button',true);
  for (const id of ['intro', 'end-overlay', 'pause-overlay', 'help-overlay', 'missions-overlay', 'armory-overlay']) show(id, false);
  document.body.classList.add('playing');
  toast(getCurrentMission(campaign).briefing, 7);
  renderArmory(); updateHUD(); renderer.domElement.focus(); tone(350, 0.4);
  if(missionId===null&&!resume)adventure.startStory();
}

function openCharacter() {
  if(mode==='challenge')return;
  characterPreviousMode=mode;mode='character';keys.clear();
  characterPreview ||= createCharacterPreview(THREE,createKaito);characterPreview.reset();characterPreview.model.userData.setBoardStyle(hero.userData.boardStyle);
  for(const id of ['intro','help-overlay','pause-overlay'])show(id,false);show('character-overlay',true);document.body.classList.add('viewing-character');
  $('close-character')?.focus();
}
function closeCharacter() {
  if(mode!=='character')return;mode=characterPreviousMode;
  show('character-overlay',false);document.body.classList.remove('viewing-character');
  show('intro',mode==='intro');show('pause-overlay',mode==='paused');keys.clear();
  $('character-button')?.focus();
}
function pause() {
  if (mode === 'playing') {
    mode = 'paused';jumpCharging=false;jumpCharge=0; keys.clear(); show('pause-overlay', true); show('help-overlay', false);
  } else if (mode === 'paused') {
    mode = 'playing'; show('pause-overlay', false);
  }
}
function end(won) {
  if(playStyle==='patrol'){finishPatrol(won);return;}
  mode = 'ended'; keys.clear();
  const mission = MISSIONS.find(m => m.id === selectedMissionId);
  setText('end-title', won ? (mission ? 'MISSÃO CONCLUÍDA.' : 'LOS ANGELES RESPIRA.') : 'A AVENTURA CONTINUA.');
  const duration = `${Math.floor(clock.running / 60)} min ${Math.floor(clock.running % 60)} s`;
  setText('end-description', won
    ? (mission ? `${mission.title}: ${mission.completeMessage} Tempo: ${duration}. Escolha outra missão no menu ou jogue novamente.`
      : `As ${MISSIONS.length} missões foram concluídas em ${duration}. A rede foi restaurada, o civil está seguro e as provas foram recuperadas. A patrulha aérea também está concluída. Los Angeles respira por hoje.`)
    : 'Seus sinais vitais caíram. A equipe preparou outra tentativa. Use o onda para chegar aos telhados e o disco de resgate para manter distância dos guardas.');
  if (won && lastReward) {
    const rewardText = ` +${lastReward.xpEarned} XP · Nível ${getLevel(profile)}${lastReward.unlockedArmors.length ? ` · Nova equipamento: ${lastReward.unlockedArmors.map(a=>a.title).join(', ')}` : ''}.`;
    setText('end-description', $('end-description').textContent + rewardText);
  }
  show('end-overlay', true); tone(won ? 660 : 110, 0.65);
}

function releaseTether(glide=false){if(!tether)return;const velocity=releaseWaterTether(tether);player.velocity.set(velocity.x,velocity.y+(glide?3:0),velocity.z);tether=null;player.momentumTimer=.8;player.gliding=glide;player.launchGlide=glide;player.jumpAge=.3;}
function toggleTether(){if(mode!=='playing')return;if(tether){releaseTether();return;}if(!selectedAnchor){toast('Mire um ponto alto à frente para prender o tentáculo.',2);return;}const velocity=player.velocity.clone();if(player.grounded){velocity.addScaledVector(forward(),12);velocity.y=8;}tether=createWaterTether(player.position,velocity,selectedAnchor);if(tether){player.grounded=false;player.grapple=null;player.gliding=false;player.slam=null;tone(420,.15);toast('Tentáculo preso · WASD dá impulso · Y solta · Espaço solta e plana',3);}}
function releaseChargedJump(){if(!jumpCharging)return;const charge=jumpCharge;jumpCharging=false;jumpCharge=0;if(mode==='playing'&&player.grounded){jump();player.velocity.y=jumpImpulse(charge,Math.hypot(player.velocity.x,player.velocity.z));}}
function jump() {
  if (mode !== 'playing') return;
  if(tether){releaseTether(true);return;}
  if (player.grapple) { launchFromGrapple(true); return; }
  if (player.slam) return;
  if (player.grounded) {
    player.velocity.y = jumpImpulse(0,Math.hypot(player.velocity.x,player.velocity.z)); player.grounded = false; player.jumpAge = 0;
    tone(160, 0.15);
  } else {
    player.gliding = !player.gliding;
    if (player.gliding) toast('Prancha ativa · segure Espaço para planar', 2);
  }
}

function startGrapple(anchor) {
  if(distance3(player.position,anchor)>(getArmor(profile).id==='tactical'?170:145))return false;
  const plan=planGrapple(player.position,anchor,{speed:getArmor(profile).grappleSpeed+skillBonuses.grappleBonus,buildings:collisionBuildings});
  if(!plan)return false;
  player.grapple={...plan,progress:0,chainRequested:false};
  player.gliding=false;player.launchGlide=false;player.grounded=false;player.slam=null;
  tone(750,.18,'sawtooth',.02);
  return true;
}
function launchFromGrapple(glide=false) {
  if(!player.grapple)return;
  const velocity=releaseGrapple(player.grapple,player.grapple.progress);
  player.velocity.set(velocity.x,velocity.y,velocity.z);
  player.grapple=null;player.grounded=false;player.jumpAge=.3;
  player.momentumTimer=.45;player.launchGlide=glide;player.gliding=glide;
  tone(400,.14);toast(glide?'Impulso! Segure Espaço para planar.':'Onda solto · impulso preservado',2);
}
function grapple() {
  if(mode!=='playing'||player.slam||waveCooldown>0)return;
  if(tether)releaseTether();
  const direction=forward().clone();
  player.grapple=null;player.grounded=false;player.gliding=true;player.launchGlide=true;player.jumpAge=.3;
  const waveSpeed=30+skillBonuses.grappleBonus+(getArmor(profile).grappleSpeed-48)*.2;
  player.velocity.set(direction.x*waveSpeed,14,direction.z*waveSpeed);player.momentumTimer=1.25;
  waveCooldown=2.5;waveTime=1.5;player.facing=Math.atan2(direction.x,direction.z);
  tone(230,.3,'sine',.035);toast('ONDA! Impulso na prancha · direcione com WASD.',2);
}

function spark(position, color = 0xeac477, count = 10) {
  for (let i = 0; i < count; i++) {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.065, 4, 3), new THREE.MeshBasicMaterial({ color }));
    mesh.position.copy(position); mesh.position.y += 1.5;
    scene.add(mesh);
    particles.push({ mesh, velocity: new THREE.Vector3((Math.random()-.5)*12, Math.random()*7, (Math.random()-.5)*12), life: .55 });
  }
}

function areaPulse(position,color,radius=5,duration=.5,smoke=false) {
  const geometry=smoke?new THREE.SphereGeometry(1,8,6):new THREE.RingGeometry(.9,1,40);
  const material=new THREE.MeshBasicMaterial({color,transparent:true,opacity:smoke?.2:.7,side:THREE.DoubleSide,depthWrite:false});
  let mesh;
  if(smoke) {
    mesh=new THREE.Group();
    for(let i=0;i<7;i++) {
      const puff=new THREE.Mesh(geometry,material),angle=i/7*Math.PI*2;
      puff.position.set(Math.cos(angle)*3,1.5+i%2,Math.sin(angle)*3);puff.scale.set(2.5,2.1,2.5);mesh.add(puff);
    }
  } else {mesh=new THREE.Mesh(geometry,material);mesh.rotation.x=-Math.PI/2;}
  mesh.position.copy(position);mesh.position.y+=.1;scene.add(mesh);
  areaEffects.push({mesh,geometry,material,radius,life:duration,duration,smoke});
}
function hitEnemy(enemy,damage,stun=0,{silent=false,focus=true}={}) {
  if(!enemy.alive)return false;
  if(enemy.elite&&enemy.elitePhase!=='exposed') {toast('Escudo ativo! Evite o golpe pesado e ataque na abertura.',1.8);spark(enemy.model.position,0x67bfe4,3);return false;}
  enemy.health-=damage;enemy.hurt=.45;
  if(focus){registerHit(combat,{silent});combat.focus=Math.min(100,combat.focus+skillBonuses.focusBonus);}
  if(playStyle==='patrol'&&!silent&&damage<enemy.maxHealth){enemy.awareness=1;enemy.alerted=true;}
  if(!enemy.elite)enemy.stun=Math.max(enemy.stun||0,stun);
  player.combo++;player.comboTimer=4;
  spark(enemy.model.position);tone(95,.12,'triangle',.06);shake=.1;
  if(enemy.health<=0) {
    enemy.alive=false;enemy.deadTime=0;
    toast(currentGuards()?'Guarda neutralizado':'Área livre. Aproxime-se do objetivo e pressione F.',3.5);
  }
  return true;
}
function nearbyEnemies(range,origin=player.position) {
  return enemies.filter(e=>enemyIsActive(e)&&e.alive&&Math.abs(e.model.position.y-origin.y)<4&&distance3(e.model.position,origin)<range&&!lineBlocked(new THREE.Vector3(origin.x,origin.y+1.2,origin.z),e.model.position.clone().add(new THREE.Vector3(0,1.2,0))))
    .sort((a,b)=>distance3(a.model.position,origin)-distance3(b.model.position,origin));
}
function throwBatarang() {
  if(mode!=='playing'||player.grapple||player.slam||batarangCooldown>0)return;
  const enemy=nearbyEnemies(35)[0];
  if(!enemy){toast('Nenhum guarda ao alcance do disco de resgate (35 m).',2);return;}
  batarangCooldown=.85;
  if(playStyle==='patrol'){enemy.awareness=1;enemy.alerted=true;}
  const mesh=new THREE.Mesh(new THREE.TorusGeometry(.37,.09,6,20),new THREE.MeshBasicMaterial({color:0xff755e}));
  mesh.position.copy(player.position).add(new THREE.Vector3(0,1.7,0));
  scene.add(mesh);projectiles.push({mesh,enemy,life:1.5,bounces:1,visited:new Set([enemy])});tone(900,.1);
}
function useAttack(type='light') {
  if(mode!=='playing'||player.slam)return;
  const result=beginAttack(combat,type,{grounded:player.grounded,grappling:!!player.grapple,armorDamage:getArmor(profile).meleeDamage});
  if(result.ok&&['light','heavy','slam'].includes(type))result.damage+=skillBonuses.meleeBonus;
  if(!result.ok) {
    if(result.reason==='grounded')toast('Pule e pressione L para usar o impacto aéreo.',2);
    else if(result.reason==='airborne')toast('O chute pesado precisa de apoio no chão.',2);
    else if(result.reason==='grappling')toast('Solte o onda antes de atacar. Espaço dá impulso.',2);
    return;
  }
  if(type==='smoke') {
    for(const enemy of nearbyEnemies(result.radius))if(!enemy.elite)enemy.stun=Math.max(enemy.stun||0,result.stun);
    areaPulse(player.position,0x9baeb9,10,3,true);tone(90,.5,'sawtooth',.015);
    toast('Fumaça! Guardas próximos ficam desorientados por 3 segundos.',2.5);return;
  }
  if(type==='slam') {
    player.slam=result;player.gliding=false;player.launchGlide=false;player.velocity.y=-32;
    toast('MERGULHO DE IMPACTO',1.5);return;
  }
  const enemy=nearbyEnemies(result.range)[0];
  if(enemy) {
    const delta=v2.subVectors(enemy.model.position,player.position);player.facing=Math.atan2(delta.x,delta.z);
    hitEnemy(enemy,result.damage,result.stun);
    if(type==='heavy'||result.comboStep===3)areaPulse(enemy.model.position,0xf4c76c,2,.3);
  } else tone(130,.07,'triangle',.03);
  if(result.comboStep===3){adventure.comboJet();toast('COMBO · GOLPE FINAL AQUÁTICO',1.2);}
}
function launchAttack(){if(mode!=='playing'||launchCooldown>0||player.grapple||tether)return;const enemy=nearbyEnemies(5).find(e=>!e.boss);if(!enemy){toast('Aproxime-se de um capanga para o lançamento.',2);return;}launchCooldown=2;if(hitEnemy(enemy,1,.8)&&enemy.alive)enemy.airborne=createAirborneState(enemy.model.position.y);combat.animation='light';combat.animationTime=.3;combat.animationDuration=.3;tone(310,.12);toast('LANÇAMENTO · pule e continue o combo no ar!',2);}
function resolveSlam() {
  const attack=player.slam;if(!attack)return;
  for(const enemy of nearbyEnemies(attack.radius))hitEnemy(enemy,attack.damage,1.2);
  areaPulse(player.position,0x85cfe8,attack.radius,.65);spark(player.position,0x8ad6e9,16);
  shake=.25;tone(65,.35,'triangle',.07);player.slam=null;
  combat.animation='slam';combat.animationDuration=.3;combat.animationTime=.3;
}
function attack(ranged=false) {if(ranged)throwBatarang();else useAttack('light');}

function parry() {
  if(mode!=='playing'||player.slam)return;
  const result=beginParry(combat,{grounded:player.grounded,grappling:!!player.grapple});
  if(result.ok){combat.defenseWindow=Math.max(.16,combat.defenseWindow+skillBonuses.parryBonus+difficulty.parryBonus);tone(380,.09,'triangle',.025);}
}
function useFinisher() {
  if(mode!=='playing'||player.slam)return;
  const enemy=nearbyEnemies(6).find(candidate=>!candidate.elite||candidate.elitePhase==='exposed');
  const result=beginFinisher(combat,{grounded:player.grounded,grappling:!!player.grapple,hasTarget:!!enemy});
  if(!result.ok){toast(result.reason==='focus'?'Ganhe 100 de foco acertando golpes e aparando ataques.':'Aproxime-se de um inimigo vulnerável e firme os pés para finalizar.',2.5);return;}
  player.facing=Math.atan2(enemy.model.position.x-player.position.x,enemy.model.position.z-player.position.z);
  hitEnemy(enemy,result.damage,result.stun,{focus:false});areaPulse(enemy.model.position,0x84d9f3,5,.7);spark(enemy.model.position,0x84d9f3,18);
  tone(70,.4,'triangle',.06);shake=reducedMotion?.05:.2;toast('FINALIZAÇÃO ESPECIAL · FOCO CONSUMIDO',2);
}

function completeObjective(site,{airGate=false}={}) {
  const position = objectivePosition();
  const result = advanceObjective(campaign, {
    distance: airGate?0:position?distance3(player.position,position):Infinity,
    guardsRemaining: currentGuards(),
  });
  if (!result.ok) return;
  site.disabled = true;previousFlightPosition.copy(player.position);
  spark(site.visual.group.position, 0x81edc9, 24); tone(620, .5);
  if (result.missionCompleted) {
    lastReward = awardMission(profile,site.missionId);
    missionHistory.add(site.missionId); persistProfile();
    player.health = maxHealth();
    scannerActive=false; document.body.classList.remove('detective-mode');
    $('scan-button')?.setAttribute('aria-pressed','false');
  } else player.health = Math.min(maxHealth(),player.health+25+skillBonuses.healingBonus);
  scanProgress=0;
  persistCheckpoint();syncMissionWorld(); renderMissions(); renderArmory();
  const nextMission=getCurrentMission(campaign);
  if(result.missionCompleted&&!result.finished&&nextMission?.terrain==='air') {
    const launch=nextMission.launch,target=targetObjective();
    player.position.set(launch.x,launch.y,launch.z);player.velocity.set(0,0,0);
    player.grapple=null;player.gliding=false;player.grounded=true;player.launchGlide=false;player.slam=null;keys.clear();
    previousFlightPosition.copy(player.position);hero.position.copy(player.position);
    yaw=Math.atan2(launch.x-target.x,launch.z-target.z);pitch=.2;selectedAnchor=null;targetTimer=0;updateCamera(1,true);
  }
  if (result.finished) end(true);
  else if (result.missionCompleted) {
    toast(`MISSÃO CONCLUÍDA · +${lastReward.xpEarned} XP${lastReward.unlockedArmors.length ? ` · EQUIPAMENTO ${lastReward.unlockedArmors[0].title.toUpperCase()} DESBLOQUEADA (T)` : ''}. ${getCurrentMission(campaign).briefing}`,10);
  } else toast(site.kind==='flight'?`ANEL ${site.gateIndex} / 3 · Continue planando com a prancha.`:site.kind==='signal'?'Transmissor sincronizado. Próxima frequência marcada.':'Pista decifrada. Próximo local de investigação marcado.',4);
  updateHUD();
}
function interact() {
  if(adventure.interact())return;
  if (mode !== 'playing') return;
  const site=targetObjective(),position=objectivePosition();
  if(site?.kind==='flight'){toast('Atravesse o anel planando com a prancha aberta. O onda não conta.',3);return;}
  if (!site || distance3(player.position,position)>5) { toast('Aproxime-se do objetivo dourado e pressione F.'); return; }
  if (currentGuards()) { toast('Neutralize os guardas para liberar este objetivo.'); return; }
  if(site.kind==='chase'){if(distance3(player.position,site)>3.5){toast('Chegue mais perto do mensageiro para interceptar.',2);return;}finishPatrol(true);return;}
  if (site.kind === 'signal') { openChallenge(site); if(playStyle==='patrol')setText('challenge-title','DESARMAR EXPLOSIVO');return; }
  if (site.kind === 'evidence') {
    if (!scannedClues.has(site.id)) { toast('Ative o visor detetive (R) e analise a área por dois segundos.'); return; }
    openChallenge(site); return;
  }
  if (site.kind === 'rescue') {
    if (!escort?.released) {
      escort={released:true,evacuated:false,position:new THREE.Vector3(site.x,site.y,site.z),extraction:{x:site.x+(site.terrain==='ground'?0:9),y:site.y,z:site.z+(site.terrain==='ground'?-12:-8)}};
      site.visual.setEscort({released:true});
      toast('Civil liberto. Caminhe até o círculo de extração; ele seguirá você. Pressione F quando ambos estiverem no local.',7);
      return;
    }
    if (distance3(escort.position,position)>3.3) { toast('Espere o civil chegar ao círculo de extração. Caminhe perto dele.',3); return; }
    escort.evacuated=true;
    site.visual.setEscort({released:true,evacuated:true});
  }
  if(playStyle==='patrol')finishPatrol(true);else completeObjective(site);
}

function dodge() {
  if (!player.grounded || player.dodge > 0 || player.grapple) return;
  parry();player.dodge = 0.6;
  const direction = forward().clone();
  player.velocity.x = direction.x * 23; player.velocity.z = direction.z * 23;
}

function action(name) {
  if (mode !== 'playing') return;
  if(name==='parry')parry();
  if(name==='finisher')useFinisher();
  if(name==='crouch')toggleCrouch();
  if(name==='takedown')silentTakedown();
  if (name === 'heavy') useAttack('heavy');
  if (name === 'slam') useAttack('slam');
  if (name === 'smoke') useAttack('smoke');
  if (name === 'scan') toggleScanner();
  if (name === 'dodge') dodge();
  if (name === 'jump') jump();
  if (name === 'grapple') grapple();
  if (name === 'attack') attack();
  if (name === 'batarang') attack(true);
  if (name === 'interact') interact();
  if (name === 'glide') { jump(); keys.add('Space'); }
}

addEventListener('keydown', event => {
  if(event.target?.matches('select,input,textarea'))return;
  if (['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.code)) event.preventDefault();
  if (event.repeat) return;
  if(mode==='character') {
    if(event.code==='Tab'){
      event.preventDefault();const controls=[...$('character-overlay').querySelectorAll('button')].filter(button=>!button.disabled);
      const index=controls.indexOf(document.activeElement),direction=event.shiftKey?-1:1;controls[(index+direction+controls.length)%controls.length]?.focus();return;
    }
    if(event.code==='Escape')closeCharacter();
    else if(['ArrowLeft','ArrowRight'].includes(event.code))characterPreview?.turn();
    return;
  }
  if (mode === 'challenge') {
    if (event.code === 'Escape') closeChallenge();
    else if (event.code === 'Space' && challenge?.kind === 'signal') challengeInput('sync');
    else if (challenge?.kind === 'evidence' && ['KeyA','KeyB','KeyC'].includes(event.code)) challengeInput(event.code.slice(-1));
    return;
  }
  if (!$('missions-overlay')?.hidden && event.code === 'KeyT') return;
  if (event.code === 'KeyT') { if ($('armory-overlay')?.hidden) openArmory(); else closeArmory(); return; }
  if (event.code === 'Escape' && !$('armory-overlay')?.hidden) { closeArmory(); return; }
  if (!$('armory-overlay')?.hidden) return;
  if (event.code === 'KeyM') { if ($('missions-overlay')?.hidden) openMissions(); else closeMissions(); return; }
  if (event.code === 'Escape' && !$('missions-overlay')?.hidden) { closeMissions(); return; }
  if (!$('missions-overlay')?.hidden) return;
  if (event.code === 'Escape') { if (!$('help-overlay')?.hidden) { show('help-overlay', false); if(mode==='paused') pause(); } else pause(); return; }
  if (event.code === 'KeyH') {
    if (mode === 'playing') { pause(); show('pause-overlay', false); show('help-overlay', true); }
    else if (mode === 'paused') { show('help-overlay', false); pause(); }
    return;
  }
  if (mode !== 'playing') return;
  keys.add(event.code);
  if (event.code === 'Space') jump();
  if (event.code === 'KeyE') grapple();
  if(event.code==='KeyY')toggleTether();
  if(event.code==='KeyU'&&player.grounded){jumpCharging=true;jumpCharge=0;}
  if (event.code === 'KeyJ') attack();
  if (event.code === 'KeyQ') attack(true);
  if (event.code === 'KeyK') useAttack('heavy');
  if (event.code === 'KeyL') useAttack('slam');
  if(event.code==='KeyI')launchAttack();
  if (event.code === 'KeyZ') useAttack('smoke');
  if (event.code === 'KeyF') interact();
  if (event.code === 'KeyR') toggleScanner();
  if (event.code === 'KeyC')toggleCrouch();
  if (event.code === 'KeyV')silentTakedown();
  if (event.code === 'KeyX')parry();
  if (event.code === 'KeyB')useFinisher();
  if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') dodge();
});
addEventListener('keyup', event => { keys.delete(event.code);if(event.code==='KeyU')releaseChargedJump(); if (event.code === 'Space') { player.gliding=false;player.launchGlide=false; } });
addEventListener('blur', () => { keys.clear(); if(mode === 'playing') pause(); });
document.addEventListener('visibilitychange', () => { if(document.hidden && mode === 'playing') pause(); });

let pointer = null;
renderer.domElement.addEventListener('pointerdown', event => {
  if (!['playing','photo'].includes(mode)) return;
  pointer = { x: event.clientX, y: event.clientY, id: event.pointerId };
  renderer.domElement.setPointerCapture(event.pointerId);
});
renderer.domElement.addEventListener('pointermove', event => {
  if (!pointer || !['playing','photo'].includes(mode)) return;
  yaw -= (event.clientX-pointer.x) * .004;
  pitch = THREE.MathUtils.clamp(pitch+(event.clientY-pointer.y)*.0025, -.12, .85);
  pointer.x=event.clientX; pointer.y=event.clientY;
});
renderer.domElement.addEventListener('pointerup', () => { pointer = null; });
renderer.domElement.addEventListener('pointercancel', () => { pointer = null; });
renderer.domElement.addEventListener('contextmenu', e => e.preventDefault());

for (const id of ['armory-button','pause-armory-button','end-armory-button','hud-armory-button']) $(id)?.addEventListener('click',openArmory);
$('close-armory')?.addEventListener('click',closeArmory);
$('close-challenge')?.addEventListener('click',closeChallenge);
$('challenge-action')?.addEventListener('click',()=>challengeInput('sync'));
document.querySelectorAll('[data-frequency]').forEach(button=>button.addEventListener('click',()=>challengeInput(button.dataset.frequency)));
$('scan-button')?.addEventListener('click',toggleScanner);
$('platform-mode')?.addEventListener('change',event=>applyPlatform(event.target.value,true));
applyPlatform(platformMode);
$('character-button')?.addEventListener('click',openCharacter);
$('close-character')?.addEventListener('click',closeCharacter);
$('character-view-button')?.addEventListener('click',()=>characterPreview?.turn());
$('continue-button')?.addEventListener('click',()=>{if(checkpoint)begin(checkpoint.selectedMissionId,{resume:true});});
$('patrol-button')?.addEventListener('click',()=>beginPatrol());
$('patrol-board-button')?.addEventListener('click',()=>beginPatrol());
$('next-patrol-button')?.addEventListener('click',()=>beginPatrol(true));
$('patrol-campaign-button')?.addEventListener('click',()=>begin());
$('start-button')?.addEventListener('click', () => begin());
$('missions-button')?.addEventListener('click', openMissions);
$('pause-missions-button')?.addEventListener('click', openMissions);
$('end-missions-button')?.addEventListener('click', openMissions);
$('close-missions')?.addEventListener('click', closeMissions);
$('campaign-button')?.addEventListener('click', () => begin());
$('restart-button')?.addEventListener('click', () => playStyle==='patrol'?beginPatrol():begin(selectedMissionId));
$('pause-button')?.addEventListener('click', pause);
$('resume-button')?.addEventListener('click', pause);
$('sound-button')?.addEventListener('click', () => {
  soundEnabled = !soundEnabled;void soundscape.setEnabled(soundEnabled);
  $('sound-button').setAttribute('aria-pressed', String(soundEnabled));
  $('sound-button').setAttribute('aria-label', soundEnabled ? 'Desativar som' : 'Ativar som');
  $('sound-button').classList.toggle('active', soundEnabled);
  toast(soundEnabled ? 'Som ativado' : 'Som desativado', 1.8); tone(460, .2);
});
$('help-button')?.addEventListener('click', () => {
  if (mode === 'playing') pause();
  show('pause-overlay', false); show('help-overlay', true);
});
document.querySelectorAll('[data-close-help], #close-help').forEach(button => button.addEventListener('click', () => {
  show('help-overlay', false); if(mode === 'paused') pause();
}));
document.querySelectorAll('#touch-controls button').forEach(button => {
  const release = event => {
    event.preventDefault();
    if(button.dataset.key) keys.delete(button.dataset.key);
    if(button.dataset.action==='glide'||button.dataset.action==='jump'){keys.delete('Space');if(!padJumpHeld){player.gliding=false;player.launchGlide=false;}}
  };
  button.addEventListener('pointerdown', event => {
    event.preventDefault(); button.setPointerCapture(event.pointerId);
    if(button.dataset.key) keys.add(button.dataset.key);
    if(button.dataset.action) action(button.dataset.action);
    if(button.dataset.action === 'jump') keys.add('Space');
  });
  button.addEventListener('pointerup', release); button.addEventListener('pointercancel', release);
});

function updatePlayer(dt) {
  waveCooldown=Math.max(0,waveCooldown-dt);waveTime=Math.max(0,waveTime-dt);
  surfWave.visible=waveTime>0;surfWave.position.copy(player.position);surfWave.position.y-=.3;surfWave.rotation.y=player.facing;surfWave.scale.setScalar((.7+waveTime*.25)*(player.position.x< -229?2.2:1));
  launchCooldown=Math.max(0,launchCooldown-dt);player.landing=Math.max(0,player.landing-dt);tickCombat(combat,dt);player.momentumTimer=Math.max(0,player.momentumTimer-dt);
  attackCooldown = Math.max(0, attackCooldown-dt); batarangCooldown = Math.max(0,batarangCooldown-dt);
  player.attacking = Math.max(0,player.attacking-dt); player.dodge = Math.max(0,player.dodge-dt);
  player.comboTimer -= dt; if(player.comboTimer <= 0) player.combo = 0;
  if(jumpCharging){if(player.grounded)jumpCharge=Math.min(1,jumpCharge+dt);else{jumpCharging=false;jumpCharge=0;}}
  if(keys.has('ArrowLeft')) yaw += dt*1.9;
  if(keys.has('ArrowRight')) yaw -= dt*1.9;
  if(keys.has('ArrowUp')) pitch = Math.max(-.12,pitch-dt*.65);
  if(keys.has('ArrowDown')) pitch = Math.min(.85,pitch+dt*.65);
  if(!tether&&adventure.movement(dt))return;
  if(tether){
    tether.position={x:player.position.x,y:player.position.y,z:player.position.z};
    const input={x:(keys.has('KeyD')?1:0)-(keys.has('KeyA')?1:0)+padMove.x,z:(keys.has('KeyW')?1:0)-(keys.has('KeyS')?1:0)+padMove.z};
    stepWaterTether(tether,dt,{x:input.x*Math.cos(yaw)-input.z*Math.sin(yaw),z:-input.x*Math.sin(yaw)-input.z*Math.cos(yaw)});
    const wanted=tether.position;const travel={x:(wanted.x-player.position.x)/dt,y:(wanted.y-player.position.y)/dt,z:(wanted.z-player.position.z)/dt};
    const result=moveAndCollide(player.position,travel,dt,collisionBuildings,player.grounded,heroBody);
    player.velocity.set(tether.velocity.x,tether.velocity.y,tether.velocity.z);player.grounded=result.grounded;
    const blocked=Math.hypot(player.position.x-wanted.x,player.position.y-wanted.y,player.position.z-wanted.z)>.1;
    const attr=grappleLine.geometry.attributes.position;attr.setXYZ(0,player.position.x,player.position.y+1.3,player.position.z);attr.setXYZ(1,tether.anchor.x,tether.anchor.y,tether.anchor.z);attr.needsUpdate=true;
    if(blocked||result.grounded){releaseTether();player.velocity.set(travel.x,travel.y,travel.z);}
  } else if (player.grapple) {
    const g=player.grapple;
    g.progress=Math.min(1,g.progress+dt/g.duration);
    const point=sampleGrapple(g,g.progress);
    player.position.set(point.x,point.y,point.z);
    player.facing=Math.atan2(g.target.x-g.start.x,g.target.z-g.start.z);player.velocity.set(0,0,0);
    const attr=grappleLine.geometry.attributes.position;
    attr.setXYZ(0,player.position.x,player.position.y+1.7,player.position.z);
    attr.setXYZ(1,g.target.x,g.target.y+1,g.target.z);attr.needsUpdate=true;
    if(g.progress>=1) {
      const chain=g.chainRequested;player.grapple=null;player.grounded=true;player.jumpAge=0;
      if(chain) {
        const next=selectGrappleTarget(player.position,forward(),grappleAnchors,collisionBuildings,getArmor(profile).id==='tactical'?170:145);
        if(next)startGrapple(next);
      }
    }
  } else {
    let x=padMove.x,z=padMove.z;
    if(keys.has('KeyW')) z++;
    if(keys.has('KeyS')) z--;
    if(keys.has('KeyA')) x--;
    if(keys.has('KeyD')) x++;
    const length = Math.hypot(x,z);
    const glide = !player.slam && !player.grounded && (player.velocity.y<3||player.launchGlide) && (keys.has('Space')||padJumpHeld||player.gliding) && player.jumpAge>.24;
    player.gliding = glide;
    player.slowTimer=Math.max(0,player.slowTimer-dt);
    activeWind=sampleWind(player.position,{gliding:glide,grappling:false,slamming:!!player.slam});
    const diving=glide&&(keys.has('ShiftLeft')||keys.has('ShiftRight')||padButtons[1]);
    const speed=(glide?(diving?30:22)+activeWind.boost+skillBonuses.glideBonus:crouching?4.8:(keys.has('ShiftLeft')||keys.has('ShiftRight'))?16:10)*(player.slowTimer>0?.65:1);
    const dx = (x*Math.cos(yaw)-z*Math.sin(yaw)) / Math.max(1,length);
    const dz = (-x*Math.sin(yaw)-z*Math.cos(yaw)) / Math.max(1,length);
    if (player.dodge <= .28 && player.momentumTimer<=0) {
      const smoothing = 1-Math.exp(-dt * (player.grounded ? 12 : 4));
      const glideForward = glide && !length;
      const tx = glideForward ? -Math.sin(yaw)*speed : dx*speed;
      const tz = glideForward ? -Math.cos(yaw)*speed : dz*speed;
      player.velocity.x = THREE.MathUtils.lerp(player.velocity.x, tx, smoothing);
      player.velocity.z = THREE.MathUtils.lerp(player.velocity.z, tz, smoothing);
    }
    if(length || glide) player.facing = Math.atan2(player.velocity.x,player.velocity.z);
    player.velocity.y = player.slam ? Math.max(-65,player.velocity.y-dt*40) : glide ? Math.max(diving?-18:-3.4,player.velocity.y-dt*(diving?24:activeWind.active?0:10)) : player.velocity.y-dt*29;
    if(!diving&&glide&&pitch<.1&&Math.hypot(player.velocity.x,player.velocity.z)>20)player.velocity.y=Math.min(1.5,player.velocity.y+dt*12);
    if(activeWind.active){player.velocity.y=Math.min(2.8,player.velocity.y+activeWind.lift*(1+skillBonuses.windBonus)*dt);}
    const result = moveAndCollide(player.position,player.velocity,dt,collisionBuildings,player.grounded,heroBody);
    if(result.landed)player.landing=.22;
    player.grounded = result.grounded;
    if(player.grounded) { player.gliding=false;player.launchGlide=false;player.jumpAge=0;if(player.slam)resolveSlam(); }
    else player.jumpAge += dt;
  }
  if(player.grapple||!player.gliding)activeWind={active:false,lift:0,boost:0,id:null};
  hero.scale.y=THREE.MathUtils.lerp(hero.scale.y,crouching&&player.grounded?.76:jumpCharging?.9:1,1-Math.exp(-dt*12));
  grappleLine.visible = !!tether;grappleLine.material.color.setHex(0x65dce9);
  hero.position.copy(player.position);
  let angle = Math.atan2(Math.sin(player.facing-hero.rotation.y),Math.cos(player.facing-hero.rotation.y));
  hero.rotation.y += angle * (1-Math.exp(-dt*12));
  hero.userData.update?.({ time: elapsed, moving: Math.hypot(player.velocity.x,player.velocity.z)>1 && player.grounded, gliding: player.gliding,landing:player.landing/.22,rolling:player.dodge>.1,rollPhase:1-player.dodge/.6, defending:combat.defenseWindow>0,finisher:combat.animation==='finisher', attacking:!!combat.animation,attackType:player.slam?'slam':combat.animation==='light'?'punch':combat.animation,attackPhase:player.slam ? .4 : combat.animationDuration?1-combat.animationTime/combat.animationDuration:0,grappling:!!player.grapple||!!tether });
  targetTimer-=dt;
  if(targetTimer<=0&&!player.grapple) {selectedAnchor=selectGrappleTarget(player.position,forward(),grappleAnchors,collisionBuildings,getArmor(profile).id==='tactical'?170:145);targetTimer=.12;}
  anchorMarker.visible = false;
  if(selectedAnchor) { anchorMarker.position.set(selectedAnchor.x,selectedAnchor.y+2,selectedAnchor.z); anchorMarker.rotation.y=elapsed; }
}

function takeDamage(amount,{attacker=null,parryable=true}={}) {
  if(mode!=='playing'||player.grapple||adventure.shielded())return false;
  const defense=resolveDefense(combat,{parryable});
  if(defense.parried) {
    lastDefense={kind:defense.perfect?'perfect':'parry',at:clock.running};
    if(attacker?.alive) {
      if(attacker.elite){attacker.elitePhase='exposed';attacker.phaseTime=2.8;}
      hitEnemy(attacker,defense.counterDamage,defense.stun,{focus:false});
    }
    areaPulse(player.position,0x77dcf0,2.7,.3);tone(defense.perfect?720:480,.14,'triangle',.04);
    toast(defense.perfect?'APARO PERFEITO · CONTRA-ATAQUE · +20 FOCO':'APARO · +20 FOCO',1.7);return false;
  }
  if(player.dodge>0||combat.animation==='finisher')return false;
  const damage=amount*getArmor(profile).defense*difficulty.damageMultiplier;
  if(playStyle==='patrol')patrolDamage+=damage;
  player.health=Math.max(0,player.health-damage);player.combo=0;player.comboTimer=0;
  shake=reducedMotion?.04:.18;tone(65,.16,'sawtooth',.03);
  if(player.health<=0)end(false);
  return true;
}
const projectileRay=new THREE.Ray(),projectileBox=new THREE.Box3();
function lineBlocked(start,end) {
  const delta=new THREE.Vector3().subVectors(end,start),length=delta.length();
  if(length<.001)return false;
  projectileRay.set(start,delta.normalize());
  const hit=new THREE.Vector3();
  for(const building of collisionBuildings) {
    projectileBox.min.set(building.x-building.w/2,Number.isFinite(building.baseY)?building.baseY:0,building.z-building.d/2);
    projectileBox.max.set(building.x+building.w/2,building.h,building.z+building.d/2);
    if(projectileRay.intersectBox(projectileBox,hit)&&hit.distanceTo(start)<length-.1)return true;
  }
  return false;
}
function shootVillain(enemy) {
  const definition=enemy.definition||{...ENEMY_ARCHETYPES[enemy.archetype],attackStyle:'guard'},start=enemy.model.position.clone().add(new THREE.Vector3(0,1.5,0));
  const target=player.position.clone().add(new THREE.Vector3(0,1.4,0));
  if(lineBlocked(start,target))return;
  const style=definition.attackStyle;
  const geometry=style==='guard'?new THREE.SphereGeometry(.16,6,4):style==='riddle'?new THREE.OctahedronGeometry(.24):style==='umbrella'?new THREE.SphereGeometry(.14,6,4):new THREE.ConeGeometry(.22,.7,8);
  const material=new THREE.MeshBasicMaterial({color:definition.color});
  const mesh=new THREE.Mesh(geometry,material);mesh.position.copy(start);scene.add(mesh);
  const velocity=target.sub(start).normalize().multiplyScalar(style==='umbrella'?22:style==='fire'?17:14);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),velocity.clone().normalize());
  hostileProjectiles.push({mesh,velocity,life:2.5,damage:definition.damage,style});
  tone(style==='fire'?160:440,.12,'sawtooth',.015);
}
function moveEnemy(enemy,dx,dz,dt) {
  if(enemy.terrain==='ground') {
    const velocity={x:dx,y:-1,z:dz};moveAndCollide(enemy.model.position,velocity,dt,collisionBuildings,true);
  } else {
    const nx=enemy.model.position.x+dx*dt,nz=enemy.model.position.z+dz*dt;
    const roof=world.rooftops.find(b=>Math.abs(b.h-enemy.home.y)<1&&Math.abs(enemy.home.x-b.x)<b.w/2&&Math.abs(enemy.home.z-b.z)<b.d/2);
    if(roof&&Math.abs(nx-roof.x)<roof.w/2-1.2&&Math.abs(nz-roof.z)<roof.d/2-1.2){enemy.model.position.x=nx;enemy.model.position.z=nz;}
  }
}
function updateEnemies(dt) {
  for(const enemy of enemies) {
    if(!enemyIsActive(enemy)){enemy.model.visible=false;continue;}
    if(!enemy.alive) {
      enemy.deadTime+=dt;enemy.model.rotation.z=Math.min(Math.PI/2,enemy.deadTime*5);enemy.model.position.y=enemy.home.y+.12;
      if(enemy.deadTime>2.2)enemy.model.visible=false;
      continue;
    }
    if(enemy.airborne){tickAirborne(enemy.airborne,dt,enemy.home.y);enemy.model.position.y=enemy.airborne.y;enemy.model.userData.update?.({time:elapsed,stunned:true});if(!enemy.airborne.finished)continue;enemy.airborne=null;}
    enemy.cooldown-=dt;enemy.hurt=Math.max(0,enemy.hurt-dt);enemy.stun=Math.max(0,(enemy.stun||0)-dt);
    const delta=v2.subVectors(player.position,enemy.model.position),dist=delta.length();
    const definition=enemy.definition,style=definition?.attackStyle;
    if(enemy.stun>0&&enemy.attackState==='windup'){enemy.attackState='ready';enemy.cooldown=.8;}
    let engaged=Math.abs(delta.y)<3.4&&dist<(definition?24:16);
    if(playStyle==='patrol') {
      const horizontal=Math.hypot(delta.x,delta.z);
      const facingDot=horizontal?(Math.sin(enemy.model.rotation.y)*delta.x+Math.cos(enemy.model.rotation.y)*delta.z)/horizontal:1;
      const eye=enemy.model.position.clone().add(new THREE.Vector3(0,1.7,0));
      const targetEye=player.position.clone().add(new THREE.Vector3(0,crouching?1:1.5,0));
      const smoked=areaEffects.some(effect=>effect.smoke&&effect.life>0&&effect.mesh.position.distanceTo(player.position)<10);
      updateAwareness(enemy,{dt:dt/(1+skillBonuses.stealthBonus),distance:dist,angleCos:facingDot,lineOfSight:Math.abs(delta.y)<3.4&&!lineBlocked(eye,targetEye),
        crouching,smoked,attacking:!!combat.animation||player.slam!==null});
      engaged=enemy.alerted&&Math.abs(delta.y)<3.4&&dist<24;
      if(enemy.indicator){enemy.indicator.material.color.setHex(enemy.alerted?0xff645d:enemy.awareness>.2?0xf0c36c:0x72d7bc);enemy.indicator.scale.setScalar(1+enemy.awareness);}
      if(!engaged&&enemy.stun<=0) {
        const targetX=enemy.home.x+Math.sin(elapsed*.45+(enemy.patrolPhase||0))*1.2;
        const dx=targetX-enemy.model.position.x;
        moveEnemy(enemy,dx*1.2,0,dt);
      }
    }
    const enraged=enemy.boss&&enemy.health<=enemy.maxHealth*.5;
    const speed=(definition?.speed||ENEMY_ARCHETYPES[enemy.archetype]?.speed||2.7)*difficulty.enemySpeedMultiplier*(enraged?1.18:1);
    if(engaged)enemy.model.rotation.y=Math.atan2(delta.x,delta.z);
    if(enemy.elite) {
      if(enemy.elitePhase==='shielded'&&engaged&&dist<7&&!player.grapple){enemy.elitePhase='winding';enemy.phaseTime=1.5;toast('BANE PREPARA UM GOLPE! Esquive e contra-ataque na abertura.',2);}
      else if(enemy.elitePhase==='winding') {
        enemy.phaseTime-=dt;
        if(enemy.phaseTime<=0){if(engaged&&dist<5&&!player.grapple)takeDamage(definition.damage,{attacker:enemy});enemy.elitePhase='exposed';enemy.phaseTime=2.8;toast('BANE EXPOSTO! Ataque com J, K ou Q.',2.5);}
      } else if(enemy.elitePhase==='exposed'){enemy.phaseTime-=dt;if(enemy.phaseTime<=0)enemy.elitePhase='shielded';}
      enemy.shield.visible=enemy.elitePhase!=='exposed';enemy.shield.material.color.setHex(enemy.elitePhase==='winding'?0xef6059:0x64bfd8);enemy.shield.rotation.z+=dt*2;
    }
    if(!enemy.boss) {
      const archetype=ENEMY_ARCHETYPES[enemy.archetype];
      const eye=enemy.model.position.clone().add(new THREE.Vector3(0,1.5,0));
      const target=player.position.clone().add(new THREE.Vector3(0,1.4,0));
      const visible=engaged&&!lineBlocked(eye,target);
      const attackResult=updateEnemyAttack(enemy.attackClock,{dt,inRange:visible&&dist<archetype.range&&!player.grapple,
        stunned:enemy.stun>0||enemy.hurt>0,archetype:enemy.archetype});
      enemy.attackState=attackResult.phase;enemy.attackTime=enemy.attackClock.remaining;
      if(engaged&&enemy.hurt<=0&&enemy.stun<=0&&attackResult.phase!=='windup') {
        if(dist>archetype.preferredDistance)moveEnemy(enemy,delta.x/(dist||1)*speed,delta.z/(dist||1)*speed,dt);
        else if(enemy.archetype==='shooter'&&dist<5)moveEnemy(enemy,-delta.x/(dist||1)*speed*.5,-delta.z/(dist||1)*speed*.5,dt);
      }
      if(attackResult.attack) {
        if(enemy.archetype==='shooter')shootVillain(enemy);else takeDamage(archetype.damage,{attacker:enemy});
      }
      enemy.warning.visible=attackResult.phase==='windup'||(playStyle==='patrol'&&enemy.awareness>.05);
      enemy.warning.material.color.setHex(attackResult.phase==='windup'?0xff7467:enemy.alerted?0xefb66e:0x72d7bc);
      enemy.warning.scale.setScalar(attackResult.phase==='windup'?1+attackResult.telegraph*1.4:1+enemy.awareness*.5);
      enemy.model.userData.update?.({time:elapsed+enemy.phase,moving:engaged&&dist>archetype.preferredDistance&&enemy.stun<=0&&attackResult.phase!=='windup',
        attacking:attackResult.phase==='windup',stunned:enemy.stun>0});
      enemy.model.scale.setScalar(enemy.baseScale*(enemy.hurt>0?1+Math.sin(enemy.hurt*50)*.035:1));
      continue;
    }
    enemy.warning.visible=enemy.elitePhase==='winding'||enemy.attackState==='windup';
    enemy.warning.material.color.setHex(enraged?0xff745c:0xefc367);
    enemy.warning.scale.setScalar(enraged?1.4:1);
    const ranged=['fire','umbrella','riddle'].includes(style);
    let desiredDistance=ranged?8:2.2;
    if(engaged&&enemy.hurt<=0&&enemy.stun<=0&&(!enemy.elite||enemy.elitePhase==='shielded')&&enemy.attackState!=='windup') {
      if(dist>desiredDistance)moveEnemy(enemy,delta.x/dist*speed,delta.z/dist*speed,dt);
      else if(ranged&&dist<4)moveEnemy(enemy,-delta.x/(dist||1)*speed*.6,-delta.z/(dist||1)*speed*.6,dt);
    }
    if(style==='swoop') {
      if(enemy.attackState==='windup') {
        enemy.attackTime-=dt;
        if(enemy.attackTime<=0) {
          if(engaged&&dist<7)moveEnemy(enemy,delta.x/(dist||1)*12,delta.z/(dist||1)*12,.22);
          if(engaged&&dist<5.5&&!player.grapple)takeDamage(definition.damage,{attacker:enemy});
          enemy.attackState='ready';enemy.cooldown=definition.attackInterval;
        }
      } else if(engaged&&dist<8&&enemy.cooldown<=0&&enemy.stun<=0){enemy.attackState='windup';enemy.attackTime=.65;toast('MORCEGO HUMANO MERGULHANDO! Esquive.',1.3);}
    } else if(ranged) {
      if(engaged&&dist<definition.attackRange&&enemy.cooldown<=0&&enemy.stun<=0){enemy.cooldown=definition.attackInterval*(enraged?.78:1);shootVillain(enemy);}
    } else if(!enemy.elite&&engaged&&dist<2.8&&enemy.cooldown<=0&&enemy.hurt<=0&&enemy.stun<=0&&!player.grapple) {
      enemy.cooldown=1.6;if(player.dodge<=0){takeDamage(9);toast('Guarda atacando! J combate · K chute · Shift esquiva',2);}
    }
    enemy.model.userData.update?.({time:elapsed+enemy.phase,moving:engaged&&dist>desiredDistance&&enemy.stun<=0,
      attacking:enemy.elite?enemy.elitePhase==='winding':enemy.attackState==='windup'||enemy.cooldown>(definition?.attackInterval||1.6)-.3,
      stunned:enemy.stun>0,exposed:enemy.elitePhase==='exposed',gliding:false,grappling:false});
    enemy.model.scale.setScalar(enemy.hurt>0?1+Math.sin(enemy.hurt*50)*.035:1);
  }
}

function updateEffects(dt) {
  for(let i=hostileProjectiles.length-1;i>=0;i--) {
    const shot=hostileProjectiles[i];shot.life-=dt;
    const next=shot.mesh.position.clone().addScaledVector(shot.velocity,dt);
    const center=player.position.clone().add(new THREE.Vector3(0,1.3,0));
    const contact=segmentSphereContact(shot.mesh.position,next,center,1.1);
    const hit=contact!==null;
    const contactPoint=hit?shot.mesh.position.clone().lerp(next,contact):next;
    const blocked=lineBlocked(shot.mesh.position,contactPoint);
    shot.mesh.position.copy(next);shot.mesh.rotation.z+=dt*5;
    if(hit&&!blocked){const damaged=takeDamage(shot.damage);if(damaged&&shot.style==='riddle'){player.slowTimer=1.5;toast('Enigma do Charada: movimento reduzido por um instante.',1.5);}}
    if(hit||blocked||shot.life<=0){scene.remove(shot.mesh);shot.mesh.geometry.dispose();shot.mesh.material.dispose();hostileProjectiles.splice(i,1);}
  }
  for(let i=projectiles.length-1;i>=0;i--) {
    const p=projectiles[i]; p.life-=dt;
    const target=p.enemy.model.position.clone().add(new THREE.Vector3(0,1.4,0));
    const delta=target.sub(p.mesh.position), d=delta.length();
    p.mesh.position.addScaledVector(delta.normalize(),Math.min(d,dt*55)); p.mesh.rotation.y+=dt*20;
    if(d<1||p.life<=0||!p.enemy.alive) {
      if(d<1&&p.enemy.alive)hitEnemy(p.enemy,1,.2);
      const next=p.bounces>0&&d<1?nearbyEnemies(13,p.enemy.model.position).find(e=>!p.visited.has(e)):null;
      if(next) {p.enemy=next;p.visited.add(next);p.bounces--;p.life=.7;toast('DISCO DE RESGATE · RICOCHETE',1.2);}
      else {scene.remove(p.mesh);p.mesh.geometry.dispose();p.mesh.material.dispose();projectiles.splice(i,1);}
    }
  }
  for(let i=areaEffects.length-1;i>=0;i--) {
    const effect=areaEffects[i];effect.life-=dt;
    if(effect.smoke){effect.material.opacity=.2*Math.max(0,effect.life/effect.duration);effect.mesh.position.y+=dt*.35;}
    else {effect.mesh.scale.setScalar(effect.radius*(1-effect.life/effect.duration));effect.material.opacity=.7*Math.max(0,effect.life/effect.duration);}
    if(effect.life<=0){scene.remove(effect.mesh);effect.geometry.dispose();effect.material.dispose();areaEffects.splice(i,1);}
  }
  for(let i=particles.length-1;i>=0;i--) {
    const p=particles[i]; p.life-=dt; p.velocity.y-=dt*12; p.mesh.position.addScaledVector(p.velocity,dt); p.mesh.scale.setScalar(Math.max(0,p.life*2));
    if(p.life<=0) {scene.remove(p.mesh);p.mesh.geometry.dispose();p.mesh.material.dispose();particles.splice(i,1);}
  }
  for(const site of objectives) site.visual.update(elapsed);
  const offset=player.position;
  if(rain.visible)for(let i=0;i<rainCount;i++) {
    const seed=rainSeeds[i], y=(seed[1]-elapsed*26)%65;
    const yy=(y+65)%65;
    rainPositions[i*6]=offset.x+seed[0]; rainPositions[i*6+1]=offset.y+yy; rainPositions[i*6+2]=offset.z+seed[2];
    rainPositions[i*6+3]=offset.x+seed[0]-.14; rainPositions[i*6+4]=offset.y+yy-1.5; rainPositions[i*6+5]=offset.z+seed[2]+.1;
  }
  if(rain.visible)rainGeometry.attributes.position.needsUpdate=true;
  if(toastTimer>0) {toastTimer-=dt;if(toastTimer<=0){$('toast')?.classList.remove('visible');show('toast',false);}}
}

function updateCamera(dt, snap=false) {
  const desiredFov=player.grapple||tether?68:player.gliding?65:Math.hypot(player.velocity.x,player.velocity.z)>13?63:60;
  const fov=THREE.MathUtils.lerp(camera.fov,cameraMotion?desiredFov:60,1-Math.exp(-dt*4));
  if(Math.abs(camera.fov-fov)>.01){camera.fov=fov;camera.updateProjectionMatrix();}
  const intro=mode==='intro';
  const angle=yaw+(intro&&cameraMotion ? Math.sin(elapsed*.065)*.1 : 0);
  const radius=Math.max(3,(intro ? 7.2 : player.gliding ? 12.5 : 8.8)+photoZoom);
  const target=player.position.clone().add(new THREE.Vector3(0,intro ? 1.3 : 1.2,0));
  const desired=new THREE.Vector3(player.position.x+Math.sin(angle)*radius,player.position.y+(intro ? 2.2 : 2.5+Math.sin(pitch)*radius),player.position.z+Math.cos(angle)*radius);
  const boom=clampCameraBoom(target,desired,collisionBuildings);desired.set(boom.x,boom.y,boom.z);
  if(snap) camera.position.copy(desired); else camera.position.lerp(desired,1-Math.exp(-dt*6));
  if(!cameraMotion)shake=0;
  if(shake>0) {camera.position.x+=(Math.random()-.5)*shake;shake=Math.max(0,shake-dt*.5);}
  const safeCamera=clampCameraBoom(target,camera.position,collisionBuildings);
  camera.position.set(safeCamera.x,safeCamera.y,safeCamera.z);
  if(intro)target.x-=1.7;
  camera.lookAt(target);
}

const mapCanvas=$('minimap'), map=mapCanvas?.getContext('2d');
function drawMap() {
  if(!map) return;
  const w=mapCanvas.width,h=mapCanvas.height,scale=.48;
  map.clearRect(0,0,w,h); map.fillStyle='#0a1720';map.fillRect(0,0,w,h);
  const tx=x=>w/2+(x-player.position.x)*scale,tz=z=>h/2+(z-player.position.z)*scale;
  map.strokeStyle='#1e3541';map.lineWidth=1;
  for(let x=-250;x<=250;x+=40){map.beginPath();map.moveTo(tx(x),0);map.lineTo(tx(x),h);map.stroke();}
  for(let z=-250;z<=250;z+=40){map.beginPath();map.moveTo(0,tz(z));map.lineTo(w,tz(z));map.stroke();}
  for(const b of world.buildings){map.fillStyle='#273d49';map.fillRect(tx(b.x-b.w/2),tz(b.z-b.d/2),b.w*scale,b.d*scale);}
  for(const s of objectives){if(s.disabled || (playStyle==='patrol'?s.missionId!=='patrol':s.missionId!==getCurrentMission(campaign)?.id))continue;const active=s.id===targetObjective()?.id;map.fillStyle=active?'#e8c47e':'#7197ac';map.beginPath();map.arc(THREE.MathUtils.clamp(tx(s.x),7,w-7),THREE.MathUtils.clamp(tz(s.z),7,h-7),active?4:3,0,Math.PI*2);map.fill();}
  for(const current of windCurrents.currents){map.strokeStyle='#59bbdd';map.beginPath();map.arc(tx(current.x),tz(current.z),4,0,Math.PI*2);map.stroke();}
  for(const e of enemies){if(!e.alive || !enemyIsActive(e))continue;map.fillStyle='#ec7169';map.beginPath();map.arc(tx(e.model.position.x),tz(e.model.position.z),2,0,Math.PI*2);map.fill();}
  const storyPoint=adventure.snapshot().objective;if(storyPoint){map.fillStyle='#ff927d';map.beginPath();map.arc(THREE.MathUtils.clamp(tx(storyPoint.x),7,w-7),THREE.MathUtils.clamp(tz(storyPoint.z),7,h-7),5,0,Math.PI*2);map.fill();}
  map.fillStyle='#72e8ed';map.fillRect(tx(-185)-3,tz(-28)-3,6,6);
  map.save();map.translate(w/2,h/2);map.rotate(-player.facing);map.fillStyle='#e9eee8';map.beginPath();map.moveTo(0,7);map.lineTo(-4,-4);map.lineTo(0,-2);map.lineTo(4,-4);map.closePath();map.fill();map.restore();
}

function updateHUD() {
  const healthPercent=Math.max(0,player.health/maxHealth()*100);
  setText('health-value',String(Math.ceil(healthPercent)).padStart(3,'0'));
  updateProgressHUD();
  if($('health-fill')) $('health-fill').style.width=`${healthPercent}%`;
  $('health-fill')?.classList.toggle('low',player.health<30);
  const mission = getCurrentMission(campaign), site = targetObjective();
  const position=objectivePosition();
  const distance = position ? distance3(player.position,position) : 0;
  setText('mission-villain',mission?VILLAINS[mission.id].name.toUpperCase():'LOS ANGELES SEGURA');
  setText('mission-terrain',mission?({ground:'MISSÃO TERRESTRE',roof:'MISSÃO NOS TELHADOS',air:'MISSÃO AÉREA'})[mission.terrain]:'PATRULHA CONCLUÍDA');
  const namedBoss=enemies.find(enemy=>enemy.boss&&enemy.missionId===mission?.id);
  show('boss-panel',!!namedBoss&&namedBoss.alive&&namedBoss.site===site?.id&&mode!=='intro');
  if(namedBoss){setText('boss-name',namedBoss.definition.name.toUpperCase());setText('boss-health-value',`${Math.max(0,Math.ceil(namedBoss.health))} / ${namedBoss.maxHealth}`);if($('boss-health-fill'))$('boss-health-fill').style.width=`${Math.max(0,namedBoss.health/namedBoss.maxHealth*100)}%`;}
  show('flight-progress',mission?.terrain==='air'&&mode!=='intro');
  if(mission?.terrain==='air')setText('flight-progress',`${objectives.filter(o=>o.kind==='flight'&&o.disabled).length} / 3 ANÉIS · ${site?.kind==='flight'?'PLANE COM A PRANCHA':'MORCEGO HUMANO À FRENTE'}`);
  const completed = mission ? campaign.objectiveCounts[mission.id] : 0;
  setText('mission-count', mission ? `${completed} / ${mission.objectives.length}` : 'OK');
  setText('mission-label', mission ? `MISSÃO ${String(campaign.currentMissionIndex+1).padStart(2,'0')} / ${String(MISSIONS.length).padStart(2,'0')}` : 'OPERAÇÃO CONCLUÍDA');
  setText('campaign-count', selectedMissionId ? 'OPERAÇÃO INDIVIDUAL' : `${campaign.completedMissionIds.length} / ${MISSIONS.length} MISSÕES`);
  setText('objective-type', mission ? missionTypeLabels[mission.type].toUpperCase() : 'LOS ANGELES SEGURA');
  setText('distance-value',String(Math.round(distance)));
  setText('objective-title',mission ? mission.title.toUpperCase() : 'OBJETIVOS CONCLUÍDOS');
  const guards = currentGuards();
  let description = site ? (distance<5 && !guards ? `Pressione F: ${site.interaction.toLowerCase()}.` : `${site.name} · ${guards ? `${guards} guarda${guards > 1 ? 's' : ''}${site.kind === 'finale' ? ' de elite' : ''}` : site.interaction}`) : 'Escolha outra missão no menu M.';
  if(site?.kind==='flight')description='Salte e segure Espaço / ✕ para planar pelo anel. O onda não conta.';
  if(site?.kind==='rescue'&&escort?.released) description='Escolte o civil até o círculo de extração. F quando ambos chegarem.';
  if(site?.kind==='evidence'&&!scannedClues.has(site.id)) description=`Ative R e analise a área: ${Math.min(100,Math.round(scanProgress/(getArmor(profile).scanBonus?1:2)*100))}%`;
  if(site?.kind==='finale'&&guards) { const elite=enemies.find(e=>e.elite&&e.alive); description=elite?.elitePhase==='exposed'?'Escudo desligado! Ataque com J ou Q.':'Bane prepara golpes pesados. Esquive e ataque durante a abertura.'; }
  setText('objective-description',description);
  setText('speed-value',String(Math.round(Math.hypot(player.velocity.x,player.velocity.z)*3.6)).padStart(2,'0'));
  let status=player.grapple?'ONDA CONECTADO':player.gliding?'PLANANDO':player.grounded?'PATRULHA ATIVA':'EM QUEDA · SEGURE ESPAÇO';
  if(site && distance<5) status=guards?'J COMBATE · Q DISCO DE RESGATE':`F  ${site.interaction.toUpperCase()}`;
  if(site?.kind==='rescue'&&escort?.released) status=distance<5?'F  CONFIRMAR EVACUAÇÃO':'ESCOLTE O CIVIL ATÉ A EXTRAÇÃO';
  if(site?.kind==='flight')status=player.gliding?'PRANCHA ATIVA · ATRAVESSE O ANEL':'SEGURE ESPAÇO / ✕ PARA PLANAR';
  if(mode==='intro') status='LOS ANGELES PRECISA DE VOCÊ';
  if(status!==lastStatus){setText('action-status',status);lastStatus=status;}
  setText('combo',combat.comboStep>1?`${combat.comboStep} / 3 COMBO`:'');
  setText('combat-status',player.slam?'IMPACTO AÉREO':combat.animation==='heavy'?'CHUTE PESADO':combat.comboStep?`COMBO ${combat.comboStep} / 3`:'COMBATE LIVRE');
  setText('focus-value',`${Math.round(combat.focus)} / 100`);
  if($('focus-fill'))$('focus-fill').style.width=`${combat.focus}%`;
  document.querySelector('.focus-meter')?.classList.toggle('is-ready',combat.focus>=100);
  const defenseHint=platformMode==='gamepad'||controllerConnected?'○ APARO / R3 ESPECIAL':document.body.classList.contains('platform-tablet')?'APARAR / GOLPE FINAL':'X APARA / B ESPECIAL';
  setText('defense-status',clock.running-lastDefense.at>=0&&clock.running-lastDefense.at<1.3?(lastDefense.kind==='perfect'?'APARO PERFEITO':'APARO CONFIRMADO'):combat.defenseWindow>0?'DEFESA ATIVA':combat.focus>=100?'B / R3 · FINALIZAÇÃO PRONTA':`${defenseHint} · 100 FOCO`);
  const threat=enemies.find(enemy=>enemyIsActive(enemy)&&enemy.alive&&(enemy.attackState==='windup'||enemy.elitePhase==='winding')&&distance3(player.position,enemy.model.position)<25);
  setText('threat-status',threat?`${threat.definition?.name||ENEMY_ARCHETYPES[threat.archetype]?.name||'INIMIGO'} PREPARA ATAQUE · APARE OU ESQUIVE`:'');
  show('threat-status',!!threat&&mode==='playing');
  setText('ability-status',`K ${combat.cooldowns.heavy>0?Math.ceil(combat.cooldowns.heavy)+'s':'PRONTO'} · L ${combat.cooldowns.slam>0?Math.ceil(combat.cooldowns.slam)+'s':'PRONTO'} · Z ${combat.cooldowns.smoke>0?Math.ceil(combat.cooldowns.smoke)+'s':'PRONTO'}`);
  setText('grapple-hint',jumpCharging?`SALTO CARREGADO · ${Math.round(jumpCharge*100)}% · SOLTE U`:tether?'Y · SOLTAR / ESPAÇO · SOLTAR E PLANAR':waveCooldown>0?`ONDA · ${waveCooldown.toFixed(1)} s`:'E · ONDA / Y · BALANÇO / U · SALTO');
  document.querySelector('[data-action="crouch"]')?.setAttribute('aria-pressed',String(crouching));
  show('patrol-readout',mode!=='intro');
  const awareness=Math.max(0,...enemies.filter(enemy=>enemyIsActive(enemy)&&enemy.alive).map(enemy=>enemy.awareness||0));
  setText('stealth-status',playStyle==='patrol'?`${crouching?'AGACHADO':'EM PÉ'} · ${awareness>=1?'ALERTA':`DETECÇÃO ${Math.round(awareness*100)}%`} · C / V`:'C / V · FURTIVIDADE NA PATRULHA LIVRE');
  setText('wind-status',activeWind.active?'CORRENTE DE AR · IMPULSO + SUSTENTAÇÃO':'ANÉIS AZUIS NO MAPA · CORRENTES PARA A PRANCHA');
  setText('patrol-timer','');
  if(playStyle==='patrol'&&patrolRun?.current) {
    const encounter=patrolRun.current;
    const remaining=Math.max(0,Math.ceil(encounter.timeLimit-(clock.running-patrolStarted)));
    setText('mission-label',`PATRULHA · OCORRÊNCIA ${patrolRun.round}`);
    setText('campaign-count',`${patrolRun.completed} RESOLVIDAS`);
    setText('mission-count',`${patrolRun.completed} ✓`);
    setText('objective-type',({ambush:'COMBATE',rescue:'ESCOLTA',bomb:'DESARME',chase:'PERSEGUIÇÃO'})[encounter.type]);
    setText('mission-terrain',encounter.terrain==='ground'?'RUAS DE LOS ANGELES':'TELHADOS DE LOS ANGELES');
    setText('mission-villain',encounter.type==='chase'?'MENSAGEIRO EM FUGA':'CRIME EM ANDAMENTO');
    setText('objective-title',encounter.title.toUpperCase());
    let instruction=encounter.description;
    if(encounter.type==='bomb')instruction=currentGuards()?'Afaste os guardas com combate ou finalizações por trás.':'F junto à bomba. Acerte três sincronizações antes de o tempo acabar.';
    if(encounter.type==='rescue')instruction=escort?.released?'Escolte o civil até o círculo; F quando ambos chegarem.':currentGuards()?'Neutralize os guardas e liberte o civil com F.':'F liberta o civil. Acompanhe-o até a extração.';
    if(encounter.type==='chase')instruction='O mensageiro com maleta dourada está correndo. Chegue a 3 m e pressione F / R2.';
    setText('objective-description',instruction);
    setText('patrol-timer',`${Math.floor(remaining/60)}:${String(remaining%60).padStart(2,'0')} · +${encounter.reward} XP · BÔNUS SEM DANO / FURTIVO`);
    show('boss-panel',false);show('flight-progress',false);
  }
  const narrative=adventure.snapshot();
  if(narrative.active){for(const site of objectives)site.visual.group.visible=false;show('boss-panel',false);}
  const cityName=narrative.state.city==='nami'?'PRAIA DE NAMI':'NEO TÓQUIO';
  const cityLabel=document.querySelector('.city-status>span:nth-child(2)');if(cityLabel)cityLabel.textContent=cityName;
  if(narrative.active&&narrative.objective){const objective=narrative.objective;setText('objective-title',objective.name);setText('objective-description',objective.text);setText('objective-type','ENERGIA DO OCEANO · ABISSAL');setText('mission-label',`CAPÍTULO ${narrative.state.chapter+1} / 6`);setText('mission-villain',cityName);setText('mission-count',`${narrative.state.collected.length} / 8 CRISTAIS`);setText('distance-value',String(Math.round(Math.hypot(player.position.x-objective.x,player.position.z-objective.z))));}
  drawMap();
}

function updateWaypoint() {
  const narrative=adventure.snapshot();const story=narrative.active?narrative.objective:null;
  const s=story||targetObjective(), el=$('waypoint');
  if(!s || !el || mode==='intro'){show('waypoint',false);return;}
  const point=story||objectivePosition();
  const pos=new THREE.Vector3(point.x,point.y+(s.kind==='flight'?0:7),point.z);
  const cameraSpace=pos.clone().applyMatrix4(camera.matrixWorldInverse);
  if(cameraSpace.z>0){show('waypoint',false);return;}
  pos.project(camera);
  show('waypoint',true);
  el.style.left=`${THREE.MathUtils.clamp((pos.x*.5+.5)*innerWidth,50,innerWidth-50)}px`;
  el.style.top=`${THREE.MathUtils.clamp((-pos.y*.5+.5)*innerHeight,100,innerHeight-130)}px`;
  setText('waypoint-distance',`${Math.round(distance3(player.position,point))} m`);
}

addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();graphics.resize();});
const adventure=createAdventure(THREE,{
 setTime:(v,t)=>graphics.setTime(v,t),orbit:delta=>{if(cameraMotion)yaw+=delta;},cameraMotion:()=>cameraMotion,setCameraMotion:value=>{cameraMotion=value;try{localStorage.setItem('kaito.camera-motion.v1',String(value));}catch{}},jumpHeld:()=>keys.has('Space')||padJumpHeld,boardStyle:id=>hero.userData.setBoardStyle(id),body:heroBody,shop:openArmory,launch:launchAttack,moveInput:()=>({x:padMove.x+(keys.has('KeyD')?1:0)-(keys.has('KeyA')?1:0),z:padMove.z+(keys.has('KeyW')?1:0)-(keys.has('KeyS')?1:0)}),swing:toggleTether,beginCharge:()=>{if(mode==='playing'&&player.grounded){jumpCharging=true;jumpCharge=0;}},releaseCharge:releaseChargedJump,faceObjective:q=>{yaw=Math.atan2(player.position.x-q.x,player.position.z-q.z);},waving:()=>waveTime>0,scene,player,hero,world,coast:losAngeles,solids:collisionBuildings,light:moonlight,rain,createCharacter:createKaito,
 getMode:()=>mode,setMode:value=>{if(mode==='photo'&&value==='playing')photoZoom=0;mode=value;keys.clear();},forward:()=>forward().clone(),wave:grapple,
 targets:nearbyEnemies,hit:hitEnemy,moveEnemy,roofTarget:()=>selectedAnchor,pull:startGrapple,toast,sound:tone,damage:takeDamage,
 resetCamera:()=>{tether=null;jumpCharging=false;jumpCharge=0;yaw=Math.PI/2;updateCamera(1,true);},zoom:delta=>{photoZoom=THREE.MathUtils.clamp(photoZoom+delta,-5,12);},
 save:()=>{persistProfile();if(playStyle==='campaign')persistCheckpoint();},reward:xp=>{profile=createProfile({...getProfileData(profile),xp:profile.xp+xp});persistProfile();renderArmory();}
});
const controlSettings=createControlSettings({player,getMode:()=>mode,setMode:value=>{mode=value;keys.clear();jumpCharging=false;jumpCharge=0;},startPlaying:()=>{if(mode==='intro')begin();else if(mode==='paused')pause();}});
reset();
renderMissions();
renderArmory();updateCheckpointUI();
function frame(now) {
  requestAnimationFrame(frame);
  const rawDelta=Math.max(0,(now-lastTime)/1000);lastTime=now;
  const steps=makeSimulationSteps(rawDelta),dt=steps.reduce((sum,step)=>sum+step,0);
  pollGamepad(Math.min(dt,.05));
  if(mode==='intro'||mode==='playing') {
    if(mode==='playing') {
      for(const step of steps) {
        if(mode!=='playing')break;
        elapsed+=step;clock.running+=step;updatePlayer(step);updateEnemies(step);
        if(mode==='playing'){updateMissionActivity(step);updatePatrol(step);adventure.update(step);}
      }
    } else {elapsed+=dt;hero.userData.update?.({time:elapsed,moving:false,gliding:false,attacking:false,grappling:false});}
    world.update?.(elapsed,dt);windCurrents.update(elapsed);cityLife.update(elapsed,player.position);updateEffects(dt);updateCamera(dt);
  } else if(mode==='challenge') {
    for(const step of steps){if(mode!=='challenge')break;clock.running+=step;updateChallenge(step);updatePatrol(step);}
  }
  hudTimer+=dt;
  if(hudTimer>.1){updateHUD();hudTimer=0;}
  if(mode!=='playing')adventure.update(0);if(mode==='photo')updateCamera(dt);
  soundscape.update({city:adventure.city(),weather:adventure.weather(),speed:Math.hypot(player.velocity.x,player.velocity.z),gliding:mode==='playing'&&player.gliding,inCombat:mode==='playing'&&enemies.some(enemy=>enemyIsActive(enemy)&&enemy.alive&&distance3(enemy.model.position,player.position)<22)});
  controlSettings.update(now);updateWaypoint();graphics.update(player.position,rawDelta,mode==='playing');
  if(mode==='character')characterPreview.render(renderer,now/1000,innerWidth,innerHeight);else if(adventure.map())adventure.renderMap(renderer);else graphics.render();adventure.afterRender(renderer);
}
requestAnimationFrame(frame);

// Read-only state for smoke checks and diagnosing user reports; no gameplay cheats.
window.__gotham = Object.freeze({
  snapshot: () => ({
    controls:controlSettings.snapshot(),adventure:adventure.snapshot(),character:{...KAITO_PROFILE,id:hero.userData.characterId,appearance:{...hero.userData.features},boardStyle:hero.userData.boardStyle,boardMode:hero.userData.boardMode||'carried'},heroBody:{...heroBody},clockRunning:clock.running,characterPreview:{open:mode==='character',...(characterPreview?.getState()||{angle:0})},
    accessibility:{cameraMotion},traversal:{swinging:!!tether,ropeLength:tether?.length??null,charge:jumpCharge,charging:jumpCharging},wave:{active:waveTime>0,cooldown:waveCooldown},mode,playStyle,crouching,difficulty:difficulty.id,wind:{...activeWind},
    skills:{unlocked:[...skillProfile.unlocked],points:getSkillPoints(skillProfile,skillProgress()),bonuses:{...skillBonuses}},checkpoint:checkpoint?{...checkpoint,completedMissionIds:[...checkpoint.completedMissionIds]}:null,
    cityLife:cityLife.getStats(),graphics:graphics.getStats?.()||null,lastDefense:{...lastDefense},
    patrol:patrolRun?{round:patrolRun.round,type:patrolRun.current?.type,remaining:Math.max(0,(patrolRun.current?.timeLimit||0)-(clock.running-patrolStarted)),completed:patrolRun.completed,failed:patrolRun.failed,damageTaken:patrolDamage,stealthCount:patrolStealth,finished:!!patrolRun.current?.finished,history:patrolRun.history.map(item=>({...item}))}:null,
    platformMode,controllerConnected,cameraYaw:yaw,health:player.health, maxHealth:maxHealth(),
    profile:getProfileData(profile),level:getLevel(profile),armorId:getArmor(profile).id,armorVisualId:hero.userData.armorId,storageAvailable,
    unlockedArmors:getUnlockedArmors(profile).map(a=>a.id),
    challenge:challenge?{kind:challenge.kind,progress:challenge.progress,cursor:challenge.cursor,zoneStart:challenge.zoneStart,zoneWidth:challenge.zoneWidth,pattern:[...challenge.pattern]}:null,
    scannerActive,scanProgress,scannedClues:[...scannedClues],
    escort:escort?{released:escort.released,evacuated:escort.evacuated,position:{x:escort.position.x,y:escort.position.y,z:escort.position.z},extraction:{...escort.extraction}}:null,
    position:{x:player.position.x,y:player.position.y,z:player.position.z},
    grounded:player.grounded,gliding:player.gliding,grappling:!!player.grapple,
    velocity:{x:player.velocity.x,y:player.velocity.y,z:player.velocity.z},slam:!!player.slam,
    combat:{focus:combat.focus,defenseWindow:combat.defenseWindow,defenseCooldown:combat.defenseCooldown,cooldowns:{...combat.cooldowns},comboStep:combat.comboStep,animation:combat.animation,lastAttack:combat.lastAttack},
    grappleProgress:player.grapple?.progress??null,grappleTarget:player.grapple?{...player.grapple.target}:null,grappleArcHeight:player.grapple?.arcHeight??null,
    graphicsQuality,collisionBuildings:collisionBuildings.map(b=>({...b})),
    missionId:getCurrentMission(campaign)?.id ?? null, selectedMissionId,
    missionIndex:campaign.currentMissionIndex, objectiveIndex:campaign.objectiveIndex,
    completedMissionIds:[...campaign.completedMissionIds], finished:campaign.finished,
    currentObjectiveId:targetObjective()?.id ?? null,
    enemies:enemies.map(e=>({health:e.health,maxHealth:e.maxHealth,position:{x:e.model.position.x,y:e.model.position.y,z:e.model.position.z},alive:e.alive,site:e.site,missionId:e.missionId,active:enemyIsActive(e),airborne:!!e.airborne,archetype:e.archetype,attackPhase:e.attackClock?.phase,attackRemaining:e.attackClock?.remaining,awareness:e.awareness||0,alerted:!!e.alerted,facing:e.model.rotation.y,elite:e.elite,elitePhase:e.elitePhase,phaseTime:e.phaseTime,stun:e.stun||0,boss:e.boss,villainId:e.definition?.id??null,attackStyle:e.definition?.attackStyle??'melee',attackState:e.attackState})),
    selectedAnchor:selectedAnchor?{x:selectedAnchor.x,y:selectedAnchor.y,z:selectedAnchor.z}:null,
    objectives:objectives.map(s=>({id:s.id,x:s.x,y:s.y,z:s.z,name:s.name,kind:s.kind,terrain:s.terrain,missionId:s.missionId,disabled:s.disabled})),
    missions:MISSIONS.map(m=>({id:m.id,title:m.title,terrain:m.terrain,villainId:m.villainId,objectives:m.objectives.map(o=>o.id)})),
    buildings:world.buildings.length,buildingStyles:world.buildingStyles.map(b=>({architecture:b.architecture,fingerprint:b.fingerprint})),hostileProjectileDetails:hostileProjectiles.map(shot=>({position:{x:shot.mesh.position.x,y:shot.mesh.position.y,z:shot.mesh.position.z},velocity:{x:shot.velocity.x,y:shot.velocity.y,z:shot.velocity.z},style:shot.style,damage:shot.damage})),hostileProjectiles:hostileProjectiles.length,rendererCalls:renderer.info.render.calls,
  }),
});
