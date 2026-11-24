import { AnimatePresence, motion, LayoutGroup } from 'framer-motion';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { sfx } from '../lib/fx';
import { toggleFullscreen } from '../lib/fullscreen';
import { useGame, type Route } from '../store/game';

function useCountUp(value: number) {
  const [shown, setShown] = useState(value);
  const prev = useRef(value);
  useEffect(() => {
    const from = prev.current, to = value;
    prev.current = value;
    if (from === to) return;
    const t0 = performance.now(), dur = 700;
    let raf = 0;
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / dur);
      setShown(Math.round(from + (to - from) * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return shown;
}

function Currency({ icon, value, color, title }: { icon: string; value: number; color: string; title: string }) {
  const v = useCountUp(value);
  return (
    <motion.span className="pill num" title={title} key={value > 0 ? undefined : 0} style={{ color }}>
      <span className="ico">{icon}</span>
      <span style={{ color: '#fff' }}>{v.toLocaleString('fr-FR')}</span>
    </motion.span>
  );
}

export function TopBar({ unread, onLogoTap }: { unread: number; onLogoTap(): void }) {
  const profile = useGame((s) => s.profile);
  const backend = useGame((s) => s.backend);
  const go = useGame((s) => s.go);
  if (!profile) return null;
  return (
    <header className="topbar">
      <button className="logo" onClick={onLogoTap} aria-label="ICONIQ">ICONIQ</button>
      {backend?.mode === 'local' && !import.meta.env.VITE_EMBED && <span className="pill" style={{ fontSize: 10, height: 22, color: 'var(--gold)' }}>LOCAL</span>}
      <div className="spacer" />
      <Currency icon="🪙" value={profile.credits} color="var(--gold)" title="Crédits" />
      <Currency icon="✦" value={profile.shards} color="var(--accent-2)" title="Éclats" />
      {backend?.mode === 'online' && <Currency icon="💎" value={profile.gems} color="#ff6bd6" title="Gemmes" />}
      {!!((document.documentElement as any).requestFullscreen || (document.documentElement as any).webkitRequestFullscreen) && <button className="icon-btn" aria-label="Plein écran" onClick={async () => {
        sfx.tap();
        if (!(await toggleFullscreen())) useGame.getState().toast(/iPhone|iPad/.test(navigator.userAgent)
          ? 'Sur iPhone, le plein écran s’obtient en installant l’app (Partager → Sur l’écran d’accueil) sur la version en ligne.'
          : 'Plein écran bloqué ici. Ouvre la page dans ton navigateur (Chrome) pour l’activer.');
      }}>⛶</button>}
      <button className="icon-btn" onClick={() => { sfx.tap(); go('profile'); }} aria-label="Profil">
        👤{unread > 0 && <span className="badge-dot">{unread}</span>}
      </button>
    </header>
  );
}

const ITEMS: { route: Route; icon: string; label: string }[] = [
  { route: 'home', icon: '✦', label: 'Accueil' },
  { route: 'collection', icon: '🃏', label: 'Collection' },
  { route: 'shop', icon: '🛍️', label: 'Boutique' },
  { route: 'trade', icon: '🔁', label: 'Échanges' },
  { route: 'market', icon: '⚖️', label: 'Marché' },
  { route: 'battle', icon: '⚔️', label: 'Combat' },
];

export function Dock() {
  const route = useGame((s) => s.route);
  const go = useGame((s) => s.go);
  return (
    <nav className="dock" aria-label="Navigation">
      <LayoutGroup>
        {ITEMS.map((it) => (
          <button key={it.route} className={`dock-item ${route === it.route ? 'active' : ''}`} onClick={() => { sfx.tap(); go(it.route); }} aria-current={route === it.route}>
            {route === it.route && <motion.div layoutId="dock-glow" className="dock-glow" transition={{ type: 'spring', stiffness: 500, damping: 34 }} />}
            <span className="di">{it.icon}</span>
            <span>{it.label}</span>
          </button>
        ))}
      </LayoutGroup>
    </nav>
  );
}

export function Toasts() {
  const toasts = useGame((s) => s.toasts);
  return (
    <div className="toasts" aria-live="polite">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div key={t.id} className={`toast ${t.kind}`} initial={{ y: -30, opacity: 0, scale: 0.9 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: -20, opacity: 0, scale: 0.95 }} transition={{ type: 'spring', stiffness: 400, damping: 30 }}>
            {t.text}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

export function Sheet({ open, onClose, children }: { open: boolean; onClose(): void; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    addEventListener('keydown', k);
    return () => removeEventListener('keydown', k);
  }, [open, onClose]);
  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div className="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div
            className="sheet" role="dialog" aria-modal
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 38 }}
            drag="y" dragConstraints={{ top: 0, bottom: 0 }} dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, i) => { if (i.offset.y > 120 || i.velocity.y > 600) onClose(); }}
          >
            <div className="sheet-handle" />
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
