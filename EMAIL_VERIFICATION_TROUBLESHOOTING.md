# Fix Email Confirmation Redirect Issue

## Problem
1. Confirmation link redirects to `https://www.tradeeon.com/` instead of `/auth/callback`
2. Error appears: `server_error&error_code=unexpected_failure&error_description=Error+confirming+user`
3. Email is not being verified

## Root Causes

### Issue 1: Redirect URL Not Set Correctly
Supabase is using the **Site URL** (`https://www.tradeeon.com`) as the redirect URL instead of the `emailRedirectTo` parameter.

### Issue 2: Supabase Configuration
The `emailRedirectTo` parameter might be ignored if:
- The URL is not in the allowed Redirect URLs list
- Supabase falls back to Site URL when `emailRedirectTo` doesn't match

## Solutions Applied

### 1. Code Changes
- **App.tsx**: Added error handling to catch hash fragments with errors on root path and redirect to `/auth/callback`
- **AuthCallback.tsx**: Improved session handling with retry logic and better error messages

### 2. Supabase Configuration (REQUIRED)

#### Update Site URL
1. Go to: **Authentication → URL Configuration**
2. **Site URL** should be: `https://www.tradeeon.com` ✅ (already correct)

#### Verify Redirect URLs
Make sure these are in the **Redirect URLs** list:
- `https://www.tradeeon.com/auth/callback` ✅
- `https://tradeeon.com/auth/callback` ✅
- `http://localhost:5173/auth/callback` ✅
- `http://localhost:3000/auth/callback` ✅

#### Check Email Template
1. Go to: **Authentication → Email Templates**
2. Select **"Confirm signup"** template
3. Check the redirect URL in the template
4. It should use: `{{ .SiteURL }}/auth/callback`
5. Or hardcode: `https://www.tradeeon.com/auth/callback`

## Why Redirect Goes to Root

Supabase uses the **Site URL** as the default redirect when:
1. `emailRedirectTo` is not provided
2. `emailRedirectTo` doesn't match any allowed Redirect URL
3. Email template uses `{{ .SiteURL }}` without `/auth/callback`

## Testing

After fixes:
1. Sign up a new user
2. Check confirmation email
3. Link should redirect to: `https://www.tradeeon.com/auth/callback#access_token=...`
4. Should see "Email Verified!" message
5. Should redirect to `/app` dashboard
6. Check Supabase dashboard - `email_confirmed_at` should be set

## If Still Not Working

1. **Check Supabase Logs**: Go to **Logs → Auth Logs** to see what's happening
2. **Verify Email Template**: Make sure it includes `/auth/callback` in redirect URL
3. **Test with Direct URL**: Try manually constructing the verification URL with `/auth/callback`
4. **Check Database**: Verify user exists and check `email_confirmed_at` field

