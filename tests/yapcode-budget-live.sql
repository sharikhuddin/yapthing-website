begin;
select set_config('yaptest.uid',(select id::text from auth.users order by created_at limit 1),true),set_config('yaptest.global',gen_random_uuid()::text,true);
update yapcode_private.control set stopped=false,enabled_until=now()+interval '10 minutes' where singleton;
insert into yapcode_private.reservations(task_id,owner_id,finished) select gen_random_uuid(),current_setting('yaptest.global')::uuid,true from generate_series(1,20);
set local role service_role;
do $$begin
 begin perform public.yapcode_admit(current_setting('yaptest.uid')::uuid,gen_random_uuid(),'{}'); raise exception 'FAIL: daily budget bypass';
 exception when raise_exception then if sqlerrm<>'SYSTEM_DAILY_BUDGET' then raise; end if;end;
end $$;
reset role;
do $$begin
 if now()-interval '25 hours' < date_trunc('month',now()) then raise exception 'Monthly fixture needs a day after month start';end if;
end $$;
update yapcode_private.reservations set created_at=now()-interval '25 hours' where owner_id=current_setting('yaptest.global')::uuid;
insert into yapcode_private.reservations(task_id,owner_id,finished,created_at) select gen_random_uuid(),current_setting('yaptest.global')::uuid,true,now()-interval '25 hours' from generate_series(1,180);
set local role service_role;
do $$begin
 begin perform public.yapcode_admit(current_setting('yaptest.uid')::uuid,gen_random_uuid(),'{}'); raise exception 'FAIL: monthly budget bypass';
 exception when raise_exception then if sqlerrm<>'SYSTEM_MONTHLY_BUDGET' then raise;end if;end;
end $$;
reset role;
update yapcode_private.control set enabled_until=now()-interval '1 second';
set local role service_role;
do $$begin
 begin perform public.yapcode_admit(current_setting('yaptest.uid')::uuid,gen_random_uuid(),'{}'); raise exception 'FAIL: expired control bypass';
 exception when raise_exception then if sqlerrm<>'EXECUTION_STOPPED' then raise;end if;end;
end $$;
reset role;
rollback;
select public.yapcode_runtime_status() as restored_control;