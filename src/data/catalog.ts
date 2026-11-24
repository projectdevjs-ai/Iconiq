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
  /** largeur/hauteur de l'image (2/3 par défaut, 3/4 pour les cartes 864×1152) */
  ratio?: number;
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
      { id: 'david-bodybuilde', rarity: 'peu_commune', title: 'Gitan bodybuildé', image: 'cards/david-bodybuilde.webp', fullCard: true, ratio: 3 / 4 },
      { id: 'david-repenti', rarity: 'rare', title: 'David Lopez repenti', image: 'cards/david-repenti.webp', fullCard: true, ratio: 3 / 4 },
      { id: 'david-repenti-gold', rarity: 'mythique', title: 'Repenti · Gold Edition', image: 'cards/david-repenti-gold.webp', fullCard: true, ratio: 3 / 4 },
    ],
  },
  {
    id: 'joe-lopez',
    name: 'Joe Lopez',
    bio: 'Chef de clan. Il promet toujours de venir seul, mais toute la famille surgit des buissons.',
    variants: [
      { id: 'joe-clan', rarity: 'commune', title: 'Chef de clan', image: 'cards/joe-clan.webp', fullCard: true, ratio: 3 / 4 },
      { id: 'joe-repenti', rarity: 'peu_commune', title: 'Joe Lopez repenti', image: 'cards/joe-repenti.webp', fullCard: true, ratio: 3 / 4 },
      { id: 'joe-repenti-gold', rarity: 'mythique', title: 'Repenti · Gold Edition', image: 'cards/joe-repenti-gold.webp', fullCard: true, ratio: 3 / 4 },
      { id: 'joe-cascade', rarity: 'secrete', title: 'L’Élu de la Cascade', image: 'cards/joe-cascade.webp', fullCard: true, ratio: 3 / 4 },
    ],
  },
  {
    id: 'kendji',
    name: 'Kendji Girac',
    bio: 'Du campement aux Zéniths, puis les gros titres. La guitare reste accrochée.',
    variants: [
      { id: 'kendji-depression', rarity: 'commune', title: 'Mode Dépression', image: 'cards/kendji-depression.webp', fullCard: true, ratio: 3 / 4 },
      { id: 'kendji-mure', rarity: 'commune', title: 'Époque Mûre', image: 'cards/kendji-mure.webp', fullCard: true, ratio: 3 / 4 },
      { id: 'kendji-or', rarity: 'peu_commune', title: 'L’Âge d’Or', image: 'cards/kendji-or.webp', fullCard: true, ratio: 3 / 4 },
      { id: 'kendji-gold', rarity: 'legendaire', title: 'Gold Edition', image: 'cards/kendji-gold.webp', fullCard: true, ratio: 3 / 4 },
    ],
  },
  {
    id: 'henoc',
    name: 'Hénoc Cortez',
    bio: 'Toujours prêt à prendre le micro, surtout si la famille Lopez regarde.',
    variants: [
      { id: 'henoc-tele', rarity: 'commune', title: 'Plateau Télé', image: 'cards/henoc-tele.webp', fullCard: true, ratio: 3 / 4 },
      { id: 'henoc-coudz', rarity: 'peu_commune', title: 'Hénoc Cortez et son Coudz', image: 'cards/henoc-coudz.webp', fullCard: true, ratio: 3 / 4 },
      { id: 'henoc-or', rarity: 'legendaire', title: 'Plaqué Or · Golden Edition', image: 'cards/henoc-or.webp', fullCard: true, ratio: 3 / 4 },
      { id: 'henoc-or-fullart', rarity: 'mythique', title: 'Plaqué Or · Golden Full Art', image: 'cards/henoc-or-fullart.webp', fullCard: true, ratio: 3 / 4 },
    ],
  },
  {
    id: 'sandy',
    name: 'Sandy Family',
    bio: 'Chaque semaine son scandale, chaque soir sa boconaise.',
    variants: [
      { id: 'sandy-courses', rarity: 'commune', title: 'Courses & Repentir', image: 'cards/sandy-courses.webp', fullCard: true, ratio: 3 / 4 },
      { id: 'sandy-retour', rarity: 'commune', title: 'Le Retour en Force', image: 'cards/sandy-retour.webp', fullCard: true, ratio: 3 / 4 },
      { id: 'sandy-discours', rarity: 'peu_commune', title: 'Discours Solennel', image: 'cards/sandy-discours.webp', fullCard: true, ratio: 3 / 4 },
      { id: 'sandy-gold', rarity: 'legendaire', title: 'Gold Edition', image: 'cards/sandy-gold.webp', fullCard: true, ratio: 3 / 4 },
    ],
  },
  {
    id: 'sandra',
    name: 'Sandra Baratier',
    bio: 'Ring light, churros et lives jusqu’à 2h du matin.',
    variants: [
      { id: 'sandra-churros', rarity: 'commune', title: 'Churros', image: 'cards/sandra-churros.webp', fullCard: true, ratio: 3 / 4 },
      { id: 'sandra-haul', rarity: 'commune', title: 'Haul', image: 'cards/sandra-haul.webp', fullCard: true, ratio: 3 / 4 },
      { id: 'sandra-live', rarity: 'rare', title: 'Live', image: 'cards/sandra-live.webp', fullCard: true, ratio: 3 / 4 },
      { id: 'sandra-max', rarity: 'secrete', title: 'Ultra Rare Légendaire Maximum ++', image: 'cards/sandra-max.webp', fullCard: true, ratio: 3 / 4 },
    ],
  },
  {
    id: 'aonji',
    name: 'Aonji',
    bio: 'Homme ou femme ? Personne ne sait. Le sourire, lui, est garanti.',
    variants: [
      { id: 'aonji-caravane', rarity: 'commune', title: 'Mystère de la Caravane', image: 'cards/aonji-caravane.webp', fullCard: true, ratio: 3 / 4 },
      { id: 'aonji-chic', rarity: 'peu_commune', title: 'Chic & Mystère', image: 'cards/aonji-chic.webp', fullCard: true, ratio: 3 / 4 },
      { id: 'aonji-vapeur', rarity: 'rare', title: 'Édition Vapeur', image: 'cards/aonji-vapeur.webp', fullCard: true, ratio: 3 / 4 },
      { id: 'aonji-gold', rarity: 'legendaire', title: 'Gold Edition', image: 'cards/aonji-gold.webp', fullCard: true, ratio: 3 / 4 },
    ],
  },
  {
    id: 'tiou',
    name: 'Tiou Duvil',
    bio: 'Reine du live. Plus ça choque, plus les vues grimpent.',
    variants: [
      { id: 'tiou-live', rarity: 'commune', title: 'Reine du Live', image: 'cards/tiou-live.webp', fullCard: true, ratio: 3 / 4 },
      { id: 'tiou-ultra', rarity: 'mythique', title: 'Ultra Rare · Limited Edition', image: 'cards/tiou-ultra.webp', fullCard: true, ratio: 3 / 4 },
    ],
  },
  {
    id: 'lolita',
    name: 'Lolita Duvil',
    bio: 'Mariages, niversaires, tout. Son palmier gonflable est légendaire.',
    variants: [
      { id: 'lolita', rarity: 'secrete', title: 'Édition Spéciale · Unique', image: 'cards/lolita.webp', fullCard: true, ratio: 3 / 4 },
    ],
  },
  {
    id: 'louis',
    name: 'Louis Gouyon de Matignon',
    bio: 'Parle mieux voyageur que les voyageurs eux-mêmes.',
    variants: [
      { id: 'louis-voyageur', rarity: 'legendaire', title: 'Parle Mieux Voyageur', image: 'cards/louis-voyageur.webp', fullCard: true, ratio: 3 / 4 },
      { id: 'louis-chapiteau', rarity: 'legendaire', title: 'Bénédiction du Chapiteau', image: 'cards/louis-chapiteau.webp', fullCard: true, ratio: 3 / 4 },
      { id: 'louis-familles', rarity: 'mythique', title: 'Dédicace aux Familles', image: 'cards/louis-familles.webp', fullCard: true, ratio: 3 / 4 },
    ],
  },
  {
    id: 'homme-place',
    name: 'Homme de la Place',
    bio: 'Quand il s’approche de la caméra, il est déjà trop tard.',
    variants: [
      { id: 'place-barbu', rarity: 'epique', title: 'Tu vas repartir mal mon copain', image: 'cards/place-barbu.webp', fullCard: true, ratio: 3 / 4 },
      { id: 'place-stand', rarity: 'epique', title: 'Peinture, pinceau et euh… pinceau', image: 'cards/place-stand.webp', fullCard: true, ratio: 3 / 4 },
      { id: 'place-moonwalk', rarity: 'secrete', title: 'Moonwalk sur le Terrain', image: 'cards/place-moonwalk.webp', fullCard: true, ratio: 3 / 4 },
    ],
  },
  {
    id: 'homme-terrain',
    name: 'Homme du Terrain',
    bio: 'Quand il annonce la couleur, tout le terrain recule.',
    variants: [
      { id: 'terrain', rarity: 'epique', title: 'J’annonce : faut que ça tombe', image: 'cards/terrain.webp', fullCard: true, ratio: 3 / 4 },
    ],
  },
  {
    id: 'mayer',
    name: '100% Mayer',
    bio: 'Short à palmiers, salon cuir beige : 100% authentique.',
    variants: [
      { id: 'mayer', rarity: 'secrete', title: 'Édition Spéciale · Unique', image: 'cards/mayer.webp', fullCard: true, ratio: 3 / 4 },
    ],
  },
  {
    id: 'cherklo',
    name: 'Cherklo',
    bio: 'Petit jeune au calme légendaire. Mythe d’Internet.',
    variants: [
      { id: 'cherklo', rarity: 'secrete', title: 'Édition Spéciale · Unique', image: 'cards/cherklo.webp', fullCard: true, ratio: 3 / 4 },
    ],
  },
  {
    id: 'comi',
    name: 'Les Comis',
    bio: 'Tirés dans tous les boosters, jamais mis dans un deck.',
    variants: [
      { id: 'comi-park', rarity: 'commune', title: 'Comi du Park · Ultra Commune', image: 'cards/comi-park.webp', fullCard: true, ratio: 3 / 4 },
      { id: 'comi-village', rarity: 'rare', title: 'Comi du Village · Jigoubougoula', image: 'cards/comi-village.webp', fullCard: true, ratio: 3 / 4 },
    ],
  },
  {
    id: 'mouchoir',
    name: 'Le Mouchoir',
    bio: 'Carte Objet · Tradition. Impossible de tricher avec la tradition.',
    variants: [
      { id: 'mouchoir', rarity: 'epique', title: 'Carte Objet · Tradition', image: 'cards/mouchoir.webp', fullCard: true, ratio: 3 / 4 },
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

/** Proportions de la carte (largeur / hauteur). */
export const cardRatio = (v: { ratio?: number }) => v.ratio ?? 2 / 3;
