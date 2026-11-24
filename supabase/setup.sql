-- ICONIQ : copie TOUT ce fichier dans Supabase > SQL Editor, puis « Run ».

-- ═══ 0001_schema.sql ═══
-- ════════════════════════════════════════════════════════════════════
--  ICONIQ — schéma serveur (Supabase / Postgres)
--  Principe anti-triche : le client ne peut RIEN écrire directement.
--  Toute action passe par des fonctions SECURITY DEFINER qui valident tout
--  et tirent l'aléatoire côté serveur (pgcrypto).
-- ════════════════════════════════════════════════════════════════════
create extension if not exists pgcrypto;

-- ─── Configuration & catalogue (remplis par seed.sql) ───────────────
create table if not exists game_config (
  id int primary key default 1 check (id = 1),
  cards_per_pack int not null,
  daily_cooldown_hours int not null,
  daily_credits int not null,
  streak_bonus_per_day int not null,
  streak_bonus_max int not null,
  market_fee_pct int not null,
  start_credits int not null,
  pity_epic_every int not null,
  pity_legendary_every int not null
);

create table if not exists rarities (
  id text primary key,
  label text not null,
  rank int not null unique,
  weight numeric not null,
  recycle int not null,
  craft int not null,
  serialized boolean not null default false
);

create table if not exists pack_types (
  id text primary key,
  name text not null,
  cost_credits int,
  cost_gems int,
  last_slot_min text not null references rarities(id),
  active boolean not null default true
);

create table if not exists gem_bundles (
  id text primary key,
  gems int not null,
  price_cents int not null,
  label text not null
);

create table if not exists characters (
  id text primary key,
  name text not null,
  bio text not null default ''
);

create table if not exists card_variants (
  id text primary key,
  character_id text not null references characters(id),
  rarity text not null references rarities(id),
  title text not null,
  active boolean not null default true
);
create index if not exists card_variants_rarity on card_variants(rarity) where active;

create table if not exists variant_serials (
  variant_id text primary key references card_variants(id),
  next int not null default 0
);

-- ─── Joueurs ────────────────────────────────────────────────────────
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (username ~ '^[A-Za-z0-9_.\-]{3,20}$'),
  credits int not null default 0 check (credits >= 0),
  shards int not null default 0 check (shards >= 0),
  gems int not null default 0 check (gems >= 0),
  last_daily_at timestamptz,
  daily_notified boolean not null default true,
  streak int not null default 0,
  pity_epic int not null default 0,
  pity_legend int not null default 0,
  packs_opened int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists user_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  variant_id text not null references card_variants(id),
  serial int,
  source text not null,
  locked boolean not null default false,
  obtained_at timestamptz not null default now()
);
create index if not exists user_cards_user on user_cards(user_id, variant_id);

create table if not exists pack_openings (
  id bigint generated always as identity primary key,
  user_id uuid not null references profiles(id) on delete cascade,
  pack_id text not null,
  currency text not null,
  result jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists trades (
  id uuid primary key default gen_random_uuid(),
  from_user uuid not null references profiles(id) on delete cascade,
  to_user uuid not null references profiles(id) on delete cascade,
  offer_cards uuid[] not null default '{}',
  request_cards uuid[] not null default '{}',
  offer_snapshot jsonb not null default '[]',
  request_snapshot jsonb not null default '[]',
  offer_shards int not null default 0 check (offer_shards >= 0),
  request_shards int not null default 0 check (request_shards >= 0),
  status text not null default 'pending' check (status in ('pending','accepted','declined','cancelled')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index if not exists trades_users on trades(from_user, to_user, status);

create table if not exists market_listings (
  id uuid primary key default gen_random_uuid(),
  seller uuid not null references profiles(id) on delete cascade,
  user_card_id uuid references user_cards(id) on delete set null,
  variant_id text not null references card_variants(id),
  serial int,
  price int not null check (price between 1 and 10000000),
  status text not null default 'active' check (status in ('active','sold','cancelled')),
  buyer uuid references profiles(id),
  created_at timestamptz not null default now(),
  sold_at timestamptz
);
create index if not exists market_active on market_listings(status, created_at desc);

create table if not exists purchases (
  stripe_session_id text primary key,
  user_id uuid not null references profiles(id) on delete cascade,
  bundle_id text not null references gem_bundles(id),
  gems int not null,
  created_at timestamptz not null default now()
);

create table if not exists push_subscriptions (
  endpoint text primary key,
  user_id uuid not null references profiles(id) on delete cascade,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create table if not exists notifications (
  id bigint generated always as identity primary key,
  user_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  body text not null,
  url text,
  read boolean not null default false,
  pushed boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user on notifications(user_id, created_at desc);
create index if not exists notifications_unpushed on notifications(pushed) where not pushed;

-- ─── Sécurité : RLS ─────────────────────────────────────────────────
alter table game_config enable row level security;
alter table rarities enable row level security;
alter table pack_types enable row level security;
alter table gem_bundles enable row level security;
alter table characters enable row level security;
alter table card_variants enable row level security;
alter table variant_serials enable row level security;
alter table profiles enable row level security;
alter table user_cards enable row level security;
alter table pack_openings enable row level security;
alter table trades enable row level security;
alter table market_listings enable row level security;
alter table purchases enable row level security;
alter table push_subscriptions enable row level security;
alter table notifications enable row level security;

-- lecture publique du catalogue
create policy "read catalog" on game_config for select using (true);
create policy "read catalog" on rarities for select using (true);
create policy "read catalog" on pack_types for select using (true);
create policy "read catalog" on gem_bundles for select using (true);
create policy "read catalog" on characters for select using (true);
create policy "read catalog" on card_variants for select using (true);
-- données perso : lecture seule de ses propres lignes
create policy "own profile" on profiles for select using (auth.uid() = id);
create policy "own cards" on user_cards for select using (auth.uid() = user_id);
create policy "own openings" on pack_openings for select using (auth.uid() = user_id);
create policy "own purchases" on purchases for select using (auth.uid() = user_id);
create policy "own notifications" on notifications for select using (auth.uid() = user_id);
create policy "own push read" on push_subscriptions for select using (auth.uid() = user_id);
create policy "own push insert" on push_subscriptions for insert with check (auth.uid() = user_id);
create policy "own push delete" on push_subscriptions for delete using (auth.uid() = user_id);
-- Aucune policy insert/update/delete ailleurs ⇒ écriture impossible depuis le client.

-- ─── Utilitaires internes ───────────────────────────────────────────
create or replace function _rand() returns double precision
language sql volatile as $$
  select ('x' || encode(gen_random_bytes(6), 'hex'))::bit(48)::bigint / 281474976710656.0
$$;

create or replace function _me() returns uuid language plpgsql stable as $$
begin
  if auth.uid() is null then raise exception 'Non connecté'; end if;
  return auth.uid();
end $$;

create or replace function _rank(p_rarity text) returns int language sql stable as $$
  select rank from rarities where id = p_rarity
$$;

create or replace function _notify(p_user uuid, p_title text, p_body text, p_url text default null)
returns void language sql security definer set search_path = public as $$
  insert into notifications(user_id, title, body, url) values (p_user, p_title, p_body, p_url)
$$;

create or replace function _profile_json(p_user uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'id', id, 'username', username, 'credits', credits, 'shards', shards, 'gems', gems,
    'lastDailyAt', last_daily_at, 'streak', streak, 'pityEpic', pity_epic,
    'pityLegend', pity_legend, 'packsOpened', packs_opened)
  from profiles where id = p_user
$$;

create or replace function _card_json(c user_cards) returns jsonb language sql immutable as $$
  select jsonb_build_object('uid', c.id, 'variantId', c.variant_id, 'serial', c.serial,
                            'obtainedAt', c.obtained_at, 'locked', c.locked)
$$;

create or replace function _next_serial(p_variant text) returns int
language plpgsql security definer set search_path = public as $$
declare v int;
begin
  insert into variant_serials(variant_id, next) values (p_variant, 1)
  on conflict (variant_id) do update set next = variant_serials.next + 1
  returning next into v;
  return v;
end $$;

-- ─── Création du profil à l'inscription ─────────────────────────────
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  base text := regexp_replace(coalesce(new.raw_user_meta_data->>'username', 'joueur'), '[^A-Za-z0-9_.\-]', '', 'g');
  name text;
begin
  if length(base) < 3 then base := 'joueur'; end if;
  name := left(base, 20);
  while exists (select 1 from profiles where username = name) loop
    name := left(base, 15) || '_' || floor(_rand() * 9999)::int;
  end loop;
  insert into profiles(id, username, credits)
  values (new.id, name, (select start_credits from game_config where id = 1));
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

-- ─── Tirage d'un pack (interne) ─────────────────────────────────────
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

  for i in 1..cfg.cards_per_pack loop
    slot_min := case when i = cfg.cards_per_pack then last_min else 0 end;
    select sum(ra.weight) into total from rarities ra
      where ra.rank >= slot_min and exists (select 1 from card_variants v where v.rarity = ra.id and v.active);
    x := _rand() * total;
    for r in select ra.id, ra.weight, ra.rank from rarities ra
             where ra.rank >= slot_min and exists (select 1 from card_variants v where v.rarity = ra.id and v.active)
             order by ra.rank loop
      rar := r.id; rnk := r.rank; x := x - r.weight;
      exit when x < 0;
    end loop;
    select count(*) into cnt from card_variants where rarity = rar and active;
    select id into var from card_variants where rarity = rar and active
      order by id offset floor(_rand() * cnt)::int limit 1;
    ser := case when (select serialized from rarities where id = rar) then _next_serial(var) else null end;
    is_new := not exists (select 1 from user_cards where user_id = p_user and variant_id = var);
    insert into user_cards(user_id, variant_id, serial, source)
      values (p_user, var, ser, 'pack:' || p_pack) returning id into cid;
    cards := cards || jsonb_build_object('uid', cid, 'variantId', var, 'serial', ser, 'rank', rnk,
                                         'isNew', is_new, 'obtainedAt', now(), 'locked', false);
    best := greatest(best, rnk);
  end loop;

  update profiles set
    pity_epic = case when best >= _rank('epique') then 0 else pity_epic + 1 end,
    pity_legend = case when best >= _rank('legendaire') then 0 else pity_legend + 1 end,
    packs_opened = packs_opened + 1
  where id = p_user;

  insert into pack_openings(user_id, pack_id, currency, result) values (p_user, p_pack, p_currency, cards);

  if best >= _rank('mythique') then
    perform _notify(p_user, '✨ Tirage historique !', 'Tu viens d''obtenir une carte ' ||
      (select label from rarities where rank = best) || '. Va l''admirer en 3D.', '/collection');
  end if;

  return (select jsonb_agg(e order by (e->>'rank')::int) from jsonb_array_elements(cards) e);
end $$;

-- ─── API joueur ─────────────────────────────────────────────────────
create or replace function get_state() returns jsonb
language plpgsql security definer set search_path = public as $$
declare me uuid := _me();
begin
  return jsonb_build_object(
    'profile', _profile_json(me),
    'cards', coalesce((select jsonb_agg(_card_json(c) order by c.obtained_at) from user_cards c where c.user_id = me), '[]'));
end $$;

create or replace function open_pack(p_pack text, p_currency text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  me uuid := _me();
  cfg game_config%rowtype;
  pk pack_types%rowtype;
  prof profiles%rowtype;
  new_streak int;
  cards jsonb;
begin
  select * into cfg from game_config where id = 1;
  select * into prof from profiles where id = me for update; -- verrou anti-double-clic
  if p_currency = 'daily' then
    if prof.last_daily_at is not null and prof.last_daily_at + make_interval(hours => cfg.daily_cooldown_hours) > now() then
      raise exception 'Pack quotidien pas encore prêt';
    end if;
    new_streak := case when prof.last_daily_at is not null and prof.last_daily_at > now() - interval '48 hours'
                       then prof.streak + 1 else 1 end;
    update profiles set last_daily_at = now(), streak = new_streak, daily_notified = false,
      credits = credits + cfg.daily_credits + least(cfg.streak_bonus_max, (new_streak - 1) * cfg.streak_bonus_per_day)
    where id = me;
    p_pack := 'standard';
  else
    select * into pk from pack_types where id = p_pack and active;
    if not found then raise exception 'Pack inconnu'; end if;
    if p_currency = 'credits' then
      if pk.cost_credits is null or prof.credits < pk.cost_credits then raise exception 'Crédits insuffisants'; end if;
      update profiles set credits = credits - pk.cost_credits where id = me;
    elsif p_currency = 'gems' then
      if pk.cost_gems is null or prof.gems < pk.cost_gems then raise exception 'Gemmes insuffisantes'; end if;
      update profiles set gems = gems - pk.cost_gems where id = me;
    else
      raise exception 'Monnaie invalide';
    end if;
  end if;
  cards := _draw_pack(me, p_pack, p_currency);
  return jsonb_build_object('cards', cards, 'profile', _profile_json(me));
end $$;

create or replace function recycle_duplicates(p_max_rarity text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare me uuid := _me(); max_rank int := _rank(p_max_rarity); gained int; removed jsonb;
begin
  perform 1 from profiles where id = me for update;
  with ranked as (
    select uc.id, cv.rarity,
      row_number() over (partition by uc.variant_id
                         order by uc.locked desc, coalesce(uc.serial, 2147483647), uc.obtained_at) rn
    from user_cards uc join card_variants cv on cv.id = uc.variant_id
    where uc.user_id = me
  ), del as (
    delete from user_cards u using ranked r, rarities ra
    where u.id = r.id and r.rn > 1 and not u.locked and ra.id = r.rarity and ra.rank <= max_rank
    returning u.id, ra.recycle
  )
  select coalesce(sum(recycle), 0), coalesce(jsonb_agg(id), '[]') into gained, removed from del;
  update profiles set shards = shards + gained where id = me;
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
  update profiles set shards = shards + gained where id = me;
  return jsonb_build_object('gained', gained, 'profile', _profile_json(me));
end $$;

create or replace function craft_card(p_variant text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare me uuid := _me(); cost int; ser boolean; c user_cards;
begin
  select ra.craft, ra.serialized into cost, ser from card_variants cv join rarities ra on ra.id = cv.rarity
    where cv.id = p_variant and cv.active;
  if cost is null then raise exception 'Carte inconnue'; end if;
  update profiles set shards = shards - cost where id = me and shards >= cost;
  if not found then raise exception 'Éclats insuffisants'; end if;
  insert into user_cards(user_id, variant_id, serial, source)
    values (me, p_variant, case when ser then _next_serial(p_variant) end, 'craft') returning * into c;
  return jsonb_build_object('card', _card_json(c), 'profile', _profile_json(me));
end $$;

create or replace function set_username(p_name text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare me uuid := _me();
begin
  if p_name !~ '^[A-Za-z0-9_.\-]{3,20}$' then raise exception 'Pseudo invalide (3-20 caractères, lettres/chiffres/_.-)'; end if;
  if exists (select 1 from profiles where lower(username) = lower(p_name) and id <> me) then raise exception 'Pseudo déjà pris'; end if;
  update profiles set username = p_name where id = me;
  return _profile_json(me);
end $$;

-- ─── Échanges ───────────────────────────────────────────────────────
create or replace function _snapshot(p_ids uuid[]) returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('uid', id, 'variantId', variant_id, 'serial', serial)), '[]')
  from user_cards where id = any(p_ids)
$$;

create or replace function create_trade(p_to text, p_offer uuid[], p_request uuid[], p_offer_shards int, p_request_shards int)
returns uuid language plpgsql security definer set search_path = public as $$
declare me uuid := _me(); target uuid; tid uuid; n int;
begin
  select id into target from profiles where lower(username) = lower(p_to);
  if target is null then raise exception 'Joueur introuvable'; end if;
  if target = me then raise exception 'Impossible d''échanger avec soi-même'; end if;
  p_offer := coalesce(p_offer, '{}'); p_request := coalesce(p_request, '{}');
  if coalesce(array_length(p_offer,1),0) > 10 or coalesce(array_length(p_request,1),0) > 10 then raise exception 'Maximum 10 cartes par côté'; end if;
  if p_offer_shards < 0 or p_request_shards < 0 then raise exception 'Montant invalide'; end if;
  if coalesce(array_length(p_offer,1),0) + coalesce(array_length(p_request,1),0) = 0 then raise exception 'Échange vide'; end if;
  if (select count(*) from trades where from_user = me and status = 'pending') >= 20 then raise exception 'Trop d''offres en attente'; end if;

  perform 1 from profiles where id = me for update;
  select count(*) into n from user_cards where id = any(p_offer) and user_id = me and not locked;
  if n <> coalesce(array_length(p_offer,1),0) then raise exception 'Cartes offertes invalides'; end if;
  select count(*) into n from user_cards where id = any(p_request) and user_id = target and not locked;
  if n <> coalesce(array_length(p_request,1),0) then raise exception 'Cartes demandées invalides'; end if;

  update profiles set shards = shards - p_offer_shards where id = me and shards >= p_offer_shards; -- séquestre
  if not found then raise exception 'Éclats insuffisants'; end if;
  update user_cards set locked = true where id = any(p_offer);

  insert into trades(from_user, to_user, offer_cards, request_cards, offer_snapshot, request_snapshot, offer_shards, request_shards)
    values (me, target, p_offer, p_request, _snapshot(p_offer), _snapshot(p_request), p_offer_shards, p_request_shards)
    returning id into tid;
  perform _notify(target, '🔁 Nouvelle proposition d''échange',
    (select username from profiles where id = me) || ' te propose un échange.', '/trade');
  return tid;
end $$;

create or replace function _close_trade(t trades, p_status text) returns void
language plpgsql security definer set search_path = public as $$
begin
  update user_cards set locked = false where id = any(t.offer_cards) and user_id = t.from_user;
  update profiles set shards = shards + t.offer_shards where id = t.from_user;
  update trades set status = p_status, resolved_at = now() where id = t.id;
end $$;

create or replace function respond_trade(p_id uuid, p_accept boolean) returns void
language plpgsql security definer set search_path = public as $$
declare me uuid := _me(); t trades; n int;
begin
  select * into t from trades where id = p_id for update;
  if t.id is null or t.to_user <> me or t.status <> 'pending' then raise exception 'Échange indisponible'; end if;
  if not p_accept then
    perform _close_trade(t, 'declined');
    perform _notify(t.from_user, 'Échange refusé', (select username from profiles where id = me) || ' a refusé ton offre.', '/trade');
    return;
  end if;
  perform 1 from profiles where id in (t.from_user, t.to_user) order by id for update;
  select count(*) into n from user_cards where id = any(t.request_cards) and user_id = me and not locked;
  if n <> coalesce(array_length(t.request_cards,1),0) then raise exception 'Tu ne possèdes plus certaines cartes demandées'; end if;
  update profiles set shards = shards - t.request_shards where id = me and shards >= t.request_shards;
  if not found then raise exception 'Éclats insuffisants'; end if;
  update profiles set shards = shards + t.request_shards where id = t.from_user;
  update profiles set shards = shards + t.offer_shards where id = me;
  update user_cards set user_id = me, locked = false where id = any(t.offer_cards);
  update user_cards set user_id = t.from_user where id = any(t.request_cards);
  update trades set status = 'accepted', resolved_at = now() where id = t.id;
  -- annule les autres offres qui impliquaient ces cartes
  perform _close_trade(o, 'cancelled') from trades o
    where o.status = 'pending' and o.id <> t.id
      and (o.offer_cards && (t.offer_cards || t.request_cards) or o.request_cards && (t.offer_cards || t.request_cards));
  perform _notify(t.from_user, '🤝 Échange accepté !', (select username from profiles where id = me) || ' a accepté ton offre.', '/collection');
end $$;

create or replace function cancel_trade(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare me uuid := _me(); t trades;
begin
  select * into t from trades where id = p_id for update;
  if t.id is null or t.from_user <> me or t.status <> 'pending' then raise exception 'Échange indisponible'; end if;
  perform _close_trade(t, 'cancelled');
end $$;

create or replace function list_trades() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', t.id, 'fromUser', t.from_user, 'fromName', pf.username, 'toUser', t.to_user, 'toName', pt.username,
    'offerCards', t.offer_snapshot, 'requestCards', t.request_snapshot,
    'offerShards', t.offer_shards, 'requestShards', t.request_shards,
    'status', t.status, 'createdAt', t.created_at) order by t.created_at desc), '[]')
  from trades t join profiles pf on pf.id = t.from_user join profiles pt on pt.id = t.to_user
  where (t.from_user = auth.uid() or t.to_user = auth.uid())
    and (t.status = 'pending' or t.resolved_at > now() - interval '7 days')
$$;

create or replace function public_collection(p_username text) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('uid', c.id, 'variantId', c.variant_id, 'serial', c.serial, 'locked', c.locked)), '[]')
  from user_cards c join profiles p on p.id = c.user_id
  where lower(p.username) = lower(p_username) and auth.uid() is not null
$$;

-- ─── Marché (en éclats uniquement — jamais d'argent réel) ───────────
create or replace function market_list(p_uid uuid, p_price int) returns uuid
language plpgsql security definer set search_path = public as $$
declare me uuid := _me(); c user_cards; lid uuid;
begin
  if p_price < 1 or p_price > 10000000 then raise exception 'Prix invalide'; end if;
  if (select count(*) from market_listings where seller = me and status = 'active') >= 30 then raise exception 'Maximum 30 ventes actives'; end if;
  update user_cards set locked = true where id = p_uid and user_id = me and not locked returning * into c;
  if c.id is null then raise exception 'Carte indisponible'; end if;
  insert into market_listings(seller, user_card_id, variant_id, serial, price)
    values (me, c.id, c.variant_id, c.serial, p_price) returning id into lid;
  return lid;
end $$;

create or replace function market_cancel(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare me uuid := _me(); l market_listings;
begin
  select * into l from market_listings where id = p_id for update;
  if l.id is null or l.seller <> me or l.status <> 'active' then raise exception 'Vente indisponible'; end if;
  update user_cards set locked = false where id = l.user_card_id;
  update market_listings set status = 'cancelled' where id = l.id;
end $$;

create or replace function market_buy(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare me uuid := _me(); l market_listings; fee int;
begin
  select * into l from market_listings where id = p_id for update;
  if l.id is null or l.status <> 'active' then raise exception 'Déjà vendue'; end if;
  if l.seller = me then raise exception 'C''est ta propre vente'; end if;
  perform 1 from profiles where id in (me, l.seller) order by id for update;
  update profiles set shards = shards - l.price where id = me and shards >= l.price;
  if not found then raise exception 'Éclats insuffisants'; end if;
  fee := ceil(l.price * (select market_fee_pct from game_config where id = 1) / 100.0);
  update profiles set shards = shards + l.price - fee where id = l.seller;
  update user_cards set user_id = me, locked = false where id = l.user_card_id;
  update market_listings set status = 'sold', buyer = me, sold_at = now() where id = l.id;
  perform _notify(l.seller, '💰 Carte vendue !', 'Ta carte a été vendue ' || l.price || ' éclats.', '/market');
end $$;

create or replace function list_market(p_rarity text default null, p_character text default null, p_mine boolean default false)
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(x order by x->>'createdAt' desc), '[]') from (
    select jsonb_build_object('id', l.id, 'sellerId', l.seller, 'sellerName', p.username,
      'card', jsonb_build_object('uid', l.user_card_id, 'variantId', l.variant_id, 'serial', l.serial),
      'price', l.price, 'createdAt', l.created_at) x
    from market_listings l join profiles p on p.id = l.seller join card_variants cv on cv.id = l.variant_id
    where l.status = 'active'
      and (p_rarity is null or cv.rarity = p_rarity)
      and (p_character is null or cv.character_id = p_character)
      and (not p_mine or l.seller = auth.uid())
    order by l.created_at desc limit 200) s
$$;

-- ─── Classement ─────────────────────────────────────────────────────
create or replace function leaderboard() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('username', username, 'score', score, 'unique', uniq) order by score desc), '[]')
  from (
    select p.username, sum(ra.craft)::int score, count(*)::int uniq
    from (select distinct user_id, variant_id from user_cards) d
    join profiles p on p.id = d.user_id
    join card_variants cv on cv.id = d.variant_id
    join rarities ra on ra.id = cv.rarity
    group by p.username order by score desc limit 50) s
$$;

create or replace function mark_notifications_read() returns void
language sql security definer set search_path = public as $$
  update notifications set read = true where user_id = auth.uid() and not read
$$;

-- ─── Fonctions réservées au serveur (service_role) ─────────────────
create or replace function credit_purchase(p_session text, p_user uuid, p_bundle text) returns boolean
language plpgsql security definer set search_path = public as $$
declare g int;
begin
  select gems into g from gem_bundles where id = p_bundle;
  if g is null then raise exception 'Offre inconnue'; end if;
  insert into purchases(stripe_session_id, user_id, bundle_id, gems) values (p_session, p_user, p_bundle, g)
    on conflict do nothing;
  if not found then return false; end if; -- idempotent : webhook rejoué
  update profiles set gems = gems + g where id = p_user;
  perform _notify(p_user, '💎 Achat confirmé', '+' || g || ' gemmes ajoutées. Merci !', '/shop');
  return true;
end $$;

create or replace function enqueue_daily_notifications() returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  with ready as (
    update profiles set daily_notified = true
    where not daily_notified
      and last_daily_at + make_interval(hours => (select daily_cooldown_hours from game_config where id = 1)) <= now()
    returning id)
  insert into notifications(user_id, title, body, url)
    select id, '🎁 Ton booster quotidien est prêt', 'Viens le découper, une Secrète t''attend peut-être…', '/' from ready;
  get diagnostics n = row_count;
  return n;
end $$;

-- ─── Droits d'exécution ────────────────────────────────────────────
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function _rand(), _me(), _rank(text) to authenticated;
grant execute on function get_state(), open_pack(text, text), recycle_duplicates(text), recycle_card(uuid),
  craft_card(text), set_username(text), create_trade(text, uuid[], uuid[], int, int), respond_trade(uuid, boolean),
  cancel_trade(uuid), list_trades(), public_collection(text), market_list(uuid, int), market_cancel(uuid),
  market_buy(uuid), list_market(text, text, boolean), leaderboard(), mark_notifications_read()
  to authenticated;
grant execute on function credit_purchase(text, uuid, text), enqueue_daily_notifications() to service_role;

-- temps réel : profil & notifications poussés au client
alter publication supabase_realtime add table notifications;
alter publication supabase_realtime add table profiles;


-- ═══ 0002_rewards_social.sql ═══
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


-- ═══ 0003_invitations.sql ═══
-- ════════════════════════════════════════════════════════════════════
--  ICONIQ — v3 : jeu sur invitation uniquement
--  • lien d'invitation à usage unique + date d'expiration
--  • le serveur refuse toute inscription sans invitation valide
--  • le tout premier compte créé devient administrateur
-- ════════════════════════════════════════════════════════════════════

alter table profiles add column if not exists is_admin boolean not null default false;

create table if not exists invites (
  code text primary key,
  created_by uuid references profiles(id) on delete set null,
  note text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_by uuid references profiles(id) on delete set null,
  used_at timestamptz,
  revoked boolean not null default false
);
alter table invites enable row level security; -- aucune policy : accès uniquement via les fonctions

-- inscription : profil + consommation de l'invitation (atomique : si l'invitation
-- est invalide, l'exception annule aussi la création du compte)
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  base text := regexp_replace(coalesce(new.raw_user_meta_data->>'username', 'joueur'), '[^A-Za-z0-9_.\-]', '', 'g');
  name text;
  v_code text := new.raw_user_meta_data->>'invite';
  first boolean := not exists (select 1 from profiles);
begin
  if length(base) < 3 then base := 'joueur'; end if;
  name := left(base, 20);
  while exists (select 1 from profiles where username = name) loop
    name := left(base, 15) || '_' || floor(_rand() * 9999)::int;
  end loop;
  insert into profiles(id, username, credits, is_admin)
  values (new.id, name, (select start_credits from game_config where id = 1), first);

  if not first then
    update invites set used_by = new.id, used_at = now()
      where invites.code = v_code and used_by is null and not revoked and expires_at > now();
    if not found then raise exception 'INVITATION_INVALIDE'; end if;
  end if;
  return new;
end $$;

-- état d'un lien (appelable sans compte, pour afficher un message clair)
create or replace function check_invite(p_code text) returns text
language sql stable security definer set search_path = public as $$
  select case
    when not exists (select 1 from profiles) then 'first'
    when i.code is null then 'unknown'
    when i.revoked then 'revoked'
    when i.used_by is not null then 'used'
    when i.expires_at <= now() then 'expired'
    else 'valid' end
  from (select 1) d left join invites i on i.code = p_code
$$;

create or replace function _admin() returns uuid language plpgsql stable security definer set search_path = public as $$
begin
  if not exists (select 1 from profiles where id = auth.uid() and is_admin) then raise exception 'Réservé à l''administrateur'; end if;
  return auth.uid();
end $$;

create or replace function create_invite(p_hours int, p_note text default null) returns text
language plpgsql security definer set search_path = public as $$
declare me uuid := _admin(); c text;
begin
  p_hours := greatest(1, least(24 * 30, coalesce(p_hours, 48)));
  c := translate(encode(gen_random_bytes(12), 'base64'), '+/=', '-_');
  insert into invites(code, created_by, note, expires_at) values (c, me, left(p_note, 60), now() + make_interval(hours => p_hours));
  return c;
end $$;

create or replace function revoke_invite(p_code text) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform _admin();
  update invites set revoked = true where code = p_code and used_by is null;
end $$;

create or replace function list_invites() returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  perform _admin();
  return coalesce((select jsonb_agg(jsonb_build_object(
      'code', i.code, 'note', i.note, 'createdAt', i.created_at, 'expiresAt', i.expires_at,
      'usedBy', p.username, 'usedAt', i.used_at, 'revoked', i.revoked) order by i.created_at desc)
    from (select * from invites order by created_at desc limit 100) i left join profiles p on p.id = i.used_by), '[]');
end $$;

-- le profil indique si le joueur est administrateur
create or replace function _profile_json(p_user uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'id', p.id, 'username', p.username, 'credits', p.credits, 'shards', p.shards, 'gems', p.gems,
    'lastDailyAt', p.last_daily_at, 'streak', p.streak, 'pityEpic', p.pity_epic,
    'pityLegend', p.pity_legend, 'packsOpened', p.packs_opened, 'isAdmin', p.is_admin,
    'progress', jsonb_build_object(
      'stats', coalesce((select jsonb_build_object('day', d.day, 'packs', d.packs, 'recycled', d.recycled, 'daily', d.daily)
                         from daily_stats d where d.user_id = p.id and d.day = _today()),
                        jsonb_build_object('day', _today(), 'packs', 0, 'recycled', 0, 'daily', 0)),
      'claims', coalesce((select jsonb_agg(key) from reward_claims r where r.user_id = p.id), '[]'),
      'wheelDay', p.wheel_day,
      'showcase', to_jsonb(p.showcase)))
  from profiles p where p.id = p_user
$$;

revoke execute on function check_invite(text), create_invite(int, text), revoke_invite(text), list_invites(), _admin() from public, anon, authenticated;
grant execute on function check_invite(text) to anon, authenticated;
grant execute on function create_invite(int, text), revoke_invite(text), list_invites() to authenticated;


-- ═══ seed.sql ═══
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
