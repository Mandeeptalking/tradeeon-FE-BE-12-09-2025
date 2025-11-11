-- IMMEDIATE FIX: Create profile for specific user and fix trigger
-- This will fix the current user AND ensure trigger works going forward

-- Step 1: Check if user exists in auth.users and get their data
DO $$
DECLARE
    v_user_id UUID := 'ba610106-aeb1-497f-beb1-8946fcfba277';
    v_email TEXT;
    v_first_name TEXT;
    v_last_name TEXT;
    v_created_at TIMESTAMP WITH TIME ZONE;
    v_user_exists BOOLEAN;
BEGIN
    -- Check if user exists in auth.users
    SELECT EXISTS(SELECT 1 FROM auth.users WHERE id = v_user_id) INTO v_user_exists;
    
    IF NOT v_user_exists THEN
        RAISE EXCEPTION 'User % does not exist in auth.users. User must sign up first.', v_user_id;
    END IF;
    
    -- Get user data from auth.users
    SELECT 
        email,
        COALESCE(raw_user_meta_data->>'first_name', 'User'),
        COALESCE(raw_user_meta_data->>'last_name', ''),
        created_at
    INTO v_email, v_first_name, v_last_name, v_created_at
    FROM auth.users
    WHERE id = v_user_id;
    
    -- Ensure first_name is not empty
    IF v_first_name IS NULL OR v_first_name = '' THEN
        v_first_name := 'User';
    END IF;
    
    -- Insert or update user profile
    INSERT INTO public.users (
        id,
        email,
        first_name,
        last_name,
        created_at,
        updated_at
    )
    VALUES (
        v_user_id,
        COALESCE(v_email, ''),
        v_first_name,
        COALESCE(v_last_name, ''),
        COALESCE(v_created_at, NOW()),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        email = COALESCE(NULLIF(EXCLUDED.email, ''), public.users.email),
        first_name = COALESCE(NULLIF(EXCLUDED.first_name, ''), public.users.first_name),
        last_name = COALESCE(EXCLUDED.last_name, public.users.last_name),
        updated_at = NOW();
    
    RAISE NOTICE '✅ User profile created/updated for user %', v_user_id;
END $$;

-- Step 2: Backfill ALL missing users (safety net)
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
ON CONFLICT (id) DO NOTHING;

-- Step 3: Verify trigger exists and is enabled
DO $$
DECLARE
    trigger_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO trigger_count
    FROM pg_trigger
    WHERE tgname = 'on_auth_user_created' AND tgenabled = 'O';
    
    IF trigger_count = 0 THEN
        RAISE WARNING '⚠️ Trigger on_auth_user_created is missing or disabled!';
        RAISE WARNING 'Recreating trigger...';
        
        -- Recreate trigger
        DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
        CREATE TRIGGER on_auth_user_created
            AFTER INSERT ON auth.users
            FOR EACH ROW
            EXECUTE FUNCTION public.handle_new_user();
        
        RAISE NOTICE '✅ Trigger recreated';
    ELSE
        RAISE NOTICE '✅ Trigger exists and is enabled';
    END IF;
END $$;

-- Step 4: Verify function exists
DO $$
DECLARE
    function_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO function_count
    FROM pg_proc
    WHERE proname = 'handle_new_user';
    
    IF function_count = 0 THEN
        RAISE EXCEPTION 'Function handle_new_user does not exist! Run fix-user-profile-trigger.sql first.';
    ELSE
        RAISE NOTICE '✅ Function handle_new_user exists';
    END IF;
END $$;

-- Step 5: Final verification
SELECT 
    'Fix completed!' AS status,
    (SELECT COUNT(*) FROM auth.users WHERE id = 'ba610106-aeb1-497f-beb1-8946fcfba277') AS user_in_auth,
    (SELECT COUNT(*) FROM public.users WHERE id = 'ba610106-aeb1-497f-beb1-8946fcfba277') AS user_in_public,
    (SELECT COUNT(*) FROM pg_trigger WHERE tgname = 'on_auth_user_created' AND tgenabled = 'O') AS trigger_exists,
    (SELECT COUNT(*) FROM public.users) AS total_public_users,
    (SELECT COUNT(*) FROM auth.users) AS total_auth_users;

