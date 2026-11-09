import {walkTo} from './helpers/navigation.mjs';
import assert from'node:assert/strict';import{chromium}from'playwright';import{readFile}from'node:fs/promises';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
try{
 const p=await browser.newPage({viewport:{width:640,height:480},deviceScaleFactor:.5});const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.setContent(await readFile('dist/Kaito-Nami-PC.html','utf8'));await p.waitForFunction(()=>window.__gotham&&!document.getElementById('startup-status'));await p.selectOption('#intro-graphics-quality','low');await p.click('#start-button');await p.locator('#adventure-panel summary').click();
 const snap=()=>p.evaluate(()=>window.__gotham.snapshot());
 const walk=target=>walkTo(p,target,{radius:3});
 await p.keyboard.press('Digit2');await p.waitForFunction(()=>window.__gotham.snapshot().adventure.shield>0);assert.ok((await snap()).adventure.energy<100);
 await p.keyboard.press('KeyN');await p.waitForFunction(()=>window.__gotham.snapshot().mode==='map');await p.keyboard.press('Escape');await p.waitForFunction(()=>window.__gotham.snapshot().mode==='playing');await p.keyboard.press('KeyP');await p.waitForFunction(()=>window.__gotham.snapshot().mode==='photo');const downloaded=p.waitForEvent('download');await p.keyboard.press('Enter');const image=await downloaded;assert.equal(image.suggestedFilename(),'Kaito-foto.png');await p.keyboard.press('Escape');await p.waitForFunction(()=>window.__gotham.snapshot().mode==='playing');
 await walk({x:-215,z:-28});await walk({x:-185,z:-28});await p.click('#adventure-train');await p.waitForFunction(()=>window.__gotham.snapshot().adventure.state.city==='tokyo');assert.equal((await snap()).mode,'playing');
 await p.click('#adventure-train');await p.waitForFunction(()=>window.__gotham.snapshot().adventure.state.city==='nami');
 await p.keyboard.press('KeyZ');assert.ok((await snap()).combat.cooldowns.smoke>0);
 await p.keyboard.down('KeyW');try{await p.waitForFunction(()=>window.__gotham.snapshot().position.x< -240,null,{timeout:30000});}finally{await p.keyboard.up('KeyW');}
 await p.waitForFunction(()=>window.__gotham.snapshot().combat.cooldowns.smoke===0,null,{timeout:40000});
 await p.keyboard.press('KeyG');await p.waitForFunction(()=>{const s=window.__gotham.snapshot();return s.adventure.swimming&&s.position.y< -1;});
 await p.keyboard.press('KeyG');await p.waitForFunction(()=>!window.__gotham.snapshot().adventure.swimming);
 await p.keyboard.press('Digit5');await p.waitForFunction(()=>window.__gotham.snapshot().adventure.powers.ice>0);
 await p.click('#adventure-start');assert.equal((await snap()).adventure.active,true);assert.deepEqual(errors,[]);console.log('PASS water shield/ice, photo/map, train both directions, ocean surf/dive and story start, no browser errors');
}finally{await browser.close();}
