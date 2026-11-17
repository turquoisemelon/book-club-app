-- Join requests: when someone taps "Ask to join" on a club in the directory,
-- the club's hosts see it on the club page (and a badge on Home) and can
-- approve or decline it. Hosts also get one email per request.
-- Run once in Supabase: SQL Editor > New query > paste > Run. Safe to re-run.
-- Until this runs, "Ask to join" only remembers the request on that device.

create table if not exists public.join_requests (
  club_id text not null references public.clubs (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  -- A short hello to the host, optional.
  note text not null default '' check (char_length(note) <= 500),
  status text not null default 'pending' check (status in ('pending', 'approved', 'declined')),
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by uuid references auth.users (id) on delete set null,
  -- When we emailed the hosts about it, and the person about being let in.
  -- Each email goes out once at most.
  emailed_hosts_at timestamptz,
  emailed_approved_at timestamptz,
  -- One request per person per club. Nobody can flood a host by asking again.
  primary key (club_id, user_id)
);
create index if not exists join_requests_user_idx on public.join_requests (user_id);

alter table public.join_requests enable row level security;

-- You see your own requests; hosts see the requests for their clubs.
-- Changes go through the two functions below, never directly.
drop policy if exists "see own or hosted join requests" on public.join_requests;
create policy "see own or hosted join requests" on public.join_requests for select to authenticated
  using (user_id = (select auth.uid()) or public.is_club_host(club_id));

-- Asks to join a club that's open to new members.
create or replace function public.request_to_join(cid text, hello text default '')
returns text language plpgsql security definer set search_path = '' as $$
declare
  me uuid := (select auth.uid());
  club public.clubs;
  existing text;
begin
  if me is null then
    raise exception 'Sign in first';
  end if;
  select * into club from public.clubs where id = cid;
  if club.id is null or not club.open_to_members then
    raise exception 'This club isn''t taking new members right now.';
  end if;
  if public.is_club_member(cid) then
    return 'member';
  end if;
  if (select count(*) from public.club_members where club_id = cid) >= club.size_cap then
    raise exception 'This club is full.';
  end if;
  select status into existing from public.join_requests where club_id = cid and user_id = me;
  if existing is not null then
    return existing;
  end if;
  insert into public.join_requests (club_id, user_id, note)
  values (cid, me, left(trim(coalesce(hello, '')), 500));
  return 'pending';
end;
$$;
revoke execute on function public.request_to_join(text, text) from public, anon;
grant execute on function public.request_to_join(text, text) to authenticated;

-- A host approves (adds them to the club) or declines a request.
create or replace function public.answer_join_request(cid text, requester uuid, approve boolean)
returns text language plpgsql security definer set search_path = '' as $$
declare
  me uuid := (select auth.uid());
  current_status text;
begin
  if not public.is_club_host(cid) then
    raise exception 'Only the host can answer join requests';
  end if;
  select status into current_status from public.join_requests where club_id = cid and user_id = requester for update;
  if current_status is null then
    raise exception 'That request is gone.';
  end if;
  if current_status <> 'pending' then
    return current_status;
  end if;
  if approve then
    if not exists (select 1 from public.club_members where club_id = cid and user_id = requester)
       and (select count(*) from public.club_members where club_id = cid) >= (select size_cap from public.clubs where id = cid) then
      raise exception 'The club is full. Raise its size or make room first.';
    end if;
    insert into public.club_members (club_id, user_id, role) values (cid, requester, 'member')
    on conflict (club_id, user_id) do nothing;
  end if;
  update public.join_requests
     set status = case when approve then 'approved' else 'declined' end, decided_at = now(), decided_by = me
   where club_id = cid and user_id = requester;
  return case when approve then 'approved' else 'declined' end;
end;
$$;
revoke execute on function public.answer_join_request(text, uuid, boolean) from public, anon;
grant execute on function public.answer_join_request(text, uuid, boolean) to authenticated;

-- Someone who joins with an invite link while their request is waiting is in:
-- close the request so it stops showing up for the host.
create or replace function public.close_join_request_on_join()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.join_requests set status = 'approved', decided_at = coalesce(decided_at, now())
   where club_id = new.club_id and user_id = new.user_id and status = 'pending';
  return new;
end;
$$;
drop trigger if exists join_request_closed_on_join on public.club_members;
create trigger join_request_closed_on_join after insert on public.club_members
  for each row execute function public.close_join_request_on_join();
