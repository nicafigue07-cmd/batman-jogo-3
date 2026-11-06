const test=require('node:test'),assert=require('node:assert/strict');
const {Game}=require('../src/core.js');
const step=(g,seconds,input={})=>{for(let t=0;t<seconds;t+=.025)g.tick(.025,input,0,g.colliders());};
test('Surf de Maré acceleration, steering, boosted speed and obstacles use the simulation',()=>{
 const g=new Game({mission:4,x:0,z:-15});assert(g.power(2));step(g,.6,{x:1,run:true});assert(g.vx>15&&g.vx<16.01);assert.equal(g.swimming,false);const vx=g.vx;g.tick(.025,{z:1,run:true},0,[]);assert(g.vx>0&&g.vx<vx&&g.vz>0,'smooth carve');
 const wall={x:g.x+1,z:g.z,hx:.1,hz:8};for(let i=0;i<20;i++)g.tick(.025,{x:1,run:true},0,[wall]);assert(g.x<wall.x-.49,'boost cannot tunnel through walls');
 const jumping=new Game({mission:4,x:0,z:-15});jumping.power(2);jumping.tick(.025,{jump:true});assert(jumping.vy>7,'surf launch has real vertical impulse');
});
test('Deslize de Névoa is gated by story and bounded by air time, with no infinite flight',()=>{
 const locked=new Game({mission:1});locked.y=5;locked.vy=-5;locked.tick(.025,{jump:true});assert(!locked.gliding);
 const g=new Game({mission:3});g.y=12;g.vy=-5;g.wasJump=true;g.tick(.025,{jump:true});assert(g.gliding);assert(g.vy>=-2.6);assert(g.glideTime>0);step(g,2.1,{jump:true});assert(!g.gliding);assert(g.vy< -2.6);step(g,5,{jump:true});assert.equal(g.y,0);assert.equal(g.glideTime,0);assert(!g.gliding);g.tick(.025,{jump:false});g.tick(.025,{jump:true});assert(g.y>0);
});
test('basic combo is free, timed, directional and short range; shields enable a consumed counter',()=>{
 const g=new Game({mission:8});g.x=8;g.z=8;g.facing=Math.PI;for(const [i,e]of g.enemies.entries()){e.x=8+i*9;e.z=6;e.attack=100;}const e=g.enemies[0],initial=e.hp,energy=g.energy;
 assert(g.attack());assert.equal(g.energy,energy);assert.equal(e.hp,initial-21);assert(!g.attack());step(g,.275);assert(g.attack());assert.equal(g.meleeStep,2);step(g,.275);assert(g.attack());assert.equal(g.meleeStep,3);assert.equal(e.hp,0);
 step(g,1.2);assert.equal(g.meleeStep,0);const far=g.enemies[1].hp;g.facing=0;assert(g.attack());assert.equal(g.enemies[1].hp,far);
 const guarded=new Game({mission:8,x:6,z:8});guarded.facing=Math.PI;guarded.effects.shield=1;guarded.damage(10);assert(guarded.counter>0);guarded.attack();assert.equal(guarded.counter,0);assert(guarded.impacts.length>0);
});
test('melee can complete the actual combat mission, persists robot progress, and rejects transit',()=>{
 const g=new Game({mission:8});let safety=0;while(g.mission===8&&safety++<100){const enemy=g.enemies.find(e=>e.hp>0);g.x=enemy.x;g.z=enemy.z+1;g.facing=Math.PI;g.attack();step(g,.5);}assert.equal(g.mission,9);assert.equal(new Game(g.save()).mission,9);
 g.travel={city:'Hikaru',time:0};assert(!g.attack());g.travel=null;g.enterTower();assert(!g.attack());
});
test('training dummy resets without granting campaign or infinite rewards',()=>{
 const g=new Game({mission:3,x:-9,z:24});g.facing=Math.PI;const before=g.mission;let tries=0;while(g.training.hp>0&&tries++<15){g.attack();step(g,.5);}assert(g.training.hits>=3);assert.equal(g.mission,before);assert.equal(g.xp,before*60);assert(g.training.recover>0);step(g,2.1);assert.equal(g.training.hp,100);
});
test('outfits unlock through campaign, render selection persists, and unearned saves are rejected',()=>{
 const g=new Game();assert(!g.setOutfit('coast'));assert(!g.setOutfit('guardian'));assert(!g.setOutfit('invalid'));g.mission=10;assert(g.setOutfit('coast'));assert.equal(new Game(g.save()).outfit,'coast');g.mission=20;assert(g.setOutfit('guardian'));assert.equal(new Game(g.save()).outfit,'guardian');assert.equal(new Game({mission:0,outfit:'guardian'}).outfit,'classic');
});
