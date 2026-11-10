-- Step 5: your bookshelves (what you're reading, want to read, and have read),
-- saved to your account instead of only on one device. Goodreads imports land here.
-- Run once in Supabase: SQL Editor > New query > paste > Run. Safe to re-run.

create table if not exists public.shelf_entries (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  book_id text not null references public.books (id) on delete cascade,
  shelf text not null check (shelf in ('read', 'to-read', 'currently-reading')),
  rating smallint check (rating between 1 and 5),
  -- When it went on your shelf and when you finished it, from Goodreads when known.
  added_at timestamptz not null default now(),
  read_at timestamptz,
  primary key (user_id, book_id)
);

-- Is this person in at least one club with me? Lets the co-host see
-- clubmates' want-to-read shelves when it suggests the next book.
create or replace function public.shares_club_with(other uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.club_members mine
    join public.club_members theirs on theirs.club_id = mine.club_id
    where mine.user_id = (select auth.uid()) and theirs.user_id = other
  );
$$;

alter table public.shelf_entries enable row level security;

-- You see your own shelves, and the shelves of people in your clubs.
drop policy if exists "shelves visible" on public.shelf_entries;
create policy "shelves visible" on public.shelf_entries for select to authenticated
  using (user_id = (select auth.uid()) or public.shares_club_with(user_id));

-- Only you change your shelves.
drop policy if exists "add to own shelves" on public.shelf_entries;
create policy "add to own shelves" on public.shelf_entries for insert to authenticated
  with check (user_id = (select auth.uid()));
drop policy if exists "update own shelves" on public.shelf_entries;
create policy "update own shelves" on public.shelf_entries for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists "remove from own shelves" on public.shelf_entries;
create policy "remove from own shelves" on public.shelf_entries for delete to authenticated
  using (user_id = (select auth.uid()));
