import { useEffect, type RefObject } from 'react';

/** Gyroscope partagé (parallaxe holographique en bougeant le téléphone). */
const gyro = { x: 0, y: 0, on: false };
const gyroListeners = new Set<() => void>();
let gyroBound = false;

export async function enableGyro(): Promise<boolean> {
  const DOE = (window as any).DeviceOrientationEvent;
  if (!DOE) return false;
  if (typeof DOE.requestPermission === 'function') {
    try { if ((await DOE.requestPermission()) !== 'granted') return false; } catch { return false; }
  }
  if (!gyroBound) {
    gyroBound = true;
    let base: { b: number; g: number } | null = null;
    addEventListener('deviceorientation', (e: DeviceOrientationEvent) => {
      if (e.beta == null || e.gamma == null) return;
      base ??= { b: e.beta, g: e.gamma };
      base.b += (e.beta - base.b) * 0.01; // recentrage lent
      base.g += (e.gamma - base.g) * 0.01;
      gyro.x = Math.max(-1, Math.min(1, (e.gamma - base.g) / 25));
      gyro.y = Math.max(-1, Math.min(1, (e.beta - base.b) / 25));
      gyro.on = true;
      gyroListeners.forEach((f) => f());
    });
  }
  return true;
}

function apply(el: HTMLElement, x: number, y: number, strength: number) {
  // x,y ∈ [-1,1]
  el.style.setProperty('--rx', `${(-y * strength).toFixed(2)}deg`);
  el.style.setProperty('--ry', `${(x * strength).toFixed(2)}deg`);
  el.style.setProperty('--mx', `${((x + 1) * 50).toFixed(1)}%`);
  el.style.setProperty('--my', `${((y + 1) * 50).toFixed(1)}%`);
  el.style.setProperty('--hyp', Math.min(1, Math.hypot(x, y)).toFixed(3));
}

export function useTilt(ref: RefObject<HTMLElement>, enabled = true, strength = 16) {
  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;
    let raf = 0;
    let px = 0, py = 0, touching = false;
    const flush = () => { raf = 0; apply(el, px, py, strength); };
    const schedule = () => { if (!raf) raf = requestAnimationFrame(flush); };
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      px = ((e.clientX - r.left) / r.width) * 2 - 1;
      py = ((e.clientY - r.top) / r.height) * 2 - 1;
      px = Math.max(-1, Math.min(1, px)); py = Math.max(-1, Math.min(1, py));
      touching = true;
      el.classList.add('active');
      schedule();
    };
    const onLeave = () => {
      touching = false;
      el.classList.remove('active');
      px = gyro.on ? gyro.x : 0; py = gyro.on ? gyro.y : 0;
      schedule();
    };
    const onGyro = () => { if (!touching) { px = gyro.x; py = gyro.y; schedule(); } };
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerdown', onMove);
    el.addEventListener('pointerleave', onLeave);
    el.addEventListener('pointerup', onLeave);
    el.addEventListener('pointercancel', onLeave);
    gyroListeners.add(onGyro);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerdown', onMove);
      el.removeEventListener('pointerleave', onLeave);
      el.removeEventListener('pointerup', onLeave);
      el.removeEventListener('pointercancel', onLeave);
      gyroListeners.delete(onGyro);
    };
  }, [ref, enabled, strength]);
}
