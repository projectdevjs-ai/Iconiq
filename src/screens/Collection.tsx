import { motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import { RARITIES, RARITY, type RarityId } from '../config/game';
import { CHARACTERS, VARIANTS, VARIANT_BY_ID } from '../data/catalog';
import { Card } from '../components/Card';
import { CardDetail } from '../components/CardDetail';
import { Sheet } from '../components/Shell';
import { sfx } from '../lib/fx';
import { useGame } from '../store/game';

type Own = 'all' | 'owned' | 'missing' | 'dupes';

export function Collection() {
  const cards = useGame((s) => s.cards);
  const param = useGame((s) => s.routeParam);
  const go = useGame((s) => s.go);
  const recycleDuplicates = useGame((s) => s.recycleDuplicates);
  const toast = useGame((s) => s.toast);
  const [rarity, setRarity] = useState<RarityId | null>(null);
  const [own, setOwn] = useState<Own>('all');
  const [char, setChar] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [recycleOpen, setRecycleOpen] = useState(false);
  const [maxR, setMaxR] = useState<RarityId>('rare');

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of cards) m.set(c.variantId, (m.get(c.variantId) ?? 0) + 1);
    return m;
  }, [cards]);
  const serialOf = useMemo(() => {
    const m = new Map<string, number | null>();
    for (const c of cards) if (c.serial != null && (m.get(c.variantId) ?? Infinity) > c.serial) m.set(c.variantId, c.serial);
    return m;
  }, [cards]);

  const list = VARIANTS.filter((v) => {
    const n = counts.get(v.id) ?? 0;
    if (rarity && v.rarity !== rarity) return false;
    if (char && v.characterId !== char) return false;
    if (own === 'owned' && !n) return false;
    if (own === 'missing' && n) return false;
    if (own === 'dupes' && n < 2) return false;
    if (q && !(v.characterName + ' ' + v.title).toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  }).sort((a, b) => RARITY[b.rarity].rank - RARITY[a.rarity].rank || a.characterName.localeCompare(b.characterName));

  const preview = useMemo(() => {
    let n = 0, gain = 0;
    const lockedPer = new Map<string, number>();
    for (const c of cards) if (!c.locked) lockedPer.set(c.variantId, (lockedPer.get(c.variantId) ?? 0) + 1);
    for (const [vid, total] of counts) {
      const r = RARITY[VARIANT_BY_ID[vid].rarity];
      if (r.rank > RARITY[maxR].rank) continue;
      const free = Math.min(total - 1, lockedPer.get(vid) ?? 0);
      if (free > 0) { n += free; gain += free * r.recycle; }
    }
    return { n, gain };
  }, [cards, counts, maxR]);

  const owned = counts.size;
  const doRecycle = async () => {
    const g = await recycleDuplicates(maxR);
    setRecycleOpen(false);
    if (g > 0) { sfx.recycle(); setTimeout(sfx.coin, 300); toast(`♻️ +${g.toLocaleString('fr-FR')} éclats ✦`, 'success'); }
  };

  return (
    <div className="wrap">
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 className="h1">Collection</h1>
          <p className="sub num">{owned} / {VARIANTS.length} · {cards.length} cartes au total</p>
        </div>
        <button className="btn sm" onClick={() => { sfx.tap(); setRecycleOpen(true); }}>♻️ Recycler</button>
      </div>
      <div className="bar" style={{ margin: '14px 0 16px' }}><i style={{ width: `${(owned / VARIANTS.length) * 100}%` }} /></div>

      <input className="field" placeholder="🔎 Rechercher un personnage…" value={q} onChange={(e) => setQ(e.target.value)} style={{ marginBottom: 12, height: 44 }} />

      <div className="chips">
        {(['all', 'owned', 'missing', 'dupes'] as Own[]).map((o) => (
          <button key={o} className={`chip ${own === o ? 'on' : ''}`} onClick={() => { sfx.tap(); setOwn(o); }}>
            {{ all: 'Toutes', owned: 'Possédées', missing: 'Manquantes', dupes: 'Doubles' }[o]}
          </button>
        ))}
      </div>
      <div className="chips">
        <button className={`chip ${!rarity ? 'on' : ''}`} onClick={() => setRarity(null)}>Toutes raretés</button>
        {RARITIES.map((r) => (
          <button key={r.id} className={`chip ${rarity === r.id ? 'on' : ''}`} style={{ '--c': r.color } as React.CSSProperties} onClick={() => { sfx.tap(); setRarity(rarity === r.id ? null : r.id); }}>
            {r.label}
          </button>
        ))}
      </div>
      <div className="chips">
        <button className={`chip ${!char ? 'on' : ''}`} onClick={() => setChar(null)}>Tous</button>
        {CHARACTERS.map((c) => (
          <button key={c.id} className={`chip ${char === c.id ? 'on' : ''}`} onClick={() => { sfx.tap(); setChar(char === c.id ? null : c.id); }}>{c.name}</button>
        ))}
      </div>

      {list.length === 0 ? (
        <div className="empty"><div className="big">🃏</div>Aucune carte ici… pour l’instant.</div>
      ) : (
        <div className="grid" style={{ marginTop: 8 }}>
          {list.map((v, i) => {
            const n = counts.get(v.id) ?? 0;
            return (
              <motion.div key={v.id} className="grid-item" initial={{ opacity: 0, y: 16, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: Math.min(i, 20) * 0.02 }}>
                {n ? (
                  <Card variantId={v.id} serial={serialOf.get(v.id)} count={n} onClick={() => { sfx.tap(); go('collection', v.id); }} />
                ) : (
                  <button className="locked-card" style={{ width: '100%', borderColor: RARITY[v.rarity].color + '66' }} onClick={() => { sfx.tap(); go('collection', v.id); }}>
                    <span><b>?</b>{v.characterName}<br /><span style={{ color: RARITY[v.rarity].color }}>{RARITY[v.rarity].label}</span></span>
                  </button>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      <CardDetail variantId={param && VARIANT_BY_ID[param] ? param : null} onClose={() => go('collection')} />

      <Sheet open={recycleOpen} onClose={() => setRecycleOpen(false)}>
        <h2 className="h1" style={{ fontSize: 24 }}>♻️ Recycler les doubles</h2>
        <p className="sub">On garde toujours 1 exemplaire de chaque carte (celle avec le plus petit numéro). Les autres deviennent des éclats ✦ pour fabriquer les cartes qui te manquent.</p>
        <h3 className="h2" style={{ fontSize: 14 }}>Jusqu’à la rareté :</h3>
        <div className="wrap-row">
          {RARITIES.map((r) => (
            <button key={r.id} className={`chip ${maxR === r.id ? 'on' : ''}`} style={{ '--c': r.color } as React.CSSProperties} onClick={() => { sfx.tap(); setMaxR(r.id); }}>{r.label}</button>
          ))}
        </div>
        <div className="glass" style={{ padding: 16, marginTop: 18, textAlign: 'center' }}>
          <div className="sub">{preview.n} carte{preview.n > 1 ? 's' : ''} recyclée{preview.n > 1 ? 's' : ''}</div>
          <div className="num" style={{ fontFamily: 'var(--font-display)', fontSize: 34, fontWeight: 800, color: 'var(--accent-2)', textShadow: '0 0 20px var(--accent-2)' }}>+{preview.gain.toLocaleString('fr-FR')} ✦</div>
        </div>
        <button className="btn block" style={{ marginTop: 16 }} disabled={!preview.n} onClick={doRecycle}>Recycler maintenant</button>
        <table style={{ width: '100%', marginTop: 18, fontSize: 13, color: 'var(--muted)', borderSpacing: 0 }}>
          <tbody>
            {RARITIES.map((r) => (
              <tr key={r.id}><td style={{ color: r.color, padding: '4px 0', fontWeight: 700 }}>{r.label}</td><td>recycler +{r.recycle} ✦</td><td style={{ textAlign: 'right' }}>fabriquer {r.craft.toLocaleString('fr-FR')} ✦</td></tr>
            ))}
          </tbody>
        </table>
      </Sheet>
    </div>
  );
}
