const test=require('node:test'),assert=require('node:assert/strict');const S=require('../src/systems.js'),{Game,roofsByCity}=require('../src/core.js');
test('fixed simulation produces matching movement/jumps at 15, 30 and 60 render Hz',()=>{
 const results=[];for(const fps of [15,30,60]){const g=new Game({mission:20,city:'Aonami',x:60,z:150}),clock={};let peak=0;for(let i=0;i<fps;i++)S.advanceFixed(clock,1/fps,dt=>{g.tick(dt,{z:1,run:true,jump:i===0},0,g.colliders());peak=Math.max(peak,g.y);});results.push({x:g.x,z:g.z,y:g.y,time:g.time,peak});assert.equal(clock.dropped,0);}for(const r of results)for(const key of ['x','z','y','time','peak'])assert(Math.abs(r[key]-results[0][key])<1e-8,key);
});
test('long stalls have bounded catch-up and record discarded simulation time',()=>{
 const clock={};let calls=0;S.advanceFixed(clock,1,()=>calls++);assert.equal(calls,8);assert(clock.dropped>.8);assert(clock.accumulator<1/60);S.advanceFixed(clock,-1,()=>assert.fail('negative time cannot simulate'));
});
test('surf and tide sprint combine without slowing the surf boost',()=>{
 const g=new Game({mission:10,city:'Aonami',x:-100,z:-45});g.power(2);g.power(5);for(let i=0;i<40;i++)g.tick(.025,{x:1,run:true},0,g.colliders());assert(g.walkSpeed>15.8);
});
test('long surf is sustained with energy, ends on release and cannot pulse forever on empty energy',()=>{
 const g=new Game({mission:10,city:'Aonami',x:-120,z:-50});g.power(2);for(let i=0;i<600;i++)g.tick(.025,{x:1,run:true},0,g.colliders());assert(g.effects.surf>0);assert(g.surfSustaining);assert(g.energy>0&&g.energy<99);for(let i=0;i<10;i++)g.tick(.025,{},0,g.colliders());assert.equal(g.effects.surf,0);
 const low=new Game({mission:10,city:'Aonami',x:-100,z:-50});low.effects.surf=.15;low.energy=0;low.tick(.025,{x:1,run:true},0,low.colliders());assert.equal(low.effects.surf,0);for(let i=0;i<30;i++)low.tick(.025,{x:1,run:true},0,low.colliders());assert.equal(low.effects.surf,0);
});
test('coyote time allows a late roof-edge jump but not a second air jump',()=>{
 const roof=roofsByCity.Aonami[0],g=new Game({mission:10,city:'Aonami',roofId:roof.id,x:roof.x+roof.hx-.1,z:roof.z});let steps=0;while(g.grounded&&steps++<60)g.tick(1/60,{x:1,run:true},0,g.colliders());assert(!g.grounded);g.tick(1/60,{x:1},0,g.colliders());g.tick(1/60,{x:1,jump:true},0,g.colliders());assert(g.vy>0);assert.equal(g.coyoteTime,0);g.tick(1/60,{jump:false},0,g.colliders());const vy=g.vy;g.tick(1/60,{jump:true},0,g.colliders());assert(g.vy<vy,'cannot re-launch in the air');
});
test('attack buffering accepts a near-ready combo and does not queue arbitrary spam',()=>{
 const g=new Game({mission:8});assert(g.attack());assert(!g.queueAttack());for(let i=0;i<3;i++)g.tick(.05,{},0,g.colliders());assert(g.queueAttack());for(let i=0;i<4;i++)g.tick(.05,{},0,g.colliders());assert.equal(g.meleeStep,2);assert.equal(g.attackBuffer,0);
});
test('frame monitor reports measured cadence, p95 and optional memory with bounded storage',()=>{
 const m=new S.FrameMonitor();m.record(0,1);m.record(16,2);m.record(32,3);m.record(64,4);let s=m.snapshot({usedJSHeapSize:1048576});assert.equal(s.samples,3);assert.equal(s.fps,46.875);assert.equal(s.p95Ms,32);assert.equal(s.heapBytes,1048576);assert.equal(s.lastCpuMs,4);assert.equal(m.snapshot().heapBytes,null);for(let i=1;i<=200;i++)m.record(64+i*16,2);assert.equal(m.snapshot().samples,120);m.record(999999,1);assert.equal(m.snapshot().excludedPauses,1);
});
