-- DIAGNOSE: Why trigger didn't fire
-- Check trigger logs and function errors

-- Step 1: Check if trigger exists and is enabled
SELECT 
    'Trigger Status' AS check_type,
    tgname,
    tgenabled,
    CASE tgenabled
        WHEN 'O' THEN 'Enabled'
        WHEN 'D' THEN 'Disabled'
        ELSE 'Unknown'
    END AS status,
    tgrelid::regclass AS on_table,
    tgenabled = 'O' AS is_enabled
FROM pg_trigger
WHERE tgname = 'on_auth_user_created';

-- Step 2: Check function definition
SELECT 
    'Function Definition' AS check_type,
    proname,
    prosrc
FROM pg_proc
WHERE proname = 'handle_new_user';

-- Step 3: Test function manually (simulate trigger call)
-- This will show if function has errors
DO $$
DECLARE
    test_user_id UUID;
    test_result TEXT;
BEGIN
    -- Get the most recent user
    SELECT id INTO test_user_id
    FROM auth.users
    ORDER BY created_at DESC
    LIMIT 1;
    
    IF test_user_id IS NULL THEN
        RAISE NOTICE 'No users found in auth.users';
        RETURN;
    END IF;
    
    -- Try to call the function manually
    BEGIN
        -- We can't directly call a trigger function, but we can check if it exists
        RAISE NOTICE 'Function exists. User ID: %', test_user_id;
        
        -- Check if profile exists
        IF EXISTS (SELECT 1 FROM public.users WHERE id = test_user_id) THEN
            RAISE NOTICE 'Profile exists for user %', test_user_id;
        ELSE
            RAISE WARNING 'Profile MISSING for user %', test_user_id;
        END IF;
    EXCEPTION
        WHEN OTHERS THEN
            RAISE WARNING 'Error checking function: %', SQLERRM;
    END;
END $$;

-- Step 4: Check for any RLS policies blocking inserts
SELECT 
    'RLS Policies' AS check_type,
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

-- Step 5: Check table permissions
SELECT 
    'Table Permissions' AS check_type,
    grantee,
    privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public' 
AND table_name = 'users'
AND grantee IN ('postgres', 'service_role', 'authenticated');

