# Environment Variables Setup

The sign-in and sign-up pages require Supabase environment variables to be configured.

## Required Environment Variables

Create a `.env` file in the `apps/frontend` directory with:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

## How to Get Your Supabase Credentials

1. Go to your Supabase project dashboard: https://app.supabase.com
2. Select your project
3. Go to **Settings** → **API**
4. Copy the **Project URL** → This is your `VITE_SUPABASE_URL`
5. Copy the **anon/public** key → This is your `VITE_SUPABASE_ANON_KEY`

## After Setting Environment Variables

1. **Restart your dev server** - Vite requires a restart to load `.env` changes
2. Clear browser cache if needed
3. The sign-in/sign-up pages should now work without errors

## Error Messages

- **"Authentication service is not configured"** - Environment variables are missing
- **"Authentication service is not available"** - Supabase client failed to initialize
- **"Cannot read properties of null (reading 'auth')"** - Supabase client is not properly initialized (should be fixed with latest changes)

## Verification

Check the browser console for:
- ✅ `Supabase client initialized successfully` - Good!
- ❌ `Using dummy client - authentication will not work!` - Environment variables not set

