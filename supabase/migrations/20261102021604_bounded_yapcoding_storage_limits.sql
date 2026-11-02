create or replace function public.yapcode_admit(p_owner uuid,p_key uuid,p_input jsonb)
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
 -- Auth is verified using the Auth service in the gateway; service_role cannot SELECT auth.users.
 if p_owner is null or p_key is null then raise exception 'ACCOUNT_REQUIRED'; end if;
 if jsonb_typeof(p_input)<>'object' or octet_length(p_input::text)>6000 then raise exception 'INVALID_INPUT'; end if;
 -- The Edge request has a 90s deadline. Quarantine expired leases for 150s,
 -- and never retry them; provider writes may have succeeded after a timeout.
 update public.yapcode_runs r set status='failed',result=r.result||'{"error":"DEADLINE_OR_WORKER_LOST","manual_reconciliation_required":true}'::jsonb,updated_at=now()
 where status='running' and exists(select 1 from yapcode_private.reservations x where x.task_id=r.id and x.lease_until<clock_timestamp());
 if exists(select 1 from yapcode_private.reservations where not finished and lease_until>=clock_timestamp()) then raise exception 'SYSTEM_BUSY'; end if;
 if exists(select 1 from public.yapcode_runs where owner_id=p_owner and status='running') then raise exception 'USER_BUSY'; end if;
 select count(*) into n from public.yapcode_runs where owner_id=p_owner;
 if n>=100 then raise exception 'USER_RESULT_STORAGE_LIMIT'; end if;
 select count(*) into n from public.yapcode_runs;
 if n>=1000 then raise exception 'SYSTEM_RESULT_STORAGE_LIMIT'; end if;
 select count(*) into n from yapcode_private.reservations;
 if n>=10000 then raise exception 'AUDIT_STORAGE_LIMIT'; end if;
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
