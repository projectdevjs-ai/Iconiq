import type { RarityId } from '../config/game';

/**
 * CATALOGUE DES PERSONNAGES
 * ─────────────────────────
 * Pour ajouter tes images : dépose-les dans public/cards/ puis renseigne `image`
 * (ex: image: '/cards/patron-legendaire.webp'). Format conseillé : 750×1050 (5:7), WebP.
 * Sans image, une illustration temporaire est générée automatiquement.
 * Après modification : `npm run seed` puis applique supabase/seed.sql.
 */

export interface Variant {
  id: string; // unique, stable — ne jamais renommer une fois en ligne
  rarity: RarityId;
  title: string; // nom de la version (ex: « Édition Nuit Blanche »)
  image?: string;
  /** l'image est déjà une carte complète (cadre + textes) : on n'ajoute pas notre cadre */
  fullCard?: boolean;
  flavor?: string;
}

export interface Character {
  id: string;
  name: string;
  bio: string;
  variants: Variant[];
}

export const CHARACTERS: Character[] = [
  // ── Vrais personnages ──────────────────────────────
  {
    id: 'toti',
    name: 'Toti Pro',
    bio: 'Rappeur freestyler. Il erre dans sa caravane en crachant des freestyles légendaires.',
    variants: [
      { id: 'toti-freestyler', rarity: 'commune', title: 'Rappeur Freestyler', image: 'cards/toti-freestyler.webp', fullCard: true },
      { id: 'toti-ombre', rarity: 'rare', title: 'Rappeur de l’Ombre', image: 'cards/toti-ombre.webp', fullCard: true },
      { id: 'toti-sage', rarity: 'epique', title: 'Version Sage ?', image: 'cards/toti-sage.webp', fullCard: true },
    ],
  },
  {
    id: 'cliffouman',
    name: 'Cliffouman',
    bio: 'Le Brad Pitt des voyageurs. Tyler Durden, Snatch, la pointe de l’épée.',
    variants: [
      { id: 'cliffouman-solo', rarity: 'peu_commune', title: 'Le Brad Pitt des voyageurs', image: 'cards/cliffouman.webp', fullCard: true },
      { id: 'cliffouman-racli', rarity: 'legendaire', title: 'Cliffouman et sa Racli', image: 'cards/cliffouman-racli.webp', fullCard: true },
      { id: 'cliffouman-gold', rarity: 'mythique', title: 'Le Number One · Gold Edition', image: 'cards/cliffouman-gold.webp', fullCard: true },
    ],
  },
  {
    id: 'david-lopez',
    name: 'David Lopez',
    bio: 'Gitan très très énervé. Constamment, tout le temps. Ne le cherchez jamais.',
    variants: [
      { id: 'david-lopez-fureur', rarity: 'commune', title: 'Gitan très très énervé', image: 'cards/david-lopez.webp', fullCard: true },
    ],
  },
  // ── Personnages d'exemple (à retirer quand il y aura assez de vrais) ──
  {
    id: 'patron',
    name: 'Le Patron',
    bio: 'Tient le comptoir depuis toujours. Connaît tous les secrets du quartier.',
    variants: [
      { id: 'patron-c', rarity: 'commune', title: 'Derrière le comptoir' },
      { id: 'patron-r', rarity: 'rare', title: 'Tournée générale' },
      { id: 'patron-l', rarity: 'legendaire', title: 'Fermeture à 6h' },
      { id: 'patron-s', rarity: 'secrete', title: 'Le Patron Éternel' },
    ],
  },
  {
    id: 'reine',
    name: 'La Reine du Marché',
    bio: 'Ses prix sont imbattables, sa voix porte jusqu’à la mairie.',
    variants: [
      { id: 'reine-c', rarity: 'commune', title: 'Étal du samedi' },
      { id: 'reine-pc', rarity: 'peu_commune', title: 'Prix cassés' },
      { id: 'reine-e', rarity: 'epique', title: 'Criée royale' },
      { id: 'reine-m', rarity: 'mythique', title: 'Impératrice des Halles' },
    ],
  },
  {
    id: 'coach',
    name: 'Le Coach',
    bio: 'Entraîne l’équipe locale. N’a jamais perdu un débat.',
    variants: [
      { id: 'coach-c', rarity: 'commune', title: 'Sifflet au cou' },
      { id: 'coach-pc', rarity: 'peu_commune', title: 'Causerie d’avant-match' },
      { id: 'coach-r', rarity: 'rare', title: 'Tactique secrète' },
      { id: 'coach-l', rarity: 'legendaire', title: 'Remontada' },
    ],
  },
  {
    id: 'dj',
    name: 'DJ Minuit',
    bio: 'Toutes les fêtes passent par ses platines.',
    variants: [
      { id: 'dj-c', rarity: 'commune', title: 'Balance son' },
      { id: 'dj-r', rarity: 'rare', title: 'Drop de 2h' },
      { id: 'dj-e', rarity: 'epique', title: 'Main Stage' },
      { id: 'dj-m', rarity: 'mythique', title: 'Le Son Interdit' },
    ],
  },
  {
    id: 'mamie',
    name: 'Mamie Turbo',
    bio: 'Plus rapide en scooter que n’importe qui. Gâteaux légendaires.',
    variants: [
      { id: 'mamie-c', rarity: 'commune', title: 'Tricot du dimanche' },
      { id: 'mamie-pc', rarity: 'peu_commune', title: 'Tarte aux pommes' },
      { id: 'mamie-e', rarity: 'epique', title: 'Scooter turbo' },
      { id: 'mamie-l', rarity: 'legendaire', title: 'La Doyenne' },
    ],
  },
  {
    id: 'influ',
    name: 'L’Influenceur',
    bio: '12 000 abonnés, et il vous le rappellera.',
    variants: [
      { id: 'influ-c', rarity: 'commune', title: 'Story du matin' },
      { id: 'influ-pc', rarity: 'peu_commune', title: 'Placement de produit' },
      { id: 'influ-r', rarity: 'rare', title: 'Live à 3h' },
      { id: 'influ-e', rarity: 'epique', title: 'Vu partout' },
    ],
  },
  {
    id: 'meca',
    name: 'Le Mécano',
    bio: 'Répare tout avec un tournevis et un regard.',
    variants: [
      { id: 'meca-c', rarity: 'commune', title: 'Mains dans le cambouis' },
      { id: 'meca-pc', rarity: 'peu_commune', title: 'Diagnostic express' },
      { id: 'meca-r', rarity: 'rare', title: 'Moteur V8' },
      { id: 'meca-m', rarity: 'mythique', title: 'Le Garage Fantôme' },
    ],
  },
  {
    id: 'maire',
    name: 'Monsieur le Maire',
    bio: 'Inaugure tout ce qui peut l’être. Même les ronds-points.',
    variants: [
      { id: 'maire-c', rarity: 'commune', title: 'Ruban rouge' },
      { id: 'maire-pc', rarity: 'peu_commune', title: 'Discours fleuve' },
      { id: 'maire-e', rarity: 'epique', title: 'Campagne éclair' },
      { id: 'maire-l', rarity: 'legendaire', title: 'Mandat éternel' },
    ],
  },
  {
    id: 'facteur',
    name: 'Le Facteur',
    bio: 'Sait qui reçoit quoi. Ne dit rien. Enfin, presque.',
    variants: [
      { id: 'facteur-c', rarity: 'commune', title: 'Tournée matinale' },
      { id: 'facteur-pc', rarity: 'peu_commune', title: 'Colis suspect' },
      { id: 'facteur-r', rarity: 'rare', title: 'Recommandé' },
    ],
  },
  {
    id: 'boulangere',
    name: 'La Boulangère',
    bio: 'Debout à 4h, sourire à 7h, rupture de stock à 8h.',
    variants: [
      { id: 'boul-c', rarity: 'commune', title: 'Fournée de 4h' },
      { id: 'boul-pc', rarity: 'peu_commune', title: 'Dernière baguette' },
      { id: 'boul-r', rarity: 'rare', title: 'Croissant d’or' },
      { id: 'boul-e', rarity: 'epique', title: 'Galette des Rois' },
    ],
  },
  {
    id: 'gamer',
    name: 'Le Gamer',
    bio: 'N’a pas vu le soleil depuis 2019. Champion régional.',
    variants: [
      { id: 'gamer-c', rarity: 'commune', title: 'Encore une partie' },
      { id: 'gamer-pc', rarity: 'peu_commune', title: 'Rage quit' },
      { id: 'gamer-r', rarity: 'rare', title: 'Clutch 1v5' },
      { id: 'gamer-l', rarity: 'legendaire', title: 'Speedrun mondial' },
    ],
  },
  {
    id: 'voisine',
    name: 'La Voisine',
    bio: 'Derrière le rideau, rien ne lui échappe.',
    variants: [
      { id: 'voisine-c', rarity: 'commune', title: 'Rideau entrouvert' },
      { id: 'voisine-pc', rarity: 'peu_commune', title: 'Rumeur du jour' },
      { id: 'voisine-r', rarity: 'rare', title: 'Jumelles' },
      { id: 'voisine-s', rarity: 'secrete', title: 'Elle Sait Tout' },
    ],
  },
];

export interface FlatVariant extends Variant {
  characterId: string;
  characterName: string;
}

export const VARIANTS: FlatVariant[] = CHARACTERS.flatMap((c) =>
  c.variants.map((v) => ({ ...v, characterId: c.id, characterName: c.name })),
);

export const VARIANT_BY_ID: Record<string, FlatVariant> = Object.fromEntries(VARIANTS.map((v) => [v.id, v]));
export const CHARACTER_BY_ID: Record<string, Character> = Object.fromEntries(CHARACTERS.map((c) => [c.id, c]));
