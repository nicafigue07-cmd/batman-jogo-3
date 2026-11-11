
import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {readFileSync,mkdirSync} from 'node:fs';
import assert from 'node:assert/strict';

const html=readFileSync(new URL('../forge-ia-3d/index.html',import.meta.url),'utf8');
const http=createServer((_req,res)=>{res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});res.end(html)});
await new Promise(ok=>http.listen(8193,'127.0.0.1',ok));
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--disable-dev-shm-usage']});
const page=await browser.newPage({viewport:{width:1380,height:850}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
async function state(){return page.evaluate(()=>window.__forgeStats())}
async function say(input){
 await page.locator('#prompt').fill(input);
 await page.locator('#build').click();
 await page.waitForFunction(()=>!document.getElementById('build').disabled,{timeout:25000});
 return await page.locator('#chatlog .message.assistant').last().innerText();
}
try{
 await page.goto('http://127.0.0.1:8193',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.__forgeStats?.()?.hero==='red-haired-elf'&&document.getElementById('status').textContent.includes('PRONTO'),{timeout:50000});
 const start=await state();
 assert.ok(start.fairy&&start.heroParts>=30,'The playable red-haired elf must remain intact');
 assert.match(await page.locator('#online-mode').innerText(),/Modo criativo local/);
 // A button should actually improve the world and preserve the hero and mission.
 await page.locator('#upgrade-world').click();
 await page.waitForFunction(()=>!document.getElementById('build').disabled,{timeout:25000});
 const improved=await state();
 assert.ok(improved.objects>start.objects,'world upgrade should add objects');
 assert.equal(improved.hero,'red-haired-elf');
 assert.equal(improved.gameMode,start.gameMode);
 console.log('CHAT_UPGRADE_OK',JSON.stringify({before:start.objects,after:improved.objects}));
 // Chat command actions operate on real project state.
 await say('desfazer');
 assert.equal((await state()).objects,start.objects,'undo via chat should restore earlier state');
 await say('refazer');
 assert.equal((await state()).objects,improved.objects,'redo via chat should restore upgrade');
 await say('adicione 2 casas');
 const two=await state();assert.equal(two.objects,improved.objects+2);
 await say('mais 3');
 const five=await state();assert.equal(five.objects,improved.objects+5,'contextual more 3 should mean 3 more houses');
 console.log('CHAT_CONTEXT_OK',JSON.stringify({housesAdded:5,objects:five.objects}));
 const analysis=await say('diagnosticar o jogo');
 assert.match(analysis,/Diagnóstico do projeto/);
 assert.match(analysis,/Guardião|herói élfico/i);
 console.log('CHAT_DIAGNOSIS_OK');
 await say('salve o projeto');
 await page.waitForTimeout(350);
 await page.reload({waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.__forgeStats?.()?.hero==='red-haired-elf'&&document.getElementById('status').textContent.includes('PRONTO'),{timeout:55000});
 const restored=await state();assert.equal(restored.objects,five.objects,'persisted project must retain placed houses');
 const messages=await page.locator('#chatlog .message.user').allInnerTexts();
 assert.ok(messages.some(x=>x.includes('mais 3')),'conversation history should be restored');
 assert.ok(messages.some(x=>x.includes('diagnosticar o jogo')),'later messages should be restored');
 assert.equal(restored.hero,'red-haired-elf');
 console.log('CHAT_HISTORY_RESTORED_OK',JSON.stringify({objects:restored.objects,messages:messages.length}));
 // Test real game controls still work after conversation interaction.
 await page.locator('#viewport canvas').first().click({position:{x:540,y:300}});
 await page.keyboard.down('KeyW');
 await page.waitForFunction(()=>Math.hypot(window.__forgeStats?.()?.movementDirection?.x||0,window.__forgeStats?.()?.movementDirection?.z||0)>.8,{timeout:9000});
 await page.keyboard.up('KeyW');
 assert.equal((await state()).hero,'red-haired-elf');
 console.log('CHAT_GAMEPLAY_OK');
 mkdirSync('artifacts',{recursive:true});
 await page.screenshot({path:'artifacts/forge-chat.png'});
 assert.deepEqual(errors,[]);
 console.log('CHAT_ALL_PASSED');
}catch(e){console.error('CHAT_TEST_FAIL',e.stack||String(e));console.error('BROWSER_ERRORS',errors);process.exitCode=1}
finally{await browser.close();await new Promise(ok=>http.close(ok))}
