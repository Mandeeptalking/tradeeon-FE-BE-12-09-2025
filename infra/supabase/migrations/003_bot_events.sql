-- Bot Events Table for comprehensive event logging
CREATE TABLE IF NOT EXISTS public.bot_events (
    event_id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    bot_id TEXT REFERENCES public.bots(bot_id) ON DELETE CASCADE NOT NULL,
    run_id UUID REFERENCES public.bot_runs(run_id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    event_type TEXT NOT NULL, -- 'entry_condition', 'dca_triggered', 'order_executed', 'profit_target', 'market_regime', 'emergency_brake', 'dynamic_scaling', 'cooldown_check', etc.
    event_category TEXT NOT NULL, -- 'condition', 'execution', 'risk', 'system', 'position'
    symbol TEXT,
    message TEXT NOT NULL,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_bot_events_bot_id ON public.bot_events(bot_id);
CREATE INDEX IF NOT EXISTS idx_bot_events_run_id ON public.bot_events(run_id);
CREATE INDEX IF NOT EXISTS idx_bot_events_user_id ON public.bot_events(user_id);
CREATE INDEX IF NOT EXISTS idx_bot_events_created_at ON public.bot_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bot_events_event_type ON public.bot_events(event_type);
CREATE INDEX IF NOT EXISTS idx_bot_events_symbol ON public.bot_events(symbol);

-- Enable RLS
ALTER TABLE public.bot_events ENABLE ROW LEVEL SECURITY;

-- Create RLS policy: users can only see their own bot events
DROP POLICY IF EXISTS "bot_events_owner_r" ON public.bot_events;
CREATE POLICY "bot_events_owner_r"
ON public.bot_events
FOR SELECT
USING (auth.uid() = user_id);

-- Allow service role to insert (for bot execution)
DROP POLICY IF EXISTS "bot_events_service_insert" ON public.bot_events;
CREATE POLICY "bot_events_service_insert"
ON public.bot_events
FOR INSERT
WITH CHECK (true); -- Service role bypasses RLS

