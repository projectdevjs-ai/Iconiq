// Génère supabase/seed.sql depuis src/config/game.ts + src/data/catalog.ts
// Usage : npm run seed
import { writeFileSync } from 'node:fs';
import { build } from 'esbuild';

// on « compile » les règles TypeScript du jeu pour les lire ici (source unique)
const out = await build({
  stdin: { contents: "export * from './src/config/game.ts'; export * from './src/data/catalog.ts'; export * from './src/engine/rewards.ts';", resolveDir: process.cwd(), loader: 'ts' },
  bundle: true, write: false, format: 'esm', platform: 'node', logLevel: 'silent',
});
const { GAME, RARITIES, PACKS, PITY, GEM_BUNDLES, STREAK_GIFT, CHARACTERS, QUESTS, ACHIEVEMENTS, WHEEL } =
  await import('data:text/javascript;base64,' + Buffer.from(out.outputFiles[0].text).toString('base64'));

const q = (s) => (s == null ? 'null' : `'${String(s).replace(/'/g, "''")}'`);
const lines = ['-- AUTO-GÉNÉRÉ par scripts/gen-seed.mjs — ne pas modifier à la main', 'begin;'];

lines.push(`insert into game_config values (1, ${GAME.cardsPerPack}, ${GAME.dailyCooldownHours}, ${GAME.dailyCredits}, ${GAME.streakBonusPerDay}, ${GAME.streakBonusMax}, ${GAME.marketFeePct}, ${GAME.startCredits}, ${PITY.epicEvery}, ${PITY.legendaryEvery})
on conflict (id) do update set cards_per_pack = excluded.cards_per_pack, daily_cooldown_hours = excluded.daily_cooldown_hours,
  daily_credits = excluded.daily_credits, streak_bonus_per_day = excluded.streak_bonus_per_day, streak_bonus_max = excluded.streak_bonus_max,
  market_fee_pct = excluded.market_fee_pct, start_credits = excluded.start_credits, pity_epic_every = excluded.pity_epic_every,
  pity_legendary_every = excluded.pity_legendary_every;`);
lines.push(`update game_config set streak_gift_every = ${STREAK_GIFT.every}, streak_gift_credits = ${STREAK_GIFT.credits}, streak_gift_shards = ${STREAK_GIFT.shards} where id = 1;`);

for (const r of RARITIES)
  lines.push(`insert into rarities values (${q(r.id)}, ${q(r.label)}, ${r.rank}, ${r.weight}, ${r.recycle}, ${r.craft}, ${r.serialized})
on conflict (id) do update set label = excluded.label, weight = excluded.weight, recycle = excluded.recycle, craft = excluded.craft, serialized = excluded.serialized;`);

for (const p of PACKS) {
  const chars = p.characters ? `array[${p.characters.map(q).join(',')}]::text[]` : 'null';
  lines.push(`insert into pack_types(id, name, cost_credits, cost_gems, last_slot_min, active, character_ids, ends_at) values (${q(p.id)}, ${q(p.name)}, ${p.costCredits ?? 'null'}, ${p.costGems ?? 'null'}, ${q(p.lastSlotMin)}, true, ${chars}, ${q(p.endsAt ?? null)})
on conflict (id) do update set name = excluded.name, cost_credits = excluded.cost_credits, cost_gems = excluded.cost_gems, last_slot_min = excluded.last_slot_min, active = true, character_ids = excluded.character_ids, ends_at = excluded.ends_at;`);
}
lines.push('delete from quests; delete from achievements; delete from wheel_prizes;');
for (const x of QUESTS) lines.push(`insert into quests values (${q(x.id)}, ${q(x.stat)}, ${x.goal}, ${x.reward.credits ?? 0}, ${x.reward.shards ?? 0});`);
for (const x of ACHIEVEMENTS) lines.push(`insert into achievements values (${q(x.id)}, ${q(x.kind)}, ${x.goal}, ${x.reward.credits ?? 0}, ${x.reward.shards ?? 0});`);
WHEEL.forEach((w, i) => lines.push(`insert into wheel_prizes values (${i}, ${w.weight}, ${w.reward.credits ?? 0}, ${w.reward.shards ?? 0}, ${!!w.reward.freePack});`));

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

// Fichier unique à coller dans Supabase (SQL Editor) : schéma + mises à jour + données
import { readFileSync, readdirSync } from 'node:fs';
const dir = new URL('../supabase/migrations/', import.meta.url);
const parts = readdirSync(dir).filter((f) => f.endsWith('.sql')).sort().map((f) => `-- ═══ ${f} ═══\n` + readFileSync(new URL(f, dir), 'utf8'));
parts.push('-- ═══ seed.sql ═══\n' + readFileSync(new URL('../supabase/seed.sql', import.meta.url), 'utf8'));
writeFileSync(new URL('../supabase/setup.sql', import.meta.url), '-- ICONIQ : copie TOUT ce fichier dans Supabase > SQL Editor, puis « Run ».\n\n' + parts.join('\n\n'));
console.log('setup.sql généré (à coller dans Supabase).');
