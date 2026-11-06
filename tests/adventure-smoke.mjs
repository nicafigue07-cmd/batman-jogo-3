import assert from'node:assert/strict';import{chromium}from'playwright';import{readFile}from'node:fs/promises';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
try{
 const p=await browser.newPage({viewport:{width:640,height:480},deviceScaleFactor:.5});const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.setContent(await readFile('dist/Kaito-Nami-PC.html','utf8'));await p.waitForFunction(()=>window.__gotham&&!document.getElementById('startup-status'));await p.selectOption('#intro-graphics-quality','low');await p.click('#start-button');await p.locator('#adventure-panel summary').click();
 const snap=()=>p.evaluate(()=>window.__gotham.snapshot());
 async function walk(target){for(let i=0;i<6;i++){const s=await snap(),desired=Math.atan2(s.position.x-target.x,s.position.z-target.z),difference=Math.atan2(Math.sin(desired-s.cameraYaw),Math.cos(desired-s.cameraYaw));if(Math.abs(difference)<.02)break;const turn=Math.max(-.8,Math.min(.8,difference));await p.mouse.move(300,240);await p.mouse.down();await p.mouse.move(300-turn/.004,240);await p.mouse.up();}await p.keyboard.down('KeyW');try{await p.waitForFunction(t=>{const s=window.__gotham.snapshot();return Math.hypot(s.position.x-t.x,s.position.z-t.z)<1.5;},target,{timeout:60000});}finally{await p.keyboard.up('KeyW');}}
 await p.keyboard.press('Digit2');await p.waitForFunction(()=>window.__gotham.snapshot().adventure.shield>0);assert.ok((await snap()).adventure.energy<100);
 await p.keyboard.press('KeyN');await p.waitForFunction(()=>window.__gotham.snapshot().mode==='map');await p.keyboard.press('KeyN');await p.keyboard.press('KeyP');await p.waitForFunction(()=>window.__gotham.snapshot().mode==='photo');const downloaded=p.waitForEvent('download');await p.keyboard.press('Enter');const image=await downloaded;assert.equal(image.suggestedFilename(),'Kaito-foto.png');await p.keyboard.press('KeyP');
 await walk({x:-215,z:-28});await walk({x:-185,z:-28});await p.click('#adventure-train');await p.waitForFunction(()=>window.__gotham.snapshot().adventure.state.city==='tokyo');assert.equal((await snap()).mode,'playing');
 await p.click('#adventure-train');await p.waitForFunction(()=>window.__gotham.snapshot().adventure.state.city==='nami');
 await p.keyboard.down('KeyW');try{await p.waitForFunction(()=>window.__gotham.snapshot().position.x< -240,null,{timeout:30000});}finally{await p.keyboard.up('KeyW');}
 await p.keyboard.press('KeyG');await p.waitForFunction(()=>{const s=window.__gotham.snapshot();return s.adventure.swimming&&s.position.y< -1;});
 await p.keyboard.press('KeyG');await p.waitForFunction(()=>!window.__gotham.snapshot().adventure.swimming);
 await p.keyboard.press('Digit5');await p.waitForFunction(()=>window.__gotham.snapshot().adventure.powers.ice>0);
 await p.click('#adventure-start');assert.equal((await snap()).adventure.active,true);assert.deepEqual(errors,[]);console.log('PASS water shield/ice, photo/map, train both directions, ocean surf/dive and story start, no browser errors');
}finally{await browser.close();}
