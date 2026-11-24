import { supabase } from '../lib/supabase';
import type { RarityId } from '../config/game';
import type { Backend, Currency, FeedItem, Friend, Invite, LeaderRow, Listing, OnlineFeatures, OwnedCard, PackResult, Profile, PublicProfile, Reward } from './types';

type RawPack = { cards: (OwnedCard & { isNew: boolean })[]; profile: Profile };
function norm(r: RawPack | null | undefined): PackResult | undefined {
  if (!r) return undefined;
  return { cards: r.cards, newVariantIds: [...new Set(r.cards.filter((c) => c.isNew).map((c) => c.variantId))], profile: r.profile };
}

async function rpc<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase!.rpc(fn, args);
  if (error) throw new Error(error.message.replace(/^.*?:\s*/, '') || 'Erreur serveur');
  return data as T;
}

/** Mode EN LIGNE : le serveur est l'autorité unique (tirages, soldes, inventaire). */
export class OnlineBackend implements Backend, OnlineFeatures {
  mode = 'online' as const;

  load() { return rpc<{ profile: Profile; cards: OwnedCard[] }>('get_state'); }

  async openPack(packId: string, currency: Currency, count = 1) {
    const r = await rpc<RawPack>('open_pack', { p_pack: packId, p_currency: currency, p_count: count });
    return norm(r)!;
  }
  async claim(key: string) {
    return rpc<{ reward: Reward; profile: Profile }>('claim_reward', { p_key: key });
  }
  async spinWheel() {
    const r = await rpc<{ index: number; reward: Reward; profile: Profile; pack: RawPack | null }>('spin_wheel');
    return { ...r, pack: norm(r.pack) };
  }
  setShowcase(uids: string[]) { return rpc<Profile>('set_showcase', { p_uids: uids }); }
  feed() { return rpc<FeedItem[]>('list_feed'); }
  publicProfile(username: string) { return rpc<PublicProfile | null>('public_profile', { p_username: username }); }
  weeklyLeaderboard() { return rpc<LeaderRow[]>('leaderboard_week'); }
  createInvite(hours: number, note?: string) { return rpc<string>('create_invite', { p_hours: hours, p_note: note ?? null }); }
  listInvites() { return rpc<Invite[]>('list_invites'); }
  async revokeInvite(code: string) { await rpc('revoke_invite', { p_code: code }); }
  friends() { return rpc<Friend[]>('list_friends'); }
  addFriend(username: string) { return rpc<'sent' | 'accepted'>('send_friend_request', { p_username: username }); }
  async respondFriend(id: string, accept: boolean) { await rpc('respond_friend', { p_id: id, p_accept: accept }); }
  async removeFriend(id: string) { await rpc('remove_friend', { p_id: id }); }
  async deleteAccount() { await rpc('delete_my_account', { p_confirm: 'SUPPRIMER' }); await supabase!.auth.signOut(); }
  recycleDuplicates(maxRarity: RarityId) { return rpc<{ gained: number; removed: string[]; profile: Profile }>('recycle_duplicates', { p_max_rarity: maxRarity }); }
  recycleCard(uid: string) { return rpc<{ gained: number; profile: Profile }>('recycle_card', { p_uid: uid }); }
  craft(variantId: string) { return rpc<{ card: OwnedCard; profile: Profile }>('craft_card', { p_variant: variantId }); }
  setUsername(name: string) { return rpc<Profile>('set_username', { p_name: name }); }

  listTrades() { return rpc<any[]>('list_trades'); }
  async createTrade(i: { toUsername: string; offerUids: string[]; requestUids: string[]; offerShards: number; requestShards: number }) {
    await rpc('create_trade', { p_to: i.toUsername, p_offer: i.offerUids, p_request: i.requestUids, p_offer_shards: i.offerShards, p_request_shards: i.requestShards });
  }
  async respondTrade(id: string, accept: boolean) { await rpc('respond_trade', { p_id: id, p_accept: accept }); }
  async cancelTrade(id: string) { await rpc('cancel_trade', { p_id: id }); }
  publicCollection(username: string) { return rpc<any[]>('public_collection', { p_username: username }); }
  listMarket(f?: { rarity?: RarityId; characterId?: string }) {
    return rpc<Listing[]>('list_market', { p_rarity: f?.rarity ?? null, p_character: f?.characterId ?? null, p_mine: false });
  }
  myListings() { return rpc<Listing[]>('list_market', { p_rarity: null, p_character: null, p_mine: true }); }
  async createListing(uid: string, price: number) { await rpc('market_list', { p_uid: uid, p_price: price }); }
  async cancelListing(id: string) { await rpc('market_cancel', { p_id: id }); }
  async buyListing(id: string) { await rpc('market_buy', { p_id: id }); }
  leaderboard() { return rpc<any[]>('leaderboard'); }
  async notifications() {
    const { data } = await supabase!.from('notifications').select('*').order('created_at', { ascending: false }).limit(50);
    return (data ?? []).map((n) => ({ id: String(n.id), title: n.title, body: n.body, url: n.url, read: n.read, createdAt: n.created_at }));
  }
  async markNotificationsRead() { await rpc('mark_notifications_read'); }
  async checkout(bundleId: string) {
    const { data, error } = await supabase!.functions.invoke('create-checkout', { body: { bundleId, returnUrl: location.origin } });
    if (error || !data?.url) throw new Error(data?.error ?? error?.message ?? 'Paiement indisponible');
    return data.url as string;
  }
}
