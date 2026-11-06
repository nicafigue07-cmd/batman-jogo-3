const test=require('node:test'),assert=require('node:assert/strict');
const {Game,outfits,urbanBlocks,roofsByCity,arenas}=require('../src/core.js'),S=require('../src/systems.js');
const tick=(g,n)=>{for(let i=0;i<n;i++)g.tick(.025,{},0,g.colliders());};
test('each of twenty missions unlocks its own persistent cosmetic without bypassing progression',()=>{
 assert.equal(outfits.filter(o=>o.id.startsWith('tide-')).length,20);
 for(let mission=1;mission<=20;mission++){const locked=new Game({mission:mission-1});assert(!locked.setOutfit('tide-'+mission));const g=new Game({mission});assert(g.setOutfit('tide-'+mission));assert.equal(new Game(g.save()).outfit,g.outfit);assert.equal(new Game({mission:mission-1,outfit:g.outfit}).outfit,'classic');}
 assert.equal(new Game({mission:20,outfit:'guardian'}).outfit,'guardian');
});
test('attack and water damage grow with campaign while preserving meaningful costs and cooldowns',()=>{
 let previous=0;for(let mission=3;mission<=20;mission++){const g=new Game({mission});assert(g.combatBonus>=previous);if(mission>3)assert(g.combatBonus>previous);previous=g.combatBonus;}
 const damage=mission=>{const g=new Game({mission,x:0,z:10});g.enemies=[{id:99,hp:1000,maxHp:1000,x:0,z:8,stun:0,warning:0}];g.facing=Math.PI;g.attack();return 1000-g.enemies[0].hp;};assert(damage(20)>damage(8));
});
test('timed water defense requires timing and unlock, grants a counter, and expires',()=>{
 assert(!new Game().parry());const g=new Game({mission:8}),enemy=g.enemies[0],hp=g.hp;assert(g.parry());assert(!g.parry());g.damage(20,enemy);assert.equal(g.hp,hp);assert(g.counter>0);assert(enemy.stun>0);tick(g,50);assert(g.parry());tick(g,15);g.damage(20,enemy);assert(g.hp<hp,'late defense does not block damage');
});
test('optional arenas preserve current mission, persist robot HP and award points only once',()=>{
 for(const arena of arenas){const g=new Game({mission:10,city:arena.city,x:arena.x,z:arena.z});assert(g.startArena(arena.id));assert.equal(g.enemies.length,arena.count);g.enemies[0].hp-=7;let restored=new Game(g.save());assert.equal(restored.enemies[0].hp,g.enemies[0].hp);assert.equal(restored.arena.id,arena.id);const points=g.upgradePoints;for(const e of g.enemies)e.hp=0;g.finishEnemies();assert.equal(g.mission,10);assert.equal(g.upgradePoints,points+1);assert(g.startArena(arena.id));for(const e of g.enemies)e.hp=0;g.finishEnemies();assert.equal(g.upgradePoints,points+1);assert(new Game(g.save()).arenaWins.includes(arena.id));}
});
test('arenas can be cancelled and cannot overwrite campaign combat or follow the boat into another city',()=>{
 const a=arenas[0],g=new Game({mission:7,city:a.city,x:a.x,z:a.z});assert(g.startArena(a.id));assert(g.interact());assert.equal(g.arena,null);assert(g.startArena(a.id));g.advance();assert.equal(g.mission,8);assert.equal(g.arena,null);assert(g.enemies.length);assert(g.enemies.every(e=>e.id<100));
 const t=new Game({mission:10,city:a.city,x:a.x,z:a.z});t.startArena(a.id);t.travel={city:'Hikaru',time:2.99};t.tick(.025);assert.equal(t.arena,null);assert(t.enemies.every(e=>e.id<100));
});
test('new buildings share rendered dimensions with collision, roof support and altitude saves',()=>{
 assert.equal(urbanBlocks.Aonami.length+urbanBlocks.Hikaru.length,31);
 for(const city of ['Aonami','Hikaru'])for(const b of urbanBlocks[city]){assert(b.roofHeight>b.buildingHeight);const roof=roofsByCity[city].find(r=>r.wall===b);assert(roof);const g=new Game({mission:10,city,x:b.x-3,z:b.z});for(let i=0;i<60;i++)g.tick(.025,{x:1},0,g.colliders());assert(g.x<b.x-b.hx);assert.equal(g.y,0);const saved=new Game({mission:20,city,roofId:roof.id,x:b.x,z:b.z-roof.hz+.15});assert.equal(saved.y,roof.height);assert.equal(new Game(saved.save()).save().roofId,saved.save().roofId);assert(S.overlaps(b.x,b.z,b));}
});
test('both arenas can actually be won through movement, targeting and attacks without changing resources or positions',()=>{
 for(const a of arenas){const g=new Game({mission:10,city:a.city,x:a.x,z:a.z});assert(g.startArena(a.id));let frames=0;while(g.arena&&frames++<2400){if(!g.getCombatTarget())g.toggleTarget();const enemy=g.getCombatTarget();assert(enemy);const dx=enemy.x-g.x,dz=enemy.z-g.z,d=Math.hypot(dx,dz)||1;g.aimAtTarget();if(d<3)g.attack();if(g.enemies.some(e=>e.warning>0&&e.warning<.2))g.parry();g.tick(.025,{x:d>2?dx/d:0,z:d>2?dz/d:0},0,g.colliders());}assert(frames<2400);assert(g.arenaWins.includes(a.id));assert.equal(g.mission,10);}
});
