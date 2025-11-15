-- Condition Registry System Migration
-- Centralized condition management for all bots

-- Condition Registry Table
CREATE TABLE IF NOT EXISTS public.condition_registry (
    condition_id VARCHAR(64) PRIMARY KEY,
    condition_type VARCHAR(50) NOT NULL,
    symbol VARCHAR(20) NOT NULL,
    timeframe VARCHAR(10) NOT NULL,
    indicator_config JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_evaluated_at TIMESTAMP WITH TIME ZONE,
    evaluation_count BIGINT DEFAULT 0,
    last_triggered_at TIMESTAMP WITH TIME ZONE,
    trigger_count BIGINT DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Condition Subscriptions
CREATE TABLE IF NOT EXISTS public.user_condition_subscriptions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    bot_id VARCHAR(100) NOT NULL,
    condition_id VARCHAR(64) REFERENCES public.condition_registry(condition_id) ON DELETE CASCADE NOT NULL,
    bot_type VARCHAR(50) NOT NULL CHECK (bot_type IN ('dca', 'grid', 'trend', 'market_making', 'arbitrage', 'alert')),
    bot_config JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    active BOOLEAN DEFAULT TRUE,
    last_triggered_at TIMESTAMP WITH TIME ZONE
);

-- Condition Evaluation Cache
CREATE TABLE IF NOT EXISTS public.condition_evaluation_cache (
    condition_id VARCHAR(64) REFERENCES public.condition_registry(condition_id) ON DELETE CASCADE,
    symbol VARCHAR(20) NOT NULL,
    timeframe VARCHAR(10) NOT NULL,
    candle_time TIMESTAMP WITH TIME ZONE NOT NULL,
    indicator_values JSONB NOT NULL,
    evaluated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (condition_id, candle_time)
);

-- Condition Trigger Log
CREATE TABLE IF NOT EXISTS public.condition_triggers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    condition_id VARCHAR(64) REFERENCES public.condition_registry(condition_id) ON DELETE CASCADE NOT NULL,
    symbol VARCHAR(20) NOT NULL,
    timeframe VARCHAR(10) NOT NULL,
    triggered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    trigger_value JSONB NOT NULL,
    subscribers_count INTEGER DEFAULT 0,
    processed BOOLEAN DEFAULT FALSE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_condition_registry_symbol_timeframe ON public.condition_registry(symbol, timeframe);
CREATE INDEX IF NOT EXISTS idx_condition_registry_type ON public.condition_registry(condition_type);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user ON public.user_condition_subscriptions(user_id, active);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_condition ON public.user_condition_subscriptions(condition_id, active);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_bot ON public.user_condition_subscriptions(bot_id, active);
CREATE INDEX IF NOT EXISTS idx_condition_cache_symbol_time ON public.condition_evaluation_cache(symbol, timeframe, candle_time);
CREATE INDEX IF NOT EXISTS idx_condition_triggers_condition ON public.condition_triggers(condition_id, triggered_at);
CREATE INDEX IF NOT EXISTS idx_condition_triggers_processed ON public.condition_triggers(processed, triggered_at);

-- Row Level Security Policies
ALTER TABLE public.condition_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_condition_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.condition_evaluation_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.condition_triggers ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read all conditions (public registry)
CREATE POLICY "Users can read condition registry" ON public.condition_registry
    FOR SELECT USING (true);

-- Policy: Users can only manage their own subscriptions
CREATE POLICY "Users can manage own subscriptions" ON public.user_condition_subscriptions
    FOR ALL USING (auth.uid() = user_id);

-- Policy: Users can read evaluation cache (public data)
CREATE POLICY "Users can read evaluation cache" ON public.condition_evaluation_cache
    FOR SELECT USING (true);

-- Policy: Users can read condition triggers (public data)
CREATE POLICY "Users can read condition triggers" ON public.condition_triggers
    FOR SELECT USING (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_condition_registry_updated_at BEFORE UPDATE ON public.condition_registry
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_subscriptions_updated_at BEFORE UPDATE ON public.user_condition_subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

