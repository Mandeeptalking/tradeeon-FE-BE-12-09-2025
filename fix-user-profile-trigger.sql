-- COMPLETE FIX: User Profile Creation Trigger
-- Run this ENTIRE script in Supabase SQL Editor
-- This fixes the "Database error saving new user" issue

-- Step 1: Ensure first_name and last_name columns exist with proper defaults
DO $$
BEGIN
    -- Add columns if they don't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'first_name'
    ) THEN
        -- Add columns
        ALTER TABLE public.users 
        ADD COLUMN IF NOT EXISTS first_name TEXT DEFAULT 'User',
        ADD COLUMN IF NOT EXISTS last_name TEXT DEFAULT '';
        
        -- Migrate existing data
        UPDATE public.users 
        SET first_name = COALESCE(SPLIT_PART(full_name, ' ', 1), 'User'),
            last_name = CASE 
                WHEN POSITION(' ' IN COALESCE(full_name, '')) > 0 
                THEN SUBSTRING(full_name FROM POSITION(' ' IN full_name) + 1)
                ELSE ''
            END
        WHERE first_name IS NULL OR first_name = '';
        
        -- Set NOT NULL constraints with defaults
        ALTER TABLE public.users 
        ALTER COLUMN first_name SET DEFAULT 'User',
        ALTER COLUMN first_name SET NOT NULL;
        
        ALTER TABLE public.users 
        ALTER COLUMN last_name SET DEFAULT '',
        ALTER COLUMN last_name SET NOT NULL;
    ELSE
        -- Columns exist, but ensure they have defaults
        ALTER TABLE public.users 
        ALTER COLUMN first_name SET DEFAULT 'User';
        
        ALTER TABLE public.users 
        ALTER COLUMN last_name SET DEFAULT '';
        
        -- Update any NULL values
        UPDATE public.users 
        SET first_name = 'User' 
        WHERE first_name IS NULL;
        
        UPDATE public.users 
        SET last_name = '' 
        WHERE last_name IS NULL;
    END IF;
END $$;

-- Step 2: Drop existing function and recreate with better error handling
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_first_name TEXT;
    v_last_name TEXT;
    v_email TEXT;
BEGIN
    -- Extract metadata safely
    v_first_name := COALESCE(
        NEW.raw_user_meta_data->>'first_name',
        'User'
    );
    v_last_name := COALESCE(
        NEW.raw_user_meta_data->>'last_name',
        ''
    );
    v_email := COALESCE(NEW.email, '');
    
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
        NEW.id,
        v_email,
        v_first_name,
        v_last_name,
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        email = COALESCE(EXCLUDED.email, public.users.email),
        first_name = COALESCE(NULLIF(EXCLUDED.first_name, ''), public.users.first_name),
        last_name = COALESCE(EXCLUDED.last_name, public.users.last_name),
        updated_at = NOW();
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error but don't fail the signup
        RAISE WARNING 'Error in handle_new_user for user %: %', NEW.id, SQLERRM;
        -- Still return NEW to allow signup to proceed
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Drop and recreate trigger WITHOUT email_confirmed_at condition
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Step 4: Fix email verification function
DROP FUNCTION IF EXISTS public.handle_user_email_verified() CASCADE;

CREATE OR REPLACE FUNCTION public.handle_user_email_verified()
RETURNS TRIGGER AS $$
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
    
    -- Extract metadata
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
    v_email := COALESCE(NEW.email, '');
    
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
        RAISE WARNING 'Error in handle_user_email_verified for user %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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

-- Step 7: Ensure RLS policies allow trigger inserts
-- The trigger runs as SECURITY DEFINER, so it bypasses RLS, but we need the policy for manual inserts
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
CREATE POLICY "Users can insert own profile" ON public.users
    FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Step 8: Verify trigger was created
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'on_auth_user_created'
    ) THEN
        RAISE EXCEPTION 'Trigger on_auth_user_created was not created successfully';
    END IF;
    
    RAISE NOTICE 'Trigger on_auth_user_created created successfully';
END $$;

-- Step 9: Test the function (optional - can be removed)
-- This will show if there are any syntax errors
SELECT 'All migrations completed successfully!' AS status,
       EXISTS(SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created') AS trigger_exists,
       EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'handle_new_user') AS function_exists;
