import { get, set } from 'idb-keyval';
import { GAME, PACKS, RARITY, type RarityId } from '../config/game';
import { VARIANT_BY_ID } from '../data/catalog';
import { dailyCredits, dailyStatus, drawPack, streakAfterClaim } from './rules';
import type { Backend, Currency, OwnedCard, Profile } from './types';

/**
 * Mode LOCAL (hors-ligne) : sauvegarde séparée sur l'appareil, jamais synchronisée
 * avec le mode en ligne (sinon triche possible). Pas d'achats, d'échanges ni de marché.
 */
interface Save {
  v: 1;
  profile: Profile;
  cards: OwnedCard[];
  serials: Record<string, number>;
}

const KEY = 'iconiq-local-save';

function fresh(): Save {
  return {
    v: 1,
    profile: {
      id: 'local',
      username: 'Joueur local',
      credits: GAME.startCredits,
      shards: 0,
      gems: 0,
      lastDailyAt: null,
      streak: 0,
      pityEpic: 0,
      pityLegend: 0,
      packsOpened: 0,
    },
    cards: [],
    serials: {},
  };
}

export class LocalBackend implements Backend {
  mode = 'local' as const;
  private save: Save = fresh();
  private queue = Promise.resolve();

  private persist() {
    const snap = structuredClone(this.save);
    this.queue = this.queue.then(() => set(KEY, snap)).catch(() => { /* stockage indisponible */ }); // autosave séquentiel
    return this.queue;
  }

  async load() {
    try { this.save = ((await get(KEY)) as Save | undefined) ?? fresh(); } catch { this.save = fresh(); }
    return { profile: { ...this.save.profile }, cards: [...this.save.cards] };
  }

  async openPack(packId: string, currency: Currency) {
    const p = this.save.profile;
    const pack = PACKS.find((x) => x.id === packId);
    if (!pack) throw new Error('Pack inconnu');
    if (currency === 'gems') throw new Error('Achats indisponibles en mode local');
    if (currency === 'daily') {
      if (!dailyStatus(p.lastDailyAt).ready) throw new Error('Pack quotidien pas encore prêt');
      p.streak = streakAfterClaim(p.lastDailyAt, p.streak);
      p.lastDailyAt = new Date().toISOString();
      p.credits += dailyCredits(p.streak);
    } else {
      if (pack.costCredits == null || p.credits < pack.costCredits) throw new Error('Crédits insuffisants');
      p.credits -= pack.costCredits;
    }
    const owned = new Set(this.save.cards.map((c) => c.variantId));
    const { variants, state } = drawPack(currency === 'daily' ? 'standard' : packId, p);
    p.pityEpic = state.pityEpic;
    p.pityLegend = state.pityLegend;
    p.packsOpened++;
    const now = new Date().toISOString();
    const cards = variants.map((v) => {
      let serial: number | null = null;
      if (RARITY[v.rarity].serialized) serial = this.save.serials[v.id] = (this.save.serials[v.id] ?? 0) + 1;
      return { uid: crypto.randomUUID(), variantId: v.id, serial, obtainedAt: now, locked: false };
    });
    this.save.cards.push(...cards);
    const newVariantIds = [...new Set(cards.map((c) => c.variantId).filter((id) => !owned.has(id)))];
    await this.persist();
    return { cards, newVariantIds, profile: { ...p } };
  }

  async recycleDuplicates(maxRarity: RarityId) {
    const maxRank = RARITY[maxRarity].rank;
    const seen = new Set<string>();
    const keep: OwnedCard[] = [];
    const removed: string[] = [];
    let gained = 0;
    // on garde en priorité les numéros de série les plus bas
    const sorted = [...this.save.cards].sort((a, b) => (a.serial ?? 1e9) - (b.serial ?? 1e9));
    for (const c of sorted) {
      const r = RARITY[VARIANT_BY_ID[c.variantId]?.rarity ?? 'commune'];
      if (seen.has(c.variantId) && !c.locked && r.rank <= maxRank) {
        removed.push(c.uid);
        gained += r.recycle;
      } else {
        seen.add(c.variantId);
        keep.push(c);
      }
    }
    this.save.cards = keep;
    this.save.profile.shards += gained;
    await this.persist();
    return { gained, removed, profile: { ...this.save.profile } };
  }

  async recycleCard(uid: string) {
    const i = this.save.cards.findIndex((c) => c.uid === uid);
    if (i < 0) throw new Error('Carte introuvable');
    const c = this.save.cards[i];
    if (c.locked) throw new Error('Carte verrouillée');
    const gained = RARITY[VARIANT_BY_ID[c.variantId].rarity].recycle;
    this.save.cards.splice(i, 1);
    this.save.profile.shards += gained;
    await this.persist();
    return { gained, profile: { ...this.save.profile } };
  }

  async craft(variantId: string) {
    const v = VARIANT_BY_ID[variantId];
    if (!v) throw new Error('Carte inconnue');
    const cost = RARITY[v.rarity].craft;
    if (this.save.profile.shards < cost) throw new Error('Éclats insuffisants');
    this.save.profile.shards -= cost;
    let serial: number | null = null;
    if (RARITY[v.rarity].serialized) serial = this.save.serials[v.id] = (this.save.serials[v.id] ?? 0) + 1;
    const card: OwnedCard = { uid: crypto.randomUUID(), variantId, serial, obtainedAt: new Date().toISOString(), locked: false };
    this.save.cards.push(card);
    await this.persist();
    return { card, profile: { ...this.save.profile } };
  }

  async setUsername(name: string) {
    this.save.profile.username = name.trim().slice(0, 20) || 'Joueur local';
    await this.persist();
    return { ...this.save.profile };
  }
}
