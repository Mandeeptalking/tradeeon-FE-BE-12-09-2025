-- TEST TRIGGER: Verify trigger creates profile on new signup
-- Run this AFTER creating a new user to check if trigger worked

-- Step 1: Check if trigger exists and is enabled
SELECT 
    'Trigger Status' AS check_type,
    tgname AS trigger_name,
    tgenabled AS enabled,
    CASE 
        WHEN tgenabled = 'O' THEN 'Enabled ✅'
        WHEN tgenabled = 'D' THEN 'Disabled ❌'
        ELSE 'Unknown'
    END AS status
FROM pg_trigger
WHERE tgname = 'on_auth_user_created';

-- Step 2: Check if function exists
SELECT 
    'Function Status' AS check_type,
    proname AS function_name,
    CASE 
        WHEN proname = 'handle_new_user' THEN 'Exists ✅'
        ELSE 'Missing ❌'
    END AS status
FROM pg_proc
WHERE proname = 'handle_new_user';

-- Step 3: Count users in both tables
SELECT 
    'User Counts' AS check_type,
    (SELECT COUNT(*) FROM auth.users) AS auth_users,
    (SELECT COUNT(*) FROM public.users) AS public_users,
    CASE 
        WHEN (SELECT COUNT(*) FROM auth.users) = (SELECT COUNT(*) FROM public.users) THEN 'Match ✅'
        WHEN (SELECT COUNT(*) FROM auth.users) > (SELECT COUNT(*) FROM public.users) THEN 'Missing Profiles ❌'
        ELSE 'More profiles than auth users ⚠️'
    END AS status;

-- Step 4: Find users without profiles (if any)
SELECT 
    'Users Missing Profiles' AS check_type,
    au.id,
    au.email,
    au.email_confirmed_at IS NOT NULL AS is_verified,
    au.created_at,
    au.raw_user_meta_data->>'first_name' AS first_name
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL
ORDER BY au.created_at DESC;

-- Step 5: Show recent users (last 5)
SELECT 
    'Recent Users' AS check_type,
    au.id,
    au.email,
    au.email_confirmed_at IS NOT NULL AS is_verified,
    au.created_at,
    pu.id IS NOT NULL AS has_profile
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
ORDER BY au.created_at DESC
LIMIT 5;

