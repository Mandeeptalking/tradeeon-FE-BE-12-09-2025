# Check CloudWatch Logs - Step by Step

## Quick Access

**Direct Link:**
https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#logsV2:log-groups/log-group/$252Fecs$252Ftradeeon-backend

---

## Step-by-Step

### Step 1: Navigate to CloudWatch

1. Go to: https://console.aws.amazon.com/cloudwatch/home?region=us-east-1
2. Click "Log groups" in left menu

### Step 2: Find Log Group

1. Look for: `/ecs/tradeeon-backend`
2. Click on it

### Step 3: View Log Streams

1. You'll see a list of log streams (one per task)
2. Click on the **most recent** log stream (sorted by "Last event time")

### Step 4: Check Logs

Look for these key things:

#### ✅ Good Signs:
- `Application startup complete`
- `Uvicorn running on http://0.0.0.0:8000`
- `Started server process`
- `Waiting for application startup`

#### ❌ Bad Signs (Errors):
- `ModuleNotFoundError`
- `ImportError`
- `Port already in use`
- `Connection refused`
- `Database connection failed`
- `Timeout`
- `Traceback` (Python error)

---

## What to Look For

### Common Errors:

1. **Import Errors:**
   ```
   ModuleNotFoundError: No module named 'xyz'
   ```
   **Fix:** Missing dependency or import path issue

2. **Port Issues:**
   ```
   Address already in use
   ```
   **Fix:** Port conflict

3. **Database Errors:**
   ```
   Connection refused
   Failed to connect to database
   ```
   **Fix:** Supabase connection issue

4. **Environment Variables:**
   ```
   KeyError: 'SUPABASE_URL'
   ```
   **Fix:** Missing environment variable

5. **Application Crash:**
   ```
   Traceback (most recent call last):
   ...
   ```
   **Fix:** Check the full error message

---

## After Checking Logs

**Share:**
1. Do you see any ERROR messages?
2. What does the last log entry say?
3. Is the application starting successfully?
4. Any traceback or exception?

This will help identify the exact issue!

---

**Quick Link:** https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#logsV2:log-groups/log-group/$252Fecs$252Ftradeeon-backend

