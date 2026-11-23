import { useEffect, useMemo, useState } from 'react';
import { RARITY } from '../config/game';
import { VARIANTS, VARIANT_BY_ID } from '../data/catalog';
import { collectionScore } from '../engine/rules';
import type { AppNotification, LeaderRow } from '../engine/types';
import { useOnline } from '../components/OnlineOnly';
import { isMuted, setMuted, sfx } from '../lib/fx';
import { canInstall, onInstallChange, promptInstall } from '../lib/install';
import { enablePush, isStandalone } from '../lib/push';
import { supabase } from '../lib/supabase';
import { enableGyro } from '../lib/tilt';
import { useGame } from '../store/game';

export function Profile({ notifs, onRead }: { notifs: AppNotification[]; onRead(): void }) {
  const profile = useGame((s) => s.profile)!;
  const cards = useGame((s) => s.cards);
  const backend = useGame((s) => s.backend)!;
  const toast = useGame((s) => s.toast);
  const signOut = useGame((s) => s.signOut);
  const setProfile = useGame((s) => s.setProfile);
  const go = useGame((s) => s.go);
  const api = useOnline();
  const [name, setName] = useState(profile.username);
  const [board, setBoard] = useState<LeaderRow[]>([]);
  const [muted, setMutedS] = useState(isMuted());
  const [confirmReset, setConfirmReset] = useState(false);
  const resetLocal = useGame((s) => s.resetLocal);
  const [, force] = useState(0);
  useEffect(() => { const off = onInstallChange(() => force((x) => x + 1)); return () => { off(); }; }, []);
  useEffect(() => { api?.leaderboard().then(setBoard).catch(() => {}); }, [api]);
  useEffect(() => { if (notifs.some((n) => !n.read)) onRead(); }, [notifs, onRead]);

  const stats = useMemo(() => {
    const uniq = new Set(cards.map((c) => c.variantId));
    const byR = new Map<string, number>();
    for (const c of cards) { const r = VARIANT_BY_ID[c.variantId].rarity; byR.set(r, (byR.get(r) ?? 0) + 1); }
    return { uniq: uniq.size, score: collectionScore(uniq), byR };
  }, [cards]);

  const save = async () => {
    try { setProfile(await backend.setUsername(name)); sfx.coin(); toast('Pseudo mis à jour', 'success'); }
    catch (e) { sfx.error(); toast((e as Error).message, 'error'); }
  };

  const logout = async () => {
    if (backend.mode === 'online') await supabase?.auth.signOut();
    signOut(); go('home');
  };

  return (
    <div className="wrap">
      <h1 className="h1">Profil</h1>
      <div className="row" style={{ marginTop: 12 }}>
        <input className="field" value={name} maxLength={20} onChange={(e) => setName(e.target.value)} />
        <button className="btn" onClick={save} disabled={name === profile.username}>OK</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginTop: 14 }}>
        {[['Packs', profile.packsOpened], ['Cartes', `${stats.uniq}/${VARIANTS.length}`], ['Score', stats.score.toLocaleString('fr-FR')]].map(([k, v]) => (
          <div key={k} className="glass" style={{ padding: 12, textAlign: 'center' }}>
            <div className="num" style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18 }}>{v}</div>
            <div className="sub" style={{ fontSize: 11 }}>{k}</div>
          </div>
        ))}
      </div>
      <div className="wrap-row" style={{ marginTop: 10 }}>
        {Object.values(RARITY).map((r) => (
          <span key={r.id} className="pill" style={{ height: 28, fontSize: 12, color: r.color }}>● <span style={{ color: '#fff' }}>{stats.byR.get(r.id) ?? 0}</span></span>
        ))}
      </div>

      {api && (
        <>
          <h2 className="h2">🔔 Notifications</h2>
          {!notifs.length ? <p className="sub">Rien de neuf.</p> : notifs.slice(0, 15).map((n) => (
            <div key={n.id} className="glass" style={{ padding: 12, marginBottom: 8 }}>
              <div style={{ fontWeight: 800 }}>{n.title}</div>
              <div className="sub" style={{ fontSize: 13 }}>{n.body}</div>
            </div>
          ))}

          <h2 className="h2">🏆 Classement</h2>
          <div className="glass" style={{ padding: 8 }}>
            {board.map((r, i) => (
              <div key={r.username} className="row" style={{ padding: '8px 8px', borderBottom: '1px solid var(--stroke)', background: r.username === profile.username ? 'rgba(139,92,255,.15)' : 'none', borderRadius: 8 }}>
                <b style={{ width: 28, color: i < 3 ? ['#ffd34d', '#d7dde6', '#e0915a'][i] : 'var(--muted)' }}>{i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1}</b>
                <span style={{ flex: 1, fontWeight: 700 }}>{r.username}</span>
                <span className="num sub">{r.unique} cartes</span>
                <b className="num" style={{ width: 80, textAlign: 'right' }}>{r.score.toLocaleString('fr-FR')}</b>
              </div>
            ))}
            {!board.length && <p className="sub" style={{ padding: 8 }}>Pas encore de classement.</p>}
          </div>
        </>
      )}

      <h2 className="h2">⚙️ Réglages</h2>
      <div style={{ display: 'grid', gap: 10 }}>
        <button className="btn ghost block" onClick={async () => { toast(await enablePush()); }}>🔔 Activer les notifications</button>
        <button className="btn ghost block" onClick={async () => toast((await enableGyro()) ? '📱 Bouge ton téléphone : les cartes brillent !' : 'Gyroscope indisponible')}>📱 Effet holo au gyroscope</button>
        <button className="btn ghost block" onClick={() => { setMuted(!muted); setMutedS(!muted); if (muted) sfx.coin(); }}>{muted ? '🔇 Sons coupés' : '🔊 Sons activés'}</button>
        {canInstall() && <button className="btn block" onClick={promptInstall}>📲 Installer l’application</button>}
        {!isStandalone() && /iPhone|iPad/.test(navigator.userAgent) && (
          <p className="sub" style={{ fontSize: 13 }}>📲 Sur iPhone : touche Partager puis « Sur l’écran d’accueil » pour installer ICONIQ.</p>
        )}
        {backend.mode === 'local' && (confirmReset ? (
          <div className="glass" style={{ padding: 14, display: 'grid', gap: 10 }}>
            <b>Effacer toutes tes cartes, crédits et éclats de ce mode local ?</b>
            <div className="row">
              <button className="btn ghost sm" style={{ flex: 1 }} onClick={() => setConfirmReset(false)}>Annuler</button>
              <button className="btn danger sm" style={{ flex: 1 }} onClick={async () => { await resetLocal(); setConfirmReset(false); toast('Progression réinitialisée', 'success'); go('home'); }}>Tout effacer</button>
            </div>
          </div>
        ) : (
          <button className="btn ghost block" onClick={() => setConfirmReset(true)}>🗑️ Réinitialiser ma progression</button>
        ))}
        <button className="btn danger block" onClick={logout}>{backend.mode === 'online' ? 'Se déconnecter' : 'Quitter le mode local'}</button>
      </div>
      <p className="sub" style={{ textAlign: 'center', fontSize: 11, marginTop: 24 }}>ICONIQ · {backend.mode === 'online' ? 'Sauvegarde serveur automatique' : 'Sauvegarde locale automatique'} · v1.0</p>
    </div>
  );
}
