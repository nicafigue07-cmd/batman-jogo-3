/* Visible startup/recovery errors; progress is never erased during recovery. */
(function(root){
 let details='';
 root.KaitoFail=function(message){
  details=String(message||'Erro de inicialização desconhecido.');
  const error=document.getElementById('error'),text=document.getElementById('fatalText');
  document.getElementById('loading')?.classList.add('hidden');
  error?.classList.remove('hidden');
  if(text)text.textContent=details;
 };
 root.addEventListener('error',event=>root.KaitoFail(event.message||event.error?.message));
 root.addEventListener('unhandledrejection',event=>root.KaitoFail(event.reason?.message||event.reason));
 const retry=document.getElementById('retryButton'),light=document.getElementById('lightButton');
 if(retry)retry.onclick=()=>root.location.reload();
 if(light)light.onclick=()=>{
  try{let options=JSON.parse(localStorage.getItem('kaito-options')||'{}');if(!options||typeof options!=='object')options={};options.quality='1';options.distance=60;options.shadows=false;options.weather=false;localStorage.setItem('kaito-options',JSON.stringify(options));}catch{}
  root.location.reload();
 };
 const copy=document.getElementById('copyError');
 if(copy)copy.onclick=async()=>{try{await root.navigator.clipboard.writeText(details);copy.textContent='Detalhes copiados';}catch{copy.textContent='Selecione e copie o texto acima';}};
})(typeof window!=='undefined'?window:globalThis);
