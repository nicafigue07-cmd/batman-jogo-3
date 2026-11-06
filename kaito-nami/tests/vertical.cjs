const test=require('node:test'),assert=require('node:assert/strict');
const {Game,roofSensors,roofsByCity}=require('../src/core.js'),S=require('../src/systems.js');
const tick=(g,n,input={})=>{for(let i=0;i<n;i++)g.tick(.025,input,0,g.colliders());};
test('all three sensor roofs can be reached from street level with running/jumping and reward once',()=>{
 let collected=[];
 for(const [index,roof]of roofSensors.entries()){
  const g=new Game({mission:10,city:'Hikaru',x:roof.x-roof.wall.hx-.5,z:roof.z,roofSensors:collected});let limit=0;
  while(g.y<roof.height+.1&&limit++<250)g.tick(.025,{x:1,run:true,jump:true},0,g.colliders());assert(limit<250,'wall ascent '+index);
  for(let i=0;i<160;i++)g.tick(.025,{x:Math.max(-1,Math.min(1,(roof.x-g.x)*2))},0,g.colliders());
  assert(g.grounded);assert(Math.abs(g.y-roof.height)<.01);assert(g.interact());assert(g.roofSensors.includes(index));assert(g.save().roofId);const saved=g.save(),restored=new Game(saved);assert.deepEqual(restored.save(),saved);assert.equal(restored.y,g.y);const points=g.upgradePoints;g.interact();assert.equal(g.upgradePoints,points);collected=g.roofSensors;
 }
 assert.equal(collected.length,3);assert.equal(new Game({mission:10,roofSensors:collected}).upgradePoints,4);
});
test('walking off a roof falls to the real ground and walking into a wall cannot teleport upward',()=>{
 const roof=roofsByCity.Aonami[0],g=new Game({mission:10,city:'Aonami',roofId:roof.id,x:roof.x,z:roof.z});assert.equal(g.y,roof.height);tick(g,200,{x:1});assert.equal(g.y,0);assert(g.grounded);
 const blocked=new Game({mission:10,city:'Aonami',x:roof.x-roof.wall.hx-.5,z:roof.z});tick(blocked,100,{x:1,run:true});assert.equal(blocked.y,0);assert(blocked.x<roof.x-roof.wall.hx);
});
test('wall ascent is story gated and finite, with kick and controlled slide',()=>{
 const roof=roofsByCity.Hikaru[0],make=mission=>new Game({mission,city:'Hikaru',x:roof.x-roof.wall.hx-.42,z:roof.z});const locked=make(4);tick(locked,160,{x:1,run:true,jump:true});assert(locked.y<2,'ordinary jump cannot reach the roof');
 const g=make(10);tick(g,18,{x:1,run:true,jump:true});assert(g.wallRunning&&g.y>2);tick(g,1,{x:1,jump:false});tick(g,1,{x:1,jump:true});assert(g.vx<0&&g.vy>0,'kick launches away from wall');assert(g.wallKickCooldown>0);
 const sliding=make(10);tick(sliding,15,{x:1,run:true,jump:true});tick(sliding,30,{x:1,jump:true});assert(sliding.vy>=-2.5);assert(sliding.wallSliding);tick(sliding,300,{jump:true});assert.equal(sliding.y,0);
});
test('practice steps are climbed automatically and corrupt roof saves cannot spawn inside a building',()=>{
 const g=new Game({mission:3,x:-12,z:7});let highest=0;for(let i=0;i<90;i++){g.tick(.025,{x:1},0,g.colliders());highest=Math.max(highest,g.y);}assert(highest>=.89);assert.equal(g.y,0);
 const bad=new Game({mission:10,city:'Hikaru',roofId:'Hikaru-0',x:0,z:0});assert.equal(bad.y,0);const wrongCity=new Game({mission:10,city:'Aonami',roofId:'Hikaru-0',x:-25,z:16});assert.equal(wrongCity.y,0);
});
test('frustum rejection keeps intersecting objects and reuses its storage',()=>{
 const identity=new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]),out=new Float32Array(24);assert.equal(S.frustum(identity,out),out);assert(S.visibleSphere(out,0,0,0,.1));assert(S.visibleSphere(out,1.2,0,0,.3));assert(!S.visibleSphere(out,1.4,0,0,.3));assert(!S.visibleSphere(out,0,0,-2,.2));
});
test('world clock and daylight form a real cycle and citizens return to their resting route at night',()=>{
 assert.equal(S.worldClock(0),'10:00');assert.equal(S.worldClock(240),'22:00');assert(S.daylight(0)>.8);assert(S.daylight(240)<.25);assert(Math.abs(S.daylight(0)-S.daylight(480))<1e-8);const g=new Game({worldTime:240});const person=g.citizens.Aonami[0];g.tick(.025,{},0,g.colliders());assert.equal(person.activity,'descansando no bairro');assert.equal(S.preferences({dialogueVolume:999}).dialogueVolume,100);
});
test('camera searches another orbit around close rooftop equipment without crossing walls',()=>{
 const target=[0,1,0],desired=[0,3,8],equipment={x:0,z:1,hx:.5,hz:.3,height:5};const clipped=S.cameraPosition(target,desired,[equipment]);assert(Math.hypot(clipped[0],clipped[2])<1);const safe=S.safeCamera(target,desired,[equipment]);assert(Math.hypot(safe[0],safe[2])>=2.4);assert.deepEqual(S.cameraPosition(target,safe,[equipment]),safe);
});
