import { GAME, PACKS, PITY, RARITIES, RARITY, STREAK_GIFT, type PackType, type RarityId } from '../config/game';
import { VARIANTS, type FlatVariant } from '../data/catalog';

/** Aléatoire cryptographique uniforme dans [0,1). */
export function secureRandom(): number {
  const a = new Uint32Array(1);
  crypto.getRandomValues(a);
  return a[0] / 2 ** 32;
}

const byRarity: Record<string, FlatVariant[]> = {};
for (const v of VARIANTS) (byRarity[v.rarity] ??= []).push(v);

function poolFor(pack?: PackType) {
  if (!pack?.characters) return byRarity;
  const out: Record<string, FlatVariant[]> = {};
  for (const v of VARIANTS) if (pack.characters.includes(v.characterId)) (out[v.rarity] ??= []).push(v);
  return out;
}

export const packAvailable = (p: PackType, now = Date.now()) => !p.endsAt || new Date(p.endsAt).getTime() > now;

export function rollRarity(minRank: number, rnd = secureRandom, src = byRarity): RarityId {
  let pool = RARITIES.filter((r) => r.rank >= minRank && src[r.id]?.length);
  if (!pool.length) pool = RARITIES.filter((r) => src[r.id]?.length).slice(-1);
  const total = pool.reduce((s, r) => s + r.weight, 0);
  let x = rnd() * total;
  for (const r of pool) {
    x -= r.weight;
    if (x < 0) return r.id;
  }
  return pool[pool.length - 1].id;
}

export function pickVariant(rarity: RarityId, rnd = secureRandom, src = byRarity): FlatVariant {
  const list = src[rarity];
  return list[Math.floor(rnd() * list.length)];
}

export interface DrawState {
  pityEpic: number;
  pityLegend: number;
}

/** Tire un pack. Logique miroir de la fonction SQL `_draw_pack`. */
export function drawPack(packId: string, state: DrawState, rnd = secureRandom) {
  const pack = PACKS.find((p) => p.id === packId);
  if (!pack) throw new Error('Pack inconnu');
  const src = poolFor(pack);
  let lastMin = RARITY[pack.lastSlotMin].rank;
  if (state.pityLegend + 1 >= PITY.legendaryEvery) lastMin = Math.max(lastMin, RARITY.legendaire.rank);
  else if (state.pityEpic + 1 >= PITY.epicEvery) lastMin = Math.max(lastMin, RARITY.epique.rank);

  const out: FlatVariant[] = [];
  for (let i = 0; i < GAME.cardsPerPack; i++) {
    const min = i === GAME.cardsPerPack - 1 ? lastMin : 0;
    out.push(pickVariant(rollRarity(min, rnd, src), rnd, src));
  }
  const best = Math.max(...out.map((v) => RARITY[v.rarity].rank));
  const next: DrawState = {
    pityEpic: best >= RARITY.epique.rank ? 0 : state.pityEpic + 1,
    pityLegend: best >= RARITY.legendaire.rank ? 0 : state.pityLegend + 1,
  };
  // Révélation dramatique : tri par rareté croissante
  out.sort((a, b) => RARITY[a.rarity].rank - RARITY[b.rarity].rank);
  return { variants: out, state: next };
}

export function dailyStatus(lastDailyAt: string | null, now = Date.now()) {
  if (!lastDailyAt) return { ready: true, msLeft: 0 };
  const next = new Date(lastDailyAt).getTime() + GAME.dailyCooldownHours * 3600_000;
  return { ready: now >= next, msLeft: Math.max(0, next - now) };
}

export function streakAfterClaim(lastDailyAt: string | null, streak: number, now = Date.now()) {
  if (!lastDailyAt) return 1;
  const hours = (now - new Date(lastDailyAt).getTime()) / 3600_000;
  return hours <= 48 ? streak + 1 : 1;
}

export function dailyCredits(streak: number) {
  return GAME.dailyCredits + Math.min(GAME.streakBonusMax, (streak - 1) * GAME.streakBonusPerDay)
    + (streak > 0 && streak % STREAK_GIFT.every === 0 ? STREAK_GIFT.credits : 0);
}
export const streakGiftShards = (streak: number) => (streak > 0 && streak % STREAK_GIFT.every === 0 ? STREAK_GIFT.shards : 0);

/** Probabilités affichées au joueur (transparence) pour un slot normal. */
export function displayedOdds() {
  const pool = RARITIES.filter((r) => byRarity[r.id]?.length);
  const total = pool.reduce((s, r) => s + r.weight, 0);
  return pool.map((r) => ({ rarity: r, pct: (r.weight / total) * 100 }));
}

export function collectionScore(variantIds: Iterable<string>) {
  let s = 0;
  for (const id of new Set(variantIds)) {
    const v = VARIANTS.find((x) => x.id === id);
    if (v) s += RARITY[v.rarity].craft;
  }
  return s;
}
