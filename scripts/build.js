'use strict';
// Build: minifica JS/CSS y genera public-dist/ con las paginas listas para produccion.
// Uso: npm run build
const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'public');
const OUT = path.join(ROOT, 'public-dist');

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]));
}

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const rels = walk(SRC).map((f) => path.relative(SRC, f));

for (const rel of rels) {
  const abs = path.join(SRC, rel);
  const dest = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });

  if (/\.html$/i.test(rel)) {
    let html = fs.readFileSync(abs, 'utf8');
    html = html.replace(/\/css\/styles\.css/g, '/css/styles.min.css');
    fs.writeFileSync(dest, html);
  } else if (/\.css$/i.test(rel)) {
    const min = esbuild.transformSync(fs.readFileSync(abs, 'utf8'), { loader: 'css', minify: true }).code;
    fs.writeFileSync(path.join(path.dirname(dest), 'styles.min.css'), min);
  } else if (/\.js$/i.test(rel)) {
    const min = esbuild.transformSync(fs.readFileSync(abs, 'utf8'), { minify: true, target: 'es2018' }).code;
    fs.writeFileSync(dest, min);
  } else {
    fs.copyFileSync(abs, dest);
  }
}

console.log(`Build completo en ${path.relative(ROOT, OUT)} (${rels.length} archivos)`);
