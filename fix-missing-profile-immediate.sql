-- IMMEDIATE FIX: Create profile for existing user and diagnose trigger issue
-- User exists in auth.users but NOT in public.users - trigger didn't fire

-- Step 1: Create profile for the existing user manually
INSERT INTO public.users (
    id,
    email,
    first_name,
    last_name,
    created_at,
    updated_at
)
SELECT 
    au.id,
    COALESCE(au.email, ''),
    COALESCE(au.raw_user_meta_data->>'first_name', 'User'),
    COALESCE(au.raw_user_meta_data->>'last_name', ''),
    au.created_at,
    NOW()
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL
ON CONFLICT (id) DO UPDATE SET
    email = COALESCE(NULLIF(EXCLUDED.email, ''), public.users.email),
    first_name = COALESCE(NULLIF(EXCLUDED.first_name, ''), public.users.first_name),
    last_name = COALESCE(EXCLUDED.last_name, public.users.last_name),
    updated_at = NOW();

-- Step 2: Check trigger status and function
SELECT 
    'Trigger Check' AS check_type,
    tgname AS trigger_name,
    tgenabled AS enabled_code,
    CASE 
        WHEN tgenabled = 'O' THEN 'Enabled ✅'
        WHEN tgenabled = 'D' THEN 'Disabled ❌'
        ELSE 'Unknown'
    END AS status,
    tgrelid::regclass AS table_name
FROM pg_trigger
WHERE tgname = 'on_auth_user_created';

-- Step 3: Check function exists and is correct
SELECT 
    'Function Check' AS check_type,
    proname AS function_name,
    prosrc AS function_source
FROM pg_proc
WHERE proname = 'handle_new_user';

-- Step 4: Verify profile was created
SELECT 
    'Profile Created' AS status,
    (SELECT COUNT(*) FROM auth.users) AS auth_users,
    (SELECT COUNT(*) FROM public.users) AS public_users,
    CASE 
        WHEN (SELECT COUNT(*) FROM auth.users) = (SELECT COUNT(*) FROM public.users) 
        THEN 'All users have profiles ✅'
        ELSE 'Still missing profiles ❌'
    END AS profile_status;

-- Step 5: Show the user that was created
SELECT 
    'User Details' AS check_type,
    au.id,
    au.email,
    au.email_confirmed_at IS NOT NULL AS is_verified,
    au.created_at,
    pu.id IS NOT NULL AS has_profile,
    pu.first_name,
    pu.last_name
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
ORDER BY au.created_at DESC
LIMIT 1;

