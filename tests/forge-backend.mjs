
import {strict as assert} from 'node:assert';
const originalFetch=globalThis.fetch;
const port=8779;
process.env.OPENAI_API_KEY='test-key-never-real';
process.env.FORGE_ACCESS_TOKEN='local-test-password';
process.env.OPENAI_MODEL='gpt-6.1-sol';
process.env.PORT=String(port);
let upstream=0;
globalThis.fetch=async(url,options)=>{
 if(String(url)==='https://api.openai.com/v1/responses'){
   upstream++;
   const body=JSON.parse(options.body);
   assert.equal(body.model,'gpt-6.1-sol');
   const isGame=body.instructions.includes('FORGE GAME ENGINE');
   const result=isGame?
      {summary:'Jogo de teste',html:'<!doctype html><html><head><title>Generated Game</title></head><body><canvas></canvas><script type="module">document.body.dataset.game="yes"</script></body></html>'+('<!-- 3D demo -->'.repeat(80))}:
      {reply:'Adicionei uma árvore!',patch:{world:'beach',gameMode:'time',objectsAdd:[{type:'tree',x:10,z:20,scale:1,color:'#56aa77'}]}};
   return new Response(JSON.stringify({output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(result)}]}]}),{status:200,headers:{'Content-Type':'application/json'}});
 }
 return originalFetch(url,options)
};
const {server}=await import('../forge-ia-3d/backend/server.mjs');
const base='http://127.0.0.1:'+port,origin='https://nicafigue07-cmd.github.io';
try{
 const health=await originalFetch(base+'/health');assert.equal(health.status,200);
 const unauth=await originalFetch(base+'/api/forge',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:'{}'});
 assert.equal(unauth.status,401);
 const call=async(path)=>originalFetch(base+path,{method:'POST',
  headers:{Origin:origin,'Authorization':'Bearer local-test-password','Content-Type':'application/json'},
  body:JSON.stringify({message:'Crie um jogo de praia com árvores',project:{world:'city'},history:[]})});
 const a=await call('/api/forge');assert.equal(a.status,200);const patch=await a.json();
 assert.equal(patch.patch.world,'beach');assert.equal(patch.patch.objectsAdd[0].type,'tree');
 assert.equal(patch.patch.gameMode,'time');
 const b=await call('/api/game');assert.equal(b.status,200);const game=await b.json();
 assert.ok(game.html.includes('<canvas>'));assert.equal(game.summary,'Jogo de teste');
 assert.equal(upstream,2);
 const invalidOrigin=await originalFetch(base+'/api/forge',{method:'POST',
  headers:{Origin:'https://not-allowed.example','Authorization':'Bearer local-test-password','Content-Type':'application/json'},
  body:JSON.stringify({message:'hello'})});
 assert.equal(invalidOrigin.status,403);
 console.log('FORGE_BACKEND_OK',JSON.stringify({health:true,auth:true,cors:true,patch:true,codegen:true}));
}finally{
 globalThis.fetch=originalFetch;
 await new Promise(resolve=>server.close(resolve));
}
