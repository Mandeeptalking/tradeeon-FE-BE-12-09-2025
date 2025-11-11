# User Profile Creation Flow Documentation

## Overview
This document explains how user profiles are created and updated in the Tradeeon application.

## Data Flow

### 1. User Signup
**When**: User fills out signup form and submits
**Where**: `apps/frontend/src/pages/Signup.tsx`

**What Happens**:
1. User data is sent to Supabase Auth:
   ```typescript
   supabase.auth.signUp({
     email: formData.email,
     password: formData.password,
     options: {
       data: {
         first_name: formData.firstName,
         last_name: formData.lastName,
         phone: formData.phone || null,
       }
     }
   })
   ```
2. User is created in `auth.users` table (Supabase Auth)
3. Frontend attempts to create profile in `public.users` (fallback)
4. **Database trigger** (`on_auth_user_created`) should auto-create profile

**Data Stored**:
- `auth.users`: User authentication data + metadata (first_name, last_name, phone)
- `public.users`: User profile (id, email, first_name, last_name, created_at, updated_at)

### 2. Email Verification
**When**: User clicks verification link in email
**Where**: Supabase Auth handles this automatically

**What Happens**:
1. Supabase Auth updates `auth.users.email_confirmed_at`
2. **Database trigger** (`on_auth_user_email_verified`) fires
3. Trigger creates/updates profile in `public.users` with:
   - `id` from `auth.users.id`
   - `email` from `auth.users.email`
   - `first_name` from `auth.users.raw_user_meta_data->>'first_name'`
   - `last_name` from `auth.users.raw_user_meta_data->>'last_name'`

**Data Updated**:
- `public.users`: Profile created/updated with verified email and metadata

### 3. User Signs In
**When**: User signs in after verification
**Where**: `apps/frontend/src/pages/SignIn.tsx`

**What Happens**:
1. User authenticates with Supabase Auth
2. JWT token is issued
3. User profile should already exist (created by trigger)
4. If profile doesn't exist, backend fallback creates it

## Database Schema

### `auth.users` (Supabase Auth - managed by Supabase)
- `id` (UUID) - Primary key
- `email` (TEXT)
- `email_confirmed_at` (TIMESTAMP)
- `raw_user_meta_data` (JSONB) - Contains first_name, last_name, phone
- Other auth fields...

### `public.users` (Application - managed by us)
- `id` (UUID) - References `auth.users(id)`, Primary key
- `email` (TEXT, NOT NULL, UNIQUE)
- `first_name` (TEXT, NOT NULL)
- `last_name` (TEXT, NOT NULL)
- `avatar_url` (TEXT, nullable)
- `timezone` (TEXT, default 'UTC')
- `created_at` (TIMESTAMP WITH TIME ZONE)
- `updated_at` (TIMESTAMP WITH TIME ZONE)

## Database Triggers

### Trigger 1: `on_auth_user_created`
**Fires**: When user is inserted/updated in `auth.users` AND email is confirmed
**Action**: Creates profile in `public.users` with data from `auth.users`

### Trigger 2: `on_auth_user_email_verified`
**Fires**: When `email_confirmed_at` is updated (email verification)
**Action**: Creates/updates profile in `public.users` with verified email

## Backend Fallback

**When**: User tries to connect exchange but profile doesn't exist
**Where**: `apps/api/routers/connections.py` → `_ensure_user_profile()`

**What Happens**:
1. Backend checks if profile exists
2. If not, attempts to create with placeholder data
3. This should rarely happen if triggers are working correctly

## Fixes Applied

1. **Database Trigger**: Auto-creates user profiles when email is verified
2. **Schema Alignment**: Updated code to use `first_name`/`last_name` instead of `full_name`
3. **Signup Flow**: Frontend now uses correct column names
4. **Backend Fallback**: Improved error handling and logging

## Next Steps

1. Run migration `04_auto_create_user_profiles.sql` in Supabase SQL Editor
2. Test signup flow - profile should be created automatically
3. Test email verification - profile should be updated automatically
4. Remove placeholder creation logic once triggers are confirmed working

