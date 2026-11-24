import { supabase } from './supabase';

/** Le jeu publié est sur invitation : pas de mode local (sauf démo / serveur absent). */
export const inviteOnly = () => !!supabase && !import.meta.env.VITE_EMBED;

const KEY = 'iconiq-invite';
/** lit ?invite=CODE dans l'adresse, le garde le temps de l'inscription et nettoie l'URL */
export function readInvite(): string | null {
  try {
    const u = new URL(location.href);
    const c = u.searchParams.get('invite');
    if (c) {
      sessionStorage.setItem(KEY, c);
      u.searchParams.delete('invite');
      history.replaceState(null, '', u.pathname + u.search + u.hash);
      return c;
    }
    return sessionStorage.getItem(KEY);
  } catch { return null; }
}
export const clearInvite = () => { try { sessionStorage.removeItem(KEY); } catch { /* */ } };

export type InviteStatus = 'first' | 'valid' | 'used' | 'expired' | 'revoked' | 'unknown';
export async function checkInvite(code: string | null): Promise<InviteStatus> {
  if (!supabase) return 'unknown';
  const { data, error } = await supabase.rpc('check_invite', { p_code: code ?? '' });
  if (error) return 'unknown';
  return data as InviteStatus;
}
export const inviteLink = (code: string) => `${location.origin}/?invite=${encodeURIComponent(code)}`;
