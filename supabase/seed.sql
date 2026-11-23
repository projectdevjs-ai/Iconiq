-- AUTO-GÉNÉRÉ par scripts/gen-seed.mjs — ne pas modifier à la main
begin;
insert into game_config values (1, 5, 20, 100, 15, 150, 5, 500, 10, 40)
on conflict (id) do update set cards_per_pack = excluded.cards_per_pack, daily_cooldown_hours = excluded.daily_cooldown_hours,
  daily_credits = excluded.daily_credits, streak_bonus_per_day = excluded.streak_bonus_per_day, streak_bonus_max = excluded.streak_bonus_max,
  market_fee_pct = excluded.market_fee_pct, start_credits = excluded.start_credits, pity_epic_every = excluded.pity_epic_every,
  pity_legendary_every = excluded.pity_legendary_every;
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
insert into pack_types values ('standard', 'Pack Standard', 300, 30, 'rare', true)
on conflict (id) do update set name = excluded.name, cost_credits = excluded.cost_credits, cost_gems = excluded.cost_gems, last_slot_min = excluded.last_slot_min, active = true;
insert into pack_types values ('prestige', 'Pack Prestige', 1200, 110, 'epique', true)
on conflict (id) do update set name = excluded.name, cost_credits = excluded.cost_credits, cost_gems = excluded.cost_gems, last_slot_min = excluded.last_slot_min, active = true;
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
insert into characters values ('patron', 'Le Patron', 'Tient le comptoir depuis toujours. Connaît tous les secrets du quartier.') on conflict (id) do update set name = excluded.name, bio = excluded.bio;
insert into card_variants values ('patron-c', 'patron', 'commune', 'Derrière le comptoir', true)
on conflict (id) do update set character_id = excluded.character_id, rarity = excluded.rarity, title = excluded.title, active = true;
insert into card_variants values ('patron-r', 'patron', 'rare', 'Tournée générale', true)
on conflict (id) do update set character_id = excluded.character_id, rarity = excluded.rarity, title = excluded.title, active = true;
insert into card_variants values ('patron-l', 'patron', 'legendaire', 'Fermeture à 6h', true)
on conflict (id) do update set character_id = excluded.character_id, rarity = excluded.rarity, title = excluded.title, active = true;
insert into card_variants values ('patron-s', 'patron', 'secrete', 'Le Patron Éternel', true)
on conflict (id) do update set character_id = excluded.character_id, rarity = excluded.rarity, title = excluded.title, active = true;
insert into characters values ('reine', 'La Reine du Marché', 'Ses prix sont imbattables, sa voix porte jusqu’à la mairie.') on conflict (id) do update set name = excluded.name, bio = excluded.bio;
insert into card_variants values ('reine-c', 'reine', 'commune', 'Étal du samedi', true)
on conflict (id) do update set character_id = excluded.character_id, rarity = excluded.rarity, title = excluded.title, active = true;
insert into card_variants values ('reine-pc', 'reine', 'peu_commune', 'Prix cassés', true)
on conflict (id) do update set character_id = excluded.character_id, rarity = excluded.rarity, title = excluded.title, active = true;
insert into card_variants values ('reine-e', 'reine', 'epique', 'Criée royale', true)
on conflict (id) do update set character_id = excluded.character_id, rarity = excluded.rarity, title = excluded.title, active = true;
insert into card_variants values ('reine-m', 'reine', 'mythique', 'Impératrice des Halles', true)
on conflict (id) do update set character_id = excluded.character_id, rarity = excluded.rarity, title = excluded.title, active = true;
insert into characters values ('coach', 'Le Coach', 'Entraîne l’équipe locale. N’a jamais perdu un débat.') on conflict (id) do update set name = excluded.name, bio = excluded.bio;
insert into card_variants values ('coach-c', 'coach', 'commune', 'Sifflet au cou', true)
on conflict (id) do update set character_id = excluded.character_id, rarity = excluded.rarity, title = excluded.title, active = true;
insert into card_variants values ('coach-pc', 'coach', 'peu_commune', 'Causerie d’avant-match', true)
on conflict (id) do update set character_id = excluded.character_id, rarity = excluded.rarity, title = excluded.title, active = true;
insert into card_variants values ('coach-r', 'coach', 'rare', 'Tactique secrète', true)
on conflict (id) do update set character_id = excluded.character_id, rarity = excluded.rarity, title = excluded.title, active = true;
insert into card_variants values ('coach-l', 'coach', 'legendaire', 'Remontada', true)
on conflict (id) do update set character_id = excluded.character_id, rarity = excluded.rarity, title = excluded.title, active = true;
insert into characters values ('dj', 'DJ Minuit', 'Toutes les fêtes passent par ses platines.') on conflict (id) do update set name = excluded.name, bio = excluded.bio;
insert into card_variants values ('dj-c', 'dj', 'commune', 'Balance son', true)
on conflict (id) do update set character_id = excluded.character_id, rarity = excluded.rarity, title = excluded.title, active = true;
insert into card_variants values ('dj-r', 'dj', 'rare', 'Drop de 2h', true)
on conflict (id) do update set character_id = excluded.character_id, rarity = excluded.rarity, title = excluded.title, active = true;
insert into card_variants values ('dj-e', 'dj', 'epique', 'Main Stage', true)
on conflict (id) do update set character_id = excluded.character_id, rarity = excluded.rarity, title = excluded.title, active = true;
insert into card_variants values ('dj-m', 'dj', 'mythique', 'Le Son Interdit', true)
on conflict (id) do update set character_id = excluded.character_id, rarity = excluded.rarity, title = excluded.title, active = true;
insert into characters values ('mamie', 'Mamie Turbo', 'Plus rapide en scooter que n’importe qui. Gâteaux légendaires.') on conflict (id) do update set name = excluded.name, bio = excluded.bio;
insert into card_variants values ('mamie-c', 'mamie', 'commune', 'Tricot du dimanche', true)
on conflict (id) do update set character_id = excluded.character_id, rarity = excluded.rarity, title = excluded.title, active = true;
insert into card_variants values ('mamie-pc', 'mamie', 'peu_commune', 'Tarte aux pommes', true)
on conflict (id) do update set character_id = excluded.character_id, rarity = excluded.rarity, title = excluded.title, active = true;
insert into card_variants values ('mamie-e', 'mamie', 'epique', 'Scooter turbo', true)
on conflict (id) do update set character_id = excluded.character_id, rarity = excluded.rarity, title = excluded.title, active = true;
insert into card_variants values ('mamie-l', 'mamie', 'legendaire', 'La Doyenne', true)
on conflict (id) do update set character_id = excluded.character_id, rarity = excluded.rarity, title = excluded.title, active = true;
insert into characters values ('influ', 'L’Influenceur', '12 000 abonnés, et il vous le rappellera.') on conflict (id) do update set name = excluded.name, bio = excluded.bio;
insert into card_variants values ('influ-c', 'influ', 'commune', 'Story du matin', true)
on conflict (id) do update set character_id = excluded.character_id, rarity = excluded.rarity, title = excluded.title, active = true;
insert into card_variants values ('influ-pc', 'influ', 'peu_commune', 'Placement de produit', true)
on conflict (id) do update set character_id = excluded.character_id, rarity = excluded.rarity, title = excluded.title, active = true;
insert into card_variants values ('influ-r', 'influ', 'rare', 'Live à 3h', true)
on conflict (id) do update set character_id = excluded.character_id, rarity = excluded.rarity, title = excluded.title, active = true;
insert into card_variants values ('influ-e', 'influ', 'epique', 'Vu partout', true)
on conflict (id) do update set character_id = excluded.character_id, rarity = excluded.rarity, title = excluded.title, active = true;
insert into characters values ('meca', 'Le Mécano', 'Répare tout avec un tournevis et un regard.') on conflict (id) do update set name = excluded.name, bio = excluded.bio;
insert into card_variants values ('meca-c', 'meca', 'commune', 'Mains dans le cambouis', true)
on conflict (id) do update set character_id = excluded.character_id, rarity = excluded.rarity, title = excluded.title, active = true;
insert into card_variants values ('meca-pc', 'meca', 'peu_commune', 'Diagnostic express', true)
on conflict (id) do update set character_id = excluded.character_id, rarity = excluded.rarity, title = excluded.title, active = true;
insert into card_variants values ('meca-r', 'meca', 'rare', 'Moteur V8', true)
on conflict (id) do update set character_id = excluded.character_id, rarity = excluded.rarity, title = excluded.title, active = true;
insert into card_variants values ('meca-m', 'meca', 'mythique', 'Le Garage Fantôme', true)
on conflict (id) do update set character_id = excluded.character_id, rarity = excluded.rarity, title = excluded.title, active = true;
insert into characters values ('maire', 'Monsieur le Maire', 'Inaugure tout ce qui peut l’être. Même les ronds-points.') on conflict (id) do update set name = excluded.name, bio = excluded.bio;
insert into card_variants values ('maire-c', 'maire', 'commune', 'Ruban rouge', true)
on conflict (id) do update set character_id = excluded.character_id, rarity = excluded.rarity, title = excluded.title, active = true;
insert into card_variants values ('maire-pc', 'maire', 'peu_commune', 'Discours fleuve', true)
on conflict (id) do update set character_id = excluded.character_id, rarity = excluded.rarity, title = excluded.title, active = true;
insert into card_variants values ('maire-e', 'maire', 'epique', 'Campagne éclair', true)
on conflict (id) do update set character_id = excluded.character_id, rarity = excluded.rarity, title = excluded.title, active = true;
insert into card_variants values ('maire-l', 'maire', 'legendaire', 'Mandat éternel', true)
on conflict (id) do update set character_id = excluded.character_id, rarity = excluded.rarity, title = excluded.title, active = true;
insert into characters values ('facteur', 'Le Facteur', 'Sait qui reçoit quoi. Ne dit rien. Enfin, presque.') on conflict (id) do update set name = excluded.name, bio = excluded.bio;
insert into card_variants values ('facteur-c', 'facteur', 'commune', 'Tournée matinale', true)
on conflict (id) do update set character_id = excluded.character_id, rarity = excluded.rarity, title = excluded.title, active = true;
insert into card_variants values ('facteur-pc', 'facteur', 'peu_commune', 'Colis suspect', true)
on conflict (id) do update set character_id = excluded.character_id, rarity = excluded.rarity, title = excluded.title, active = true;
insert into card_variants values ('facteur-r', 'facteur', 'rare', 'Recommandé', true)
on conflict (id) do update set character_id = excluded.character_id, rarity = excluded.rarity, title = excluded.title, active = true;
insert into characters values ('boulangere', 'La Boulangère', 'Debout à 4h, sourire à 7h, rupture de stock à 8h.') on conflict (id) do update set name = excluded.name, bio = excluded.bio;
insert into card_variants values ('boul-c', 'boulangere', 'commune', 'Fournée de 4h', true)
on conflict (id) do update set character_id = excluded.character_id, rarity = excluded.rarity, title = excluded.title, active = true;
insert into card_variants values ('boul-pc', 'boulangere', 'peu_commune', 'Dernière baguette', true)
on conflict (id) do update set character_id = excluded.character_id, rarity = excluded.rarity, title = excluded.title, active = true;
insert into card_variants values ('boul-r', 'boulangere', 'rare', 'Croissant d’or', true)
on conflict (id) do update set character_id = excluded.character_id, rarity = excluded.rarity, title = excluded.title, active = true;
insert into card_variants values ('boul-e', 'boulangere', 'epique', 'Galette des Rois', true)
on conflict (id) do update set character_id = excluded.character_id, rarity = excluded.rarity, title = excluded.title, active = true;
insert into characters values ('gamer', 'Le Gamer', 'N’a pas vu le soleil depuis 2019. Champion régional.') on conflict (id) do update set name = excluded.name, bio = excluded.bio;
insert into card_variants values ('gamer-c', 'gamer', 'commune', 'Encore une partie', true)
on conflict (id) do update set character_id = excluded.character_id, rarity = excluded.rarity, title = excluded.title, active = true;
insert into card_variants values ('gamer-pc', 'gamer', 'peu_commune', 'Rage quit', true)
on conflict (id) do update set character_id = excluded.character_id, rarity = excluded.rarity, title = excluded.title, active = true;
insert into card_variants values ('gamer-r', 'gamer', 'rare', 'Clutch 1v5', true)
on conflict (id) do update set character_id = excluded.character_id, rarity = excluded.rarity, title = excluded.title, active = true;
insert into card_variants values ('gamer-l', 'gamer', 'legendaire', 'Speedrun mondial', true)
on conflict (id) do update set character_id = excluded.character_id, rarity = excluded.rarity, title = excluded.title, active = true;
insert into characters values ('voisine', 'La Voisine', 'Derrière le rideau, rien ne lui échappe.') on conflict (id) do update set name = excluded.name, bio = excluded.bio;
insert into card_variants values ('voisine-c', 'voisine', 'commune', 'Rideau entrouvert', true)
on conflict (id) do update set character_id = excluded.character_id, rarity = excluded.rarity, title = excluded.title, active = true;
insert into card_variants values ('voisine-pc', 'voisine', 'peu_commune', 'Rumeur du jour', true)
on conflict (id) do update set character_id = excluded.character_id, rarity = excluded.rarity, title = excluded.title, active = true;
insert into card_variants values ('voisine-r', 'voisine', 'rare', 'Jumelles', true)
on conflict (id) do update set character_id = excluded.character_id, rarity = excluded.rarity, title = excluded.title, active = true;
insert into card_variants values ('voisine-s', 'voisine', 'secrete', 'Elle Sait Tout', true)
on conflict (id) do update set character_id = excluded.character_id, rarity = excluded.rarity, title = excluded.title, active = true;
commit;
