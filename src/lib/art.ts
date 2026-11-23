import { RARITY } from '../config/game';
import type { FlatVariant } from '../data/catalog';

/** Illustration temporaire générée (SVG) tant qu'aucune image n'est fournie. */
const cache = new Map<string, string>();

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

export function cardImage(v: FlatVariant): string {
  if (v.image) return v.image;
  const hit = cache.get(v.id);
  if (hit) return hit;
  const r = RARITY[v.rarity];
  const h = hash(v.characterId);
  const hue = h % 360;
  const hue2 = (hue + 40 + (h >> 8) % 80) % 360;
  const initials = v.characterName.replace(/^(Le |La |L’|Les |DJ |Monsieur le |Mamie )/i, '').slice(0, 2).toUpperCase();
  const rays = r.rank >= 3
    ? Array.from({ length: 24 }, (_, i) => `<path d="M375 470 L${375 + Math.cos(i / 24 * Math.PI * 2) * 900} ${470 + Math.sin(i / 24 * Math.PI * 2) * 900} L${375 + Math.cos((i + 0.4) / 24 * Math.PI * 2) * 900} ${470 + Math.sin((i + 0.4) / 24 * Math.PI * 2) * 900}Z" fill="${r.glow}" opacity="0.08"/>`).join('')
    : '';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 750 1050">
<defs>
<linearGradient id="b" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${hue} 70% 22%)"/><stop offset="1" stop-color="hsl(${hue2} 75% 10%)"/></linearGradient>
<radialGradient id="g" cx=".5" cy=".42" r=".55"><stop offset="0" stop-color="hsl(${hue} 90% 65%)" stop-opacity=".9"/><stop offset="1" stop-color="hsl(${hue} 90% 40%)" stop-opacity="0"/></radialGradient>
<linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="hsl(${hue2} 30% 92%)"/><stop offset="1" stop-color="hsl(${hue2} 40% 55%)"/></linearGradient>
</defs>
<rect width="750" height="1050" fill="url(#b)"/>${rays}
<circle cx="375" cy="470" r="380" fill="url(#g)"/>
<g opacity=".12" stroke="#fff" fill="none">${Array.from({ length: 9 }, (_, i) => `<circle cx="375" cy="470" r="${60 + i * 55}"/>`).join('')}</g>
<circle cx="375" cy="380" r="135" fill="url(#s)"/>
<path d="M140 1050 C150 760 260 600 375 600 C490 600 600 760 610 1050Z" fill="url(#s)"/>
<text x="375" y="425" font-family="system-ui,sans-serif" font-weight="900" font-size="120" text-anchor="middle" fill="hsl(${hue} 60% 25%)">${initials}</text>
</svg>`;
  const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  cache.set(v.id, url);
  return url;
}
