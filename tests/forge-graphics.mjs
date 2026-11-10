
import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {readFileSync,mkdirSync} from 'node:fs';
import assert from 'node:assert/strict';

const html=readFileSync(new URL('../forge-ia-3d/index.html',import.meta.url),'utf8');
const server=createServer((req,res)=>{
 res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});
 res.end(html);
});
await new Promise(ok=>server.listen(8132,'127.0.0.1',ok));
const browser=await chromium.launch({headless:true,args:[
 '--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--disable-dev-shm-usage'
]});
const page=await browser.newPage({viewport:{width:1360,height:840}});
const errors=[];
page.on('pageerror',e=>errors.push('JS: '+e.message));
page.on('console',m=>{if(m.type()==='error')errors.push('CONSOLE: '+m.text())});
async function stats(){return page.evaluate(()=>window.__forgeVisualStats?.())}
async function setWorld(world){
 await page.locator('#world').selectOption(world);
 await page.waitForFunction(name=>window.__forgeVisualStats?.().scene===name,world,{timeout:20000});
 await page.waitForTimeout(1000);
 return stats();
}
try{
 mkdirSync('artifacts',{recursive:true});
 await page.goto('http://127.0.0.1:8132',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.__forgeVisualStats?.()&&document.getElementById('status').textContent.includes('PRONTO'),{timeout:45000});
 let city=await stats();
 assert.equal(city.scene,'city');assert.equal(city.ocean,false);assert.equal(city.asphalt,true);
 assert.ok(city.particles>0&&city.contactShadows>0);
 await page.screenshot({path:'artifacts/forge-graphics-city.png'});
 console.log('GRAPHICS_CITY_OK',JSON.stringify(city));
 await setWorld('beach');
 await page.waitForFunction(()=>window.__forgeVisualStats?.().oceanTime>=0.1,{timeout:22000});
 const beach=await stats();
 assert.equal(beach.ocean,true);assert.equal(beach.oceanShader,true);
 assert.ok(beach.oceanTime>=0.1,'ocean does not animate');
 await page.screenshot({path:'artifacts/forge-graphics-beach.png'});
 console.log('GRAPHICS_BEACH_OK',JSON.stringify(beach));
 const forest=await setWorld('forest');
 assert.ok(forest.particles>=100);
 assert.ok(forest.clouds>0);
 await page.screenshot({path:'artifacts/forge-graphics-forest.png'});
 console.log('GRAPHICS_FOREST_OK',JSON.stringify(forest));
 const space=await setWorld('space');
 assert.ok(space.particles>0);
 await page.screenshot({path:'artifacts/forge-graphics-space.png'});
 console.log('GRAPHICS_SPACE_OK',JSON.stringify(space));
 await page.locator('#quality').selectOption('2');
 await page.waitForTimeout(750);
 const ultra=await stats();
 assert.equal(ultra.quality,2);assert.equal(ultra.shadowRes,2048);
 await page.locator('#quality').selectOption('1');
 await page.waitForTimeout(400);
 assert.equal((await stats()).quality,1);
 console.log('GRAPHICS_QUALITY_OK',JSON.stringify(ultra));
 if(errors.length)throw Error(errors.join('\n'));
 console.log('GRAPHICS_ALL_PASSED');
}catch(e){console.error('GRAPHICS_TEST_FAIL',e.stack||String(e));console.error('BROWSER_ERRORS',errors);process.exitCode=1}
finally{await browser.close();await new Promise(ok=>server.close(ok))}
