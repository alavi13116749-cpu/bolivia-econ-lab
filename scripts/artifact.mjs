// Convierte el build de archivo único en un fragmento publicable como Artifact de claude.ai:
// el visor agrega su propio <!doctype>/<head>/<body>, así que sólo conservamos
// <title>, fuentes, estilos, el contenido del body y el script.
// Se recorre por posiciones (no con regex globales) porque el JS embebido
// contiene cadenas como "<body>" que confundirían a una expresión regular.
import { readFileSync, writeFileSync } from 'node:fs';

const src = readFileSync('dist-artifact/index.html', 'utf8');
const between = (s, a, b, from = 0) => {
  const i = s.indexOf(a, from);
  if (i < 0) return null;
  const j = s.indexOf(b, i + a.length);
  return { start: i, end: j + b.length, text: s.slice(i, j + b.length) };
};

const title = between(src, '<title>', '</title>');
const scriptOpen = src.indexOf('<script');
const script = between(src, '<script', '</script>', scriptOpen);
if (!script) throw new Error('No se encontró el script principal.');
const styles = [];
for (let from = 0, st; (st = between(src, '<style', '</style>', from)); from = st.end) {
  // sólo estilos fuera del script
  if (st.start < script.start || st.start > script.end) styles.push(st.text);
}
const headEnd = src.indexOf('</head>', script.end);
const body = between(src, '<body>', '</body>', headEnd);
const links = (src.slice(0, scriptOpen).match(/<link[^>]+rel="(?:stylesheet|preconnect)"[^>]*>/gi) ?? []);
// U+FFFD literal (p.ej. en marked) se escribe como escape JS equivalente: el publicador lo rechaza como texto dañado.
const scriptText = script.text.replaceAll('\uFFFD', '\\uFFFD');
const out = [title?.text ?? '<title>Bolivia Econ Lab</title>', ...links, ...styles, body.text.slice(6, -7).trim(), scriptText].join('\n');
writeFileSync('dist-artifact/bolivia-econ-lab.html', out);
console.log(`dist-artifact/bolivia-econ-lab.html (${(out.length / 1e6).toFixed(2)} MB, ${styles.length} estilos)`);
