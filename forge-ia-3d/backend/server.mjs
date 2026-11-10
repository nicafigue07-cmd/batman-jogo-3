// FORGE IA 3D PRO — backend opcional Node.js 22+
import {createServer} from 'node:http';
import {timingSafeEqual} from 'node:crypto';
const key=process.env.OPENAI_API_KEY, secret=process.env.FORGE_ACCESS_TOKEN;
const model=process.env.OPENAI_MODEL||'gpt-6.1-sol',port=Number(process.env.PORT||8787);
const origins=new Set(['https://nicafigue07-cmd.github.io','http://localhost:3000','http://127.0.0.1:3000']);
const recent=new Map();
if(!key||!secret){console.error('Configure OPENAI_API_KEY e FORGE_ACCESS_TOKEN no servidor.');process.exit(1)}
function json(res,status,value,origin){
 res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',
 'Access-Control-Allow-Origin':origin||'null','Access-Control-Allow-Methods':'GET, POST, OPTIONS',
 'Access-Control-Allow-Headers':'Content-Type, Authorization','Vary':'Origin','X-Content-Type-Options':'nosniff'});
 res.end(status===204?'':JSON.stringify(value));
}
function safeToken(candidate){
 const a=Buffer.from(candidate||''),b=Buffer.from(secret);
 return a.length===b.length&&timingSafeEqual(a,b);
}
function validate(p){
 const v=p&&typeof p==='object'&&!Array.isArray(p)?p:{},out={};
 if(['city','beach','forest','space'].includes(v.world))out.world=v.world;
 if(['day','night','sunset'].includes(v.time))out.time=v.time;
 if(['third','first','iso'].includes(v.camera))out.camera=v.camera;
 if(typeof v.title==='string')out.title=v.title.slice(0,65);
 for(const [k,min,max] of [['density',.4,2.2],['collectibles',1,40],['npcs',0,30],['obstacles',0,30],['speed',3,18]])
   if(typeof v[k]==='number'&&Number.isFinite(v[k]))out[k]=Math.min(max,Math.max(min,v[k]));
 if(typeof v.playerColor==='string'&&/^#[0-9a-f]{6}$/i.test(v.playerColor))out.playerColor=v.playerColor;
 return out;
}
const instructions=[
 'Você é a FORGE IA 3D PRO, um assistente de prototipagem de jogos 3D Three.js.',
 'Responda em português claro. Você recebe a mensagem, o estado do projeto e o histórico recente.',
 'Responda SOMENTE um objeto JSON válido {"reply":"texto para usuário","patch":{...}}.',
 'Modifique via patch apenas propriedades suportadas: world (city/beach/forest/space), time (day/night/sunset),',
 'camera (third/first/iso), title, density (0.4-2.2), collectibles (1-40), npcs (0-30), obstacles (0-30),',
 'speed (3-18), playerColor (#RRGGBB). Omita propriedades sem mudança. Para perguntas sem mudança use patch {}.',
 'Não prometa funções que esse editor ainda não implementa: carros dirigíveis, inimigos com IA, mundos AAA,',
 'multiplayer, física realista, modelos 3D personalizados, exportação para Unity/Unreal ou animações cinematográficas.',
 'Ajude com ideias e explique brevemente os limites de pedidos não suportados.'
].join(' ');
createServer(async(req,res)=>{
 const origin=req.headers.origin||'', allowed=origins.has(origin);
 if(req.method==='OPTIONS'){json(res,allowed?204:403,{},allowed?origin:null);return}
 if(req.url==='/health'&&req.method==='GET'){json(res,200,{ok:true,service:'FORGE IA 3D PRO'},allowed?origin:null);return}
 if(req.method!=='POST'||req.url!=='/api/forge'){json(res,404,{error:'Rota não encontrada'},allowed?origin:null);return}
 if(origin&&!allowed){json(res,403,{error:'Origem não autorizada'});return}
 if(!safeToken((req.headers.authorization||'').replace(/^Bearer\s+/i,''))){
   json(res,401,{error:'Senha de acesso incorreta'},allowed?origin:null);return
 }
 const ip=(req.socket.remoteAddress||'unknown').slice(0,100);
 const now=Date.now(),list=(recent.get(ip)||[]).filter(n=>now-n<60000);
 if(list.length>=5){json(res,429,{error:'Máximo de 5 pedidos por minuto'},allowed?origin:null);return}
 list.push(now);recent.set(ip,list);
 if(recent.size>2000)for(const [k,v] of recent){if(v.at(-1)<now-60000)recent.delete(k)}
 try{
  let raw='';
  for await(const part of req){raw+=part;if(raw.length>25000){json(res,413,{error:'Mensagem muito grande'},allowed?origin:null);return}}
  const body=JSON.parse(raw);
  if(typeof body.message!=='string'||!body.message.trim()||body.message.length>1500){
    json(res,400,{error:'Mensagem inválida'},allowed?origin:null);return
  }
  const history=Array.isArray(body.history)?body.history.slice(-10).map(m=>({
    role:m?.role==='assistant'?'assistant':'user',content:String(m?.content||'').slice(0,1400)
  })):[];
  const input=JSON.stringify({message:body.message,project:validate(body.project),history});
  const upstream=await fetch('https://api.openai.com/v1/responses',{
    method:'POST',headers:{'Authorization':'Bearer '+key,'Content-Type':'application/json'},
    body:JSON.stringify({model,instructions,input:[{role:'user',content:input}],
      text:{format:{type:'json_object'}},max_output_tokens:1500}),
    signal:AbortSignal.timeout(40000)
  });
  const result=await upstream.json().catch(()=>({}));
  if(!upstream.ok){console.error('OpenAI retornou',upstream.status);
    json(res,502,{error:'Erro na API: HTTP '+upstream.status},allowed?origin:null);return}
  const answer=(result.output_text||result.output?.flatMap(x=>x.content||[]).map(c=>c.text||'').join('')||'').trim();
  const parsed=JSON.parse(answer);
  if(typeof parsed.reply!=='string'||!parsed.patch||typeof parsed.patch!=='object')
    throw Error('Resposta inválida do modelo');
  json(res,200,{reply:parsed.reply.slice(0,1400),patch:validate(parsed.patch)},allowed?origin:null);
 }catch(error){console.error(error);json(res,500,{error:'Falha ao completar pedido'},allowed?origin:null)}
}).listen(port,'0.0.0.0',()=>console.log('FORGE API na porta '+port));
