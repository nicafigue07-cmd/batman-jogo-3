
import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
const html=readFileSync(new URL('../forge-ia-3d/index.html',import.meta.url),'utf8');
const port=8102;
const server=createServer((req,res)=>{res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(html)});
await new Promise(ok=>server.listen(port,'127.0.0.1',ok));
const reports=[];
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--disable-dev-shm-usage']});
const page=await browser.newPage({viewport:{width:1440,height:900},acceptDownloads:true});
page.on('pageerror',e=>reports.push('PAGEERROR '+e.message));
page.on('console',m=>{if(m.type()==='error')reports.push('CONSOLE '+m.text())});
try {
 await page.goto('http://127.0.0.1:'+port,{waitUntil:'domcontentloaded',timeout:45000});
 await page.waitForTimeout(12000);
 console.log('LOAD',JSON.stringify({title:await page.title(),status:await page.locator('#status').innerText(),hud:await page.locator('#title').innerText(),canvas:await page.locator('#viewport canvas').count(),errors:reports}));
 if((await page.locator('#viewport canvas').count())===0)throw new Error('Sem canvas WebGL');
 if(!(await page.locator('#status').innerText()).includes('PRONTO'))throw Error('Mundo não iniciou');
 mkdirSync('artifacts',{recursive:true});
 await page.screenshot({path:'artifacts/forge-before.png'});
 // Jogabilidade real: mover o personagem até o primeiro cristal.
 const initial=await page.evaluate(()=>window.__forgeStats?.());
 if(!initial||initial.remaining.length!==7)throw Error('Estado de jogo indisponível');
 await page.locator('#viewport canvas').first().click({position:{x:520,y:360}});
 await page.keyboard.down('KeyW');
 for(let i=0;i<14;i++){
   await page.waitForTimeout(1000);
   if((await page.evaluate(()=>window.__forgeStats?.().score))>=1)break;
 }
 await page.keyboard.up('KeyW');
 const moved=await page.evaluate(()=>window.__forgeStats());
 console.log('PLAY',JSON.stringify({before:initial.position,after:moved.position,score:moved.score,nearest:moved.remaining.length}));
 if(Math.hypot(moved.position.x-initial.position.x,moved.position.z-initial.position.z)<2)throw Error('Personagem não se move com W');
 if(moved.score<1)throw Error('Jogador não conseguiu pegar o primeiro cristal ao caminhar para a frente');
 await page.keyboard.press('KeyP');await page.waitForTimeout(200);
 if(!(await page.locator('#pause-banner').isVisible()))throw Error('Pausa com tecla P falhou');
 await page.keyboard.press('KeyP');await page.waitForTimeout(200);
 if(await page.locator('#pause-banner').isVisible())throw Error('Despausar com tecla P falhou');
 await page.keyboard.press('KeyR');await page.waitForTimeout(200);
 if((await page.locator('#score').innerText())!=='0/7')throw Error('Reiniciar missão com tecla R falhou');
 const mapPixels=await page.locator('#minimap').evaluate(el=>[...el.getContext('2d').getImageData(0,0,1,1).data]);
 if(mapPixels[3]===0)throw Error('Minimapa em branco');
 console.log('GAMEPLAY_OK',JSON.stringify({minimap:mapPixels,score:await page.locator('#score').innerText()}));
 await page.locator('#prompt').fill('Crie uma praia à noite com 12 cristais e 6 personagens');
 await page.locator('#build').click();
 await page.waitForTimeout(3000);
 const first={chat:await page.locator('#chatlog').innerText(),score:await page.locator('#score').innerText(),scene:await page.locator('#scene-details').innerText()};
 console.log('PROMPT',JSON.stringify(first).slice(0,900));
 if(first.score!=='0/12')throw Error('Comando de cristais não aplicado');
 if(!first.scene.includes('Praia')||!first.scene.includes('Noite'))throw Error('Cenário não atualizado');
 await page.keyboard.press('KeyW');await page.keyboard.down('KeyW');await page.waitForTimeout(450);await page.keyboard.up('KeyW');
 await page.keyboard.press('Space');await page.waitForTimeout(250);
 await page.screenshot({path:'artifacts/forge-after.png'});
 await page.locator('#undo').click();
 await page.waitForTimeout(1000);
 console.log('UNDO',await page.locator('#score').innerText());
 if((await page.locator('#score').innerText())!=='0/7')throw Error('Desfazer falhou');
 await page.locator('#save').click();
 await page.locator('#new').click();
 await page.locator('#load').click();
 await page.waitForTimeout(1000);
 console.log('SAVE_LOAD',await page.locator('#score').innerText());
 const expectDownload=page.waitForEvent('download',{timeout:15000});
 await page.locator('#export').click();
 const download=await expectDownload;
 const exported=readFileSync(await download.path(),'utf8');
 if(!exported.includes('data-game-mode="true"')||!exported.includes('type="module"'))throw Error('Jogo HTML exportado sem código jogável');
 console.log('EXPORT_OK',download.suggestedFilename(),exported.length);

 // Editor 3D: adicionar, mudar coordenadas, desfazer/refazer, excluir, importar/exportar.
 await page.locator('#object-editor summary').click();
 await page.locator('#add-type').selectOption('house');
 await page.locator('#add-object').click();
 let objects=await page.evaluate(()=>window.__forgeStats().objects);
 if(objects!==1)throw Error('Editor não adicionou casa: '+objects);
 if(!(await page.locator('#inspector').isVisible()))throw Error('Inspector não apareceu');
 await page.locator('#obj-x').fill('16');
 await page.locator('#obj-x').press('Tab');
 await page.waitForTimeout(400);
 const selected=await page.evaluate(()=>window.__forgeStats());
 if(selected.objects!==1||!selected.selectedId)throw Error('Objeto selecionado não persistiu');
 await page.locator('#undo').click();
 if((await page.evaluate(()=>window.__forgeStats().objects))!==1)throw Error('Undo da posição removeu objeto');
 await page.locator('#redo').click();
 if((await page.evaluate(()=>window.__forgeStats().objects))!==1)throw Error('Redo não preservou objeto');
 await page.locator('#duplicate-object').click();
 if((await page.evaluate(()=>window.__forgeStats().objects))!==2)throw Error('Duplicar falhou');
 await page.locator('#delete-object').click();
 if((await page.evaluate(()=>window.__forgeStats().objects))!==1)throw Error('Excluir falhou');
 const exportProject=page.waitForEvent('download',{timeout:15000});
 await page.locator('#export-project').click();
 const jsonDownload=await exportProject;
 const project=JSON.parse(readFileSync(await jsonDownload.path(),'utf8'));
 if(project.spec.objects.length!==1)throw Error('Projeto JSON incompleto');
 await page.locator('[data-preset=parkour]').click();
 const park=await page.evaluate(()=>window.__forgeStats());
 if(park.objects!==12||park.gameMode!=='time')throw Error('Modelo parkour não funcionou');
 const fileBuffer=Buffer.from(JSON.stringify(project));
 await page.locator('#import-file').setInputFiles({name:'projeto-forge.json',mimeType:'application/json',buffer:fileBuffer});
 await page.waitForTimeout(500);
 if((await page.evaluate(()=>window.__forgeStats().objects))!==1)throw Error('Importação de projeto JSON falhou');
 console.log('EDITOR_OK',JSON.stringify({objects:1,mode:park.gameMode,import:true,export:true}));

 // Integração de geração completa: API simulada, sem utilizar chave ou gastar créditos.
 const fakeHtml='<!doctype html><html><head><title>Jogo teste</title></head><body><canvas></canvas><script type="module">document.body.dataset.game="yes"</script></body></html>'+('<!-- code generation mock -->'.repeat(70));
 await page.route('https://mock.example/api/game',async(route)=>{
   const headers={'Access-Control-Allow-Origin':'http://127.0.0.1:'+port,'Access-Control-Allow-Headers':'authorization,content-type','Access-Control-Allow-Methods':'POST,OPTIONS'};
   if(route.request().method()==='OPTIONS')return route.fulfill({status:204,headers});
   return route.fulfill({status:200,headers,contentType:'application/json',body:JSON.stringify({summary:'Minijogo 3D de teste',html:fakeHtml})});
 });
 await page.locator('#settings').click();
 await page.locator('#endpoint').fill('https://mock.example/api/forge');
 await page.locator('#access-token').fill('falso-apenas-para-teste');
 await page.locator('#connect').click();
 await page.locator('#prompt').fill('Gere um novo jogo 3D');
 await page.locator('#generate-full').click();
 await page.locator('#generated-panel').waitFor({state:'visible',timeout:15000});
 if(await page.locator('#generated-frame').getAttribute('sandbox')!=='allow-scripts')throw Error('Prévia de código precisa estar isolada');
 await page.frameLocator('#generated-frame').locator('body[data-game="yes"]').waitFor({state:'attached',timeout:10000});
 const genDownload=page.waitForEvent('download',{timeout:15000});
 await page.locator('#download-generated').click();
 const generated=await genDownload;
 if(!readFileSync(await generated.path(),'utf8').includes('Jogo teste'))throw Error('Download de jogo programado pela IA falhou');
 await page.locator('#close-generated').click();
 if(await page.locator('#generated-panel').isVisible())throw Error('Falha em voltar ao editor após ver prévia de IA');
 console.log('AI_CODE_PREVIEW_OK',JSON.stringify({mocked:true,sandboxed:true,download:true}));

 await page.locator('#disconnect').click();
 await page.locator('#prompt').fill('Coloque 5 casas');
 await page.locator('#build').click();
 await page.waitForTimeout(250);
 const countAfterChat=await page.evaluate(()=>window.__forgeStats().objects);
 if(countAfterChat!==6)throw Error('Comando de chat para adicionar objetos não funcionou: '+countAfterChat);
 console.log('LOCAL_BUILD_OK',countAfterChat);
 // Exportar jogo após conectar/desconectar não pode vazar senha privada.
 const safeDl=page.waitForEvent('download',{timeout:15000});
 await page.locator('#export').click();
 const safeFile=await safeDl;
 const safeHtml=readFileSync(await safeFile.path(),'utf8');
 if(safeHtml.includes('falso-apenas-para-teste'))throw Error('Exportação incluiu senha de acesso');
 console.log('PRIVACY_EXPORT_OK',safeHtml.length);


 await page.screenshot({path:'artifacts/forge-editor.png'});

 const narrow=await browser.newPage({viewport:{width:390,height:830},isMobile:true,hasTouch:true});
 await narrow.goto('http://127.0.0.1:'+port,{waitUntil:'domcontentloaded'});
 await narrow.waitForTimeout(1800);
 const mobile={width:await narrow.evaluate(()=>document.documentElement.scrollWidth),vp:390,mobileControls:await narrow.locator('#mobile').isVisible()};
 console.log('MOBILE',JSON.stringify(mobile));
 if(mobile.width>400)throw Error('Rolagem horizontal excessiva no celular');
 if(!mobile.mobileControls)throw Error('Controles touch não apareceram');
 console.log('TESTES DE JOGO FINALIZADOS COM SUCESSO');
} catch(e){
 console.error('FALHA',e.stack||String(e));
 console.error('ERROS',reports);
 process.exitCode=1;
}finally{await browser.close();await new Promise(ok=>server.close(ok))}
