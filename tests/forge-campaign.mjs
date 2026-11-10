
import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {readFileSync,mkdirSync} from 'node:fs';
import assert from 'node:assert/strict';
const html=readFileSync(new URL('../forge-ia-3d/index.html',import.meta.url),'utf8');
const server=createServer((req,res)=>{res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(html)});
await new Promise(resolve=>server.listen(8142,'127.0.0.1',resolve));
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--disable-dev-shm-usage']});
const page=await browser.newPage({viewport:{width:1350,height:830}});
const errors=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('console',msg=>{if(msg.type()==='error')errors.push(msg.text())});
async function state(){return page.evaluate(()=>window.__forgeStats?.())}
try{
 await page.goto('http://127.0.0.1:8142',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.__forgeStats?.()&&document.getElementById('status').textContent.includes('PRONTO'),{timeout:45000});
 let initial=await state();
 assert.equal(initial.mapSize,640,'Mapa precisa ter 640 unidades por lado');
 assert.equal(initial.campaign,true);
 assert.equal(initial.chapterCount,20);
 assert.equal(initial.chapterIndex,0);
 assert.equal(initial.gameMode,'collect');
 console.log('WORLD_EXPANDED_OK',JSON.stringify({size:initial.mapSize,area:initial.mapSize**2,campaign:initial.chapterCount}));

 // Mapa 640x640: teleportar pelas cinco regiões sem bloquear o personagem.
 for(const [region,coordinate,axis] of [
  ['east',240,'x'],['west',-240,'x'],['north',-240,'z'],['south',240,'z'],['center',0,'x']
 ]){
  await page.locator('#travel-destination').selectOption(region);
  await page.waitForTimeout(100);
  const pos=(await state()).position;
  assert.ok(Math.abs(pos[axis]-coordinate)<25,'Viagem rápida para '+region+' falhou: '+JSON.stringify(pos));
 }
 console.log('FAST_TRAVEL_ALL_PASSED');

 mkdirSync('artifacts',{recursive:true});
 await page.screenshot({path:'artifacts/forge-campaign-first.png'});
 const expected=['collect','race','delivery','rescue','explore','time','race','rescue','delivery','explore','race','delivery','explore','rescue','collect','race','explore','delivery','rescue','explore'];
 for(let i=0;i<20;i++){
   const actual=await state();
   assert.equal(actual.campaign,true);assert.equal(actual.chapterIndex,i);assert.equal(actual.gameMode,expected[i]);
   assert.equal(actual.chapterCount,20);
   assert.match(await page.locator('#campaign-status').innerText(),new RegExp('Capítulo '+(i+1)+'/20'));
   // Exercise actual waypoint distribution and safe limits.
   if(['race','rescue','explore'].includes(actual.gameMode)){
     assert.ok(actual.missionTargets.every(t=>Math.abs(t.x)<=312&&Math.abs(t.z)<=312));
     if(actual.missionTargets.length>=3)assert.ok(Math.max(...actual.missionTargets.map(t=>Math.abs(t.x)))>=90);
   }
   const win=await page.evaluate(()=>window.__forgeTestFinishChapter());
   assert.equal(win.finished,true);
   if(i<19){
      await page.locator('#next-chapter').waitFor({state:'visible',timeout:9000});
      await page.locator('#next-chapter').click();
      await page.waitForFunction(j=>window.__forgeStats?.().chapterIndex===j,i+1,{timeout:20000});
   }else{
      assert.equal(await page.locator('#next-chapter').isVisible(),false);
      assert.match(await page.locator('#msg').innerText(),/CAMPANHA CONCLUÍDA/);
   }
   console.log('CHAPTER_PASSED',i+1,expected[i]);
 }
 await page.screenshot({path:'artifacts/forge-campaign-completed.png'});
 await page.reload({waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.__forgeStats?.()?.chapterIndex===19,{timeout:30000});
 console.log('CAMPAIGN_SAVE_RELOAD_OK',JSON.stringify({index:(await state()).chapterIndex}));
 await page.locator('#start-campaign').click();
 await page.waitForFunction(()=>window.__forgeStats?.()?.chapterIndex===0,{timeout:20000});
 assert.equal((await state()).gameMode,'collect');
 console.log('CAMPAIGN_RESTART_OK');
 // Conversa local: pedido de campanha e respostas sobre capacidades.
 await page.locator('#prompt').fill('Crie uma campanha com 20 missões diferentes e lore');
 await page.locator('#build').click();
 await page.waitForFunction(()=>window.__forgeStats?.()?.chapterIndex===0,{timeout:25000});
 assert.equal((await state()).campaign,true);
 await page.locator('#prompt').fill('Você é igual ao ChatGPT?');
 await page.locator('#build').click();
 await page.waitForTimeout(300);
 assert.match(await page.locator('#chatlog').innerText(),/não é um modelo generativo|NÃO é um modelo generativo/i);
 console.log('ASSISTANT_HONESTY_OK');
 // Modo livre continua separado da campanha.
 await page.locator('#mission-mode').selectOption('delivery');
 await page.waitForTimeout(250);
 assert.equal((await state()).campaign,false);
 assert.equal((await state()).gameMode,'delivery');
 console.log('FREE_GAME_MODE_OK');
 if(errors.length)throw Error(errors.join('\n'));
 console.log('CAMPAIGN_ALL_PASSED');
}catch(err){console.error('CAMPAIGN_TEST_FAIL',err.stack||String(err));console.error('BROWSER_ERRORS',errors);process.exitCode=1}
finally{await browser.close();await new Promise(resolve=>server.close(resolve))}
