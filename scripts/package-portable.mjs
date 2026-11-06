import { readFile, writeFile } from 'node:fs/promises';
import { resolve, sep } from 'node:path';

// Bundle the existing production output into a downloadable, self-contained page.
// Source files and gameplay stay identical to the regular production build.
const root = resolve('dist');
let html = await readFile(resolve(root, 'index.html'), 'utf8');
async function asset(href) {
  const path = resolve(root, href.replace(/^\//, ''));
  if (!path.startsWith(root + sep)) throw new Error('Asset outside dist');
  return readFile(path, 'utf8');
}
const script = html.match(/<script\b[^>]*\bsrc="([^"]+)"[^>]*>\s*<\/script>/);
const stylesheet = html.match(/<link\b[^>]*\brel="stylesheet"[^>]*>/);
if (!script || !stylesheet) throw new Error('Build the project before packaging');
const href = stylesheet[0].match(/href="([^"]+)"/);
if (!href) throw new Error('Stylesheet path missing');
const javascript = await asset(script[1]);
const stylesheetContent = await asset(href[1]);
if (/<\/script/i.test(javascript)) throw new Error('Script requires HTML-safe escaping');
html = html.replace(script[0], () => `<script type="module">\n${javascript}\n</script>`);
html = html.replace(stylesheet[0], () => `<style>\n${stylesheetContent}\n</style>`);
// Keep a readable screen even when a file viewer blocks JavaScript or WebGL.
const boot = `<div id="startup-status" role="status" style="position:fixed;inset:0;z-index:99999;background:#102c39;color:#fff;display:grid;place-content:center;padding:28px;font:18px/1.6 Arial,sans-serif"><h1>Kaito Nami</h1><p id="startup-message">Abrindo o jogo…</p><p>Se esta mensagem continuar, abra este arquivo no Chrome ou Edge.<br>No navegador, pressione Ctrl + O e selecione o arquivo baixado.</p></div>
<script>
(function(){
var box=document.getElementById('startup-status'), message=document.getElementById('startup-message');
window.addEventListener('error',function(event){message.textContent='Não foi possível iniciar: '+(event.message||'erro do navegador');});
var checks=0,timer=setInterval(function(){
if(window.__gotham&&window.__gotham.snapshot().rendererCalls>0){box.remove();clearInterval(timer);}
else if(++checks>80){message.textContent='O jogo não iniciou. Verifique se o navegador permite JavaScript e aceleração gráfica.';clearInterval(timer);}
},250);
})();
</script>`;
html=html.replace('<body>','<body>'+boot);
const output = resolve(root, 'Kaito-Nami.html');
await writeFile(output, html);
console.log(`Jogo portátil: ${output}`);
for (const [edition, platform] of Object.entries({PC:'pc',Tablet:'tablet','Controle-PlayStation':'gamepad'})) {
  const content=html.replace('<head>',`<head>\n<script>document.documentElement.dataset.platform=${JSON.stringify(platform)};</script>`);
  const path=resolve(root,`Kaito-Nami-${edition}.html`);
  await writeFile(path,content);
  console.log(`Edição ${edition}: ${path}`);
}
