# URGENT: Fix "Database error saving new user"

## Error
```
Status: 500 Internal Server Error
Message: "Database error saving new user"
```

## Root Cause
The database trigger `handle_new_user()` is failing when Supabase tries to create a user profile. This happens because:
1. Trigger might not exist or has wrong condition
2. `first_name`/`last_name` columns might be missing or have constraints
3. RLS policies might be blocking the insert
4. Trigger function has an error

## IMMEDIATE FIX

### Step 1: Open Supabase SQL Editor
Go to: https://supabase.com/dashboard/project/mgjlnmlhwuqspctanaik/sql

### Step 2: Copy SQL Fix
Open the file `fix-user-profile-trigger.sql` in your project root and copy **ALL** the SQL content.

### Step 3: Run SQL
1. Paste the SQL into Supabase SQL Editor
2. Click **RUN** button
3. Wait for completion
4. Check for success message: "All migrations completed successfully!"

### Step 4: Verify
After running, verify:
- Trigger exists: `on_auth_user_created`
- Function exists: `handle_new_user`
- Columns exist: `first_name`, `last_name` in `public.users` table

### Step 5: Test
1. Try signing up again
2. Should work without "Database error"
3. User profile should be created automatically

## What the SQL Fix Does

1. **Ensures columns exist**: Adds `first_name` and `last_name` if missing
2. **Sets defaults**: Ensures columns have default values
3. **Fixes trigger**: Removes `WHEN` condition so it fires on all signups
4. **Error handling**: Adds exception handling so trigger doesn't fail signup
5. **Permissions**: Sets proper grants for triggers
6. **Verification**: Confirms trigger was created

## If Still Failing

Check Supabase logs:
1. Go to: **Logs → Postgres Logs**
2. Look for errors related to `handle_new_user` or `on_auth_user_created`
3. Check for constraint violations or permission errors

## Code Already Fixed
- Frontend code no longer tries to manually insert user profile
- Database trigger handles everything automatically
- Just need to run the SQL fix in Supabase

