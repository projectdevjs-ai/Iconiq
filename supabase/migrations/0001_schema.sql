-- ════════════════════════════════════════════════════════════════════
--  ICONIQ — schéma serveur (Supabase / Postgres)
--  Principe anti-triche : le client ne peut RIEN écrire directement.
--  Toute action passe par des fonctions SECURITY DEFINER qui valident tout
--  et tirent l'aléatoire côté serveur (pgcrypto).
-- ════════════════════════════════════════════════════════════════════
create extension if not exists pgcrypto;
-- Supabase installe pgcrypto dans le schéma « extensions » : on l'expose dans public
do $$ begin
  if not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where p.proname = 'gen_random_bytes' and n.nspname = 'public') then
    create function public.gen_random_bytes(int) returns bytea language sql volatile
      as 'select extensions.gen_random_bytes($1)';
  end if;
exception when others then null;
end $$;

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
