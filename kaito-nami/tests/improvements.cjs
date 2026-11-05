const test=require('node:test'),assert=require('node:assert/strict');
const S=require('../src/systems.js'),{Game,obstaclesByCity,powers}=require('../src/core.js');
test('swept movement stops at thin walls and slides along rectangular corners',()=>{
 const wall={x:0,z:0,hx:.06,hz:3};let p={x:-2,z:0};S.move(p,5,0,[wall]);assert(p.x<=-.4599);assert(!S.overlaps(p.x,p.z,wall));
 p={x:-2,z:-2};S.move(p,3,4,[wall]);assert(!S.overlaps(p.x,p.z,wall));assert(p.z>1);
});
test('initial penetration and school-building corners are repaired',()=>{
 const school=obstaclesByCity.Aonami.find(o=>o.kind==='school');assert(S.overlaps(school.x+3.4,school.z+2.4,school));
 const g=new Game({x:school.x,z:school.z});assert(!S.overlaps(g.x,g.z,school));
 const copy=new Game(g.save());assert.equal(copy.x,g.x);assert.equal(copy.z,g.z);
});
test('camera clipping and transitions remain outside walls',()=>{
 const wall={x:0,z:3,hx:4,hz:.12},target=[0,1,0],camera=S.cameraPosition(target,[0,6,10],[wall]);assert(camera[2]<2.8);assert(!S.overlaps(camera[0],camera[2],wall,.22));
 const close=S.cameraPosition([0,1,2.6],[0,6,10],[wall]);assert(Number.isFinite(close[2]));assert(Math.hypot(close[0],close[2]-2.6)>0);
});
test('gamepad look has the same speed at 30 and 60 FPS and malformed inputs stay neutral',()=>{
 const pad={connected:true,mapping:'standard',axes:[0,0,1,.4],buttons:Array.from({length:16},()=>({pressed:false}))};
 const fast=S.gamepad(pad,[],1/60),slow=S.gamepad(pad,[],1/30);assert(Math.abs(fast.lookX*60-slow.lookX*30)<1e-9);
 assert.deepEqual(S.stick(NaN,Infinity),{x:0,z:0});assert.equal(S.gamepad({axes:[],buttons:[],mapping:'strange'}).x,0);
 pad.buttons[2].pressed=true;assert(S.gamepad(pad,[],.016).pressed[2]);assert(!S.gamepad(pad,S.gamepad(pad).buttons,.016).pressed[2]);
});
test('damaged preferences cannot create a zero-sized canvas or conflicting bindings',()=>{
 const p=S.preferences({quality:'oops',distance:Infinity,sensitivity:-7,volume:'oops',bindings:{forward:'KeyQ',back:'KeyK'},music:999});
 assert.equal(p.quality,'1.5');assert.equal(p.distance,95);assert.equal(p.volume,35);assert.equal(p.music,100);assert.equal(p.bindings.forward,'KeyW');assert.equal(p.bindings.back,'KeyS');assert.equal(p.sensitivity,.5);
});
test('an old save containing all three clues no longer softlocks mission eight',()=>{
 const g=new Game({mission:7,city:'Aonami',clues:[0,1,2]});assert.equal(g.mission,8);assert.equal(g.enemies.length,3);
});
test('mid-combat saves preserve disabled robots and boss energy',()=>{
 const g=new Game({mission:18,city:'Aonami',x:102,z:-31});g.enemies[0].hp=123;const restored=new Game(g.save());assert.equal(restored.enemies[0].hp,123);assert.equal(restored.mission,18);
 const battle=new Game({mission:14,city:'Hikaru'});battle.enemies[0].hp=0;assert.equal(new Game(battle.save()).enemies[0].hp,0);
});
test('power upgrades spend earned points, persist and improve actual costs/recarga',()=>{
 const g=new Game({mission:6});assert.equal(g.upgradePoints,2);assert(g.upgrade(0));assert(g.upgrade(0));assert(!g.upgrade(0));assert.equal(g.upgradePoints,0);
 g.power(0);assert(g.cooldowns[0]<powers[0].cooldown);assert(g.energy>100-powers[0].cost);const restored=new Game(g.save());assert.equal(restored.upgrades[0],2);assert.equal(restored.upgradePoints,0);
 assert.equal(new Game({mission:0,upgrades:[3,3,3]}).upgrades.reduce((a,b)=>a+b,0),0);
});
test('enemy windups lock their area, respect collisions and expose three boss phases',()=>{
 const g=new Game({mission:18,city:'Aonami',x:103,z:-32});const e=g.enemies[0];e.attack=0;g.tick(.05,{},0,g.colliders());assert(e.warning>0);const x=e.x,z=e.z;g.x+=1;g.tick(.05,{},0,g.colliders());assert.equal(e.x,x);assert.equal(e.z,z);
 e.hp=100;e.warning=0;g.tick(.05,{},0,g.colliders());assert.equal(e.phase,2);
 const b=new Game({mission:14,city:'Hikaru'});assert(new Set(b.enemies.map(e=>e.kind)).size>=3);
});
test('hurt grace prevents simultaneous hits without erasing subsequent attacks',()=>{
 const g=new Game();g.damage(10);g.damage(10);assert.equal(g.hp,90);for(let i=0;i<14;i++)g.tick(.05);g.damage(10);assert.equal(g.hp,80);
});
test('the terminal nearest the player wins over an overlapping elevator interaction',()=>{
 const g=new Game({mission:12,city:'Hikaru',interior:'hikari',floor:1,x:1.3,z:2.8});g.interact();assert.equal(g.mission,13);assert.equal(g.lift,null);
});
test('traffic yields to Kaito and citizens actually move and can be spoken to',()=>{
 const g=new Game();const car=g.traffic.Aonami[0];g.x=car.x+2;g.z=car.z;const before=car.x;g.updateCity(.05,[]);assert.equal(car.x,before);assert(car.stopped);
 const person=g.citizens.Aonami[0],px=person.x,pz=person.z;g.x=-5;g.z=10;for(let i=0;i<30;i++)g.updateCity(.05,[]);assert(Math.hypot(person.x-px,person.z-pz)>.5);g.x=person.x;g.z=person.z;g.interact();assert(g.events.some(e=>e.type==='dialog'&&e.text.startsWith(person.name+':')));
});
test('surf-school lessons require surfing through all rings and award a point only once',()=>{
 const K=require('../src/core.js'),g=new Game({mission:3});g.x=-20;g.z=15;g.interact();assert(g.sideRace?.lesson);
 g.x=K.surfRings[0].x;g.z=K.surfRings[0].z;g.tick(.05);assert.equal(g.sideRace.index,0);
 for(const r of K.surfRings){g.energy=100;g.cooldowns[2]=0;g.power(2);g.x=r.x;g.z=r.z;g.tick(.05);}assert(g.lessonDone);assert.equal(g.upgradePoints,2);assert(new Game(g.save()).lessonDone);
});

test('cinematic power effects advance without advancing combat or energy',()=>{const g=new Game({mission:18});g.power(9);const hp=g.hp,energy=g.energy,time=g.time,enemy=g.enemies[0].hp;g.tickVisual(.05);assert.equal(g.pulses[0].age,.05);assert(g.powerTime<.6);assert.equal(g.hp,hp);assert.equal(g.energy,energy);assert.equal(g.time,time);assert.equal(g.enemies[0].hp,enemy);for(let i=0;i<25;i++)g.tickVisual(.05);assert.equal(g.pulses.length,0);});
test('acceleration and braking are smooth and approximately frame-rate independent',()=>{
 const run=dt=>{const g=new Game();for(let t=0;t<1-dt/2;t+=dt)g.tick(dt,{x:1});return g;};const a=run(1/60),b=run(1/30);assert(a.vx>4.4&&a.vx<=4.5);assert(Math.abs(a.x-b.x)<.06);const x=a.x;for(let i=0;i<20;i++)a.tick(.016,{});assert(Math.abs(a.vx)<.02);assert(a.x-x<.3);
 const first=new Game();first.tick(.016,{x:1});assert(first.vx>0&&first.vx<4.5);const second=first.vx;first.tick(.016,{x:1});assert(first.vx>second);
});
test('jump buffering accepts a press just before landing without auto-bouncing',()=>{
 const g=new Game();g.y=.015;g.vy=-1;g.tick(.016,{jump:true});for(let i=0;i<3;i++)g.tick(.016,{jump:true});assert(g.y>0&&g.vy>0);for(let i=0;i<80;i++)g.tick(.016,{jump:true});assert.equal(g.y,0);
});
test('dodge uses its chosen direction and transit clears carried velocity',()=>{
 const g=new Game({mission:9});g.facing=Math.PI;g.dodge({x:1,z:0});g.tick(.05,{x:-1});assert(g.x> -14);assert(g.vx>0);g.x=22;g.z=-8;g.interact();for(let i=0;i<61;i++)g.tick(.05,{});assert.equal(g.city,'Hikaru');assert.equal(g.vx,0);assert.equal(g.vz,0);
});
test('camera zoom follows the whole ray and interior walls have real heights',()=>{
 const target=[0,1,0],desired=[0,6,10],wall={x:0,z:3,hx:4,hz:.1,height:7};const camera=S.cameraPosition(target,desired,[wall]);assert(camera[2]<3);assert(camera[1]<3);assert(Math.abs((camera[1]-1)/(camera[2]||1)-.5)<1e-8);
 const g=new Game({mission:12,city:'Hikaru',interior:'hikari',floor:1});assert(g.cameraColliders().every(w=>w.height>=8));
});
