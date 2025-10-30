-- Test script to verify alerts migrations
-- This script can be run in Supabase SQL editor to test the migrations

-- Test 1: Verify alerts table exists and has correct structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'alerts' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Test 2: Verify alerts_log table exists and has correct structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'alerts_log' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Test 3: Verify indexes exist
SELECT 
    indexname, 
    tablename, 
    indexdef
FROM pg_indexes 
WHERE tablename IN ('alerts', 'alerts_log')
AND schemaname = 'public';

-- Test 4: Verify RLS is enabled
SELECT 
    schemaname, 
    tablename, 
    rowsecurity 
FROM pg_tables 
WHERE tablename IN ('alerts', 'alerts_log')
AND schemaname = 'public';

-- Test 5: Verify RLS policies exist
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    permissive, 
    roles, 
    cmd, 
    qual, 
    with_check
FROM pg_policies 
WHERE tablename IN ('alerts', 'alerts_log')
AND schemaname = 'public';



