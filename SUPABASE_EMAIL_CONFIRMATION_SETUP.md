# Supabase Email Confirmation Setup Guide

## Issue
Email confirmation links are redirecting to `localhost:3000` instead of production URL `https://www.tradeeon.com`, causing verification failures.

## Solution

### 1. Update Supabase Redirect URLs

Go to your Supabase Dashboard:
1. Navigate to: **Authentication → URL Configuration**
2. Under **Redirect URLs**, add:
   - `https://www.tradeeon.com/auth/callback`
   - `https://tradeeon.com/auth/callback` (if you support non-www)
   - `http://localhost:5173/auth/callback` (for local development)
   - `http://localhost:3000/auth/callback` (for local development)

3. Under **Site URL**, set:
   - `https://www.tradeeon.com`

### 2. Enable Email Confirmation

1. Go to: **Authentication → Providers → Email**
2. Enable **"Confirm Email"** toggle
3. This ensures users must verify email before accessing the app

### 3. Email Templates (Optional)

You can customize the email template:
1. Go to: **Authentication → Email Templates**
2. Select **"Confirm signup"** template
3. Customize the message and redirect URL

The redirect URL in the template should be:
```
{{ .SiteURL }}/auth/callback
```

### 4. Verify Settings

After updating:
1. Test signup flow
2. Check email for confirmation link
3. Click link - should redirect to `https://www.tradeeon.com/auth/callback`
4. Email should be verified in Supabase dashboard

## Code Changes Made

1. **Signup.tsx**: Added `emailRedirectTo` option to signup call
2. **AuthCallback.tsx**: New page to handle email confirmation callback
3. **App.tsx**: Added route for `/auth/callback`

## Testing

1. Sign up a new user
2. Check email inbox
3. Click confirmation link
4. Should redirect to `https://www.tradeeon.com/auth/callback`
5. Should see "Email Verified!" message
6. Should auto-redirect to `/app` dashboard
7. Check Supabase dashboard - user's `email_confirmed_at` should be set

