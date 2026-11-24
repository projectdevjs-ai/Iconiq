import type { RarityId } from '../config/game';

export type Mode = 'online' | 'local';
export type Currency = 'credits' | 'gems' | 'daily';

export interface OwnedCard {
  uid: string;
  variantId: string;
  serial: number | null;
  obtainedAt: string;
  locked: boolean; // en échange ou en vente
}

export interface Profile {
  id: string;
  username: string;
  credits: number;
  shards: number;
  gems: number;
  lastDailyAt: string | null;
  streak: number;
  pityEpic: number;
  pityLegend: number;
  packsOpened: number;
  progress: Progress;
}

import type { Progress, Reward } from './rewards';
export type { Progress, Reward };

export interface PackResult {
  cards: OwnedCard[];
  newVariantIds: string[];
  profile: Profile;
}

export interface TradeOffer {
  id: string;
  fromUser: string;
  fromName: string;
  toUser: string;
  toName: string;
  offerCards: { uid: string; variantId: string; serial: number | null }[];
  requestCards: { uid: string; variantId: string; serial: number | null }[];
  offerShards: number;
  requestShards: number;
  status: 'pending' | 'accepted' | 'declined' | 'cancelled';
  createdAt: string;
}

export interface Listing {
  id: string;
  sellerId: string;
  sellerName: string;
  card: { uid: string; variantId: string; serial: number | null };
  price: number;
  createdAt: string;
}

export interface LeaderRow {
  username: string;
  score: number;
  unique: number;
}

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  url: string | null;
  read: boolean;
  createdAt: string;
}

export interface PublicCard {
  uid: string;
  variantId: string;
  serial: number | null;
  locked: boolean;
}

export interface Backend {
  mode: Mode;
  load(): Promise<{ profile: Profile; cards: OwnedCard[] }>;
  openPack(packId: string, currency: Currency, count?: number): Promise<PackResult>;
  claim(key: string): Promise<{ reward: Reward; profile: Profile; pack?: PackResult }>;
  spinWheel(): Promise<{ index: number; reward: Reward; profile: Profile; pack?: PackResult }>;
  setShowcase(uids: string[]): Promise<Profile>;
  recycleDuplicates(maxRarity: RarityId): Promise<{ gained: number; removed: string[]; profile: Profile }>;
  recycleCard(uid: string): Promise<{ gained: number; profile: Profile }>;
  craft(variantId: string): Promise<{ card: OwnedCard; profile: Profile }>;
  setUsername(name: string): Promise<Profile>;
}

export interface OnlineFeatures {
  listTrades(): Promise<TradeOffer[]>;
  createTrade(input: {
    toUsername: string;
    offerUids: string[];
    requestUids: string[];
    offerShards: number;
    requestShards: number;
  }): Promise<void>;
  respondTrade(id: string, accept: boolean): Promise<void>;
  cancelTrade(id: string): Promise<void>;
  publicCollection(username: string): Promise<PublicCard[]>;
  listMarket(filter?: { rarity?: RarityId; characterId?: string }): Promise<Listing[]>;
  myListings(): Promise<Listing[]>;
  createListing(uid: string, price: number): Promise<void>;
  cancelListing(id: string): Promise<void>;
  buyListing(id: string): Promise<void>;
  leaderboard(): Promise<LeaderRow[]>;
  notifications(): Promise<AppNotification[]>;
  markNotificationsRead(): Promise<void>;
  checkout(bundleId: string): Promise<string>;
  feed(): Promise<FeedItem[]>;
  publicProfile(username: string): Promise<PublicProfile | null>;
  weeklyLeaderboard(): Promise<LeaderRow[]>;
}

export interface FeedItem { username: string; variantId: string; serial: number | null; createdAt: string }
export interface PublicProfile { username: string; packsOpened: number; unique: number; showcase: { variantId: string; serial: number | null }[] }
