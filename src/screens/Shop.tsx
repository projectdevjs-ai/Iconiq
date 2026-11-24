import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { GEM_BUNDLES, PACKS, PITY } from '../config/game';
import { PackRow } from '../components/PackRow';
import { displayedOdds } from '../engine/rules';
import type { OnlineFeatures } from '../engine/types';
import { sfx } from '../lib/fx';
import { useGame } from '../store/game';

const eur = (c: number) => (c / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });

export function Shop() {
  const profile = useGame((s) => s.profile)!;
  const backend = useGame((s) => s.backend)!;
  const begin = useGame((s) => s.beginOpening);
  const busy = useGame((s) => s.busy);
  const toast = useGame((s) => s.toast);
  const refresh = useGame((s) => s.refresh);
  const [paying, setPaying] = useState<string | null>(null);
  const online = backend.mode === 'online';

  useEffect(() => {
    const p = new URLSearchParams(location.search);
    if (p.get('paid')) {
      toast('💎 Paiement reçu ! Tes gemmes arrivent dans quelques secondes.', 'success');
      setTimeout(refresh, 2500);
      history.replaceState(null, '', '/shop');
    } else if (p.get('cancel')) {
      toast('Paiement annulé.');
      history.replaceState(null, '', '/shop');
    }
  }, [toast, refresh]);

  const buy = async (id: string) => {
    setPaying(id);
    try {
      const url = await (backend as unknown as OnlineFeatures).checkout(id);
      location.href = url;
    } catch (e) {
      sfx.error(); toast((e as Error).message, 'error'); setPaying(null);
    }
  };

  return (
    <div className="wrap">
      <h1 className="h1">Boutique</h1>
      <div className="glass" style={{ padding: 14, marginTop: 10, borderColor: 'rgba(61,220,151,.4)', display: 'flex', gap: 12, alignItems: 'center' }}>
        <span style={{ fontSize: 26 }}>⚖️</span>
        <p className="sub" style={{ fontSize: 13 }}>
          <b style={{ color: '#fff' }}>Jeu équitable :</b> aucune carte n’est réservée aux joueurs qui paient. Les packs achetés en gemmes ont <b style={{ color: '#fff' }}>exactement les mêmes chances</b> que les packs gratuits. Payer fait seulement gagner du temps.
        </p>
      </div>

      <h2 className="h2">🎴 Packs</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
        {PACKS.map((p) => <PackRow key={p.id + 'c'} pack={p} currency="credits" />)}
        {online && PACKS.map((p) => <PackRow key={p.id + 'g'} pack={p} currency="gems" />)}
      </div>

      <h2 className="h2">💎 Gemmes</h2>
      {!online ? (
        <p className="sub">Les achats sont disponibles uniquement en mode en ligne.</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
          {GEM_BUNDLES.map((b, i) => (
            <motion.button key={b.id} className="glass" whileTap={{ scale: 0.96 }} disabled={!!paying} onClick={() => buy(b.id)}
              style={{ padding: 16, textAlign: 'center', position: 'relative', overflow: 'hidden' }}
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}>
              {'badge' in b && b.badge && <span style={{ position: 'absolute', top: 8, right: 8, fontSize: 11, fontWeight: 800, padding: '3px 7px', borderRadius: 8, background: 'var(--accent-3)' }}>{b.badge}</span>}
              <div style={{ fontSize: 30 + i * 6, filter: 'drop-shadow(0 0 14px #ff6bd6)' }}>💎</div>
              <div className="num" style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22, marginTop: 6 }}>{b.gems.toLocaleString('fr-FR')}</div>
              <div className="sub" style={{ fontSize: 12 }}>{b.label}</div>
              <div className="btn sm" style={{ marginTop: 10, width: '100%' }}>{paying === b.id ? '…' : eur(b.priceCents)}</div>
            </motion.button>
          ))}
        </div>
      )}

      <h2 className="h2">📊 Probabilités (transparence)</h2>
      <div className="glass" style={{ padding: 16 }}>
        {displayedOdds().map(({ rarity, pct }) => (
          <div key={rarity.id} className="row" style={{ justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--stroke)' }}>
            <span style={{ color: rarity.color, fontWeight: 800 }}>{rarity.label}</span>
            <span className="num" style={{ fontWeight: 700 }}>{pct < 0.1 ? pct.toFixed(3) : pct.toFixed(2)} %</span>
          </div>
        ))}
        <p className="sub" style={{ fontSize: 12, marginTop: 10 }}>
          Par carte (hors dernière carte du pack, dont la rareté minimum est garantie). Garanties : une Épique ou mieux au moins tous les {PITY.epicEvery} packs, une Légendaire ou mieux au moins tous les {PITY.legendaryEvery} packs. Tous les tirages sont faits sur le serveur.
        </p>
      </div>
    </div>
  );
}
