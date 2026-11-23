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
  tearTick: () => { noise(0.04, 0.08, 2500); haptic(4); },
  tear: () => { noise(0.35, 0.35, 900); tone(220, 0.3, 'sawtooth', 0.05, -120); haptic([20, 30, 40]); },
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
