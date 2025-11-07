-- Migration: Remove Unused Tables
-- Removes tables that are defined in schema but never used in the codebase
-- 
-- Tables to remove:
-- 1. zerodha_sessions - No implementation exists
-- 2. holdings - Not written to, data comes from API directly
-- 3. funds - Not written to, data comes from API directly
-- 4. signals - No usage anywhere
-- 5. market_data_cache - No caching implementation exists

BEGIN;

-- Drop RLS policies first
DROP POLICY IF EXISTS "Users can manage own Zerodha sessions" ON public.zerodha_sessions;
DROP POLICY IF EXISTS "Users can manage own holdings" ON public.holdings;
DROP POLICY IF EXISTS "Users can manage own funds" ON public.funds;
DROP POLICY IF EXISTS "Users can view own signals" ON public.signals;

-- Drop indexes
DROP INDEX IF EXISTS idx_holdings_user_id;
DROP INDEX IF EXISTS idx_funds_user_id;
DROP INDEX IF EXISTS idx_signals_bot_id;
DROP INDEX IF EXISTS idx_signals_created_at;
DROP INDEX IF EXISTS idx_market_data_symbol_interval;
DROP INDEX IF EXISTS idx_market_data_timestamp;

-- Drop triggers
DROP TRIGGER IF EXISTS update_zerodha_sessions_updated_at ON public.zerodha_sessions;
DROP TRIGGER IF EXISTS update_holdings_updated_at ON public.holdings;
DROP TRIGGER IF EXISTS update_funds_updated_at ON public.funds;

-- Drop tables (CASCADE will handle foreign keys)
DROP TABLE IF EXISTS public.zerodha_sessions CASCADE;
DROP TABLE IF EXISTS public.holdings CASCADE;
DROP TABLE IF EXISTS public.funds CASCADE;
DROP TABLE IF EXISTS public.signals CASCADE;
DROP TABLE IF EXISTS public.market_data_cache CASCADE;

COMMIT;

-- Note: If you need to restore these tables later, they are defined in:
-- infra/supabase/schema.sql (lines 35-173)

