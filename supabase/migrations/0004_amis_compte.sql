-- ════════════════════════════════════════════════════════════════════
--  ICONIQ — v4 : amis + suppression de compte
-- ════════════════════════════════════════════════════════════════════

create table if not exists friendships (
  id uuid primary key default gen_random_uuid(),
  requester uuid not null references profiles(id) on delete cascade,
  addressee uuid not null references profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted')),
  created_at timestamptz not null default now(),
  check (requester <> addressee)
);
create unique index if not exists friendships_pair on friendships (least(requester, addressee), greatest(requester, addressee));
alter table friendships enable row level security; -- accès via les fonctions uniquement

create or replace function send_friend_request(p_username text) returns text
language plpgsql security definer set search_path = public as $$
declare me uuid := _me(); target uuid; f friendships%rowtype;
begin
  select id into target from profiles where lower(username) = lower(trim(p_username));
  if target is null then raise exception 'Joueur introuvable'; end if;
  if target = me then raise exception 'C''est toi !'; end if;
  select * into f from friendships where least(requester, addressee) = least(me, target) and greatest(requester, addressee) = greatest(me, target);
  if f.id is not null then
    if f.status = 'accepted' then raise exception 'Vous êtes déjà amis'; end if;
    if f.requester = me then raise exception 'Demande déjà envoyée'; end if;
    -- il m'avait déjà demandé : on accepte directement
    update friendships set status = 'accepted' where id = f.id;
    perform _notify(target, '🤝 Nouvel ami', (select username from profiles where id = me) || ' a accepté ta demande d''ami.', '/friends');
    return 'accepted';
  end if;
  if (select count(*) from friendships where requester = me and status = 'pending') >= 50 then raise exception 'Trop de demandes en attente'; end if;
  insert into friendships(requester, addressee) values (me, target);
  perform _notify(target, '👋 Demande d''ami', (select username from profiles where id = me) || ' veut être ton ami.', '/friends');
  return 'sent';
end $$;

create or replace function respond_friend(p_id uuid, p_accept boolean) returns void
language plpgsql security definer set search_path = public as $$
declare me uuid := _me(); f friendships%rowtype;
begin
  select * into f from friendships where id = p_id and addressee = me and status = 'pending';
  if f.id is null then raise exception 'Demande introuvable'; end if;
  if p_accept then
    update friendships set status = 'accepted' where id = p_id;
    perform _notify(f.requester, '🤝 Nouvel ami', (select username from profiles where id = me) || ' a accepté ta demande d''ami.', '/friends');
  else
    delete from friendships where id = p_id;
  end if;
end $$;

-- retirer un ami, annuler une demande envoyée
create or replace function remove_friend(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare me uuid := _me();
begin
  delete from friendships where id = p_id and (requester = me or addressee = me);
end $$;

create or replace function list_friends() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', f.id, 'status', f.status,
    'direction', case when f.requester = auth.uid() then 'out' else 'in' end,
    'username', p.username, 'packsOpened', p.packs_opened,
    'unique', (select count(distinct variant_id) from user_cards where user_id = p.id),
    'since', f.created_at) order by f.status desc, p.username), '[]')
  from friendships f
  join profiles p on p.id = case when f.requester = auth.uid() then f.addressee else f.requester end
  where auth.uid() in (f.requester, f.addressee)
$$;

-- suppression définitive du compte (cartes, échanges, ventes, amis… tout part en cascade)
create or replace function delete_my_account(p_confirm text) returns void
language plpgsql security definer set search_path = public as $$
declare me uuid := _me();
begin
  if p_confirm is distinct from 'SUPPRIMER' then raise exception 'Confirmation incorrecte'; end if;
  -- on rend les cartes bloquées en échange / vente avant de partir
  perform _close_trade(t, 'cancelled') from trades t where t.status = 'pending' and (t.from_user = me or t.to_user = me);
  update market_listings set status = 'cancelled' where seller = me and status = 'active';
  delete from auth.users where id = me;
end $$;

revoke execute on function send_friend_request(text), respond_friend(uuid, boolean), remove_friend(uuid), list_friends(), delete_my_account(text) from public, anon;
grant execute on function send_friend_request(text), respond_friend(uuid, boolean), remove_friend(uuid), list_friends(), delete_my_account(text) to authenticated;

notify pgrst, 'reload schema';
