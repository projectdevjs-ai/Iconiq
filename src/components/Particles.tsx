import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

interface P { x: number; y: number; vx: number; vy: number; life: number; max: number; size: number; color: string; kind: 0 | 1 | 2; rot: number; vr: number }

export interface ParticlesHandle {
  /** étincelles ponctuelles */
  sparks(x: number, y: number, color: string, n?: number, speed?: number): void;
  /** explosion radiale */
  burst(x: number, y: number, colors: string[], n?: number, speed?: number): void;
  /** confettis tombant du haut */
  confetti(colors: string[], n?: number): void;
}

/** Canvas plein écran de particules — ne tourne que s'il y a des particules vivantes. */
export const Particles = forwardRef<ParticlesHandle>(function Particles(_, ref) {
  const cv = useRef<HTMLCanvasElement>(null);
  const ps = useRef<P[]>([]);
  const raf = useRef(0);

  useEffect(() => {
    const c = cv.current!;
    const resize = () => {
      const dpr = Math.min(2, devicePixelRatio || 1);
      c.width = innerWidth * dpr; c.height = innerHeight * dpr;
      c.getContext('2d')!.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    addEventListener('resize', resize);
    return () => { removeEventListener('resize', resize); cancelAnimationFrame(raf.current); };
  }, []);

  const loop = () => {
    const c = cv.current;
    if (!c) return;
    const g = c.getContext('2d')!;
    g.clearRect(0, 0, innerWidth, innerHeight);
    g.globalCompositeOperation = 'lighter';
    const arr = ps.current;
    for (let i = arr.length - 1; i >= 0; i--) {
      const p = arr[i];
      p.life++;
      if (p.life > p.max) { arr.splice(i, 1); continue; }
      p.x += p.vx; p.y += p.vy; p.rot += p.vr;
      if (p.kind === 2) { p.vy += 0.06; p.vx *= 0.99; } else { p.vx *= 0.94; p.vy = p.vy * 0.94 + 0.05; }
      const a = 1 - p.life / p.max;
      g.globalAlpha = a;
      g.fillStyle = p.color;
      if (p.kind === 2) {
        g.save(); g.translate(p.x, p.y); g.rotate(p.rot);
        g.globalCompositeOperation = 'source-over';
        g.fillRect(-p.size, -p.size / 2.5, p.size * 2, p.size / 1.25);
        g.restore(); g.globalCompositeOperation = 'lighter';
      } else {
        g.shadowBlur = p.kind === 1 ? 14 : 8; g.shadowColor = p.color;
        g.beginPath(); g.arc(p.x, p.y, p.size * (p.kind === 1 ? a : 1), 0, Math.PI * 2); g.fill();
      }
    }
    g.shadowBlur = 0;
    raf.current = arr.length ? requestAnimationFrame(loop) : 0;
  };
  const kick = () => { if (!raf.current) raf.current = requestAnimationFrame(loop); };

  useImperativeHandle(ref, () => ({
    sparks(x, y, color, n = 6, speed = 4) {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, s = Math.random() * speed;
        ps.current.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 1, life: 0, max: 20 + Math.random() * 25, size: 1 + Math.random() * 2, color, kind: 0, rot: 0, vr: 0 });
      }
      kick();
    },
    burst(x, y, colors, n = 80, speed = 12) {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, s = speed * (0.3 + Math.random() * 0.7);
        ps.current.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0, max: 40 + Math.random() * 50, size: 1.5 + Math.random() * 3.5, color: colors[i % colors.length], kind: 1, rot: 0, vr: 0 });
      }
      kick();
    },
    confetti(colors, n = 120) {
      for (let i = 0; i < n; i++) {
        ps.current.push({ x: Math.random() * innerWidth, y: -20 - Math.random() * 200, vx: (Math.random() - 0.5) * 3, vy: 2 + Math.random() * 4, life: 0, max: 160 + Math.random() * 80, size: 4 + Math.random() * 4, color: colors[i % colors.length], kind: 2, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.3 });
      }
      kick();
    },
  }));

  return <canvas ref={cv} style={{ position: 'fixed', inset: 0, width: '100vw', height: '100vh', pointerEvents: 'none', zIndex: 150 }} />;
});
