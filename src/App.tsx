import { AnimatePresence } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Intro, Splash, introSeen } from './components/Intro';
import { resumeMusicIfWanted } from './lib/music';
import { inviteOnly } from './lib/invite';
import { PackOpening } from './components/PackOpening';
import { useOnline } from './components/OnlineOnly';
import { Dock, Toasts, TopBar } from './components/Shell';
import { dailyStatus } from './engine/rules';
import type { AppNotification } from './engine/types';
import { sfx } from './lib/fx';
import { localNotify } from './lib/push';
import { supabase } from './lib/supabase';
import { Battle } from './screens/Battle';
import { Collection } from './screens/Collection';
import { Home } from './screens/Home';
import { Market } from './screens/Market';
import { Profile } from './screens/Profile';
import { Shop } from './screens/Shop';
import { Trade } from './screens/Trade';
import { Welcome } from './screens/Welcome';
import { Friends } from './screens/Friends';
import { Settings, applyReduceMotion } from './screens/Settings';
import { useGame } from './store/game';

function useBoot() {
  const start = useGame((s) => s.start);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    (async () => {
      let mode: string | null = null;
      try { mode = localStorage.getItem('iconiq-mode'); } catch { /* */ }
      try {
        if (mode === 'online' && supabase) {
          const { data } = await supabase.auth.getSession();
          if (data.session) await start('online');
        } else if (mode === 'local' && !inviteOnly()) await start('local');
      } catch { /* hors-ligne : retour à l'accueil */ }
      await new Promise((r) => setTimeout(r, 900)); // laisse le logo s'animer
      setReady(true);
    })();
  }, [start]);
  return ready;
}

/** Ondes lumineuses à chaque contact (purement esthétique). */
function useTouchRipples() {
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      const d = document.createElement('div');
      d.className = 'ripple';
      d.style.left = e.clientX + 'px';
      d.style.top = e.clientY + 'px';
      document.body.appendChild(d);
      setTimeout(() => d.remove(), 600);
    };
    addEventListener('pointerdown', onDown, { passive: true });
    return () => removeEventListener('pointerdown', onDown);
  }, []);
}

export default function App() {
  const ready = useBoot();
  useTouchRipples();
  const profile = useGame((s) => s.profile);
  const route = useGame((s) => s.route);
  const opening = useGame((s) => s.opening);
  const toast = useGame((s) => s.toast);
  const refresh = useGame((s) => s.refresh);
  const api = useOnline();
  const [notifs, setNotifs] = useState<AppNotification[]>([]);
  const taps = useRef<number[]>([]);
  const [intro, setIntro] = useState(() => !introSeen());
  useEffect(applyReduceMotion, []);
  useEffect(() => {
    const once = () => { resumeMusicIfWanted(); removeEventListener('pointerdown', once); };
    addEventListener('pointerdown', once);
    return () => removeEventListener('pointerdown', once);
  }, []);

  // Notifications temps réel (en ligne)
  const loadNotifs = useCallback(() => { api?.notifications().then(setNotifs).catch(() => {}); }, [api]);
  useEffect(() => {
    if (!api || !supabase || !profile) return;
    loadNotifs();
    const ch = supabase.channel('me-' + profile.id)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${profile.id}` }, (p) => {
        const n = p.new as { title: string; body: string };
        toast(`${n.title} — ${n.body}`, 'success');
        sfx.coin();
        loadNotifs();
        refresh();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${profile.id}` }, () => refresh())
      .subscribe();
    const onVis = () => document.visibilityState === 'visible' && refresh();
    document.addEventListener('visibilitychange', onVis);
    return () => { supabase!.removeChannel(ch); document.removeEventListener('visibilitychange', onVis); };
  }, [api, profile?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Rappel local quand le booster quotidien devient disponible (app ouverte)
  const lastDaily = profile?.lastDailyAt ?? null;
  useEffect(() => {
    if (!profile) return;
    const { ready: r, msLeft } = dailyStatus(lastDaily);
    if (r) return;
    const t = setTimeout(() => { toast('🎁 Ton booster du jour est prêt !', 'success'); localNotify('🎁 Booster prêt', 'Viens le découper !'); }, Math.min(msLeft, 2 ** 31 - 1));
    return () => clearTimeout(t);
  }, [lastDaily, !!profile]); // eslint-disable-line react-hooks/exhaustive-deps

  // Easter egg : 7 taps sur le logo
  const onLogoTap = () => {
    const now = Date.now();
    taps.current = [...taps.current.filter((t) => now - t < 2500), now];
    sfx.tap();
    if (taps.current.length >= 7) {
      taps.current = [];
      const on = document.body.classList.toggle('prism');
      sfx.reveal(on ? 6 : 1);
      toast(on ? '🌈 Mode Prisme activé' : 'Mode Prisme désactivé', 'success');
    }
  };

  const markRead = useCallback(() => { api?.markNotificationsRead().then(loadNotifs); }, [api, loadNotifs]);

  if (!ready) {
    return (
      <div className="app"><Splash /></div>
    );
  }

  return (
    <div className="app">
      <div className="aurora" />
      <div className="grain" />
      {!profile ? (
        <Welcome />
      ) : (
        <>
          <TopBar unread={notifs.filter((n) => !n.read).length} onLogoTap={onLogoTap} />
          <main className="screen" key={route}>
            {route === 'home' && <Home />}
            {route === 'collection' && <Collection />}
            {route === 'shop' && <Shop />}
            {route === 'trade' && <Trade />}
            {route === 'market' && <Market />}
            {route === 'battle' && <Battle />}
            {(route === 'profile' || route === 'showroom') && <Profile notifs={notifs} onRead={markRead} />}
            {route === 'friends' && <Friends />}
            {route === 'settings' && <Settings />}
          </main>
          <Dock />
          <AnimatePresence>{opening && <PackOpening key="opening" />}</AnimatePresence>
        </>
      )}
      <AnimatePresence>{intro && <Intro key="intro" onDone={() => setIntro(false)} />}</AnimatePresence>
      <Toasts />
    </div>
  );
}
