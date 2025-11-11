-- COMPLETE FIX: Ensure trigger creates user profiles
-- Run this AFTER running diagnose-trigger-issue.sql to see what's wrong

-- Step 1: Ensure columns exist with proper defaults
DO $$
BEGIN
    -- Add columns if they don't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'first_name'
    ) THEN
        ALTER TABLE public.users 
        ADD COLUMN IF NOT EXISTS first_name TEXT DEFAULT 'User',
        ADD COLUMN IF NOT EXISTS last_name TEXT DEFAULT '';
        
        -- Update existing NULL values
        UPDATE public.users 
        SET first_name = COALESCE(SPLIT_PART(full_name, ' ', 1), 'User'),
            last_name = CASE 
                WHEN POSITION(' ' IN COALESCE(full_name, '')) > 0 
                THEN SUBSTRING(full_name FROM POSITION(' ' IN full_name) + 1)
                ELSE ''
            END
        WHERE first_name IS NULL OR first_name = '';
        
        -- Set NOT NULL constraints
        ALTER TABLE public.users 
        ALTER COLUMN first_name SET DEFAULT 'User',
        ALTER COLUMN first_name SET NOT NULL;
        
        ALTER TABLE public.users 
        ALTER COLUMN last_name SET DEFAULT '',
        ALTER COLUMN last_name SET NOT NULL;
    ELSE
        -- Ensure defaults exist
        ALTER TABLE public.users 
        ALTER COLUMN first_name SET DEFAULT 'User';
        ALTER TABLE public.users 
        ALTER COLUMN last_name SET DEFAULT '';
        
        -- Fix any NULL values
        UPDATE public.users SET first_name = 'User' WHERE first_name IS NULL;
        UPDATE public.users SET last_name = '' WHERE last_name IS NULL;
    END IF;
END $$;

-- Step 2: Drop and recreate function with better error handling
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    v_first_name TEXT;
    v_last_name TEXT;
    v_email TEXT;
BEGIN
    -- Extract values safely
    v_email := COALESCE(NEW.email, '');
    v_first_name := COALESCE(
        NEW.raw_user_meta_data->>'first_name',
        'User'
    );
    v_last_name := COALESCE(
        NEW.raw_user_meta_data->>'last_name',
        ''
    );
    
    -- Ensure first_name is never empty
    IF v_first_name IS NULL OR v_first_name = '' THEN
        v_first_name := 'User';
    END IF;
    
    -- Insert user profile
    INSERT INTO public.users (
        id,
        email,
        first_name,
        last_name,
        created_at,
        updated_at
    )
    VALUES (
        NEW.id,
        v_email,
        v_first_name,
        v_last_name,
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        email = COALESCE(NULLIF(EXCLUDED.email, ''), public.users.email),
        first_name = COALESCE(NULLIF(EXCLUDED.first_name, ''), public.users.first_name),
        last_name = COALESCE(EXCLUDED.last_name, public.users.last_name),
        updated_at = NOW();
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error details
        RAISE WARNING 'handle_new_user error for user %: % (SQLSTATE: %)', 
            NEW.id, SQLERRM, SQLSTATE;
        -- Still return NEW to allow signup to proceed
        RETURN NEW;
END;
$$;

-- Step 3: Drop and recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Step 4: Fix email verification function
DROP FUNCTION IF EXISTS public.handle_user_email_verified() CASCADE;

CREATE OR REPLACE FUNCTION public.handle_user_email_verified()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    v_first_name TEXT;
    v_last_name TEXT;
    v_email TEXT;
    v_created_at TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Get existing created_at if profile exists
    SELECT created_at INTO v_created_at
    FROM public.users
    WHERE id = NEW.id;
    
    -- Extract values
    v_email := COALESCE(NEW.email, '');
    v_first_name := COALESCE(
        NEW.raw_user_meta_data->>'first_name',
        (SELECT first_name FROM public.users WHERE id = NEW.id),
        'User'
    );
    v_last_name := COALESCE(
        NEW.raw_user_meta_data->>'last_name',
        (SELECT last_name FROM public.users WHERE id = NEW.id),
        ''
    );
    
    IF v_first_name IS NULL OR v_first_name = '' THEN
        v_first_name := 'User';
    END IF;
    
    -- Insert or update
    INSERT INTO public.users (
        id,
        email,
        first_name,
        last_name,
        created_at,
        updated_at
    )
    VALUES (
        NEW.id,
        v_email,
        v_first_name,
        v_last_name,
        COALESCE(v_created_at, NOW()),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        email = COALESCE(NULLIF(EXCLUDED.email, ''), public.users.email),
        first_name = COALESCE(NULLIF(EXCLUDED.first_name, ''), public.users.first_name),
        last_name = COALESCE(EXCLUDED.last_name, public.users.last_name),
        updated_at = NOW();
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'handle_user_email_verified error for user %: % (SQLSTATE: %)', 
            NEW.id, SQLERRM, SQLSTATE;
        RETURN NEW;
END;
$$;

-- Step 5: Recreate email verification trigger
DROP TRIGGER IF EXISTS on_auth_user_email_verified ON auth.users;

CREATE TRIGGER on_auth_user_email_verified
    AFTER UPDATE OF email_confirmed_at ON auth.users
    FOR EACH ROW
    WHEN (NEW.email_confirmed_at IS NOT NULL AND (OLD.email_confirmed_at IS NULL OR OLD.email_confirmed_at IS DISTINCT FROM NEW.email_confirmed_at))
    EXECUTE FUNCTION public.handle_user_email_verified();

-- Step 6: Ensure proper permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON public.users TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE ON public.users TO authenticated;

-- Step 7: Ensure RLS allows trigger inserts
-- Triggers run as SECURITY DEFINER, so they bypass RLS, but we need the policy for manual inserts
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
CREATE POLICY "Users can insert own profile" ON public.users
    FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Step 8: Verify trigger exists and is enabled
DO $$
DECLARE
    trigger_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO trigger_count
    FROM pg_trigger
    WHERE tgname = 'on_auth_user_created' AND tgenabled = 'O';
    
    IF trigger_count = 0 THEN
        RAISE EXCEPTION 'Trigger on_auth_user_created is missing or disabled!';
    END IF;
    
    RAISE NOTICE 'Trigger on_auth_user_created exists and is enabled';
END $$;

-- Step 9: Backfill existing users (create profiles for users who signed up but don't have profiles)
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

-- Step 10: Final verification
SELECT 
    'Fix completed!' AS status,
    (SELECT COUNT(*) FROM pg_trigger WHERE tgname = 'on_auth_user_created') AS trigger_exists,
    (SELECT COUNT(*) FROM pg_proc WHERE proname = 'handle_new_user') AS function_exists,
    (SELECT COUNT(*) FROM public.users) AS users_in_public_table,
    (SELECT COUNT(*) FROM auth.users) AS users_in_auth_table;
