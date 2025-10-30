-- Minimal seed for local dev
insert into public.alerts (user_id, symbol, base_timeframe, conditions, logic, action, status)
values
('00000000-0000-0000-0000-000000000001','BTCUSDT','1m',
  '[{"id":"c1","type":"indicator","indicator":"RSI","component":"RSI","operator":"crosses_below","compareWith":"value","compareValue":30,"timeframe":"same","settings":{"length":14}}]'::jsonb,
  'AND','{"type":"notify"}','active');

