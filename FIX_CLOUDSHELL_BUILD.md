# Fix Docker Build Permission Error

## Issue
- Error: `lstat apps/apps/alerts: permission denied`
- There's a nested `apps/apps` directory (wrong structure)
- Permission issues with extracted files

## Fix Commands (Run in CloudShell)

### Step 1: Fix permissions and check structure

```bash
# Fix permissions on all files
chmod -R 755 apps/ backend/ shared/
chmod 644 requirements.txt Dockerfile

# Check for nested apps directory
ls -la apps/ | head -20

# If you see apps/apps, that's the problem
find apps/ -type d -name "apps" 2>/dev/null
```

### Step 2: Clean up nested structure (if exists)

If you see `apps/apps`, fix it:

```bash
# Remove nested apps directory
rm -rf apps/apps
```

### Step 3: Verify structure is correct

```bash
# Should show: alerts, api, bots (not apps/apps)
ls -la apps/

# Should show backend structure
ls -la backend/
```

### Step 4: Try Docker build again

```bash
docker build -t tradeeon-backend:latest .
```

---

## Alternative: Re-extract Cleanly

If the above doesn't work, delete and re-extract:

```bash
# Remove everything
rm -rf apps/ backend/ shared/ requirements.txt Dockerfile buildspec.yml

# Re-extract
unzip -o tradeeon-source-final-20251104-143629.zip

# Fix permissions
chmod -R 755 apps/ backend/ shared/
chmod 644 requirements.txt Dockerfile

# Try build again
docker build -t tradeeon-backend:latest .
```


