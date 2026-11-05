const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
(async()=>{
 await import('../build.mjs');
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'kaito-bundle-'));
 try{
  for(const light of ['0','1']){const file=path.join(dir,'frame-'+light+'.json');vm.runInNewContext(fs.readFileSync(path.join(__dirname,'capture-frame.cjs'),'utf8'),{require,__dirname,console,URL,structuredClone,process:{env:{...process.env,KAITO_FRAME_BUILT:'1',KAITO_FRAME_LIGHT:light},argv:['node','capture',file]}});const frame=JSON.parse(fs.readFileSync(file));assert(frame.calls.length>100);assert(frame.vertex&&frame.fragment);}
  console.log('PASS: generated standalone HTML initializes through its real task queue, restores state, and draws the first scene in normal and light modes (mocked WebGL).');
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
})().catch(error=>{console.error(error);process.exitCode=1;});
