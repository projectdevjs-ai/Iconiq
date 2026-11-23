/**
 * SOURCE UNIQUE DES RÈGLES DU JEU.
 * Le script `npm run seed` génère supabase/seed.sql à partir de ce fichier :
 * le serveur applique donc exactement les mêmes taux que ceux affichés.
 */

export const GAME = {
  name: 'ICONIQ',
  tagline: 'Les légendes de chez nous. Pour le meilleur et pour le pire.',
  cardsPerPack: 5,
  dailyCooldownHours: 20, // pack quotidien disponible toutes les 20h (tolérant pour les horaires)
  dailyCredits: 100,
  streakBonusPerDay: 15,
  streakBonusMax: 150,
  marketFeePct: 5,
  startCredits: 500,
} as const;

export type RarityId =
  | 'commune'
  | 'peu_commune'
  | 'rare'
  | 'epique'
  | 'legendaire'
  | 'mythique'
  | 'secrete';

export interface Rarity {
  id: RarityId;
  label: string;
  rank: number;
  /** probabilité d'un slot normal (somme = 1) */
  weight: number;
  /** éclats gagnés en recyclant un double */
  recycle: number;
  /** éclats nécessaires pour fabriquer la carte */
  craft: number;
  color: string;
  glow: string;
  /** les cartes de cette rareté reçoivent un numéro de série global (#12) */
  serialized: boolean;
}

export const RARITIES: Rarity[] = [
  { id: 'commune',     label: 'Commune',     rank: 0, weight: 0.6,    recycle: 5,    craft: 40,    color: '#9aa4b2', glow: '#c9d1dc', serialized: false },
  { id: 'peu_commune', label: 'Peu commune', rank: 1, weight: 0.25,   recycle: 15,   craft: 100,   color: '#3ddc97', glow: '#7cffc4', serialized: false },
  { id: 'rare',        label: 'Rare',        rank: 2, weight: 0.1,    recycle: 50,   craft: 300,   color: '#3d8bff', glow: '#8ab8ff', serialized: false },
  { id: 'epique',      label: 'Épique',      rank: 3, weight: 0.036,  recycle: 150,  craft: 900,   color: '#a259ff', glow: '#d2a8ff', serialized: false },
  { id: 'legendaire',  label: 'Légendaire',  rank: 4, weight: 0.011,  recycle: 500,  craft: 3000,  color: '#ffb020', glow: '#ffe08a', serialized: false },
  { id: 'mythique',    label: 'Mythique',    rank: 5, weight: 0.0025, recycle: 1500, craft: 10000, color: '#ff3d6e', glow: '#ff9ab3', serialized: true },
  { id: 'secrete',     label: 'Secrète',     rank: 6, weight: 0.0005, recycle: 5000, craft: 40000, color: '#ffffff', glow: '#ffffff', serialized: true },
];

export const RARITY = Object.fromEntries(RARITIES.map((r) => [r.id, r])) as Record<RarityId, Rarity>;

/** Garanties anti-malchance (pity), suivies côté serveur. */
export const PITY = {
  epicEvery: 10,      // au moins une Épique+ tous les 10 packs
  legendaryEvery: 40, // au moins une Légendaire+ tous les 40 packs
};

export interface PackType {
  id: string;
  name: string;
  description: string;
  costCredits: number | null;
  costGems: number | null;
  /** rareté minimum du dernier slot */
  lastSlotMin: RarityId;
  accent: string;
}

/**
 * IMPORTANT — règle d'équité : les packs payables en gemmes utilisent EXACTEMENT
 * le même tirage que les packs gratuits. Les gemmes font gagner du temps, jamais
 * l'accès à une carte exclusive.
 */
export const PACKS: PackType[] = [
  {
    id: 'standard',
    name: 'Pack Standard',
    description: '5 cartes · 1 Rare ou mieux garantie',
    costCredits: 300,
    costGems: 30,
    lastSlotMin: 'rare',
    accent: '#3d8bff',
  },
  {
    id: 'prestige',
    name: 'Pack Prestige',
    description: '5 cartes · 1 Épique ou mieux garantie',
    costCredits: 1200,
    costGems: 110,
    lastSlotMin: 'epique',
    accent: '#a259ff',
  },
];

/** Offres de gemmes (prix en centimes) — validées côté serveur dans create-checkout. */
export const GEM_BUNDLES = [
  { id: 'gems_s', gems: 100, priceCents: 199, label: 'Poignée de gemmes' },
  { id: 'gems_m', gems: 550, priceCents: 999, label: 'Sac de gemmes', badge: '+10%' },
  { id: 'gems_l', gems: 1200, priceCents: 1999, label: 'Coffre de gemmes', badge: '+20%' },
  { id: 'gems_xl', gems: 3300, priceCents: 4999, label: 'Trésor', badge: '+32%' },
];
