import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useState } from 'react';
import { Card } from '../components/Card';
import { OnlineOnly, useOnline } from '../components/OnlineOnly';
import { Sheet } from '../components/Shell';
import type { Friend, PublicProfile } from '../engine/types';
import { sfx } from '../lib/fx';
import { useGame } from '../store/game';

export function Friends() {
  const api = useOnline();
  const toast = useGame((s) => s.toast);
  const go = useGame((s) => s.go);
  const [list, setList] = useState<Friend[] | null>(null);
  const [name, setName] = useState('');
  const [view, setView] = useState<{ f: Friend; p: PublicProfile | null } | null>(null);
  const load = useCallback(() => { api?.friends().then(setList).catch(() => setList([])); }, [api]);
  useEffect(load, [load]);

  if (!api) return <div className="wrap"><button className="sub" onClick={() => go('profile')}>← Profil</button><h1 className="h1">Amis</h1><OnlineOnly what="Les amis" /></div>;

  const act = async (fn: () => Promise<unknown>, ok?: string) => {
    try { await fn(); if (ok) { sfx.coin(); toast(ok, 'success'); } load(); } catch (e) { sfx.error(); toast((e as Error).message, 'error'); }
  };
  const add = () => act(async () => { const r = await api.addFriend(name.trim()); setName(''); toast(r === 'accepted' ? '🤝 Vous êtes maintenant amis !' : '👋 Demande envoyée', 'success'); });
  const open = async (f: Friend) => { sfx.tap(); setView({ f, p: null }); try { setView({ f, p: await api.publicProfile(f.username) }); } catch { /* */ } };

  const incoming = list?.filter((f) => f.status === 'pending' && f.direction === 'in') ?? [];
  const outgoing = list?.filter((f) => f.status === 'pending' && f.direction === 'out') ?? [];
  const friends = list?.filter((f) => f.status === 'accepted') ?? [];

  return (
    <div className="wrap">
      <button className="sub" onClick={() => go('profile')}>← Profil</button>
      <h1 className="h1" style={{ marginTop: 6 }}>Amis</h1>

      <div className="row" style={{ marginTop: 12 }}>
        <input className="field" placeholder="Pseudo de ton ami" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && name.trim().length >= 3 && add()} />
        <button className="btn" disabled={name.trim().length < 3} onClick={add}>Ajouter</button>
      </div>

      {incoming.length > 0 && <>
        <h2 className="h2">📥 Demandes reçues <span className="badge-dot" style={{ position: 'static' }}>{incoming.length}</span></h2>
        <div className="glass" style={{ padding: 6 }}>
          {incoming.map((f) => (
            <div key={f.id} className="friend">
              <span className="avatar">{f.username[0]?.toUpperCase()}</span>
              <b style={{ flex: 1 }}>{f.username}</b>
              <button className="btn ghost sm" onClick={() => act(() => api.respondFriend(f.id, false))}>Refuser</button>
              <button className="btn sm" onClick={() => act(() => api.respondFriend(f.id, true), `🤝 ${f.username} est ton ami`)}>Accepter</button>
            </div>
          ))}
        </div>
      </>}

      <h2 className="h2">👥 Mes amis {friends.length > 0 && <span className="sub" style={{ fontSize: 14 }}>({friends.length})</span>}</h2>
      {list === null ? <div className="empty">Chargement…</div> : !friends.length ? (
        <div className="empty"><div className="big">🫂</div>Pas encore d’ami. Ajoute quelqu’un avec son pseudo !</div>
      ) : (
        <div className="glass" style={{ padding: 6 }}>
          <AnimatePresence>
            {friends.map((f) => (
              <motion.button key={f.id} layout className="friend" onClick={() => open(f)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <span className="avatar">{f.username[0]?.toUpperCase()}</span>
                <span style={{ flex: 1, textAlign: 'left' }}><b>{f.username}</b><span className="sub" style={{ display: 'block', fontSize: 12 }}>{f.unique} cartes · {f.packsOpened} packs</span></span>
                <span className="sub">›</span>
              </motion.button>
            ))}
          </AnimatePresence>
        </div>
      )}

      {outgoing.length > 0 && <>
        <h2 className="h2">📤 En attente</h2>
        <div className="glass" style={{ padding: 6 }}>
          {outgoing.map((f) => (
            <div key={f.id} className="friend">
              <span className="avatar">{f.username[0]?.toUpperCase()}</span>
              <b style={{ flex: 1 }}>{f.username}</b>
              <button className="btn ghost sm" onClick={() => act(() => api.removeFriend(f.id))}>Annuler</button>
            </div>
          ))}
        </div>
      </>}

      <Sheet open={!!view} onClose={() => setView(null)}>
        {view && (
          <div style={{ textAlign: 'center' }}>
            <span className="avatar big">{view.f.username[0]?.toUpperCase()}</span>
            <h2 className="h1" style={{ fontSize: 24, marginTop: 8 }}>{view.f.username}</h2>
            <p className="sub">{view.f.unique} cartes différentes · {view.f.packsOpened} packs ouverts</p>
            <div className="showcase" style={{ marginTop: 16 }}>
              {view.p?.showcase.length ? view.p.showcase.map((c, i) => <div key={i} className="showcase-slot"><Card variantId={c.variantId} serial={c.serial} /></div>)
                : <p className="sub" style={{ gridColumn: '1 / -1' }}>{view.p ? 'Vitrine vide.' : 'Chargement…'}</p>}
            </div>
            <div style={{ display: 'grid', gap: 10, marginTop: 20 }}>
              <button className="btn block" onClick={() => { setView(null); go('trade', view.f.username); }}>🔁 Proposer un échange</button>
              <button className="btn ghost block" style={{ color: 'var(--danger)' }} onClick={() => { act(() => api.removeFriend(view.f.id), 'Ami retiré'); setView(null); }}>Retirer de mes amis</button>
            </div>
          </div>
        )}
      </Sheet>
    </div>
  );
}
