-- All fixtures and temporary enabling are rolled back. No external requests.
begin;
select set_config('yaptest.u1',gen_random_uuid()::text,true),set_config('yaptest.u2',gen_random_uuid()::text,true);
insert into auth.users(id,email,email_confirmed_at,is_anonymous)
select current_setting('yaptest.u1')::uuid,'yapcode-test-'||current_setting('yaptest.u1')||'@example.invalid',now(),false
union all select current_setting('yaptest.u2')::uuid,'yapcode-test-'||current_setting('yaptest.u2')||'@example.invalid',now(),false;
do $$
begin
 if has_function_privilege('authenticated','public.yapcode_admit(uuid,uuid,jsonb)','execute') or has_function_privilege('anon','public.yapcode_permit(uuid)','execute') then raise exception 'RPC permissions unsafe'; end if;
 if has_table_privilege('authenticated','public.yapcode_runs','insert') or has_table_privilege('anon','public.yapcode_runs','select') then raise exception 'Table permissions unsafe'; end if;
end $$;
set local role service_role;
do $$
begin
 begin
 perform public.yapcode_admit(current_setting('yaptest.u1')::uuid,gen_random_uuid(),'{}');
 raise exception 'FAIL: stop bypass';
 exception when raise_exception then if sqlerrm<>'EXECUTION_STOPPED' then raise; end if; end;
end $$;
reset role;
update yapcode_private.control set stopped=false,enabled_until=now()+interval '10 minutes' where singleton;
set local role service_role;
do $$
declare a jsonb; b jsonb; task uuid; k uuid:=gen_random_uuid(); i integer;
begin
 a:=public.yapcode_admit(current_setting('yaptest.u1')::uuid,k,'{"goal":"quota test"}'); task:=(a->'task'->>'id')::uuid;
 if not public.yapcode_permit(task) then raise exception 'Permit failed'; end if;
 b:=public.yapcode_admit(current_setting('yaptest.u1')::uuid,k,'{"goal":"quota test"}');
 if b->>'created'<>'false' or (b->'task'->>'id')::uuid<>task then raise exception 'Duplicate admission'; end if;
 begin perform public.yapcode_admit(current_setting('yaptest.u1')::uuid,k,'{}');raise exception 'FAIL: idempotency conflict';
 exception when raise_exception then if sqlerrm<>'IDEMPOTENCY_CONFLICT' then raise; end if;end;
 begin perform public.yapcode_admit(current_setting('yaptest.u2')::uuid,gen_random_uuid(),'{}');raise exception 'FAIL: concurrency bypass';
 exception when raise_exception then if sqlerrm<>'SYSTEM_BUSY' then raise; end if;end;
 perform public.yapcode_checkpoint(task,'{"pr_url":"https://github.com/test/example/pull/1"}','completed');
 if public.yapcode_permit(task) then raise exception 'Completed permit remained valid';end if;
 if public.yapcode_checkpoint(task,'{}','completed') then raise exception 'Duplicate completion accepted';end if;
 for i in 1..2 loop
 a:=public.yapcode_admit(current_setting('yaptest.u1')::uuid,gen_random_uuid(),'{}');
 perform public.yapcode_checkpoint((a->'task'->>'id')::uuid,'{}','completed');
 end loop;
 begin perform public.yapcode_admit(current_setting('yaptest.u1')::uuid,gen_random_uuid(),'{}');raise exception 'FAIL: user quota bypass';
 exception when raise_exception then if sqlerrm<>'USER_DAILY_LIMIT' then raise; end if;end;
 a:=public.yapcode_admit(current_setting('yaptest.u2')::uuid,gen_random_uuid(),'{}'); task:=(a->'task'->>'id')::uuid;
 perform public.yapcode_checkpoint(task,'{"error":"simulated timeout"}','failed');
 if public.yapcode_permit(task) then raise exception 'Failed task permit remained valid';end if;
 begin perform public.yapcode_admit(current_setting('yaptest.u2')::uuid,gen_random_uuid(),'{}');raise exception 'FAIL: quarantine bypass';
 exception when raise_exception then if sqlerrm<>'SYSTEM_BUSY' then raise;end if;end;
end $$;
reset role;
-- Check stop revokes an already-admitted task's permit.
update yapcode_private.reservations set lease_until=now()-interval '1 second';
select set_config('yaptest.active',(public.yapcode_admit(current_setting('yaptest.u2')::uuid,gen_random_uuid(),'{}')->'task'->>'id'),true);
update yapcode_private.control set stopped=true where singleton;
do $$begin if public.yapcode_permit(current_setting('yaptest.active')::uuid) then raise exception 'Stop did not revoke permit';end if;end $$;
-- RLS: both test users have rows; each can select only their own.
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('yaptest.u1'),true);
do $$begin
 if exists(select 1 from public.yapcode_runs where owner_id=current_setting('yaptest.u2')::uuid) then raise exception 'Cross-user RLS bypass';end if;
 if (select count(*) from public.yapcode_runs where owner_id=current_setting('yaptest.u1')::uuid)<>3 then raise exception 'Owner read failed';end if;
end $$;
reset role;
rollback;
select public.yapcode_runtime_status() as after_rollback;
