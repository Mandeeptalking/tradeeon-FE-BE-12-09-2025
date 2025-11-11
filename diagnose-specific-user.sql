-- DIAGNOSTIC: Check specific user and trigger status
-- Replace USER_ID with: ba610106-aeb1-497f-beb1-8946fcfba277

-- Check if user exists in auth.users
SELECT 
    id,
    email,
    email_confirmed_at,
    created_at,
    raw_user_meta_data
FROM auth.users
WHERE id = 'ba610106-aeb1-497f-beb1-8946fcfba277';

-- Check if user exists in public.users
SELECT 
    id,
    email,
    first_name,
    last_name,
    created_at
FROM public.users
WHERE id = 'ba610106-aeb1-497f-beb1-8946fcfba277';

-- Check trigger status
SELECT 
    tgname AS trigger_name,
    tgrelid::regclass AS table_name,
    tgenabled AS enabled,
    pg_get_triggerdef(oid) AS trigger_definition
FROM pg_trigger
WHERE tgname = 'on_auth_user_created';

-- Check function exists
SELECT 
    proname AS function_name,
    prosrc AS function_source
FROM pg_proc
WHERE proname = 'handle_new_user';

-- Count users in both tables
SELECT 
    'auth.users' AS table_name,
    COUNT(*) AS count
FROM auth.users
UNION ALL
SELECT 
    'public.users' AS table_name,
    COUNT(*) AS count
FROM public.users;

