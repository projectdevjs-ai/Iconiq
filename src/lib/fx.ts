/** Sons synthétisés (aucun fichier audio) + retours haptiques. */
let ctx: AudioContext | null = null;
let muted = localStorageGet('iconiq-muted') === '1';

function localStorageGet(k: string) {
  try { return localStorage.getItem(k); } catch { return null; }
}
export function isMuted() { return muted; }
export function setMuted(m: boolean) {
  muted = m;
  try { localStorage.setItem('iconiq-muted', m ? '1' : '0'); } catch { /* */ }
}

function ac() {
  if (!ctx) ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(freq: number, dur: number, type: OscillatorType = 'sine', vol = 0.15, slide = 0, delay = 0) {
  if (muted) return;
  const a = ac();
  const t = a.currentTime + delay;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination);
  o.start(t);
  o.stop(t + dur + 0.05);
}

function noise(dur: number, vol = 0.2, hp = 1200, delay = 0) {
  if (muted) return;
  const a = ac();
  const t = a.currentTime + delay;
  const buf = a.createBuffer(1, Math.ceil(a.sampleRate * dur), a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const src = a.createBufferSource();
  src.buffer = buf;
  const f = a.createBiquadFilter();
  f.type = 'highpass';
  f.frequency.value = hp;
  const g = a.createGain();
  g.gain.value = vol;
  src.connect(f).connect(g).connect(a.destination);
  src.start(t);
}

export const sfx = {
  tap: () => { tone(880, 0.05, 'triangle', 0.06); haptic(6); },
  /** grain de déchirure : plus le doigt va vite, plus c'est fort ; plus on avance, plus c'est aigu */
  tearTick: (progress = 0, speed = 1) => {
    const v = Math.min(0.22, 0.05 + speed * 0.05);
    noise(0.03 + Math.random() * 0.03, v, 1400 + progress * 2600 + Math.random() * 600);
    if (Math.random() < 0.35) noise(0.015, v * 0.8, 5000);
    haptic(speed > 1.5 ? 8 : 4);
  },
  /** tension avant l'arrachage (bord du sachet qui résiste) */
  tearStart: () => { noise(0.08, 0.12, 700); tone(90, 0.12, 'triangle', 0.08, -30); haptic(12); },
  tear: () => {
    noise(0.12, 0.45, 600); noise(0.5, 0.3, 1800, 0.05); noise(0.25, 0.25, 4200, 0.02);
    tone(140, 0.35, 'sawtooth', 0.07, -90); tone(880, 0.6, 'sine', 0.06, 900, 0.08);
    haptic([35, 25, 60, 20, 18]);
  },
  pop: () => { tone(320, 0.18, 'sine', 0.1, 500); noise(0.06, 0.1, 3000); haptic(15); },
  whoosh: () => noise(0.25, 0.12, 400),
  flip: () => { noise(0.08, 0.12, 3000); tone(600, 0.08, 'triangle', 0.05, 300); haptic(10); },
  reveal(rank: number) {
    const base = [523, 587, 659, 784, 880, 1047, 1319][rank] ?? 523;
    tone(base, 0.25, 'triangle', 0.12);
    if (rank >= 2) tone(base * 1.5, 0.3, 'sine', 0.08, 0, 0.06);
    if (rank >= 3) { tone(base * 2, 0.5, 'sine', 0.08, 0, 0.12); haptic([30, 40, 30]); }
    if (rank >= 4) { [0, 0.1, 0.2, 0.3].forEach((d, i) => tone(base * (1 + i * 0.25), 0.6, 'sine', 0.07, 0, d)); haptic([40, 30, 40, 30, 120]); }
    if (rank >= 5) { tone(65, 1.2, 'sawtooth', 0.12, 40); noise(1.2, 0.15, 200); haptic([80, 50, 80, 50, 200, 50, 300]); }
  },
  charge: (rank: number) => { tone(110, 0.9, 'sawtooth', 0.05, 200 + rank * 120); haptic([10, 20, 10, 20, 10, 20]); },
  coin: () => { tone(988, 0.08, 'square', 0.05); tone(1319, 0.2, 'square', 0.05, 0, 0.08); haptic(12); },
  error: () => { tone(160, 0.2, 'square', 0.06, -60); haptic([30, 40, 30]); },
  recycle: () => { tone(300, 0.4, 'sine', 0.1, 900); noise(0.3, 0.1, 3000, 0.1); haptic([10, 20, 60]); },
};

export function haptic(p: number | number[]) {
  try { navigator.vibrate?.(p); } catch { /* iOS : pas d'API vibration */ }
}
