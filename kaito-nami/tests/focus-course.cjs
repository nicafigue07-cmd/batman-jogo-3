const test=require('node:test'),assert=require('node:assert/strict');
const {Game,tideCourse}=require('../src/core.js'),S=require('../src/systems.js');
const tick=(g,t,input={})=>{for(let elapsed=0;elapsed<t;elapsed+=.025)g.tick(.025,input,0,g.colliders());};
test('focus chooses a visible nearby living enemy and drops dead, distant or occluded targets',()=>{
 const g=new Game({mission:8,x:6,z:8});g.enemies[1].z=20;g.enemies[2].z=20;assert(g.toggleTarget());assert.equal(g.getCombatTarget().id,0);g.facing=0;g.aimAtTarget();assert.equal(g.facing,Math.PI);assert(!g.toggleTarget());assert.equal(g.getCombatTarget(),null);assert(g.toggleTarget());g.enemies[0].hp=0;assert.equal(g.getCombatTarget(),null);assert(g.toggleTarget());g.x=-100;assert.equal(g.getCombatTarget(),null);
 const behindSchool=new Game({mission:8,x:-21,z:14});for(const e of behindSchool.enemies){e.x=-21;e.z=24;}assert(!behindSchool.toggleTarget(),'cannot lock through the surf school');
});
test('combat and boss camera framing is smooth, bounded and disabled by reduced motion',()=>{
 const player={x:0,z:0},enemy={x:10,z:0,boss:true},out={};const r=S.combatFraming(player,enemy,0,.025,false,out);assert.equal(r,out);assert(r.angle<0&&r.angle> -Math.PI/2);assert.equal(r.distance,2);assert.equal(r.fov,4);assert(r.x>0&&r.x<=3);
 S.combatFraming(player,enemy,1,.025,true,out);assert.equal(out.angle,1);assert.equal(out.x,0);assert.equal(out.distance,0);assert.equal(out.fov,0);
 let a=0,b=0;for(let i=0;i<30;i++)a=S.combatFraming(player,enemy,a,1/30,false).angle;for(let i=0;i<60;i++)b=S.combatFraming(player,enemy,b,1/60,false).angle;assert(Math.abs(a-b)<1e-10);
 const wall={x:1,z:0,hx:.1,hz:5};assert(S.cameraPosition([0,1,0],[3,2,0],[wall])[0]<.7);
});
test('trial gates require surfing and a real jump; timeout and cancellation permit retry',()=>{
 const g=new Game({mission:3});assert(g.startTideTrial());g.x=tideCourse[0].x;g.z=tideCourse[0].z;tick(g,.025);assert.equal(g.tideTrial.index,0);assert(g.power(2));tick(g,.025);assert.equal(g.tideTrial.index,1);g.x=tideCourse[1].x;g.z=tideCourse[1].z;tick(g,.025);assert.equal(g.tideTrial.index,1,'grounded character misses elevated gate');g.y=1.5;g.vy=0;tick(g,.025);assert.equal(g.tideTrial.index,2);g.tideTrial.elapsed=25;tick(g,.025);assert.equal(g.tideTrial,null);assert(g.startTideTrial());assert(!g.startTideTrial());assert.equal(g.tideTrial,null);assert(!new Game({mission:2}).startTideTrial());
});
test('entire course can be navigated with normal movement, surf and jump; reward is unique and saved',()=>{
 const g=new Game({mission:3,x:-12,z:17});assert(g.interact());assert(g.tideTrial);assert(g.power(2));let frames=0;
 while(g.tideTrial&&frames++<1000){const target=tideCourse[g.tideTrial.index],dx=target.x-g.x,dz=target.z-g.z,d=Math.hypot(dx,dz);g.tick(.025,{x:dx/d,z:dz/d,run:true,jump:target.y>0&&d<5.5},0,g.colliders());}
 assert(frames<1000);assert(g.tideDone);assert(g.tideRecord>0&&g.tideRecord<25);assert.equal(g.upgradePoints,2);const restored=new Game(g.save());assert(restored.tideDone);assert.equal(restored.tideRecord,g.tideRecord);assert.equal(restored.upgradePoints,2);assert.equal(restored.mission,3);
 assert(g.startTideTrial());g.tideTrial.index=4;g.effects.surf=5;g.x=tideCourse[4].x;g.z=tideCourse[4].z;tick(g,.025);assert.equal(g.upgradePoints,2,'repeat completion cannot farm points');
});
test('focus key is reserved and new optional-course rewards restore existing upgrade budgets',()=>{
 assert.equal(S.preferences({bindings:{attack:'KeyC'}}).bindings.attack,'KeyF');const g=new Game({mission:3,tideDone:true,upgrades:[1,0,1]});assert.equal(g.upgrades[2],1);assert.equal(g.upgradePoints,0);assert.deepEqual(new Game(g.save()).save(),g.save());
});
test('umbrella canopy has a lower bound so it cannot force a ground-level camera into Kaito',()=>{
 const g=new Game({mission:3,x:-12,z:17}),target=[g.x,1.15,g.z],desired=[g.x+Math.sin(1.1)*10,4.8,g.z+Math.cos(1.1)*10];const camera=S.cameraPosition(target,desired,g.cameraColliders());assert(Math.hypot(camera[0]-g.x,camera[2]-g.z)>1.5,'camera retains a usable third-person distance beneath the umbrellas');
 const canopy={x:0,z:0,hx:2,hz:2,minHeight:2.4,height:3.2};assert.deepEqual(S.cameraPosition([0,1,0],[3,1,0],[canopy]),[3,1,0]);assert(S.cameraPosition([0,1,0],[0,4,3],[canopy])[1]<2.5,'camera must still stop at the actual canopy');
});

test('travel and defeat cancel timed runs and fast travel cannot skip their route',()=>{
 const g=new Game({mission:3,visited:['Aonami-0']});g.startTideTrial();assert(!g.fastTravel(0));g.hp=1;g.damage(200);assert.equal(g.tideTrial,null);g.startTideTrial();g.travel={city:'Hikaru',time:2.99};g.tick(.025);assert.equal(g.city,'Hikaru');assert.equal(g.tideTrial,null);
});
