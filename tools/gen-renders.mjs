// Generates the AETHER product render set: 800x1000 studio-style SVG objects.
import { mkdirSync, writeFileSync } from 'node:fs';

const W = 800;
const H = 1000;
mkdirSync('assets/products', { recursive: true });

const frame = ({ id, tint = ['#F4F2EE', '#E9E6E0'], body }) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${id}">
<defs>
<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${tint[0]}"/><stop offset="1" stop-color="${tint[1]}"/></linearGradient>
<radialGradient id="glow" cx="50%" cy="24%" r="62%"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
<linearGradient id="dk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3c3c41"/><stop offset=".55" stop-color="#26262a"/><stop offset="1" stop-color="#151518"/></linearGradient>
<linearGradient id="dkh" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4a4a50"/><stop offset="1" stop-color="#1a1a1e"/></linearGradient>
<linearGradient id="mt" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#efece5"/><stop offset=".5" stop-color="#c8c2b6"/><stop offset="1" stop-color="#98917f"/></linearGradient>
<linearGradient id="mt2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d9d4c9"/><stop offset="1" stop-color="#8f8878"/></linearGradient>
<radialGradient id="sh" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#0b0b0c" stop-opacity=".46"/><stop offset=".65" stop-color="#0b0b0c" stop-opacity=".16"/><stop offset="1" stop-color="#0b0b0c" stop-opacity="0"/></radialGradient>
<radialGradient id="face" cx="35%" cy="28%" r="80%"><stop offset="0" stop-color="#31313a"/><stop offset="1" stop-color="#0c0c10"/></radialGradient>
<linearGradient id="lens" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3d3f45"/><stop offset=".5" stop-color="#15161a"/><stop offset="1" stop-color="#26272d"/></linearGradient>
<filter id="b24" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="24"/></filter>
<filter id="b10" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="10"/></filter>
<filter id="grain"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="3" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter>
</defs>
<rect width="${W}" height="${H}" fill="url(#bg)"/>
<rect width="${W}" height="${H}" fill="url(#glow)"/>
<ellipse cx="400" cy="836" rx="250" ry="42" fill="url(#sh)"/>
${body}
<rect width="${W}" height="${H}" filter="url(#grain)" opacity=".055" style="mix-blend-mode:multiply"/>
</svg>\n`;
  writeFileSync(`assets/products/${id}.svg`, svg);
  return svg.length;
};

const ACCENT = '#cf5b34';
const ACCENT_D = '#a8451f';

/* ---------------------------------- audio --------------------------------- */

const haloOne = () => {
  const band = 'M 250 545 C 246 322, 554 322, 550 545';
  const bandInner = 'M 250 545 C 247 356, 553 356, 550 545';
  const cup = (x) => `
  <g>
    <rect x="${x - 58}" y="500" width="116" height="176" rx="52" fill="url(#dk)"/>
    <rect x="${x - 58}" y="500" width="116" height="176" rx="52" fill="none" stroke="#ffffff" stroke-opacity=".14"/>
    <rect x="${x - 42}" y="516" width="84" height="144" rx="40" fill="#0f0f12"/>
    <rect x="${x - 42}" y="516" width="84" height="144" rx="40" fill="none" stroke="#ffffff" stroke-opacity=".1"/>
    <rect x="${x - 30}" y="546" width="60" height="84" rx="26" fill="#08080a"/>
    <path d="M ${x - 52} 528 q 18 -16 44 -18" stroke="#ffffff" stroke-opacity=".22" stroke-width="6" fill="none" stroke-linecap="round"/>
  </g>`;
  return frame({
    id: 'halo-one',
    tint: ['#f3f1ed', '#e7e4dd'],
    body: `
  <ellipse cx="400" cy="700" rx="176" ry="26" fill="url(#sh)" opacity=".7"/>
  <path d="${band}" stroke="url(#dkh)" stroke-width="34" fill="none" stroke-linecap="round"/>
  <path d="${bandInner}" stroke="#ffffff" stroke-opacity=".2" stroke-width="7" fill="none" stroke-linecap="round"/>
  <path d="${bandInner}" stroke="url(#mt2)" stroke-width="13" fill="none" stroke-linecap="round" opacity=".92"/>
  <rect x="236" y="486" width="28" height="70" rx="13" fill="url(#mt2)"/>
  <rect x="536" y="486" width="28" height="70" rx="13" fill="url(#mt2)"/>
  ${cup(250)}
  ${cup(550)}
  <circle cx="550" cy="588" r="9" fill="${ACCENT}"/>
  <circle cx="550" cy="616" r="9" fill="#0a0a0c" stroke="#ffffff" stroke-opacity=".22"/>`,
  });
};

const haloBuds = () => {
  const bud = (x, flip) => `
  <g transform="rotate(${flip ? 7 : -7} ${x} 460)">
    <ellipse cx="${x}" cy="360" rx="58" ry="52" fill="url(#dk)"/>
    <ellipse cx="${x}" cy="360" rx="58" ry="52" fill="none" stroke="#fff" stroke-opacity=".14"/>
    <ellipse cx="${x - 13 * (flip ? -1 : 1)}" cy="344" rx="27" ry="19" fill="#ffffff" opacity=".15"/>
    <rect x="${x - 21}" y="402" width="42" height="118" rx="21" fill="url(#dk)"/>
    <rect x="${x - 21}" y="402" width="42" height="118" rx="21" fill="none" stroke="#fff" stroke-opacity=".12"/>
    <rect x="${x - 11}" y="486" width="22" height="26" rx="11" fill="url(#mt2)"/>
  </g>`;
  return frame({
    id: 'halo-buds',
    tint: ['#f4f2ef', '#e8e5df'],
    body: `
  <ellipse cx="400" cy="800" rx="196" ry="30" fill="url(#sh)" opacity=".75"/>
  ${bud(330, false)}
  ${bud(470, true)}
  <rect x="256" y="556" width="288" height="216" rx="56" fill="url(#dk)"/>
  <rect x="256" y="556" width="288" height="216" rx="56" fill="none" stroke="#fff" stroke-opacity=".15"/>
  <rect x="276" y="576" width="248" height="84" rx="36" fill="#101014" opacity=".75"/>
  <path d="M 276 664 H 524" stroke="#ffffff" stroke-opacity=".2" stroke-width="3"/>
  <path d="M 294 594 q 106 -18 212 0" stroke="#ffffff" stroke-opacity=".24" stroke-width="7" fill="none" stroke-linecap="round"/>
  <circle cx="400" cy="742" r="11" fill="${ACCENT}"/>
  <rect x="336" y="706" width="46" height="12" rx="6" fill="url(#mt2)" opacity=".5"/>`,
  });
};

const monolithS = () => {
  let grille = '';
  for (let r = 0; r < 15; r++) {
    for (let c = 0; c < 7; c++) {
      grille += `<circle cx="${326 + c * 25}" cy="${392 + r * 25}" r="5.4" fill="#050506" opacity=".85"/>`;
    }
  }
  return frame({
    id: 'monolith-s',
    tint: ['#f1f0ec', '#e4e1da'],
    body: `
  <ellipse cx="400" cy="806" rx="170" ry="28" fill="url(#sh)" opacity=".8"/>
  <rect x="290" y="300" width="220" height="500" rx="62" fill="url(#dk)"/>
  <rect x="290" y="300" width="220" height="500" rx="62" fill="none" stroke="#fff" stroke-opacity=".14"/>
  <rect x="312" y="356" width="176" height="392" rx="38" fill="#0b0b0d"/>
  ${grille}
  <rect x="312" y="756" width="176" height="0" fill="none"/>
  <ellipse cx="400" cy="318" rx="94" ry="26" fill="url(#mt)"/>
  <ellipse cx="400" cy="312" rx="94" ry="26" fill="none" stroke="#fff" stroke-opacity=".5"/>
  <circle cx="400" cy="312" r="24" fill="url(#dk)"/>
  <circle cx="400" cy="312" r="9" fill="${ACCENT}"/>
  <path d="M 306 340 q 10 -6 18 -8" stroke="#fff" stroke-opacity=".3" stroke-width="6" fill="none" stroke-linecap="round"/>
  <rect x="336" y="776" width="128" height="14" rx="7" fill="#0a0a0c"/>`,
  });
};

/* -------------------------------- workspace -------------------------------- */

const slate65 = () => {
  const keys = [];
  const kx = 168;
  const ky = 466;
  const kw = 26;
  const gap = 6;
  const step = kw + gap;
  const mk = (x, y, w, accent) =>
    `<rect x="${x}" y="${y}" width="${w}" height="${kw}" rx="7" fill="${
      accent ? ACCENT : 'url(#dkh)'
    }" stroke="#ffffff" stroke-opacity="${accent ? '.18' : '.1'}"/>`;

  const rows = [15, 15, 14, 13, 12];
  rows.forEach((n, r) => {
    let x = kx + r * 5;
    for (let i = 0; i < n; i++) {
      keys.push(mk(x, ky + r * step, kw, r === 0 && i === 0));
      x += step;
    }
  });

  /* bottom row: modifiers, spacebar, modifiers */
  const by = ky + 5 * step;
  [0, 1, 2].forEach((i) => keys.push(mk(kx + i * step, by, kw)));
  keys.push(mk(290, by, 200));
  [0, 1, 2].forEach((i) => keys.push(mk(508 + i * step, by, kw)));

  return frame({
    id: 'slate65',
    tint: ['#f2f1ee', '#e6e3dc'],
    body: `
  <ellipse cx="400" cy="744" rx="262" ry="32" fill="url(#sh)" opacity=".8"/>
  <rect x="140" y="436" width="520" height="260" rx="32" fill="url(#dk)"/>
  <rect x="140" y="436" width="520" height="260" rx="32" fill="none" stroke="#fff" stroke-opacity=".16"/>
  <rect x="156" y="452" width="488" height="228" rx="22" fill="#0e0e11"/>
  ${keys.join('')}
  <path d="M 172 686 H 628" stroke="#fff" stroke-opacity=".16" stroke-width="4" stroke-linecap="round"/>`,
  });
};

const arcMouse = () =>
  frame({
    id: 'arc-mouse',
    tint: ['#f3f2ef', '#e7e4de'],
    body: `
  <ellipse cx="400" cy="768" rx="160" ry="30" fill="url(#sh)" opacity=".8"/>
  <path d="M 400 300 C 512 300, 578 410, 578 546 C 578 690, 500 764, 400 764 C 300 764, 222 690, 222 546 C 222 410, 288 300, 400 300 Z" fill="url(#dk)"/>
  <path d="M 400 300 C 512 300, 578 410, 578 546 C 578 690, 500 764, 400 764 C 300 764, 222 690, 222 546 C 222 410, 288 300, 400 300 Z" fill="none" stroke="#fff" stroke-opacity=".16"/>
  <path d="M 400 306 C 322 372, 300 470, 302 566" stroke="#fff" stroke-opacity=".22" stroke-width="16" fill="none" stroke-linecap="round" filter="url(#b10)" opacity=".7"/>
  <path d="M 400 316 V 546" stroke="#000" stroke-opacity=".55" stroke-width="4"/>
  <path d="M 400 316 V 546" stroke="#fff" stroke-opacity=".14" stroke-width="1.5"/>
  <rect x="386" y="366" width="28" height="66" rx="14" fill="url(#mt2)"/>
  <rect x="392" y="374" width="8" height="50" rx="4" fill="#5f5a4e"/>
  <circle cx="400" cy="686" r="7" fill="${ACCENT}" opacity=".9"/>
  <path d="M 316 640 q 84 46 168 0" stroke="#000" stroke-opacity=".3" stroke-width="3" fill="none"/>`,
  });

const lumenDesk = () =>
  frame({
    id: 'lumen-desk',
    tint: ['#f4f2ee', '#e8e5de'],
    body: `
  <ellipse cx="400" cy="810" rx="210" ry="32" fill="url(#sh)" opacity=".85"/>
  <ellipse cx="356" cy="770" rx="120" ry="30" fill="url(#dk)"/>
  <ellipse cx="356" cy="762" rx="120" ry="30" fill="url(#dkh)"/>
  <ellipse cx="356" cy="758" rx="120" ry="30" fill="none" stroke="#fff" stroke-opacity=".18"/>
  <ellipse cx="356" cy="750" rx="46" ry="12" fill="url(#mt2)"/>
  <path d="M 356 752 L 372 470" stroke="url(#dkh)" stroke-width="26" stroke-linecap="round"/>
  <path d="M 356 752 L 372 470" stroke="#fff" stroke-opacity=".18" stroke-width="7" stroke-linecap="round" fill="none"/>
  <circle cx="374" cy="464" r="26" fill="url(#mt)"/>
  <circle cx="374" cy="464" r="11" fill="${ACCENT_D}"/>
  <path d="M 388 452 L 546 372" stroke="url(#dkh)" stroke-width="24" stroke-linecap="round"/>
  <path d="M 388 452 L 546 372" stroke="#fff" stroke-opacity=".2" stroke-width="6" stroke-linecap="round" fill="none"/>
  <g transform="rotate(28 560 372)">
    <path d="M 508 336 L 646 336 L 690 452 L 468 452 Z" fill="url(#dk)"/>
    <path d="M 508 336 L 646 336 L 690 452 L 468 452 Z" fill="none" stroke="#fff" stroke-opacity=".16"/>
    <ellipse cx="577" cy="446" rx="108" ry="26" fill="#0b0b0d"/>
    <ellipse cx="577" cy="444" rx="94" ry="20" fill="#fff8ec" opacity=".95"/>
    <ellipse cx="577" cy="444" rx="94" ry="20" fill="url(#glow)"/>
  </g>
  <ellipse cx="612" cy="700" rx="150" ry="52" fill="#fff5e3" opacity=".5" filter="url(#b24)"/>`,
  });

const dockOne = () =>
  frame({
    id: 'dock-one',
    tint: ['#f2f1ee', '#e5e2db'],
    body: `
  <ellipse cx="400" cy="812" rx="200" ry="30" fill="url(#sh)" opacity=".8"/>
  <rect x="250" y="742" width="300" height="52" rx="26" fill="url(#dk)"/>
  <rect x="250" y="742" width="300" height="52" rx="26" fill="none" stroke="#fff" stroke-opacity=".16"/>
  <g transform="rotate(-14 400 620)">
    <rect x="326" y="452" width="148" height="304" rx="30" fill="url(#dkh)"/>
    <rect x="326" y="452" width="148" height="304" rx="30" fill="none" stroke="#fff" stroke-opacity=".16"/>
    <rect x="344" y="472" width="112" height="266" rx="22" fill="#0d0d10"/>
    <rect x="356" y="486" width="88" height="238" rx="16" fill="#16161a"/>
    <path d="M 372 500 v 210" stroke="#fff" stroke-opacity=".16" stroke-width="10" stroke-linecap="round"/>
    <circle cx="400" cy="536" r="34" fill="none" stroke="${ACCENT}" stroke-width="7" opacity=".9"/>
    <circle cx="400" cy="536" r="9" fill="${ACCENT}"/>
  </g>
  <rect x="286" y="766" width="128" height="10" rx="5" fill="url(#mt2)" opacity=".7"/>
  <path d="M 556 792 q 76 8 76 -40" stroke="#d8d3c8" stroke-width="12" fill="none" stroke-linecap="round"/>
  <circle cx="632" cy="742" r="13" fill="url(#mt2)"/>`,
  });

/* -------------------------------- everyday --------------------------------- */

const meridianWatch = () => {
  let ticks = '';
  for (let i = 0; i < 12; i++) {
    const a = (i * Math.PI) / 6 - Math.PI / 2;
    const r1 = 116;
    const r2 = i % 3 === 0 ? 92 : 102;
    ticks += `<line x1="${400 + Math.cos(a) * r1}" y1="${500 + Math.sin(a) * r1}" x2="${
      400 + Math.cos(a) * r2
    }" y2="${500 + Math.sin(a) * r2}" stroke="#ffffff" stroke-opacity="${
      i % 3 === 0 ? '.92' : '.5'
    }" stroke-width="${i % 3 === 0 ? 7 : 3.5}" stroke-linecap="round"/>`;
  }
  let holes = '';
  for (let i = 0; i < 5; i++) holes += `<circle cx="400" cy="${706 + i * 34}" r="7" fill="#08080a" opacity=".8"/>`;
  return frame({
    id: 'meridian-watch',
    tint: ['#f3f1ed', '#e6e3dc'],
    body: `
  <ellipse cx="400" cy="838" rx="150" ry="26" fill="url(#sh)" opacity=".8"/>
  <path d="M 352 214 h 96 q 18 0 18 18 v 220 h -132 v -220 q 0 -18 18 -18 z" fill="url(#dk)"/>
  <path d="M 334 548 h 132 v 220 q 0 18 -18 18 h -96 q -18 0 -18 -18 z" fill="url(#dk)"/>
  <path d="M 352 214 h 96 q 18 0 18 18 v 220 h -132 v -220 q 0 -18 18 -18 z" fill="none" stroke="#fff" stroke-opacity=".14"/>
  <path d="M 334 548 h 132 v 220 q 0 18 -18 18 h -96 q -18 0 -18 -18 z" fill="none" stroke="#fff" stroke-opacity=".14"/>
  <rect x="334" y="330" width="132" height="20" rx="10" fill="url(#mt2)" opacity=".55"/>
  ${holes}
  <circle cx="400" cy="500" r="176" fill="url(#mt)"/>
  <circle cx="400" cy="500" r="176" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="2"/>
  <circle cx="400" cy="500" r="144" fill="url(#face)"/>
  <circle cx="400" cy="500" r="144" fill="none" stroke="#000" stroke-opacity=".4" stroke-width="3"/>
  ${ticks}
  <line x1="400" y1="516" x2="400" y2="428" stroke="#f4f2ec" stroke-width="13" stroke-linecap="round"/>
  <line x1="400" y1="516" x2="470" y2="452" stroke="#f4f2ec" stroke-width="11" stroke-linecap="round"/>
  <line x1="374" y1="524" x2="474" y2="470" stroke="${ACCENT}" stroke-width="4.5" stroke-linecap="round"/>
  <circle cx="400" cy="500" r="12" fill="${ACCENT_D}"/>
  <circle cx="400" cy="500" r="5" fill="#f4f2ec"/>
  <rect x="568" y="482" width="30" height="36" rx="12" fill="url(#mt2)"/>
  <path d="M 322 428 a 176 176 0 0 1 96 -112" stroke="#fff" stroke-opacity=".45" stroke-width="14" fill="none" stroke-linecap="round" filter="url(#b10)" opacity=".7"/>`,
  });
};

const atlasPack = () =>
  frame({
    id: 'atlas-pack',
    tint: ['#f2f1ee', '#e4e1da'],
    body: `
  <ellipse cx="400" cy="836" rx="196" ry="30" fill="url(#sh)" opacity=".8"/>
  <path d="M 300 348 q -34 96 -18 210" stroke="#111114" stroke-width="34" fill="none" stroke-linecap="round"/>
  <path d="M 500 348 q 34 96 18 210" stroke="#111114" stroke-width="34" fill="none" stroke-linecap="round"/>
  <path d="M 300 348 q -34 96 -18 210" stroke="#fff" stroke-opacity=".12" stroke-width="10" fill="none" stroke-linecap="round"/>
  <path d="M 500 348 q 34 96 18 210" stroke="#fff" stroke-opacity=".12" stroke-width="10" fill="none" stroke-linecap="round"/>
  <path d="M 400 306 q -66 0 -78 46" stroke="url(#mt2)" stroke-width="16" fill="none" stroke-linecap="round"/>
  <rect x="244" y="330" width="312" height="486" rx="86" fill="url(#dk)"/>
  <rect x="244" y="330" width="312" height="486" rx="86" fill="none" stroke="#fff" stroke-opacity=".15"/>
  <path d="M 262 560 q 138 -34 276 0" stroke="#000" stroke-opacity=".5" stroke-width="5" fill="none"/>
  <path d="M 262 554 q 138 -34 276 0" stroke="#fff" stroke-opacity=".16" stroke-width="3" fill="none"/>
  <rect x="298" y="586" width="204" height="182" rx="42" fill="#141417" opacity=".9"/>
  <rect x="298" y="586" width="204" height="182" rx="42" fill="none" stroke="#fff" stroke-opacity=".14"/>
  <rect x="352" y="742" width="96" height="18" rx="9" fill="url(#mt2)"/>
  <rect x="384" y="540" width="32" height="44" rx="12" fill="${ACCENT}"/>
  <path d="M 286 400 q 114 -34 228 0" stroke="#fff" stroke-opacity=".18" stroke-width="14" fill="none" stroke-linecap="round"/>
  <rect x="366" y="640" width="68" height="10" rx="5" fill="#fff" opacity=".2"/>`,
  });

const fieldBottle = () =>
  frame({
    id: 'field-bottle',
    tint: ['#f4f2ef', '#e7e4dd'],
    body: `
  <ellipse cx="400" cy="826" rx="150" ry="28" fill="url(#sh)" opacity=".85"/>
  <path d="M 344 346 q 0 -46 22 -66 h 68 q 22 20 22 66 v 396 q 0 66 -56 66 h 0 q -56 0 -56 -66 z" fill="url(#dk)"/>
  <path d="M 344 346 q 0 -46 22 -66 h 68 q 22 20 22 66 v 396 q 0 66 -56 66 h 0 q -56 0 -56 -66 z" fill="none" stroke="#fff" stroke-opacity=".16"/>
  <rect x="352" y="246" width="96" height="84" rx="26" fill="url(#mt)"/>
  <rect x="352" y="246" width="96" height="84" rx="26" fill="none" stroke="#fff" stroke-opacity=".55"/>
  <rect x="344" y="322" width="112" height="18" rx="9" fill="${ACCENT}"/>
  <path d="M 366 400 q -8 220 12 348" stroke="#fff" stroke-opacity=".34" stroke-width="26" fill="none" stroke-linecap="round" filter="url(#b10)" opacity=".75"/>
  <path d="M 462 400 q 6 200 -4 340" stroke="#000" stroke-opacity=".4" stroke-width="20" fill="none" stroke-linecap="round" filter="url(#b10)" opacity=".5"/>
  <circle cx="400" cy="562" r="30" fill="none" stroke="#fff" stroke-opacity=".3" stroke-width="3"/>
  <circle cx="400" cy="562" r="7" fill="#fff" fill-opacity=".55"/>`,
  });

const prismShades = () => {
  const lens = (x, y, flip) => `
  <g transform="translate(${x} ${y}) ${flip ? 'scale(-1 1)' : ''}">
    <path d="M 0 0 h 132 q 34 0 40 40 l 6 46 q 6 56 -46 84 q -52 28 -104 0 q -50 -30 -42 -86 l 8 -46 q 6 -40 40 -40 z" fill="url(#lens)"/>
    <path d="M 0 0 h 132 q 34 0 40 40 l 6 46 q 6 56 -46 84 q -52 28 -104 0 q -50 -30 -42 -86 l 8 -46 q 6 -40 40 -40 z" fill="none" stroke="url(#mt2)" stroke-width="9"/>
    <path d="M 24 34 q 34 -18 74 -6" stroke="#fff" stroke-opacity=".3" stroke-width="12" fill="none" stroke-linecap="round"/>
    <path d="M 30 120 q 30 22 66 24" stroke="#fff" stroke-opacity=".12" stroke-width="10" fill="none" stroke-linecap="round"/>
  </g>`;
  return frame({
    id: 'prism-shades',
    tint: ['#f3f2ef', '#e6e3dd'],
    body: `
  <ellipse cx="400" cy="726" rx="230" ry="34" fill="url(#sh)" opacity=".8"/>
  <path d="M 246 470 q -46 24 -66 62" stroke="url(#mt2)" stroke-width="16" fill="none" stroke-linecap="round"/>
  <path d="M 554 470 q 46 24 66 62" stroke="url(#mt2)" stroke-width="16" fill="none" stroke-linecap="round"/>
  <path d="M 392 470 q 8 -22 16 0 q -8 16 -16 0 z" fill="url(#mt2)"/>
  ${lens(232, 452, false)}
  ${lens(568, 452, true)}
  <path d="M 372 476 q 28 -22 56 0" stroke="url(#mt2)" stroke-width="14" fill="none" stroke-linecap="round"/>
  <path d="M 372 476 q 28 -22 56 0" stroke="#fff" stroke-opacity=".35" stroke-width="5" fill="none" stroke-linecap="round"/>`,
  });
};

const orbitCam = () =>
  frame({
    id: 'orbit-cam',
    tint: ['#f1f0ec', '#e4e1da'],
    body: `
  <ellipse cx="400" cy="778" rx="228" ry="34" fill="url(#sh)" opacity=".85"/>
  <rect x="176" y="404" width="448" height="304" rx="52" fill="url(#dk)"/>
  <rect x="176" y="404" width="448" height="304" rx="52" fill="none" stroke="#fff" stroke-opacity=".16"/>
  <rect x="196" y="424" width="408" height="122" rx="40" fill="#1b1b1f" opacity=".7"/>
  <rect x="228" y="366" width="126" height="52" rx="20" fill="url(#mt2)"/>
  <rect x="386" y="382" width="72" height="34" rx="14" fill="#0e0e11"/>
  <circle cx="596" cy="392" r="17" fill="${ACCENT}"/>
  <circle cx="400" cy="556" r="146" fill="url(#dkh)"/>
  <circle cx="400" cy="556" r="146" fill="none" stroke="#fff" stroke-opacity=".2"/>
  <circle cx="400" cy="556" r="120" fill="#101014"/>
  <circle cx="400" cy="556" r="94" fill="url(#lens)"/>
  <circle cx="400" cy="556" r="94" fill="none" stroke="#fff" stroke-opacity=".14"/>
  <circle cx="400" cy="556" r="64" fill="#08080a"/>
  <circle cx="400" cy="556" r="40" fill="#15171d"/>
  <path d="M 348 500 a 64 64 0 0 1 46 -30" stroke="#fff" stroke-opacity=".5" stroke-width="12" fill="none" stroke-linecap="round" filter="url(#b10)"/>
  <circle cx="368" cy="524" r="13" fill="#fff" opacity=".45"/>
  <circle cx="400" cy="556" r="146" fill="none" stroke="url(#mt2)" stroke-width="6" stroke-dasharray="4 10" opacity=".7"/>
  <rect x="238" y="668" width="98" height="16" rx="8" fill="url(#mt2)" opacity=".6"/>`,
  });

const driftSpeaker = () => {
  let grille = '';
  for (let r = 0; r < 7; r++) {
    for (let c = 0; c < 17; c++) {
      grille += `<circle cx="${210 + c * 23}" cy="${470 + r * 23}" r="4.6" fill="#050506" opacity=".8"/>`;
    }
  }
  return frame({
    id: 'drift-speaker',
    tint: ['#f2f1ee', '#e5e2db'],
    body: `
  <ellipse cx="400" cy="706" rx="224" ry="30" fill="url(#sh)" opacity=".8"/>
  <path d="M 596 470 q 72 -104 138 -34" stroke="url(#mt2)" stroke-width="16" fill="none" stroke-linecap="round"/>
  <path d="M 596 470 q 72 -104 138 -34" stroke="#fff" stroke-opacity=".35" stroke-width="5" fill="none" stroke-linecap="round"/>
  <rect x="170" y="430" width="460" height="250" rx="125" fill="url(#dk)"/>
  <rect x="170" y="430" width="460" height="250" rx="125" fill="none" stroke="#fff" stroke-opacity=".15"/>
  <rect x="196" y="452" width="408" height="206" rx="103" fill="#0b0b0d"/>
  ${grille}
  <circle cx="566" cy="556" r="10" fill="${ACCENT}"/>
  <rect x="222" y="540" width="96" height="12" rx="6" fill="url(#mt2)" opacity=".55"/>
  <path d="M 210 470 q 40 -22 90 -18" stroke="#fff" stroke-opacity=".22" stroke-width="8" fill="none" stroke-linecap="round"/>`,
  });
};

const signalAmp = () =>
  frame({
    id: 'signal-amp',
    tint: ['#f2f1ee', '#e4e1da'],
    body: `
  <ellipse cx="400" cy="756" rx="232" ry="30" fill="url(#sh)" opacity=".85"/>
  <rect x="160" y="470" width="480" height="240" rx="36" fill="url(#dk)"/>
  <rect x="160" y="470" width="480" height="240" rx="36" fill="none" stroke="#fff" stroke-opacity=".16"/>
  <rect x="182" y="492" width="436" height="196" rx="24" fill="#101014"/>
  <circle cx="486" cy="590" r="74" fill="url(#mt)"/>
  <circle cx="486" cy="590" r="74" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="2"/>
  <circle cx="486" cy="590" r="54" fill="url(#dkh)"/>
  <path d="M 486 546 V 574" stroke="${ACCENT}" stroke-width="7" stroke-linecap="round"/>
  <circle cx="486" cy="590" r="7" fill="${ACCENT_D}"/>
  <circle cx="252" cy="590" r="27" fill="#08080a" stroke="url(#mt2)" stroke-width="6"/>
  <circle cx="336" cy="590" r="21" fill="none" stroke="#fff" stroke-opacity=".25" stroke-width="2"/>
  <circle cx="336" cy="590" r="11" fill="${ACCENT}"/>
  <rect x="212" y="678" width="36" height="14" rx="7" fill="url(#mt2)"/>
  <rect x="552" y="678" width="36" height="14" rx="7" fill="url(#mt2)"/>
  <path d="M 200 508 q 60 -14 130 -6" stroke="#fff" stroke-opacity=".2" stroke-width="7" fill="none" stroke-linecap="round"/>`,
  });

const beamBar = () =>
  frame({
    id: 'beam-bar',
    tint: ['#f4f2ee', '#e7e4dd'],
    body: `
  <ellipse cx="400" cy="796" rx="242" ry="32" fill="url(#sh)" opacity=".7"/>
  <path d="M 236 520 L 564 520 L 660 770 L 140 770 Z" fill="#fff5e3" opacity=".55" filter="url(#b24)"/>
  <rect x="498" y="388" width="124" height="190" rx="32" fill="url(#dkh)"/>
  <rect x="498" y="388" width="124" height="190" rx="32" fill="none" stroke="#fff" stroke-opacity=".16"/>
  <rect x="140" y="430" width="520" height="86" rx="43" fill="url(#dk)"/>
  <rect x="140" y="430" width="520" height="86" rx="43" fill="none" stroke="#fff" stroke-opacity=".16"/>
  <rect x="168" y="500" width="464" height="18" rx="9" fill="#fff8ec"/>
  <circle cx="600" cy="473" r="12" fill="${ACCENT}"/>
  <rect x="196" y="458" width="72" height="10" rx="5" fill="url(#mt2)" opacity=".6"/>
  <path d="M 172 456 q 80 -16 170 -8" stroke="#fff" stroke-opacity=".22" stroke-width="7" fill="none" stroke-linecap="round"/>`,
  });

const contourMat = () =>
  frame({
    id: 'contour-mat',
    tint: ['#f2f1ee', '#e5e2db'],
    body: `
  <ellipse cx="400" cy="776" rx="274" ry="34" fill="url(#sh)" opacity=".8"/>
  <rect x="110" y="470" width="580" height="300" rx="44" fill="url(#dk)"/>
  <rect x="110" y="470" width="580" height="300" rx="44" fill="none" stroke="#fff" stroke-opacity=".14"/>
  <path d="M 150 524 q 250 -20 500 0" stroke="#fff" stroke-opacity=".1" stroke-width="28" fill="none" stroke-linecap="round" filter="url(#b10)"/>
  <rect x="136" y="496" width="528" height="248" rx="32" fill="none" stroke="url(#mt2)" stroke-width="4" stroke-dasharray="14 12" opacity=".85"/>
  <rect x="330" y="596" width="140" height="20" rx="10" fill="${ACCENT}" opacity=".92"/>
  <rect x="356" y="630" width="88" height="10" rx="5" fill="#fff" opacity=".25"/>`,
  });

const cairnWallet = () =>
  frame({
    id: 'cairn-wallet',
    tint: ['#f4f2ef', '#e8e4dd'],
    body: `
  <ellipse cx="400" cy="774" rx="194" ry="30" fill="url(#sh)" opacity=".8"/>
  <g transform="rotate(-6 400 430)">
    <rect x="296" y="372" width="208" height="128" rx="16" fill="url(#mt2)"/>
    <rect x="296" y="372" width="208" height="128" rx="16" fill="none" stroke="#fff" stroke-opacity=".5"/>
    <rect x="316" y="444" width="70" height="12" rx="6" fill="#fff" opacity=".55"/>
  </g>
  <g transform="rotate(4 430 420)">
    <rect x="330" y="350" width="196" height="126" rx="16" fill="#e9e4da"/>
    <rect x="330" y="350" width="196" height="126" rx="16" fill="none" stroke="#c9c2b4" stroke-width="2"/>
    <circle cx="372" cy="398" r="16" fill="none" stroke="#9b9ba1" stroke-width="3"/>
  </g>
  <rect x="250" y="420" width="300" height="340" rx="30" fill="url(#dk)"/>
  <rect x="250" y="420" width="300" height="340" rx="30" fill="none" stroke="#fff" stroke-opacity=".16"/>
  <path d="M 250 520 q 150 -34 300 0" stroke="#000" stroke-opacity=".45" stroke-width="5" fill="none"/>
  <path d="M 250 514 q 150 -34 300 0" stroke="#fff" stroke-opacity=".18" stroke-width="3" fill="none"/>
  <rect x="368" y="604" width="64" height="46" rx="10" fill="#0c0c0f" stroke="#fff" stroke-opacity=".12"/>
  <circle cx="400" cy="627" r="8" fill="${ACCENT}"/>
  <path d="M 276 738 h 248" stroke="#fff" stroke-opacity=".3" stroke-width="3" stroke-dasharray="10 9"/>
  <path d="M 276 444 h 248" stroke="#fff" stroke-opacity=".3" stroke-width="3" stroke-dasharray="10 9"/>`,
  });

const atlasTote = () =>
  frame({
    id: 'atlas-tote',
    tint: ['#f2f1ee', '#e4e1da'],
    body: `
  <ellipse cx="400" cy="834" rx="204" ry="30" fill="url(#sh)" opacity=".8"/>
  <path d="M 302 432 q -14 -132 98 -132 q 112 0 98 132" stroke="#111114" stroke-width="26" fill="none" stroke-linecap="round"/>
  <path d="M 302 432 q -14 -132 98 -132 q 112 0 98 132" stroke="#fff" stroke-opacity=".14" stroke-width="8" fill="none" stroke-linecap="round"/>
  <path d="M 252 448 h 296 l 26 330 q 4 44 -42 44 H 268 q -46 0 -42 -44 z" fill="url(#dk)"/>
  <path d="M 252 448 h 296 l 26 330 q 4 44 -42 44 H 268 q -46 0 -42 -44 z" fill="none" stroke="#fff" stroke-opacity=".16"/>
  <path d="M 264 584 q 136 -26 272 0" stroke="#000" stroke-opacity=".45" stroke-width="5" fill="none"/>
  <path d="M 264 578 q 136 -26 272 0" stroke="#fff" stroke-opacity=".16" stroke-width="3" fill="none"/>
  <rect x="354" y="462" width="92" height="16" rx="8" fill="url(#mt2)" opacity=".6"/>
  <rect x="378" y="640" width="44" height="34" rx="10" fill="${ACCENT}"/>
  <path d="M 272 756 q 128 -20 256 0" stroke="#fff" stroke-opacity=".28" stroke-width="3" stroke-dasharray="10 9" fill="none"/>`,
  });

const built = [
  ['halo-one', haloOne],
  ['halo-buds', haloBuds],
  ['monolith-s', monolithS],
  ['slate65', slate65],
  ['arc-mouse', arcMouse],
  ['lumen-desk', lumenDesk],
  ['dock-one', dockOne],
  ['meridian-watch', meridianWatch],
  ['atlas-pack', atlasPack],
  ['field-bottle', fieldBottle],
  ['prism-shades', prismShades],
  ['orbit-cam', orbitCam],
  ['drift-speaker', driftSpeaker],
  ['signal-amp', signalAmp],
  ['beam-bar', beamBar],
  ['contour-mat', contourMat],
  ['cairn-wallet', cairnWallet],
  ['atlas-tote', atlasTote],
];

let total = 0;
for (const [id, fn] of built) {
  total += fn();
  console.log(`rendered ${id}.svg`);
}
console.log(`${built.length} renders, ${total} bytes`);
