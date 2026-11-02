-- Run after 20261101_yapcode_cloud_tasks.sql. Conservative pre-launch queue limits.
-- Only the authenticated user may create their own queued task; no automatic execution.
create or replace function public.yapcode_guard_insert()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare recent_count integer;
declare pending_count integer;
begin
  if auth.uid() is null or new.owner_id is distinct from auth.uid() then
    raise exception 'Not authorized to create this task' using errcode='42501';
  end if;
  -- Serialize submissions for each user to prevent concurrent request limit bypass.
  perform pg_advisory_xact_lock(hashtextextended(new.owner_id::text, 741852));
  select count(*) into recent_count from public.yapcode_tasks
    where owner_id=new.owner_id and created_at >= now()-interval '24 hours';
  select count(*) into pending_count from public.yapcode_tasks
    where owner_id=new.owner_id and status in ('queued','claimed','verifying');
  if recent_count >= 3 or pending_count >= 1 then
    raise exception 'YapCode free-tier task limit reached' using errcode='P0001';
  end if;
  new.status:='queued'; new.attempts:=0; new.worker_id:=null;
  new.result:='{}'::jsonb;
  new.created_at:=now(); new.updated_at:=now();
  return new;
end;
$$;
drop trigger if exists yapcode_guard_insert_trigger on public.yapcode_tasks;
create trigger yapcode_guard_insert_trigger before insert on public.yapcode_tasks
for each row execute function public.yapcode_guard_insert();
-- RLS and trigger are defense in depth. Dispatch remains OFF until separate, audited server-side claim is implemented.
