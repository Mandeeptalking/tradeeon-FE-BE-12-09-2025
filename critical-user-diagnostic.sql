-- CRITICAL DIAGNOSTIC: Check for specific user and all users
-- This will tell us if users exist and why profiles aren't being created

-- 1. Check if the specific user from error exists in auth.users
SELECT 
    'Specific User Check' AS check_type,
    id,
    email,
    email_confirmed_at,
    created_at,
    raw_user_meta_data->>'first_name' AS first_name,
    raw_user_meta_data->>'last_name' AS last_name
FROM auth.users
WHERE id = 'ba610106-aeb1-497f-beb1-8946fcfba277';

-- 2. Check if ANY users exist in auth.users
SELECT 
    'All Auth Users' AS check_type,
    COUNT(*) AS total_count,
    COUNT(CASE WHEN email_confirmed_at IS NOT NULL THEN 1 END) AS verified_count,
    COUNT(CASE WHEN email_confirmed_at IS NULL THEN 1 END) AS unverified_count
FROM auth.users;

-- 3. List ALL users in auth.users (first 10)
SELECT 
    'Auth Users List' AS check_type,
    id,
    email,
    email_confirmed_at IS NOT NULL AS is_verified,
    created_at,
    raw_user_meta_data->>'first_name' AS first_name
FROM auth.users
ORDER BY created_at DESC
LIMIT 10;

-- 4. Check if specific user exists in public.users
SELECT 
    'Specific User in Public' AS check_type,
    id,
    email,
    first_name,
    last_name,
    created_at
FROM public.users
WHERE id = 'ba610106-aeb1-497f-beb1-8946fcfba277';

-- 5. Count users in public.users
SELECT 
    'Public Users Count' AS check_type,
    COUNT(*) AS total_count
FROM public.users;

-- 6. Find users in auth.users but NOT in public.users
SELECT 
    'Missing Profiles' AS check_type,
    au.id,
    au.email,
    au.email_confirmed_at IS NOT NULL AS is_verified,
    au.created_at,
    au.raw_user_meta_data->>'first_name' AS first_name
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL
ORDER BY au.created_at DESC;

-- 7. Verify trigger is enabled and function exists
SELECT 
    'Trigger Status' AS check_type,
    (SELECT COUNT(*) FROM pg_trigger WHERE tgname = 'on_auth_user_created' AND tgenabled = 'O') AS trigger_enabled,
    (SELECT COUNT(*) FROM pg_proc WHERE proname = 'handle_new_user') AS function_exists;

