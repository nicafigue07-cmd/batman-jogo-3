const test=require('node:test'),assert=require('node:assert/strict');
const K=require('../src/core.js'),S=require('../src/systems.js');
const tick=(g,n,input={})=>{for(let i=0;i<n;i++)g.tick(.025,input,0,g.colliders());};
test('formerly decorative buildings now stop running, surfing and dodging at their real footprint',()=>{
 for(const mode of ['run','surf','dodge']){const g=new K.Game({mission:10,city:'Aonami',x:-40,z:41});if(mode==='surf')g.power(2);if(mode==='dodge')g.dodge({x:0,z:1});tick(g,80,{z:1,run:true});assert(g.z<=43.101,mode);assert.equal(g.y,0);}
});
test('every registered ground scenery volume blocks a fast crossing and rotated rectangles stay solid',()=>{
 for(const city of ['Aonami','Hikaru'])for(const o of K.sceneProps[city].filter(o=>o.nav)){const distance=Math.hypot(o.hx,o.hz)+2,p={x:o.x-distance,z:o.z};S.move(p,distance*2,0,[o]);assert(p.x<o.x,o.id);assert(!S.overlaps(p.x,p.z,o),o.id);}
 const o={x:0,z:0,hx:2,hz:.08,rot:Math.PI/4},p={x:-4,z:0};S.move(p,8,0,[o]);assert(p.x<0);assert(!S.overlaps(p.x,p.z,o));let inside={x:0,z:0};S.pushOut(inside,[o]);assert(!S.overlaps(inside.x,inside.z,o));assert(S.containsRect(.5,-.5,o));assert(!S.containsRect(.5,.5,o));
});
test('beach furniture blocks the body and an umbrella stops a jumping head without blocking walking underneath',()=>{
 const g=new K.Game({mission:10,city:'Aonami',x:-13,z:24});tick(g,90,{z:-1,run:true});assert(g.z>20.6,'cannot run through lounge chair');const shade=new K.Game({mission:10,city:'Aonami',x:-12,z:17});let top=0;for(let i=0;i<40;i++){shade.tick(.025,{jump:true},0,shade.colliders());top=Math.max(top,shade.y);}assert(top<.3,'head hits canopy underside');assert.equal(shade.y,0);
});
test('tower furniture and elevator door collide while terminals and lift remain usable',()=>{
 const g=new K.Game({mission:12,city:'Hikaru',interior:'hikari',floor:1,x:0,z:0});tick(g,80,{z:1,run:true});assert(g.z<2.71);assert(g.interact());assert.equal(g.mission,13);const door=new K.Game({mission:12,city:'Hikaru',interior:'hikari',x:3,z:0});tick(door,70,{z:1,run:true});assert(door.z<2.7);assert(door.interact());assert(door.lift);tick(door,90);assert.equal(door.floor,1);
});
test('elevated track has a clear underpass and a solid underside',()=>{
 const g=new K.Game({mission:10,city:'Hikaru',x:0,z:41});tick(g,50,{z:1,run:true});assert(g.z>44,'can walk under the track');const under=new K.Game({mission:10,city:'Hikaru',x:0,z:43});under.power(4);let peak=0;for(let i=0;i<60;i++){under.tick(.025,{},0,under.colliders());peak=Math.max(peak,under.y);}assert(peak<=2.526,'head cannot jump through the rail deck');
});
test('moving train carries a supported player and its altitude save restores correctly',()=>{
 const g=new K.Game({mission:20,city:'Hikaru',roofId:'train-0',x:0,z:43});assert.equal(g.y,6.7);const start=g.x;tick(g,20);assert(g.x>start+1);assert.equal(g.y,6.7);assert.equal(g.save().roofId,'train-0');assert.deepEqual(new K.Game(g.save()).save(),g.save());
});
test('indoor supported furniture saves and invalid roof locations resolve outside scenery',()=>{
 const g=new K.Game({mission:13,city:'Hikaru',interior:'hikari',floor:1,x:0,z:3.5,roofId:'interior-terminal'});assert.equal(g.y,1.4);assert.deepEqual(new K.Game(g.save()).save(),g.save());const wall=K.sceneProps.Aonami.find(o=>o.id==='coastal-building-0');const repaired=new K.Game({mission:10,city:'Aonami',x:wall.x,z:wall.z});assert(!S.overlaps(repaired.x,repaired.z,wall));
});

test('water attacks cannot damage a robot through a physical umbrella pole',()=>{
 const g=new K.Game({mission:8,city:'Aonami',x:-14.2,z:18});const e={...g.enemies[0],x:-12,z:18,hp:100,maxHp:100};g.enemies=[e];g.facing=Math.PI/2;assert(!g.targetVisible(e));g.attack();assert.equal(e.hp,100);g.power(0);assert.equal(e.hp,100);
});
test('ocean mist suppresses distant robot attacks, preserves detection nearby and ends when Kaito attacks',()=>{
 const g=new K.Game({mission:8,city:'Aonami',x:20,z:6});for(const e of g.enemies)e.attack=-1;assert(g.power(7));g.tick(.025,{},0,g.colliders());assert(g.enemies.every(e=>e.unaware&&e.warning===0));const e=g.enemies[0];g.x=e.x;g.z=e.z+2;g.tick(.025,{},0,g.colliders());assert(!e.unaware);assert(e.warning>0);g.attack();assert.equal(g.effects.mist,0);
 const boss=new K.Game({mission:18,city:'Aonami',x:103,z:-30});boss.power(7);boss.enemies[0].attack=-1;boss.tick(.025,{},0,boss.colliders());assert(!boss.enemies[0].unaware);assert(boss.enemies[0].warning>0);
});
test('surf cannot cross the main characters and close robots retain body separation',()=>{
 const g=new K.Game({mission:10,city:'Aonami',x:-20,z:10});g.power(2);tick(g,80,{x:1,run:true});assert(g.x<=-17.799,'Ren has body collision');const fight=new K.Game({mission:8,city:'Aonami',x:3,z:6});tick(fight,80,{x:1,run:true});assert(fight.enemies.some(e=>e.hp>0));assert(fight.enemies.every(e=>Math.hypot(fight.x-e.x,fight.z-e.z)>.8));
});
test('the old cliff transition now crosses above the rock instead of teleporting through it',()=>{
 const g=new K.Game({mission:6,city:'Aonami',x:-26,z:0}),rock=K.sceneProps.Aonami.find(o=>o.id==='coastal-rock');assert(g.interact());assert(g.climbing);const positions=new Set();for(let i=0;i<70;i++){g.tick(.025,{},0,g.colliders());positions.add(g.x.toFixed(2)+','+g.z.toFixed(2));if(g.y<rock.height-.025)assert(!S.overlaps(g.x,g.z,rock));}assert(!g.climbing);assert(positions.size>10);assert.equal(g.y,0);
});
test('finite obstacle heights allow flight above palms without an invisible infinite wall',()=>{
 const g=new K.Game({mission:10,city:'Aonami',x:26,z:11});g.y=10;g.grounded=false;tick(g,20,{x:1,run:true});assert(g.x>28);assert(g.y>6);assert(g.traffic.Aonami.every(c=>c.height===1.2));
});
