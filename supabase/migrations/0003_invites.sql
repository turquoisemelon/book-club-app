-- Step 4: invite links. Each club has a secret code; anyone with the link
-- (/join/<club>?invite=<code>) can see a short preview of the club and join it.
-- Run once in Supabase: SQL Editor > New query > paste > Run. Safe to re-run.

create table if not exists public.club_invites (
  club_id text primary key references public.clubs (id) on delete cascade,
  -- 16 random hex characters, from a cryptographically random UUID.
  code text not null default substr(replace(gen_random_uuid()::text, '-', ''), 1, 16),
  updated_at timestamptz not null default now()
);

alter table public.club_invites enable row level security;

-- Members can see the code (so anyone in the club can share the link);
-- only hosts can change it, which turns off the old link.
drop policy if exists "members see invite" on public.club_invites;
create policy "members see invite" on public.club_invites for select to authenticated
  using (public.is_club_member(club_id));
drop policy if exists "hosts reset invite" on public.club_invites;
create policy "hosts reset invite" on public.club_invites for update to authenticated
  using (public.is_club_host(club_id)) with check (public.is_club_host(club_id));

-- Every club gets an invite, including clubs made before this file ran.
insert into public.club_invites (club_id) select id from public.clubs on conflict do nothing;

create or replace function public.add_club_invite()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.club_invites (club_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;
drop trigger if exists club_invite_created on public.clubs;
create trigger club_invite_created after insert on public.clubs
  for each row execute function public.add_club_invite();

-- What someone sees when they open an invite link, before joining (and
-- before signing in). Returns nothing if the code is wrong.
create or replace function public.club_invite_preview(cid text, invite_code text)
returns json language sql stable security definer set search_path = '' as $$
  select json_build_object(
    'id', c.id,
    'name', c.name,
    'description', c.description,
    'neighbourhood', c.neighbourhood,
    'cadence', c.cadence,
    'memberCount', (select count(*) from public.club_members m where m.club_id = c.id),
    'sizeCap', c.size_cap,
    'hostName', (select p.name from public.club_members m join public.profiles p on p.id = m.user_id
                 where m.club_id = c.id and m.role = 'host' order by m.joined_at limit 1),
    'book', (select json_build_object('id', b.id, 'title', b.title, 'author', b.author, 'isbn', b.isbn,
                                      'coverId', b.cover_id, 'cover', b.cover, 'sections', b.sections,
                                      'sectionLabel', b.section_label)
             from public.books b where b.id = c.current_book_id),
    'isMember', public.is_club_member(c.id)
  )
  from public.clubs c
  join public.club_invites i on i.club_id = c.id
  where c.id = cid and i.code = invite_code;
$$;
grant execute on function public.club_invite_preview(text, text) to anon, authenticated;

-- Joins the signed-in person to the club if the code matches and there's room.
create or replace function public.join_club(cid text, invite_code text)
returns text language plpgsql security definer set search_path = '' as $$
declare
  me uuid := (select auth.uid());
  cap integer;
  members integer;
begin
  if me is null then
    raise exception 'Sign in first';
  end if;
  if not exists (select 1 from public.club_invites where club_id = cid and code = invite_code) then
    raise exception 'This invite link doesn''t work anymore. Ask the host for a new one.';
  end if;
  if public.is_club_member(cid) then
    return cid;
  end if;
  select size_cap into cap from public.clubs where id = cid;
  select count(*) into members from public.club_members where club_id = cid;
  if members >= cap then
    raise exception 'This club is full.';
  end if;
  insert into public.club_members (club_id, user_id, role) values (cid, me, 'member')
  on conflict (club_id, user_id) do nothing;
  return cid;
end;
$$;
revoke execute on function public.join_club(text, text) from public, anon;
grant execute on function public.join_club(text, text) to authenticated;
