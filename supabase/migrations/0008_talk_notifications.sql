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

-- Your email setting. Off until you say yes: null means we haven't asked yet
-- (the app asks after you first write in a topic), false is no, true is yes.
alter table public.profiles add column if not exists email_talk boolean;

-- An earlier draft of this file made it on for everyone. If that version ran,
-- undo it once so nobody gets emails they didn't ask for.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'email_talk' and column_default is not null
  ) then
    alter table public.profiles alter column email_talk drop default;
    alter table public.profiles alter column email_talk drop not null;
    update public.profiles set email_talk = null;
  end if;
end;
$$;
