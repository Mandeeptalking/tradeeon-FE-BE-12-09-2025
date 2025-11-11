-- DIAGNOSTIC: Check trigger and function status
-- Run this first to see what's wrong

-- Check if trigger exists
SELECT 
    tgname AS trigger_name,
    tgrelid::regclass AS table_name,
    tgenabled AS enabled,
    pg_get_triggerdef(oid) AS trigger_definition
FROM pg_trigger
WHERE tgname IN ('on_auth_user_created', 'on_auth_user_email_verified');

-- Check if functions exist
SELECT 
    proname AS function_name,
    prosrc AS function_source
FROM pg_proc
WHERE proname IN ('handle_new_user', 'handle_user_email_verified');

-- Check users table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'users'
ORDER BY ordinal_position;

-- Check RLS policies
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
WHERE tablename = 'users';

-- Check recent auth.users entries
SELECT 
    id,
    email,
    email_confirmed_at,
    created_at,
    raw_user_meta_data
FROM auth.users
ORDER BY created_at DESC
LIMIT 5;

-- Check if any public.users exist
SELECT COUNT(*) AS user_count FROM public.users;

