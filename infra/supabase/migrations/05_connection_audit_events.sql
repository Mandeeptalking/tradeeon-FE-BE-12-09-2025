-- Migration: Connection Audit Events Table
-- Tracks all connection-related events for audit and history purposes

-- Create connection_audit_events table
CREATE TABLE IF NOT EXISTS public.connection_audit_events (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    connection_id UUID REFERENCES public.exchange_keys(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('connected', 'tested', 'rotated', 'revoked', 'paused', 'resumed', 'error', 'updated')),
    details TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_audit_events_connection_id ON public.connection_audit_events(connection_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_user_id ON public.connection_audit_events(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_created_at ON public.connection_audit_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_events_action ON public.connection_audit_events(action);

-- Enable Row Level Security
ALTER TABLE public.connection_audit_events ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can only see their own audit events
DROP POLICY IF EXISTS "audit_events_owner_select" ON public.connection_audit_events;
CREATE POLICY "audit_events_owner_select"
ON public.connection_audit_events
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own audit events (via backend service role)
DROP POLICY IF EXISTS "audit_events_owner_insert" ON public.connection_audit_events;
CREATE POLICY "audit_events_owner_insert"
ON public.connection_audit_events
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Add comment
COMMENT ON TABLE public.connection_audit_events IS 'Audit log for all connection-related events (create, test, update, delete, pause, resume)';

