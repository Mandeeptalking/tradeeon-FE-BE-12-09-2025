-- COMPLETE FIX: Create profiles for ALL users in auth.users
-- Run this if diagnostic shows users exist in auth.users but not in public.users

-- Step 1: Create profiles for ALL users in auth.users
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
WHERE pu.id IS NULL  -- Only users without profiles
ON CONFLICT (id) DO UPDATE SET
    email = COALESCE(NULLIF(EXCLUDED.email, ''), public.users.email),
    first_name = COALESCE(NULLIF(EXCLUDED.first_name, ''), public.users.first_name),
    last_name = COALESCE(EXCLUDED.last_name, public.users.last_name),
    updated_at = NOW();

-- Step 2: Verify results
SELECT 
    'Backfill Complete' AS status,
    (SELECT COUNT(*) FROM auth.users) AS auth_users_count,
    (SELECT COUNT(*) FROM public.users) AS public_users_count,
    (SELECT COUNT(*) FROM auth.users au LEFT JOIN public.users pu ON au.id = pu.id WHERE pu.id IS NULL) AS missing_profiles;

-- Step 3: Show specific user status
SELECT 
    'Specific User Status' AS check_type,
    (SELECT COUNT(*) FROM auth.users WHERE id = 'ba610106-aeb1-497f-beb1-8946fcfba277') AS exists_in_auth,
    (SELECT COUNT(*) FROM public.users WHERE id = 'ba610106-aeb1-497f-beb1-8946fcfba277') AS exists_in_public;

