-- Applied to YapThing Supabase as yapcode_private_testing_queue.
-- Private test release: users can read only their own tasks; all inserts remain blocked.
create table if not exists public.yapcode_tasks (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id) on delete cascade,
 goal text not null check (char_length(goal) between 5 and 1000),
 status text not null default 'queued' check (status in ('queued','claimed','verifying','failed','verified-awaiting-approval','cancelled')),
 worker_id text,
 attempts integer not null default 0 check (attempts between 0 and 3),
 result jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists yapcode_tasks_owner_created on public.yapcode_tasks(owner_id,created_at desc);
alter table public.yapcode_tasks enable row level security;
revoke all on public.yapcode_tasks from anon,authenticated;
grant select on public.yapcode_tasks to authenticated;
create policy "yapcode owners view" on public.yapcode_tasks for select to authenticated using (owner_id=(select auth.uid()));
comment on table public.yapcode_tasks is 'Private testing queue; customer inserts and autonomous dispatch disabled until admin-only orchestrator and metering pass security validation.';
