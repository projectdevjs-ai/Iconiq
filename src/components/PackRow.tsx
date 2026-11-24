import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { MULTI_OPEN, type PackType } from '../config/game';
import { packAvailable } from '../engine/rules';
import { sfx } from '../lib/fx';
import { useGame } from '../store/game';
import { PackArt } from './BoosterPack';

function left(ms: number) {
  const d = Math.floor(ms / 86400000), h = Math.floor((ms % 86400000) / 3600000), m = Math.floor((ms % 3600000) / 60000);
  return d ? `${d} j ${h} h` : `${h} h ${String(m).padStart(2, '0')}`;
}

/** Un pack achetable, avec ouverture ×1 / ×5 / ×10. */
export function PackRow({ pack, currency }: { pack: PackType; currency: 'credits' | 'gems' }) {
  const profile = useGame((s) => s.profile)!;
  const busy = useGame((s) => s.busy);
  const begin = useGame((s) => s.beginOpening);
  const [now, setNow] = useState(Date.now());
  useEffect(() => { if (!pack.endsAt) return; const t = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(t); }, [pack.endsAt]);
  if (!packAvailable(pack, now)) return null;
  const cost = currency === 'credits' ? pack.costCredits : pack.costGems;
  if (cost == null) return null;
  const bal = currency === 'credits' ? profile.credits : profile.gems;
  const icon = currency === 'credits' ? '🪙' : '💎';
  return (
    <motion.div className={`glass pack-row ${pack.endsAt ? 'event' : ''}`} style={{ '--pa': pack.accent } as any} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <motion.div style={{ width: 70, flex: 'none' }} whileHover={{ rotate: -4, scale: 1.05 }}>
        <div className="tcg" style={{ aspectRatio: '5/7' }}><PackArt name="" accent={pack.accent} characters={pack.characters} /></div>
      </motion.div>
      <div style={{ flex: 1, minWidth: 0, display: 'grid', gap: 6 }}>
        <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
          <b>{pack.name}</b>
          {pack.badge && <span className="event-badge">{pack.badge}</span>}
        </div>
        <div className="sub" style={{ fontSize: 12 }}>{pack.description}</div>
        {pack.endsAt && <div style={{ fontSize: 11, color: pack.accent, fontWeight: 800 }}>⏳ Encore {left(new Date(pack.endsAt).getTime() - now)}</div>}
        <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
          {MULTI_OPEN.map((n) => (
            <button key={n} className={`btn sm ${n === 1 ? (currency === 'credits' ? 'gold' : '') : 'ghost'}`} disabled={busy || bal < cost * n}
              onClick={() => { sfx.tap(); begin(pack.id, currency, n); }}>
              {n > 1 && <b>×{n}</b>} {icon} {(cost * n).toLocaleString('fr-FR')}
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
