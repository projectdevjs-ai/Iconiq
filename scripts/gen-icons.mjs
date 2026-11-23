// Génère les icônes PNG de l'app à partir d'un SVG (via Chromium/Playwright).
import { writeFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright'); // NODE_PATH ou npm i -D playwright

const svg = (pad) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8b5cff"/><stop offset=".55" stop-color="#3b1d8f"/><stop offset="1" stop-color="#06050b"/></linearGradient>
<linearGradient id="h" x1="0" x2="1"><stop offset="0" stop-color="#22e1ff"/><stop offset=".5" stop-color="#fff"/><stop offset="1" stop-color="#ff3d9a"/></linearGradient></defs>
<rect width="512" height="512" rx="${pad ? 0 : 112}" fill="url(#g)"/>
<g transform="translate(256 262) rotate(-8) scale(${pad ? 0.72 : 1})">
<rect x="-118" y="-160" width="236" height="320" rx="22" fill="#0d0b17" stroke="url(#h)" stroke-width="12"/>
<path d="M0 -92 L22 -22 L94 -22 L36 20 L58 92 L0 48 L-58 92 L-36 20 L-94 -22 L-22 -22Z" fill="url(#h)"/>
</g></svg>`;
mkdirSync('public/icons', { recursive: true });
writeFileSync('public/icons/icon.svg', svg(false));
const b = await chromium.launch();
const p = await b.newPage();
for (const [name, size, pad] of [['icon-192.png', 192, false], ['icon-512.png', 512, false], ['icon-maskable-512.png', 512, true], ['apple-touch-icon.png', 180, true], ['badge.png', 96, true]]) {
  await p.setViewportSize({ width: size, height: size });
  await p.setContent(`<style>*{margin:0}body{background:transparent}</style>${svg(pad).replace('<svg ', `<svg width="${size}" height="${size}" `)}`);
  await p.screenshot({ path: `public/icons/${name}`, omitBackground: !pad });
}
await b.close();
console.log('Icônes générées.');
