import { get, set } from 'idb-keyval';
import { GAME, PACKS, RARITY, type RarityId } from '../config/game';
import { VARIANT_BY_ID } from '../data/catalog';
import { WHEEL, dayKey, emptyProgress, rewardState, todayStats, type Progress, type Reward } from './rewards';
import { dailyCredits, dailyStatus, drawPack, packAvailable, secureRandom, streakAfterClaim, streakGiftShards } from './rules';
import type { Backend, Currency, OwnedCard, PackResult, Profile } from './types';

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

const KEY = 'iconiq-local-save-v4'; // changer la version = repartir de zéro

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
      progress: emptyProgress(),
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

  private snapshot(): Profile {
    return structuredClone(this.save.profile);
  }

  /** compteurs du jour (remis à zéro à minuit UTC) */
  private stats() {
    const pr = this.save.profile.progress;
    pr.stats = todayStats(pr);
    return pr.stats;
  }

  async load() {
    try { this.save = ((await get(KEY)) as Save | undefined) ?? fresh(); } catch { this.save = fresh(); }
    this.save.profile.progress ??= emptyProgress(); // anciennes sauvegardes
    this.save.profile.progress.showcase ??= [];
    return { profile: this.snapshot(), cards: [...this.save.cards] };
  }

  async reset() {
    this.save = fresh();
    await this.persist();
    return { profile: this.snapshot(), cards: [] as OwnedCard[] };
  }

  private draw(packId: string): OwnedCard[] {
    const p = this.save.profile;
    const { variants, state } = drawPack(packId, p);
    p.pityEpic = state.pityEpic;
    p.pityLegend = state.pityLegend;
    p.packsOpened++;
    this.stats().packs++;
    const now = new Date().toISOString();
    const cards = variants.map((v) => {
      let serial: number | null = null;
      if (RARITY[v.rarity].serialized) serial = this.save.serials[v.id] = (this.save.serials[v.id] ?? 0) + 1;
      return { uid: crypto.randomUUID(), variantId: v.id, serial, obtainedAt: now, locked: false };
    });
    this.save.cards.push(...cards);
    return cards;
  }

  async openPack(packId: string, currency: Currency, count = 1): Promise<PackResult> {
    const p = this.save.profile;
    const pack = PACKS.find((x) => x.id === packId);
    if (!pack) throw new Error('Pack inconnu');
    if (!packAvailable(pack)) throw new Error('Cet événement est terminé');
    if (currency === 'gems') throw new Error('Achats indisponibles en mode local');
    count = Math.max(1, Math.min(10, Math.floor(count)));
    if (currency === 'daily') {
      if (!dailyStatus(p.lastDailyAt).ready) throw new Error('Pack quotidien pas encore prêt');
      p.streak = streakAfterClaim(p.lastDailyAt, p.streak);
      p.lastDailyAt = new Date().toISOString();
      p.credits += dailyCredits(p.streak);
      p.shards += streakGiftShards(p.streak);
      this.stats().daily++;
      count = 1;
      packId = 'standard';
    } else {
      const cost = (pack.costCredits ?? Infinity) * count;
      if (p.credits < cost) throw new Error('Crédits insuffisants');
      p.credits -= cost;
    }
    const owned = new Set(this.save.cards.map((c) => c.variantId));
    const cards: OwnedCard[] = [];
    for (let i = 0; i < count; i++) cards.push(...this.draw(packId));
    const newVariantIds = [...new Set(cards.map((c) => c.variantId).filter((id) => !owned.has(id)))];
    await this.persist();
    return { cards, newVariantIds, profile: this.snapshot() };
  }

  private give(r: Reward): PackResult | undefined {
    const p = this.save.profile;
    p.credits += r.credits ?? 0;
    p.shards += r.shards ?? 0;
    if (!r.freePack) return undefined;
    const owned = new Set(this.save.cards.map((c) => c.variantId));
    const cards = this.draw('standard');
    return { cards, newVariantIds: [...new Set(cards.map((c) => c.variantId).filter((id) => !owned.has(id)))], profile: this.snapshot() };
  }

  async claim(key: string) {
    const st = rewardState(key, this.save.profile, this.save.profile.progress, this.save.cards);
    if (st.claimed) throw new Error('Déjà récupéré');
    if (!st.done) throw new Error('Objectif pas encore atteint');
    this.save.profile.progress.claims.push(key);
    const pack = this.give(st.reward);
    await this.persist();
    return { reward: st.reward, profile: this.snapshot(), pack };
  }

  async spinWheel() {
    const pr = this.save.profile.progress;
    if (pr.wheelDay === dayKey()) throw new Error('Tu as déjà tourné la roue aujourd’hui');
    const total = WHEEL.reduce((s, w) => s + w.weight, 0);
    let x = secureRandom() * total, index = 0;
    for (; index < WHEEL.length - 1; index++) { x -= WHEEL[index].weight; if (x < 0) break; }
    pr.wheelDay = dayKey();
    const reward = WHEEL[index].reward;
    const pack = this.give(reward);
    await this.persist();
    return { index, reward, profile: this.snapshot(), pack };
  }

  async setShowcase(uids: string[]) {
    const mine = new Set(this.save.cards.map((c) => c.uid));
    this.save.profile.progress.showcase = uids.filter((u) => mine.has(u)).slice(0, 3);
    await this.persist();
    return this.snapshot();
  }

  async recycleDuplicates(maxRarity: RarityId) {
    const maxRank = RARITY[maxRarity].rank;
    const seen = new Set<string>();
    const keep: OwnedCard[] = [];
    const removed: string[] = [];
    let gained = 0;
    const show = new Set(this.save.profile.progress.showcase);
    // on garde en priorité les cartes en vitrine puis les numéros de série les plus bas
    const sorted = [...this.save.cards].sort((a, b) => Number(show.has(b.uid)) - Number(show.has(a.uid)) || (a.serial ?? 1e9) - (b.serial ?? 1e9));
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
    this.stats().recycled += removed.length;
    await this.persist();
    return { gained, removed, profile: this.snapshot() };
  }

  async recycleCard(uid: string) {
    const i = this.save.cards.findIndex((c) => c.uid === uid);
    if (i < 0) throw new Error('Carte introuvable');
    const c = this.save.cards[i];
    if (c.locked) throw new Error('Carte verrouillée');
    const gained = RARITY[VARIANT_BY_ID[c.variantId].rarity].recycle;
    this.save.cards.splice(i, 1);
    this.save.profile.shards += gained;
    this.save.profile.progress.showcase = this.save.profile.progress.showcase.filter((u) => u !== uid);
    this.stats().recycled++;
    await this.persist();
    return { gained, profile: this.snapshot() };
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
    return { card, profile: this.snapshot() };
  }

  async setUsername(name: string) {
    this.save.profile.username = name.trim().slice(0, 20) || 'Joueur local';
    await this.persist();
    return this.snapshot();
  }
}

export type { Progress };
