/* Campaign traversal through real movement/collision/resource rules; no teleporting or health/energy edits. */
const assert=require('node:assert/strict'),K=require('../src/core.js'),S=require('../src/systems.js');
class Heap{constructor(){this.a=[];}push(n){const a=this.a;let i=a.push(n)-1;while(i){const p=(i-1)>>1;if(a[p].f<=n.f)break;a[i]=a[p];i=p;}a[i]=n;}pop(){const a=this.a,first=a[0],last=a.pop();if(a.length){let i=0;while(i*2+1<a.length){let c=i*2+1;if(c+1<a.length&&a[c+1].f<a[c].f)c++;if(a[c].f>=last.f)break;a[i]=a[c];i=c;}a[i]=last;}return first;}get length(){return this.a.length;}}
function segment(ax,az,bx,bz,obstacles){const n=Math.max(1,Math.ceil(Math.hypot(bx-ax,bz-az)/.25));for(let i=1;i<=n;i++){const x=ax+(bx-ax)*i/n,z=az+(bz-az)*i/n;if(obstacles.some(o=>S.overlaps(x,z,o,.43)))return false;}return true;}
function pathTo(g,target,range,obstacles){
 if(segment(g.x,g.z,target.x,target.z,obstacles))return [target];
 const open=new Heap(),seen=new Map(),start={x:Math.round(g.x),z:Math.round(g.z),cost:0,parent:null};start.f=Math.hypot(start.x-target.x,start.z-target.z);open.push(start);seen.set(start.x+','+start.z,0);let goal,steps=0;
 while(open.length&&steps++<35000){const p=open.pop();if(Math.hypot(p.x-target.x,p.z-target.z)<range){goal=p;break;}for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){const x=p.x+dx,z=p.z+dz;if(x<K.bounds.minX||x>K.bounds.maxX||z<K.bounds.minZ||z>K.bounds.maxZ)continue;const cost=p.cost+Math.hypot(dx,dz),key=x+','+z;if((seen.get(key)??Infinity)<=cost||!segment(p.x,p.z,x,z,obstacles))continue;seen.set(key,cost);open.push({x,z,cost,parent:p,f:cost+Math.max(0,Math.hypot(x-target.x,z-target.z)-range)});}}
 assert(goal,'a walking route exists to '+JSON.stringify(target));const result=[];for(let p=goal;p?.parent;p=p.parent)result.push({x:p.x,z:p.z});return result.reverse();
}
const g=new K.Game(),complete=[],dt=.05;let time=0,route=[],lastTarget='',lastPlan=0,deaths=0;
while(g.mission<20&&time<1600){
 const q=g.quest;let target,range=2,mode=q.type;
 if(g.interior){mode='interior';target=g.floor===0?(q.id===12?{x:3,z:2}:{x:0,z:-5}):q.id===12?{x:0,z:3.5}:{x:3,z:2};range=1.3;}
 else if(mode==='clear'){target=K.debris.filter((_,i)=>!g.cleared.includes(i)).sort((a,b)=>Math.hypot(a.x-g.x,a.z-g.z)-Math.hypot(b.x-g.x,b.z-g.z))[0];range=4.5;}
 else if(mode==='clues'){target=K.clues.filter((_,i)=>!g.clues.includes(i)).sort((a,b)=>Math.hypot(a.x-g.x,a.z-g.z)-Math.hypot(b.x-g.x,b.z-g.z))[0];}
 else if(mode==='race'){target=K.rings[g.raceIndex];range=1.5;}
 else if(['combat','boss'].includes(mode)){target=g.enemies.filter(e=>e.hp>0).sort((a,b)=>Math.hypot(a.x-g.x,a.z-g.z)-Math.hypot(b.x-g.x,b.z-g.z))[0];range=5;}
 else target=q;
 assert(target,'mission has objective '+q.id);const distance=Math.hypot(target.x-g.x,target.z-g.z),obstacles=g.interior?[]:g.colliders();let aim=target,x=0,z=0;
 const threat=g.enemies.find(e=>e.hp>0&&e.warning>0&&e.intent&&Math.hypot(g.x-e.intent.x,g.z-e.intent.z)<e.intent.radius+.5);
 if(threat){const ix=g.x-threat.intent.x,iz=g.z-threat.intent.z,l=Math.hypot(ix,iz)||1;aim={x:g.x+ix/l*8+iz/l*3,z:g.z+iz/l*8-ix/l*3};if(g.cooldowns[1]===0&&g.energy>36)g.power(1);if(threat.warning<.3)g.dodge();x=(aim.x-g.x)/8;z=(aim.z-g.z)/8;route=[];}
 else if(distance>range){const key=q.id+':'+mode+':'+Math.round(target.x/3)+':'+Math.round(target.z/3)+':'+g.floor;if(key!==lastTarget||!route.length||time-lastPlan>2){route=pathTo(g,target,range,obstacles);lastTarget=key;lastPlan=time;}while(route.length>1&&Math.hypot(route[0].x-g.x,route[0].z-g.z)<.4)route.shift();aim=route[0]||target;const l=Math.hypot(aim.x-g.x,aim.z-g.z)||1;x=(aim.x-g.x)/l;z=(aim.z-g.z)/l;}
 else{const l=distance||1;x=(target.x-g.x)/l*.05;z=(target.z-g.z)/l*.05;}
 if(!g.interior&&K.isWater(g.city,g.x,g.z)&&distance>10&&!g.effects.surf&&g.unlocked(2)&&g.cooldowns[2]===0&&g.energy>60)g.power(2);
 const before=g.mission,wasTransit=!!(g.travel||g.lift||g.climbing);g.tick(dt,{x,z,run:true},0,obstacles);time+=dt;
 if(!wasTransit&&!g.travel&&!g.lift&&!threat){const d=Math.hypot(target.x-g.x,target.z-g.z);if(d<=range+.25){
  if(['talk','investigate','rescue','travel','interior'].includes(mode))g.interact();
  if(mode==='clues'){if(!g.effects.vision&&g.cooldowns[7]===0)g.power(7);g.interact();}
  if(mode==='clear'&&g.cooldowns[0]===0)g.power(0);
  if(['combat','boss'].includes(mode)){if(mode==='boss'&&g.cooldowns[9]===0&&g.energy>=55)g.power(9);else if(g.cooldowns[0]===0)g.power(0);}
  if(mode==='scan')g.power(7);if(mode==='protect')g.power(8);if(mode==='final')g.power(9);
 }}
 if(g.mission!==before){complete.push(before);route=[];lastTarget='';console.log('PASS WALK',before+1,q.title,'t='+Math.round(time)+'s','hp='+Math.round(g.hp));}
 while(g.events.length){const e=g.events.shift();if(e.type==='revive')deaths++;}
}
if(g.mission!==20)console.log('WALK BLOCK',JSON.stringify({x:g.x,z:g.z,floor:g.floor,lift:g.lift,interior:g.interior,hp:g.hp,energy:g.energy,route:route.slice(0,3)}));assert.equal(g.mission,20,'campaign completes with real navigation and resource rules');assert.equal(complete.length,20);console.log('PASS: all 20 missions walked without teleporting or editing resources; simulated time '+Math.round(time)+'s, recoveries '+deaths+'.');
