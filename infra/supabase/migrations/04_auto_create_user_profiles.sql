-- Migration: Auto-create user profiles and fix schema
-- This should be run in Supabase SQL Editor

-- Step 1: Check current schema and update if needed
-- First, let's see what columns exist
DO $$
BEGIN
    -- Check if first_name column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'first_name'
    ) THEN
        -- Add first_name and last_name columns if they don't exist
        ALTER TABLE public.users 
        ADD COLUMN IF NOT EXISTS first_name TEXT,
        ADD COLUMN IF NOT EXISTS last_name TEXT;
        
        -- Migrate existing full_name data to first_name/last_name
        UPDATE public.users 
        SET first_name = SPLIT_PART(full_name, ' ', 1),
            last_name = CASE 
                WHEN POSITION(' ' IN full_name) > 0 
                THEN SUBSTRING(full_name FROM POSITION(' ' IN full_name) + 1)
                ELSE ''
            END
        WHERE full_name IS NOT NULL AND first_name IS NULL;
        
        -- Make first_name NOT NULL (with default for existing rows)
        ALTER TABLE public.users 
        ALTER COLUMN first_name SET DEFAULT 'User',
        ALTER COLUMN first_name SET NOT NULL;
        
        -- Make last_name NOT NULL (with default for existing rows)
        ALTER TABLE public.users 
        ALTER COLUMN last_name SET DEFAULT '',
        ALTER COLUMN last_name SET NOT NULL;
    END IF;
END $$;

-- Step 2: Create function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
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
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'first_name', 'User'),
        COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        first_name = COALESCE(EXCLUDED.first_name, public.users.first_name),
        last_name = COALESCE(EXCLUDED.last_name, public.users.last_name),
        updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Create trigger to auto-create user profile when user signs up
-- IMPORTANT: Fire on INSERT regardless of email_confirmed_at
-- This ensures user profile exists even before email verification
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Step 4: Create function to update user profile when email is verified
CREATE OR REPLACE FUNCTION public.handle_user_email_verified()
RETURNS TRIGGER AS $$
BEGIN
    -- Update or insert user profile when email is verified
    -- Use ON CONFLICT to handle case where profile already exists
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
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'first_name', 'User'),
        COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
        COALESCE((SELECT created_at FROM public.users WHERE id = NEW.id), NOW()),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        first_name = COALESCE(EXCLUDED.first_name, public.users.first_name),
        last_name = COALESCE(EXCLUDED.last_name, public.users.last_name),
        updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 5: Create trigger for email verification
DROP TRIGGER IF EXISTS on_auth_user_email_verified ON auth.users;
CREATE TRIGGER on_auth_user_email_verified
    AFTER UPDATE OF email_confirmed_at ON auth.users
    FOR EACH ROW
    WHEN (NEW.email_confirmed_at IS NOT NULL AND (OLD.email_confirmed_at IS NULL OR OLD.email_confirmed_at IS DISTINCT FROM NEW.email_confirmed_at))
    EXECUTE FUNCTION public.handle_user_email_verified();

-- Step 6: Grant necessary permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON public.users TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE ON public.users TO authenticated;

-- Step 7: Add RLS policy to allow users to insert their own profile (for signup flow)
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
CREATE POLICY "Users can insert own profile" ON public.users
    FOR INSERT
    WITH CHECK (auth.uid() = id);

