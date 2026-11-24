-- ════════════════════════════════════════════════════════════════════
--  ICONIQ — v2 : multi-ouverture, packs événement, quêtes du jour,
--  succès, album, roue, série de 7 jours, vitrine, fil d'activité,
--  classement de la semaine. Tout est validé côté serveur.
-- ════════════════════════════════════════════════════════════════════

-- ─── Packs événement / thématiques ──────────────────────────────────
alter table pack_types add column if not exists character_ids text[];
alter table pack_types add column if not exists ends_at timestamptz;
alter table game_config add column if not exists streak_gift_every int not null default 7;
alter table game_config add column if not exists streak_gift_credits int not null default 500;
alter table game_config add column if not exists streak_gift_shards int not null default 100;

-- ─── Données de récompenses (remplies par seed.sql) ─────────────────
create table if not exists quests (
  id text primary key, stat text not null check (stat in ('packs','recycled','daily')),
  goal int not null, credits int not null default 0, shards int not null default 0
);
create table if not exists achievements (
  id text primary key, kind text not null check (kind in ('packs','rank','collection','streak')),
  goal int not null, credits int not null default 0, shards int not null default 0
);
create table if not exists wheel_prizes (
  idx int primary key, weight int not null, credits int not null default 0,
  shards int not null default 0, free_pack boolean not null default false
);
alter table quests enable row level security;
alter table achievements enable row level security;
alter table wheel_prizes enable row level security;
create policy "read catalog" on quests for select using (true);
create policy "read catalog" on achievements for select using (true);
create policy "read catalog" on wheel_prizes for select using (true);

-- ─── Progression joueur ─────────────────────────────────────────────
create table if not exists daily_stats (
  user_id uuid not null references profiles(id) on delete cascade,
  day date not null default (now() at time zone 'utc')::date,
  packs int not null default 0, recycled int not null default 0, daily int not null default 0,
  primary key (user_id, day)
);
create table if not exists reward_claims (
  user_id uuid not null references profiles(id) on delete cascade,
  key text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, key)
);
alter table profiles add column if not exists wheel_day date;
alter table profiles add column if not exists showcase uuid[] not null default '{}';
alter table daily_stats enable row level security;
alter table reward_claims enable row level security;
create policy "own stats" on daily_stats for select using (auth.uid() = user_id);
create policy "own claims" on reward_claims for select using (auth.uid() = user_id);

-- ─── Fil d'activité (grosses cartes tirées par la communauté) ──────
create table if not exists feed (
  id bigint generated always as identity primary key,
  user_id uuid not null references profiles(id) on delete cascade,
  variant_id text not null references card_variants(id),
  serial int,
  created_at timestamptz not null default now()
);
create index if not exists feed_recent on feed(created_at desc);
alter table feed enable row level security;

create or replace function _today() returns date language sql stable as $$ select (now() at time zone 'utc')::date $$;

create or replace function _bump(p_user uuid, p_packs int, p_recycled int, p_daily int) returns void
language sql security definer set search_path = public as $$
  insert into daily_stats(user_id, day, packs, recycled, daily) values (p_user, _today(), p_packs, p_recycled, p_daily)
  on conflict (user_id, day) do update set packs = daily_stats.packs + excluded.packs,
    recycled = daily_stats.recycled + excluded.recycled, daily = daily_stats.daily + excluded.daily
$$;

-- profil enrichi de la progression
create or replace function _profile_json(p_user uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'id', p.id, 'username', p.username, 'credits', p.credits, 'shards', p.shards, 'gems', p.gems,
    'lastDailyAt', p.last_daily_at, 'streak', p.streak, 'pityEpic', p.pity_epic,
    'pityLegend', p.pity_legend, 'packsOpened', p.packs_opened,
    'progress', jsonb_build_object(
      'stats', coalesce((select jsonb_build_object('day', d.day, 'packs', d.packs, 'recycled', d.recycled, 'daily', d.daily)
                         from daily_stats d where d.user_id = p.id and d.day = _today()),
                        jsonb_build_object('day', _today(), 'packs', 0, 'recycled', 0, 'daily', 0)),
      'claims', coalesce((select jsonb_agg(key) from reward_claims r where r.user_id = p.id), '[]'),
      'wheelDay', p.wheel_day,
      'showcase', to_jsonb(p.showcase)))
  from profiles p where p.id = p_user
$$;

-- ─── Tirage (v2 : filtre par personnages + fil d'activité) ─────────
create or replace function _draw_pack(p_user uuid, p_pack text, p_currency text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  cfg game_config%rowtype;
  pk pack_types%rowtype;
  prof profiles%rowtype;
  last_min int; slot_min int; best int := -1;
  total numeric; x numeric;
  rar text; rnk int; var text; ser int; cnt int; is_new boolean;
  cards jsonb := '[]'; cid uuid; r record; i int;
begin
  select * into cfg from game_config where id = 1;
  select * into pk from pack_types where id = p_pack;
  select * into prof from profiles where id = p_user;
  last_min := _rank(pk.last_slot_min);
  if prof.pity_legend + 1 >= cfg.pity_legendary_every then
    last_min := greatest(last_min, _rank('legendaire'));
  elsif prof.pity_epic + 1 >= cfg.pity_epic_every then
    last_min := greatest(last_min, _rank('epique'));
  end if;
  -- si le pack thématique n'a rien au-dessus du minimum, on prend sa meilleure rareté
  select least(last_min, max(ra.rank)) into last_min from rarities ra
    where exists (select 1 from card_variants v where v.rarity = ra.id and v.active
                  and (pk.character_ids is null or v.character_id = any(pk.character_ids)));

  for i in 1..cfg.cards_per_pack loop
    slot_min := case when i = cfg.cards_per_pack then last_min else 0 end;
    select sum(ra.weight) into total from rarities ra
      where ra.rank >= slot_min and exists (select 1 from card_variants v where v.rarity = ra.id and v.active
            and (pk.character_ids is null or v.character_id = any(pk.character_ids)));
    x := _rand() * total;
    for r in select ra.id, ra.weight, ra.rank from rarities ra
             where ra.rank >= slot_min and exists (select 1 from card_variants v where v.rarity = ra.id and v.active
                   and (pk.character_ids is null or v.character_id = any(pk.character_ids)))
             order by ra.rank loop
      rar := r.id; rnk := r.rank; x := x - r.weight;
      exit when x < 0;
    end loop;
    select count(*) into cnt from card_variants v where v.rarity = rar and v.active
      and (pk.character_ids is null or v.character_id = any(pk.character_ids));
    select v.id into var from card_variants v where v.rarity = rar and v.active
      and (pk.character_ids is null or v.character_id = any(pk.character_ids))
      order by v.id offset floor(_rand() * cnt)::int limit 1;
    ser := case when (select serialized from rarities where id = rar) then _next_serial(var) else null end;
    is_new := not exists (select 1 from user_cards where user_id = p_user and variant_id = var);
    insert into user_cards(user_id, variant_id, serial, source)
      values (p_user, var, ser, 'pack:' || p_pack) returning id into cid;
    cards := cards || jsonb_build_object('uid', cid, 'variantId', var, 'serial', ser, 'rank', rnk,
                                         'isNew', is_new, 'obtainedAt', now(), 'locked', false);
    if rnk >= _rank('mythique') then insert into feed(user_id, variant_id, serial) values (p_user, var, ser); end if;
    best := greatest(best, rnk);
  end loop;

  update profiles set
    pity_epic = case when best >= _rank('epique') then 0 else pity_epic + 1 end,
    pity_legend = case when best >= _rank('legendaire') then 0 else pity_legend + 1 end,
    packs_opened = packs_opened + 1
  where id = p_user;
  perform _bump(p_user, 1, 0, 0);
  insert into pack_openings(user_id, pack_id, currency, result) values (p_user, p_pack, p_currency, cards);

  if best >= _rank('mythique') then
    perform _notify(p_user, '✨ Tirage historique !', 'Tu viens d''obtenir une carte ' ||
      (select label from rarities where rank = best) || '. Va l''admirer en 3D.', '/collection');
  end if;
  return (select jsonb_agg(e order by (e->>'rank')::int) from jsonb_array_elements(cards) e);
end $$;

-- ─── Ouverture (v2 : multi-ouverture, événements, cadeau de série) ─
drop function if exists open_pack(text, text);
create or replace function open_pack(p_pack text, p_currency text, p_count int default 1) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  me uuid := _me();
  cfg game_config%rowtype;
  pk pack_types%rowtype;
  prof profiles%rowtype;
  new_streak int; gift bool;
  cards jsonb := '[]';
  i int;
begin
  p_count := greatest(1, least(10, coalesce(p_count, 1)));
  select * into cfg from game_config where id = 1;
  select * into prof from profiles where id = me for update; -- verrou anti-double-clic
  if p_currency = 'daily' then
    if prof.last_daily_at is not null and prof.last_daily_at + make_interval(hours => cfg.daily_cooldown_hours) > now() then
      raise exception 'Pack quotidien pas encore prêt';
    end if;
    new_streak := case when prof.last_daily_at is not null and prof.last_daily_at > now() - interval '48 hours'
                       then prof.streak + 1 else 1 end;
    gift := new_streak % cfg.streak_gift_every = 0;
    update profiles set last_daily_at = now(), streak = new_streak, daily_notified = false,
      credits = credits + cfg.daily_credits + least(cfg.streak_bonus_max, (new_streak - 1) * cfg.streak_bonus_per_day)
                + case when gift then cfg.streak_gift_credits else 0 end,
      shards = shards + case when gift then cfg.streak_gift_shards else 0 end
    where id = me;
    perform _bump(me, 0, 0, 1);
    p_pack := 'standard'; p_count := 1;
  else
    select * into pk from pack_types where id = p_pack and active and (ends_at is null or ends_at > now());
    if not found then raise exception 'Pack indisponible'; end if;
    if p_currency = 'credits' then
      if pk.cost_credits is null or prof.credits < pk.cost_credits * p_count then raise exception 'Crédits insuffisants'; end if;
      update profiles set credits = credits - pk.cost_credits * p_count where id = me;
    elsif p_currency = 'gems' then
      if pk.cost_gems is null or prof.gems < pk.cost_gems * p_count then raise exception 'Gemmes insuffisantes'; end if;
      update profiles set gems = gems - pk.cost_gems * p_count where id = me;
    else
      raise exception 'Monnaie invalide';
    end if;
  end if;
  for i in 1..p_count loop
    cards := cards || _draw_pack(me, p_pack, p_currency);
  end loop;
  return jsonb_build_object('cards', cards, 'profile', _profile_json(me));
end $$;

-- recyclage : compte pour les quêtes, protège la vitrine
create or replace function recycle_duplicates(p_max_rarity text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare me uuid := _me(); max_rank int := _rank(p_max_rarity); gained int; removed jsonb; n int; show uuid[];
begin
  select showcase into show from profiles where id = me for update;
  with ranked as (
    select uc.id, cv.rarity,
      row_number() over (partition by uc.variant_id
                         order by uc.locked desc, (uc.id = any(show)) desc, coalesce(uc.serial, 2147483647), uc.obtained_at) rn
    from user_cards uc join card_variants cv on cv.id = uc.variant_id
    where uc.user_id = me
  ), del as (
    delete from user_cards u using ranked r, rarities ra
    where u.id = r.id and r.rn > 1 and not u.locked and not (u.id = any(show)) and ra.id = r.rarity and ra.rank <= max_rank
    returning u.id, ra.recycle
  )
  select coalesce(sum(recycle), 0), coalesce(jsonb_agg(id), '[]'), count(*) into gained, removed, n from del;
  update profiles set shards = shards + gained where id = me;
  perform _bump(me, 0, n, 0);
  return jsonb_build_object('gained', gained, 'removed', removed, 'profile', _profile_json(me));
end $$;

create or replace function recycle_card(p_uid uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare me uuid := _me(); gained int;
begin
  perform 1 from profiles where id = me for update;
  delete from user_cards u using card_variants cv, rarities ra
  where u.id = p_uid and u.user_id = me and not u.locked and cv.id = u.variant_id and ra.id = cv.rarity
  returning ra.recycle into gained;
  if gained is null then raise exception 'Carte introuvable ou verrouillée'; end if;
  update profiles set shards = shards + gained, showcase = array_remove(showcase, p_uid) where id = me;
  perform _bump(me, 0, 1, 0);
  return jsonb_build_object('gained', gained, 'profile', _profile_json(me));
end $$;

-- ─── Récompenses ────────────────────────────────────────────────────
create or replace function _give(p_user uuid, p_credits int, p_shards int, p_pack bool) returns jsonb
language plpgsql security definer set search_path = public as $$
declare cards jsonb; before text[];
begin
  update profiles set credits = credits + p_credits, shards = shards + p_shards where id = p_user;
  if not p_pack then return null; end if;
  cards := _draw_pack(p_user, 'standard', 'reward');
  return jsonb_build_object('cards', cards, 'profile', _profile_json(p_user));
end $$;

-- p_key : 'quest:<id>@<jour>' | 'ach:<id>' | 'album:<personnage>'
create or replace function claim_reward(p_key text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  me uuid := _me(); kind text := split_part(p_key, ':', 1); rid text := split_part(p_key, ':', 2);
  prof profiles%rowtype; ok bool := false; cr int := 0; sh int := 0; v int; total int;
  q quests%rowtype; a achievements%rowtype;
begin
  select * into prof from profiles where id = me for update;
  if exists (select 1 from reward_claims where user_id = me and key = p_key) then raise exception 'Déjà récupéré'; end if;
  if kind = 'quest' then
    if split_part(rid, '@', 2) <> _today()::text then raise exception 'Quête expirée'; end if;
    select * into q from quests where id = split_part(rid, '@', 1);
    if not found then raise exception 'Quête inconnue'; end if;
    select case q.stat when 'packs' then packs when 'recycled' then recycled else daily end into v
      from daily_stats where user_id = me and day = _today();
    ok := coalesce(v, 0) >= q.goal; cr := q.credits; sh := q.shards;
  elsif kind = 'ach' then
    select * into a from achievements where id = rid;
    if not found then raise exception 'Succès inconnu'; end if;
    if a.kind = 'packs' then ok := prof.packs_opened >= a.goal;
    elsif a.kind = 'streak' then ok := prof.streak >= a.goal;
    elsif a.kind = 'rank' then
      ok := exists (select 1 from user_cards uc join card_variants cv on cv.id = uc.variant_id join rarities ra on ra.id = cv.rarity
                    where uc.user_id = me and ra.rank >= a.goal);
    else
      select count(*) into total from card_variants where active;
      select count(distinct uc.variant_id) into v from user_cards uc join card_variants cv on cv.id = uc.variant_id
        where uc.user_id = me and cv.active;
      ok := total > 0 and floor(v * 100.0 / total) >= a.goal;
    end if;
    cr := a.credits; sh := a.shards;
  elsif kind = 'album' then
    select count(*) into total from card_variants where character_id = rid and active;
    select count(distinct uc.variant_id) into v from user_cards uc join card_variants cv on cv.id = uc.variant_id
      where uc.user_id = me and cv.character_id = rid and cv.active;
    ok := total > 0 and v >= total; cr := 150 * total;
  else
    raise exception 'Récompense inconnue';
  end if;
  if not ok then raise exception 'Objectif pas encore atteint'; end if;
  insert into reward_claims(user_id, key) values (me, p_key);
  perform _give(me, cr, sh, false);
  return jsonb_build_object('reward', jsonb_build_object('credits', cr, 'shards', sh), 'profile', _profile_json(me));
end $$;

create or replace function spin_wheel() returns jsonb
language plpgsql security definer set search_path = public as $$
declare me uuid := _me(); prof profiles%rowtype; total int; x numeric; w wheel_prizes%rowtype; pick wheel_prizes%rowtype; pack jsonb;
begin
  select * into prof from profiles where id = me for update;
  if prof.wheel_day = _today() then raise exception 'Tu as déjà tourné la roue aujourd’hui'; end if;
  select sum(weight) into total from wheel_prizes;
  x := _rand() * total;
  for w in select * from wheel_prizes order by idx loop
    pick := w; x := x - w.weight;
    exit when x < 0;
  end loop;
  update profiles set wheel_day = _today() where id = me;
  pack := _give(me, pick.credits, pick.shards, pick.free_pack);
  return jsonb_build_object('index', pick.idx,
    'reward', jsonb_build_object('credits', pick.credits, 'shards', pick.shards, 'freePack', pick.free_pack),
    'profile', _profile_json(me), 'pack', pack);
end $$;

-- ─── Vitrine, profil public, fil, classement de la semaine ─────────
create or replace function set_showcase(p_uids uuid[]) returns jsonb
language plpgsql security definer set search_path = public as $$
declare me uuid := _me(); keep uuid[];
begin
  select coalesce(array_agg(id), '{}') into keep from (
    select id from user_cards where user_id = me and id = any(coalesce(p_uids, '{}')) limit 3) s;
  update profiles set showcase = keep where id = me;
  return _profile_json(me);
end $$;

create or replace function public_profile(p_username text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('username', p.username, 'packsOpened', p.packs_opened,
    'unique', (select count(distinct variant_id) from user_cards where user_id = p.id),
    'showcase', coalesce((select jsonb_agg(jsonb_build_object('variantId', c.variant_id, 'serial', c.serial))
                          from user_cards c where c.id = any(p.showcase) and c.user_id = p.id), '[]'))
  from profiles p where lower(p.username) = lower(p_username) and auth.uid() is not null
$$;

create or replace function list_feed() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('username', p.username, 'variantId', f.variant_id,
    'serial', f.serial, 'createdAt', f.created_at) order by f.created_at desc), '[]')
  from (select * from feed order by created_at desc limit 30) f join profiles p on p.id = f.user_id
  where auth.uid() is not null
$$;

-- score de la semaine : valeur des nouvelles cartes obtenues depuis lundi
create or replace function leaderboard_week() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('username', username, 'score', score, 'unique', uniq) order by score desc), '[]')
  from (
    select p.username, sum(ra.craft)::int score, count(distinct uc.variant_id)::int uniq
    from user_cards uc
    join profiles p on p.id = uc.user_id
    join card_variants cv on cv.id = uc.variant_id
    join rarities ra on ra.id = cv.rarity
    where uc.obtained_at >= date_trunc('week', now()) and uc.source like 'pack:%'
    group by p.username order by score desc limit 50) s
  where auth.uid() is not null
$$;

-- ─── Droits ─────────────────────────────────────────────────────────
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function _rand(), _me(), _rank(text), _today() to authenticated;
grant execute on function get_state(), open_pack(text, text, int), recycle_duplicates(text), recycle_card(uuid),
  craft_card(text), set_username(text), create_trade(text, uuid[], uuid[], int, int), respond_trade(uuid, boolean),
  cancel_trade(uuid), list_trades(), public_collection(text), market_list(uuid, int), market_cancel(uuid),
  market_buy(uuid), list_market(text, text, boolean), leaderboard(), mark_notifications_read(),
  claim_reward(text), spin_wheel(), set_showcase(uuid[]), public_profile(text), list_feed(), leaderboard_week()
  to authenticated;
grant execute on function credit_purchase(text, uuid, text), enqueue_daily_notifications() to service_role;
