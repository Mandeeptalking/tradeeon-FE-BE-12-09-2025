# Why Can't I See Logs When Clicking "View Logs" on Bot?

## 🔍 Quick Diagnosis

Based on my analysis of your codebase, here are the **most likely reasons** why logs aren't showing:

---

## Issue 1: No Events Have Been Logged Yet ⭐ **MOST COMMON**

**Symptom:**
- Page loads successfully
- Shows "No events found" message
- API returns empty array: `{ "success": true, "events": [], "total": 0 }`

**Why this happens:**
- Bot hasn't been started yet
- Bot was started but hasn't executed any actions yet
- Events are only logged when bot:
  - Initializes (bot_initialized)
  - Executes DCA orders (dca_triggered, order_executed)
  - Checks conditions (entry_condition_evaluated)
  - Triggers profit targets (profit_target_reached)

**Solution:**
1. Start the bot if it's not running
2. Wait a few minutes for bot to execute at least one cycle
3. Refresh the logs page

---

## Issue 2: `bot_events` Table Doesn't Exist

**Symptom:**
- API returns error: `Could not find the table 'public.bot_events'`
- Backend logs show: `ERROR:db_service:Failed to log event`
- Database error when querying events

**Solution:**
1. Go to Supabase Dashboard → SQL Editor
2. Run the migration:
   ```sql
   -- Copy contents from infra/supabase/migrations/003_bot_events.sql
   ```
3. Or run directly:
   ```sql
   CREATE TABLE IF NOT EXISTS public.bot_events (
       event_id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
       bot_id TEXT REFERENCES public.bots(bot_id) ON DELETE CASCADE NOT NULL,
       run_id UUID REFERENCES public.bot_runs(run_id) ON DELETE CASCADE,
       user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
       event_type TEXT NOT NULL,
       event_category TEXT NOT NULL,
       symbol TEXT,
       message TEXT NOT NULL,
       details JSONB DEFAULT '{}'::jsonb,
       created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );
   
   CREATE INDEX IF NOT EXISTS idx_bot_events_bot_id ON public.bot_events(bot_id);
   CREATE INDEX IF NOT EXISTS idx_bot_events_user_id ON public.bot_events(user_id);
   CREATE INDEX IF NOT EXISTS idx_bot_events_created_at ON public.bot_events(created_at DESC);
   
   ALTER TABLE public.bot_events ENABLE ROW LEVEL SECURITY;
   
   CREATE POLICY "bot_events_owner_r"
   ON public.bot_events
   FOR SELECT
   USING (auth.uid() = user_id);
   
   CREATE POLICY "bot_events_service_insert"
   ON public.bot_events
   FOR INSERT
   WITH CHECK (true);
   ```
4. Verify table exists:
   ```sql
   SELECT COUNT(*) FROM public.bot_events;
   ```

---

## Issue 3: API Endpoint Errors

**Symptom:**
- Network request fails
- Status code is not 200 (401, 403, 500, etc.)
- Browser console shows errors

**Check in Browser DevTools (F12):**
1. Go to **Network** tab
2. Click "View Logs" on a bot
3. Look for request to: `/bots/dca-bots/{botId}/events`
4. Check:
   - Status code (should be 200)
   - Response body (should have `events` array)

**Common errors:**

### 401 Unauthorized
- **Cause:** User not authenticated or token expired
- **Fix:** Log out and log back in

### 404 Not Found
- **Cause:** Bot doesn't exist or URL is wrong
- **Fix:** Verify botId is correct

### 500 Server Error
- **Cause:** Backend error, check backend logs
- **Fix:** Check backend logs on Lightsail:
  ```bash
  sudo docker logs tradeeon-backend --tail 100 | grep -i error
  ```

---

## Issue 4: RLS (Row Level Security) Blocking Access

**Symptom:**
- Table exists but returns empty results
- Events exist in database but user can't see them
- API returns success but empty array

**Solution:**
1. Verify RLS policy exists:
   ```sql
   SELECT * FROM pg_policies 
   WHERE tablename = 'bot_events';
   ```
2. Check if events belong to current user:
   ```sql
   -- In Supabase SQL Editor (as service role)
   SELECT be.*, u.email 
   FROM bot_events be
   JOIN users u ON be.user_id = u.id
   WHERE be.bot_id = 'your-bot-id'
   ORDER BY be.created_at DESC
   LIMIT 10;
   ```
3. Verify user_id matches:
   - Events must have `user_id` matching authenticated user
   - Check JWT token contains correct user_id

---

## Issue 5: Frontend Not Parsing Response Correctly

**Symptom:**
- API returns data but frontend shows "No events found"
- Console shows data but UI doesn't update

**Check:**
1. Open Browser DevTools → Console
2. Look for logs like:
   ```
   🔍 Fetching events for bot: dca_bot_123...
   📡 Events API response: { status: 200, ok: true }
   📦 Events data received: { eventsCount: 5, ... }
   ```
3. If you see warnings about `data.events` being undefined:
   - API might be returning different format
   - Check response structure matches expected format

**Expected API Response:**
```json
{
  "success": true,
  "events": [
    {
      "event_id": "uuid",
      "event_type": "bot_initialized",
      "event_category": "system",
      "message": "...",
      "details": {},
      "created_at": "2025-01-12T10:30:00Z"
    }
  ],
  "total": 1,
  "limit": 100,
  "offset": 0
}
```

---

## Issue 6: Navigation Not Working

**Symptom:**
- Clicking "View Logs" doesn't navigate
- URL doesn't change
- Page doesn't load

**Check:**
1. Verify route is defined in `App.tsx`:
   ```tsx
   <Route path="bots/:botId/logs" element={<BotLogsPage />} />
   ```
2. Check navigation in `BotsPage.tsx`:
   ```tsx
   const handleView = (botId: string) => {
     navigate(`/app/bots/${botId}/logs`);
   };
   ```
3. Verify `BotCard` calls `onView`:
   ```tsx
   <Button onClick={() => onView(bot.bot_id)}>
     <Eye className="h-4 w-4" />
   </Button>
   ```

---

## 🔧 Step-by-Step Diagnostic Process

### Step 1: Check if Page Loads
1. Click "View Logs" on a bot
2. Verify URL changes to `/app/bots/{botId}/logs`
3. Check if page shows "Bot Logs" header
4. **If not:** Navigation issue (see Issue 6)

### Step 2: Check Browser Console
1. Open DevTools (F12) → Console tab
2. Click "View Logs" again
3. Look for errors or logs starting with:
   - `🔍 Fetching events for bot:`
   - `📡 Events API response:`
   - `❌ Error fetching events:`
4. **Note any errors**

### Step 3: Check Network Requests
1. Open DevTools → Network tab
2. Click "View Logs"
3. Find request: `GET /bots/dca-bots/{botId}/events`
4. Check:
   - Status code (should be 200)
   - Response tab (should show JSON with `events` array)
5. **If error:** Check status code and error message

### Step 4: Check Database
1. Go to Supabase Dashboard → Table Editor
2. Check if `bot_events` table exists
3. If exists, check if it has data:
   ```sql
   SELECT COUNT(*) FROM bot_events WHERE bot_id = 'your-bot-id';
   ```
4. **If no table:** Run migration (Issue 2)
5. **If empty:** No events logged yet (Issue 1)

### Step 5: Start Bot to Generate Events
1. Go back to Bots page
2. Start the bot (if not running)
3. Wait 1-2 minutes
4. Go back to logs page
5. **If still empty:** Check backend logs for errors

---

## 🧪 Quick Test Script

Run these checks in order:

```bash
# 1. Check if table exists (in Supabase SQL Editor)
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'bot_events';

# 2. Check if bot has any events
SELECT COUNT(*) 
FROM bot_events 
WHERE bot_id = 'your-bot-id-here';

# 3. Check recent events (replace with your bot_id)
SELECT event_type, message, created_at 
FROM bot_events 
WHERE bot_id = 'your-bot-id-here'
ORDER BY created_at DESC 
LIMIT 10;

# 4. Check if events have user_id set
SELECT bot_id, user_id, COUNT(*) as event_count
FROM bot_events
GROUP BY bot_id, user_id;
```

---

## 🎯 Most Likely Fix

**90% of the time**, the issue is:

1. **No events have been logged yet** because:
   - Bot hasn't been started
   - Bot just started and hasn't executed yet
   - Bot is running but hasn't triggered any actions

**Quick Fix:**
1. Start the bot
2. Wait 2-5 minutes for bot to execute
3. Refresh logs page
4. You should see events like:
   - `bot_initialized`
   - `balance_initialized`
   - `entry_condition_evaluated`
   - `dca_triggered` (when orders are placed)

---

## 📋 Checklist

- [ ] Page navigates to `/app/bots/{botId}/logs`
- [ ] Page loads without JavaScript errors
- [ ] Network request to `/events` endpoint returns 200
- [ ] Response contains `events` array (even if empty)
- [ ] `bot_events` table exists in database
- [ ] Bot has been started at least once
- [ ] Bot has executed at least one cycle
- [ ] Events exist in database for this bot
- [ ] User_id matches between events and authenticated user

---

## 🆘 Still Not Working?

If none of the above fixes work:

1. **Check backend logs:**
   ```bash
   sudo docker logs tradeeon-backend --tail 200 | grep -i "event\|error\|bot_events"
   ```

2. **Check browser console for detailed errors**

3. **Verify bot is actually running:**
   - Bot status should be "running"
   - Check bot status page for execution info

4. **Check if events are being logged:**
   - Start bot
   - Monitor backend logs for "Logged event:" messages
   - If you don't see these, events aren't being created

---

## 💡 Pro Tips

1. **Always check browser console first** - it will show exactly what's wrong
2. **Check Network tab** - see the actual API response
3. **Start with an active bot** - bots that have been running will have events
4. **Use Supabase SQL Editor** - directly query the database to see if events exist
5. **Check backend logs** - errors there explain why events aren't being logged

---

## 📞 Next Steps

Based on what you find:
1. **If table missing:** Run migration from `infra/supabase/migrations/003_bot_events.sql`
2. **If no events:** Start bot and wait for execution
3. **If API errors:** Check backend logs and database connection
4. **If RLS blocking:** Verify user_id matches in events table

Let me know what you find and I can help fix the specific issue!

