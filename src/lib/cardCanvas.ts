import { RARITY } from '../config/game';
import { VARIANT_BY_ID } from '../data/catalog';
import { cardImage } from './art';

function loadImg(src: string) {
  return new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    i.crossOrigin = 'anonymous';
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = src;
  });
}

/** Dessine la carte complète dans un canvas (texture 3D + partage). */
export async function drawCard(variantId: string, serial: number | null) {
  const v = VARIANT_BY_ID[variantId];
  const r = RARITY[v.rarity];
  const c = document.createElement('canvas');
  c.width = 750; c.height = 1125;
  const g = c.getContext('2d')!;
  const img = await loadImg(cardImage(v));
  const s = Math.max(750 / img.width, 1125 / img.height);
  g.drawImage(img, (750 - img.width * s) / 2, (1125 - img.height * s) / 2, img.width * s, img.height * s);
  if (v.fullCard) {
    if (serial != null) {
      g.font = '800 34px Unbounded, system-ui, sans-serif'; g.textAlign = 'center';
      g.fillStyle = 'rgba(0,0,0,.7)'; g.fillRect(300, 1068, 150, 46);
      g.fillStyle = r.glow; g.fillText(`#${serial}`, 375, 1104);
    }
    return c;
  }
  let grad = g.createLinearGradient(0, 1125, 0, 635);
  grad.addColorStop(0, 'rgba(0,0,0,.92)'); grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad; g.fillRect(0, 635, 750, 490);
  grad = g.createLinearGradient(0, 0, 0, 200);
  grad.addColorStop(0, 'rgba(0,0,0,.5)'); grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad; g.fillRect(0, 0, 750, 200);
  g.strokeStyle = r.color; g.lineWidth = 14; g.strokeRect(7, 7, 736, 1111);
  const font = (w: number, sz: number) => `${w} ${sz}px Unbounded, system-ui, sans-serif`;
  g.font = font(800, 34); g.fillStyle = '#fff'; g.shadowColor = r.glow; g.shadowBlur = 16;
  g.fillText(r.label.toUpperCase(), 44, 76);
  if (serial != null) { g.textAlign = 'right'; g.fillText(`#${serial}`, 706, 76); g.textAlign = 'left'; }
  g.shadowColor = 'rgba(0,0,0,.8)'; g.shadowBlur = 20;
  g.font = font(800, 62); g.fillText(v.characterName, 44, 995, 662);
  g.font = font(600, 36); g.fillStyle = r.glow; g.fillText(v.title, 44, 1047, 662);
  g.shadowBlur = 0;
  for (let i = 0; i <= r.rank; i++) {
    g.save(); g.translate(56 + i * 34, 1083); g.rotate(Math.PI / 4); g.fillStyle = r.color; g.fillRect(-9, -9, 18, 18); g.restore();
  }
  return c;
}


/** Partage l'image de la carte (Web Share API, sinon téléchargement). */
export async function shareCard(variantId: string, serial: number | null) {
  const c = await drawCard(variantId, serial);
  const blob = await new Promise<Blob>((r) => c.toBlob((b) => r(b!), 'image/png'));
  const v = VARIANT_BY_ID[variantId];
  const file = new File([blob], `iconiq-${variantId}.png`, { type: 'image/png' });
  const text = `J'ai eu ${v.characterName} — ${v.title} (${RARITY[v.rarity].label}) sur ICONIQ ✨`;
  if (navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], text }); return; } catch { return; }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = file.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
