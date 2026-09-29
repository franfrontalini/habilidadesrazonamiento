// Empaqueta web/ (index.html + styles.css + items.js + app.js) en un único
// apps-script/Index.html, que es lo que sirve doGet() con HtmlService.
// Uso: node tools/build.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const leer = (p) => readFileSync(join(raiz, p), 'utf8');

let html = leer('web/index.html');
const css = leer('web/styles.css');
const js = { 'items.js': leer('web/items.js'), 'app.js': leer('web/app.js') };

for (const [nombre, codigo] of Object.entries(js)) {
  if (/<\/script/i.test(codigo)) throw new Error(`${nombre} contiene "</script": no se puede incrustar.`);
  const etiqueta = `<script src="${nombre}"></script>`;
  if (!html.includes(etiqueta)) throw new Error(`No se encontró ${etiqueta} en index.html`);
  html = html.replace(etiqueta, () => `<script>\n${codigo}\n</script>`);
}
const link = '<link rel="stylesheet" href="styles.css">';
if (!html.includes(link)) throw new Error('No se encontró el <link> de styles.css en index.html');
html = html.replace(link, () => `<style>\n${css}\n</style>`);

// Dentro de Apps Script el transporte es google.script.run: el endpoint queda vacío.
html = html.replace(/<meta name="adm-endpoint" content="[^"]*">/, '<meta name="adm-endpoint" content="">');
// HtmlService agrega su propio viewport (addMetaTag en doGet).
html = html.replace(/\s*<meta name="viewport"[^>]*>/, '');

const cabecera = '<!-- ARCHIVO GENERADO por tools/build.mjs a partir de web/. No editar a mano. -->\n';
writeFileSync(join(raiz, 'apps-script/Index.html'), cabecera + html);
console.log(`apps-script/Index.html generado (${Math.round((cabecera + html).length / 1024)} KB).`);
