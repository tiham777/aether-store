// One-off: download Google Fonts woff2 subsets locally and print @font-face CSS.
import { mkdirSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const OUT = 'assets/fonts';
mkdirSync(OUT, { recursive: true });

const FAMILIES = [
  ['Inter:wght@400;500;600;700', 'inter'],
  ['Instrument+Serif:ital@0;1', 'instrument-serif'],
];

let css = '';
for (const [family, slug] of FAMILIES) {
  const url = `https://fonts.googleapis.com/css2?family=${family}&display=swap`;
  const r = spawnSync('curl', ['-sS', '-m', '25', '--compressed', '-H', `User-Agent: ${UA}`, url], {
    encoding: 'utf8',
    maxBuffer: 8 * 1024 * 1024,
  });
  if (r.status !== 0) throw new Error(r.stderr);
  const blocks = r.stdout.split('/*').map((b) => '/*' + b);
  let n = 0;
  for (const b of blocks) {
    const subset = (b.match(/\/\*\s*([a-z-]+)\s*\*\//) || [])[1];
    if (subset !== 'latin' && subset !== 'latin-ext') continue;
    const u = (b.match(/url\((https:[^)]+\.woff2)\)/) || [])[1];
    if (!u) continue;
    const isItalic = /font-style:\s*italic/.test(b);
    const weight = (b.match(/font-weight:\s*([0-9 ]+)/) || [])[1].trim();
    const fname = `${slug}-${weight.replace(/\s+/g, '-')}${isItalic ? '-italic' : ''}-${subset}.woff2`;
    const dl = spawnSync('curl', ['-sS', '-m', '30', '-H', `User-Agent: ${UA}`, '-o', `${OUT}/${fname}`, u], {
      encoding: 'utf8',
    });
    if (dl.status !== 0) throw new Error(dl.stderr);
    n++;
    css += b.replace(/url\(https:[^)]+\.woff2\)/, `url("./${fname}")`).replace(/^\/\*[^*]*\*\/\n?/, '');
  }
  console.log(`${family}: ${n} files`);
}
writeFileSync(`${OUT}/fonts.css`, css.trim() + '\n');
console.log(`wrote ${OUT}/fonts.css (${css.length} bytes)`);
