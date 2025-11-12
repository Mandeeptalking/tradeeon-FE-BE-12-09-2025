# URGENT: Fix Supabase Redirect URL

## Problem
Email confirmation links are using `redirect_to=http://localhost:3000` instead of production URL.

## Root Cause
Supabase **Site URL** is set to `http://localhost:3000` in the dashboard.

## IMMEDIATE FIX (Required)

### Step 1: Update Supabase Site URL

1. Go to: https://supabase.com/dashboard/project/mgjlnmlhwuqspctanaik
2. Navigate to: **Authentication → URL Configuration**
3. Find **Site URL** field
4. Change from: `http://localhost:3000`
5. Change to: `https://www.tradeeon.com`
6. Click **Save**

### Step 2: Add Redirect URLs

In the same **URL Configuration** page:

1. Under **Redirect URLs**, add these URLs (one per line):
   ```
   https://www.tradeeon.com/auth/callback
   https://tradeeon.com/auth/callback
   http://localhost:5173/auth/callback
   http://localhost:3000/auth/callback
   ```

2. Click **Save**

### Step 3: Enable Email Confirmation

1. Go to: **Authentication → Providers → Email**
2. Enable **"Confirm Email"** toggle
3. Save changes

## Verification

After updating:

1. Sign up a new user
2. Check the confirmation email
3. The link should now show:
   ```
   redirect_to=https://www.tradeeon.com/auth/callback
   ```
   Instead of:
   ```
   redirect_to=http://localhost:3000
   ```

## Code Changes Made

- Updated `Signup.tsx` to use production URL for `emailRedirectTo`
- Falls back to `window.location.origin` only when on localhost
- Uses `VITE_PRODUCTION_URL` env var if set, otherwise defaults to `https://www.tradeeon.com`

## Important Notes

- **Existing confirmation links** (already sent) will still use `localhost:3000`
- **New signups** after the fix will use the correct production URL
- Users with old links need to request a new confirmation email or sign up again

