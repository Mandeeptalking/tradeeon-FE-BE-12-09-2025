# Bot Creation Diagnostic Guide

## Technical Flow

### 1. Frontend Flow
```
User clicks "Start bot" 
  → Summary modal appears
  → User clicks "Create & Start Bot"
  → Frontend gets auth token from Supabase session
  → Frontend sends POST /bots/dca-bots with:
     - Authorization: Bearer <token>
     - Body: bot configuration JSON
```

### 2. Backend Flow
```
Request arrives at FastAPI
  → CORS middleware processes
  → Rate limiting middleware processes
  → Router: /bots/dca-bots (POST)
  → Dependency: get_current_user() extracts user_id from JWT
  → create_dca_bot() function:
     1. Validates JWT token
     2. Extracts user_id from token
     3. Prepares bot configuration
     4. Registers conditions (if any)
     5. **CRITICAL**: Saves bot to database
     6. Creates alerts (if conditions exist)
     7. Returns bot_id
```

### 3. Database Flow
```
db_service.create_bot() called
  → Checks if user exists in public.users table
  → If not, attempts to create user profile
  → Inserts bot into bots table with:
     - bot_id: "dca_bot_<timestamp>"
     - user_id: <UUID from JWT>
     - status: "inactive"
     - config: <JSON configuration>
```

## Critical Issues Identified

### Issue 1: Foreign Key Constraint
**Problem**: The `bots` table has a foreign key constraint:
```sql
user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL
```

**Impact**: Bot creation will fail if:
- User doesn't exist in `public.users` table
- User_id format is incorrect (must be valid UUID)

**Fix Applied**: Added user profile check/creation before bot insert

### Issue 2: User Profile Creation
**Problem**: User must exist in `public.users` table, which may not be auto-created

**Possible Causes**:
1. Database trigger not set up to auto-create user profiles
2. User signed up but profile wasn't created
3. RLS policies blocking profile creation

**Fix Applied**: Added fallback to create user profile if missing

### Issue 3: Authentication Token
**Problem**: JWT token must be valid and contain user_id in "sub" field

**Check**:
- Is `SUPABASE_JWT_SECRET` environment variable set?
- Is the token being sent correctly from frontend?
- Is the token expired?

### Issue 4: Database Service Availability
**Problem**: `db_service` might not be enabled or Supabase client not configured

**Check**:
- Is `SUPABASE_URL` environment variable set?
- Is `SUPABASE_SERVICE_ROLE_KEY` environment variable set?
- Is `db_service.enabled == True`?

## Diagnostic Steps

### Step 1: Check Backend Logs
Look for these log messages:
- `"JWT validation successful for user_id: <uuid>"`
- `"User <uuid> not found in users table, attempting to create profile..."`
- `"✅ Created user profile for <uuid>"`
- `"✅ Bot <bot_id> saved to database successfully"`
- `"❌ Failed to save bot <bot_id> to database: <error>"`

### Step 2: Check Database
```sql
-- Check if user exists
SELECT id, email FROM public.users WHERE id = '<user_id_from_jwt>';

-- Check if bot was created
SELECT bot_id, user_id, name, status FROM public.bots WHERE user_id = '<user_id_from_jwt>';

-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'bots';
```

### Step 3: Check Environment Variables
```bash
# Backend must have:
SUPABASE_URL=<your-supabase-url>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
SUPABASE_JWT_SECRET=<your-jwt-secret>
```

### Step 4: Test Authentication
```bash
# Test if auth is working
curl -X POST http://localhost:8000/bots/dca-bots \
  -H "Authorization: Bearer <your-token>" \
  -H "Content-Type: application/json" \
  -d '{"botName": "Test Bot", ...}'
```

## Common Error Scenarios

### Error 1: "Missing token"
**Cause**: Authorization header not sent or invalid format
**Fix**: Ensure frontend sends `Authorization: Bearer <token>`

### Error 2: "Token expired"
**Cause**: JWT token has expired
**Fix**: User needs to sign in again to get fresh token

### Error 3: "Invalid token: Signature verification failed"
**Cause**: `SUPABASE_JWT_SECRET` doesn't match Supabase project
**Fix**: Update `SUPABASE_JWT_SECRET` environment variable

### Error 4: "Foreign key constraint violation"
**Cause**: User doesn't exist in `public.users` table
**Fix**: User profile creation code should handle this, but check if:
- User exists in `auth.users` (Supabase auth)
- Database trigger is set up to auto-create profiles
- RLS policies allow profile creation

### Error 5: "Database service not available"
**Cause**: Supabase client not configured
**Fix**: Check environment variables and Supabase client initialization

### Error 6: "Failed to save bot to database"
**Cause**: Various database errors
**Fix**: Check detailed error logs for specific issue

## Enhanced Error Logging

The updated `db_service.create_bot()` now logs:
- User ID and type
- Error type and message
- Error details (if available)
- Full exception traceback

This will help identify the exact issue when bot creation fails.

## Next Steps

1. **Check backend logs** when attempting to create a bot
2. **Verify user exists** in `public.users` table
3. **Check environment variables** are set correctly
4. **Test authentication** separately
5. **Review error messages** in logs for specific failure point

## Testing Checklist

- [ ] User is authenticated (has valid JWT token)
- [ ] User exists in `auth.users` (Supabase auth)
- [ ] User exists in `public.users` (or can be created)
- [ ] `SUPABASE_URL` is set
- [ ] `SUPABASE_SERVICE_ROLE_KEY` is set
- [ ] `SUPABASE_JWT_SECRET` is set
- [ ] Database service is enabled
- [ ] RLS policies allow bot creation
- [ ] Foreign key constraints are satisfied

