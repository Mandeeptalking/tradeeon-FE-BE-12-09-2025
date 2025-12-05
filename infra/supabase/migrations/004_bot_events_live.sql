-- Bot Events Live Table - Source of truth for actual bot events
-- This table only records important user-actionable events
CREATE TABLE IF NOT EXISTS public.bot_events_live (
    event_id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    bot_id TEXT REFERENCES public.bots(bot_id) ON DELETE CASCADE NOT NULL,
    run_id UUID REFERENCES public.bot_runs(run_id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    event_type TEXT NOT NULL, 
    -- Allowed types: 'bot_created', 'bot_started', 'bot_stopped', 'bot_paused', 'bot_resumed', 
    -- 'bot_deleted', 'order_executed', 'order_simulated', 'dca_started', 'dca_order_placed',
    -- 'entry_condition_met', 'profit_target_hit'
    event_category TEXT NOT NULL, -- 'system', 'execution', 'condition', 'profit'
    symbol TEXT,
    message TEXT NOT NULL,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_bot_events_live_bot_id ON public.bot_events_live(bot_id);
CREATE INDEX IF NOT EXISTS idx_bot_events_live_run_id ON public.bot_events_live(run_id);
CREATE INDEX IF NOT EXISTS idx_bot_events_live_user_id ON public.bot_events_live(user_id);
CREATE INDEX IF NOT EXISTS idx_bot_events_live_created_at ON public.bot_events_live(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bot_events_live_event_type ON public.bot_events_live(event_type);
CREATE INDEX IF NOT EXISTS idx_bot_events_live_symbol ON public.bot_events_live(symbol);

-- Enable RLS
ALTER TABLE public.bot_events_live ENABLE ROW LEVEL SECURITY;

-- Create RLS policy: users can only see their own bot events
DROP POLICY IF EXISTS "bot_events_live_owner_r" ON public.bot_events_live;
CREATE POLICY "bot_events_live_owner_r"
ON public.bot_events_live
FOR SELECT
USING (auth.uid() = user_id);

-- Allow service role to insert (for bot execution)
DROP POLICY IF EXISTS "bot_events_live_service_insert" ON public.bot_events_live;
CREATE POLICY "bot_events_live_service_insert"
ON public.bot_events_live
FOR INSERT
WITH CHECK (true); -- Service role bypasses RLS

