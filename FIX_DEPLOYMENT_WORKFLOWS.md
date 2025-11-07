# Fix Deployment Workflows

## 🔴 Issues Found

1. **Outdated paths** - Workflows reference `apps/alerts/**` but alerts moved to `apps/api/modules/alerts/`
2. **Missing environment variables** - Frontend build missing Supabase env vars
3. **Incorrect Dockerfile paths** - Some workflows reference wrong Dockerfiles
4. **Missing secrets** - Some workflows need additional secrets

## ✅ Fixes Needed

### 1. Update deploy-alert-runner.yml
- Change `apps/alerts/**` to `apps/api/modules/alerts/**`
- Update Dockerfile path if needed

### 2. Update deploy-all.yml
- Fix alert-runner path filter
- Add missing environment variables

### 3. Update deploy-frontend.yml
- Already has Supabase env vars ✅
- Verify all secrets are set

### 4. Check all workflows for:
- Correct file paths
- Required secrets
- Docker build contexts

