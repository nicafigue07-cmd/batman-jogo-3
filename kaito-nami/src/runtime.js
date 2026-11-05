/* Startup diagnostics and bounded graphics recovery. Campaign storage is never erased. */
(function(root){
 const VERSION='0.6.0';let details='',watchdog;
 function rawOptions(){try{const s=JSON.parse(root.localStorage.getItem('kaito-options')||'{}');return s&&typeof s==='object'&&!Array.isArray(s)?s:{};}catch{return {};}}
 function lightQuery(){try{return new URL(root.location.href).searchParams.get('mode')==='light';}catch{return false;}}
 const initial=rawOptions();
 const boot={version:VERSION,stage:'document',failed:false,contextLost:false,ready:false,
   compatibility:lightQuery()||initial.compatibility===true||String(initial.quality)==='1',history:[],graphics:{}};
 boot.mark=function(stage){boot.stage=stage;boot.history.push({stage});if(boot.history.length>12)boot.history.shift();};
 boot.note=function(code,message){boot.history.push({code,message:String(message).slice(0,1500)});if(boot.history.length>12)boot.history.shift();};
 boot.diagnostic=function(code,message){return {version:VERSION,stage:boot.stage,code,message:String(message),graphics:boot.graphics,history:boot.history.slice()};};
 boot.fail=function(message,code='RUNTIME_ERROR'){
  if(boot.failed){boot.note(code,message);return;}
  boot.failed=true;details=String(message||'Erro de inicialização desconhecido.');
  const diagnostic=boot.diagnostic(code,details);boot.lastError=diagnostic;
  try{root.localStorage.setItem('kaito-last-error',JSON.stringify(diagnostic));}catch{}
  root.document.getElementById('loading')?.classList.add('hidden');
  root.document.getElementById('error')?.classList.remove('hidden');
  const text=root.document.getElementById('fatalText');if(text)text.textContent=details;
  const log=root.document.getElementById('diagnosticText');if(log)log.textContent=JSON.stringify(diagnostic,null,2);
  root.console?.error?.('[Kaito '+code+'] '+details);
 };
 boot.context=function(canvas){
  boot.mark('context');
  const options={antialias:!boot.compatibility,alpha:false,powerPreference:boot.compatibility?'low-power':'default'};
  try{
   const gl=canvas.getContext('webgl',options)||canvas.getContext('experimental-webgl',options);
   if(!gl){boot.fail('WebGL não está disponível neste navegador. Tente o modo leve, ative a aceleração gráfica ou abra em outro navegador.','WEBGL_UNAVAILABLE');return null;}
   boot.graphics={context:'WebGL 1',antialias:!!gl.getContextAttributes?.()?.antialias,compatibility:boot.compatibility,
     version:String(gl.getParameter?.(gl.VERSION)||''),shadingLanguage:String(gl.getParameter?.(gl.SHADING_LANGUAGE_VERSION)||'')};
   return gl;
  }catch(error){boot.fail(error.message,'CONTEXT_CREATION');return null;}
 };
 boot.restart=function(light){
  try{const options=rawOptions();if(light===true){options.quality='1';options.distance=60;options.shadows=false;options.weather=false;options.fpsCap=30;options.compatibility=true;}
   if(light===false){options.compatibility=false;options.quality='1.5';options.fpsCap=60;}
   root.localStorage.setItem('kaito-options',JSON.stringify(options));root.sessionStorage?.removeItem('kaito-context-recoveries');
  }catch{}
  try{if(typeof light==='boolean'&&root.location.href){const url=new URL(root.location.href);if(light)url.searchParams.set('mode','light');else url.searchParams.delete('mode');root.location.replace(url.href);return;}}catch{}
  root.location.reload();
 };
 boot.bindCanvas=function(canvas,onLost){
  canvas.addEventListener('webglcontextcreationerror',event=>boot.note('CONTEXT_CREATION',event.statusMessage||'Falha ao criar contexto.'));
  canvas.addEventListener('webglcontextlost',event=>{
   event.preventDefault();boot.contextLost=true;try{onLost?.();}catch(error){boot.note('SAVE_ON_CONTEXT_LOST',error.message);}
   boot.fail('A conexão com a placa gráfica foi interrompida. Seu progresso foi preservado. Aguarde a restauração ou use Recarregar.','CONTEXT_LOST');
  });
  canvas.addEventListener('webglcontextrestored',()=>{
   boot.note('CONTEXT_RESTORED','O navegador restaurou a conexão gráfica.');
   // Restore once per session, then keep the explicit retry UI instead of a reload loop.
   try{if(root.sessionStorage&&Number(root.sessionStorage.getItem('kaito-context-recoveries')||0)<1){root.sessionStorage.setItem('kaito-context-recoveries','1');root.location.reload();}}catch{}
  });
 };
 boot.complete=function(){boot.ready=true;boot.mark('ready');try{root.localStorage.setItem('kaito-last-boot',JSON.stringify(boot.diagnostic('READY','Inicialização concluída.')));}catch{}root.clearTimeout?.(watchdog);};
 root.KaitoBoot=boot;root.KaitoFail=(message,code)=>boot.fail(message,code);
 root.addEventListener('error',event=>boot.fail(event.message||event.error?.message||(event.target?.src?'Falha ao carregar um arquivo do jogo.':'Erro inesperado.'),'JAVASCRIPT_ERROR'));
 root.addEventListener('unhandledrejection',event=>boot.fail(event.reason?.message||event.reason,'PROMISE_ERROR'));
 const retry=root.document.getElementById('retryButton'),light=root.document.getElementById('lightButton');
 if(retry)retry.onclick=()=>boot.restart();if(light)light.onclick=()=>boot.restart(true);
 const normal=root.document.getElementById('normalMode');if(normal)normal.onclick=()=>boot.restart(false);
 const copy=root.document.getElementById('copyError');if(copy)copy.onclick=async()=>{try{await root.navigator.clipboard.writeText(JSON.stringify(boot.lastError||boot.diagnostic('INFO',details),null,2));copy.textContent='Detalhes copiados';}catch{copy.textContent='Selecione e copie os detalhes abaixo';}};
 watchdog=root.setTimeout?.(()=>{if(!boot.ready&&!boot.failed)boot.fail('O carregamento não terminou. Recarregue ou tente o modo leve.','BOOT_TIMEOUT');},12000);
})(typeof window!=='undefined'?window:globalThis);
