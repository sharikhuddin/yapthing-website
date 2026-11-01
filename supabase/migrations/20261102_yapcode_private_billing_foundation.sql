-- YapCode private commercial billing foundation. No user-facing purchase or execution endpoint.
create schema if not exists yapcode_billing;
revoke all on schema yapcode_billing from public, anon, authenticated;
create table if not exists yapcode_billing.wallets (
 user_id uuid primary key references auth.users(id) on delete cascade,
 purchased_credits bigint not null default 0 check (purchased_credits >= 0),
 reserved_credits bigint not null default 0 check (reserved_credits >= 0 and reserved_credits <= purchased_credits),
 updated_at timestamptz not null default now()
);
create table if not exists yapcode_billing.ledger (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 event_key text not null unique check (length(event_key) between 8 and 200),
 event_type text not null check (event_type in ('purchase','reserve','settle','release','refund','adjustment')),
 credits_delta bigint not null,
 task_id uuid,
 created_at timestamptz not null default now()
);
create index if not exists yapcode_billing_ledger_user_created on yapcode_billing.ledger (user_id,created_at desc);
alter table yapcode_billing.wallets enable row level security;
alter table yapcode_billing.ledger enable row level security;
revoke all on all tables in schema yapcode_billing from public, anon, authenticated;
revoke all on all sequences in schema yapcode_billing from public, anon, authenticated;
comment on schema yapcode_billing is 'Private billing tables. No customer access or billing executor until signed webhook and atomic transaction procedures are implemented.';
