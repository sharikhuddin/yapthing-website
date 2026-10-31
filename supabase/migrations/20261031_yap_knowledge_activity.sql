create table if not exists public.yap_knowledge_activity (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null check (event_type in ('academic','developer','live','source_read')),
  outcome text not null check (outcome in ('started','success','failure','cached')),
  duration_ms integer not null default 0 check (duration_ms between 0 and 180000),
  created_at timestamptz not null default now()
);
alter table public.yap_knowledge_activity enable row level security;
revoke all on public.yap_knowledge_activity from anon, authenticated;
create index if not exists yap_knowledge_activity_created_at_idx on public.yap_knowledge_activity (created_at desc);
create index if not exists yap_knowledge_activity_user_recent_idx on public.yap_knowledge_activity (user_id, created_at desc);
comment on table public.yap_knowledge_activity is 'Server-recorded client reporting of YapKnowledge routes and outcomes. No prompts or source contents. Visible only through admin-protected Edge Function.';
