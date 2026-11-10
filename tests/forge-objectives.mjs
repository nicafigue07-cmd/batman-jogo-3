
import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {readFileSync,mkdirSync} from 'node:fs';
import assert from 'node:assert/strict';

const site=readFileSync(new URL('../forge-ia-3d/index.html',import.meta.url),'utf8');
const server=createServer((req,res)=>{
 res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});
 res.end(site);
});
await new Promise(ok=>server.listen(8123,'127.0.0.1',ok));
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--disable-dev-shm-usage']});
const page=await browser.newPage({viewport:{width:1320,height:850}});
const errors=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('console',m=>{if(m.type()==='error'&& !m.text().includes('WebGL'))errors.push(m.text())});
async function state(){return page.evaluate(()=>window.__forgeStats())}
async function selectMode(mode,goal=3){
 await page.locator('#new').click();
 await page.locator('#mission-count').selectOption(String(goal));
 await page.locator('#mission-mode').selectOption(mode);
 await page.waitForTimeout(450);
 let st=await state();assert.equal(st.gameMode,mode);
 assert.equal(st.goal,goal);
 assert.equal(st.missionProgress,0);
 return st;
}
try{
 await page.goto('http://127.0.0.1:8123',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.__forgeStats && document.getElementById('status').textContent==='MUNDO PRONTO',{timeout:45000});
 const first=await state();
 assert.equal(first.gameMode,'collect');
 assert.equal(first.missionTargets.length,0);
 await page.locator('#viewport canvas').first().click({position:{x:540,y:320}});
 await page.keyboard.down('KeyW');await page.waitForTimeout(800);
 const facing=await state();
 await page.keyboard.up('KeyW');
 const h={x:-Math.sin(facing.facing),z:-Math.cos(facing.facing)};
 const dot=h.x*facing.movementDirection.x+h.z*facing.movementDirection.z;
 assert.ok(dot>.98,'Direção do rosto não acompanha o movimento: '+dot);
 console.log('FACE_FORWARD_OK',JSON.stringify({dot,heading:facing.facing,move:facing.movementDirection}));
 await page.locator('#new').click();
 await page.locator('#viewport canvas').first().click({position:{x:540,y:320}});
 await page.locator('#mission-count').selectOption('3');
 await page.locator('#mission-mode').selectOption('race');
 // Movimento de verdade até o primeiro checkpoint.
 await page.locator('#viewport canvas').first().click({position:{x:540,y:320}});
 await page.keyboard.down('KeyW');
 for(let i=0;i<16;i++){await page.waitForTimeout(350);if((await state()).missionProgress>=1)break}
 await page.keyboard.up('KeyW');
 let st=await state();
 assert.ok(st.missionProgress>=1,'Corrida não registrou checkpoint ao atravessar o marcador');
 console.log('RACE_DRIVE_OK',JSON.stringify({progress:st.missionProgress,position:st.position}));
 for(let i=0;i<8;i++){st=await page.evaluate(()=>window.__forgeTestReach());if(st.finished)break}
 assert.equal(st.progress,3);assert.equal(st.finished,true);
 assert.match(await page.locator('#msg').innerText(),/Missão concluída/);
 console.log('RACE_WIN_OK',JSON.stringify(st));
 // Entregas: uma missão que exige pegar um pacote e levar ao destino.
 await selectMode('delivery');
 st=await state();
 assert.equal(st.missionTargets.length,2);
 assert.equal(st.missionTargets[0].visible,true);
 assert.equal(st.missionTargets[1].visible,false);
 let delivery=await page.evaluate(()=>window.__forgeTestReach());
 assert.equal(delivery.carry,true);
 assert.equal(delivery.progress,0);
 assert.equal(delivery.visible[0],false);
 assert.equal(delivery.visible[1],true);
 for(let i=0;i<5;i++){delivery=await page.evaluate(()=>window.__forgeTestReach());if(delivery.finished)break}
 assert.equal(delivery.progress,3);assert.equal(delivery.finished,true);
 console.log('DELIVERY_WIN_OK',JSON.stringify(delivery));
 // Resgate: é necessário apertar E perto de cada personagem.
 await selectMode('rescue');
 let rescue=null;for(let i=0;i<3;i++)rescue=await page.evaluate(()=>window.__forgeTestReach());
 assert.equal(rescue.progress,3);assert.equal(rescue.finished,true);
 console.log('RESCUE_WIN_OK',JSON.stringify(rescue));
 // Exploração: pontos podem ser descobertos independentemente da ordem.
 await selectMode('explore');
 let explore=null;for(let i=0;i<3;i++)explore=await page.evaluate(()=>window.__forgeTestReach());
 assert.equal(explore.progress,3);assert.equal(explore.finished,true);
 console.log('EXPLORE_WIN_OK',JSON.stringify(explore));
 // Criação através do texto do usuário e personalização de quantidade de metas.
 await page.locator('#new').click();
 await page.locator('#prompt').fill('Crie um jogo de entregas com 3 encomendas na cidade');
 await page.locator('#build').click();
 await page.waitForTimeout(450);
 st=await state();
 assert.equal(st.gameMode,'delivery');
 assert.equal(st.goal,3);
 assert.equal(st.missionTargets.length,2);
 console.log('PROMPT_CREATES_GAME_OK',JSON.stringify({mode:st.gameMode,goal:st.goal}));
 await page.locator('#prompt').fill('Crie um jogo de resgatar 3 pessoas numa floresta');
 await page.locator('#build').click();
 await page.waitForTimeout(500);
 st=await state();
 assert.equal(st.gameMode,'rescue');assert.equal(st.goal,3);assert.equal(st.world,'forest');
 console.log('PROMPT_RESCUE_OK',JSON.stringify({mode:st.gameMode,world:st.world,goal:st.goal}));
 const c=await page.locator('#goal-name').innerText();
 assert.match(c,/Resgates/);
 mkdirSync('artifacts',{recursive:true});
 await page.screenshot({path:'artifacts/forge-objectives.png',fullPage:false});
 assert.deepEqual(errors,[]);
 console.log('OBJECTIVE_MODES_ALL_PASSED');
}catch(e){console.error('OBJECTIVE_TEST_FAIL',e.stack||String(e));console.error('Browser errors:',errors);process.exitCode=1}
finally{await browser.close();await new Promise(ok=>server.close(ok))}
