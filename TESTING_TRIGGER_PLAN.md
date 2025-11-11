# 🔍 TESTING PLAN: Verify Trigger Works

## Current Situation
- You deleted the user before running the query (that's why it showed 0)
- The real issue: **When a NEW user signs up, the trigger should create a profile automatically**
- But it's not working, which is why you got the foreign key error

## Testing Steps

### Step 1: Verify Trigger is Set Up
Run this query in Supabase SQL Editor:
```sql
SELECT 
    tgname AS trigger_name,
    tgenabled AS enabled
FROM pg_trigger
WHERE tgname = 'on_auth_user_created';
```
**Expected:** Should show `enabled = 'O'` (enabled)

### Step 2: Create a NEW User
1. Go to your frontend: https://www.tradeeon.com/signup
2. Sign up with a NEW email address
3. Verify email (if required)
4. Sign in

### Step 3: Check if Profile Was Created
Run `test-trigger-after-signup.sql` in Supabase SQL Editor

**What to look for:**
- `auth_users` count should be > 0
- `public_users` count should match `auth_users` ✅
- If they don't match → trigger didn't fire ❌

### Step 4: If Trigger Didn't Work
Run `backfill-all-users.sql` to create the profile manually

Then check:
- Does the profile exist now?
- Can you save a connection?

### Step 5: Fix Trigger (if needed)
If trigger is disabled or missing, run `fix-user-profile-trigger.sql` again

## Expected Behavior

✅ **CORRECT:** 
- User signs up → Profile created automatically → Can save connection

❌ **CURRENT ISSUE:**
- User signs up → Profile NOT created → Foreign key error when saving connection

## Quick Fix

If trigger isn't working, you can manually create profiles for all users:
```sql
-- Run backfill-all-users.sql
```

This will create profiles for ALL users in `auth.users` who don't have profiles.

