/** Musique d'ambiance générative (aucun fichier) : nappe douce + arpèges lents. */
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let timer = 0;
let on = false;

const KEY = 'iconiq-music';
export const musicWanted = () => { try { return localStorage.getItem(KEY) === '1'; } catch { return false; } };

const CHORDS = [[220, 261.6, 329.6], [174.6, 220, 261.6], [196, 246.9, 293.7], [164.8, 207.7, 246.9]];

function pad(freq: number, t: number, dur: number) {
  const o = ctx!.createOscillator(), o2 = ctx!.createOscillator(), g = ctx!.createGain(), f = ctx!.createBiquadFilter();
  o.type = 'sawtooth'; o2.type = 'triangle'; o.frequency.value = freq; o2.frequency.value = freq * 1.005;
  f.type = 'lowpass'; f.frequency.value = 900;
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.05, t + 1.5); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(f); o2.connect(f); f.connect(g).connect(master!);
  o.start(t); o2.start(t); o.stop(t + dur + 0.1); o2.stop(t + dur + 0.1);
}
function bell(freq: number, t: number) {
  const o = ctx!.createOscillator(), g = ctx!.createGain();
  o.type = 'sine'; o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.04, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.8);
  o.connect(g).connect(master!); o.start(t); o.stop(t + 2);
}

let bar = 0;
function schedule() {
  if (!ctx || !on) return;
  const t = ctx.currentTime + 0.1;
  const ch = CHORDS[bar % CHORDS.length];
  ch.forEach((f) => pad(f, t, 6.5));
  for (let i = 0; i < 4; i++) if (Math.random() < 0.7) bell(ch[Math.floor(Math.random() * 3)] * 2 * (Math.random() < 0.3 ? 2 : 1), t + i * 1.5 + Math.random() * 0.3);
  bar++;
}

export function setMusic(enabled: boolean) {
  try { localStorage.setItem(KEY, enabled ? '1' : '0'); } catch { /* */ }
  on = enabled;
  if (enabled) {
    ctx ??= new (window.AudioContext || (window as any).webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    if (!master) { master = ctx.createGain(); master.gain.value = 0.6; master.connect(ctx.destination); }
    master.gain.setTargetAtTime(0.6, ctx.currentTime, 0.5);
    if (!timer) { schedule(); timer = window.setInterval(schedule, 6000); }
  } else if (ctx && master) {
    master.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.4);
    clearInterval(timer); timer = 0;
  }
}

/** à appeler après un premier geste de l'utilisateur (règle des navigateurs) */
export function resumeMusicIfWanted() { if (musicWanted() && !on) setMusic(true); }
