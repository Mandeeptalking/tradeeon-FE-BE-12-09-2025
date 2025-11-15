# Supabase Email Configuration Guide

## Issue: Password Reset Emails Not Sending

If password reset emails are not being received, follow these steps:

### 1. Check Supabase Dashboard - Authentication Logs

1. Go to your Supabase project dashboard
2. Navigate to **Authentication** → **Logs**
3. Look for password reset attempts and check for any errors
4. Common errors you might see:
   - SMTP configuration errors
   - Rate limiting errors
   - Email template errors

### 2. Configure Site URL

1. Go to **Authentication** → **URL Configuration**
2. Ensure **Site URL** matches your application URL (e.g., `http://localhost:5173` for dev, or your production URL)
3. Add **Redirect URLs**:
   - `http://localhost:5173/auth/reset-password` (for development)
   - `https://yourdomain.com/auth/reset-password` (for production)

### 3. Configure SMTP (IMPORTANT for Production)

Supabase's default email provider has **strict rate limits** and is meant for development only.

#### Option A: Use Supabase Default (Development Only)
- Works for testing but has limitations
- Rate limited to prevent abuse
- Emails may go to spam

#### Option B: Configure Custom SMTP (Recommended for Production)

1. Go to **Authentication** → **Settings** → **SMTP Settings**
2. Configure your SMTP provider:

**Example SMTP Providers:**

**SendGrid:**
- Host: `smtp.sendgrid.net`
- Port: `587`
- Username: `apikey`
- Password: Your SendGrid API key
- Sender email: Your verified sender email

**Mailgun:**
- Host: `smtp.mailgun.org`
- Port: `587`
- Username: Your Mailgun SMTP username
- Password: Your Mailgun SMTP password
- Sender email: Your verified sender email

**AWS SES:**
- Host: `email-smtp.us-east-1.amazonaws.com` (or your region)
- Port: `587`
- Username: Your AWS SES SMTP username
- Password: Your AWS SES SMTP password
- Sender email: Your verified sender email

**Gmail (for testing only):**
- Host: `smtp.gmail.com`
- Port: `587`
- Username: Your Gmail address
- Password: App-specific password (not your regular password)
- Sender email: Your Gmail address

### 4. Configure Email Templates

1. Go to **Authentication** → **Email Templates**
2. Check the **Reset Password** template
3. Ensure it includes:
   - `{{ .ConfirmationURL }}` - This is the reset link
   - Proper HTML/text formatting
   - Your branding

**Example Reset Password Template:**

**Subject:** Reset Your Password

**Body:**
```
Click the link below to reset your password:

{{ .ConfirmationURL }}

This link will expire in 1 hour.

If you didn't request this, please ignore this email.
```

### 5. Test Email Configuration

1. Use Supabase's **Test Email** feature in the dashboard
2. Or test via your application's forgot password flow
3. Check:
   - Email arrives (check spam folder)
   - Reset link works
   - Link redirects to correct URL

### 6. Common Issues and Solutions

#### Issue: "Email rate limit exceeded"
**Solution:** Configure custom SMTP provider

#### Issue: "SMTP configuration error"
**Solution:** 
- Verify SMTP credentials are correct
- Check SMTP provider allows connections from Supabase IPs
- Ensure sender email is verified with SMTP provider

#### Issue: "Email sent but not received"
**Solution:**
- Check spam/junk folder
- Verify email address is correct
- Check SMTP provider logs
- Verify sender email domain reputation

#### Issue: "Reset link doesn't work"
**Solution:**
- Verify Site URL matches your application URL
- Check Redirect URLs include your reset password route
- Ensure link hasn't expired (default: 1 hour)

### 7. Verify Current Configuration

Run this in your browser console on the forgot password page to check configuration:

```javascript
// Check Supabase client is initialized
console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
console.log('Current origin:', window.location.origin);
console.log('Reset URL:', `${window.location.origin}/auth/reset-password`);
```

### 8. Debug Steps

1. **Check Browser Console:**
   - Open DevTools → Console
   - Look for any errors when submitting forgot password form
   - Check Network tab for failed requests

2. **Check Supabase Logs:**
   - Authentication → Logs
   - Look for password reset events
   - Check for errors or warnings

3. **Test with Different Email:**
   - Try with a different email address
   - Use a known working email (like Gmail)

4. **Verify Environment Variables:**
   - Ensure `VITE_SUPABASE_URL` is correct
   - Ensure `VITE_SUPABASE_ANON_KEY` is correct
   - Restart dev server after changing env vars

### 9. Quick Fix Checklist

- [ ] Site URL configured in Supabase dashboard
- [ ] Redirect URLs include `/auth/reset-password`
- [ ] SMTP configured (for production)
- [ ] Email templates configured
- [ ] Checked spam folder
- [ ] Verified email address is correct
- [ ] Checked Supabase Auth logs
- [ ] Environment variables are set correctly
- [ ] Dev server restarted after env changes

### 10. Still Not Working?

If emails still don't send after following these steps:

1. Check Supabase status page: https://status.supabase.com
2. Review Supabase documentation: https://supabase.com/docs/guides/auth
3. Contact Supabase support with:
   - Your project ID
   - Error messages from logs
   - Steps you've taken
   - Screenshots of configuration

