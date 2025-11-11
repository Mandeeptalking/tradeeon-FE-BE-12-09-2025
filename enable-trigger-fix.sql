-- ENABLE TRIGGER: Fix disabled trigger
-- The trigger exists but is DISABLED - this is why profiles aren't being created
-- Note: We can't use ALTER TABLE ENABLE TRIGGER on auth.users (permission issue)
-- Solution: Drop and recreate the trigger (it will be enabled by default)

-- Step 1: Drop the existing disabled trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Step 2: Recreate the trigger (it will be enabled by default)
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Step 3: Verify function exists (must exist before creating trigger)
SELECT 
    proname AS function_name,
    CASE 
        WHEN proname = 'handle_new_user' THEN 'Exists ✅'
        ELSE 'Missing ❌'
    END AS status
FROM pg_proc
WHERE proname = 'handle_new_user';

-- Step 4: Verify trigger is now enabled
SELECT 
    tgname AS trigger_name,
    tgenabled AS enabled_code,
    CASE 
        WHEN tgenabled = 'O' THEN 'Enabled ✅'
        WHEN tgenabled = 'D' THEN 'Disabled ❌'
        WHEN tgenabled = 'R' THEN 'Replica'
        WHEN tgenabled = 'A' THEN 'Always'
        ELSE 'Unknown'
    END AS status,
    pg_get_triggerdef(oid) AS trigger_definition
FROM pg_trigger
WHERE tgname = 'on_auth_user_created';

-- Step 5: Backfill any existing users who don't have profiles
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

-- Step 6: Final verification
SELECT 
    'Trigger Enabled!' AS status,
    (SELECT COUNT(*) FROM pg_trigger WHERE tgname = 'on_auth_user_created' AND tgenabled = 'O') AS trigger_enabled,
    (SELECT COUNT(*) FROM auth.users) AS auth_users,
    (SELECT COUNT(*) FROM public.users) AS public_users,
    CASE 
        WHEN (SELECT COUNT(*) FROM auth.users) = (SELECT COUNT(*) FROM public.users) THEN 'All users have profiles ✅'
        ELSE 'Some users missing profiles - backfill completed'
    END AS profile_status;

