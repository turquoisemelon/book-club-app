-- Talk notifications: unread badges and an optional email when a topic you're
-- in (you started it or wrote in it) gets new messages.
-- Run once in Supabase: SQL Editor > New query > paste > Run. Safe to re-run.
-- The app works before and after this runs; badges just stay device-only and
-- no emails go out until it has.

-- When you last opened each Talk topic, so "unread" is the same on every device.
-- emailed_at is when we last emailed you about the topic: we send at most one
-- email per topic until you open it again.
create table if not exists public.talk_reads (
  user_id uuid not null references auth.users (id) on delete cascade,
  club_id text not null references public.clubs (id) on delete cascade,
  thread_id text not null,
  read_at timestamptz,
  emailed_at timestamptz,
  primary key (user_id, club_id, thread_id)
);

alter table public.talk_reads enable row level security;

-- Only you see and change your own read markers. (Emails are sent by the
-- server, which bypasses these rules.)
drop policy if exists "own talk reads" on public.talk_reads;
create policy "own talk reads" on public.talk_reads for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and public.is_club_member(club_id));

-- Your email setting. On by default; switch it off on your account page.
alter table public.profiles add column if not exists email_talk boolean not null default true;
