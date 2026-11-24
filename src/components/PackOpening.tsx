import { AnimatePresence, motion, useAnimationControls } from 'framer-motion';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { PACKS, RARITIES, RARITY } from '../config/game';
const RARITIES_BY_RANK = Object.fromEntries(RARITIES.map((r) => [r.rank, r]));
import { VARIANT_BY_ID, cardRatio } from '../data/catalog';
import { sfx } from '../lib/fx';
import { useGame } from '../store/game';
import { BoosterPack } from './BoosterPack';
import { Card, CardBack } from './Card';
import { Particles, type ParticlesHandle } from './Particles';

type Phase = 'tear' | 'wait' | 'reveal' | 'summary';

export function PackOpening() {
  const live = useGame((s) => s.opening);
  const last = useRef(live);
  if (live) last.current = live; // garde l'état pendant l'animation de sortie
  const opening = last.current!;
  const finish = useGame((s) => s.finishOpening);
  const begin = useGame((s) => s.beginOpening);
  const profile = useGame((s) => s.profile);
  const particles = useRef<ParticlesHandle>(null);
  const [phase, setPhase] = useState<Phase>('tear');
  const [torn, setTorn] = useState(false);
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [flash, setFlash] = useState(0);
  const [shakeKey, setShakeKey] = useState(0);
  const cardCtl = useAnimationControls();
  const pack = PACKS.find((p) => p.id === (opening.currency === 'daily' ? 'standard' : opening.packId))!;
  const result = opening.result;
  const cards = result?.cards ?? [];
  const cur = cards[idx];
  const curRarity = cur ? RARITY[VARIANT_BY_ID[cur.variantId].rarity] : null;
  const rank = curRarity?.rank ?? 0;
  const isNew = (vid: string) => result?.newVariantIds.includes(vid);
  const best = Math.max(0, ...cards.map((c) => RARITY[VARIANT_BY_ID[c.variantId].rarity].rank));

  // pack déchiré + résultat serveur reçu → révélation
  useEffect(() => {
    if (torn && result) { setPhase('reveal'); sfx.whoosh(); }
    else if (torn) setPhase('wait');
  }, [torn, result]);

  // tension avant révélation d'une carte rare
  useEffect(() => {
    if (phase === 'reveal' && !flipped && rank >= 3) sfx.charge(rank);
  }, [phase, idx, flipped, rank]);

  const reveal = () => {
    if (!cur || flipped) return;
    setFlipped(true);
    sfx.flip();
    setTimeout(() => {
      sfx.reveal(rank);
      const c = curRarity!;
      const cx = innerWidth / 2, cy = innerHeight * 0.45;
      particles.current?.burst(cx, cy, [c.color, c.glow, '#fff'], 30 + rank * 30, 6 + rank * 2);
      if (rank >= 4) { setFlash((f) => f + 1); setShakeKey((k) => k + 1); particles.current?.confetti([c.color, c.glow, '#fff', '#22e1ff', '#ff3d9a'], 60 + rank * 30); }
      if (rank >= 6) setTimeout(() => particles.current?.confetti(['#ff0080', '#ffe600', '#00ff88', '#00cfff', '#7a00ff'], 200), 500);
    }, 260);
  };

  const next = async (dir = 1) => {
    if (!flipped) return reveal();
    sfx.whoosh();
    await cardCtl.start({ x: dir * innerWidth, rotate: dir * 25, opacity: 0, transition: { duration: 0.32, ease: [0.4, 0, 1, 1] } });
    if (idx + 1 >= cards.length) { setPhase('summary'); return; }
    setFlipped(false);
    setIdx(idx + 1);
    cardCtl.set({ x: 0, rotate: 0, opacity: 1 });
  };

  const again = () => {
    const p = PACKS.find((x) => x.id === opening.packId);
    if (!p || opening.currency === 'daily') return finish();
    const canPay = opening.currency === 'credits' ? (profile?.credits ?? 0) >= (p.costCredits ?? Infinity) : (profile?.gems ?? 0) >= (p.costGems ?? Infinity);
    if (!canPay) return finish();
    setPhase('tear'); setTorn(false); setIdx(0); setFlipped(false);
    begin(p.id, opening.currency);
  };

  // lumière qui fuit du sachet : trahit une Épique ou mieux
  const leak = best >= 3 ? RARITIES_BY_RANK[best].color : '#d8ecff';
  const glow = phase === 'reveal' && curRarity ? (flipped || rank >= 3 ? curRarity.color : '#8b5cff') : pack.accent;
  const canAgain = opening.currency !== 'daily';

  return (
    <motion.div className="opening" style={{ '--glow': glow } as any} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="opening-bg" />
      <div className={`rays ${phase === 'reveal' && flipped && rank >= 2 ? 'on' : ''}`} />
      <Particles ref={particles} />

      <div className="opening-top">
        {phase === 'reveal' ? <div className="dots">{cards.map((_, i) => <i key={i} className={i === idx ? 'on' : ''} />)}</div> : <span />}
        {phase === 'reveal' && <button className="btn ghost sm" onClick={() => { sfx.tap(); setPhase('summary'); }}>Tout révéler ⏭</button>}
        {phase === 'tear' && <button className="btn ghost sm" onClick={() => { if (result) { setTorn(true); } }} disabled={!result}>Ouverture auto</button>}
      </div>

      <div key={shakeKey} className={shakeKey ? 'screen-shake' : ''} style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {(phase === 'tear' || phase === 'wait') && (
          <motion.div initial={{ y: 200, scale: 0.6, rotate: -8, opacity: 0 }} animate={{ y: 0, scale: 1, rotate: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 160, damping: 16 }}>
            {!torn ? (
              <BoosterPack name={opening.currency === 'daily' ? 'Booster du jour' : pack.name} accent={pack.accent} glow={leak} particles={particles} onTorn={() => setTorn(true)} />
            ) : (
              <motion.div animate={{ scale: [1, 1.04, 1] }} transition={{ repeat: Infinity, duration: 0.8 }} style={{ width: 'min(70vw,300px)' }}>
                <CardBack />
              </motion.div>
            )}
          </motion.div>
        )}

        {phase === 'reveal' && cur && (
          <>
            <AnimatePresence>
              {flipped && rank >= 3 && (
                <motion.div key={'l' + idx} className="reveal-label" style={{ position: 'fixed' }} initial={{ opacity: 0, scale: 2.2, letterSpacing: '0.6em' }} animate={{ opacity: 1, scale: 1, letterSpacing: '0.12em' }} exit={{ opacity: 0 }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}>
                  {curRarity!.label}
                  {cur.serial != null && <div style={{ fontSize: '0.4em', marginTop: 6 }}>N° {cur.serial}</div>}
                </motion.div>
              )}
            </AnimatePresence>
            <div className="stage" style={{ '--ar': cardRatio(VARIANT_BY_ID[cur.variantId]) } as any}>
              {/* pile restante */}
              {cards.slice(idx + 1).map((_, i) => (
                <div key={i} style={{ position: 'absolute', inset: 0, transform: `translate(${(i + 1) * 4}px, ${(i + 1) * 6}px) rotate(${(i + 1) * 1.5}deg)`, zIndex: -i - 1, opacity: 0.7 - i * 0.12 }}>
                  <CardBack style={{ height: '100%', aspectRatio: 'auto' }} />
                </div>
              ))}
              <motion.div
                key={idx}
                animate={cardCtl}
                drag={flipped}
                dragSnapToOrigin
                dragElastic={0.6}
                onDragEnd={(_, info) => {
                  if (Math.abs(info.offset.x) > 90 || Math.abs(info.velocity.x) > 500) next(info.offset.x > 0 ? 1 : -1);
                }}
                onTap={() => next(1)}
                style={{ position: 'absolute', inset: 0, cursor: 'pointer' }}
                whileTap={{ scale: 0.97 }}
              >
                <motion.div initial={{ y: 260 }} animate={{ y: 0 }} transition={{ type: 'spring', stiffness: 200, damping: 20 }} style={{ position: 'absolute', inset: 0 }}>
                  {!flipped && rank >= 3 && <div className="back-glow" />}
                  <motion.div
                    className={`flipper ${!flipped && rank >= 3 ? 'charge' : ''}`}
                    animate={{ rotateY: flipped ? 180 : 0, scale: flipped && rank >= 4 ? [1, 1.12, 1] : 1 }}
                    transition={{ rotateY: { duration: 0.55, ease: [0.3, 1.4, 0.5, 1] }, scale: { duration: 0.7 } }}
                  >
                    <div className="face"><CardBack style={{ height: '100%', aspectRatio: 'auto' }} /></div>
                    <div className="face front">
                      <Card variantId={cur.variantId} serial={cur.serial} isNew={flipped && isNew(cur.variantId)} interactive={flipped} strength={22} />
                    </div>
                  </motion.div>
                </motion.div>
              </motion.div>
            </div>
            <div className="tap-hint">{flipped ? 'Glisse ou touche pour la suivante' : rank >= 3 ? '⚡ Quelque chose de puissant… touche pour révéler' : 'Touche pour révéler'}</div>
          </>
        )}
      </div>

      {phase === 'wait' && <div className="tap-hint">Connexion au serveur…</div>}

      {phase === 'summary' && result && (
        <motion.div className="summary" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <h2 className="h1" style={{ textAlign: 'center' }}>{best >= 5 ? '🌌 Tirage légendaire' : best >= 3 ? '🔥 Beau tirage !' : 'Ton tirage'}</h2>
          <p className="sub" style={{ textAlign: 'center', marginBottom: 20 }}>
            {result.newVariantIds.length ? `${result.newVariantIds.length} nouvelle${result.newVariantIds.length > 1 ? 's' : ''} carte${result.newVariantIds.length > 1 ? 's' : ''} dans ta collection` : 'Des doubles à recycler en éclats ♻️'}
          </p>
          <div className="summary-grid">
            {cards.map((c, i) => (
              <motion.div key={c.uid} initial={{ y: 40, opacity: 0, rotate: -6 }} animate={{ y: 0, opacity: 1, rotate: 0 }} transition={{ delay: i * 0.08, type: 'spring', stiffness: 200, damping: 18 }}>
                <Card variantId={c.variantId} serial={c.serial} isNew={isNew(c.variantId)} />
              </motion.div>
            ))}
          </div>
          <div className="row" style={{ marginTop: 26, justifyContent: 'center', flexWrap: 'wrap' }}>
            {canAgain && <button className="btn" onClick={again}>Ouvrir un autre</button>}
            <button className="btn ghost" onClick={() => { sfx.tap(); finish(); }}>Terminer</button>
          </div>
        </motion.div>
      )}

      <AnimatePresence>
        {flash > 0 && <motion.div key={flash} className="flash" initial={{ opacity: 0.9 }} animate={{ opacity: 0 }} transition={{ duration: 0.7 }} />}
      </AnimatePresence>
    </motion.div>
  );
}
