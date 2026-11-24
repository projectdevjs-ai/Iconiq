import { useEffect, useMemo, useState } from 'react';
import { ACHIEVEMENTS, rewardState, rewardText } from '../engine/rewards';
import { Card } from '../components/Card';
import { Sheet } from '../components/Shell';
import { Invites } from '../components/Invites';
import { musicWanted, setMusic } from '../lib/music';
import type { PublicProfile } from '../engine/types';
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
  const [music, setMusicS] = useState(musicWanted());
  const [boardTab, setBoardTab] = useState<'all' | 'week'>('week');
  const [week, setWeek] = useState<LeaderRow[]>([]);
  const [pub, setPub] = useState<PublicProfile | null>(null);
  const [picking, setPicking] = useState(false);
  const claim = useGame((s) => s.claim);
  const setShowcase = useGame((s) => s.setShowcase);
  useEffect(() => { api?.weeklyLeaderboard().then(setWeek).catch(() => {}); }, [api]);
  const openPublic = async (u: string) => { sfx.tap(); try { setPub((await api?.publicProfile(u)) ?? null); } catch { /* */ } };
  const showcase = profile.progress.showcase.map((u) => cards.find((c) => c.uid === u)).filter(Boolean) as typeof cards;
  const uniqueCards = useMemo(() => {
    const seen = new Set<string>();
    return [...cards].sort((a, b) => RARITY[VARIANT_BY_ID[b.variantId].rarity].rank - RARITY[VARIANT_BY_ID[a.variantId].rarity].rank)
      .filter((c) => (seen.has(c.variantId) ? false : (seen.add(c.variantId), true)));
  }, [cards]);
  const toggleShow = (uid: string) => {
    const cur = profile.progress.showcase;
    const next = cur.includes(uid) ? cur.filter((u) => u !== uid) : [...cur, uid].slice(-3);
    sfx.tap(); setShowcase(next);
  };
  const achReady = ACHIEVEMENTS.filter((a) => { const st = rewardState('ach:' + a.id, profile, profile.progress, cards); return st.done && !st.claimed; }).length;
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
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h1 className="h1">Profil</h1>
        <div className="row" style={{ gap: 8 }}>
          <button className="btn ghost sm" onClick={() => { sfx.tap(); go('friends'); }}>👥 Amis</button>
          <button className="btn ghost sm" onClick={() => { sfx.tap(); go('settings'); }}>⚙️ Réglages</button>
        </div>
      </div>
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

      {api && profile.isAdmin && (
        <>
          <h2 className="h2">🎟️ Inviter des joueurs</h2>
          <Invites />
        </>
      )}

      <h2 className="h2">✨ Ma vitrine</h2>
      <div className="showcase">
        {[0, 1, 2].map((i) => showcase[i]
          ? <div key={i} className="showcase-slot"><Card variantId={showcase[i].variantId} serial={showcase[i].serial} /></div>
          : <button key={i} className="showcase-slot empty-slot" onClick={() => setPicking(true)}>＋</button>)}
      </div>
      <button className="btn ghost sm" style={{ marginTop: 10 }} onClick={() => setPicking(true)} disabled={!cards.length}>Choisir mes 3 cartes</button>

      <h2 className="h2">🏅 Succès {achReady > 0 && <span className="badge-dot" style={{ position: 'static' }}>{achReady}</span>}</h2>
      <div className="ach-grid">
        {ACHIEVEMENTS.map((a) => {
          const st = rewardState('ach:' + a.id, profile, profile.progress, cards);
          return (
            <div key={a.id} className={`ach ${st.claimed ? 'claimed' : st.done ? 'ready' : ''}`}>
              <div className="ach-ico">{a.icon}</div>
              <b style={{ fontSize: 13 }}>{a.label}</b>
              <div className="sub" style={{ fontSize: 11 }}>{a.desc}</div>
              <div className="bar" style={{ height: 4, width: '100%' }}><i style={{ width: `${(st.value / st.goal) * 100}%` }} /></div>
              {st.claimed ? <span className="sub" style={{ fontSize: 11 }}>✓ obtenu</span>
                : <button className={`btn sm ${st.done ? 'gold' : 'ghost'}`} style={{ height: 30, fontSize: 11, padding: '0 8px' }} disabled={!st.done} onClick={() => claim('ach:' + a.id)}>{rewardText(a.reward)}</button>}
            </div>
          );
        })}
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
          <div className="seg" style={{ marginBottom: 10 }}>
            <button className={boardTab === 'week' ? 'on' : ''} onClick={() => setBoardTab('week')}>Cette semaine</button>
            <button className={boardTab === 'all' ? 'on' : ''} onClick={() => setBoardTab('all')}>Tout le temps</button>
          </div>
          <div className="glass" style={{ padding: 8 }}>
            {(boardTab === 'week' ? week : board).map((r, i) => (
              <div key={r.username} onClick={() => openPublic(r.username)} className="row" style={{ cursor: 'pointer', padding: '8px 8px', borderBottom: '1px solid var(--stroke)', background: r.username === profile.username ? 'rgba(139,92,255,.15)' : 'none', borderRadius: 8 }}>
                <b style={{ width: 28, color: i < 3 ? ['#ffd34d', '#d7dde6', '#e0915a'][i] : 'var(--muted)' }}>{i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1}</b>
                <span style={{ flex: 1, fontWeight: 700 }}>{r.username}</span>
                <span className="num sub">{r.unique} cartes</span>
                <b className="num" style={{ width: 80, textAlign: 'right' }}>{r.score.toLocaleString('fr-FR')}</b>
              </div>
            ))}
            {!(boardTab === 'week' ? week : board).length && <p className="sub" style={{ padding: 8 }}>Pas encore de classement.</p>}
          </div>
        </>
      )}

      <p className="sub" style={{ textAlign: 'center', fontSize: 11, marginTop: 24 }}>ICONIQ · {backend.mode === 'online' ? 'Sauvegarde serveur automatique' : 'Sauvegarde locale automatique'} · v1.0</p>
      <Sheet open={picking} onClose={() => setPicking(false)}>
        <h2 className="h1" style={{ fontSize: 22 }}>Ma vitrine</h2>
        <p className="sub">Choisis jusqu’à 3 cartes à montrer sur ton profil. Elles sont protégées du recyclage automatique.</p>
        <div className="grid" style={{ marginTop: 14, gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))' }}>
          {uniqueCards.map((c) => {
            const on = profile.progress.showcase.includes(c.uid) || showcase.some((s) => s.variantId === c.variantId && profile.progress.showcase.includes(s.uid));
            return (
              <button key={c.uid} onClick={() => toggleShow(c.uid)} style={{ position: 'relative', opacity: on ? 1 : 0.6, outline: on ? '2px solid var(--gold)' : 'none', borderRadius: 6 }}>
                <Card variantId={c.variantId} serial={c.serial} interactive={false} />
                {on && <span className="badge-dot" style={{ top: 4, right: 4, background: 'var(--gold)', color: '#000' }}>★</span>}
              </button>
            );
          })}
        </div>
        <button className="btn block" style={{ marginTop: 16 }} onClick={() => setPicking(false)}>Terminé</button>
      </Sheet>

      <Sheet open={!!pub} onClose={() => setPub(null)}>
        {pub && (
          <div style={{ textAlign: 'center' }}>
            <h2 className="h1" style={{ fontSize: 24 }}>{pub.username}</h2>
            <p className="sub">{pub.packsOpened} packs ouverts · {pub.unique} cartes différentes</p>
            <div className="showcase" style={{ marginTop: 16 }}>
              {pub.showcase.length ? pub.showcase.map((c, i) => <div key={i} className="showcase-slot"><Card variantId={c.variantId} serial={c.serial} /></div>)
                : <p className="sub">Vitrine vide.</p>}
            </div>
          </div>
        )}
      </Sheet>
    </div>
  );
}
