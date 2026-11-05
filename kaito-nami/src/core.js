/* Original Kaito Nami simulation and campaign. MIT license. */
(function(root){
const Systems=root.KaitoSystems||(typeof require==='function'?require('./systems.js'):null);
const Content=root.KaitoContent||(typeof require==='function'?require('./content.js'):null);
const powers=[
 {name:'Onda de Impacto',cost:12,cooldown:2.5,unlock:0,description:'Empurra e desativa robôs à frente. Remove destroços.'},
 {name:'Escudo de Água',cost:18,cooldown:8,unlock:3,description:'Bloqueia ataques por 4 segundos. Um bloqueio devolve energia.'},
 {name:'Surf Rápido',cost:10,cooldown:5,unlock:3,description:'Deslize mais rápido por 8 segundos, com prancha sobre a água.'},
 {name:'Redemoinho',cost:24,cooldown:10,unlock:6,description:'Prende robôs próximos por 4 segundos e causa impacto.'},
 {name:'Salto Aquático',cost:15,cooldown:4,unlock:2,description:'Impulso vertical, inclusive durante um salto.'},
 {name:'Corrida das Marés',cost:14,cooldown:6,unlock:5,description:'Velocidade ampliada por 6 segundos, ainda maior perto da água.'},
 {name:'Ponte de Água',cost:22,cooldown:10,unlock:6,description:'Uma passarela temporária de 10 segundos à sua frente.'},
 {name:'Visão Oceânica',cost:10,cooldown:4,unlock:7,description:'Revela pistas e aponta o objetivo por 10 segundos.'},
 {name:'Chuva Protetora',cost:28,cooldown:12,unlock:14,description:'Área de cura e proteção por 6 segundos. Ajuda nos resgates.'},
 {name:'Grande Maré',cost:45,cooldown:18,unlock:18,description:'Uma onda que alcança toda a arena e rompe o núcleo de Maré Zero.'}
];
const missions=[
 ['O primeiro dia na praia','Aonami','talk',-17,10,'Ren','Um dia perfeito para surfar! Venha até a escola de surf.'],
 ['A onda misteriosa','Aonami','visit',0,-5,'Fenômeno oceânico','Uma onda azul permanece imóvel. Aproxime-se para investigar.'],
 ['O despertar dos poderes','Aonami','clear',0,2,'Destroços','Sinta o movimento da água. Use a Onda de Impacto nos três destroços.'],
 ['Protegendo o litoral','Aonami','rescue',12,-7,'Surfista à deriva','Ren viu um surfista preso. Vá até ele e pressione Interagir.'],
 ['O segredo do porto','Aonami','investigate',22,-8,'Terminal do porto','Mika: os registros mostram cargas estranhas de Maré Zero. Investigue o terminal.'],
 ['Investigação no Bairro Sakura','Aonami','talk',-80,70,'Yuna','Yuna: os navios carregam um sinal que parece uma canção invertida.'],
 ['A caverna escondida','Aonami','visit',-95,135,'Caverna do Vento','Professor Sora: a água guarda memória. Procure a caverna sob a montanha.'],
 ['O mistério da Maré Zero','Aonami','clues',0,0,'Fragmentos de memória','Use Visão Oceânica e recolha três fragmentos com Interagir.'],
 ['O primeiro grande confronto','Aonami','combat',8,6,'Robôs de coleta','Maré Zero enviou robôs para recuperar os fragmentos. Desative os três.'],
 ['Viagem para Hikaru City','Aonami','travel',22,-8,'Barco para Hikaru','Yuna: rastreei o sinal até Hikaru City. O barco está no píer.'],
 ['As luzes da metrópole','Hikaru','talk',-17,10,'Mika','Mika: a rede da cidade usa a mesma frequência dos corais de Aonami.'],
 ['Investigação tecnológica','Hikaru','scan',85,100,'Laboratório de ressonância','Yuna: ative Visão Oceânica perto do laboratório para revelar a transmissão.'],
 ['O segredo da Torre Hikari','Hikaru','investigate',0,150,'Torre Hikari','Kuroda: quero impedir tempestades. O núcleo está roubando a energia do oceano.'],
 ['Perseguição no distrito futurista','Hikaru','race',-15,5,'Circuito de transmissão','Atravesse os três anéis em ordem antes que o sinal desapareça. Surf Rápido ajuda.'],
 ['Uma pista no Porto Futurista','Hikaru','combat',95,-25,'Sentinelas do porto','Mika: os sentinelas protegem o comando de drenagem. Desative os quatro.'],
 ['O plano do Diretor Kuroda','Hikaru','talk',-85,90,'Professor Sora','Sora: o núcleo não prevê tempestades — ele as cria. Kuroda precisa ouvir a verdade.'],
 ['Retorno a Aonami','Hikaru','travel',22,-8,'Barco para Aonami','Ren: a maré está subindo. Precisamos de você de volta em Aonami.'],
 ['A tempestade','Aonami','protect',0,7,'Abrigo do litoral','Use Chuva Protetora perto do abrigo para proteger os moradores.'],
 ['O confronto final','Aonami','boss',105,-35,'Núcleo de Maré Zero','Kuroda: perdi o controle do núcleo! Desative o guardião; desvie de seus pulsos.'],
 ['Guardião das Marés','Aonami','final',0,-5,'Coração do oceano','Kaito: ninguém controla o oceano sozinho. Use a Grande Maré junto à onda azul.']
].map((a,i)=>({id:i,title:a[0],city:a[1],type:a[2],x:a[3],z:a[4],who:a[5],text:a[6]}));
const debris=[{x:-9,z:3},{x:1,z:-2},{x:12,z:2}],clues=[{x:-23,z:4},{x:-4,z:20},{x:20,z:11}],rings=[{x:-15,z:5},{x:0,z:4},{x:14,z:8}];
const surfRings=[{x:-10,z:-4},{x:0,z:-7},{x:12,z:-5}];
const shells=[{x:-26,z:8},{x:-8,z:15},{x:8,z:-6},{x:28,z:7},{x:6,z:26}];
const npcs={Aonami:[{name:'Ren',x:-17,z:10},{name:'Yuna',x:-80,z:70},{name:'Sora',x:-26,z:20},{name:'Mika',x:18,z:15}],Hikaru:[{name:'Mika',x:-17,z:10},{name:'Sora',x:-85,z:90},{name:'Yuna',x:18,z:20},{name:'Ren',x:-12,z:17}]};
const obstaclesByCity={Aonami:[{x:-21,z:19,r:3.2},{x:19,z:20,r:2.8},{x:-28,z:5,r:.55},{x:27,z:11,r:.55},{x:24,z:26,r:.55},{x:-5,z:25,r:.55},{x:8,z:24,r:.55}],Hikaru:[{x:-25,z:16,r:2.5},{x:25,z:18,r:2.5},{x:7,z:24,r:2.5},{x:-8,z:25,r:2.5},{x:17,z:26,r:2},{x:-28,z:25,r:2}]};

const bounds={minX:-144,maxX:144,minZ:-55,maxZ:185};
const regions={Aonami:[
 {name:'Praia das Ondas Azuis',x:-8,z:10,power:0,task:'Boia à deriva',text:'A onda soltou a boia presa. Os surfistas podem voltar à água.'},
 {name:'Centro de Aonami',x:0,z:85,power:-1,task:'Recado da comunidade',text:'Você entregou a previsão de marés ao centro comunitário.'},
 {name:'Bairro Sakura',x:-80,z:70,power:8,task:'Jardim das lembranças',text:'A chuva suave recuperou o jardim comunitário de Sakura.'},
 {name:'Porto de Aonami',x:85,z:30,power:7,task:'Manifesto perdido',text:'A visão revelou a rota dos barcos de pesquisa de Mika.'},
 {name:'Montanha do Vento',x:-95,z:135,power:4,task:'Eco da nascente',text:'Seu salto tocou a corrente da nascente e revelou uma memória do oceano.'},
 {name:'Ilha Secreta',x:105,z:-35,power:9,task:'Último ressonador',text:'A Grande Maré desligou o último ressonador abandonado.'}
 ],Hikaru:[
 {name:'Centro Neon',x:0,z:65,power:1,task:'Robô de serviço',text:'Seu escudo protegeu o pequeno robô durante a reinicialização.'},
 {name:'Distrito Tecnológico',x:85,z:100,power:7,task:'Código do coral',text:'Yuna encontrou a assinatura dos corais na rede urbana.'},
 {name:'Bairro das Lanternas',x:-85,z:90,power:-1,task:'Luzes do festival',text:'Você devolveu a lanterna do festival ao mercado.'},
 {name:'Parque Celestial',x:-80,z:35,power:8,task:'Lago sereno',text:'A chuva protetora restaurou o pequeno lago do parque.'},
 {name:'Porto Futurista',x:95,z:-25,power:3,task:'Turbina bloqueada',text:'O redemoinho liberou a turbina do cais sem danificar os barcos.'},
 {name:'Torre Hikari',x:0,z:150,power:6,task:'Passagem do observatório',text:'A ponte de água reconectou os sensores do observatório.'}
 ]};
function isWater(city,x,z){return z<0&&!(city==='Aonami'&&Math.hypot(x-105,z+35)<11)&&!(city==='Hikaru'&&Math.hypot(x-95,z+25)<15);}
for(const city of ['Aonami','Hikaru'])for(let i=city==='Hikaru'?0:1;i<6;i++){const r=regions[city][i];if((city==='Aonami'&&(i===4||i===5))||(city==='Hikaru'&&i===3))continue;for(const [dx,dz] of [[-18,-18],[18,-18],[-18,18],[18,18],[-30,0],[30,0],[0,-30],[0,30]]){const x=r.x+dx,z=r.z+dz;if(x>bounds.minX+3&&x<bounds.maxX-3&&z>1&&z<bounds.maxZ-3)obstaclesByCity[city].push({x,z,r:2.5,extended:true});}}


// Footprints match the rendered walls; roof overhangs do not block the ground.
for(const city of ['Aonami','Hikaru'])for(let i=0;i<obstaclesByCity[city].length;i++){
 const o=obstaclesByCity[city][i];
 if(city==='Hikaru'||o.extended){o.hx=2;o.hz=1.75;o.kind='building';}
 else if(i===0){o.hx=3.5;o.hz=2.5;o.kind='school';}
 else if(i===1){o.hx=3;o.hz=2;o.kind='shop';}
 else o.kind='palm';
}
obstaclesByCity.Hikaru.push({x:0,z:156,hx:4,hz:4,r:5.7,kind:'tower'});
for(let i=0;i<3;i++)obstaclesByCity.Aonami.push({x:-25+i*1.1,z:15.4,hx:.35,hz:.15,r:.4,kind:'board'});

class Game{
 constructor(raw={}){const s=raw&&typeof raw==='object'?raw:{};this.mission=Number.isInteger(s.mission)?Math.max(0,Math.min(20,s.mission)):0;this.city=['Aonami','Hikaru'].includes(s.city)?s.city:(missions[this.mission]?.city||'Aonami');this.x=-14;this.z=13;this.y=0;this.vy=0;this.vx=0;this.vz=0;this.jumpBuffer=0;this.dodgeVector=null;this.facing=Math.PI;this.wasJump=false;this.time=Number.isFinite(s.worldTime)?Math.max(0,Math.min(1e7,s.worldTime)):0;this.hp=100;this.energy=100;this.xp=this.mission*60;this.cleared=this.ids(s.cleared,3);this.clues=this.ids(s.clues,3);this.shells=Array.isArray(s.shells)?[...new Set(s.shells.filter(x=>/^(Aonami|Hikaru)-[0-4]$/.test(x)))]:[];this.sideDone=!!s.sideDone;this.lessonDone=!!s.lessonDone;this.traffic={};this.citizens={};for(const city of ['Aonami','Hikaru']){this.traffic[city]=Array.from({length:3},(_,i)=>{const old=s.trafficState?.[city]?.[i];return {x:Number.isFinite(old?.x)?Math.max(-34,Math.min(34,old.x)):-30+i*22,z:14,hx:1,hz:.55,r:1.2,kind:'car',speed:2+i*.4,dir:old?.dir===-1?-1:1};});this.citizens[city]=regions[city].map((r,i)=>({name:['Ami','Taro','Hana','Suzu','Daichi','Nori'][i],x:r.x-7,z:r.z+6,homeX:r.x,homeZ:r.z,goal:0,elapsed:0,activity:'indo ao mercado',phase:i,walk:0}));}this.surfRecord=Number.isFinite(s.surfRecord)&&s.surfRecord>0?s.surfRecord:null;this.sideRace=null;this.pulses=[];this.impacts=[];this.removing=[];this.enemies=[];this.cooldowns=powers.map(()=>0);this.effects={};this.selected=0;this.combo=0;this.comboTime=0;this.dodgeTime=0;this.dodgeCooldown=0;this.counter=0;this.hurtTime=0;this.landTime=0;this.powerTime=0;this.lastPower=0;this.walkSpeed=0;this.moving=false;this.motion='idle';this.raceIndex=0;this.raceTime=0;this.defeated=0;this.events=[];this.difficulty='normal';this.travel=null;this.visited=this.idsRegion(s.visited);this.regionTasks=this.idsRegion(s.regionTasks);this.interior=null;this.floor=0;this.floorHeight=0;this.lift=null;this.returnPoint=null;this.climbing=null;this.upgrades=this.idsUpgrades(s.upgrades);this.spawnEnemies();const finite=(v,min,max,fallback)=>Number.isFinite(v)?Math.max(min,Math.min(max,v)):fallback;this.x=finite(s.x,bounds.minX,bounds.maxX,-14);this.z=finite(s.z,bounds.minZ,bounds.maxZ,13);this.hp=finite(s.hp,1,100,100);this.energy=finite(s.energy,0,100,100);this.selected=Number.isInteger(s.selected)&&this.unlocked(s.selected)?s.selected:0;this.facing=finite(s.facing,-Math.PI,Math.PI,Math.PI);if(s.interior==='hikari'&&this.city==='Hikaru'){this.interior='hikari';this.floor=s.floor===1?1:0;this.floorHeight=this.floor*6;this.returnPoint={x:0,z:149};this.x=finite(s.x,-5,5,0);this.z=finite(s.z,-5,5,-4);}if(this.mission===12&&s.mission===12&&this.city!=='Hikaru')this.interior=null;
 if(s.enemyMission===this.mission&&Array.isArray(s.enemyState)){for(const e of this.enemies){const old=s.enemyState.find(o=>o&&o.id===e.id);if(!old)continue;e.hp=finite(old.hp,0,e.maxHp,e.maxHp);e.x=finite(old.x,bounds.minX+1,bounds.maxX-1,e.x);e.z=finite(old.z,bounds.minZ+1,bounds.maxZ-1,e.z);}}
 if(!this.interior)Systems.pushOut(this,this.colliders());
 if(this.mission===7&&this.clues.length===3)this.advance();
 }

 idsUpgrades(raw){const result=Array.from({length:10},(_,i)=>Number.isInteger(raw?.[i])?Math.max(0,Math.min(3,raw[i])):0);let budget=Math.floor(this.mission/3)+Math.floor(this.regionTasks.length/3)+(this.lessonDone?1:0);for(let i=0;i<result.length;i++){result[i]=Math.min(result[i],budget);budget-=result[i];}return result;}
 get upgradePoints(){return Math.floor(this.mission/3)+Math.floor(this.regionTasks.length/3)+(this.lessonDone?1:0)-this.upgrades.reduce((a,b)=>a+b,0);}
 upgrade(i){if(!this.unlocked(i)||this.upgrades[i]>=3||this.upgradePoints<=0)return false;this.upgrades[i]++;this.emit('hint',powers[i].name+' evoluiu para '+(this.upgrades[i]+1));return true;}
 colliders(){const key=this.city+':'+this.cleared.join(',')+':'+this.regionTasks.join(',');if(this._colliderKey!==key){this._colliderKey=key;this._colliders=obstaclesByCity[this.city].concat(this.traffic[this.city]);if(this.city==='Aonami'&&this.mission<=2)debris.forEach((d,i)=>{if(!this.cleared.includes(i))this._colliders.push({...d,hx:.65,hz:.55,r:.8,kind:'debris'});});regions[this.city].forEach((r,i)=>{if((i>0||this.city==='Hikaru')&&!this.regionTasks.includes(this.city+'-'+i))this._colliders.push({x:r.x,z:r.z,hx:.5,hz:.5,r:.7,kind:'beacon'});});}return this._colliders;}

 cameraColliders(){if(this.interior){if(!this._indoorCamera)this._indoorCamera=[{x:-5.8,z:0,hx:.125,hz:6,top:2.6},{x:5.8,z:0,hx:.125,hz:6,top:2.6},{x:0,z:5.8,hx:6,hz:.15,top:5},{x:0,z:-5.8,hx:1.2,hz:.1,top:2.8}];for(const wall of this._indoorCamera)wall.height=this.floorHeight+wall.top;return this._indoorCamera;}const base=this.colliders();if(this._cameraKey!==this._colliderKey){this._cameraKey=this._colliderKey;this._cameraColliders=base.filter(o=>!['car','beacon','debris'].includes(o.kind)).map(o=>({...o,height:o.kind==='car'?1.3:o.kind==='debris'?.8:o.kind==='beacon'?1.2:o.kind==='board'?2.9:o.kind==='palm'?6:32}));if(this.city==='Aonami')for(let i=0;i<5;i++)this._cameraColliders.push({x:-13+i*6,z:18+(i%2)*3,hx:1.8,hz:1.8,height:4.4});}return this._cameraColliders;}

 dialogue(id){const line=Content?.dialogues[id];return line?line[0]+': '+line[1]:this.quest?.text||'';}

 idsRegion(a){return Array.isArray(a)?[...new Set(a.filter(x=>/^(Aonami|Hikaru)-[0-5]$/.test(x)))]:[];}
 fastTravel(index){const r=regions[this.city][index];if(!r||!this.visited.includes(this.city+'-'+index)||this.interior||this.travel||this.climbing||this.enemies.some(e=>e.hp>0&&Math.hypot(e.x-this.x,e.z-this.z)<18)){this.emit('hint','Descubra o local e saia do combate para usar viagem rápida.');return false;}this.x=r.x;this.z=r.z+3;Systems.pushOut(this,this.colliders());this.y=0;this.vy=0;this.vx=this.vz=0;this.jumpBuffer=0;this.emit('hint','Viagem rápida: '+r.name);return true;}
 regionPower(i){if(this.mission<3||this.interior)return;regions[this.city].forEach((r,k)=>{const id=this.city+'-'+k;if(r.power===i&&!this.regionTasks.includes(id)&&Math.hypot(this.x-r.x,this.z-r.z)<5){this.regionTasks.push(id);this.emit('dialog',r.name+': '+r.text+' Objetivo secundário concluído · +25 XP.');}});}
 ids(a,n){return Array.isArray(a)?[...new Set(a.filter(i=>Number.isInteger(i)&&i>=0&&i<n))]:[];}
 get quest(){return missions[this.mission];}
 get level(){return 1+Math.floor((this.xp+this.shells.length*10+this.regionTasks.length*25)/180);}
 unlocked(i){return !!powers[i]&&this.mission>=powers[i].unlock;}
 emit(type,text){this.events.push({type,text});}
 advance(){if(!this.quest)return;const title=this.quest.title;this.mission++;this.xp=this.mission*60;this.hp=Math.min(100,this.hp+25);this.energy=100;this.raceIndex=0;this.raceTime=0;this.defeated=0;this.emit('complete',title);this.spawnEnemies();if(this.mission===20)this.emit('ending','Kuroda desliga a rede. Mika e Yuna transformam a tecnologia em uma rede de proteção. Ren espera Kaito para surfar. O oceano volta a respirar.');}
 spawnEnemies(){this.enemies=[];const q=this.quest;if(!q||q.city!==this.city||!['combat','boss'].includes(q.type))return;const count=q.type==='boss'?1:q.id===14?4:3;for(let i=0;i<count;i++){let x=q.x+(i%2)*3-2,z=q.z+Math.floor(i/2)*3;const kind=q.type==='boss'?'boss':q.id===14?['sentinel','ranger','scout','sentinel'][i]:i===2?'sentinel':'scout';this.enemies.push({id:i,kind,phase:0,intent:null,x,z,homeX:x,homeZ:z,hp:q.type==='boss'?320:kind==='scout'?50:75,maxHp:q.type==='boss'?320:kind==='scout'?50:75,boss:q.type==='boss',stun:0,attack:2+i*.3,warning:0});}}
 tick(dt,input={},angle=0,obstacles=[]){dt=Math.max(0,Math.min(.05,Number.isFinite(dt)?dt:0));this.time+=dt;for(let i=0;i<this.cooldowns.length;i++)this.cooldowns[i]=Math.max(0,this.cooldowns[i]-dt);for(const k in this.effects)this.effects[k]=Math.max(0,this.effects[k]-dt);this.energy=Math.min(100,this.energy+dt*7);this.counter=Math.max(0,this.counter-dt);this.comboTime-=dt;if(this.comboTime<=0)this.combo=0;this.dodgeCooldown=Math.max(0,this.dodgeCooldown-dt);this.dodgeTime=Math.max(0,this.dodgeTime-dt);this.hurtTime=Math.max(0,this.hurtTime-dt);this.landTime=Math.max(0,this.landTime-dt);
 if(this.travel){this.travel.time+=dt;if(this.travel.time>=3){this.city=this.travel.city;this.spawnEnemies();this.vx=this.vz=0;this.jumpBuffer=0;this.x=21;this.z=-5;this.travel=null;if(this.travelMission===this.mission)this.advance();this.travelMission=null;this.emit('travel','Chegada a '+this.city);}return;}
 if(this.lift){this.vx=this.vz=0;this.lift.time+=dt;const a=Math.min(1,this.lift.time/2);this.floorHeight=this.lift.from+(this.lift.to-this.lift.from)*a;if(a===1){this.floor=this.lift.to===6?1:0;this.lift=null;this.emit('hint',this.floor?'Mirante: investigue o terminal ao fundo.':'Térreo: a saída fica junto à porta.');}return;}
 if(this.climbing){this.vx=this.vz=0;this.climbing.time+=dt;const a=Math.min(1,this.climbing.time/1.6);this.y=Math.sin(a*Math.PI)*4;if(a===1){this.x=this.climbing.x??-28;this.z=this.climbing.to;this.y=0;this.climbing=null;this.emit('hint','Trilha alcançada.');}return;}
 if(this.interior)obstacles=[];
 let dx=Systems.finite(input.x),dz=Systems.finite(input.z),l=Math.hypot(dx,dz);if(l>1){dx/=l;dz/=l;}let mx=dx*Math.cos(angle)+dz*Math.sin(angle),mz=-dx*Math.sin(angle)+dz*Math.cos(angle);if(this.dodgeTime&&l<.01){mx=Math.sin(this.facing);mz=Math.cos(this.facing);}let speed=input.run?7.5:4.5;this.onBridge=false;if(this.effects.bridge&&this.bridge){const dx=this.x-this.bridge.x,dz=this.z-this.bridge.z,along=dx*Math.sin(this.bridge.rot)+dz*Math.cos(this.bridge.rot),across=dx*Math.cos(this.bridge.rot)-dz*Math.sin(this.bridge.rot);this.onBridge=along>-.6&&along<8&&Math.abs(across)<1;}this.swimming=!this.interior&&isWater(this.city,this.x,this.z)&&!this.onBridge&&!this.effects.surf;if(this.swimming)speed=2.8;if(this.effects.surf)speed=10;if(this.effects.dash)speed=this.z<5?12:9;if(this.dodgeTime)speed=17;
 const oldX=this.x,oldZ=this.z,wasAirborne=this.y>0;
 if(this.dodgeTime&&this.dodgeVector){this.vx=this.dodgeVector.x*17;this.vz=this.dodgeVector.z*17;}
 else{const response=this.y>0?(l>.01?9:2):l>.01?18:22,blend=1-Math.exp(-response*dt);this.vx+=(mx*speed-this.vx)*blend;this.vz+=(mz*speed-this.vz)*blend;if(l<.01&&Math.hypot(this.vx,this.vz)<.02){this.vx=0;this.vz=0;}}
 Systems.move(this,this.vx*dt,this.vz*dt,obstacles);this.x=Systems.clamp(this.x,this.interior?-5:bounds.minX,this.interior?5:bounds.maxX);this.z=Systems.clamp(this.z,this.interior?-5:bounds.minZ,this.interior?5:bounds.maxZ);if(dt>0){if(Math.abs(this.x-oldX-this.vx*dt)>.001)this.vx=(this.x-oldX)/dt;if(Math.abs(this.z-oldZ-this.vz*dt)>.001)this.vz=(this.z-oldZ)/dt;}this.walkSpeed=Math.hypot(this.x-oldX,this.z-oldZ)/(dt||1);this.moving=this.walkSpeed>.1;if(Math.hypot(mx,mz)>.01)this.facing=Math.atan2(mx,mz);this.jumpBuffer=Math.max(0,this.jumpBuffer-dt);if(input.jump&&!this.wasJump)this.jumpBuffer=.12;if(this.jumpBuffer>0&&this.y===0){this.vy=Math.max(this.vy,6.4);this.jumpBuffer=0;}this.wasJump=!!input.jump;this.vy-=18*dt;this.y=Math.max(0,this.y+this.vy*dt);if(!this.y){if(wasAirborne)this.landTime=.22;this.vy=0;}this.motion=this.hurtTime?'hurt':this.dodgeTime?'dodge':this.y>0?(this.vy>0?'jump':'fall'):this.landTime?'land':this.powerTime?'power':this.swimming?'swim':this.moving?(speed>6?'run':'walk'):'idle';
 this.tickVisual(dt);if(this.effects.rain)this.hp=Math.min(100,this.hp+dt*6);
 if(this.interior)return;
 this.updateCity(dt,obstacles);
 regions[this.city].forEach((r,i)=>{const id=this.city+'-'+i;if(!this.visited.includes(id)&&Math.hypot(this.x-r.x,this.z-r.z)<9){this.visited.push(id);this.emit('hint','Local descoberto: '+r.name+' · viagem rápida disponível no mapa.');}});
 for(const e of this.enemies){
  if(e.hp<=0)continue;
  e.stun=Math.max(0,e.stun-dt);e.attack-=dt;
  const nextPhase=e.boss?(e.hp<e.maxHp/3?2:e.hp<e.maxHp*2/3?1:0):0;
  if(nextPhase!==e.phase){e.phase=nextPhase;this.emit('phase','Guardião do núcleo · fase '+(e.phase+1));}
  let distance=Math.hypot(e.x-this.x,e.z-this.z);
  if(e.warning>0){
   e.warning-=dt;
   if(e.warning<=0&&e.intent&&Math.hypot(e.intent.x-this.x,e.intent.z-this.z)<e.intent.radius)this.damage(e.intent.damage);
   continue;
  }
  if(e.stun)continue;
  const ranged=e.kind==='ranger'||e.boss&&e.phase===1;
  const reach=ranged?16:e.boss?7:5;
  if(e.attack<=0&&distance<reach){
   const atPlayer=ranged;
   e.intent={x:atPlayer?this.x:e.x,z:atPlayer?this.z:e.z,radius:atPlayer?2.8:e.boss?(e.phase===2?6:5):3.5,damage:e.boss?(e.phase===2?27:22):e.kind==='scout'?9:14};
   e.warning=e.boss?(e.phase===2?.75:1.2):e.kind==='scout'?.65:1;
   e.attack=e.warning+(e.boss?(e.phase===2?1.7:2.3):2.2);
   continue;
  }
  let dx=0,dz=0;
  if(distance<22&&distance>(ranged?9:2)){dx=(this.x-e.x)/distance;dz=(this.z-e.z)/distance;}
  else if(distance>=22){dx=(e.homeX+Math.sin(this.time*.5+e.id)*1.2-e.x);dz=(e.homeZ+Math.cos(this.time*.5+e.id)*1.2-e.z);const length=Math.hypot(dx,dz);if(length>1){dx/=length;dz/=length;}}
  const speed=e.boss?1.8:e.kind==='scout'?3.1:e.kind==='ranger'?2:1.8,step=dt*speed;
  const beforeX=e.x,beforeZ=e.z;Systems.move(e,dx*step,dz*step,obstacles,.45);
  if(Math.hypot(e.x-beforeX,e.z-beforeZ)<step*.2&&Math.hypot(dx,dz)>.1){const side=e.id%2?1:-1,angle=Math.atan2(dx,dz)+side*1.15;Systems.move(e,Math.sin(angle)*step,Math.cos(angle)*step,obstacles,.45);}
 }
 if(this.sideRace&&this.city==='Aonami'){const s=this.sideRace;if(s.index>0)s.time-=dt;if(s.time<=0){this.sideRace=null;this.emit('hint','Desafio encerrado. Fale com Ren para tentar de novo.');}else{const r=surfRings[s.index];if(r&&Math.hypot(this.x-r.x,this.z-r.z)<2.2&&(!s.lesson||this.effects.surf)){s.index++;if(s.index===3){const elapsed=(s.duration||25)-s.time;if(s.lesson){const first=!this.lessonDone;this.lessonDone=true;this.emit('collect',first?'Aula de surf concluída! +1 ponto de evolução.':'Aula prática de surf concluída!');}else{this.surfRecord=this.surfRecord===null?elapsed:Math.min(this.surfRecord,elapsed);this.emit('collect','Desafio de surf concluído! Recorde: '+this.surfRecord.toFixed(1)+' s');}this.sideRace=null;}}}}
 const q=this.quest;if(q&&q.city===this.city){const d=Math.hypot(q.x-this.x,q.z-this.z);if(q.type==='visit'&&d<2.5)this.advance();else if(q.type==='race'){if(this.raceIndex>0)this.raceTime-=dt;if(this.raceIndex>0&&this.raceTime<=0){this.raceIndex=0;this.emit('hint','O sinal se perdeu. Volte ao primeiro anel para tentar novamente.');}const r=rings[this.raceIndex];if(r&&Math.hypot(this.x-r.x,this.z-r.z)<2.4){if(!this.raceIndex)this.raceTime=20;this.raceIndex++;this.emit('hint','Anel '+this.raceIndex+' de 3');if(this.raceIndex===3)this.advance();}}}
 for(let i=0;i<shells.length;i++){const s=shells[i],id=this.city+'-'+i;if(!this.shells.includes(id)&&Math.hypot(this.x-s.x,this.z-s.z)<1.3){this.shells.push(id);this.emit('collect','Concha de memória · '+this.shells.length+'/10');}}
 }

 tickVisual(dt){dt=Math.max(0,Math.min(.05,Systems.finite(dt)));this.powerTime=Math.max(0,this.powerTime-dt);for(const list of [this.pulses,this.removing,this.impacts]){let keep=0;for(let i=0;i<list.length;i++){const p=list[i];p.age+=dt;if(p.age<1)list[keep++]=p;}list.length=keep;}}
 updateCity(dt,obstacles){
  const people=this.citizens[this.city],stops=[[-7,6],[7,6],[0,-6]],activities=['indo ao mercado','passeando pelo bairro','voltando para casa'];
  for(const person of people){
   if(Math.hypot(person.x-this.x,person.z-this.z)>70)continue;
   const point=stops[person.goal],tx=person.homeX+point[0],tz=person.homeZ+point[1],dx=tx-person.x,dz=tz-person.z,length=Math.hypot(dx,dz);
   person.elapsed+=dt;
   if(length<.6||person.elapsed>18){person.goal=(person.goal+1)%3;person.elapsed=0;person.activity=activities[person.goal];}
   else{person.facing=Math.atan2(dx,dz);Systems.move(person,dx/length*dt*1.1,dz/length*dt*1.1,obstacles,.25);person.walk+=dt*7;}
  }
  for(const car of this.traffic[this.city]){
   const nextX=car.x+car.dir*car.speed*dt;
   const yields=Math.hypot(nextX-this.x,car.z-this.z)<3.3||people.some(p=>Math.hypot(nextX-p.x,car.z-p.z)<2.4);
   car.stopped=yields;
   if(!yields)car.x=Math.max(-34,Math.min(34,nextX));
   if(car.x>=34||car.x<=-34)car.dir*=-1;
  }
 }

 damage(amount){if(this.hurtTime)return;if(this.effects.shield||this.effects.rain||this.dodgeTime||this.y>1.3){if(this.effects.shield){this.energy=Math.min(100,this.energy+5);this.counter=2;}return;}const mult=this.difficulty==='easy'?.6:this.difficulty==='hard'?1.4:1;this.hp-=amount*mult;this.hurtTime=.65;this.emit('damage','Kaito atingido! Use escudo ou esquiva.');if(this.hp<=0){this.hp=100;this.energy=100;this.x=-14;this.z=13;this.y=0;this.vy=0;this.vx=this.vz=0;this.jumpBuffer=0;this.sideRace=null;this.emit('revive','Kaito voltou à área segura. O progresso da campanha foi preservado.');}}
 dodge(direction){if(this.dodgeCooldown||this.travel||this.lift||this.climbing)return false;const x=Systems.finite(direction?.x,Math.sin(this.facing)),z=Systems.finite(direction?.z,Math.cos(this.facing)),length=Math.hypot(x,z);this.dodgeVector=length>.01?{x:x/length,z:z/length}:{x:Math.sin(this.facing),z:Math.cos(this.facing)};this.dodgeTime=.35;this.dodgeCooldown=1.5;this.vx=this.dodgeVector.x*17;this.vz=this.dodgeVector.z*17;return true;}
 targets(){return debris.map((o,i)=>{let dx=o.x-this.x,dz=o.z-this.z,d=Math.hypot(dx,dz);return {i,d,inRange:d<7&&(d<1||(dx*Math.sin(this.facing)+dz*Math.cos(this.facing))/d>.15)};}).filter(o=>!this.cleared.includes(o.i));}
 power(i=this.selected){if(this.travel||this.lift||this.climbing)return false;const p=powers[i];if(!p||!this.unlocked(i)){this.emit('hint','Poder ainda bloqueado pela história.');return false;}if(this.cooldowns[i]>0||this.energy<Math.max(1,Math.floor(p.cost*(1-this.upgrades[i]*.05)))){this.emit('hint',this.cooldowns[i]>0?'Aguarde a recarga do poder.':'A energia da maré está se recuperando.');return false;}const rank=this.upgrades[i];this.cooldowns[i]=p.cooldown*(1-rank*.08);this.energy-=Math.max(1,Math.floor(p.cost*(1-rank*.05)));this.powerTime=.6;this.lastPower=i;this.pulses.push({x:this.x,z:this.z,rot:this.facing,age:0,type:i});if(i===1)this.effects.shield=4;if(i===2)this.effects.surf=8;if(i===4)this.vy=10;if(i===5)this.effects.dash=6;if(i===6){this.effects.bridge=10;this.bridge={x:this.x,z:this.z,rot:this.facing};}if(i===7)this.effects.vision=10;if(i===8)this.effects.rain=6;
 if(!this.interior&&[0,3,9].includes(i)){this.combo=(this.combo+1)%4;this.comboTime=4;for(const e of this.enemies){if(e.hp<=0)continue;const dx=e.x-this.x,dz=e.z-this.z,d=Math.hypot(dx,dz),direction=d<1||(dx*Math.sin(this.facing)+dz*Math.cos(this.facing))/d>.1,hit=i===9?d<28:d<(i===3?9:7)&&(i===3||direction);if(hit){this.impacts.push({x:e.x,z:e.z,age:0});e.hp-=(i===9?110:i===3?25:26+this.combo*3+(this.level-1)*2+(this.counter?10:0))*(1+rank*.12);e.stun=i===3?4+rank*.4:.4;if(i===3||i===0)e.warning=0;if(i===0){Systems.move(e,Math.sin(this.facing)*1.8,Math.cos(this.facing)*1.8,this.colliders(),.45);}if(e.hp<=0){this.defeated++;this.emit('robot','Robô desativado');}}}if(this.enemies.length&&this.enemies.every(e=>e.hp<=0))this.advance();}
 if(!this.interior&&this.quest?.city===this.city&&this.quest?.type==='clear'&&i===0){for(const o of this.targets())if(o.inRange){this.cleared.push(o.i);this.removing.push({i:o.i,age:0,dx:Math.sin(this.facing),dz:Math.cos(this.facing)});}if(this.cleared.length===3)this.advance();}
 const q=this.quest;if(!this.interior&&q&&q.city===this.city&&Math.hypot(q.x-this.x,q.z-this.z)<5){if(q.type==='scan'&&i===7||q.type==='protect'&&i===8||q.type==='final'&&i===9)this.advance();}this.regionPower(i);return true;}
 enterTower(){this.returnPoint={x:0,z:149};this.interior='hikari';this.floor=0;this.floorHeight=0;this.x=0;this.z=-4;this.y=0;this.vx=this.vz=0;this.jumpBuffer=0;this.emit('hint','Torre Hikari: use o elevador à direita (E). A saída está atrás de você.');}
 interact(){if(this.travel||this.lift||this.climbing)return false;
 if(this.interior){const nearestTerminal=this.floor===1&&Math.hypot(this.x,this.z-3.5)<2.2&&Math.hypot(this.x,this.z-3.5)<Math.hypot(this.x-3,this.z-2);if(Math.hypot(this.x-3,this.z-2)<2&&!nearestTerminal){this.lift={time:0,from:this.floorHeight,to:this.floor?0:6};this.x=3;this.z=2;this.emit('hint','Elevador em movimento…');return true;}if(this.floor===1&&Math.hypot(this.x,this.z-3.5)<2.2){if(this.mission===12){this.emit('dialog','Yuna: o núcleo da torre está drenando Aonami. Kuroda acreditava prever tempestades, mas seu sistema está criando novas. Precisamos desligar a transmissão!');this.advance();}else this.emit('dialog','Observatório Hikari: a cidade e o oceano compartilham a mesma rede de energia.');return true;}if(this.floor===0&&Math.hypot(this.x,this.z+5)<2){this.x=this.returnPoint?.x??0;this.z=this.returnPoint?.z??149;this.interior=null;this.floorHeight=0;this.y=0;this.vx=this.vz=0;this.emit('hint','De volta ao Centro Neon.');return true;}this.emit('hint',this.floor?'Terminal ao fundo ou elevador à direita.':'Elevador à direita ou saída atrás da porta.');return false;}
 if(this.city==='Hikaru'&&Math.hypot(this.x,this.z-150)<3.8){this.enterTower();return true;}
 if(this.city==='Aonami'&&Math.hypot(this.x+95,this.z-135)<4){this.climbing={time:0,x:-95,to:this.z<135?138:132};this.emit('hint','Escalando a nascente da Montanha do Vento…');return true;}
 if(this.city==='Aonami'&&this.x< -24&&Math.abs(this.z-1)<3){this.climbing={time:0,to:this.z<1?4:-2};this.emit('hint','Escalando a trilha da Montanha do Vento…');return true;}
 const q=this.quest;if(q?.city===this.city){if(q.type==='clues'){if(!this.effects.vision&&clues.some((c,i)=>!this.clues.includes(i)&&Math.hypot(this.x-c.x,this.z-c.z)<3)){this.emit('hint','Ative Visão Oceânica para revelar os fragmentos.');return false;}for(let i=0;i<clues.length;i++){if(this.effects.vision&&!this.clues.includes(i)&&Math.hypot(this.x-clues[i].x,this.z-clues[i].z)<3){this.clues.push(i);this.emit('clue','Fragmento '+this.clues.length+'/3: o núcleo usa a frequência dos corais.');if(this.clues.length===3)this.advance();return true;}}}if(Math.hypot(q.x-this.x,q.z-this.z)<3.8){if(q.type==='travel'){this.travelMission=this.mission;this.travel={city:this.city==='Aonami'?'Hikaru':'Aonami',time:0};return true;}if(['talk','investigate','rescue'].includes(q.type)){this.emit('dialog',this.dialogue(q.id));this.advance();return true;}}}
 if(this.city==='Aonami'&&this.mission>=3&&Math.hypot(this.x+21,this.z-15.8)<3){this.sideRace={index:0,time:35,duration:35,lesson:true};this.emit('dialog','Ren: vamos praticar! Ative Surf Rápido e passe pelos três anéis sobre a água. O relógio começa no primeiro. A primeira aula concluída rende um ponto de evolução.');return true;}
 if(this.mission>=3){const index=regions[this.city].findIndex((r,i)=>r.power===-1&&!this.regionTasks.includes(this.city+'-'+i)&&Math.hypot(this.x-r.x,this.z-r.z)<4);if(index>=0){const r=regions[this.city][index];this.regionTasks.push(this.city+'-'+index);this.emit('dialog',r.name+': '+r.text+' Objetivo secundário concluído · +25 XP.');return true;}}
 if(this.mission>=10&&Math.hypot(this.x-22,this.z+8)<3.8){this.travel={city:this.city==='Aonami'?'Hikaru':'Aonami',time:0};return true;}
 if(Math.hypot(this.x-19,this.z-20)<4){this.hp=Math.min(100,this.hp+30);this.energy=100;this.emit('dialog','Quiosque das Marés: uma água de coco por conta da casa! Vitalidade e energia recuperadas.');return true;}
 const npc=npcs[this.city].find(n=>Math.hypot(this.x-n.x,this.z-n.z)<3.5);if(npc){if(npc.name==='Ren'&&this.shells.length>=5&&!this.sideDone){this.sideDone=true;this.emit('dialog','Ren: cinco conchas! Obrigado por ajudar minha pesquisa de surf. Conquista: Amigo do Litoral.');}else if(npc.name==='Ren'&&this.city==='Aonami'&&this.mission>=3){this.sideRace={index:0,time:25};this.emit('dialog','Ren: desafio de surf! Alcance os três anéis sobre a água. O cronômetro começa no primeiro anel. Use Surf Rápido e complete em 25 segundos.');}else this.emit('dialog',npc.name+': '+({Ren:'Se encontrar cinco conchas de memória, volte para me mostrar! Os pontos dourados indicam conchas.',Yuna:'Siga os marcadores. A tecnologia pode ajudar o mar quando ouvimos a natureza.',Mika:'Estamos medindo as correntes para entender o oceano, sem controlá-lo.',Sora:'Defenda-se antes do pulso dos robôs. A água também sabe esperar.'}[npc.name]));return true;}const citizen=this.citizens[this.city].find(p=>Math.hypot(this.x-p.x,this.z-p.z)<2.8);if(citizen){this.emit('dialog',citizen.name+': Estou '+citizen.activity+'. '+(this.city==='Aonami'?'A praia parece diferente desde que aquela onda azul apareceu.':'As lanternas estão acesas, mas o porto continua inquieto.'));return true;}this.emit('hint','Aproxime-se do marcador ou de um personagem para interagir.');return false;}
 save(){const safe={x:this.x,z:this.z};if(!this.interior)Systems.pushOut(safe,this.colliders());return {version:5,worldTime:this.time,trafficState:Object.fromEntries(['Aonami','Hikaru'].map(city=>[city,this.traffic[city].map(c=>({x:c.x,dir:c.dir}))])),lessonDone:this.lessonDone,upgrades:this.upgrades,enemyMission:this.mission,enemyState:this.enemies.map(e=>({id:e.id,x:e.x,z:e.z,hp:e.hp})),visited:this.visited,regionTasks:this.regionTasks,x:safe.x,z:safe.z,hp:this.hp,energy:this.energy,selected:this.selected,facing:this.facing,interior:this.interior,floor:this.floor,mission:this.mission,city:this.city,cleared:this.cleared,clues:this.clues,shells:this.shells,sideDone:this.sideDone,surfRecord:this.surfRecord};}
}
root.Kaito={Game,powers,missions,debris,clues,rings,shells,npcs,obstaclesByCity,surfRings,bounds,regions,isWater};if(typeof module!=='undefined')module.exports=root.Kaito;
})(typeof window!=='undefined'?window:globalThis);
