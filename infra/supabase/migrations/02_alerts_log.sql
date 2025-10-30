-- Trigger log table
create table if not exists public.alerts_log (
  id bigserial primary key,
  alert_id uuid not null references public.alerts(alert_id) on delete cascade,
  triggered_at timestamptz not null default now(),
  payload jsonb not null                     -- snapshot: price/indicators at fire time
);

create index if not exists alerts_log_alert_idx on public.alerts_log (alert_id);

alter table public.alerts_log enable row level security;

-- RLS: read logs of your own alerts
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



