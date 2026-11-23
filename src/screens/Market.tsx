import { motion } from 'framer-motion';
import { useCallback, useEffect, useState } from 'react';
import { RARITIES, RARITY, type RarityId } from '../config/game';
import { VARIANT_BY_ID } from '../data/catalog';
import type { Listing } from '../engine/types';
import { Card } from '../components/Card';
import { OnlineOnly, useOnline } from '../components/OnlineOnly';
import { sfx } from '../lib/fx';
import { useGame } from '../store/game';

export function Market() {
  const api = useOnline();
  const profile = useGame((s) => s.profile)!;
  const toast = useGame((s) => s.toast);
  const refresh = useGame((s) => s.refresh);
  const [tab, setTab] = useState<'buy' | 'mine'>('buy');
  const [rarity, setRarity] = useState<RarityId | null>(null);
  const [items, setItems] = useState<Listing[] | null>(null);

  const load = useCallback(async () => {
    if (!api) return;
    setItems(null);
    try { setItems(tab === 'buy' ? await api.listMarket({ rarity: rarity ?? undefined }) : await api.myListings()); }
    catch (e) { toast((e as Error).message, 'error'); setItems([]); }
  }, [api, tab, rarity, toast]);
  useEffect(() => { load(); }, [load]);

  if (!api) return <div className="wrap"><h1 className="h1">Marché</h1><OnlineOnly what="Le marché" /></div>;

  const act = async (fn: () => Promise<void>, ok: string) => {
    try { await fn(); sfx.coin(); toast(ok, 'success'); load(); refresh(); } catch (e) { sfx.error(); toast((e as Error).message, 'error'); }
  };

  return (
    <div className="wrap">
      <h1 className="h1">Marché</h1>
      <p className="sub">Achète et vends des cartes contre des éclats ✦. Pour vendre : ouvre une carte dans ta collection.</p>
      <div className="chips" style={{ marginTop: 14 }}>
        <button className={`chip ${tab === 'buy' ? 'on' : ''}`} onClick={() => setTab('buy')}>🛒 Acheter</button>
        <button className={`chip ${tab === 'mine' ? 'on' : ''}`} onClick={() => setTab('mine')}>🏷️ Mes ventes</button>
      </div>
      {tab === 'buy' && (
        <div className="chips">
          <button className={`chip ${!rarity ? 'on' : ''}`} onClick={() => setRarity(null)}>Toutes</button>
          {RARITIES.map((r) => <button key={r.id} className={`chip ${rarity === r.id ? 'on' : ''}`} style={{ '--c': r.color } as React.CSSProperties} onClick={() => setRarity(r.id)}>{r.label}</button>)}
        </div>
      )}
      {items === null ? <div className="empty">Chargement…</div> : !items.length ? (
        <div className="empty"><div className="big">🏪</div>{tab === 'buy' ? 'Aucune carte en vente.' : 'Tu ne vends rien pour l’instant.'}</div>
      ) : (
        <div className="grid" style={{ marginTop: 10 }}>
          {items.map((l, i) => {
            const v = VARIANT_BY_ID[l.card.variantId];
            const mine = l.sellerId === profile.id;
            return (
              <motion.div key={l.id} className="grid-item" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 16) * 0.03 }}>
                <Card variantId={l.card.variantId} serial={l.card.serial} />
                <div style={{ marginTop: 8, fontSize: 12, color: 'var(--muted)' }}>{v ? RARITY[v.rarity].label : ''} · {l.sellerName}</div>
                {mine ? (
                  <button className="btn ghost sm block" style={{ marginTop: 6 }} onClick={() => act(() => api.cancelListing(l.id), 'Vente retirée')}>Retirer · {l.price} ✦</button>
                ) : (
                  <button className="btn sm block" style={{ marginTop: 6 }} disabled={profile.shards < l.price} onClick={() => act(() => api.buyListing(l.id), '🎉 Carte achetée !')}>{l.price.toLocaleString('fr-FR')} ✦</button>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
