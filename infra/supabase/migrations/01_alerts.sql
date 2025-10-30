-- Alerts master table
create table if not exists public.alerts (
  alert_id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  symbol text not null,
  base_timeframe text not null,              -- e.g. '1m'
  conditions jsonb not null,                 -- array<Condition>
  logic text not null default 'AND',         -- 'AND' | 'OR'
  action jsonb not null default '{}'::jsonb, -- { type:'notify'|'webhook'|'bot', ... }
  status text not null default 'active',     -- 'active' | 'paused'
  created_at timestamptz not null default now(),
  last_triggered_at timestamptz
);

create index if not exists alerts_user_idx on public.alerts (user_id);
create index if not exists alerts_symbol_idx on public.alerts (symbol);

alter table public.alerts enable row level security;

-- RLS: owner full access
drop policy if exists "alerts_owner_rw" on public.alerts;
create policy "alerts_owner_rw"
on public.alerts
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);



