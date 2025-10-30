-- Migration: Initial Tradeeon Schema
-- Run this after setting up Supabase project

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users table (extends Supabase auth.users)
CREATE TABLE public.users (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    timezone TEXT DEFAULT 'UTC',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Exchange connections and API keys
CREATE TABLE public.exchange_keys (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    exchange TEXT NOT NULL CHECK (exchange IN ('binance', 'zerodha', 'coinbase', 'kraken')),
    api_key_encrypted TEXT NOT NULL,
    api_secret_encrypted TEXT NOT NULL,
    passphrase_encrypted TEXT, -- For exchanges that require it
    is_active BOOLEAN DEFAULT true,
    permissions JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, exchange)
);

-- Bot configurations
CREATE TABLE public.bots (
    bot_id TEXT PRIMARY KEY,  -- Changed from UUID to TEXT to match application
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    bot_type TEXT NOT NULL CHECK (bot_type IN ('dca', 'rsi_amo', 'arbitrage', 'grid', 'momentum')),
    status TEXT NOT NULL DEFAULT 'inactive' CHECK (status IN ('active', 'inactive', 'running', 'stopped', 'error', 'paused')),
    symbol TEXT NOT NULL,
    interval TEXT NOT NULL DEFAULT '1m',
    config JSONB NOT NULL DEFAULT '{}',
    required_capital DECIMAL(20,8),
    max_position_size DECIMAL(20,8),
    risk_per_trade DECIMAL(5,4), -- Percentage as decimal (0.01 = 1%)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bot run instances
CREATE TABLE public.bot_runs (
    run_id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    bot_id TEXT REFERENCES public.bots(bot_id) ON DELETE CASCADE NOT NULL,  -- Changed from UUID to TEXT
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('running', 'completed', 'stopped', 'error')),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE,
    total_trades INTEGER DEFAULT 0,
    total_pnl DECIMAL(20,8) DEFAULT 0,
    max_drawdown DECIMAL(20,8) DEFAULT 0,
    sharpe_ratio DECIMAL(10,4),
    meta JSONB DEFAULT '{}'
);

-- Order logs
CREATE TABLE public.order_logs (
    order_id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    bot_id TEXT REFERENCES public.bots(bot_id) ON DELETE CASCADE NOT NULL,  -- Changed from UUID to TEXT
    run_id UUID REFERENCES public.bot_runs(run_id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    exchange_order_id TEXT,
    symbol TEXT NOT NULL,
    side TEXT NOT NULL CHECK (side IN ('buy', 'sell')),
    qty DECIMAL(20,8) NOT NULL,
    order_type TEXT NOT NULL CHECK (order_type IN ('market', 'limit', 'stop', 'stop_limit')),
    limit_price DECIMAL(20,8),
    stop_price DECIMAL(20,8),
    status TEXT NOT NULL CHECK (status IN ('pending', 'submitted', 'partially_filled', 'filled', 'cancelled', 'rejected', 'expired')),
    filled_qty DECIMAL(20,8) DEFAULT 0,
    avg_price DECIMAL(20,8),
    fees DECIMAL(20,8),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Current positions
CREATE TABLE public.positions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    symbol TEXT NOT NULL,
    qty DECIMAL(20,8) NOT NULL,
    avg_price DECIMAL(20,8) NOT NULL,
    current_price DECIMAL(20,8),
    unrealized_pnl DECIMAL(20,8) DEFAULT 0,
    unrealized_pnl_percent DECIMAL(10,4) DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, symbol)
);

-- Asset holdings
CREATE TABLE public.holdings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    currency TEXT NOT NULL,
    qty DECIMAL(20,8) NOT NULL,
    avg_price DECIMAL(20,8) NOT NULL,
    current_price DECIMAL(20,8),
    total_value DECIMAL(20,8),
    unrealized_pnl DECIMAL(20,8) DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, currency)
);

-- Available funds per exchange
CREATE TABLE public.funds (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    exchange TEXT NOT NULL,
    currency TEXT NOT NULL,
    free DECIMAL(20,8) DEFAULT 0,
    locked DECIMAL(20,8) DEFAULT 0,
    total DECIMAL(20,8) GENERATED ALWAYS AS (free + locked) STORED,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, exchange, currency)
);

-- Indexes for performance
CREATE INDEX idx_bots_user_id ON public.bots(user_id);
CREATE INDEX idx_bots_status ON public.bots(status);
CREATE INDEX idx_bot_runs_bot_id ON public.bot_runs(bot_id);
CREATE INDEX idx_bot_runs_status ON public.bot_runs(status);
CREATE INDEX idx_order_logs_bot_id ON public.order_logs(bot_id);
CREATE INDEX idx_order_logs_status ON public.order_logs(status);
CREATE INDEX idx_order_logs_created_at ON public.order_logs(created_at);
CREATE INDEX idx_positions_user_id ON public.positions(user_id);
CREATE INDEX idx_holdings_user_id ON public.holdings(user_id);
CREATE INDEX idx_funds_user_id ON public.funds(user_id);

-- Row Level Security (RLS) policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exchange_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.holdings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funds ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Users can only access their own data
CREATE POLICY "Users can view own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can manage own exchange keys" ON public.exchange_keys
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own bots" ON public.bots
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own bot runs" ON public.bot_runs
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own orders" ON public.order_logs
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own positions" ON public.positions
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own holdings" ON public.holdings
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own funds" ON public.funds
    FOR ALL USING (auth.uid() = user_id);

-- Functions for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for automatic timestamp updates
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_exchange_keys_updated_at BEFORE UPDATE ON public.exchange_keys
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bots_updated_at BEFORE UPDATE ON public.bots
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_order_logs_updated_at BEFORE UPDATE ON public.order_logs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_positions_updated_at BEFORE UPDATE ON public.positions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_holdings_updated_at BEFORE UPDATE ON public.holdings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_funds_updated_at BEFORE UPDATE ON public.funds
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


