// Génère supabase/seed.sql depuis src/config/game.ts + src/data/catalog.ts
// Usage : npm run seed
import { writeFileSync } from 'node:fs';
import { GAME, RARITIES, PACKS, PITY, GEM_BUNDLES } from '../src/config/game.ts';
import { CHARACTERS } from '../src/data/catalog.ts';

const q = (s) => (s == null ? 'null' : `'${String(s).replace(/'/g, "''")}'`);
const lines = ['-- AUTO-GÉNÉRÉ par scripts/gen-seed.mjs — ne pas modifier à la main', 'begin;'];

lines.push(`insert into game_config values (1, ${GAME.cardsPerPack}, ${GAME.dailyCooldownHours}, ${GAME.dailyCredits}, ${GAME.streakBonusPerDay}, ${GAME.streakBonusMax}, ${GAME.marketFeePct}, ${GAME.startCredits}, ${PITY.epicEvery}, ${PITY.legendaryEvery})
on conflict (id) do update set cards_per_pack = excluded.cards_per_pack, daily_cooldown_hours = excluded.daily_cooldown_hours,
  daily_credits = excluded.daily_credits, streak_bonus_per_day = excluded.streak_bonus_per_day, streak_bonus_max = excluded.streak_bonus_max,
  market_fee_pct = excluded.market_fee_pct, start_credits = excluded.start_credits, pity_epic_every = excluded.pity_epic_every,
  pity_legendary_every = excluded.pity_legendary_every;`);

for (const r of RARITIES)
  lines.push(`insert into rarities values (${q(r.id)}, ${q(r.label)}, ${r.rank}, ${r.weight}, ${r.recycle}, ${r.craft}, ${r.serialized})
on conflict (id) do update set label = excluded.label, weight = excluded.weight, recycle = excluded.recycle, craft = excluded.craft, serialized = excluded.serialized;`);

for (const p of PACKS)
  lines.push(`insert into pack_types values (${q(p.id)}, ${q(p.name)}, ${p.costCredits ?? 'null'}, ${p.costGems ?? 'null'}, ${q(p.lastSlotMin)}, true)
on conflict (id) do update set name = excluded.name, cost_credits = excluded.cost_credits, cost_gems = excluded.cost_gems, last_slot_min = excluded.last_slot_min, active = true;`);

for (const b of GEM_BUNDLES)
  lines.push(`insert into gem_bundles values (${q(b.id)}, ${b.gems}, ${b.priceCents}, ${q(b.label)})
on conflict (id) do update set gems = excluded.gems, price_cents = excluded.price_cents, label = excluded.label;`);

lines.push('update card_variants set active = false;');
for (const c of CHARACTERS) {
  lines.push(`insert into characters values (${q(c.id)}, ${q(c.name)}, ${q(c.bio)}) on conflict (id) do update set name = excluded.name, bio = excluded.bio;`);
  for (const v of c.variants)
    lines.push(`insert into card_variants values (${q(v.id)}, ${q(c.id)}, ${q(v.rarity)}, ${q(v.title)}, true)
on conflict (id) do update set character_id = excluded.character_id, rarity = excluded.rarity, title = excluded.title, active = true;`);
}
lines.push('commit;');
writeFileSync(new URL('../supabase/seed.sql', import.meta.url), lines.join('\n') + '\n');
console.log(`seed.sql généré : ${CHARACTERS.length} personnages, ${CHARACTERS.reduce((n, c) => n + c.variants.length, 0)} cartes.`);
