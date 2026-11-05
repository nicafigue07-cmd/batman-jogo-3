import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

// Reproducible encounter randomness; gameplay state remains read-only and all actions use normal input.
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true,
  args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'],
});
const errors=[];
let page;
const snapshot=()=>page.evaluate(()=>window.__gotham.snapshot());
const objective=s=>s.objectives.find(o=>o.id===s.currentObjectiveId);
const normalize=a=>Math.atan2(Math.sin(a),Math.cos(a));
const horizontal=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);

async function face(target) {
  for(let i=0;i<5;i++) {
    const s=await snapshot(),desired=Math.atan2(s.position.x-target.x,s.position.z-target.z);
    const difference=normalize(desired-s.cameraYaw);
    if(Math.abs(difference)<.025)return;
    const turn=Math.max(-.8,Math.min(.8,difference));
    await page.mouse.move(320,280);await page.mouse.down();
    await page.mouse.move(320-turn/.004,280,{steps:2});await page.mouse.up();
    await page.waitForTimeout(70);
  }
}
async function walkTo(target,radius=1.1) {
  await face(target);await page.keyboard.down('KeyW');
  try {
    await page.waitForFunction(({target,radius})=>{
      const s=window.__gotham.snapshot();
      return s.mode==='ended'||Math.hypot(s.position.x-target.x,s.position.z-target.z)<radius;
    },{target,radius},{timeout:120000});
  } finally {await page.keyboard.up('KeyW');}
}
async function clearGuards() {
  let s=await snapshot();
  const site=objective(s);
  const first=s.enemies.filter(e=>e.active&&e.alive).sort((a,b)=>horizontal(a.position,s.position)-horizontal(b.position,s.position))[0];
  if(first) {
    await page.keyboard.press('KeyC');
    // Re-read a patrolling guard before the last few metres; its original x
    // moves while Batman approaches. Stop comfortably inside the 3 m reach.
    await walkTo({...first.position,z:first.position.z-4},.5);
    s=await snapshot();
    const current=s.enemies.filter(e=>e.active&&e.alive).sort((a,b)=>horizontal(a.position,s.position)-horizontal(b.position,s.position))[0];
    if(current)await walkTo({...current.position,z:current.position.z-1.8},.3);
    await page.keyboard.press('KeyV');
    s=await snapshot();
    console.log('STEALTH',s.patrol.stealthCount,s.enemies.filter(e=>e.active&&e.alive).length);
    if(s.crouching)await page.keyboard.press('KeyC');
  }
  await walkTo(site,2);
  for(let i=0;i<160;i++) {
    s=await snapshot();
    const alive=s.enemies.filter(e=>e.active&&e.alive);
    if(!alive.length||s.mode==='ended')return;
    assert.equal(s.mode,'playing','player survives patrol guards');
    await page.keyboard.press('KeyZ');await page.keyboard.press('KeyK');
    await page.keyboard.press('KeyJ');await page.keyboard.press('KeyQ');
    await page.waitForTimeout(180);
  }
  assert.fail('patrol guards remain alive');
}
async function finishBomb() {
  let s=await snapshot();await walkTo(objective(s),2.5);
  await page.keyboard.press('KeyF');
  await page.waitForFunction(()=>window.__gotham.snapshot().mode==='challenge');
  for(let i=0;i<12;i++) {
    s=await snapshot();if(s.mode==='ended')return;
    await page.waitForFunction(()=>{
      const s=window.__gotham.snapshot(),c=s.challenge;
      return s.mode==='ended'||c&&c.cursor>c.zoneStart+.04&&c.cursor<c.zoneStart+c.zoneWidth-.04;
    },null,{timeout:30000});
    if((await snapshot()).mode==='ended')return;
    await page.keyboard.press('Space');
  }
  assert.fail('bomb synchronization did not finish');
}
async function finishRescue() {
  let s=await snapshot();await walkTo(objective(s),2.5);
  await page.keyboard.press('KeyF');s=await snapshot();
  assert.equal(s.escort?.released,true,'civilian is released separately from extraction');
  await walkTo(s.escort.extraction,1.5);
  await page.waitForFunction(()=>{
    const e=window.__gotham.snapshot().escort;
    return e&&Math.hypot(e.position.x-e.extraction.x,e.position.z-e.extraction.z)<3.2;
  },null,{timeout:45000});
  await page.keyboard.press('KeyF');
}
async function finishChase() {
  for(let i=0;i<160;i++) {
    const s=await snapshot();if(s.mode==='ended')return;
    const target=objective(s);
    if(horizontal(s.position,target)<3.3){await page.keyboard.press('KeyF');continue;}
    await face(target);await page.keyboard.down('KeyW');
    await page.waitForTimeout(160);await page.keyboard.up('KeyW');
  }
  assert.fail('courier was not intercepted');
}
try {
  await mkdir('test-results',{recursive:true});
  const context=await browser.newContext({viewport:{width:640,height:480},deviceScaleFactor:.5,reducedMotion:'reduce'});
  await context.addInitScript(()=>{Date.now=()=>3;});
  page=await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.goto(process.env.GOTHAM_URL||'http://127.0.0.1:5173',{waitUntil:'networkidle'});
  await page.waitForFunction(()=>window.__gotham?.snapshot().rendererCalls>0);
  await page.selectOption('#intro-graphics-quality','low');
  await page.click('#patrol-button');
  if(process.env.GOTHAM_PATROL_ONLY==='stealth') {
    await clearGuards();
    assert.ok((await snapshot()).patrol.stealthCount>0,'a guard is silently neutralized by a real approach from behind');
    assert.deepEqual(errors,[]);
    console.log('PASS silent takedown with actual approach, crouch and V input');
  } else {
  const seen=new Set();
  for(let round=0;round<6&&seen.size<4;round++) {
    let before=await snapshot();const type=before.patrol.type;
    assert.equal(before.playStyle,'patrol');assert.equal(before.mode,'playing');
    const xpBefore=before.profile.xp;
    await page.keyboard.press('KeyF');
    assert.equal((await snapshot()).profile.xp,xpBefore,'early interaction never grants XP');
    console.log(`START ${type} at ${JSON.stringify(objective(before))}`);
    if(type==='chase')await finishChase();
    else {
      await clearGuards();
      if(type==='bomb')await finishBomb();
      if(type==='rescue')await finishRescue();
    }
    await page.waitForFunction(()=>window.__gotham.snapshot().mode==='ended',null,{timeout:5000});
    const after=await snapshot();
    assert.equal(after.patrol.finished,true);
    assert.equal(after.patrol.failed,0,`${type} finishes successfully`);
    assert.ok(after.profile.xp>xpBefore,`${type} grants completion XP`);
    assert.equal(after.profile.xp-xpBefore,after.patrol.history.at(-1).xpEarned);
    assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('gotham.progress.v1')).xp),after.profile.xp);
    await page.keyboard.press('KeyF');
    assert.equal((await snapshot()).profile.xp,after.profile.xp,'completion is not rewarded twice');
    seen.add(type);console.log(`PASS ${type}: +${after.profile.xp-xpBefore} XP, stealth ${after.patrol.stealthCount}`);
    await page.screenshot({path:`test-results/patrol-${type}-complete.png`});
    if(seen.size<4) {
      await page.click('#next-patrol-button');const next=await snapshot();
      for(const recent of after.patrol.history.slice(-2))assert.notEqual(next.patrol.type,recent.type,'next type avoids last two');
      assert.equal(next.profile.xp,after.profile.xp,'next occurrence preserves earned XP');
    }
  }
  assert.deepEqual([...seen].sort(),['ambush','bomb','chase','rescue']);
  assert.deepEqual(errors,[],'no browser exceptions or console errors');
  console.log('PASS all four patrol playthroughs with real input, saved XP and varied next encounters');
  }
} catch(error) {
  if(page){const {collisionBuildings,buildingStyles,...state}=await snapshot();console.error('DIAGNOSTIC',JSON.stringify(state));await page.screenshot({path:'test-results/patrol-playthrough-failure.png'});}
  throw error;
} finally {await browser.close();}
