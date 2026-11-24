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
