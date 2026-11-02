create or replace function public.yapcode_checkpoint(p_task uuid,p_result jsonb,p_finish text default null)
returns boolean language plpgsql security invoker set search_path='' as $$
begin
 if p_finish is not null and p_finish not in ('completed','failed') then raise exception 'INVALID_STATUS'; end if;
 if octet_length(p_result::text)>40000 then raise exception 'RESULT_TOO_LARGE'; end if;
 update public.yapcode_runs set result=result||p_result,status=coalesce(p_finish,status),updated_at=now()
 where id=p_task and status='running';
 if not found then return false; end if;
 -- Failed calls may still be running at the provider: retain the 150s slot.
 if p_finish='completed' then update yapcode_private.reservations set finished=true where task_id=p_task; end if;
 return true;
end $$;