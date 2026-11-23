import { motion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import { PACKS, PITY, RARITY } from '../config/game';
import { VARIANTS, VARIANT_BY_ID } from '../data/catalog';
import { dailyCredits, dailyStatus } from '../engine/rules';
import { PackArt } from '../components/BoosterPack';
import { Card } from '../components/Card';
import { sfx } from '../lib/fx';
import { useTilt } from '../lib/tilt';
import { useGame } from '../store/game';

function fmt(ms: number) {
  const s = Math.ceil(ms / 1000);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
  return [h, m, x].map((n) => String(n).padStart(2, '0')).join(':');
}

function useNow(period = 1000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), period); return () => clearInterval(t); }, [period]);
  return now;
}

function Ring({ pct, children }: { pct: number; children: React.ReactNode }) {
  const R = 52, C = 2 * Math.PI * R;
  return (
    <div style={{ position: 'relative', width: 124, height: 124, display: 'grid', placeItems: 'center' }}>
      <svg width="124" height="124" style={{ position: 'absolute', transform: 'rotate(-90deg)' }}>
        <defs><linearGradient id="rg" x1="0" x2="1"><stop offset="0" stopColor="#8b5cff" /><stop offset="1" stopColor="#22e1ff" /></linearGradient></defs>
        <circle cx="62" cy="62" r={R} stroke="rgba(255,255,255,.08)" strokeWidth="8" fill="none" />
        <circle cx="62" cy="62" r={R} stroke="url(#rg)" strokeWidth="8" fill="none" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - pct)} style={{ transition: 'stroke-dashoffset 1s linear', filter: 'drop-shadow(0 0 6px #8b5cff)' }} />
      </svg>
      {children}
    </div>
  );
}

export function Home() {
  const profile = useGame((s) => s.profile)!;
  const cards = useGame((s) => s.cards);
  const begin = useGame((s) => s.beginOpening);
  const go = useGame((s) => s.go);
  const busy = useGame((s) => s.busy);
  const now = useNow();
  const daily = dailyStatus(profile.lastDailyAt, now);
  const packRef = useRef<HTMLDivElement>(null);
  useTilt(packRef, true, 14);

  const uniq = useMemo(() => new Set(cards.map((c) => c.variantId)), [cards]);
  const best = useMemo(() => {
    const seen = new Set<string>();
    return [...cards]
      .sort((a, b) => RARITY[VARIANT_BY_ID[b.variantId].rarity].rank - RARITY[VARIANT_BY_ID[a.variantId].rarity].rank)
      .filter((c) => (seen.has(c.variantId) ? false : (seen.add(c.variantId), true)))
      .slice(0, 3);
  }, [cards]);
  const dupes = cards.length - uniq.size;
  const pct = uniq.size / VARIANTS.length;
  const cooldown = 20 * 3600_000;
  const nextStreak = daily.ready ? profile.streak + 1 : profile.streak;

  return (
    <div className="wrap">
      <motion.p className="sub" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>Salut {profile.username} 👋</motion.p>
      <motion.h1 className="h1" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        Qui vas-tu<br />tirer aujourd’hui ?
      </motion.h1>

      {/* Booster quotidien */}
      <motion.section className="glass" style={{ marginTop: 20, padding: 18, display: 'flex', gap: 18, alignItems: 'center', overflow: 'hidden', position: 'relative' }}
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <motion.div animate={{ y: [0, -6, 0], rotate: [-3, -1, -3] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }} style={{ width: 'min(32vw, 150px)', flex: 'none' }}>
          <div ref={packRef} className="tcg" style={{ aspectRatio: '5/7' }}>
            <PackArt name="Du jour" accent={daily.ready ? '#ff3d9a' : '#3a3550'} />
          </div>
        </motion.div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18 }}>Booster du jour</div>
          <p className="sub" style={{ fontSize: 13, margin: '4px 0 10px' }}>
            🔥 Série : <b style={{ color: '#fff' }}>{profile.streak} jour{profile.streak > 1 ? 's' : ''}</b><br />
            +{dailyCredits(Math.max(1, nextStreak))} 🪙 bonus inclus
          </p>
          {daily.ready ? (
            <button className="btn gold block" disabled={busy} onClick={() => { sfx.tap(); begin('standard', 'daily'); }}>✂️ Découper</button>
          ) : (
            <Ring pct={1 - daily.msLeft / cooldown}>
              <div style={{ textAlign: 'center' }}>
                <div className="num" style={{ fontWeight: 800, fontSize: 16 }}>{fmt(daily.msLeft)}</div>
                <div style={{ fontSize: 10, color: 'var(--muted)' }}>prochain</div>
              </div>
            </Ring>
          )}
        </div>
      </motion.section>

      {/* Garanties */}
      <div className="row" style={{ marginTop: 12 }}>
        <div className="glass" style={{ flex: 1, padding: 12 }}>
          <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700 }}>ÉPIQUE GARANTIE</div>
          <div className="bar" style={{ marginTop: 8 }}><i style={{ width: `${(profile.pityEpic / PITY.epicEvery) * 100}%`, background: RARITY.epique.color }} /></div>
          <div style={{ fontSize: 12, marginTop: 6 }}>dans <b>{PITY.epicEvery - profile.pityEpic}</b> pack(s)</div>
        </div>
        <div className="glass" style={{ flex: 1, padding: 12 }}>
          <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700 }}>LÉGENDAIRE GARANTIE</div>
          <div className="bar" style={{ marginTop: 8 }}><i style={{ width: `${(profile.pityLegend / PITY.legendaryEvery) * 100}%`, background: RARITY.legendaire.color }} /></div>
          <div style={{ fontSize: 12, marginTop: 6 }}>dans <b>{PITY.legendaryEvery - profile.pityLegend}</b> pack(s)</div>
        </div>
      </div>

      {/* Packs */}
      <h2 className="h2">🎴 Ouvrir un pack</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
        {PACKS.map((p) => (
          <motion.button key={p.id} whileTap={{ scale: 0.97 }} className="glass" disabled={busy || p.costCredits == null || profile.credits < p.costCredits}
            onClick={() => { sfx.tap(); begin(p.id, 'credits'); }}
            style={{ padding: 14, display: 'flex', gap: 14, alignItems: 'center', textAlign: 'left', opacity: profile.credits < (p.costCredits ?? Infinity) ? 0.5 : 1 }}>
            <div style={{ width: 62, flex: 'none' }}><div className="tcg" style={{ aspectRatio: '5/7' }}><PackArt name="" accent={p.accent} /></div></div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800 }}>{p.name}</div>
              <div className="sub" style={{ fontSize: 12 }}>{p.description}</div>
              <div className="pill" style={{ marginTop: 8, height: 28, color: 'var(--gold)' }}>🪙 <span style={{ color: '#fff' }}>{p.costCredits}</span></div>
            </div>
          </motion.button>
        ))}
      </div>

      {/* Collection */}
      <h2 className="h2">📚 Ta collection</h2>
      <button className="glass" style={{ padding: 16, width: '100%', textAlign: 'left' }} onClick={() => { sfx.tap(); go('collection'); }}>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <b className="num">{uniq.size} / {VARIANTS.length} cartes</b>
          <span className="num" style={{ color: 'var(--accent-2)', fontWeight: 800 }}>{Math.round(pct * 100)}%</span>
        </div>
        <div className="bar" style={{ marginTop: 10 }}><i style={{ width: `${pct * 100}%` }} /></div>
        {dupes > 0 && <p className="sub" style={{ fontSize: 12, marginTop: 10 }}>♻️ {dupes} double{dupes > 1 ? 's' : ''} à recycler en éclats</p>}
      </button>

      {best.length > 0 && (
        <>
          <h2 className="h2">🏆 Tes plus belles</h2>
          <div style={{ display: 'flex', justifyContent: 'center', height: 'min(64vw, 300px)', position: 'relative' }}>
            {best.map((c, i) => {
              const off = i - (best.length - 1) / 2;
              return (
                <motion.div key={c.uid} initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: Math.abs(off) * 14, rotate: off * 9 }} transition={{ delay: 0.2 + i * 0.08, type: 'spring' }}
                  style={{ position: 'absolute', width: 'min(38vw, 180px)', left: `calc(50% - min(19vw, 90px) + ${off} * min(26vw, 130px))`, zIndex: i === 1 ? 2 : 1, transformOrigin: '50% 120%' }}>
                  <Card variantId={c.variantId} serial={c.serial} onClick={() => go('collection', c.variantId)} />
                </motion.div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
