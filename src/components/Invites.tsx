import { useCallback, useEffect, useState } from 'react';
import type { Invite } from '../engine/types';
import { sfx } from '../lib/fx';
import { inviteLink } from '../lib/invite';
import { useGame } from '../store/game';
import { useOnline } from './OnlineOnly';

const DURATIONS = [{ h: 24, l: '24 h' }, { h: 72, l: '3 jours' }, { h: 168, l: '7 jours' }];

function status(i: Invite) {
  if (i.usedBy) return { t: `Utilisée par ${i.usedBy}`, c: 'var(--ok)' };
  if (i.revoked) return { t: 'Annulée', c: 'var(--dim)' };
  if (new Date(i.expiresAt).getTime() < Date.now()) return { t: 'Expirée', c: 'var(--dim)' };
  const h = Math.max(1, Math.round((new Date(i.expiresAt).getTime() - Date.now()) / 3600000));
  return { t: `En attente · expire dans ${h >= 48 ? Math.round(h / 24) + ' j' : h + ' h'}`, c: 'var(--gold)' };
}

/** Gestion des invitations (administrateur uniquement). */
export function Invites() {
  const api = useOnline();
  const toast = useGame((s) => s.toast);
  const [list, setList] = useState<Invite[]>([]);
  const [hours, setHours] = useState(72);
  const [note, setNote] = useState('');
  const [last, setLast] = useState<string | null>(null);
  const load = useCallback(() => { api?.listInvites().then(setList).catch(() => {}); }, [api]);
  useEffect(load, [load]);

  const copy = async (code: string) => {
    const link = inviteLink(code);
    try {
      if (navigator.share) { await navigator.share({ title: 'ICONIQ', text: 'Je t’invite sur ICONIQ 🃏 (lien personnel, à usage unique)', url: link }); return; }
      await navigator.clipboard.writeText(link); toast('Lien copié ✔', 'success');
    } catch { /* partage annulé */ }
  };
  const create = async () => {
    try {
      const code = await api!.createInvite(hours, note.trim() || undefined);
      sfx.coin(); setLast(code); setNote(''); load(); copy(code);
    } catch (e) { sfx.error(); toast((e as Error).message, 'error'); }
  };
  const revoke = async (code: string) => { try { await api!.revokeInvite(code); load(); } catch (e) { toast((e as Error).message, 'error'); } };

  return (
    <div className="glass" style={{ padding: 14, display: 'grid', gap: 10 }}>
      <p className="sub" style={{ fontSize: 13 }}>Chaque lien ne sert qu’<b>une seule fois</b> : la première personne qui crée son compte avec le garde. Ensuite elle se connecte avec son e-mail, le lien ne marche plus pour personne.</p>
      <input className="field" placeholder="Pour qui ? (optionnel, ex : Toti)" value={note} maxLength={60} onChange={(e) => setNote(e.target.value)} style={{ height: 44 }} />
      <div className="seg">
        {DURATIONS.map((d) => <button key={d.h} className={hours === d.h ? 'on' : ''} onClick={() => setHours(d.h)}>{d.l}</button>)}
      </div>
      <button className="btn gold block" onClick={create}>🎟️ Créer un lien d’invitation</button>
      {last && (
        <div className="invite-link" onClick={() => copy(last)}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{inviteLink(last)}</span>
          <b>Partager</b>
        </div>
      )}
      {list.length > 0 && <div className="sub" style={{ fontSize: 12, fontWeight: 800, marginTop: 6 }}>MES INVITATIONS</div>}
      {list.map((i) => {
        const st = status(i);
        const pending = !i.usedBy && !i.revoked && new Date(i.expiresAt).getTime() > Date.now();
        return (
          <div key={i.code} className="row" style={{ justifyContent: 'space-between', padding: '8px 0', borderTop: '1px solid var(--stroke)' }}>
            <div style={{ minWidth: 0 }}>
              <b style={{ fontSize: 14 }}>{i.note || 'Invitation'}</b>
              <div style={{ fontSize: 12, color: st.c }}>{st.t}</div>
            </div>
            {pending && (
              <div className="row" style={{ gap: 6 }}>
                <button className="btn ghost sm" onClick={() => copy(i.code)}>Partager</button>
                <button className="btn ghost sm" onClick={() => revoke(i.code)}>Annuler</button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
