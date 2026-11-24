import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import { RARITIES } from '../config/game';
import { VARIANTS } from '../data/catalog';
import { sfx } from '../lib/fx';
import { PackArt } from './BoosterPack';
import { Card } from './Card';

export const introSeen = () => { try { return localStorage.getItem('iconiq-intro') === '1'; } catch { return true; } };

const pickBy = (r: string) => VARIANTS.find((v) => v.rarity === r && v.fullCard) ?? VARIANTS.find((v) => v.rarity === r)!;

/** Introduction au premier lancement (3 écrans). */
export function Intro({ onDone }: { onDone(): void }) {
  const [step, setStep] = useState(0);
  const done = () => { try { localStorage.setItem('iconiq-intro', '1'); } catch { /* */ } sfx.reveal(3); onDone(); };
  const slides = [
    {
      title: 'Un booster gratuit chaque jour',
      text: 'Découpe-le du bout du doigt. La lumière qui s’échappe trahit parfois une carte rare…',
      art: (
        <motion.div style={{ width: 150 }} animate={{ rotate: [-4, 4, -4], y: [0, -8, 0] }} transition={{ duration: 3, repeat: Infinity }}>
          <div className="tcg" style={{ aspectRatio: '5/7' }}><PackArt name="Du jour" accent="#ff3d9a" /></div>
        </motion.div>
      ),
    },
    {
      title: '7 raretés, jusqu’à la Secrète',
      text: 'Commune, Rare, Épique, Légendaire, Mythique numérotée… et la Secrète : 0,05 % de chance.',
      art: (
        <div style={{ position: 'relative', width: 280, height: 200 }}>
          {['commune', 'rare', 'legendaire', 'mythique', 'secrete'].map((r, i) => (
            <motion.div key={r} style={{ position: 'absolute', left: '50%', top: 0, width: 100, marginLeft: -50, transformOrigin: '50% 160%' }}
              initial={{ rotate: 0, opacity: 0 }} animate={{ rotate: (i - 2) * 14, opacity: 1 }} transition={{ delay: 0.1 + i * 0.08, type: 'spring' }}>
              <Card variantId={pickBy(r).id} interactive={false} />
            </motion.div>
          ))}
        </div>
      ),
    },
    {
      title: 'Recycle, complète, collectionne',
      text: 'Tes doubles deviennent des éclats ✦ pour fabriquer les cartes qui te manquent. Défis du jour, roue, succès et album te récompensent.',
      art: (
        <div className="wrap-row" style={{ justifyContent: 'center', fontSize: 44, gap: 18 }}>
          {['♻️', '🎡', '🏅', '📖'].map((e, i) => (
            <motion.span key={e} initial={{ scale: 0 }} animate={{ scale: [0, 1.3, 1] }} transition={{ delay: 0.1 + i * 0.12 }}>{e}</motion.span>
          ))}
        </div>
      ),
    },
  ];
  const s = slides[step];
  return (
    <motion.div className="intro" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <button className="intro-skip sub" onClick={done}>Passer</button>
      <AnimatePresence mode="wait">
        <motion.div key={step} className="intro-slide" initial={{ x: 60, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -60, opacity: 0 }} transition={{ duration: 0.35 }}>
          <div className="intro-art">{s.art}</div>
          <h2 className="h1" style={{ textAlign: 'center', fontSize: 28 }}>{s.title}</h2>
          <p className="sub" style={{ textAlign: 'center', maxWidth: 340 }}>{s.text}</p>
        </motion.div>
      </AnimatePresence>
      <div className="dots" style={{ justifyContent: 'center', margin: '20px 0' }}>{slides.map((_, i) => <i key={i} className={i === step ? 'on' : ''} />)}</div>
      <button className="btn block" style={{ maxWidth: 360 }} onClick={() => { sfx.tap(); step < slides.length - 1 ? setStep(step + 1) : done(); }}>
        {step < slides.length - 1 ? 'Suivant' : 'C’est parti !'}
      </button>
      <p className="sub" style={{ fontSize: 11, marginTop: 14, opacity: .7 }}>{RARITIES.length} raretés · aucune carte réservée aux achats</p>
    </motion.div>
  );
}

/** Écran de chargement animé. */
export function Splash() {
  return (
    <div className="splash">
      <div className="splash-logo">
        {'ICONIQ'.split('').map((l, i) => <span key={i} style={{ animationDelay: `${i * 0.08}s` }}>{l}</span>)}
      </div>
      <div className="splash-bar"><i /></div>
    </div>
  );
}
