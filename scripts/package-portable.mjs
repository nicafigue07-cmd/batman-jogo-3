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
const output = resolve(root, 'Batman-Sombras-de-Gotham.html');
await writeFile(output, html);
console.log(`Jogo portátil: ${output}`);
for (const [edition, platform] of Object.entries({PC:'pc',Tablet:'tablet','Controle-PlayStation':'gamepad'})) {
  const content=html.replace('<head>',`<head>\n<script>document.documentElement.dataset.platform=${JSON.stringify(platform)};</script>`);
  const path=resolve(root,`Batman-Sombras-de-Gotham-${edition}.html`);
  await writeFile(path,content);
  console.log(`Edição ${edition}: ${path}`);
}
