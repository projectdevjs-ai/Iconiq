import { create } from 'zustand';
import type { RarityId } from '../config/game';
import { LocalBackend } from '../engine/localBackend';
import { OnlineBackend } from '../engine/onlineBackend';
import type { Backend, Currency, OwnedCard, PackResult, Profile, Reward } from '../engine/types';
import { rewardText } from '../engine/rewards';
import { sfx } from '../lib/fx';

export type Route = 'home' | 'collection' | 'shop' | 'trade' | 'market' | 'battle' | 'profile' | 'showroom' | 'friends' | 'settings';

export interface Toast { id: number; text: string; kind: 'info' | 'error' | 'success' }

interface State {
  backend: Backend | null;
  profile: Profile | null;
  cards: OwnedCard[];
  route: Route;
  routeParam: string | null;
  opening: { packId: string; currency: Currency | 'reward'; count: number; result: PackResult | null } | null;
  toasts: Toast[];
  busy: boolean;
  start(mode: 'online' | 'local'): Promise<void>;
  signOut(): void;
  go(route: Route, param?: string | null): void;
  toast(text: string, kind?: Toast['kind']): void;
  beginOpening(packId: string, currency: Currency, count?: number): Promise<void>;
  showPack(result: PackResult): void;
  claim(key: string): Promise<Reward | null>;
  spinWheel(): Promise<{ index: number; reward: Reward; pack?: PackResult } | null>;
  setShowcase(uids: string[]): Promise<void>;
  finishOpening(): void;
  recycleDuplicates(max: RarityId): Promise<number>;
  recycleCard(uid: string): Promise<void>;
  craft(variantId: string): Promise<OwnedCard | null>;
  refresh(): Promise<void>;
  setProfile(p: Profile): void;
  resetLocal(): Promise<void>;
}

let toastId = 0;
const PATHS: Record<Route, string> = {
  home: '/', collection: '/collection', shop: '/shop', trade: '/trade', market: '/market',
  battle: '/battle', profile: '/profile', showroom: '/showroom', friends: '/friends', settings: '/settings',
};

export function routeFromPath(path: string): { route: Route; param: string | null } {
  const [, a, b] = path.split('/');
  const route = (Object.entries(PATHS).find(([, p]) => p === '/' + (a ?? ''))?.[0] ?? 'home') as Route;
  return { route, param: b ? decodeURIComponent(b) : null };
}

export const useGame = create<State>((set, get) => {
  const fail = (e: unknown) => {
    sfx.error();
    get().toast(e instanceof Error ? e.message : String(e), 'error');
  };
  return {
    backend: null,
    profile: null,
    cards: [],
    route: import.meta.env.VITE_EMBED ? 'home' : routeFromPath(location.pathname).route,
    routeParam: import.meta.env.VITE_EMBED ? null : routeFromPath(location.pathname).param,
    opening: null,
    toasts: [],
    busy: false,

    async start(mode) {
      const backend = mode === 'online' ? new OnlineBackend() : new LocalBackend();
      const { profile, cards } = await backend.load();
      try { localStorage.setItem('iconiq-mode', mode); } catch { /* */ }
      set({ backend, profile, cards });
    },
    signOut() {
      try { localStorage.removeItem('iconiq-mode'); } catch { /* */ }
      set({ backend: null, profile: null, cards: [] });
    },
    go(route, param = null) {
      const path = PATHS[route] + (param ? '/' + encodeURIComponent(param) : '');
      if (!import.meta.env.VITE_EMBED && location.pathname !== path) { try { history.pushState(null, '', path); } catch { /* */ } }
      const apply = () => set({ route, routeParam: param });
      const d = document as any;
      if (d.startViewTransition && !matchMedia('(prefers-reduced-motion: reduce)').matches) d.startViewTransition(apply);
      else apply();
    },
    toast(text, kind = 'info') {
      const id = ++toastId;
      set((s) => ({ toasts: [...s.toasts, { id, text, kind }] }));
      setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 3800);
    },
    async beginOpening(packId, currency, count = 1) {
      const { backend, busy } = get();
      if (!backend || busy) return;
      set({ busy: true, opening: { packId, currency, count, result: null } });
      try {
        const result = await backend.openPack(packId, currency, count);
        set((s) => ({
          profile: result.profile,
          cards: [...s.cards, ...result.cards.map(({ uid, variantId, serial, obtainedAt }) => ({ uid, variantId, serial, obtainedAt, locked: false }))],
          opening: s.opening ? { ...s.opening, result } : null,
        }));
      } catch (e) {
        set({ opening: null });
        fail(e);
      } finally {
        set({ busy: false });
      }
    },
    finishOpening() { set({ opening: null }); },
    showPack(result) {
      set((s) => ({ profile: result.profile, cards: [...s.cards, ...result.cards.map(({ uid, variantId, serial, obtainedAt }) => ({ uid, variantId, serial, obtainedAt, locked: false }))],
        opening: { packId: 'standard', currency: 'reward', count: 1, result } }));
    },
    async claim(key) {
      try {
        const r = await get().backend!.claim(key);
        set({ profile: r.profile });
        sfx.coin();
        get().toast(`🎁 +${rewardText(r.reward)}`, 'success');
        return r.reward;
      } catch (e) { fail(e); return null; }
    },
    async spinWheel() {
      try {
        const r = await get().backend!.spinWheel();
        set({ profile: r.profile });
        return r;
      } catch (e) { fail(e); return null; }
    },
    async setShowcase(uids) {
      try { set({ profile: await get().backend!.setShowcase(uids) }); } catch (e) { fail(e); }
    },
    async recycleDuplicates(max) {
      const b = get().backend!;
      try {
        const r = await b.recycleDuplicates(max);
        const removed = new Set(r.removed);
        set((s) => ({ profile: r.profile, cards: s.cards.filter((c) => !removed.has(c.uid)) }));
        return r.gained;
      } catch (e) { fail(e); return 0; }
    },
    async recycleCard(uid) {
      try {
        const r = await get().backend!.recycleCard(uid);
        set((s) => ({ profile: r.profile, cards: s.cards.filter((c) => c.uid !== uid) }));
        sfx.recycle();
        get().toast(`+${r.gained} éclats`, 'success');
      } catch (e) { fail(e); }
    },
    async craft(variantId) {
      try {
        const r = await get().backend!.craft(variantId);
        set((s) => ({ profile: r.profile, cards: [...s.cards, r.card] }));
        return r.card;
      } catch (e) { fail(e); return null; }
    },
    async refresh() {
      const b = get().backend;
      if (!b) return;
      try {
        const { profile, cards } = await b.load();
        set({ profile, cards });
      } catch { /* hors-ligne : on garde l'état */ }
    },
    setProfile(p) { set({ profile: p }); },
    async resetLocal() {
      const b = get().backend;
      if (!(b instanceof LocalBackend)) return;
      const { profile, cards } = await b.reset();
      set({ profile, cards, opening: null });
    },
  };
});

addEventListener('popstate', () => {
  const r = routeFromPath(location.pathname);
  useGame.setState({ route: r.route, routeParam: r.param });
});
