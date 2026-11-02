-- Bounded synchronous PR drafting. No untrusted code execution or payments.
create schema if not exists yapcode_private;
revoke all on schema yapcode_private from public,anon,authenticated;
grant usage on schema yapcode_private to service_role;
create table yapcode_private.control (
 singleton boolean primary key default true check(singleton),
 stopped boolean not null default true,
 enabled_until timestamptz not null default '-infinity',
 reason text not null default 'Awaiting live provider and end-to-end verification'
);
insert into yapcode_private.control(singleton) values(true);
create table public.yapcode_runs (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id) on delete cascade,
 request_key uuid not null,
 input jsonb not null check(octet_length(input::text)<=6000),
 status text not null check(status in ('running','completed','failed')),
 result jsonb not null default '{}' check(octet_length(result::text)<=40000),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(owner_id,request_key)
);
create index yapcode_runs_owner_created on public.yapcode_runs(owner_id,created_at desc);
alter table public.yapcode_runs enable row level security;
revoke all on public.yapcode_runs from public,anon,authenticated;
grant select on public.yapcode_runs to authenticated;
create policy "owners read bounded runs" on public.yapcode_runs for select to authenticated using(owner_id=(select auth.uid()));
-- Reservations survive account deletion. Never refund an ambiguous provider request.
create table yapcode_private.reservations (
 task_id uuid primary key,
 owner_id uuid not null,
 created_at timestamptz not null default now(),
 lease_until timestamptz not null default now()+interval '150 seconds',
 reserved_usd numeric(8,4) not null default 0.05 check(reserved_usd=0.05),
 finished boolean not null default false
);
create index yapcode_reservations_created on yapcode_private.reservations(created_at);
create index yapcode_reservations_owner_created on yapcode_private.reservations(owner_id,created_at);
alter table yapcode_private.control enable row level security;
alter table yapcode_private.reservations enable row level security;
revoke all on all tables in schema yapcode_private from public,anon,authenticated;
grant select,insert,update on all tables in schema yapcode_private to service_role;
grant select,insert,update on public.yapcode_runs to service_role;

create function public.yapcode_admit(p_owner uuid,p_key uuid,p_input jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare c yapcode_private.control; t public.yapcode_runs; n integer; cost numeric;
begin
 select * into strict c from yapcode_private.control where singleton for update;
 select * into t from public.yapcode_runs where owner_id=p_owner and request_key=p_key;
 if found then
  if t.input is distinct from p_input then raise exception 'IDEMPOTENCY_CONFLICT'; end if;
  return jsonb_build_object('created',false,'task',to_jsonb(t));
 end if;
 if c.stopped or c.enabled_until<=clock_timestamp() then raise exception 'EXECUTION_STOPPED'; end if;
 if not exists(select 1 from auth.users where id=p_owner and not is_anonymous and email_confirmed_at is not null) then raise exception 'ACCOUNT_REQUIRED'; end if;
 if jsonb_typeof(p_input)<>'object' or octet_length(p_input::text)>6000 then raise exception 'INVALID_INPUT'; end if;
 -- The Edge request has a 90s deadline. Quarantine expired leases for 150s,
 -- and never retry them; provider writes may have succeeded after a timeout.
 update public.yapcode_runs r set status='failed',result=r.result||'{"error":"DEADLINE_OR_WORKER_LOST","manual_reconciliation_required":true}'::jsonb,updated_at=now()
 where status='running' and exists(select 1 from yapcode_private.reservations x where x.task_id=r.id and x.lease_until<clock_timestamp());
 if exists(select 1 from yapcode_private.reservations where not finished and lease_until>=clock_timestamp()) then raise exception 'SYSTEM_BUSY'; end if;
 if exists(select 1 from public.yapcode_runs where owner_id=p_owner and status='running') then raise exception 'USER_BUSY'; end if;
 select count(*) into n from yapcode_private.reservations where owner_id=p_owner and created_at>now()-interval '24 hours';
 if n>=3 then raise exception 'USER_DAILY_LIMIT'; end if;
 select coalesce(sum(reserved_usd),0) into cost from yapcode_private.reservations where created_at>now()-interval '24 hours';
 if cost+0.05>1 then raise exception 'SYSTEM_DAILY_BUDGET'; end if;
 select coalesce(sum(reserved_usd),0) into cost from yapcode_private.reservations where created_at>=date_trunc('month',now() at time zone 'UTC') at time zone 'UTC';
 if cost+0.05>10 then raise exception 'SYSTEM_MONTHLY_BUDGET'; end if;
 insert into public.yapcode_runs(owner_id,request_key,input,status) values(p_owner,p_key,p_input,'running') returning * into t;
 insert into yapcode_private.reservations(task_id,owner_id) values(t.id,p_owner);
 return jsonb_build_object('created',true,'task',to_jsonb(t));
end $$;
create function public.yapcode_permit(p_task uuid)
returns boolean language sql security invoker set search_path='' as $$
 select exists(select 1 from yapcode_private.control c,yapcode_private.reservations x,public.yapcode_runs r
 where c.singleton and not c.stopped and c.enabled_until>clock_timestamp()
 and x.task_id=p_task and not x.finished and x.lease_until>clock_timestamp()
 and r.id=p_task and r.status='running');
$$;
create function public.yapcode_checkpoint(p_task uuid,p_result jsonb,p_finish text default null)
returns boolean language plpgsql security invoker set search_path='' as $$
begin
 if p_finish is not null and p_finish not in ('completed','failed') then raise exception 'INVALID_STATUS'; end if;
 if octet_length(p_result::text)>40000 then raise exception 'RESULT_TOO_LARGE'; end if;
 update public.yapcode_runs set result=result||p_result,status=coalesce(p_finish,status),updated_at=now()
 where id=p_task and status='running';
 if not found then return false; end if;
 if p_finish is not null then update yapcode_private.reservations set finished=true where task_id=p_task; end if;
 return true;
end $$;
revoke all on function public.yapcode_admit(uuid,uuid,jsonb) from public,anon,authenticated;
revoke all on function public.yapcode_permit(uuid) from public,anon,authenticated;
revoke all on function public.yapcode_checkpoint(uuid,jsonb,text) from public,anon,authenticated;
grant execute on function public.yapcode_admit(uuid,uuid,jsonb),public.yapcode_permit(uuid),public.yapcode_checkpoint(uuid,jsonb,text) to service_role;
comment on table public.yapcode_runs is 'Bounded PR drafts only. Owner read access. Trusted gateway admits and checkpoints; no browser writes.';

create function public.yapcode_runtime_status()
returns jsonb language sql security invoker set search_path='' as $$
 select jsonb_build_object('stopped',stopped,'enabled_until',enabled_until,'reason',reason,'active',(select count(*) from yapcode_private.reservations where not finished and lease_until>clock_timestamp()),'reserved_last_24h_usd',(select coalesce(sum(reserved_usd),0) from yapcode_private.reservations where created_at>now()-interval '24 hours')) from yapcode_private.control where singleton;
$$;
revoke all on function public.yapcode_runtime_status() from public,anon,authenticated;
grant execute on function public.yapcode_runtime_status() to service_role;
