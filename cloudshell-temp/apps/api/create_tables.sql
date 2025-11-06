-- Create alerts table
create table if not exists public.alerts (
  alert_id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  symbol text not null,
  base_timeframe text not null,
  conditions jsonb not null,
  logic text not null default 'AND',
  action jsonb not null default '{}'::jsonb,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  last_triggered_at timestamptz
);

-- Create alerts_log table
create table if not exists public.alerts_log (
  id bigserial primary key,
  alert_id uuid not null references public.alerts(alert_id) on delete cascade,
  triggered_at timestamptz not null default now(),
  payload jsonb not null
);

-- Create indexes
create index if not exists alerts_user_idx on public.alerts (user_id);
create index if not exists alerts_symbol_idx on public.alerts (symbol);
create index if not exists alerts_log_alert_idx on public.alerts_log (alert_id);

-- Enable RLS
alter table public.alerts enable row level security;
alter table public.alerts_log enable row level security;

-- Create RLS policies
drop policy if exists "alerts_owner_rw" on public.alerts;
create policy "alerts_owner_rw"
on public.alerts
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "alerts_log_owner_r" on public.alerts_log;
create policy "alerts_log_owner_r"
on public.alerts_log
for select
using (
  exists (
    select 1 from public.alerts a
    where a.alert_id = alerts_log.alert_id and a.user_id = auth.uid()
  )
);

