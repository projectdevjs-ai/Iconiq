import { RARITY } from '../config/game';
import { CHARACTERS, VARIANTS, VARIANT_BY_ID } from '../data/catalog';
import type { OwnedCard, Profile } from './types';

/**
 * Récompenses : quêtes du jour, succès, album, roue.
 * Source unique : le seed serveur est généré depuis ce fichier (npm run seed),
 * et le serveur revalide tout (fonction SQL claim_reward / spin_wheel).
 */
export interface Reward { credits?: number; shards?: number; freePack?: boolean }

export type QuestStat = 'packs' | 'recycled' | 'daily';
export const QUESTS: { id: string; label: string; stat: QuestStat; goal: number; reward: Reward }[] = [
  { id: 'daily', label: 'Découper le booster du jour', stat: 'daily', goal: 1, reward: { shards: 50 } },
  { id: 'open3', label: 'Ouvrir 3 packs', stat: 'packs', goal: 3, reward: { credits: 200 } },
  { id: 'recycle5', label: 'Recycler 5 doubles', stat: 'recycled', goal: 5, reward: { credits: 120 } },
];

export type AchKind = 'packs' | 'rank' | 'collection' | 'streak';
export const ACHIEVEMENTS: { id: string; label: string; desc: string; icon: string; kind: AchKind; goal: number; reward: Reward }[] = [
  { id: 'pack1', label: 'Premier sachet', desc: 'Ouvrir 1 pack', icon: '✂️', kind: 'packs', goal: 1, reward: { credits: 100 } },
  { id: 'pack10', label: 'Accro', desc: 'Ouvrir 10 packs', icon: '🎴', kind: 'packs', goal: 10, reward: { credits: 300 } },
  { id: 'pack50', label: 'Collectionneur', desc: 'Ouvrir 50 packs', icon: '📦', kind: 'packs', goal: 50, reward: { credits: 1000 } },
  { id: 'pack200', label: 'Insatiable', desc: 'Ouvrir 200 packs', icon: '🏭', kind: 'packs', goal: 200, reward: { credits: 4000 } },
  { id: 'epic', label: 'Ça brille', desc: 'Obtenir une Épique', icon: '💜', kind: 'rank', goal: 3, reward: { credits: 200 } },
  { id: 'legend', label: 'Légende vivante', desc: 'Obtenir une Légendaire', icon: '🧡', kind: 'rank', goal: 4, reward: { credits: 500 } },
  { id: 'mythic', label: 'Mythe', desc: 'Obtenir une Mythique', icon: '❤️‍🔥', kind: 'rank', goal: 5, reward: { credits: 1000, shards: 200 } },
  { id: 'secret', label: 'L’Élu', desc: 'Obtenir une Secrète', icon: '🌌', kind: 'rank', goal: 6, reward: { credits: 3000, shards: 1000 } },
  { id: 'col25', label: 'Un quart', desc: '25 % de la collection', icon: '📗', kind: 'collection', goal: 25, reward: { credits: 500 } },
  { id: 'col50', label: 'À moitié', desc: '50 % de la collection', icon: '📘', kind: 'collection', goal: 50, reward: { credits: 1500 } },
  { id: 'col100', label: 'Complet', desc: '100 % de la collection', icon: '👑', kind: 'collection', goal: 100, reward: { credits: 10000, shards: 5000 } },
  { id: 'streak7', label: 'Fidèle', desc: 'Série de 7 jours', icon: '🔥', kind: 'streak', goal: 7, reward: { credits: 700 } },
  { id: 'streak30', label: 'Inarrêtable', desc: 'Série de 30 jours', icon: '☄️', kind: 'streak', goal: 30, reward: { credits: 5000 } },
];

/** Roue quotidienne (poids relatifs). */
export const WHEEL: { label: string; weight: number; reward: Reward; color: string }[] = [
  { label: '100 🪙', weight: 26, reward: { credits: 100 }, color: '#3a2f6b' },
  { label: '30 ✦', weight: 20, reward: { shards: 30 }, color: '#1f4b6e' },
  { label: '250 🪙', weight: 16, reward: { credits: 250 }, color: '#4b2a6b' },
  { label: '100 ✦', weight: 12, reward: { shards: 100 }, color: '#1f5a5a' },
  { label: '500 🪙', weight: 9, reward: { credits: 500 }, color: '#6b2a4b' },
  { label: 'PACK', weight: 8, reward: { freePack: true }, color: '#8a5a12' },
  { label: '1000 🪙', weight: 6, reward: { credits: 1000 }, color: '#6b1f2a' },
  { label: '500 ✦', weight: 3, reward: { shards: 500 }, color: '#2a6b3a' },
];

export const albumReward = (charId: string) => ({ credits: 150 * (CHARACTERS.find((c) => c.id === charId)?.variants.length ?? 0) });

export interface DayProgress { day: string; packs: number; recycled: number; daily: number }
export interface Progress { stats: DayProgress; claims: string[]; wheelDay: string | null; showcase: string[] }

export const dayKey = (t = Date.now()) => new Date(t).toISOString().slice(0, 10);
export const emptyProgress = (): Progress => ({ stats: { day: dayKey(), packs: 0, recycled: 0, daily: 0 }, claims: [], wheelDay: null, showcase: [] });
export function todayStats(p: Progress): DayProgress {
  return p.stats.day === dayKey() ? p.stats : { day: dayKey(), packs: 0, recycled: 0, daily: 0 };
}

export function maxRankOwned(cards: OwnedCard[]) {
  return Math.max(-1, ...cards.map((c) => RARITY[VARIANT_BY_ID[c.variantId]?.rarity ?? 'commune'].rank));
}
export function collectionPct(cards: OwnedCard[]) {
  return (new Set(cards.map((c) => c.variantId).filter((v) => VARIANT_BY_ID[v])).size / VARIANTS.length) * 100;
}

/** État d'une récompense : progression, objectif, réclamable, déjà prise. */
export function rewardState(key: string, profile: Profile, progress: Progress, cards: OwnedCard[]) {
  const [kind, id] = key.split(':');
  const claimed = progress.claims.includes(key);
  if (kind === 'quest') {
    const q = QUESTS.find((x) => x.id === id.split('@')[0])!;
    const v = todayStats(progress)[q.stat];
    return { value: Math.min(v, q.goal), goal: q.goal, done: v >= q.goal, claimed, reward: q.reward };
  }
  if (kind === 'ach') {
    const a = ACHIEVEMENTS.find((x) => x.id === id)!;
    const v = a.kind === 'packs' ? profile.packsOpened : a.kind === 'streak' ? profile.streak
      : a.kind === 'rank' ? (maxRankOwned(cards) >= a.goal ? a.goal : 0) : Math.floor(collectionPct(cards));
    return { value: Math.min(v, a.goal), goal: a.goal, done: v >= a.goal, claimed, reward: a.reward };
  }
  if (kind === 'album') {
    const ch = CHARACTERS.find((c) => c.id === id)!;
    const owned = new Set(cards.map((c) => c.variantId));
    const v = ch.variants.filter((x) => owned.has(x.id)).length;
    return { value: v, goal: ch.variants.length, done: v >= ch.variants.length, claimed, reward: albumReward(id) };
  }
  throw new Error('Récompense inconnue');
}
export const questKey = (id: string) => `quest:${id}@${dayKey()}`;

export function rewardText(r: Reward) {
  return [r.credits && `${r.credits.toLocaleString('fr-FR')} 🪙`, r.shards && `${r.shards.toLocaleString('fr-FR')} ✦`, r.freePack && '1 pack'].filter(Boolean).join(' + ');
}
