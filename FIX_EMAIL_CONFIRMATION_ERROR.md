# Fix Email Confirmation "Error confirming user"

## Problem
When clicking email confirmation link, getting error:
- `server_error&error_code=unexpected_failure&error_description=Error+confirming+user`
- Email verification fails
- User profile not created in `public.users` table

## Root Cause

The database trigger `on_auth_user_created` had a condition:
```sql
WHEN (NEW.email_confirmed_at IS NOT NULL)
```

This means:
1. User signs up → `email_confirmed_at` is NULL → Trigger doesn't fire → No profile in `public.users`
2. User clicks confirmation → Supabase tries to UPDATE `email_confirmed_at`
3. The `on_auth_user_email_verified` trigger tries to INSERT into `public.users`
4. But if there's a constraint issue or the INSERT fails, Supabase returns "Error confirming user"

## Solution

### 1. Fix the Trigger (Already Fixed in Code)

The trigger now fires on INSERT regardless of `email_confirmed_at`:

```sql
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();
```

**Removed:** `WHEN (NEW.email_confirmed_at IS NOT NULL)`

### 2. Apply Fix in Supabase

Run this SQL in Supabase SQL Editor:

```sql
-- Drop the old trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create new trigger without email_confirmed_at condition
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Also improve the email verification trigger to preserve created_at
CREATE OR REPLACE FUNCTION public.handle_user_email_verified()
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
```

### 3. Fix Redirect URL Issue

The confirmation link still shows `redirect_to=https://www.tradeeon.com/` instead of `/auth/callback`.

**In Supabase Email Template**, use:
```html
<a href="{{ .ConfirmationURL }}">Confirm your email</a>
```

The `{{ .ConfirmationURL }}` should automatically include the `redirect_to` parameter from `emailRedirectTo` set in signup code.

**Verify:** Make sure `https://www.tradeeon.com/auth/callback` is in your Supabase Redirect URLs list.

## Steps to Fix

1. **Apply SQL Fix** (Run in Supabase SQL Editor):
   - Copy the SQL from section 2 above
   - Run it in Supabase Dashboard → SQL Editor
   - This fixes the trigger issue

2. **Verify Redirect URLs**:
   - Go to Authentication → URL Configuration
   - Ensure `https://www.tradeeon.com/auth/callback` is in Redirect URLs

3. **Test**:
   - Sign up a new user
   - Check email confirmation link
   - Click link → Should redirect to `/auth/callback`
   - Should see "Email Verified!" message
   - Check Supabase → Users table → `email_confirmed_at` should be set

## Why This Fixes It

- **Before**: User profile only created when `email_confirmed_at IS NOT NULL` → Never created on signup
- **After**: User profile created immediately on signup → Email verification just updates it
- **Result**: No constraint violations, email verification succeeds

