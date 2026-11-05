const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
function environment({href='https://example.test/kaito/?v=0.6',stored={},storageError=false}={}){
 const elements=new Map(),storage=new Map(Object.entries(stored)),session=new Map(),listeners={},canvasEvents={},contexts=[],timers=[];
 const el=id=>{if(!elements.has(id))elements.set(id,{classList:{add(){},remove(){}},textContent:''});return elements.get(id);};
 const context={URL,console:{error(){},warn(){}},document:{getElementById:el},addEventListener:(name,fn)=>listeners[name]=fn,
   localStorage:{getItem:key=>{if(storageError)throw Error('blocked');return storage.get(key)??null;},setItem:(key,value)=>{if(storageError)throw Error('blocked');storage.set(key,value);}},
   sessionStorage:{getItem:key=>session.get(key)??null,setItem:(key,v)=>session.set(key,v),removeItem:key=>session.delete(key)},
   location:{href,reloads:0,reload(){this.reloads++;},replace(url){this.replaced=url;}},setTimeout:fn=>{timers.push(fn);return timers.length;},clearTimeout(){},navigator:{clipboard:{writeText:async value=>context.copied=value}}};
 context.window=context;vm.createContext(context);vm.runInContext(fs.readFileSync(path.join(__dirname,'../src/runtime.js'),'utf8'),context);
 const canvas={addEventListener:(name,fn)=>canvasEvents[name]=fn,getContext:(name,options)=>{contexts.push({name,options});return {getContextAttributes:()=>options,getParameter:()=> 'test-driver'};}};
 return {context,boot:context.KaitoBoot,el,storage,session,listeners,canvasEvents,contexts,timers,canvas};
}
test('light mode requests a genuinely different context and does not erase progress',()=>{
 const e=environment({href:'https://example.test/kaito/?mode=light',stored:{'kaito-nami-v2':'{"mission":12}'}});e.boot.context(e.canvas);assert.equal(e.contexts[0].options.antialias,false);assert.equal(e.contexts[0].options.powerPreference,'low-power');e.boot.restart(true);assert.equal(e.storage.get('kaito-nami-v2'),'{"mission":12}');assert.equal(JSON.parse(e.storage.get('kaito-options')).fpsCap,30);assert(e.context.location.replaced.includes('mode=light'));
});
test('normal context keeps antialias and reports actual creation errors',()=>{
 const e=environment();e.boot.context(e.canvas);assert.equal(e.contexts[0].options.antialias,true);e.canvas.getContext=()=>{throw Error('driver unavailable');};e.boot.context(e.canvas);assert.equal(e.boot.lastError.code,'CONTEXT_CREATION');assert.equal(e.boot.lastError.stage,'context');assert.equal(e.el('fatalText').textContent,'driver unavailable');
});
test('unavailable WebGL produces a classified, copyable local diagnostic',async()=>{
 const e=environment();e.canvas.getContext=()=>null;assert.equal(e.boot.context(e.canvas),null);assert.equal(e.boot.lastError.code,'WEBGL_UNAVAILABLE');await e.el('copyError').onclick();assert.equal(JSON.parse(e.context.copied).code,'WEBGL_UNAVAILABLE');assert(e.storage.has('kaito-last-error'));
});
test('context loss calls save, stops rendering and restores at most once per session',()=>{
 const e=environment();let saved=0,prevented=false;e.boot.bindCanvas(e.canvas,()=>saved++);e.canvasEvents.webglcontextlost({preventDefault(){prevented=true;}});assert(prevented);assert.equal(saved,1);assert(e.boot.contextLost&&e.boot.failed);assert.equal(e.boot.lastError.code,'CONTEXT_LOST');e.canvasEvents.webglcontextrestored();assert.equal(e.context.location.reloads,1);e.canvasEvents.webglcontextrestored();assert.equal(e.context.location.reloads,1);
});
test('watchdog distinguishes an unfinished boot from an already rendered game',()=>{
 const e=environment();e.timers[0]();assert.equal(e.boot.lastError.code,'BOOT_TIMEOUT');const good=environment();good.boot.complete();good.timers[0]();assert(!good.boot.failed);assert.equal(JSON.parse(good.storage.get('kaito-last-boot')).code,'READY');
});
test('safe mode still works when storage is blocked because it is encoded in the link',()=>{
 const e=environment({storageError:true});e.boot.restart(true);const next=environment({href:e.context.location.replaced,storageError:true});assert(next.boot.compatibility);next.boot.context(next.canvas);assert.equal(next.contexts[0].options.antialias,false);
});
test('compatibility mode skips instancing rather than compiling the same GPU path again',()=>{
 const e=environment({stored:{'kaito-options':'{"compatibility":true}'}});vm.runInContext(fs.readFileSync(path.join(__dirname,'../src/renderer.js'),'utf8'),e.context);const renderer=new e.context.KaitoBatch({getExtension(){throw Error('must not request extension');}},'','',{});assert.equal(renderer.enabled,false);assert.equal(renderer.reason,'Modo de compatibilidade');
});
