-- Step 2 of moving off local storage: clubs, their members, and books.
-- Run once in Supabase: SQL Editor > New query > paste > Run. Safe to re-run.
--
-- A club's day-to-day content (polls, meetups, talk threads, co-host drafts,
-- announcements, past reads) lives in clubs.content as JSON for now. It moves
-- into its own tables in a later step.

-- Books: one shared catalogue, so a cover picked once shows everywhere.
create table if not exists public.books (
  id text primary key,
  title text not null,
  author text not null default '',
  isbn text,
  cover_id integer,
  cover text,
  pages integer,
  sections integer not null default 1,
  section_label text not null default 'Chapter',
  blurb text,
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.clubs (
  id text primary key,
  name text not null check (char_length(name) between 1 and 80),
  description text not null default '',
  neighbourhood text not null default '',
  cadence text not null default '',
  open_to_members boolean not null default false,
  size_cap integer not null default 12,
  current_book_id text references public.books (id) on delete set null,
  content jsonb not null default '{}'::jsonb,
  created_by uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.club_members (
  club_id text not null references public.clubs (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'member' check (role in ('host', 'member')),
  progress integer not null default 0,
  joined_at timestamptz not null default now(),
  primary key (club_id, user_id)
);
create index if not exists club_members_user_idx on public.club_members (user_id);

-- Membership checks. "security definer" lets the privacy rules below ask
-- "is this person in the club?" without tripping over their own rules.
create or replace function public.is_club_member(cid text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.club_members where club_id = cid and user_id = (select auth.uid()));
$$;

create or replace function public.is_club_host(cid text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.club_members where club_id = cid and user_id = (select auth.uid()) and role = 'host');
$$;

alter table public.books enable row level security;
alter table public.clubs enable row level security;
alter table public.club_members enable row level security;

-- Books: anyone signed in can read and add them, and pick a cover.
drop policy if exists "books readable" on public.books;
create policy "books readable" on public.books for select to authenticated using (true);
drop policy if exists "books insertable" on public.books;
create policy "books insertable" on public.books for insert to authenticated with check (true);
drop policy if exists "books updatable" on public.books;
create policy "books updatable" on public.books for update to authenticated using (true) with check (true);

-- Clubs: members see their clubs; anyone signed in sees clubs that are open
-- to new members (the directory). Private clubs are invisible to everyone else.
drop policy if exists "clubs visible" on public.clubs;
create policy "clubs visible" on public.clubs for select to authenticated
  using (public.is_club_member(id) or open_to_members or created_by = (select auth.uid()));
drop policy if exists "clubs creatable" on public.clubs;
create policy "clubs creatable" on public.clubs for insert to authenticated
  with check (created_by = (select auth.uid()));
-- Members can update (votes, RSVPs, posts live in content); the trigger below
-- keeps the club's settings host-only.
drop policy if exists "clubs updatable by members" on public.clubs;
create policy "clubs updatable by members" on public.clubs for update to authenticated
  using (public.is_club_member(id)) with check (public.is_club_member(id));
drop policy if exists "clubs deletable by host" on public.clubs;
create policy "clubs deletable by host" on public.clubs for delete to authenticated
  using (public.is_club_host(id));

-- Members: visible to fellow members, and for open clubs (directory avatars).
drop policy if exists "members visible" on public.club_members;
create policy "members visible" on public.club_members for select to authenticated
  using (public.is_club_member(club_id) or exists (select 1 from public.clubs c where c.id = club_id and c.open_to_members));
-- Only hosts add people for now. Joining by invite link comes in a later step.
drop policy if exists "hosts add members" on public.club_members;
create policy "hosts add members" on public.club_members for insert to authenticated
  with check (public.is_club_host(club_id));
-- You update your own reading progress; hosts can update anyone in their club.
drop policy if exists "members update own row" on public.club_members;
create policy "members update own row" on public.club_members for update to authenticated
  using (user_id = (select auth.uid()) or public.is_club_host(club_id))
  with check (user_id = (select auth.uid()) or public.is_club_host(club_id));
-- You can leave; hosts can remove people.
drop policy if exists "leave or remove" on public.club_members;
create policy "leave or remove" on public.club_members for delete to authenticated
  using (user_id = (select auth.uid()) or public.is_club_host(club_id));

-- Whoever creates a club becomes its host.
create or replace function public.add_club_creator_as_host()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.club_members (club_id, user_id, role) values (new.id, new.created_by, 'host')
  on conflict (club_id, user_id) do update set role = 'host';
  return new;
end;
$$;
drop trigger if exists club_created on public.clubs;
create trigger club_created after insert on public.clubs
  for each row execute function public.add_club_creator_as_host();

-- Only hosts change a club's settings; members can only change its content.
create or replace function public.guard_club_update()
returns trigger language plpgsql set search_path = '' as $$
begin
  if (select auth.uid()) is not null and not public.is_club_host(old.id) and (
    new.name, new.description, new.neighbourhood, new.cadence, new.open_to_members,
    new.size_cap, new.current_book_id, new.created_by
  ) is distinct from (
    old.name, old.description, old.neighbourhood, old.cadence, old.open_to_members,
    old.size_cap, old.current_book_id, old.created_by
  ) then
    raise exception 'Only the host can change club settings';
  end if;
  new.updated_at := now();
  return new;
end;
$$;
drop trigger if exists club_update_guard on public.clubs;
create trigger club_update_guard before update on public.clubs
  for each row execute function public.guard_club_update();

-- Only hosts change roles, so nobody can promote themselves.
create or replace function public.guard_member_update()
returns trigger language plpgsql set search_path = '' as $$
begin
  if (select auth.uid()) is not null and new.role is distinct from old.role and not public.is_club_host(old.club_id) then
    raise exception 'Only the host can change roles';
  end if;
  if new.club_id is distinct from old.club_id or new.user_id is distinct from old.user_id then
    raise exception 'Membership rows cannot be moved';
  end if;
  return new;
end;
$$;
drop trigger if exists member_update_guard on public.club_members;
create trigger member_update_guard before update on public.club_members
  for each row execute function public.guard_member_update();
