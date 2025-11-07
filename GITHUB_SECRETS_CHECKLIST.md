# GitHub Secrets Checklist

## Required Secrets for Deployment

### AWS Secrets (All workflows)
- ✅ `AWS_ACCESS_KEY_ID` - AWS access key
- ✅ `AWS_SECRET_ACCESS_KEY` - AWS secret key

### Frontend Secrets
- ✅ `VITE_API_URL` - Backend API URL
- ✅ `VITE_SUPABASE_URL` - Supabase project URL
- ✅ `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key
- ✅ `CLOUDFRONT_DISTRIBUTION_ID` - CloudFront distribution ID (optional)

### Backend Secrets (if needed in workflows)
- ⚠️ `SUPABASE_URL` - May be needed for backend builds
- ⚠️ `SUPABASE_SERVICE_ROLE_KEY` - May be needed for backend builds

## How to Check Secrets

1. Go to GitHub repository
2. Settings → Secrets and variables → Actions
3. Verify all secrets listed above are present

## Common Issues

1. **Missing VITE_SUPABASE_URL** - Frontend build will fail
2. **Missing VITE_SUPABASE_ANON_KEY** - Frontend build will fail
3. **Missing CLOUDFRONT_DISTRIBUTION_ID** - CloudFront invalidation will be skipped (not critical)

