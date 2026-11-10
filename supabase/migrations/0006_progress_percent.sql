-- Step 6: reading progress moves from chapters to quarters of the book.
-- Progress, spoiler gates on talk topics, and "read up to" on meetups were
-- chapter (or part) numbers; they become percentages: 0, 25, 50, 75 or 100.
--
-- Run once in Supabase AFTER the app update is live: SQL Editor > New query >
-- paste > Run. Safe to re-run: it converts the old numbers only once.
--
-- Progress rounds down (nobody unlocks a spoiler they haven't reached) and
-- gates round up (a spoiler never opens early).

create table if not exists public.applied_migrations (
  name text primary key,
  applied_at timestamptz not null default now()
);
-- No policies: only the SQL editor can see or change this table.
alter table public.applied_migrations enable row level security;

do $$
begin
  if exists (select 1 from public.applied_migrations where name = '0006_progress_percent') then
    return;
  end if;

  -- Members' progress, measured against the club's current book (no book: 0).
  update public.club_members m
  set progress = case when b.id is null then 0
    else least(100, floor(m.progress * 4.0 / greatest(b.sections, 1)) * 25)::int end
  from public.clubs c
  left join public.books b on b.id = c.current_book_id
  where c.id = m.club_id;

  -- Talk topic gates, against the book each topic is about.
  update public.clubs c
  set content = jsonb_set(c.content, '{threads}', coalesce((
    select jsonb_agg(
      case when t ? 'gate' then jsonb_set(t, '{gate}', to_jsonb(
        least(100, ceil((t->>'gate')::numeric * 4 / greatest(coalesce(b.sections, 1), 1)) * 25)::int
      )) else t end
      order by x.ord)
    from jsonb_array_elements(c.content->'threads') with ordinality as x(t, ord)
    left join public.books b on b.id = coalesce(x.t->>'bookId', c.current_book_id)
  ), '[]'::jsonb))
  where jsonb_typeof(c.content->'threads') = 'array';

  -- Meetups' "read up to", against the current book.
  update public.clubs c
  set content = jsonb_set(c.content, '{meetups}', coalesce((
    select jsonb_agg(
      case when mt ? 'upTo' then jsonb_set(mt, '{upTo}', to_jsonb(
        least(100, ceil((mt->>'upTo')::numeric * 4 / greatest(coalesce(b.sections, 1), 1)) * 25)::int
      )) else mt end
      order by x.ord)
    from jsonb_array_elements(c.content->'meetups') with ordinality as x(mt, ord)
    left join public.books b on b.id = c.current_book_id
  ), '[]'::jsonb))
  where jsonb_typeof(c.content->'meetups') = 'array';

  -- Co-host question drafts carry a gate too.
  update public.clubs c
  set content = jsonb_set(c.content, '{drafts}', coalesce((
    select jsonb_agg(
      case when d ? 'gate' then jsonb_set(d, '{gate}', to_jsonb(
        least(100, ceil((d->>'gate')::numeric * 4 / greatest(coalesce(b.sections, 1), 1)) * 25)::int
      )) else d end
      order by x.ord)
    from jsonb_array_elements(c.content->'drafts') with ordinality as x(d, ord)
    left join public.books b on b.id = c.current_book_id
  ), '[]'::jsonb))
  where jsonb_typeof(c.content->'drafts') = 'array';

  insert into public.applied_migrations (name) values ('0006_progress_percent');
end;
$$;
