-- Migration: Fix bot_id data type from UUID to TEXT
-- The application generates bot_id as TEXT (e.g., "dca_bot_1234567890")
-- This migration fixes the data type mismatch

-- Drop foreign key constraints first
ALTER TABLE public.bot_runs 
  DROP CONSTRAINT IF EXISTS bot_runs_bot_id_fkey;

ALTER TABLE public.order_logs 
  DROP CONSTRAINT IF EXISTS order_logs_bot_id_fkey;

-- Change bot_id column type from UUID to TEXT in bots table
ALTER TABLE public.bots 
  ALTER COLUMN bot_id TYPE TEXT;

-- Change bot_id column type in bot_runs table
ALTER TABLE public.bot_runs 
  ALTER COLUMN bot_id TYPE TEXT;

-- Change bot_id column type in order_logs table
ALTER TABLE public.order_logs 
  ALTER COLUMN bot_id TYPE TEXT;

-- Recreate foreign key constraints
ALTER TABLE public.bot_runs 
  ADD CONSTRAINT bot_runs_bot_id_fkey 
  FOREIGN KEY (bot_id) REFERENCES public.bots(bot_id) ON DELETE CASCADE;

ALTER TABLE public.order_logs 
  ADD CONSTRAINT order_logs_bot_id_fkey 
  FOREIGN KEY (bot_id) REFERENCES public.bots(bot_id) ON DELETE CASCADE;

-- Note: If you're creating tables fresh, use this instead:
-- In 001_initial_schema.sql, change:
--   bot_id UUID DEFAULT uuid_generate_v4() PRIMARY KEY
-- To:
--   bot_id TEXT PRIMARY KEY


