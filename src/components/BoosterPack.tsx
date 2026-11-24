import { motion, useAnimationControls } from 'framer-motion';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { sfx } from '../lib/fx';
import { useTilt } from '../lib/tilt';
import type { ParticlesHandle } from './Particles';
import { CardBack } from './Card';
import { VARIANTS, type FlatVariant } from '../data/catalog';
import { cardImage } from '../lib/art';

/** 3 visuels de cartes rares pour illustrer le sachet. */
function packFaces(characters?: string[]): FlatVariant[] {
  const pool = VARIANTS.filter((v) => v.fullCard && (!characters || characters.includes(v.characterId)) && v.rarity !== 'secrete' && v.rarity !== 'mythique');
  const seen = new Set<string>();
  const out: FlatVariant[] = [];
  for (const v of [...pool].reverse()) if (!seen.has(v.characterId)) { seen.add(v.characterId); out.push(v); if (out.length === 3) break; }
  return out;
}

/**
 * Booster à découper au doigt.
 * - la déchirure suit le doigt, avec un bord déchiqueté et des fibres de papier ;
 * - le rabat se soulève progressivement et laisse s'échapper la lumière du contenu
 *   (sa couleur trahit la meilleure rareté du pack… si elle est élevée) ;
 * - son, vibration et étincelles dépendent de la vitesse du doigt ;
 * - à la fin, le rabat s'arrache et s'envole, flash et souffle lumineux.
 */
interface Props {
  name: string;
  accent: string;
  /** couleur de la lumière qui fuit de la déchirure (indice de rareté) */
  glow: string;
  characters?: string[];
  particles: React.RefObject<ParticlesHandle>;
  onTorn(): void;
}

const LINE_Y = 0.13; // position de la ligne de découpe (fraction de la hauteur)
const BAND = 0.07;   // tolérance verticale du doigt
const STEPS = 100;

export function BoosterPack({ name, accent, glow, characters, particles, onTorn }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const tiltRef = useRef<HTMLDivElement>(null);
  const [cut, setCut] = useState<{ x: number; y: number }[]>([]);
  const [torn, setTorn] = useState(false);
  const [dir, setDir] = useState(1);
  const [grip, setGrip] = useState<{ x: number; y: number } | null>(null);
  const tearing = useRef<{ startX: number; lastTick: number; lastX: number; lastT: number; started: boolean } | null>(null);
  const pts = useRef<Map<number, number>>(new Map());
  const shake = useAnimationControls();
  useTilt(tiltRef, !torn && !grip, 10);

  const progress = () => pts.current.size / (STEPS + 1);
  const p = cut.length ? progress() : 0;

  const toLocal = (e: React.PointerEvent) => {
    const r = box.current!.getBoundingClientRect();
    return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height, r };
  };

  const publish = () => setCut([...pts.current.entries()].sort((a, b) => a[0] - b[0]).map(([k, v]) => ({ x: k / STEPS, y: v })));

  const record = (x: number, y: number) => {
    const xi = Math.round(Math.max(0, Math.min(1, x)) * STEPS);
    const yy = Math.max(LINE_Y - BAND / 2, Math.min(LINE_Y + BAND / 2, y));
    const keys = [...pts.current.keys()];
    const near = keys.length ? keys.reduce((a, b) => (Math.abs(b - xi) < Math.abs(a - xi) ? b : a)) : xi;
    const from = Math.min(near, xi), to = Math.max(near, xi);
    const y0 = pts.current.get(near) ?? yy;
    let added = 0;
    for (let k = from; k <= to; k++) {
      if (pts.current.has(k)) continue;
      // bord déchiqueté : dents irrégulières
      const tooth = (k % 2 ? 1 : -1) * (0.002 + Math.random() * 0.005);
      pts.current.set(k, y0 + ((yy - y0) * (k - from)) / Math.max(1, to - from) + tooth);
      added++;
    }
    if (added) publish();
    return added;
  };

  const onDown = (e: React.PointerEvent) => {
    if (torn) return;
    const { x, y } = toLocal(e);
    if (Math.abs(y - LINE_Y) > BAND * 1.8) {
      sfx.tap();
      shake.start({ rotate: [0, -2.5, 2.5, -1.2, 0], transition: { duration: 0.35 } });
      return;
    }
    (e.target as Element).setPointerCapture?.(e.pointerId);
    tearing.current = { startX: x, lastTick: progress(), lastX: x, lastT: performance.now(), started: false };
    setGrip({ x, y: LINE_Y });
    if (!pts.current.size) sfx.tearStart();
  };

  const onMove = (e: React.PointerEvent) => {
    const t = tearing.current;
    if (!t || torn) return;
    const { x, y, r } = toLocal(e);
    const now = performance.now();
    const speed = Math.min(4, (Math.abs(x - t.lastX) * 1000) / Math.max(1, now - t.lastT) / 0.6); // ~1 = normal
    const d = x >= t.lastX ? 1 : -1;
    t.lastX = x; t.lastT = now;
    const added = record(x, y);
    setGrip({ x, y: Math.max(LINE_Y - BAND / 2, Math.min(LINE_Y + BAND / 2, y)) });
    if (!added) return;
    if (!t.started) { t.started = true; setDir(d); }
    const cx = e.clientX, cy = r.top + LINE_Y * r.height;
    particles.current?.sparks(cx, cy, '#fff', 2 + Math.round(speed * 2), 2 + speed);
    particles.current?.sparks(cx, cy, glow, 1 + Math.round(speed), 2 + speed);
    particles.current?.fibers(cx, cy, 1 + Math.round(speed * 1.5), -d);
    const pr = progress();
    if (pr - t.lastTick > 0.025) { t.lastTick = pr; sfx.tearTick(pr, speed); }
    if (pr >= 0.92) finish(x > t.startX ? 1 : -1);
  };

  const onUp = () => { tearing.current = null; setGrip(null); };

  const finish = (dd: number) => {
    const ks = [...pts.current.keys()];
    const last = pts.current.get(dd > 0 ? Math.max(...ks) : Math.min(...ks)) ?? LINE_Y;
    for (let k = 0; k <= STEPS; k++) if (!pts.current.has(k)) pts.current.set(k, last + (k % 2 ? 0.004 : -0.004));
    publish();
    tearing.current = null;
    setGrip(null);
    setDir(dd);
    setTorn(true);
    sfx.tear();
    const r = box.current!.getBoundingClientRect();
    const cy = r.top + r.height * LINE_Y;
    particles.current?.burst(r.left + r.width / 2, cy, ['#fff', glow, accent], 90, 11);
    for (let i = 0; i < 10; i++) particles.current?.fibers(r.left + (r.width * i) / 9, cy, 3, dd);
    shake.start({ y: [0, 10, -4, 0], scale: [1, 0.97, 1.02, 1], transition: { duration: 0.45 } });
    setTimeout(() => { sfx.pop(); sfx.whoosh(); }, 420);
    setTimeout(() => sfx.flip(), 650);
    setTimeout(onTorn, 1550);
  };

  // polygones : le rabat (au-dessus de la déchirure) et le corps du sachet
  const topPoly = cut.length > 1
    ? `polygon(0 0, 100% 0, ${torn ? '' : `100% ${LINE_Y * 100}%,`} ${[...cut].reverse().map((q) => `${q.x * 100}% ${q.y * 100}%`).join(',')}${torn ? '' : `, 0 ${LINE_Y * 100}%`})`
    : 'none';
  const botPoly = cut.length > 1
    ? `polygon(0 ${LINE_Y * 100}%, ${cut.map((q) => `${q.x * 100}% ${q.y * 100}%`).join(',')}, 100% ${LINE_Y * 100}%, 100% 100%, 0 100%)`
    : 'none';
  const cutPath = cut.map((q, i) => `${i ? 'L' : 'M'}${q.x * 100} ${q.y * 140}`).join(' ');
  // le rabat pivote autour du côté encore attaché
  const hinge = dir > 0 ? '100%' : '0%';
  const lift = torn ? 0 : p;

  useEffect(() => { shake.start({ y: [0, -8, 0], transition: { duration: 3, repeat: Infinity, ease: 'easeInOut' } }); }, [shake]);

  const art = <PackArt name={name} accent={accent} characters={characters} />;

  return (
    <motion.div animate={shake} style={{ width: 'min(70vw, 300px)', touchAction: 'none' }}>
      <div ref={tiltRef} className="tcg" style={{ aspectRatio: '5 / 7', '--rc': accent, '--leak': glow } as CSSProperties}>
        <div ref={box} className="pack" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
          {/* lumière du contenu, visible à travers la fente */}
          <div className="pack-leak" style={{ top: `${LINE_Y * 100}%`, opacity: torn ? 1 : Math.min(1, p * 1.6) }} />

          {cut.length < 2 ? (
            <div className="pack-piece">{art}</div>
          ) : (
            <>
              {torn && (
                <div className="pack-cards">
                  {[0, 1, 2].map((i) => (
                    <motion.div key={i} className="pack-card" initial={{ y: '35%', rotate: 0 }}
                      animate={{ y: ['35%', '-58%', '-50%'], rotate: (i - 1) * 4, x: `${(i - 1) * 6}%` }}
                      transition={{ delay: 0.3 + i * 0.07, duration: 0.75, times: [0, 0.7, 1], ease: 'easeOut' }}>
                      <CardBack style={{ height: '100%', aspectRatio: 'auto' }} />
                    </motion.div>
                  ))}
                </div>
              )}
              <motion.div className="pack-piece" style={{ clipPath: botPoly }}
                animate={torn ? { y: [0, 0, '120%'], opacity: [1, 1, 0], rotate: [0, 0, dir * -6] } : {}}
                transition={torn ? { duration: 1.5, times: [0, 0.6, 1], ease: 'easeIn' } : {}}>{art}</motion.div>
              <motion.div
                className="pack-piece pack-flap"
                style={{ clipPath: topPoly, transformOrigin: `${hinge} ${LINE_Y * 100}%` }}
                animate={torn
                  ? { x: dir * 460, y: -320, rotate: dir * 70, rotateX: 40, opacity: 0 }
                  : { y: -lift * 14, rotate: -dir * lift * 10, rotateX: lift * 30 }}
                transition={torn ? { duration: 1, ease: [0.15, 0.7, 0.3, 1] } : { type: 'spring', stiffness: 400, damping: 30 }}
              >{art}</motion.div>
            </>
          )}

          <svg className="pack-cutline" viewBox="0 0 100 140" preserveAspectRatio="none">
            {!torn && cut.length < 2 && (
              <line x1="3" x2="97" y1={LINE_Y * 140} y2={LINE_Y * 140} stroke="rgba(255,255,255,.6)" strokeWidth="1.2" strokeDasharray="3 2.4" vectorEffect="non-scaling-stroke" className="pack-dash" />
            )}
            {cut.length > 1 && !torn && (
              <>
                <path d={cutPath} stroke={glow} strokeWidth={8 + p * 10} fill="none" opacity={0.35 + p * 0.4} style={{ filter: 'blur(4px)' }} vectorEffect="non-scaling-stroke" />
                <path d={cutPath} stroke="#fff" strokeWidth="1.6" fill="none" vectorEffect="non-scaling-stroke" />
              </>
            )}
          </svg>

          {grip && !torn && (
            <div className="pack-grip" style={{ left: `${grip.x * 100}%`, top: `${grip.y * 100}%` }} />
          )}
          {!torn && cut.length === 0 && (
            <div className="pack-hint" style={{ top: `${LINE_Y * 100}%` }}><span className="pack-finger">☝️</span></div>
          )}
        </div>
      </div>
      {!torn && (
        <div className="pack-meter">
          {cut.length ? <div className="bar"><i style={{ width: `${Math.round(p * 100)}%`, background: `linear-gradient(90deg, #fff, ${glow})`, transition: 'none' }} /></div>
            : <p className="pack-help">Glisse ton doigt le long des pointillés</p>}
        </div>
      )}
    </motion.div>
  );
}

export function PackArt({ name, accent, characters }: { name: string; accent: string; characters?: string[] }) {
  const faces = packFaces(characters);
  return (
    <div className="pack-art" style={{ '--pa': accent } as CSSProperties}>
      <div className="pack-faces">{faces.map((v, i) => <img key={v.id} src={cardImage(v)} alt="" draggable={false} style={{ '--i': i - 1, '--y': Math.abs(i - 1) } as CSSProperties} />)}</div>
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
