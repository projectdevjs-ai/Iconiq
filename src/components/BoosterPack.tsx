import { motion, useAnimationControls } from 'framer-motion';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { sfx } from '../lib/fx';
import { useTilt } from '../lib/tilt';
import type { ParticlesHandle } from './Particles';

/**
 * Booster à découper au doigt.
 * L'utilisateur glisse le long de la ligne pointillée : la déchirure suit exactement
 * le tracé du doigt, puis le haut du sachet s'arrache et s'envole.
 */
interface Props {
  name: string;
  accent: string;
  particles: React.RefObject<ParticlesHandle>;
  onTorn(): void;
}

const LINE_Y = 0.14; // position de la ligne de découpe (fraction de la hauteur)
const BAND = 0.07;   // tolérance verticale du doigt

export function BoosterPack({ name, accent, particles, onTorn }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const tiltRef = useRef<HTMLDivElement>(null);
  const [cut, setCut] = useState<{ x: number; y: number }[]>([]); // points en fraction [0,1]
  const [torn, setTorn] = useState(false);
  const [flyDir, setFlyDir] = useState(1);
  const tearing = useRef<{ startX: number; lastTick: number } | null>(null);
  const pts = useRef<Map<number, number>>(new Map()); // x (1/100) -> y
  const shake = useAnimationControls();
  useTilt(tiltRef, !torn, 10);

  const progress = () => (pts.current.size ? pts.current.size / 101 : 0);

  const toLocal = (e: React.PointerEvent) => {
    const r = box.current!.getBoundingClientRect();
    return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height, r };
  };

  const record = (x: number, y: number) => {
    const xi = Math.round(Math.max(0, Math.min(1, x)) * 100);
    const yy = Math.max(LINE_Y - BAND / 2, Math.min(LINE_Y + BAND / 2, y));
    // remplit les trous si le doigt va vite
    const keys = [...pts.current.keys()];
    const near = keys.length ? keys.reduce((a, b) => (Math.abs(b - xi) < Math.abs(a - xi) ? b : a)) : xi;
    const from = Math.min(near, xi), to = Math.max(near, xi);
    const y0 = pts.current.get(near) ?? yy;
    for (let k = from; k <= to; k++) if (!pts.current.has(k)) pts.current.set(k, y0 + ((yy - y0) * (k - from)) / Math.max(1, to - from) + (Math.random() - 0.5) * 0.004);
    setCut([...pts.current.entries()].sort((a, b) => a[0] - b[0]).map(([k, v]) => ({ x: k / 100, y: v })));
  };

  const onDown = (e: React.PointerEvent) => {
    if (torn) return;
    const { x, y } = toLocal(e);
    if (Math.abs(y - LINE_Y) > BAND * 1.6) { sfx.tap(); shake.start({ rotate: [0, -2, 2, -1, 0], transition: { duration: 0.35 } }); return; }
    (e.target as Element).setPointerCapture?.(e.pointerId);
    tearing.current = { startX: x, lastTick: progress() };
    record(x, y);
  };

  const onMove = (e: React.PointerEvent) => {
    if (!tearing.current || torn) return;
    const { x, y, r } = toLocal(e);
    record(x, y);
    particles.current?.sparks(e.clientX, r.top + (LINE_Y * r.height), '#fff', 3, 3);
    particles.current?.sparks(e.clientX, e.clientY, accent, 2, 2);
    const p = progress();
    if (p - tearing.current.lastTick > 0.05) { tearing.current.lastTick = p; sfx.tearTick(); }
    if (p >= 0.9) finish(x > tearing.current.startX ? 1 : -1);
  };

  const onUp = () => { tearing.current = null; };

  const finish = (dir: number) => {
    // complète la ligne jusqu'aux bords
    const last = pts.current.get(dir > 0 ? Math.max(...pts.current.keys()) : Math.min(...pts.current.keys())) ?? LINE_Y;
    for (let k = 0; k <= 100; k++) if (!pts.current.has(k)) pts.current.set(k, last);
    setCut([...pts.current.entries()].sort((a, b) => a[0] - b[0]).map(([k, v]) => ({ x: k / 100, y: v })));
    tearing.current = null;
    setFlyDir(dir);
    setTorn(true);
    sfx.tear();
    const r = box.current!.getBoundingClientRect();
    particles.current?.burst(r.left + r.width / 2, r.top + r.height * LINE_Y, ['#fff', accent, '#22e1ff'], 70, 10);
    setTimeout(onTorn, 450);
  };

  // polygone du haut et du bas suivant exactement la déchirure
  const topPoly = cut.length > 1 ? `polygon(0 0, 100% 0, ${[...cut].reverse().map((p) => `${p.x * 100}% ${p.y * 100}%`).join(',')})` : 'none';
  const botPoly = cut.length > 1 ? `polygon(${cut.map((p) => `${p.x * 100}% ${p.y * 100}%`).join(',')}, 100% 100%, 0 100%)` : 'none';
  const cutPath = cut.map((p, i) => `${i ? 'L' : 'M'}${p.x * 100} ${p.y * 140}`).join(' ');

  useEffect(() => { shake.start({ y: [0, -8, 0], transition: { duration: 3, repeat: Infinity, ease: 'easeInOut' } }); }, [shake]);

  const art = <PackArt name={name} accent={accent} />;

  return (
    <motion.div animate={shake} style={{ width: 'min(70vw, 300px)', touchAction: 'none' }}>
      <div ref={tiltRef} className="tcg" style={{ aspectRatio: '5 / 7', '--rc': accent } as CSSProperties}>
        <div
          ref={box}
          className="pack"
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
        >
          {!torn ? (
            <div className="pack-piece" style={{ clipPath: 'none' }}>{art}</div>
          ) : (
            <>
              <motion.div
                className="pack-piece"
                style={{ clipPath: topPoly, transformOrigin: flyDir > 0 ? '100% 10%' : '0% 10%' }}
                initial={{ x: 0, y: 0, rotate: 0, opacity: 1 }}
                animate={{ x: flyDir * 420, y: -260, rotate: flyDir * 55, opacity: 0 }}
                transition={{ duration: 0.9, ease: [0.2, 0.7, 0.3, 1] }}
              >{art}</motion.div>
              <div className="pack-piece" style={{ clipPath: botPoly }}>{art}</div>
            </>
          )}
          {/* ligne pointillée + tracé lumineux */}
          <svg className="pack-cutline" viewBox="0 0 100 140" preserveAspectRatio="none">
            {!torn && <line x1="3" x2="97" y1={LINE_Y * 140} y2={LINE_Y * 140} stroke="rgba(255,255,255,.55)" strokeWidth=".6" strokeDasharray="2 1.6" vectorEffect="non-scaling-stroke" />}
            {cut.length > 1 && !torn && (
              <>
                <path d={cutPath} stroke={accent} strokeWidth="6" fill="none" opacity=".5" style={{ filter: 'blur(3px)' }} vectorEffect="non-scaling-stroke" />
                <path d={cutPath} stroke="#fff" strokeWidth="2" fill="none" vectorEffect="non-scaling-stroke" />
              </>
            )}
          </svg>
          {!torn && cut.length === 0 && (
            <div className="pack-hint" style={{ top: `${LINE_Y * 100}%` }}>
              <span className="pack-finger">☝️</span>
            </div>
          )}
        </div>
      </div>
      {!torn && <p className="pack-help">{cut.length ? `${Math.round(progress() * 100)}%` : 'Glisse ton doigt le long des pointillés'}</p>}
    </motion.div>
  );
}

export function PackArt({ name, accent }: { name: string; accent: string }) {
  return (
    <div className="pack-art" style={{ '--pa': accent } as CSSProperties}>
      <div className="pack-crimp top" />
      <div className="pack-foil" />
      <div className="pack-rings" />
      <div className="pack-center">
        <div className="pack-logo">ICONIQ</div>
        <div className="pack-name">{name}</div>
        <div className="pack-sub">5 CARTES · ÉDITION 01</div>
      </div>
      <div className="pack-gloss" />
      <div className="pack-crimp bottom" />
    </div>
  );
}
