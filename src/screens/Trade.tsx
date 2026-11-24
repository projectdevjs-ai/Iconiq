import { motion } from 'framer-motion';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { RARITY } from '../config/game';
import { VARIANT_BY_ID } from '../data/catalog';
import type { PublicCard, TradeOffer } from '../engine/types';
import { Card } from '../components/Card';
import { OnlineOnly, useOnline } from '../components/OnlineOnly';
import { Sheet } from '../components/Shell';
import { sfx } from '../lib/fx';
import { supabase } from '../lib/supabase';
import { useGame } from '../store/game';

function MiniCards({ cards }: { cards: { uid: string; variantId: string; serial: number | null }[] }) {
  if (!cards.length) return <span className="sub" style={{ fontSize: 12 }}>—</span>;
  return (
    <div className="row" style={{ flexWrap: 'wrap', gap: 6 }}>
      {cards.map((c) => <div key={c.uid} style={{ width: 54 }}><Card variantId={c.variantId} serial={c.serial} interactive={false} /></div>)}
    </div>
  );
}

function Picker({ cards, selected, toggle }: { cards: PublicCard[]; selected: Set<string>; toggle(uid: string): void }) {
  const sorted = [...cards].filter((c) => !c.locked).sort((a, b) => RARITY[VARIANT_BY_ID[b.variantId]?.rarity ?? 'commune'].rank - RARITY[VARIANT_BY_ID[a.variantId]?.rarity ?? 'commune'].rank);
  if (!sorted.length) return <p className="sub">Aucune carte disponible.</p>;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(78px, 1fr))', gap: 8, maxHeight: 280, overflowY: 'auto', padding: 4 }}>
      {sorted.map((c) => (
        <button key={c.uid} onClick={() => { sfx.tap(); toggle(c.uid); }} style={{ position: 'relative', opacity: selected.has(c.uid) ? 1 : 0.55, transform: selected.has(c.uid) ? 'scale(1.04)' : 'none', transition: 'all .2s', outline: selected.has(c.uid) ? '2px solid var(--accent-2)' : 'none', borderRadius: 6 }}>
          <Card variantId={c.variantId} serial={c.serial} interactive={false} />
          {selected.has(c.uid) && <span style={{ position: 'absolute', top: 4, right: 4, background: 'var(--accent-2)', color: '#000', borderRadius: 10, width: 20, height: 20, fontWeight: 900, fontSize: 12, display: 'grid', placeItems: 'center' }}>✓</span>}
        </button>
      ))}
    </div>
  );
}

export function Trade() {
  const api = useOnline();
  const profile = useGame((s) => s.profile)!;
  const cards = useGame((s) => s.cards);
  const toast = useGame((s) => s.toast);
  const refresh = useGame((s) => s.refresh);
  const [trades, setTrades] = useState<TradeOffer[]>([]);
  const param = useGame((s) => s.routeParam);
  const [open, setOpen] = useState(!!param);
  const [target, setTarget] = useState(param ?? '');
  const [theirs, setTheirs] = useState<PublicCard[] | null>(null);
  const [offer, setOffer] = useState<Set<string>>(new Set());
  const [request, setRequest] = useState<Set<string>>(new Set());
  const [offerShards, setOfferShards] = useState('');
  const [requestShards, setRequestShards] = useState('');

  const load = useCallback(async () => { if (api) setTrades(await api.listTrades()); }, [api]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!supabase || !api) return;
    const ch = supabase.channel('trades-' + profile.id).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${profile.id}` }, () => load()).subscribe();
    return () => { supabase!.removeChannel(ch); };
  }, [api, profile.id, load]);

  const mine = useMemo(() => cards.map((c) => ({ uid: c.uid, variantId: c.variantId, serial: c.serial, locked: c.locked })), [cards]);
  if (!api) return <div className="wrap"><h1 className="h1">Échanges</h1><OnlineOnly what="L'échange de cartes" /></div>;

  const toggle = (set: Set<string>, setter: (s: Set<string>) => void) => (uid: string) => {
    const n = new Set(set);
    n.has(uid) ? n.delete(uid) : n.size < 10 && n.add(uid);
    setter(n);
  };

  const lookup = async () => {
    try {
      const c = await api.publicCollection(target.trim());
      if (!c.length) toast('Joueur introuvable ou collection vide', 'error');
      setTheirs(c); setRequest(new Set());
    } catch (e) { toast((e as Error).message, 'error'); }
  };

  const send = async () => {
    try {
      await api.createTrade({ toUsername: target.trim(), offerUids: [...offer], requestUids: [...request], offerShards: +offerShards || 0, requestShards: +requestShards || 0 });
      sfx.coin(); toast('Offre envoyée 🚀', 'success');
      setOpen(false); setOffer(new Set()); setRequest(new Set()); setTheirs(null); setTarget(''); setOfferShards(''); setRequestShards('');
      load(); refresh();
    } catch (e) { sfx.error(); toast((e as Error).message, 'error'); }
  };

  const act = async (fn: () => Promise<void>, ok: string) => {
    try { await fn(); sfx.coin(); toast(ok, 'success'); load(); refresh(); } catch (e) { sfx.error(); toast((e as Error).message, 'error'); }
  };

  const pending = trades.filter((t) => t.status === 'pending');
  const done = trades.filter((t) => t.status !== 'pending');

  return (
    <div className="wrap">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h1 className="h1">Échanges</h1>
        <button className="btn sm" onClick={() => { sfx.tap(); setOpen(true); }}>＋ Proposer</button>
      </div>
      <p className="sub">Échange des cartes et des éclats avec tes amis. Les cartes proposées sont bloquées jusqu’à la réponse.</p>

      <h2 className="h2">En attente</h2>
      {!pending.length && <div className="empty"><div className="big">🤝</div>Aucun échange en cours.</div>}
      {pending.map((t) => {
        const incoming = t.toUser === profile.id;
        return (
          <motion.div key={t.id} layout className="glass" style={{ padding: 14, marginBottom: 12 }} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <div style={{ fontWeight: 800, marginBottom: 10 }}>{incoming ? `📥 ${t.fromName} te propose` : `📤 Envoyé à ${t.toName}`}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 10, alignItems: 'center' }}>
              <div><div className="sub" style={{ fontSize: 11, marginBottom: 6 }}>{incoming ? 'TU REÇOIS' : 'TU DONNES'}</div><MiniCards cards={t.offerCards} />{t.offerShards > 0 && <div style={{ marginTop: 6, color: 'var(--accent-2)', fontWeight: 800 }}>+{t.offerShards} ✦</div>}</div>
              <div style={{ fontSize: 22 }}>⇄</div>
              <div><div className="sub" style={{ fontSize: 11, marginBottom: 6 }}>{incoming ? 'TU DONNES' : 'TU REÇOIS'}</div><MiniCards cards={t.requestCards} />{t.requestShards > 0 && <div style={{ marginTop: 6, color: 'var(--accent-2)', fontWeight: 800 }}>+{t.requestShards} ✦</div>}</div>
            </div>
            <div className="row" style={{ marginTop: 12, justifyContent: 'flex-end' }}>
              {incoming ? (
                <>
                  <button className="btn ghost sm" onClick={() => act(() => api.respondTrade(t.id, false), 'Refusé')}>Refuser</button>
                  <button className="btn sm" onClick={() => act(() => api.respondTrade(t.id, true), '🤝 Échange conclu !')}>Accepter</button>
                </>
              ) : (
                <button className="btn ghost sm" onClick={() => act(() => api.cancelTrade(t.id), 'Offre annulée')}>Annuler</button>
              )}
            </div>
          </motion.div>
        );
      })}

      {done.length > 0 && <h2 className="h2">Historique (7 jours)</h2>}
      {done.map((t) => (
        <div key={t.id} className="glass" style={{ padding: 12, marginBottom: 8, display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
          <span>{t.fromName} → {t.toName}</span>
          <span style={{ color: t.status === 'accepted' ? 'var(--ok)' : 'var(--muted)', fontWeight: 700 }}>{{ accepted: 'Accepté', declined: 'Refusé', cancelled: 'Annulé', pending: '' }[t.status]}</span>
        </div>
      ))}

      <Sheet open={open} onClose={() => setOpen(false)}>
        <h2 className="h1" style={{ fontSize: 24 }}>Nouvelle proposition</h2>
        <div className="row" style={{ marginTop: 12 }}>
          <input className="field" placeholder="Pseudo du joueur" value={target} onChange={(e) => setTarget(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && lookup()} />
          <button className="btn" onClick={lookup} disabled={target.trim().length < 3}>Voir</button>
        </div>
        {theirs && (
          <>
            <h3 className="h2" style={{ fontSize: 15 }}>Tu demandes ({request.size}/10)</h3>
            <Picker cards={theirs} selected={request} toggle={toggle(request, setRequest)} />
            <input className="field" inputMode="numeric" placeholder="+ éclats demandés (optionnel)" value={requestShards} onChange={(e) => setRequestShards(e.target.value.replace(/\D/g, ''))} style={{ marginTop: 8, height: 42 }} />
            <h3 className="h2" style={{ fontSize: 15 }}>Tu offres ({offer.size}/10)</h3>
            <Picker cards={mine} selected={offer} toggle={toggle(offer, setOffer)} />
            <input className="field" inputMode="numeric" placeholder={`+ éclats offerts (tu as ${profile.shards})`} value={offerShards} onChange={(e) => setOfferShards(e.target.value.replace(/\D/g, ''))} style={{ marginTop: 8, height: 42 }} />
            <button className="btn block" style={{ marginTop: 16 }} disabled={!offer.size && !request.size} onClick={send}>Envoyer l’offre</button>
          </>
        )}
      </Sheet>
    </div>
  );
}
