'use strict';
(()=>{
const $=id=>document.getElementById(id),map=$('map').getContext('2d'),canvas=$('world');let applicationReady=false;
KaitoBoot.bindCanvas(canvas,()=>{if(applicationReady){save(true);setPause(true);}});
const gl=KaitoBoot.context(canvas);if(!gl)return;
const vertex=`precision highp float;
attribute vec3 p;
attribute vec3 n;
uniform mat4 vp;
uniform mediump float time;
uniform mediump float water;
varying mediump vec3 normal;
varying mediump vec3 world;
varying lowp vec3 surfaceColor;
#ifdef INSTANCED
attribute vec3 iPos;
attribute vec3 iSize;
attribute vec2 iAngles;
attribute lowp vec3 iColor;
#else
uniform vec3 pos;
uniform vec3 size;
uniform float rot;
uniform float pitch;
uniform lowp vec3 color;
#endif
void main(){
#ifdef INSTANCED
 vec3 offset=iPos,scale=iSize;float yaw=iAngles.x,tilt=iAngles.y;surfaceColor=iColor;
#else
 vec3 offset=pos,scale=size;float yaw=rot,tilt=pitch;surfaceColor=color;
#endif
 float c=cos(yaw),s=sin(yaw),cp=cos(tilt),sp=sin(tilt);
 vec3 a=p*scale;
 a=vec3(a.x,a.y*cp-a.z*sp,a.y*sp+a.z*cp);
 vec3 nn=vec3(n.x,n.y*cp-n.z*sp,n.y*sp+n.z*cp);
 vec3 b=vec3(a.x*c+a.z*s,a.y,-a.x*s+a.z*c)+offset;
 if(water>.5&&water<1.5)b.y+=sin(b.x*.22+time*.9)*.3+sin(b.z*.4+time*.7)*.15;
 world=b;normal=vec3(nn.x*c+nn.z*s,nn.y,-nn.x*s+nn.z*c);
 gl_Position=vp*vec4(b,1.);
}
`;
const fragment=`precision mediump float;
uniform vec3 eye;
uniform float daylight;
uniform vec3 horizon;
uniform float quality;
uniform float fogDistance;
uniform mediump float water;
uniform mediump float time;
varying mediump vec3 normal;
varying mediump vec3 world;
varying lowp vec3 surfaceColor;
void main(){
 if(water>3.5){gl_FragColor=vec4(surfaceColor*(.4+.6*(1.-daylight)),1.);return;}
 if(water>2.5){float shade=.8+.2*max(0.,dot(normalize(normal),normalize(vec3(-.6,1.,.4))));gl_FragColor=vec4(mix(surfaceColor*shade,horizon,.18),1.);return;}
 if(water>1.5){float height=clamp((world.y-eye.y)/100.,0.,1.);vec3 top=mix(vec3(.06,.1,.21),vec3(.27,.58,.79),daylight);gl_FragColor=vec4(mix(horizon,top,height),1.);return;}
 vec3 sun=normalize(vec3(-.6,1.,.4));
 float light=.65+.35*max(0.,dot(normalize(normal),sun));
 vec3 col=surfaceColor*light*(.6+.4*daylight);
 col*=.98+.02*sin(world.x*5.)*sin(world.y*5.+world.z*3.);
 if(water>.5){
  vec3 waveNormal=normalize(vec3(-.066*cos(world.x*.22+time*.9),1.,-.06*cos(world.z*.4+time*.7)));
  vec3 view=normalize(eye-world);
  float fresnel=pow(1.-clamp(dot(waveNormal,view),0.,1.),3.);
  vec3 skyReflection=mix(horizon,vec3(.77,.9,.93),.35);
  col=mix(surfaceColor*(.65+.25*daylight),skyReflection,.25+.55*fresnel);
  float highlight=pow(max(0.,dot(reflect(-sun,waveNormal),view)),quality>1.?48.:20.);
  col+=vec3(1.,.91,.7)*highlight*.5*daylight;
  float crest=pow(max(0.,sin(world.z*2.4+sin(world.x*.16+time)*.8+time*1.4)),12.);
  float shore=smoothstep(-7.,1.,world.z);
  col=mix(col,vec3(.8,.95,.92),crest*(.16+.5*shore));
 }
 float fog=clamp((distance(eye,world)-fogDistance*.45)/(fogDistance*.65),0.,.96);
 gl_FragColor=vec4(mix(col,horizon,fog),1.);
}
`;

const safeFragment=`precision mediump float;
uniform vec3 eye;
uniform vec3 horizon;
uniform float daylight;
uniform float fogDistance;
uniform mediump float water;
varying mediump vec3 normal;
varying mediump vec3 world;
varying lowp vec3 surfaceColor;
void main(){
 if(water>3.5){gl_FragColor=vec4(surfaceColor*(.4+.6*(1.-daylight)),1.);return;}
 if(water>1.5){gl_FragColor=vec4(horizon,1.);return;}
 float light=.7+.3*max(0.,dot(normalize(normal),normalize(vec3(-.6,1.,.4))));
 vec3 color=surfaceColor*light*(.65+.35*daylight);
 float fog=clamp((distance(eye,world)-fogDistance*.45)/(fogDistance*.65),0.,.96);
 gl_FragColor=vec4(mix(color,horizon,fog),1.);
}`;
function shader(type,src){KaitoBoot.mark(type===gl.VERTEX_SHADER?'vertex-shader':'fragment-shader');const shader=gl.createShader(type);if(!shader)throw Error('Não foi possível alocar um shader.');gl.shaderSource(shader,src);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)){const message=gl.getShaderInfoLog(shader)||'o driver não forneceu detalhes';gl.deleteShader(shader);throw Error(message);}return shader;}
function makeProgram(fs){const program=gl.createProgram();if(!program)throw Error('Não foi possível alocar o programa gráfico.');let vs=null,fragmentShader=null;try{vs=shader(gl.VERTEX_SHADER,vertex);fragmentShader=shader(gl.FRAGMENT_SHADER,fs);gl.attachShader(program,vs);gl.attachShader(program,fragmentShader);gl.bindAttribLocation(program,0,'p');gl.bindAttribLocation(program,1,'n');KaitoBoot.mark('program-link');gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('Falha ao conectar shaders: '+(gl.getProgramInfoLog(program)||'o driver não forneceu detalhes'));return program;}catch(error){gl.deleteProgram(program);throw error;}finally{if(vs)gl.deleteShader(vs);if(fragmentShader)gl.deleteShader(fragmentShader);}}
let program,activeFragment=KaitoBoot.compatibility?safeFragment:fragment;
try{program=makeProgram(activeFragment);}catch(first){KaitoBoot.note('PRIMARY_SHADER_FAILURE',first.message);if(!KaitoBoot.compatibility&&!KaitoBoot.contextLost){KaitoBoot.compatibility=true;activeFragment=safeFragment;try{program=makeProgram(safeFragment);KaitoBoot.note('SAFE_SHADER_ACTIVE','A renderização simplificada foi ativada.');}catch(second){KaitoFail(second.message,'SAFE_SHADER_FAILURE');return;}}else{KaitoFail(first.message,'SHADER_FAILURE');return;}}
gl.useProgram(program);KaitoBoot.finish('program');KaitoBoot.mark('geometry');

const u={};for(const k of ['vp','pos','size','rot','pitch','time','water','color','eye','daylight','horizon','quality','fogDistance'])u[k]=gl.getUniformLocation(program,k);const pa=gl.getAttribLocation(program,'p'),na=gl.getAttribLocation(program,'n');gl.enableVertexAttribArray(pa);gl.enableVertexAttribArray(na);gl.enable(gl.DEPTH_TEST);
function mesh(vertices,normals){const b=gl.createBuffer();if(!b)throw Error('Memória gráfica insuficiente para carregar a geometria. Tente o modo leve.');gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(vertices.concat(normals)),gl.STATIC_DRAW);return {b,count:vertices.length/3,offset:vertices.length*4};}
let v=[],n=[];function tri(a,b,c){let x=b.map((e,i)=>e-a[i]),y=c.map((e,i)=>e-a[i]),q=[x[1]*y[2]-x[2]*y[1],x[2]*y[0]-x[0]*y[2],x[0]*y[1]-x[1]*y[0]],l=Math.hypot(...q)||1;q=q.map(e=>e/l);v.push(...a,...b,...c);n.push(...q,...q,...q);}
for(let axis=0;axis<3;axis++)for(let sign of [-1,1]){let pts=[[-1,-1],[1,-1],[1,1],[-1,1]].map(([a,b])=>{let p=[0,0,0];p[axis]=sign*.5;p[(axis+1)%3]=a*.5;p[(axis+2)%3]=b*.5;return p;});if(sign<0)pts.reverse();tri(pts[0],pts[1],pts[2]);tri(pts[0],pts[2],pts[3]);}const box=mesh(v,n),lightMesh={...box};
v=[];n=[];for(let j=0;j<8;j++)for(let i=0;i<12;i++){function p(a,b){const t=a/8*Math.PI,f=b/12*Math.PI*2;return [Math.sin(t)*Math.cos(f)*.5,Math.cos(t)*.5,Math.sin(t)*Math.sin(f)*.5];}tri(p(j,i),p(j+1,i+1),p(j+1,i));tri(p(j,i),p(j,i+1),p(j+1,i+1));}const sphere=mesh(v,n);const skyMesh={...sphere},cloudMesh={...sphere};
v=[];n=[];for(let i=0;i<12;i++){const a=i/12*Math.PI*2,b=(i+1)/12*Math.PI*2;tri([Math.cos(a)*.5,-.5,Math.sin(a)*.5],[0,.5,0],[Math.cos(b)*.5,-.5,Math.sin(b)*.5]);}const cone=mesh(v,n);

// Lower-detail geometry is shared by all distant objects; near models are preserved.
v=[];n=[];for(let j=0;j<4;j++)for(let i=0;i<8;i++){const point=(a,b)=>{const t=a/4*Math.PI,f=b/8*Math.PI*2;return [Math.sin(t)*Math.cos(f)*.5,Math.cos(t)*.5,Math.sin(t)*Math.sin(f)*.5];};tri(point(j,i),point(j+1,i+1),point(j+1,i));tri(point(j,i),point(j,i+1),point(j+1,i+1));}const lowSphere=mesh(v,n);
v=[];n=[];for(let i=0;i<6;i++){const a=i/6*Math.PI*2,b=(i+1)/6*Math.PI*2;tri([Math.cos(a)*.5,-.5,Math.sin(a)*.5],[0,.5,0],[Math.cos(b)*.5,-.5,Math.sin(b)*.5]);}const lowCone=mesh(v,n);

v=[];n=[];for(let x=-180;x<180;x+=6)for(let z=-96;z<0;z+=6){tri([x,0,z],[x,0,z+6],[x+6,0,z]);tri([x+6,0,z],[x,0,z+6],[x+6,0,z+6]);}const sea=mesh(v,n);
KaitoBoot.finish('geometry');KaitoBoot.mark('state');
const colors={sand:[.88,.79,.58],shore:[.91,.85,.67],water:[.12,.65,.69],green:[.17,.49,.31],trunk:[.47,.31,.19],white:[.94,.94,.82],blue:[.08,.42,.65],red:[.84,.22,.19],skin:[.89,.65,.43],hair:[.07,.09,.11],wood:[.54,.38,.23],dark:[.12,.24,.25],gold:[1,.72,.25]};
let batch=null,recording=null,drawCalls=0;const modelCache=new Map(),viewPlanes=new Float32Array(24);let frustumReady=false;
function draw(m,pos,size,color,rot=0,water=0,pitch=0){if(recording){recording.push([m,pos,size,color,rot,water,pitch]);return;}const distance=Math.hypot(pos[0]-g.x,pos[2]-g.z),quality=Number($('quality').value);if(m===sphere&&(quality===1||distance>45))m=lowSphere;if(m===cone&&(quality===1||distance>65))m=lowCone;if((water<1.5||water===4)&&m!==sea&&Math.max(...size)<50&&Math.hypot(pos[0]-g.x,pos[2]-g.z)>Number($('distance').value))return;if(frustumReady&&(water<1.5||water===4)&&m!==sea&&!KaitoSystems.visibleSphere(viewPlanes,pos[0],pos[1],pos[2],Math.hypot(...size)*.5))return;if(batch?.enabled){batch.submit(m,pos,size,typeof color==='string'?colors[color]:color,rot,pitch,water);return;}drawCalls++;gl.bindBuffer(gl.ARRAY_BUFFER,m.b);gl.vertexAttribPointer(pa,3,gl.FLOAT,false,0,0);gl.vertexAttribPointer(na,3,gl.FLOAT,false,0,m.offset);gl.uniform3fv(u.pos,pos);gl.uniform3fv(u.size,size);gl.uniform3fv(u.color,typeof color==='string'?colors[color]:color);gl.uniform1f(u.rot,rot);gl.uniform1f(u.pitch,pitch);gl.uniform1f(u.water,water);gl.drawArrays(gl.TRIANGLES,0,m.count);}
let saved={},options={};try{saved=JSON.parse(localStorage.getItem('kaito-nami-v2')||'null');if(!saved){const legacy=JSON.parse(localStorage.getItem('kaito-nami-v1')||'{}')||{};saved={mission:legacy.stage>=2?3:legacy.stage===1?2:0,cleared:legacy.cleared||[]};}options=JSON.parse(localStorage.getItem('kaito-options')||'{}')||{};}catch{}
options=KaitoSystems.preferences(options);if(KaitoBoot.compatibility){options.quality='1';options.distance=60;options.shadows=false;options.weather=false;options.fpsCap=30;options.compatibility=true;}
let g=new Kaito.Game(saved),paused=true,angle=1.1,camera=[g.x+Math.sin(1.1)*10,g.floorHeight+g.y+4.8,g.z+Math.cos(1.1)*10],keys={},drag=null,audio,toastTimer,lastSave='',dialogOpen=false,uiTimer=0,walk=0,sceneTime=g.time,binding=null,touchRun=false,camDistance=10,camHeight=4.8,menuOpen=true,previousButtons=[],cinematic=null,currentFov=60,stepClock=0,ready=false,visualFacing=g.facing,animationWeight=0,poseTime=0;
KaitoBoot.finish('state');
const bindings={forward:'KeyW',back:'KeyS',left:'KeyA',right:'KeyD',jump:'Space',power:'KeyQ',interact:'KeyE',dodge:'KeyR',attack:'KeyF',parry:'KeyG',...(options.bindings||{})};
const obstaclesByCity=Kaito.obstaclesByCity;
function obstacles(){return g.colliders();}
function pref(){try{localStorage.setItem('kaito-options',JSON.stringify({bindings,quality:$('quality').value,difficulty:$('difficulty').value,volume:$('volume').value,dayCycle:$('dayCycle').checked,music:$('music').value,narration:$('narration').checked,dialogueVolume:$('dialogueVolume').value,map:$('mapToggle').checked,distance:$('distance').value,sensitivity:$('sensitivity').value,shadows:$('shadows').checked,weather:$('weather').checked,reducedMotion:$('reducedMotion').checked,contrast:$('contrast').checked,largeText:$('largeText').checked,cinematics:$('cinematics').checked,tutorials:$('tutorials').checked,performance:$('showPerformance').checked,fpsCap:Number($('fpsCap').value),compatibility:KaitoBoot.compatibility}));}catch{}}
function applyOptions(){g.dayCycle=$('dayCycle').checked;g.difficulty=$('difficulty').value;$('mapBox').classList.toggle('hidden',!$('mapToggle').checked);$('performance').classList.toggle('hidden',!$('showPerformance').checked);document.body?.classList.toggle('contrast',$('contrast').checked);document.body?.classList.toggle('large-text',$('largeText').checked);if(!$('tutorials').checked)$('tutorial').classList.add('hidden');pref();}

let lastSaveAt=-Infinity,lastMission=-1;function save(force=false){const now=performance.now();if(!force&&now-lastSaveAt<1000&&g.mission===lastMission)return;const s=JSON.stringify(g.save());if(s===lastSave)return;lastSave=s;lastSaveAt=now;lastMission=g.mission;try{localStorage.setItem('kaito-nami-v2',s);}catch{toast('Salvamento indisponível neste navegador.');}}
function toast(s){$('toast').textContent=s;$('toast').classList.remove('hidden');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.add('hidden'),4000);}
function tone(freq=300,length=.35,type='sine',gainScale=1){const volume=Number($('volume').value)/100;if(!volume)return;try{audio=audio||new(window.AudioContext||window.webkitAudioContext)();audio.resume();const o=audio.createOscillator(),a=audio.createGain();o.type=type;o.frequency.setValueAtTime(freq,audio.currentTime);o.frequency.exponentialRampToValueAtTime(freq/2,audio.currentTime+length);a.gain.setValueAtTime(volume*.09*gainScale,audio.currentTime);a.gain.exponentialRampToValueAtTime(.001,audio.currentTime+length);o.connect(a).connect(audio.destination);o.start();o.stop(audio.currentTime+length);}catch{}}
let musicClock=0,musicNote=0;function music(dt){musicClock+=dt;if(musicClock<.7||!Number($('music').value))return;musicClock=0;try{audio=audio||new(window.AudioContext||window.webkitAudioContext)();if(audio.state==='suspended')return;const melody=dialogOpen?[261.63,329.63,392,293.66]:g.mission===20?[329.63,392,440,523.25,440,392,329.63,293.66]:g.enemies.some(e=>e.hp>0&&e.boss)?[110,130.81,146.83,164.81,130.81,146.83]:g.enemies.some(e=>e.hp>0)?[146.83,174.61,220,164.81]:g.mission===17?[130.81,146.83,196,174.61]:g.city==='Hikaru'?[196,246.94,293.66,369.99,293.66,246.94]:g.z<4?[261.63,293.66,392,329.63,293.66,220]:[220,261.63,329.63,293.66,261.63,196,220,293.66];const o=audio.createOscillator(),a=audio.createGain();o.type='triangle';o.frequency.value=melody[musicNote++%melody.length];a.gain.setValueAtTime(Number($('music').value)/100*.025,audio.currentTime);a.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.65);o.connect(a).connect(audio.destination);o.start();o.stop(audio.currentTime+.7);}catch{}}
const metCharacters=new Set(),shownTutorials=new Set();
try{for(const name of JSON.parse(localStorage.getItem('kaito-met-characters')||'[]'))if(typeof name==='string')metCharacters.add(name);for(const id of JSON.parse(localStorage.getItem('kaito-tutorials')||'[]'))if(Number.isInteger(id))shownTutorials.add(id);}catch{}
function narrate(text){if(!$('narration').checked||!window.speechSynthesis||!window.SpeechSynthesisUtterance)return;try{window.speechSynthesis.cancel();const speech=new window.SpeechSynthesisUtterance(text);speech.lang='pt-BR';speech.volume=Number($('dialogueVolume').value)/100;speech.rate=.95;window.speechSynthesis.speak(speech);}catch{toast('A leitura de diálogos não está disponível neste navegador.');}}
function beginDialog(text,ending=false){
 dialogOpen=true;keys={};$('tutorial').classList.add('hidden');
 const name=text.includes(':')?text.split(':',1)[0]:ending?'Guardião das Marés':'História';
 let intro='';if(KaitoContent.introductions[name]&&!metCharacters.has(name)){intro=KaitoContent.introductions[name]+' ';metCharacters.add(name);try{localStorage.setItem('kaito-met-characters',JSON.stringify([...metCharacters]));}catch{}}
 $('dialog').classList.remove('hidden');$('speaker').textContent=ending?'GUARDIÃO DAS MARÉS · ENCERRAMENTO':name.toUpperCase();$('speech').textContent=intro+text;narrate(intro+text);
 if($('cinematics').checked&&!$('reducedMotion').checked){const npc=Kaito.npcs[g.city].find(n=>n.name===name&&Math.hypot(n.x-g.x,n.z-g.z)<7);cinematic={returnAngle:angle,angle,elapsed:0,x:npc?(g.x+npc.x)/2:g.x,z:npc?(g.z+npc.z)/2:g.z};document.body?.classList.add('cinematic');$('cinemaTop').classList.remove('hidden');$('cinemaBottom').classList.remove('hidden');}
}
const scenes={1:['Kaito','Essa água… está me ouvindo? Preciso ajudar quem ficou preso na corrente.'],2:['Ren','Você conseguiu! Seus poderes podem ajudar aquele surfista. Eu vou avisar a Mika.'],8:KaitoContent.dialogues[9],11:KaitoContent.dialogues[11],14:['Mika','O bombeamento parou. Sora está no Bairro das Lanternas; ele descobriu a origem do núcleo.'],17:['Ren','Todos estão seguros no abrigo! O sinal vem da ilha secreta. Eu fico aqui com a Mika.'],18:['Kuroda','O guardião parou. Agora só você pode devolver essa energia ao oceano. Eu vou desligar a rede.']};
function events(){let event;while(event=g.events.shift()){
 if(event.type==='dialog'||event.type==='ending')beginDialog(event.text,event.type==='ending');
 else if(event.type==='complete'){tone(660);toast('Missão concluída · '+event.text+' · +60 XP');const scene=scenes[g.mission-1];if(scene&&!dialogOpen&&$('cinematics').checked)beginDialog(scene[0]+': '+scene[1]);}
 else if(event.type==='hit'){tone(180,.12,'triangle');}else if(event.type==='swing'){tone(360,.07,'sine');}else{toast(event.text);if(event.type==='collect')tone(880);}
}}
function closeDialog(){try{window.speechSynthesis?.cancel();}catch{}dialogOpen=false;$('dialog').classList.add('hidden');if(cinematic)angle=cinematic.returnAngle;cinematic=null;document.body?.classList.remove('cinematic');$('cinemaTop').classList.add('hidden');$('cinemaBottom').classList.add('hidden');}
function tutorial(){if(paused||dialogOpen||!$('tutorials').checked||shownTutorials.has(g.mission)||!KaitoContent.tutorials[g.mission])return;$('tutorialText').textContent=KaitoContent.tutorials[g.mission];$('tutorial').classList.remove('hidden');}
$('closeTutorial').onclick=()=>{shownTutorials.add(g.mission);$('tutorial').classList.add('hidden');try{localStorage.setItem('kaito-tutorials',JSON.stringify([...shownTutorials]));}catch{}};
$('closeDialog').onclick=closeDialog;

function objective(){if(g.arena){const e=g.enemies.find(e=>e.hp>0);if(e)return {...e,label:g.arena.name+' · robô'};}if(g.tideTrial){const gate=Kaito.tideCourse[g.tideTrial.index];return {...gate,label:'Corrente Azul · anel '+(g.tideTrial.index+1)+(gate.y?' · salte!':'')};}if(g.interior)return g.floor===1?(g.mission===12?{x:0,z:3.5,label:'Terminal da torre'}:{x:3,z:2,label:'Elevador para o térreo'}):(g.mission===12?{x:3,z:2,label:'Elevador para o mirante'}:{x:0,z:-5,label:'Saída da torre'});if(g.sideRace&&g.city==='Aonami')return {...Kaito.surfRings[g.sideRace.index],label:'Surf · Anel '+(g.sideRace.index+1)};let q=g.quest;if(!q)return null;if(q.city!==g.city)return {x:22,z:-8,label:'Barco para '+q.city,boat:true};if(q.type==='clear'){const d=g.targets().sort((a,b)=>a.d-b.d)[0];return d?{...Kaito.debris[d.i],label:'Destroço',ready:d.inRange}:null;}if(q.type==='clues'){const c=Kaito.clues.filter((_,i)=>!g.clues.includes(i)).sort((a,b)=>Math.hypot(a.x-g.x,a.z-g.z)-Math.hypot(b.x-g.x,b.z-g.z))[0];return c?{...c,label:'Fragmento'}:null;}if(q.type==='race')return {...Kaito.rings[g.raceIndex],label:'Anel '+(g.raceIndex+1)};if(['combat','boss'].includes(q.type)){const e=g.enemies.find(e=>e.hp>0);if(e)return {...e,label:e.boss?'Guardião do núcleo':'Robô'};}return {...q,label:q.who};}
function drawMap(){if(!map)return;if(g.interior){map.clearRect(0,0,276,220);map.fillStyle='#284354';map.fillRect(0,0,276,220);map.strokeStyle='#9ce5d7';map.lineWidth=3;map.strokeRect(20,20,236,180);map.fillStyle='#edc985';map.fillRect(195,140,24,24);map.fillStyle='#adf2d9';map.fillRect(122,g.floor?175:20,32,12);map.fillStyle='#fff';map.beginPath();map.arc(138+g.x*19,110+g.z*15,6,0,Math.PI*2);map.fill();map.font='16px system-ui';map.fillText(g.floor?'MIRANTE':'TÉRREO',25,45);return;}map.clearRect(0,0,276,220);map.fillStyle=g.city==='Aonami'?'#cabc8d':'#354b64';map.fillRect(0,0,276,220);map.fillStyle='#28828f';map.fillRect(0,0,276,50);const point=(x,z)=>[(x-Kaito.bounds.minX)/(Kaito.bounds.maxX-Kaito.bounds.minX)*276,(z-Kaito.bounds.minZ)/(Kaito.bounds.maxZ-Kaito.bounds.minZ)*220];function dot(x,z,c,r=5){const p=point(x,z);map.fillStyle=c;map.beginPath();map.arc(p[0],p[1],r,0,Math.PI*2);map.fill();}for(const o of obstacles()){const p=point(o.x,o.z);map.fillStyle='#657462';map.fillRect(p[0]-o.r*3,p[1]-o.r*3,o.r*6,o.r*6);}for(let i=0;i<6;i++){const r=Kaito.regions[g.city][i];dot(r.x,r.z,g.regionTasks.includes(g.city+'-'+i)?'#80a89b':'#8ad7bd',4);}for(const a of Kaito.arenas)if(a.city===g.city)dot(a.x,a.z,'#ff8e83',6);for(const n of Kaito.npcs[g.city])dot(n.x,n.z,'#e5c78f',3);for(let i=0;i<5;i++)if(!g.shells.includes(g.city+'-'+i))dot(Kaito.shells[i].x,Kaito.shells[i].z,'#eec875',3);if(g.mission>=10)dot(22,-8,'#aebcff',6);const target=objective();if(target&&(!g.quest||g.quest.city===g.city||target.boat))dot(target.x,target.z,target.ready?'#a9ffbc':'#91f1ee',8);for(const e of g.enemies)if(e.hp>0)dot(e.x,e.z,'#ff7c6d',5);dot(g.x,g.z,'#fff');const p=point(g.x,g.z);map.strokeStyle='#fff';map.lineWidth=3;map.beginPath();map.moveTo(...p);map.lineTo(p[0]+Math.sin(g.facing)*13,p[1]+Math.cos(g.facing)*13);map.stroke();map.fillStyle='#e8f4e7';map.font='bold 16px system-ui';map.fillText('N ↑',12,24);}
function district(){if(g.interior)return g.floor?'Torre Hikari · Mirante':'Torre Hikari · Térreo';return [...Kaito.regions[g.city]].sort((a,b)=>Math.hypot(a.x-g.x,a.z-g.z)-Math.hypot(b.x-g.x,b.z-g.z))[0].name;}
function updateUI(){const q=g.quest,p=Kaito.powers[g.selected],target=objective();$('chapter').textContent='CAMPANHA · '+Math.min(g.mission+1,20)+' / 20';$('objective').textContent=g.arena?g.arena.name:q?q.title:'Guardião das Marés';$('description').textContent=g.arena?'Desative todos os robôs. G defende no impacto; F ataca, Q usa o poder. Use E na placa para cancelar.':q?q.text:'A rede foi desligada. Explore as duas cidades, encontre as conchas e visite seus amigos.';$('counter').textContent=g.tideTrial?'CORRENTE AZUL · '+g.tideTrial.index+'/5 · '+Math.max(0,25-g.tideTrial.elapsed).toFixed(1)+'s':g.sideRace?'SURF · ANEL '+g.sideRace.index+'/3 · '+Math.ceil(g.sideRace.time)+'s':q?.type==='clear'?g.cleared.length+'/3 DESTROÇOS':q?.type==='clues'?g.clues.length+'/3 FRAGMENTOS':q?.type==='race'?'ANEL '+g.raceIndex+'/3 · '+Math.ceil(g.raceTime)+'s':'NÍVEL '+g.level+' · '+(g.xp+g.regionTasks.length*25)+' XP · '+g.shells.length+'/10 CONCHAS';$('worldClock').textContent=$('dayCycle').checked?KaitoSystems.worldClock(g.time):'';$('location').textContent=g.city.toUpperCase()+' · '+district().toUpperCase();$('hp').style.width=g.hp+'%';$('energy').style.width=g.energy+'%';$('statsText').textContent='VITALIDADE '+Math.ceil(g.hp)+' · MARÉ '+Math.floor(g.energy);$('cooldown').textContent=g.cooldowns[g.selected]>0?p.name+' · '+g.cooldowns[g.selected].toFixed(1)+'s':p.name+' · '+p.cost+' maré';$('wave').style.opacity=g.cooldowns[g.selected]>0?.5:1;const dist=target?Math.hypot(g.x-target.x,g.z-target.z):0;$('navigation').textContent=g.travel?'⛵ Viagem para '+g.travel.city:target?(g.quest&&g.quest.city!==g.city?'⛵ Barco para '+g.quest.city+' · '+Math.ceil(dist)+' m':target.ready?'≋ Alvo ao alcance · use seu poder':'◆ '+target.label+' · '+Math.ceil(dist)+' m'):'✓ Campanha concluída';const focused=g.getCombatTarget();$('focusTarget').setAttribute('aria-pressed',String(!!focused));$('targetText').textContent=focused?(focused.boss?'GUARDIÃO · FASE '+(focused.phase+1):'ROBÔ MARCADO')+' · '+Math.ceil(focused.hp)+' / '+focused.maxHp+' · C libera':'';$('comboText').textContent=g.effects.mist?'NÉVOA ATIVA · robôs próximos e chefes ainda detectam você':g.parryTime?'DEFESA AQUÁTICA · janela ativa':g.wallRunning?'CORRIDA DE PAREDE · solte Corrida e toque Salto para impulsionar':g.wallSliding?'DESCIDA AQUÁTICA':g.grounded&&g.y>2?'TELHADO · '+g.y.toFixed(1)+' m':g.meleeWindow>0?'SEQUÊNCIA '+g.meleeStep+'/3'+(g.counter?' · CONTRA-ATAQUE':''):g.counter?'CONTRA-ATAQUE DISPONÍVEL':g.gliding?'DESLIZE DE NÉVOA':g.effects.surf?'SURF DE MARÉ · CORRA PARA ACELERAR':'';$('powerIndex').textContent=(g.selected+1)%10;$('travel').classList.toggle('hidden',!g.travel);if(g.travel)$('travel').textContent='⛵ Navegando para '+g.travel.city+'…';document.querySelectorAll('.progress i').forEach((e,i)=>e.classList.toggle('on',g.mission>=20||i<Math.ceil(g.mission/7)));drawMap();save();}
function toggleTarget(){if(paused||dialogOpen)return;g.toggleTarget();events();updateUI();}
function parry(){if(paused||dialogOpen)return;if(g.parry()){tone(540,.1);events();updateUI();}}
function basicAttack(){if(paused||dialogOpen)return;g.aimAtTarget();if(g.attack()){events();updateUI();}}
function usePower(){if(paused||dialogOpen)return;g.aimAtTarget();if(g.power()){tone(180+g.selected*65,.12+g.selected*.025,['sine','triangle','sine','triangle','sine','sawtooth','triangle','sine','sine','triangle'][g.selected]);events();updateUI();}}
function performDodge(input){if(paused||dialogOpen)return false;const x=input?.x??((keys[bindings.right]?1:0)-(keys[bindings.left]?1:0)),z=input?.z??((keys[bindings.back]?1:0)-(keys[bindings.forward]?1:0));return g.dodge({x:x*Math.cos(angle)+z*Math.sin(angle),z:-x*Math.sin(angle)+z*Math.cos(angle)});}
function talk(){if(paused)return;if(dialogOpen){closeDialog();return;}g.interact();events();updateUI();}
function setPause(value){if(value)save(true);paused=value;keys={};closeDialog();$('menu').classList.toggle('hidden',!paused);$('start').textContent='Continuar aventura ↗';$('reset').classList.remove('hidden');if(paused)showTab('settings');}
addEventListener('pagehide',()=>save(true));
function drawAtlas(){const b=Kaito.bounds,point=(x,z)=>[(x-b.minX)/(b.maxX-b.minX)*300,(z-b.minZ)/(b.maxZ-b.minZ)*240];$('mapPanel').innerHTML='<h3>Mapa das duas cidades</h3><p>Descubra um local caminhando até o farol verde. Depois, viaje até ele por este mapa. O barco continua sendo a passagem entre cidades.</p><div class="atlas-grid">'+['Aonami','Hikaru'].map(city=>{const regions=Kaito.regions[city],here=city===g.city,player=point(g.x,g.z),q=g.quest;return '<section><h4>'+city+(here?' · você está aqui':'')+'</h4><svg viewBox="0 0 300 240" role="img" aria-label="Mapa de '+city+'"><rect width="300" height="240" fill="'+(city==='Aonami'?'#728967':'#34475c')+'"/><rect width="300" height="55" fill="#246d80"/>'+regions.map((r,i)=>{const p=point(r.x,r.z),done=g.regionTasks.includes(city+'-'+i);return '<circle cx="'+p[0]+'" cy="'+p[1]+'" r="6" fill="'+(done?'#b6d5b6':'#f5ce7d')+'"/><text x="'+Math.max(15,Math.min(220,p[0]+9))+'" y="'+(p[1]-8)+'" fill="#fff" font-size="9">'+(i+1)+'</text>';}).join('')+(here?'<circle cx="'+player[0]+'" cy="'+player[1]+'" r="5" fill="#fff"/>':'')+(q?.city===city?'<path d="M '+point(q.x,q.z)[0]+' '+(point(q.x,q.z)[1]-7)+' l 5 7 -5 7 -5 -7 Z" fill="#79f6ed"/>':'')+'</svg>'+regions.map((r,i)=>{const known=g.visited.includes(city+'-'+i),done=g.regionTasks.includes(city+'-'+i);return '<div class="atlas-place"><b>'+ (i+1)+'. '+r.name+'</b><small>'+(done?'✓ '+r.task:r.task+' · '+(r.power<0?'Interagir':Kaito.powers[r.power].name))+'</small><button data-fast="'+i+'" '+(!here||!known?'disabled':'')+'>'+(known?'Viajar':'Descobrir primeiro')+'</button></div>';}).join('')+'</section>';}).join('')+'</div>';for(const button of document.querySelectorAll('[data-fast]'))button.onclick=()=>{if(g.fastTravel(Number(button.dataset.fast))){camera=[g.x+Math.sin(angle)*camDistance,g.floorHeight+camHeight,g.z+Math.cos(angle)*camDistance];save(true);}events();updateUI();drawAtlas();};}

function outfitMenu(){return '<h3>Skins por missão</h3>'+Kaito.outfits.map(o=>'<button class="secondary" data-outfit="'+o.id+'" '+(g.mission<o.unlock?'disabled':'')+'>'+o.name+(g.outfit===o.id?' ✓':g.mission<o.unlock?' · missão '+o.unlock:'')+'</button>').join('');}
function showTab(tab){menuOpen=tab==='settings';$('mapPanel').classList.toggle('hidden',tab!=='map');if(tab==='map')drawAtlas();$('settingsPanel').classList.toggle('hidden',tab!=='settings');$('skillsPanel').classList.toggle('hidden',tab!=='skills');$('journalPanel').classList.toggle('hidden',tab!=='journal');$('inventoryPanel').classList.toggle('hidden',tab!=='inventory');if(tab==='skills'){$('skillsPanel').innerHTML='<p>Pontos de evolução disponíveis: '+g.upgradePoints+'</p>'+Kaito.powers.map((p,i)=>'<div class="skill-wrap"><button class="skill '+(i===g.selected?'selected':'')+'" data-power="'+i+'" '+(!g.unlocked(i)?'disabled':'')+'><b>'+((i+1)%10)+' · '+p.name+' · Nv. '+(g.upgrades[i]+1)+'</b><small>'+p.description+'</small><span>'+(g.unlocked(i)?Math.floor(p.cost*(1-g.upgrades[i]*.05))+' maré · '+(p.cooldown*(1-g.upgrades[i]*.08)).toFixed(1)+'s':'Desbloqueia na missão '+(p.unlock+1))+'</span></button><button class="upgrade" data-upgrade="'+i+'" '+(!g.unlocked(i)||g.upgradePoints<=0||g.upgrades[i]>=3?'disabled':'')+'>Evoluir · 1 ponto</button></div>').join('');for(const b of document.querySelectorAll('[data-power]'))b.onclick=()=>{g.selected=Number(b.dataset.power);showTab('skills');updateUI();};for(const b of document.querySelectorAll('[data-upgrade]'))b.onclick=()=>{g.upgrade(Number(b.dataset.upgrade));events();save(true);showTab('skills');};}if(tab==='journal')$('journalPanel').innerHTML='<h3>Diário de Kaito</h3>'+Kaito.missions.map((m,i)=>'<p class="questline '+(i===g.mission?'current':'')+'">'+(i<g.mission?'✓':i===g.mission?'◆':'○')+' '+(i+1)+'. '+m.title+' <small>'+m.city+'</small></p>').join('');if(tab==='inventory')$('inventoryPanel').innerHTML='<h3>Inventário e conquistas</h3><p>Sensores dos telhados de Yuna: '+g.roofSensors.length+'/3 · recompensa: 1 ponto de evolução</p><p>Circuito Corrente Azul: '+(g.tideRecord===null?'inicie na placa junto à escola de surf':g.tideRecord.toFixed(1)+' s · concluído')+'</p><p>Objetivos de bairro: '+g.regionTasks.length+'/12 · Locais descobertos: '+g.visited.length+'/12</p><p>Recorde de surf: '+(g.surfRecord===null?'fale com Ren em Aonami':g.surfRecord.toFixed(1)+' s')+'</p><p>Prancha personalizada · Mochila vermelha · Comunicador de Yuna</p><p>Bônus de dano: +'+g.combatBonus+' · aumenta por missão após a terceira e por nível.</p><p>Arenas vencidas: '+g.arenaWins.length+'/2 · uma recompensa por arena.</p><p>Conchas de memória: '+g.shells.length+'/10</p><p>Fragmentos da Maré Zero: '+g.clues.length+'/3</p><p>'+ (g.mission>=3?'✓':'○')+' Despertar das marés</p><p>'+(g.mission>=10?'✓':'○')+' Passageiro do oceano</p><p>'+(g.sideDone?'✓':'○')+' Amigo do Litoral: mostre 5 conchas a Ren</p><p>'+(g.mission===20?'✓':'○')+' Guardião das Marés</p>'+outfitMenu();if(tab==='inventory')for(const button of document.querySelectorAll('[data-outfit]'))button.onclick=()=>{if(g.setOutfit(button.dataset.outfit)){events();save(true);showTab('inventory');}};} 
$('start').onclick=()=>{paused=false;keys={};$('menu').classList.add('hidden');tone(300);tutorial();};$('pause').onclick=()=>setPause(!paused);$('wave').onclick=usePower;$('attack').onclick=basicAttack;$('parry').onclick=parry;$('focusTarget').onclick=toggleTarget;$('interact').onclick=talk;$('closeDialog').onclick=closeDialog;$('dodge').onclick=()=>{if(!paused)performDodge();};$('run').onclick=()=>{touchRun=!touchRun;$('run').setAttribute('aria-pressed',String(touchRun));};$('nextPower').onclick=()=>{do{g.selected=(g.selected+1)%10;}while(!g.unlocked(g.selected));updateUI();};$('jump').onpointerdown=e=>{keys[bindings.jump]=true;$('jump').setPointerCapture(e.pointerId);};$('jump').onpointerup=$('jump').onpointercancel=()=>keys[bindings.jump]=false;
$('reset').onclick=()=>{if(!confirm('Apagar o progresso e reiniciar a campanha?'))return;g=new Kaito.Game();g.difficulty=$('difficulty').value;save(true);angle=1.1;camera=[g.x+Math.sin(angle)*10,g.floorHeight+7,g.z+Math.cos(angle)*10];lastSave='';updateUI();toast('Nova campanha iniciada.');};

$('exportSave').onclick=()=>{save(true);try{const blob=new Blob([JSON.stringify(g.save(),null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='Kaito-Nami-progresso.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),5000);toast('Progresso exportado. Guarde o arquivo para continuar depois.');}catch{toast('Não foi possível exportar o progresso neste navegador.');}};
$('importSave').onclick=()=>$('saveFile').click();$('saveFile').onchange=async()=>{const file=$('saveFile').files?.[0];if(!file)return;try{if(file.size>65536)throw Error();const s=JSON.parse(await file.text());if(!s||!Number.isInteger(s.mission)||s.mission<0||s.mission>20||!['Aonami','Hikaru'].includes(s.city))throw Error();if(!confirm('Substituir o progresso atual pelo arquivo escolhido?'))return;g=new Kaito.Game(s);g.difficulty=$('difficulty').value;camera=[g.x,g.floorHeight+g.y+7,g.z+10];angle=0;lastSave='';save(true);updateUI();toast('Progresso restaurado. Clique em Continuar aventura.');}catch{toast('Arquivo de progresso inválido. O jogo atual foi preservado.');}finally{$('saveFile').value='';}};

for(const b of document.querySelectorAll('[data-tab]'))b.onclick=()=>showTab(b.dataset.tab);
for(const b of document.querySelectorAll('[data-bind]'))b.onclick=()=>{binding=b.dataset.bind;b.textContent='Pressione uma tecla…';};
function bindLabels(){for(const b of document.querySelectorAll('[data-bind]'))b.textContent=bindings[b.dataset.bind].replace('Key','');}bindLabels();
$('volume').value=options.volume;$('music').value=options.music;$('dialogueVolume').value=options.dialogueVolume;$('narration').checked=options.narration;if(!window.speechSynthesis||!window.SpeechSynthesisUtterance){$('narration').checked=false;$('narration').disabled=true;$('narrationHint').textContent='Leitura de diálogos indisponível neste navegador.';}$('quality').value=options.quality;$('difficulty').value=options.difficulty;$('distance').value=options.distance;$('sensitivity').value=options.sensitivity;$('fpsCap').value=String(options.fpsCap);
for(const name of ['dayCycle','shadows','weather','reducedMotion','contrast','largeText','cinematics','tutorials'])$(name).checked=options[name];$('showPerformance').checked=options.performance;$('mapToggle').checked=options.map;applyOptions();
$('sound').onclick=()=>{$('volume').value=Number($('volume').value)?0:35;pref();toast(Number($('volume').value)?'Efeitos ativados':'Efeitos desativados');tone();};
for(const id of ['dayCycle','volume','music','dialogueVolume','narration','difficulty','mapToggle','distance','sensitivity','shadows','weather','reducedMotion','contrast','largeText','cinematics','tutorials','showPerformance','fpsCap'])$(id).onchange=applyOptions;
addEventListener('keydown',e=>{if(binding){e.preventDefault();if(/^(Key[A-Z]|Space|ControlLeft|ControlRight)$/.test(e.code)&&!['Escape','KeyK','KeyJ','KeyI','KeyM','KeyC','ShiftLeft','ShiftRight'].includes(e.code)&&!/^Digit/.test(e.code)&&!Object.entries(bindings).some(([k,v])=>k!==binding&&v===e.code)){bindings[binding]=e.code;pref();}else if(e.code!=='Escape')toast('Essa tecla está em uso ou reservada para os menus.');binding=null;bindLabels();return;}if(paused&&['INPUT','SELECT','TEXTAREA'].includes(e.target?.tagName)&&e.code!=='Escape')return;if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();if(e.code==='Escape'&&!e.repeat)setPause(!paused);if(!e.repeat&&['KeyK','KeyJ','KeyI','KeyM'].includes(e.code)){if(e.code==='KeyM'){setPause(true);showTab('map');}else{setPause(true);showTab({KeyK:'skills',KeyJ:'journal',KeyI:'inventory'}[e.code]);}}if(!paused){if(e.code===bindings.interact&&!e.repeat)talk();if(e.code===bindings.power&&!e.repeat)usePower();if(e.code===bindings.attack&&!e.repeat)basicAttack();if(e.code===bindings.parry&&!e.repeat)parry();if(e.code==='KeyC'&&!e.repeat)toggleTarget();if(e.code===bindings.dodge&&!e.repeat)performDodge();if(/^Digit[0-9]$/.test(e.code)){const i=(Number(e.code.slice(-1))+9)%10;if(g.unlocked(i)){g.selected=i;updateUI();}else toast('Este poder será desbloqueado na história.');}}keys[e.code]=true;});addEventListener('keyup',e=>keys[e.code]=false);addEventListener('blur',()=>{keys={};if(!paused)setPause(true);});document.addEventListener('visibilitychange',()=>{if(document.hidden&&!paused)setPause(true);});
for(const b of document.querySelectorAll('[data-key]')){b.onpointerdown=e=>{e.preventDefault();b.setPointerCapture(e.pointerId);keys[bindings[b.dataset.key]]=true;};b.onpointerup=b.onpointercancel=()=>keys[bindings[b.dataset.key]]=false;}
canvas.onpointerdown=e=>{drag={x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);};canvas.onpointermove=e=>{if(drag!==null&&!paused){angle-=(e.clientX-drag.x)*.006*Number($('sensitivity').value);camHeight=Math.max(1.8,Math.min(13,camHeight+(e.clientY-drag.y)*.035));drag={x:e.clientX,y:e.clientY};}};canvas.onpointerup=canvas.onpointercancel=()=>drag=null;canvas.addEventListener('wheel',e=>{e.preventDefault();camDistance=Math.max(5,Math.min(18,camDistance+e.deltaY*.01));},{passive:false});
function resize(){const width=Math.max(1,innerWidth),height=Math.max(1,innerHeight),quality=Number($('quality').value),pixels=quality===1?1e6:quality===2?4e6:2e6,limit=gl.getParameter?.(gl.MAX_RENDERBUFFER_SIZE)||4096;const d=Math.min(devicePixelRatio||1,quality,Math.sqrt(pixels/(width*height)),limit/width,limit/height);canvas.width=Math.max(1,Math.round(width*d));canvas.height=Math.max(1,Math.round(height*d));gl.viewport(0,0,canvas.width,canvas.height);}addEventListener('resize',resize);$('quality').onchange=()=>{$('distance').value=$('quality').value==='1'?60:$('quality').value==='2'?120:95;resize();applyOptions();};resize();batch=new KaitoBatch(gl,vertex,activeFragment,program);
function gamepad(dt){let pad;try{pad=typeof navigator!=='undefined'&&navigator.getGamepads?.()[0];}catch{return {x:0,z:0};}const state=KaitoSystems.gamepad(pad,previousButtons,dt);previousButtons=state.buttons;if(state.pressed[9])setPause(!paused);
 if(dialogOpen){if(state.pressed[0]||state.pressed[3]||state.pressed[1])closeDialog();return {x:0,z:0};}
 if(paused){const controls=$('menu').querySelectorAll?.('button:not([disabled]),select,input:not([type="file"])')||[];const visible=[...controls].filter(b=>!b.disabled&&b.getClientRects?.().length);if(visible.length){let index=Math.max(0,visible.indexOf(document.activeElement));if(state.pressed[12]||state.pressed[14])index=(index-1+visible.length)%visible.length;if(state.pressed[13]||state.pressed[15])index=(index+1)%visible.length;visible[index].focus?.();if(state.pressed[0])visible[index].click?.();}if(state.pressed[1])setPause(false);return {x:0,z:0};}
 if(state.pressed[6])parry();if(state.pressed[11])toggleTarget();if(state.pressed[7])basicAttack();if(state.pressed[2])usePower();if(state.pressed[1])performDodge(state);if(state.pressed[3])talk();if(state.pressed[5])$('nextPower').onclick();angle-=state.lookX*Number($('sensitivity').value);camHeight=Math.max(1.8,Math.min(13,camHeight+state.lookY));return state;
}

function viewProjection(eye,target){const sub=(a,b)=>a.map((v,i)=>v-b[i]),norm=a=>{const l=Math.hypot(...a);return a.map(v=>v/l);},cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);const z=norm(sub(eye,target)),x=norm(cross([0,1,0],z)),y=cross(z,x),a=[x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-dot(x,eye),-dot(y,eye),-dot(z,eye),1],f=1/Math.tan(currentFov*Math.PI/360),ar=canvas.width/canvas.height,near=.1,far=230,b=[f/ar,0,0,0,0,f,0,0,0,0,(far+near)/(near-far),-1,0,0,2*far*near/(near-far),0],out=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let k=0;k<4;k++)out[c*4+r]+=b[k*4+r]*a[c*4+k];return out;}
function palmModel(x,z,h=6){draw(box,[x,h/2,z],[.48,h,.48],'trunk',.12);for(let i=0;i<6;i++){let a=i*Math.PI/3;draw(sphere,[x+Math.sin(a)*1.3,h-.1,z+Math.cos(a)*1.3],[.85,.34,4.6],'green',a);}}
function person(x,z,y,rot,t,main,shirt='white'){if(main){rot=visualFacing;y+=Math.sin(t*2)*.025*animationWeight;poseTime=animationWeight*(g.motion==='run'?.65:.4);}const stride=main?(!g.grounded?0:poseTime):.4,powerPose=main?Math.min(1,Math.max(g.powerTime/.35,g.attackTime/.18)):0;const costume=Kaito.outfits.find(o=>o.id===g.outfit)||Kaito.outfits[0],outfitColor=costume.color;const local=(px,py,pz)=>[x+px*Math.cos(rot)+pz*Math.sin(rot),y+py,z-px*Math.sin(rot)+pz*Math.cos(rot)];let skin='skin';draw(box,local(0,1.13,0),[.72+(main?g.landTime*.1:0),.65-(main?g.landTime*.3:0),.4],main?outfitColor:shirt,rot,0,main?(g.wallRunning?.3:g.wallSliding?.18:g.dodgeTime?-.7:g.hurtTime?.15:0):0);draw(sphere,local(0,1.86,0),[.64,.7,.59],skin,rot);draw(sphere,local(0,2.08,-.03),[.69,.42,.63],'hair',rot);for(let i=-1;i<=1;i++)draw(cone,local(i*.19,2.27,.02),[.22,.28,.28],'hair',rot+i*.5);for(let side of [-1,1]){draw(box,local(side*.18,1.91,.28),[.28,.13,.045],main?'red':'dark',rot);draw(box,local(side*.18,1.92,.31),[.045,Math.sin(sceneTime*1.7)>.995?.008:.035,.012],'hair',rot);draw(box,local(side*.21,.7,0),[.35,.32,.44],main?[.18,.55,.49]:'blue',rot);draw(box,local(side*.21,.32,Math.sin(t)*side*stride*.3),[.23,.48,.24],skin,rot,0,Math.sin(t)*side*stride);draw(box,local(side*.21,.08,.07+Math.sin(t)*side*stride*.3),[.27,.09,.4],'dark',rot);draw(box,local(side*.48,1.05,Math.sin(t)*side*.15),[.2,.63,.23],skin,rot,0,(main&&g.gliding?-1.2:0)-Math.sin(t)*side*stride-powerPose*(g.lastPower===4?2:g.lastPower===1?1.1:1.5));if(main){draw(sphere,local(side*.2,.72,.23),[.15,.11,.04],'gold',rot);}}draw(box,local(0,1.7,.29),[.17,dialogOpen&&!main?.055:main&&g.hp<35?.065:.025,.035],'dark',rot);if(main){if(costume.style){draw(box,local(0,1.1,.22),[.7,.08,.04],costume.style%2?'white':'gold',rot);if(costume.style>1)draw(box,local(0,1.48,0),[.82,.1,.48],'white',rot);if(costume.style>2)for(const side of [-1,1])draw(box,local(side*.48,.85,0),[.24,.12,.26],'blue',rot);if(costume.style===4)draw(box,local(0,1.55,-.38),[.3,.45,.05],'gold',rot);}draw(box,local(0,1.14,-.3),[.52,.6,.2],'red',rot);draw(sphere,local(0,1.22,.22),[.36,.1,.03],'white',rot-.25);}}

function cachedModel(key,build){let records=modelCache.get(key);if(!records){recording=[];build();records=recording;recording=null;modelCache.set(key,records);if(modelCache.size>256)modelCache.delete(modelCache.keys().next().value);}for(let i=0;i<records.length;i++)draw(...records[i]);}
function palm(x,z,h=6){cachedModel('p:'+x+':'+z+':'+h,()=>palmModel(x,z,h));}
function tree(x,z,sakura=false){cachedModel('t:'+x+':'+z+':'+sakura,()=>treeModel(x,z,sakura));}
function building(x,z,h,color,neon=false){const shadows=$('shadows').checked&&Number($('quality').value)>1;cachedModel('b:'+x+':'+z+':'+h+':'+color+':'+neon+':'+shadows+':'+$('quality').value,()=>{if(shadows)for(let i=2;i>=0;i--)draw(sphere,[x+h*.12,.015+(2-i)*.003,z-h*.08],[6+i*.7+h*.12,.015,5+i*.6+h*.1],neon?[.07+i*.01,.12+i*.01,.16+i*.01]:[.35+i*.04,.41+i*.04,.38+i*.04]);buildingModel(x,z,h,color,neon);});}

function marker(x,z,color='gold',height=2.7){draw(cone,[x,height+Math.sin(sceneTime*2)*.15,z],[.45,.65,.45],color,Math.PI);draw(sphere,[x,.06,z],[1.4,.06,1.4],color);}
function treeModel(x,z,sakura=false){draw(box,[x,1.5,z],[.3,3,.3],'trunk');draw(sphere,[x,3.3,z],[3.2,2.8,3.2],sakura?[.92,.62,.69]:[.3,.57,.34]);}
function buildingModel(x,z,h,color,neon=false){
 draw(box,[x,h/2,z],[4,h,3.5],color);
 draw(box,[x,h+.12,z],[4.2,.25,3.7],neon?[.22,.86,.84]:'white');
 const step=Number($('quality').value)===1?4:2;
 for(let j=1;j<h;j+=step)for(let i=-1;i<=1;i++){
  const tint=neon?(i%2?[.95,.58,.7]:[.54,.95,.9]):[.42,.66,.68];
  draw(lightMesh,[x+i*1.1,j,z-1.77],[.65,.8,.04],tint,0,4);draw(lightMesh,[x+i*1.1,j,z+1.77],[.65,.8,.04],tint,0,4);
  draw(lightMesh,[x-2.02,j,z+i*.95],[.04,.8,.6],tint,0,4);draw(lightMesh,[x+2.02,j,z+i*.95],[.04,.8,.6],tint,0,4);
 }
 if(neon){
  draw(box,[x,h*.5,z+1.81],[4.1,.14,.05],[.8,.4,.75]);draw(box,[x+2.05,h*.5,z],[.05,.14,3.6],[.35,.9,.85]);
  const shape=Math.abs(Math.floor(x*13+z*7))%3;
  if(shape===0){draw(box,[x,h+1,z],[2,1.8,2],[.25,.39,.49]);draw(box,[x,h+3,z],[.12,3,.12],[.67,.84,.84]);}
  else if(shape===1)draw(box,[x,h+.5,z],[5,.24,4.5],[.54,.68,.77]);
  else draw(cone,[x,h+1.5,z],[2.4,3,2.4],[.3,.7,.73]);
 }
}

function aonami(t){
 draw(box,[0,-.63,18],[150,1,38],'sand');draw(box,[0,-.08,14],[70,.08,3],[.66,.65,.52]);draw(box,[0,-.21,1],[100,.22,5],'shore');draw(sea,[0,-.3,0],[1,1,1],'water',0,1);
 for(let i=0;i<9;i++)draw(sphere,[-65+i*17,-.5,-69-Math.sin(i)*8],[24,9+(i%3)*5,15],[.34,.55,.53]);
 
 for(const step of Kaito.practiceSteps)draw(box,[step.x,step.height/2,step.z],[step.hx*2,step.height,step.hz*2],'wood');
 for(const o of obstacles().filter(o=>o.kind==='palm'))palm(o.x,o.z,5.7);
 draw(box,[-21,1.75,19],[7,3.5,5],[.78,.81,.65]);draw(box,[-21,3.6,19],[8,.35,6],'blue');draw(box,[-21,1.8,16.46],[2.3,1.7,.08],'dark');for(let x of [-23.4,-18.5])draw(box,[x,1.75,16.44],[1.2,1,.1],[.4,.69,.72]);for(let i=0;i<3;i++)draw(sphere,[-25+i*1.1,1.5,15.4],[.7,2.8,.2],i%2?'red':'white',.15);
 draw(box,[19,1.5,20],[6,3,4],[.72,.49,.3]);draw(cone,[19,3.9,20],[8,2,6],'red',Math.PI/4);
 for(let i=0;i<6;i++){draw(box,[22,.2,-i*3],[3,.35,3],'wood');draw(box,[20.6,-.4,-i*3],[.2,1.4,.2],'wood');draw(box,[23.4,-.4,-i*3],[.2,1.4,.2],'wood');}
 
 // Sakura, central avenue, mountain grotto and island ruins, all compact and reachable.
 for(let i=0;i<3;i++)building(-8+i*9,34,7+i*2,[.7,.77,.68]);
 draw(sphere,[-30,1.8,0],[6,5,7],[.39,.52,.37]);draw(box,[-27.5,1.1,1],[.2,2.4,2],'dark');draw(box,[-30,2.7,2],[.3,3.6,1],[.26,.76,.8]);
 draw(sphere,[28,-.3,-7],[11,1.5,8],'sand');for(let i=0;i<3;i++)draw(box,[26+i*2,1,-8],[.6,2,.6],[.48,.56,.53]);
 if(g.mission<3)for(let i=0;i<3;i++){const d=Kaito.debris[i];if(!g.cleared.includes(i)){draw(box,[d.x,.4,d.z],[1.3,.7,.9],'wood',i*.7);draw(box,[d.x,.8,d.z],[1.5,.12,.2],'dark',i*.7);if(g.quest?.type==='clear')marker(d.x,d.z,[.35,.91,.93],2);}}
 draw(sphere,[-15,.22,14],[.8,.22,2.8],'white',-.5);draw(box,[-15,.34,14],[.12,.03,2.2],'red',-.5);
 // Nonviolent rescue scene and storm shelter.
 if(g.quest?.type==='rescue'){person(12,-7,-.2,0,0,false);draw(sphere,[12,-.15,-7],[1.1,.2,2.6],'red');}if(g.quest?.type==='protect'){draw(box,[0,1.9,7],[4,.2,4],'blue');for(let x of [-1.7,1.7])draw(box,[x,.9,7],[.15,2,.15],'wood');for(let i=0;i<3;i++)person(-1+i,7,0,0,0,false);}
}
function hikaru(t){for(const x of [-30,-18,-6,6,18,30]){draw(box,[x,2.2,12],[.16,4.4,.16],'dark');draw(lightMesh,[x,4.45,12],[.6,.2,.6],[.85,.88,.65],0,4);}

 draw(box,[0,-.63,18],[150,1,38],[.21,.28,.36]);draw(box,[0,-.2,0],[70,.2,5],[.34,.46,.53]);draw(sea,[0,-.3,0],[1,1,1],'water',0,1);
 draw(box,[0,-.08,14],[64,.08,3],[.13,.19,.26]);draw(box,[0,-.07,14],[64,.03,.12],[.7,.82,.72]);
 for(let i=0;i<12;i++){const x=-48+i*8;building(x,39,12+(i*7%16),[.19,.28,.4],true);}
 for(const o of obstacles().filter(o=>!o.extended&&o.kind==='building'))building(o.x,o.z,o.z>22?7:10,[.24,.33,.43],true);
 // Hikari tower, rooftop observatory, traditional lantern quarter and park.
 for(let j=3;j<20;j+=3)draw(box,[0,j,26.47],[4,.22,.05],[.56,.92,.86]);
 draw(box,[-20,.05,15],[10,.12,8],[.26,.48,.42]);draw(sphere,[-20,.12,15],[5,.2,3],[.21,.63,.68]);
 for(let i=0;i<4;i++){draw(sphere,[-24+i*3,4.5,23],[.7,1,.7],i%2?[1,.65,.34]:[.92,.36,.4]);}
 draw(box,[20,2,23.9],[3,1.4,.1],[.26,.8,.85]);
 // Elevated train moves continuously on its own track.
 for(let i=0;i<3;i++)draw(box,[g.trainCars[i].x,6,43],[3.6,1.4,1.2],i%2?[.82,.75,.62]:[.63,.81,.82]);
 for(let i=0;i<5;i++){draw(box,[22,.25,-i*3],[4,.4,3],'dark');draw(box,[20.1,.8,-i*3],[.1,.9,.1],[.3,.92,.84]);}
 
}
function robot(e,t){const base=e.boss?2:1,c=e.stun>0?[.38,.76,.85]:e.boss?(e.phase===2?[.72,.26,.16]:e.phase===1?[.61,.3,.6]:[.58,.21,.35]):e.kind==='ranger'?[.18,.45,.65]:e.kind==='scout'?[.2,.62,.57]:[.76,.43,.2];draw(sphere,[e.x,.01,e.z],[base*1.7,.05,base*1.7],[.22,.3,.3]);draw(box,[e.x,base*.9,e.z],[base*.8,base*1.1,base*.65],c);draw(sphere,[e.x,base*1.7+Math.sin(t*3)*.05,e.z],[base*.8,base*.6,base*.7],c);draw(box,[e.x,base*1.7,e.z+.34*base],[base*.55,.12,.08],e.warning>0?'gold':'red');for(let side of [-1,1])draw(box,[e.x+side*base*.6,base*.9,e.z],[base*.25,base*.8,base*.3],c);draw(box,[e.x,base*2.3,e.z],[base*1.5,.1,.1],'dark');draw(box,[e.x-(1-e.hp/e.maxHp)*base*.75,base*2.3+.015,e.z],[base*1.5*Math.max(0,e.hp/e.maxHp),.12,.13],e.boss?'red':'gold');draw(box,[e.x,base*1.73,e.z+.39*base],[base*.66,.24*base,.13],[.55,.86,.91]);if(e.kind==='scout'){draw(box,[e.x+base*.45,base*2,e.z],[.12,.65*base,.12],'gold');for(const side of [-1,1])draw(box,[e.x+side*.27*base,.12,e.z+.2],[.4*base,.12,base*.8],[.16,.42,.47]);}else if(e.kind==='ranger'){draw(cone,[e.x,base*2.06,e.z],[base*1.7,.28,base*1.7],[.84,.71,.4]);draw(box,[e.x+base*.8,base,e.z+.15],[.25,.25,.8],[.36,.75,.83]);}else{for(let i=0;i<(Number($('quality').value)===1?6:10);i++){const a=i/(Number($('quality').value)===1?6:10)*Math.PI*2;draw(sphere,[e.x+Math.sin(a)*base*.65,base,e.z+Math.cos(a)*base*.5],[.27*base,.25,.27*base],i%2?'white':'red');}if(e.boss)for(const side of [-1,1])draw(cone,[e.x+side*1.1,2.8,e.z],[.6,1.5,.6],[.91,.53,.39]);}if(e.warning>0&&e.intent){for(let i=0;i<28;i++){let a=i/28*Math.PI*2;draw(box,[e.intent.x+Math.sin(a)*e.intent.radius,.09,e.intent.z+Math.cos(a)*e.intent.radius],[.28,.1,.28],e.boss?'red':'gold');}draw(cone,[e.x,base*2.7,e.z],[.35,.6,.35],'gold',Math.PI);}}
const powerColors=[[.5,.9,.95],[.45,.85,.9],[.55,.94,.83],[.33,.65,.97],[.65,.9,1],[.62,1,.8],[.36,.85,.95],[.75,.72,1],[.63,.87,1],[.9,.95,.74]];
function expandedWorld(t){for(const o of Kaito.urbanBlocks[g.city])building(o.x,o.z,o.buildingHeight,g.city==='Aonami'?[.61,.72,.66]:[.22,.34,.43],g.city==='Hikaru');for(const x of [-52.5,52.5])draw(box,[x,-.09,95],[5,.08,120],g.city==='Aonami'?[.56,.57,.48]:[.16,.23,.28]);

 const tropical=g.city==='Aonami';draw(box,[0,-.65,95],[320,1,190],tropical?[.64,.72,.49]:[.22,.31,.37]);
 for(let i=tropical?1:0;i<6;i++){const r=Kaito.regions[g.city][i],distance=Math.hypot(g.x-r.x,g.z-r.z);const dx=r.x,dz=r.z-25,len=Math.hypot(dx,dz);draw(box,[dx/2,-.11,25+dz/2],[3.3,.08,len],tropical?[.66,.62,.47]:[.16,.23,.29],Math.atan2(dx,dz));if(distance>Number($('distance').value)+35)continue;
  if(tropical&&i===5){draw(sphere,[r.x,-.3,r.z],[25,1.5,25],'sand');for(let j=0;j<5;j++){draw(box,[r.x-6+j*3,1.8,r.z+5],[.8,3.6,.8],[.42,.52,.47]);}draw(box,[r.x,3.6,r.z+5],[14,.6,1],[.45,.57,.5]);draw(box,[r.x,1.5,r.z-7],[8,3,5],'dark');}
  else if(tropical&&i===4){for(let j=0;j<6;j++){const x=r.x-24+j*8;draw(cone,[x,6+(j%2)*3,r.z+20],[18,19+(j%2)*5,20],[.3,.46,.34]);}for(let j=0;j<8;j++)tree(r.x+Math.sin(j*2)*16,r.z+Math.cos(j*2)*16);draw(box,[r.x-14,6,r.z+13],[1,12,2],[.32,.76,.78]);draw(sphere,[r.x-14,.1,r.z+10],[10,.4,6],[.22,.63,.65]);draw(box,[r.x,1.4,r.z+2],[3,2.8,.5],'dark');}
  else if(!tropical&&i===3){draw(box,[r.x,.02,r.z],[32,.1,30],[.27,.48,.37]);draw(sphere,[r.x+6,.12,r.z+5],[14,.2,9],[.21,.62,.66]);draw(box,[r.x+6,.4,r.z+5],[2,.3,12],'wood');for(let j=0;j<9;j++)tree(r.x+Math.sin(j*2)*14,r.z+Math.cos(j*2)*14);}
  else{for(const o of Kaito.obstaclesByCity[g.city].filter(o=>o.extended&&o.kind==='building'&&Math.hypot(o.x-r.x,o.z-r.z)<36)){if(Math.hypot(o.x-g.x,o.z-g.z)>90)continue;if(tropical&&i===2||!tropical&&i===2){draw(box,[o.x,1.6,o.z],[4,3.2,3.5],[.74,.67,.53]);draw(cone,[o.x,3.7,o.z],[6,2,5],tropical?'blue':'red',Math.PI/4);tree(o.x+4,o.z+3,tropical);}else building(o.x,o.z,tropical?6+(Math.abs(o.x+o.z)%9):12+(Math.abs(o.x*3+o.z)%18),tropical?[.63,.73,.68]:[.19,.29,.4],!tropical);}}
  if(i===3&&tropical||i===4&&!tropical){draw(box,[r.x,.12,r.z],[22,.2,22],'dark');for(let j=0;j<6;j++){draw(box,[r.x-8+(j%3)*6,1,r.z+8+Math.floor(j/3)*3],[4,2,2],j%2?'red':'blue');}draw(sphere,[r.x+12,.1,r.z-12],[5,1.5,15],'white');draw(box,[r.x+12,1.6,r.z-12],[3,2,6],'dark');}
  if(!tropical&&i===1){for(let j=0;j<3;j++){const x=r.x+Math.sin(t*.5+j)*8,z=r.z+Math.cos(t*.5+j)*8;draw(sphere,[x,3+Math.sin(t+j)*.2,z],[.6,.3,.6],[.5,.82,.84]);draw(box,[x,2.9,z],[1,.07,.1],'dark');}}
  if(!tropical&&i===2)for(let j=0;j<7;j++){const x=r.x-10+j*3;draw(box,[x,3,r.z+6],[.08,6,.08],'wood');draw(sphere,[x,5,r.z+6],[.7,1,.7],'gold');}
  if(!tropical&&i===5){draw(box,[r.x,19,r.z+6],[8,38,8],[.18,.27,.4]);draw(box,[r.x,38,r.z+6],[12,.5,12],[.4,.85,.82]);draw(cone,[r.x,44,r.z+6],[3,12,3],[.57,.76,.78]);}
  const done=g.regionTasks.includes(g.city+'-'+i);if(!done){draw(sphere,[r.x,.16,r.z],[1.1,.3,1.1],[.3,.65,.66]);draw(box,[r.x,.7,r.z],[.12,1,.12],[.42,.79,.76]);marker(r.x,r.z,[.6,.9,.77],2.4);}if(distance<40){for(let j=0;j<2;j++)person(r.x+Math.sin(t*.15+j)*8,r.z+Math.cos(t*.15+j)*8,0,t*.15,t*2,false,j?'white':'blue');}
 }
}


function playerFloor(t){if(!g.interior&&g.surfaceAt())return 0;if(g.y>2&&!g.interior)return 0;if(g.interior)return g.floorHeight;if(g.onBridge)return .3;if(Kaito.isWater(g.city,g.x,g.z)){const water=-.3+Math.sin(g.x*.22+t*.9)*.3+Math.sin(g.z*.4+t*.7)*.15;return water+(g.effects.surf?.13:-1.05);}if((g.city==='Hikaru'&&Math.hypot(g.x-95,g.z+25)<15)||(g.city==='Aonami'&&Math.hypot(g.x-105,g.z+35)<11))return .2;return 0;}

function renderWorld(t){if(g.interior){renderInterior(t);return;}
 for(const o of Kaito.sceneProps[g.city])if(o.render){if(o.model==='tree')tree(o.x,o.z,o.color==='sakura');else draw(o.model==='cone'?cone:box,[o.x,o.y,o.z],[o.sx,o.sy,o.sz],o.color,o.rot);}
 if(!KaitoBoot.compatibility)draw(skyMesh,[g.x,0,g.z],[400,400,400],'white',0,2);if(g.city==='Aonami')aonami(t);else hikaru(t);expandedWorld(t);if(!KaitoBoot.compatibility&&g.city==='Aonami'){const count=Number($('quality').value)>1?7:3;for(let i=0;i<count;i++){const x=Math.floor(g.x/100)*100+(i%3-1)*120+(t*.15%12),z=Math.floor(g.z/100)*100+(Math.floor(i/3)-1)*120;draw(cloudMesh,[x,19+(i%2)*3,z],[38,3.2,14],[.82,.9,.89],0,3);draw(cloudMesh,[x+7,20+(i%2)*3,z],[20,5,12],[.85,.93,.92],0,3);}}
 const density=Number($('quality').value)>1?4:2;for(let i=0;i<density;i++){let x=-8+i*8+Math.sin(t*.12+i)*3;person(x,12+i*1.5,0,Math.cos(t*.12+i)>0?Math.PI/2:-Math.PI/2,t*2,false);}for(const npc of Kaito.npcs[g.city])person(npc.x,npc.z,0,0,0,false,({Ren:[.94,.6,.29],Yuna:[.65,.36,.64],Mika:[.75,.88,.83],Sora:[.3,.5,.64]})[npc.name]);
 for(let i=0;i<g.traffic[g.city].length;i++){const car=g.traffic[g.city][i];draw(box,[car.x,.55,car.z],[2,.65,1.1],i%2?'red':'blue');draw(box,[car.x,.95,car.z],[1,.45,1],[.64,.8,.78]);}for(let i=0;i<3;i++){const x=Math.sin(t*.2+i)*18,z=-15+Math.cos(t*.2+i)*6;draw(sphere,[x,7+i,z],[.25,.18,.9],'white',t*.2);}
 for(const resident of g.citizens[g.city])if(Math.hypot(resident.x-g.x,resident.z-g.z)<55)person(resident.x,resident.z,0,resident.facing||0,resident.walk,false,[.65,.7,.57]);
 // Boat and travel effect preserve both cities' campaign progress.
 draw(sphere,[25,-.1+Math.sin(t)*.1,-10],[2.8,.7,6],'white');draw(box,[25,.8,-10],[1.6,1,2],'blue');if(g.mission>=9)marker(22,-8,[.75,.77,1],2.6);if(g.travel){const progress=g.travel.time/3;draw(sphere,[g.x+progress*12,1+Math.sin(t*2)*.1,g.z-progress*15],[2.8,.7,6],'white');draw(box,[g.x+progress*12,1.7,g.z-progress*15],[1.6,1,2],'blue');}
 for(let i=0;i<5;i++){const s=Kaito.shells[i];if(!g.shells.includes(g.city+'-'+i)){draw(sphere,[s.x,.35+Math.sin(t*2+i)*.1,s.z],[.45,.3,.55],'gold',t*.4);}}
 if(g.quest?.type==='clues'&&g.effects.vision)for(let i=0;i<3;i++)if(!g.clues.includes(i)){const c=Kaito.clues[i];marker(c.x,c.z,[.73,.63,1],1.8);}
 if(g.quest?.type==='race')for(let i=g.raceIndex;i<3;i++){const r=Kaito.rings[i];for(let j=0;j<18;j++){const a=j/18*Math.PI*2;draw(sphere,[r.x+Math.cos(a)*1.7,1.8+Math.sin(a)*1.7,r.z],[.22,.22,.22],i===g.raceIndex?'gold':'blue');}}
 const target=objective();if(target&&(!g.quest||g.quest.city===g.city)&&!['combat','boss','race'].includes(g.quest?.type))marker(target.x,target.z,g.effects.vision?[.8,.7,1]:'gold');
 for(const departing of g.removing){const d=Kaito.debris[departing.i],a=departing.age;draw(box,[d.x+departing.dx*a*7,.4+Math.sin(a*Math.PI)*1.4-a,d.z+departing.dz*a*7],[1.3*(1-a),.7*(1-a),.9*(1-a)],'wood',a*5);}
 for(const e of g.enemies)if(e.hp>0){robot(e,t);if(g.combatTargetId===e.id){for(let i=0;i<12;i++){const a=i/12*Math.PI*2;draw(sphere,[e.x+Math.sin(a)*1.2,.08,e.z+Math.cos(a)*1.2],[.12,.07,.12],'white');}draw(cone,[e.x,e.boss?5:3.3,e.z],[.3,.4,.3],'gold',Math.PI);}}
 draw(sphere,[g.x,(g.surfaceAt()?.height||0)+.015,g.z],[.85,.025,.8],[.35,.39,.32]);person(g.x,g.z,g.y+playerFloor(t),g.facing,g.swimming?t*8:walk,true);
 if(g.effects.surf)draw(sphere,[g.x,g.y+playerFloor(t)-.04,g.z],[.85,.16,2.7],'white',g.facing);
 if(g.effects.shield)for(let i=0;i<16;i++){const a=i/16*Math.PI*2+t;draw(sphere,[g.x+Math.sin(a)*1.05,1+Math.cos(a*3)*.3,g.z+Math.cos(a)*1.05],[.22,.45,.22],powerColors[1]);}
 if(g.effects.bridge&&g.bridge)for(let i=0;i<8;i++)draw(box,[g.bridge.x+Math.sin(g.bridge.rot)*i,.15,g.bridge.z+Math.cos(g.bridge.rot)*i],[1.8,.12,1.1],powerColors[6],g.bridge.rot);
 if(g.effects.rain)for(let i=0;i<20;i++){const a=i*2.4,r=(i%4)+1;draw(box,[g.x+Math.sin(a)*r,3-(t*4+i)%3,g.z+Math.cos(a)*r],[.035,.4,.035],powerColors[8]);}

 const detail=Number($('quality').value)>1?24:12;
 for(const pulse of g.pulses){const life=1-pulse.age,r=pulse.age*(pulse.type===9?28:pulse.type===3?7:8),color=powerColors[pulse.type];
  for(let i=0;i<detail;i++){let a=i/detail*Math.PI*2,px=pulse.x+Math.sin(a)*r,pz=pulse.z+Math.cos(a)*r,py=.35,scale=.25;
   if(pulse.type===0){a=(i/detail-.5)*Math.PI+pulse.rot;px=pulse.x+Math.sin(a)*r;pz=pulse.z+Math.cos(a)*r;py=.5+Math.sin(i/detail*Math.PI)*life*.7;}
   else if(pulse.type===1){px=pulse.x+Math.sin(a)*1.1;pz=pulse.z+Math.cos(a)*1.1;py=.4+i/detail*1.8;scale=life*.25;}
   else if(pulse.type===2||pulse.type===5){const behind=-pulse.rot;px=pulse.x-Math.sin(pulse.rot)*i*.16+Math.cos(behind)*(i%2?.35:-.35);pz=pulse.z-Math.cos(pulse.rot)*i*.16;py=.12;scale=life*.2;}
   else if(pulse.type===3){a+=t*4;px=pulse.x+Math.sin(a)*Math.max(.4,3*life);pz=pulse.z+Math.cos(a)*Math.max(.4,3*life);py=i/detail*3;}
   else if(pulse.type===4){px=pulse.x+Math.sin(a)*.5;pz=pulse.z+Math.cos(a)*.5;py=pulse.age*5+i/detail;scale=life*.2;}
   else if(pulse.type===6){px=pulse.x+Math.sin(pulse.rot)*i*.3;pz=pulse.z+Math.cos(pulse.rot)*i*.3;py=.2;}
   else if(pulse.type===7){py=.2+Math.sin(i/detail*Math.PI)*2;scale=life*.2;}
   else if(pulse.type===8){py=3.5-(pulse.age*5+i*.11)%3;scale=.13;}
   else if(pulse.type===9){py=.4+Math.sin(i/detail*Math.PI)*life*3;scale=.4*life;}
   draw(sphere,[px,py,pz],[scale,scale*(pulse.type===0?2:1),scale],color);
  }
 }
 for(const hit of g.impacts)for(let i=0;i<8;i++){const a=i/8*Math.PI*2,r=hit.age*2;draw(sphere,[hit.x+Math.sin(a)*r,.8+Math.sin(hit.age*3)*.6,hit.z+Math.cos(a)*r],[.14*(1-hit.age),.14*(1-hit.age),.14*(1-hit.age)],'white');}
 if(g.effects.mist)for(let i=0;i<(Number($('quality').value)===1?6:10);i++){const a=t*.6+i;draw(sphere,[g.x+Math.sin(a)*.9,g.y+playerFloor(t)+.7+(i%3)*.2,g.z+Math.cos(a)*.9],[.3,.07,.3],[.63,.82,.84]);}
 for(const arena of Kaito.arenas)if(arena.city===g.city){draw(box,[arena.x,.65,arena.z],[.15,1.3,.15],'wood');draw(sphere,[arena.x,1.6,arena.z],[.6,.6,.6],g.arenaWins.includes(arena.id)?'green':'red');}
 if(g.parryTime)for(let i=0;i<12;i++){const a=i/12*Math.PI*2;draw(sphere,[g.x+Math.sin(a),g.y+1,g.z+Math.cos(a)],[.15,.3,.15],[.7,.95,1]);}
 if(g.city==='Hikaru'&&g.mission>=10)for(let i=0;i<Kaito.roofSensors.length;i++)if(!g.roofSensors.includes(i)){const r=Kaito.roofSensors[i];draw(box,[r.x,r.height+.3,r.z],[.3,.6,.3],'blue');draw(cone,[r.x,r.height+1.5+Math.sin(t*2)*.1,r.z],[.24,.4,.24],'gold',Math.PI);}
 if(g.wallRunning||g.wallSliding)for(let i=0;i<6;i++)draw(sphere,[g.x-Math.sin(g.facing)*.25,g.y+.3-i*.2,g.z-Math.cos(g.facing)*.25],[.2,.3,.2],[.3,.8,.9]);
 if(g.effects.surf){for(let i=0;i<5;i++){const back=.45+i*.3,sway=Math.sin(t*5+i)*.07;draw(sphere,[g.x-Math.sin(g.facing)*back,g.y+playerFloor(t)+.06+i*.035,g.z-Math.cos(g.facing)*back],[1.1+i*.12,.18+i*.05,.5],[.2,.7,.8],g.facing);draw(sphere,[g.x-Math.sin(g.facing)*back+Math.cos(g.facing)*(.4+sway),g.y+playerFloor(t)+.21,g.z-Math.cos(g.facing)*back-Math.sin(g.facing)*.4],[.13,.08,.3],'white',g.facing);}}
 if(g.gliding)for(let side of [-1,1])draw(sphere,[g.x+side*.8,g.y+g.floorHeight+1.2,g.z],[1.1,.08,.8],[.68,.87,.86],g.facing);
 if(g.city==='Aonami'&&!g.interior){const d=g.training;draw(box,[d.x,.8,d.z],[.12,1.6,.12],'wood');draw(sphere,[d.x,1.6,d.z],[1.1,1.1,.3],d.hp>0?'blue':'dark');draw(sphere,[d.x,1.6,d.z+.17],[.55,.55,.04],'white');draw(box,[d.x,2.4,d.z],[1.2*d.hp/100,.09,.09],'green');}
 if(g.effects.surf||g.effects.dash)for(let i=0;i<8;i++){const d=.5+i*.25;draw(sphere,[g.x-Math.sin(g.facing)*d+Math.cos(g.facing)*(i%2?.35:-.35),.1,g.z-Math.cos(g.facing)*d],[.18,.09,.18],[.76,.94,.89]);}
 if(g.city==='Aonami'){draw(box,[-12,.7,19],[.12,1.4,.12],'wood');draw(box,[-12,1.6,19],[1.2,.65,.15],'blue');draw(cone,[-12,2.3+Math.sin(t*2)*.1,19],[.22,.4,.22],'gold',Math.PI);}
 if(g.tideTrial)for(let i=g.tideTrial.index;i<Kaito.tideCourse.length;i++){const r=Kaito.tideCourse[i];for(let j=0;j<12;j++){const a=j/12*Math.PI*2;draw(sphere,[r.x+Math.cos(a)*1.5,r.y+1.2+Math.sin(a)*1.5,r.z],[.16,.16,.16],i===g.tideTrial.index?'gold':'blue');}}
 if(g.sideRace)for(let i=g.sideRace.index;i<3;i++){const r=Kaito.surfRings[i];for(let j=0;j<18;j++){const a=j/18*Math.PI*2;draw(sphere,[r.x+Math.cos(a)*1.7,1.5+Math.sin(a)*1.7,r.z],[.2,.2,.2],i===g.sideRace.index?'gold':'blue');}}
 // Weather is only active during the storm; graphics setting bounds particles.
 if(g.mission===17&&$('weather').checked)for(let i=0;i<(Number($('quality').value)>1?55:20);i++){const x=g.x+Math.sin(i*137)*14,z=g.z+Math.cos(i*73)*14;draw(box,[x,8-(t*12+i)%9,z],[.025,.6,.025],[.62,.76,.81]);}
}

function renderInterior(t){const h=g.floorHeight;draw(box,[0,h-.2,0],[12,.4,12],[.24,.36,.44]);draw(box,[0,h+.02,-5.8],[12,.08,.3],[.65,.91,.83]);draw(box,[0,h+2.5,5.8],[12,5,.3],[.2,.29,.38]);for(let x of [-5.8,5.8])draw(box,[x,h+1.3,0],[.25,2.6,12],[.27,.38,.44]);for(let x of [-4,-2,0,2,4])draw(box,[x,h+2.6,5.6],[1.4,1.5,.08],[.27,.61,.65]);draw(box,[3,h+.07,2],[2,.1,2],'gold');draw(box,[3,h+2,3.1],[2,4,.15],[.2,.53,.6]);draw(box,[3,h+1.5,3],[.2,.6,.1],'gold');if(g.floor===1){draw(box,[0,h+.7,3.5],[2,1.4,.8],'dark');draw(box,[0,h+1.7,3.5],[1.6,.9,.15],[.35,.94,.82]);for(let i=0;i<5;i++)draw(box,[-20+i*9,h+4+i*2,25],[5,8+i*4,5],[.2,.32,.44]);}else{draw(box,[0,h+1.4,-5.8],[2.4,2.8,.1],[.55,.8,.82]);person(-3,1,h,0,0,false,[.6,.47,.7]);}draw(sphere,[g.x,h+.02,g.z],[.85,.03,.8],[.18,.27,.31]);person(g.x,g.z,h+g.y,g.facing,walk,true);const target=objective();if(target)draw(cone,[target.x,h+2.6+Math.sin(t*2)*.12,target.z],[.35,.6,.35],'gold',Math.PI);}

const cameraFrame={};
let measuredFPS=60,previous=performance.now(),lastRender=-Infinity;function frame(now){if(KaitoBoot.failed||KaitoBoot.contextLost)return;const interval=1000/Number($('fpsCap').value);if(lastRender!==-Infinity){const span=now-lastRender;if(span<interval-.5){requestAnimationFrame(frame);return;}lastRender=now-(span%interval);}else lastRender=now;const elapsed=Math.max(.001,(now-previous)/1000);measuredFPS+=(1/elapsed-measuredFPS)*.05;const dt=Math.min(.05,Math.max(0,(now-previous)/1000));previous=now;const pad=gamepad(dt);if(!paused&&!dialogOpen){sceneTime+=dt;const x=(keys[bindings.right]||keys.ArrowRight?1:0)-(keys[bindings.left]||keys.ArrowLeft?1:0)+pad.x,z=(keys[bindings.back]||keys.ArrowDown?1:0)-(keys[bindings.forward]||keys.ArrowUp?1:0)+pad.z;g.tick(dt,{x,z,run:keys.ShiftLeft||keys.ShiftRight||touchRun||pad.run,jump:keys[bindings.jump]||pad.jump},angle,obstacles());animationWeight+=(g.moving?1-animationWeight:-animationWeight)*(1-Math.exp(-dt*12));walk+=dt*(g.motion==='run'?16:10);visualFacing+=Math.atan2(Math.sin(g.facing-visualFacing),Math.cos(g.facing-visualFacing))*(1-Math.exp(-dt*18));music(dt);stepClock+=dt;if(g.moving&&!g.y&&stepClock>(g.motion==='run'?.28:.42)){stepClock=0;tone(g.swimming?190:g.effects.surf?320:95,.045,'triangle');}events();uiTimer+=dt;if(uiTimer>=.1){updateUI();tutorial();uiTimer=0;}}
 if(cinematic&&!paused){g.tickVisual(dt);cinematic.elapsed+=dt;sceneTime+=dt*.4;music(dt);}const focused=!cinematic&&!paused?g.getCombatTarget():null;KaitoSystems.combatFraming(g,focused,angle,dt,$('reducedMotion').checked,cameraFrame);if(!drag&&!Math.abs(pad.lookX||0))angle=cameraFrame.angle;const t=sceneTime,visualFloor=playerFloor(t),desired=[g.x+Math.sin(angle)*(g.interior?7:camDistance+cameraFrame.distance),visualFloor+camHeight+g.y,g.z+Math.cos(angle)*(g.interior?7:camDistance+cameraFrame.distance)];if(cinematic){const shot=cinematic.angle+Math.sin(cinematic.elapsed*.18)*.22;desired[0]=cinematic.x+Math.sin(shot)*6;desired[1]=g.floorHeight+3.8;desired[2]=cinematic.z+Math.cos(shot)*6;}const desiredFov=$('reducedMotion').checked?60:60+Math.min(10,g.walkSpeed*.65)+cameraFrame.fov;if($('reducedMotion').checked)currentFov=60;else currentFov+=(desiredFov-currentFov)*(1-Math.exp(-dt*5));const cameraTarget=[cameraFrame.x,visualFloor+(g.swimming?1.65:1.15)+g.y+(focused?.boss&&!$('reducedMotion').checked?.6:0),cameraFrame.z],allowed=KaitoSystems.safeCamera(cameraTarget,desired,g.cameraColliders());const currentAllowed=KaitoSystems.cameraPosition(cameraTarget,camera,g.cameraColliders());if(Math.hypot(currentAllowed[0]-cameraTarget[0],currentAllowed[2]-cameraTarget[2])<1.5)camera=allowed;for(let i=0;i<3;i++)camera[i]+=(allowed[i]-camera[i])*($('reducedMotion').checked?1:1-Math.exp(-dt*8));camera=KaitoSystems.cameraPosition(cameraTarget,camera,g.cameraColliders());const day=$('dayCycle').checked?KaitoSystems.daylight(g.time):g.city==='Hikaru'?.3:.95,sky=[.06+.59*day,.1+.73*day,.18+.66*day];gl.clearColor(...sky,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);const vp=viewProjection(camera,cameraTarget);KaitoSystems.frustum(vp,viewPlanes);frustumReady=true;gl.uniformMatrix4fv(u.vp,false,vp);gl.uniform3fv(u.eye,camera);gl.uniform1f(u.time,t);gl.uniform1f(u.daylight,day);gl.uniform3fv(u.horizon,sky);gl.uniform1f(u.quality,Number($('quality').value));gl.uniform1f(u.fogDistance,Number($('distance').value));drawCalls=0;batch?.begin();renderWorld(t);if(batch?.enabled)batch.flush({vp,eye:camera,time:t,daylight:day,horizon:sky,quality:Number($('quality').value),distance:Number($('distance').value)});if(!ready){const error=gl.getError?.();if(error){if(!KaitoBoot.compatibility){KaitoBoot.note('FIRST_FRAME_RETRY','Erro WebGL '+error+'; reiniciando em modo leve.');save(true);try{localStorage.setItem('kaito-last-fallback',JSON.stringify(KaitoBoot.diagnostic('FIRST_FRAME_RETRY',String(error))));}catch{}KaitoBoot.restart(true);return;}KaitoFail('O driver não conseguiu desenhar a primeira cena (WebGL '+error+'). Copie os detalhes e tente outro navegador.','FIRST_FRAME_GPU_ERROR');return;}ready=true;KaitoBoot.complete();$('loading').classList.add('hidden');if(KaitoBoot.compatibility)toast('Modo leve ativo · renderização simples a até 30 FPS.');}$('performance').textContent='FPS '+Math.round(measuredFPS)+' · '+(batch?.enabled?batch.stats.drawCalls:drawCalls)+' desenhos';requestAnimationFrame(frame);}
showTab('settings');if(g.mission>0){$('start').textContent='Continuar campanha ↗';$('reset').classList.remove('hidden');}updateUI();applicationReady=true;KaitoBoot.mark('frame');requestAnimationFrame(frame);
})();
