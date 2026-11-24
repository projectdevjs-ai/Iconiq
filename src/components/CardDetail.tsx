import { AnimatePresence, motion } from 'framer-motion';
import { lazy, Suspense, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { RARITY } from '../config/game';
import { CHARACTER_BY_ID, VARIANT_BY_ID, isMysteryRarity } from '../data/catalog';
import type { OnlineFeatures } from '../engine/types';
import { shareCard } from '../lib/cardCanvas';
import { sfx } from '../lib/fx';
import { useGame } from '../store/game';
import { Card } from './Card';
import { Sheet } from './Shell';

const Card3D = lazy(() => import('./Card3D'));

export function CardDetail({ variantId, onClose }: { variantId: string | null; onClose(): void }) {
  return (
    <Sheet open={!!variantId} onClose={onClose}>
      {variantId && <DetailBody key={variantId} variantId={variantId} />}
    </Sheet>
  );
}

function DetailBody({ variantId: initial }: { variantId: string }) {
  const [variantId, setVariantId] = useState(initial);
  const cards = useGame((s) => s.cards);
  const profile = useGame((s) => s.profile)!;
  const backend = useGame((s) => s.backend)!;
  const recycleCard = useGame((s) => s.recycleCard);
  const craft = useGame((s) => s.craft);
  const toast = useGame((s) => s.toast);
  const refresh = useGame((s) => s.refresh);
  const [show3d, setShow3d] = useState(false);
  const [price, setPrice] = useState('');
  const v = VARIANT_BY_ID[variantId];
  const r = RARITY[v.rarity];
  const ch = CHARACTER_BY_ID[v.characterId];
  const copies = useMemo(
    () => cards.filter((c) => c.variantId === variantId).sort((a, b) => (a.serial ?? 1e9) - (b.serial ?? 1e9)),
    [cards, variantId],
  );
  const owned = copies.length > 0;
  const hidden = !owned && isMysteryRarity(v.rarity);
  const best = copies[0];
  const spare = copies.filter((c) => !c.locked).slice(owned ? 1 : 0).at(-1);
  const sellable = copies.filter((c) => !c.locked).at(-1);

  const doCraft = async () => {
    const c = await craft(variantId);
    if (c) { sfx.reveal(r.rank); toast(`✨ ${v.characterName} fabriqué !`, 'success'); }
  };
  const sell = async () => {
    const p = parseInt(price, 10);
    if (!sellable || !p) return;
    try {
      await (backend as unknown as OnlineFeatures).createListing(sellable.uid, p);
      sfx.coin(); toast('Mise en vente ✔', 'success'); setPrice(''); refresh();
    } catch (e) { sfx.error(); toast((e as Error).message, 'error'); }
  };

  return (
    <div>
      <div style={{ width: 'min(62vw, 270px)', margin: '4px auto 18px' }}>
        <Card variantId={variantId} serial={best?.serial} dim={!owned && !hidden} mystery={hidden} strength={22} />
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ color: r.color, fontWeight: 800, letterSpacing: '.15em', fontSize: 12, textTransform: 'uppercase' }}>{r.label}</div>
        <h2 className="h1" style={{ fontSize: 26, marginTop: 4 }}>{v.characterName}</h2>
        <p className="sub">{hidden ? '??? · Carte mystère' : v.title}</p>
        <p className="sub" style={{ marginTop: 10, fontStyle: 'italic' }}>{ch.bio}</p>
      </div>

      <div className="wrap-row" style={{ justifyContent: 'center', marginTop: 18 }}>
        {!hidden && <button className="btn sm" onClick={() => { sfx.tap(); setShow3d(true); }}>🧊 Vue 3D</button>}
        {owned && !import.meta.env.VITE_EMBED && <button className="btn ghost sm" onClick={() => shareCard(variantId, best.serial)}>📤 Partager</button>}
        {spare && <button className="btn ghost sm" onClick={() => recycleCard(spare.uid)}>♻️ Recycler 1 double (+{r.recycle} ✦)</button>}
        <button className="btn ghost sm" disabled={profile.shards < r.craft} onClick={doCraft}>⚒️ Fabriquer ({r.craft.toLocaleString('fr-FR')} ✦)</button>
      </div>

      {owned && (
        <p className="sub" style={{ textAlign: 'center', marginTop: 14 }}>
          Possédée ×{copies.length}
          {copies.some((c) => c.serial != null) && ' · N° ' + copies.map((c) => c.serial).filter((s) => s != null).join(', ')}
          {copies.some((c) => c.locked) && ' · 🔒 en échange/vente'}
        </p>
      )}

      {backend.mode === 'online' && sellable && (
        <div className="glass" style={{ padding: 14, marginTop: 16 }}>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>⚖️ Vendre sur le marché</div>
          <div className="row">
            <input className="field" inputMode="numeric" placeholder="Prix en éclats ✦" value={price} onChange={(e) => setPrice(e.target.value.replace(/\D/g, ''))} />
            <button className="btn" onClick={sell} disabled={!price}>Vendre</button>
          </div>
          <p className="sub" style={{ fontSize: 12, marginTop: 6 }}>Commission de 5 % prélevée à la vente. Les éclats ne s'achètent pas avec de l'argent réel.</p>
        </div>
      )}

      <h3 className="h2">Toutes les versions de {ch.name}</h3>
      <div className="chips" style={{ gap: 12 }}>
        {ch.variants.map((x) => {
          const has = cards.some((c) => c.variantId === x.id);
          return (
            <button key={x.id} onClick={() => { sfx.tap(); setVariantId(x.id); }} style={{ width: 92, flex: 'none', outline: x.id === variantId ? `2px solid ${RARITY[x.rarity].color}` : 'none', borderRadius: 8 }}>
              <Card variantId={x.id} dim={!has && !isMysteryRarity(x.rarity)} mystery={!has && isMysteryRarity(x.rarity)} interactive={false} />
            </button>
          );
        })}
      </div>

      {createPortal(<AnimatePresence>
        {show3d && (
          <motion.div className="overlay" style={{ zIndex: 130 }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Suspense fallback={<div className="empty">Chargement 3D…</div>}>
              <Card3D variantId={variantId} serial={best?.serial ?? null} />
            </Suspense>
            <div style={{ position: 'absolute', bottom: 'calc(var(--safe-bottom) + 24px)', left: 0, right: 0, textAlign: 'center' }}>
              <p className="sub" style={{ marginBottom: 12 }}>Fais tourner avec le doigt · pince pour zoomer</p>
              <button className="btn ghost" onClick={() => setShow3d(false)}>Fermer</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>, document.body)}
    </div>
  );
}
