-- Runware trial safety gate: deny beyond two attempted edits per user per UTC day.
create table if not exists public.yap_runware_daily_usage (
 user_id uuid not null references auth.users(id) on delete cascade,
 day date not null,
 used integer not null default 0 check (used >= 0),
 primary key (user_id, day)
);
alter table public.yap_runware_daily_usage enable row level security;
revoke all on public.yap_runware_daily_usage from anon, authenticated;
create or replace function public.yap_claim_runware_edit(p_limit integer default 2)
returns boolean language plpgsql security definer
set search_path = public, pg_temp as $$
declare count_after integer;
begin
 if auth.uid() is null or p_limit < 1 or p_limit > 2 then return false; end if;
 insert into public.yap_runware_daily_usage(user_id,day,used)
 values(auth.uid(),(now() at time zone 'utc')::date,1)
 on conflict(user_id,day) do update
 set used = public.yap_runware_daily_usage.used + 1
 where public.yap_runware_daily_usage.used < p_limit
 returning used into count_after;
 return count_after is not null;
end; $$;
revoke all on function public.yap_claim_runware_edit(integer) from public;
grant execute on function public.yap_claim_runware_edit(integer) to authenticated;
