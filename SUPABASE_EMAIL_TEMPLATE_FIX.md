# Fix Supabase Email Template for Email Confirmation

## Current Template
```html
<h2>Confirm your signup</h2>
<p>Follow this link to confirm your user:</p>
<p><a href="{{ .ConfirmationURL }}">Confirm your mail</a></p>
```

## Problem
`{{ .ConfirmationURL }}` redirects to `https://www.tradeeon.com/` instead of `https://www.tradeeon.com/auth/callback`

## Solution: Update Email Template

### Option 1: Use Site URL + Token (Recommended)

Replace the template with:

```html
<h2>Confirm your signup</h2>
<p>Follow this link to confirm your user:</p>
<p><a href="{{ .SiteURL }}/auth/callback?token={{ .Token }}&type=signup&redirect_to={{ .SiteURL }}/auth/callback">Confirm your mail</a></p>
```

**Available Variables:**
- `{{ .SiteURL }}` - Your site URL (https://www.tradeeon.com)
- `{{ .Token }}` - The confirmation token
- `{{ .TokenHash }}` - Hashed token (alternative)
- `{{ .Email }}` - User's email address
- `{{ .RedirectTo }}` - Redirect URL (if set)

### Option 2: Use ConfirmationURL with Manual Redirect

```html
<h2>Confirm your signup</h2>
<p>Follow this link to confirm your user:</p>
<p><a href="{{ .ConfirmationURL }}&redirect_to={{ .SiteURL }}/auth/callback">Confirm your mail</a></p>
```

**Note:** This might not work if Supabase doesn't allow appending parameters.

### Option 3: Full Custom URL Construction

```html
<h2>Confirm your signup</h2>
<p>Follow this link to confirm your user:</p>
<p><a href="https://mgjlnmlhwuqspctanaik.supabase.co/auth/v1/verify?token={{ .Token }}&type=signup&redirect_to=https://www.tradeeon.com/auth/callback">Confirm your mail</a></p>
```

## Steps to Update

1. Go to Supabase Dashboard
2. Navigate to: **Authentication → Email Templates**
3. Select **"Confirm signup"** template
4. Replace the `<a>` tag with one of the options above
5. Click **Save**

## Recommended Template (CORRECT - Use This)

**IMPORTANT:** Supabase uses `{{ .TokenHash }}` (not `{{ .Token }}`) and requires the full verify URL:

```html
<h2>Confirm your signup</h2>
<p>Follow this link to confirm your user:</p>
<p><a href="https://mgjlnmlhwuqspctanaik.supabase.co/auth/v1/verify?token_hash={{ .TokenHash }}&type=signup&redirect_to=https://www.tradeeon.com/auth/callback">Confirm your mail</a></p>
```

**Key Points:**
- Use `{{ .TokenHash }}` (Supabase's variable name)
- Use full Supabase verify URL: `https://mgjlnmlhwuqspctanaik.supabase.co/auth/v1/verify`
- Add `redirect_to=https://www.tradeeon.com/auth/callback` parameter
- This ensures users are redirected to `/auth/callback` after verification

## Verification

After updating:
1. Sign up a new user
2. Check the confirmation email
3. The link should be: `https://mgjlnmlhwuqspctanaik.supabase.co/auth/v1/verify?token=...&type=signup&redirect_to=https://www.tradeeon.com/auth/callback`
4. Clicking should redirect to `/auth/callback` page
5. Email should be verified successfully

