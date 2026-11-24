-- AUTO-GÉNÉRÉ par scripts/gen-seed.mjs — ne pas modifier à la main
begin;
insert into game_config values (1, 5, 20, 100, 15, 150, 5, 500, 10, 40)
on conflict (id) do update set cards_per_pack = excluded.cards_per_pack, daily_cooldown_hours = excluded.daily_cooldown_hours,
  daily_credits = excluded.daily_credits, streak_bonus_per_day = excluded.streak_bonus_per_day, streak_bonus_max = excluded.streak_bonus_max,
  market_fee_pct = excluded.market_fee_pct, start_credits = excluded.start_credits, pity_epic_every = excluded.pity_epic_every,
  pity_legendary_every = excluded.pity_legendary_every;
update game_config set streak_gift_every = 7, streak_gift_credits = 500, streak_gift_shards = 100 where id = 1;
insert into rarities values ('commune', 'Commune', 0, 0.6, 5, 40, false)
on conflict (id) do update set label = excluded.label, weight = excluded.weight, recycle = excluded.recycle, craft = excluded.craft, serialized = excluded.serialized;
insert into rarities values ('peu_commune', 'Peu commune', 1, 0.25, 15, 100, false)
on conflict (id) do update set label = excluded.label, weight = excluded.weight, recycle = excluded.recycle, craft = excluded.craft, serialized = excluded.serialized;
insert into rarities values ('rare', 'Rare', 2, 0.1, 50, 300, false)
on conflict (id) do update set label = excluded.label, weight = excluded.weight, recycle = excluded.recycle, craft = excluded.craft, serialized = excluded.serialized;
insert into rarities values ('epique', 'Épique', 3, 0.036, 150, 900, false)
on conflict (id) do update set label = excluded.label, weight = excluded.weight, recycle = excluded.recycle, craft = excluded.craft, serialized = excluded.serialized;
insert into rarities values ('legendaire', 'Légendaire', 4, 0.011, 500, 3000, false)
on conflict (id) do update set label = excluded.label, weight = excluded.weight, recycle = excluded.recycle, craft = excluded.craft, serialized = excluded.serialized;
insert into rarities values ('mythique', 'Mythique', 5, 0.0025, 1500, 10000, true)
on conflict (id) do update set label = excluded.label, weight = excluded.weight, recycle = excluded.recycle, craft = excluded.craft, serialized = excluded.serialized;
insert into rarities values ('secrete', 'Secrète', 6, 0.0005, 5000, 40000, true)
on conflict (id) do update set label = excluded.label, weight = excluded.weight, recycle = excluded.recycle, craft = excluded.craft, serialized = excluded.serialized;
insert into pack_types(id, name, cost_credits, cost_gems, last_slot_min, active, character_ids, ends_at) values ('standard', 'Pack Standard', 300, 30, 'rare', true, null, null)
on conflict (id) do update set name = excluded.name, cost_credits = excluded.cost_credits, cost_gems = excluded.cost_gems, last_slot_min = excluded.last_slot_min, active = true, character_ids = excluded.character_ids, ends_at = excluded.ends_at;
insert into pack_types(id, name, cost_credits, cost_gems, last_slot_min, active, character_ids, ends_at) values ('prestige', 'Pack Prestige', 1200, 110, 'epique', true, null, null)
on conflict (id) do update set name = excluded.name, cost_credits = excluded.cost_credits, cost_gems = excluded.cost_gems, last_slot_min = excluded.last_slot_min, active = true, character_ids = excluded.character_ids, ends_at = excluded.ends_at;
insert into pack_types(id, name, cost_credits, cost_gems, last_slot_min, active, character_ids, ends_at) values ('lopez', 'Pack Famille Lopez', 400, 40, 'rare', true, array['david-lopez','joe-lopez']::text[], '2026-12-14T23:00:00Z')
on conflict (id) do update set name = excluded.name, cost_credits = excluded.cost_credits, cost_gems = excluded.cost_gems, last_slot_min = excluded.last_slot_min, active = true, character_ids = excluded.character_ids, ends_at = excluded.ends_at;
delete from quests; delete from achievements; delete from wheel_prizes;
insert into quests values ('daily', 'daily', 1, 0, 50);
insert into quests values ('open3', 'packs', 3, 200, 0);
insert into quests values ('recycle5', 'recycled', 5, 120, 0);
insert into achievements values ('pack1', 'packs', 1, 100, 0);
insert into achievements values ('pack10', 'packs', 10, 300, 0);
insert into achievements values ('pack50', 'packs', 50, 1000, 0);
insert into achievements values ('pack200', 'packs', 200, 4000, 0);
insert into achievements values ('epic', 'rank', 3, 200, 0);
insert into achievements values ('legend', 'rank', 4, 500, 0);
insert into achievements values ('mythic', 'rank', 5, 1000, 200);
insert into achievements values ('secret', 'rank', 6, 3000, 1000);
insert into achievements values ('col25', 'collection', 25, 500, 0);
insert into achievements values ('col50', 'collection', 50, 1500, 0);
insert into achievements values ('col100', 'collection', 100, 10000, 5000);
insert into achievements values ('streak7', 'streak', 7, 700, 0);
insert into achievements values ('streak30', 'streak', 30, 5000, 0);
insert into wheel_prizes values (0, 26, 100, 0, false);
insert into wheel_prizes values (1, 20, 0, 30, false);
insert into wheel_prizes values (2, 16, 250, 0, false);
insert into wheel_prizes values (3, 12, 0, 100, false);
insert into wheel_prizes values (4, 9, 500, 0, false);
insert into wheel_prizes values (5, 8, 0, 0, true);
insert into wheel_prizes values (6, 6, 1000, 0, false);
insert into wheel_prizes values (7, 3, 0, 500, false);
insert into gem_bundles values ('gems_s', 100, 199, 'Poignée de gemmes')
on conflict (id) do update set gems = excluded.gems, price_cents = excluded.price_cents, label = excluded.label;
insert into gem_bundles values ('gems_m', 550, 999, 'Sac de gemmes')
on conflict (id) do update set gems = excluded.gems, price_cents = excluded.price_cents, label = excluded.label;
insert into gem_bundles values ('gems_l', 1200, 1999, 'Coffre de gemmes')
on conflict (id) do update set gems = excluded.gems, price_cents = excluded.price_cents, label = excluded.label;
insert into gem_bundles values ('gems_xl', 3300, 4999, 'Trésor')
on conflict (id) do update set gems = excluded.gems, price_cents = excluded.price_cents, label = excluded.label;
update card_variants set active = false;
insert into characters values ('toti', 'Toti Pro', 'Rappeur freestyler. Il erre dans sa caravane en crachant des freestyles légendaires.') on conflict (id) do update set name = excluded.name, bio = excluded.bio;
insert into card_variants values ('toti-freestyler', 'toti', 'commune', 'Rappeur Freestyler', true)
on conflict (id) do update set character_id = excluded.character_id, rarity = excluded.rarity, title = excluded.title, active = true;
insert into card_variants values ('toti-ombre', 'toti', 'rare', 'Rappeur de l’Ombre', true)
on conflict (id) do update set character_id = excluded.character_id, rarity = excluded.rarity, title = excluded.title, active = true;
insert into card_variants values ('toti-sage', 'toti', 'epique', 'Version Sage ?', true)
on conflict (id) do update set character_id = excluded.character_id, rarity = excluded.rarity, title = excluded.title, active = true;
insert into characters values ('cliffouman', 'Cliffouman', 'Le Brad Pitt des voyageurs. Tyler Durden, Snatch, la pointe de l’épée.') on conflict (id) do update set name = excluded.name, bio = excluded.bio;
insert into card_variants values ('cliffouman-solo', 'cliffouman', 'peu_commune', 'Le Brad Pitt des voyageurs', true)
on conflict (id) do update set character_id = excluded.character_id, rarity = excluded.rarity, title = excluded.title, active = true;
insert into card_variants values ('cliffouman-racli', 'cliffouman', 'legendaire', 'Cliffouman et sa Racli', true)
on conflict (id) do update set character_id = excluded.character_id, rarity = excluded.rarity, title = excluded.title, active = true;
insert into card_variants values ('cliffouman-gold', 'cliffouman', 'mythique', 'Le Number One · Gold Edition', true)
on conflict (id) do update set character_id = excluded.character_id, rarity = excluded.rarity, title = excluded.title, active = true;
insert into characters values ('david-lopez', 'David Lopez', 'Gitan très très énervé. Constamment, tout le temps. Ne le cherchez jamais.') on conflict (id) do update set name = excluded.name, bio = excluded.bio;
insert into card_variants values ('david-lopez-fureur', 'david-lopez', 'commune', 'Gitan très très énervé', true)
on conflict (id) do update set character_id = excluded.character_id, rarity = excluded.rarity, title = excluded.title, active = true;
insert into card_variants values ('david-bodybuilde', 'david-lopez', 'peu_commune', 'Gitan bodybuildé', true)
on conflict (id) do update set character_id = excluded.character_id, rarity = excluded.rarity, title = excluded.title, active = true;
insert into card_variants values ('david-repenti', 'david-lopez', 'rare', 'David Lopez repenti', true)
on conflict (id) do update set character_id = excluded.character_id, rarity = excluded.rarity, title = excluded.title, active = true;
insert into card_variants values ('david-repenti-gold', 'david-lopez', 'mythique', 'Repenti · Gold Edition', true)
on conflict (id) do update set character_id = excluded.character_id, rarity = excluded.rarity, title = excluded.title, active = true;
insert into characters values ('joe-lopez', 'Joe Lopez', 'Chef de clan. Il promet toujours de venir seul, mais toute la famille surgit des buissons.') on conflict (id) do update set name = excluded.name, bio = excluded.bio;
insert into card_variants values ('joe-clan', 'joe-lopez', 'commune', 'Chef de clan', true)
on conflict (id) do update set character_id = excluded.character_id, rarity = excluded.rarity, title = excluded.title, active = true;
insert into card_variants values ('joe-repenti', 'joe-lopez', 'peu_commune', 'Joe Lopez repenti', true)
on conflict (id) do update set character_id = excluded.character_id, rarity = excluded.rarity, title = excluded.title, active = true;
insert into card_variants values ('joe-repenti-gold', 'joe-lopez', 'mythique', 'Repenti · Gold Edition', true)
on conflict (id) do update set character_id = excluded.character_id, rarity = excluded.rarity, title = excluded.title, active = true;
insert into card_variants values ('joe-cascade', 'joe-lopez', 'secrete', 'L’Élu de la Cascade', true)
on conflict (id) do update set character_id = excluded.character_id, rarity = excluded.rarity, title = excluded.title, active = true;
insert into characters values ('kendji', 'Kendji Girac', 'Du campement aux Zéniths, puis les gros titres. La guitare reste accrochée.') on conflict (id) do update set name = excluded.name, bio = excluded.bio;
insert into card_variants values ('kendji-depression', 'kendji', 'commune', 'Mode Dépression', true)
on conflict (id) do update set character_id = excluded.character_id, rarity = excluded.rarity, title = excluded.title, active = true;
insert into card_variants values ('kendji-mure', 'kendji', 'commune', 'Époque Mûre', true)
on conflict (id) do update set character_id = excluded.character_id, rarity = excluded.rarity, title = excluded.title, active = true;
insert into card_variants values ('kendji-or', 'kendji', 'peu_commune', 'L’Âge d’Or', true)
on conflict (id) do update set character_id = excluded.character_id, rarity = excluded.rarity, title = excluded.title, active = true;
insert into card_variants values ('kendji-gold', 'kendji', 'legendaire', 'Gold Edition', true)
on conflict (id) do update set character_id = excluded.character_id, rarity = excluded.rarity, title = excluded.title, active = true;
insert into characters values ('henoc', 'Hénoc Cortez', 'Toujours prêt à prendre le micro, surtout si la famille Lopez regarde.') on conflict (id) do update set name = excluded.name, bio = excluded.bio;
insert into card_variants values ('henoc-tele', 'henoc', 'commune', 'Plateau Télé', true)
on conflict (id) do update set character_id = excluded.character_id, rarity = excluded.rarity, title = excluded.title, active = true;
insert into card_variants values ('henoc-coudz', 'henoc', 'peu_commune', 'Hénoc Cortez et son Coudz', true)
on conflict (id) do update set character_id = excluded.character_id, rarity = excluded.rarity, title = excluded.title, active = true;
insert into card_variants values ('henoc-or', 'henoc', 'legendaire', 'Plaqué Or · Golden Edition', true)
on conflict (id) do update set character_id = excluded.character_id, rarity = excluded.rarity, title = excluded.title, active = true;
insert into card_variants values ('henoc-or-fullart', 'henoc', 'mythique', 'Plaqué Or · Golden Full Art', true)
on conflict (id) do update set character_id = excluded.character_id, rarity = excluded.rarity, title = excluded.title, active = true;
insert into characters values ('sandy', 'Sandy Family', 'Chaque semaine son scandale, chaque soir sa boconaise.') on conflict (id) do update set name = excluded.name, bio = excluded.bio;
insert into card_variants values ('sandy-courses', 'sandy', 'commune', 'Courses & Repentir', true)
on conflict (id) do update set character_id = excluded.character_id, rarity = excluded.rarity, title = excluded.title, active = true;
insert into card_variants values ('sandy-retour', 'sandy', 'commune', 'Le Retour en Force', true)
on conflict (id) do update set character_id = excluded.character_id, rarity = excluded.rarity, title = excluded.title, active = true;
insert into card_variants values ('sandy-discours', 'sandy', 'peu_commune', 'Discours Solennel', true)
on conflict (id) do update set character_id = excluded.character_id, rarity = excluded.rarity, title = excluded.title, active = true;
insert into card_variants values ('sandy-gold', 'sandy', 'legendaire', 'Gold Edition', true)
on conflict (id) do update set character_id = excluded.character_id, rarity = excluded.rarity, title = excluded.title, active = true;
insert into characters values ('sandra', 'Sandra Baratier', 'Ring light, churros et lives jusqu’à 2h du matin.') on conflict (id) do update set name = excluded.name, bio = excluded.bio;
insert into card_variants values ('sandra-churros', 'sandra', 'commune', 'Churros', true)
on conflict (id) do update set character_id = excluded.character_id, rarity = excluded.rarity, title = excluded.title, active = true;
insert into card_variants values ('sandra-haul', 'sandra', 'commune', 'Haul', true)
on conflict (id) do update set character_id = excluded.character_id, rarity = excluded.rarity, title = excluded.title, active = true;
insert into card_variants values ('sandra-live', 'sandra', 'rare', 'Live', true)
on conflict (id) do update set character_id = excluded.character_id, rarity = excluded.rarity, title = excluded.title, active = true;
insert into card_variants values ('sandra-max', 'sandra', 'secrete', 'Ultra Rare Légendaire Maximum ++', true)
on conflict (id) do update set character_id = excluded.character_id, rarity = excluded.rarity, title = excluded.title, active = true;
insert into characters values ('aonji', 'Aonji', 'Homme ou femme ? Personne ne sait. Le sourire, lui, est garanti.') on conflict (id) do update set name = excluded.name, bio = excluded.bio;
insert into card_variants values ('aonji-caravane', 'aonji', 'commune', 'Mystère de la Caravane', true)
on conflict (id) do update set character_id = excluded.character_id, rarity = excluded.rarity, title = excluded.title, active = true;
insert into card_variants values ('aonji-chic', 'aonji', 'peu_commune', 'Chic & Mystère', true)
on conflict (id) do update set character_id = excluded.character_id, rarity = excluded.rarity, title = excluded.title, active = true;
insert into card_variants values ('aonji-vapeur', 'aonji', 'rare', 'Édition Vapeur', true)
on conflict (id) do update set character_id = excluded.character_id, rarity = excluded.rarity, title = excluded.title, active = true;
insert into card_variants values ('aonji-gold', 'aonji', 'legendaire', 'Gold Edition', true)
on conflict (id) do update set character_id = excluded.character_id, rarity = excluded.rarity, title = excluded.title, active = true;
insert into characters values ('tiou', 'Tiou Duvil', 'Reine du live. Plus ça choque, plus les vues grimpent.') on conflict (id) do update set name = excluded.name, bio = excluded.bio;
insert into card_variants values ('tiou-live', 'tiou', 'commune', 'Reine du Live', true)
on conflict (id) do update set character_id = excluded.character_id, rarity = excluded.rarity, title = excluded.title, active = true;
insert into card_variants values ('tiou-ultra', 'tiou', 'mythique', 'Ultra Rare · Limited Edition', true)
on conflict (id) do update set character_id = excluded.character_id, rarity = excluded.rarity, title = excluded.title, active = true;
insert into characters values ('lolita', 'Lolita Duvil', 'Mariages, niversaires, tout. Son palmier gonflable est légendaire.') on conflict (id) do update set name = excluded.name, bio = excluded.bio;
insert into card_variants values ('lolita', 'lolita', 'secrete', 'Édition Spéciale · Unique', true)
on conflict (id) do update set character_id = excluded.character_id, rarity = excluded.rarity, title = excluded.title, active = true;
insert into characters values ('louis', 'Louis Gouyon de Matignon', 'Parle mieux voyageur que les voyageurs eux-mêmes.') on conflict (id) do update set name = excluded.name, bio = excluded.bio;
insert into card_variants values ('louis-voyageur', 'louis', 'legendaire', 'Parle Mieux Voyageur', true)
on conflict (id) do update set character_id = excluded.character_id, rarity = excluded.rarity, title = excluded.title, active = true;
insert into card_variants values ('louis-chapiteau', 'louis', 'legendaire', 'Bénédiction du Chapiteau', true)
on conflict (id) do update set character_id = excluded.character_id, rarity = excluded.rarity, title = excluded.title, active = true;
insert into card_variants values ('louis-familles', 'louis', 'mythique', 'Dédicace aux Familles', true)
on conflict (id) do update set character_id = excluded.character_id, rarity = excluded.rarity, title = excluded.title, active = true;
insert into characters values ('homme-place', 'Homme de la Place', 'Quand il s’approche de la caméra, il est déjà trop tard.') on conflict (id) do update set name = excluded.name, bio = excluded.bio;
insert into card_variants values ('place-barbu', 'homme-place', 'epique', 'Tu vas repartir mal mon copain', true)
on conflict (id) do update set character_id = excluded.character_id, rarity = excluded.rarity, title = excluded.title, active = true;
insert into card_variants values ('place-stand', 'homme-place', 'epique', 'Peinture, pinceau et euh… pinceau', true)
on conflict (id) do update set character_id = excluded.character_id, rarity = excluded.rarity, title = excluded.title, active = true;
insert into card_variants values ('place-moonwalk', 'homme-place', 'secrete', 'Moonwalk sur le Terrain', true)
on conflict (id) do update set character_id = excluded.character_id, rarity = excluded.rarity, title = excluded.title, active = true;
insert into characters values ('homme-terrain', 'Homme du Terrain', 'Quand il annonce la couleur, tout le terrain recule.') on conflict (id) do update set name = excluded.name, bio = excluded.bio;
insert into card_variants values ('terrain', 'homme-terrain', 'epique', 'J’annonce : faut que ça tombe', true)
on conflict (id) do update set character_id = excluded.character_id, rarity = excluded.rarity, title = excluded.title, active = true;
insert into characters values ('mayer', '100% Mayer', 'Short à palmiers, salon cuir beige : 100% authentique.') on conflict (id) do update set name = excluded.name, bio = excluded.bio;
insert into card_variants values ('mayer', 'mayer', 'secrete', 'Édition Spéciale · Unique', true)
on conflict (id) do update set character_id = excluded.character_id, rarity = excluded.rarity, title = excluded.title, active = true;
insert into characters values ('cherklo', 'Cherklo', 'Petit jeune au calme légendaire. Mythe d’Internet.') on conflict (id) do update set name = excluded.name, bio = excluded.bio;
insert into card_variants values ('cherklo', 'cherklo', 'secrete', 'Édition Spéciale · Unique', true)
on conflict (id) do update set character_id = excluded.character_id, rarity = excluded.rarity, title = excluded.title, active = true;
insert into characters values ('comi', 'Les Comis', 'Tirés dans tous les boosters, jamais mis dans un deck.') on conflict (id) do update set name = excluded.name, bio = excluded.bio;
insert into card_variants values ('comi-park', 'comi', 'commune', 'Comi du Park · Ultra Commune', true)
on conflict (id) do update set character_id = excluded.character_id, rarity = excluded.rarity, title = excluded.title, active = true;
insert into card_variants values ('comi-village', 'comi', 'rare', 'Comi du Village · Jigoubougoula', true)
on conflict (id) do update set character_id = excluded.character_id, rarity = excluded.rarity, title = excluded.title, active = true;
insert into characters values ('mouchoir', 'Le Mouchoir', 'Carte Objet · Tradition. Impossible de tricher avec la tradition.') on conflict (id) do update set name = excluded.name, bio = excluded.bio;
insert into card_variants values ('mouchoir', 'mouchoir', 'epique', 'Carte Objet · Tradition', true)
on conflict (id) do update set character_id = excluded.character_id, rarity = excluded.rarity, title = excluded.title, active = true;
commit;
