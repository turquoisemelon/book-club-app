-- Goodreads ratings can be fractional (e.g. 2.25), so store them with two decimals.
-- Run once in Supabase: SQL Editor > New query > paste > Run. Safe to re-run.

alter table public.shelf_entries drop constraint if exists shelf_entries_rating_check;
alter table public.shelf_entries alter column rating type numeric(3, 2) using rating::numeric(3, 2);
alter table public.shelf_entries add constraint shelf_entries_rating_check check (rating > 0 and rating <= 5);
