import { motion, useAnimationControls } from 'framer-motion';
import { useState } from 'react';
import { WHEEL, dayKey, rewardText } from '../engine/rewards';
import { sfx } from '../lib/fx';
import { useGame } from '../store/game';
import { Sheet } from './Shell';

const N = WHEEL.length;
const SEG = 360 / N;
const R = 140;

function arc(i: number) {
  const a0 = ((i * SEG - 90 - SEG / 2) * Math.PI) / 180, a1 = (((i + 1) * SEG - 90 - SEG / 2) * Math.PI) / 180;
  return `M0 0 L${R * Math.cos(a0)} ${R * Math.sin(a0)} A${R} ${R} 0 0 1 ${R * Math.cos(a1)} ${R * Math.sin(a1)} Z`;
}

/** Roue de la chance quotidienne : le tirage est fait par le serveur (ou le moteur local). */
export function WheelSheet({ open, onClose }: { open: boolean; onClose(): void }) {
  const profile = useGame((s) => s.profile)!;
  const spin = useGame((s) => s.spinWheel);
  const showPack = useGame((s) => s.showPack);
  const toast = useGame((s) => s.toast);
  const ctl = useAnimationControls();
  const [spinning, setSpinning] = useState(false);
  const [won, setWon] = useState<number | null>(null);
  const used = profile.progress.wheelDay === dayKey();

  const go = async () => {
    if (spinning || used) return;
    setSpinning(true); setWon(null);
    sfx.charge(2);
    const r = await spin();
    if (!r) { setSpinning(false); return; }
    // plusieurs tours puis arrêt pile sur le lot tiré
    const target = 360 * 6 + (360 - r.index * SEG) + (Math.random() - 0.5) * SEG * 0.6;
    const ticks = setInterval(() => sfx.tearTick(0.3, 0.5), 90);
    await ctl.start({ rotate: target, transition: { duration: 4.2, ease: [0.12, 0.8, 0.18, 1] } });
    clearInterval(ticks);
    ctl.set({ rotate: target % 360 });
    setWon(r.index); setSpinning(false);
    sfx.reveal(r.reward.freePack ? 4 : 2);
    toast(`🎡 Gagné : ${rewardText(r.reward)}`, 'success');
    if (r.pack) setTimeout(() => { onClose(); showPack(r.pack!); }, 900);
  };

  return (
    <Sheet open={open} onClose={() => !spinning && onClose()}>
      <h2 className="h1" style={{ fontSize: 24, textAlign: 'center' }}>🎡 Roue du jour</h2>
      <p className="sub" style={{ textAlign: 'center' }}>Un lancer gratuit par jour.</p>
      <div className="wheel-wrap">
        <div className="wheel-pointer" />
        <motion.svg viewBox="-150 -150 300 300" className="wheel" animate={ctl}>
          {WHEEL.map((w, i) => (
            <g key={i}>
              <path d={arc(i)} fill={w.color} stroke="rgba(255,255,255,.25)" strokeWidth="1.5" opacity={won != null && won !== i ? 0.45 : 1} />
              <text transform={`rotate(${i * SEG}) translate(0 -${R * 0.66})`} textAnchor="middle" dominantBaseline="middle" fill="#fff" fontSize="13" fontWeight="800" fontFamily="Unbounded, system-ui">{w.label}</text>
            </g>
          ))}
          <circle r="26" fill="#0d0b17" stroke="url(#wg)" strokeWidth="4" />
          <defs><linearGradient id="wg" x1="0" x2="1"><stop offset="0" stopColor="#8b5cff" /><stop offset="1" stopColor="#22e1ff" /></linearGradient></defs>
          <text textAnchor="middle" dominantBaseline="middle" fill="#fff" fontSize="10" fontWeight="800" fontFamily="Unbounded, system-ui">ICONIQ</text>
        </motion.svg>
      </div>
      <button className="btn gold block" disabled={spinning || used} onClick={go}>{used ? 'Reviens demain' : spinning ? '…' : 'Lancer la roue'}</button>
    </Sheet>
  );
}
