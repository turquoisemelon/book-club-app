-- A profile picture per account, shown on your account page and as
-- your avatar across the app. Stored as a small JPEG (about 10 KB) right on
-- the profile row, so it needs no storage bucket.
-- Run once in Supabase: SQL Editor > New query > paste > Run. Safe to re-run.
-- The app works before and after this runs; pictures just can't be saved until it has.

alter table public.profiles add column if not exists avatar_url text;

alter table public.profiles drop constraint if exists profiles_avatar_url_check;
alter table public.profiles add constraint profiles_avatar_url_check
  check (avatar_url is null or (char_length(avatar_url) <= 200000 and avatar_url like 'data:image/%'));
