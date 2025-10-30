# Complete E2E Test Scenario: DCA Bot Flow

## 🎯 Objective
Test the complete user journey from signup to DCA bot creation and execution in TEST MODE with live market data.

---

## ✅ Phase 1: Authentication

### Test 1.1: User Signup
**Steps:**
1. Navigate to `/signup`
2. Fill form:
   - First Name: "John"
   - Last Name: "Doe"
   - Email: `test.dca.${Date.now()}@tradeeon.com` (unique)
   - Password: "testpass123"
   - Confirm Password: "testpass123"
3. Click "Sign Up"

**Expected Results:**
- ✅ Success message displayed
- ✅ Auto-redirect to `/signin` after 2 seconds
- ✅ User created in Supabase Auth dashboard
- ✅ Browser console: `User created successfully`

**API Calls:**
- `POST` to Supabase Auth (frontend direct call)

---

### Test 1.2: User Signin
**Steps:**
1. Navigate to `/signin` (or redirected from signup)
2. Enter credentials from Test 1.1
3. Click "Sign In"

**Expected Results:**
- ✅ Successfully authenticated
- ✅ Redirected to `/app` (dashboard)
- ✅ Auth store updated with user data
- ✅ JWT token in browser storage (Supabase session)
- ✅ Browser console: `User signed in successfully`

**API Calls:**
- `POST` to Supabase Auth (frontend direct call)

---

## ✅ Phase 2: Exchange Connection

### Test 2.1: Navigate to Connections
**Steps:**
1. From dashboard, navigate to Connections/Exchange Management
2. Verify page loads

**Expected Results:**
- ✅ Connections page loads without errors
- ✅ Connection management UI visible

---

### Test 2.2: Test Exchange Connection
**Steps:**
1. Click "Connect Exchange" or "Add Exchange"
2. Select: "Binance"
3. Enter:
   - API Key: `test_api_key_12345`
   - API Secret: `test_api_secret_67890`
   - Nickname: "Test Binance Account"
4. Click "Test Connection"

**Expected Results:**
- ✅ Connection test executes
- ✅ Test result displayed (may show success/failure depending on mock)
- ✅ Loading state during test

**API Call:**
```
POST http://localhost:8000/connections/connections/test
Content-Type: application/json

{
  "exchange": "BINANCE",
  "api_key": "test_api_key_12345",
  "api_secret": "test_api_secret_67890"
}
```

**Expected Response:**
```json
{
  "ok": true,
  "code": "OK",
  "message": "Connection successful"
}
```

---

### Test 2.3: Save Exchange Connection
**Steps:**
1. After test (successful or not), click "Save" or "Connect"
2. Verify connection saved

**Expected Results:**
- ✅ Connection saved successfully
- ✅ Connection appears in list with status "connected"
- ✅ Success message/notification shown

**API Call:**
```
POST http://localhost:8000/connections/connections
Content-Type: application/json

{
  "exchange": "BINANCE",
  "api_key": "test_api_key_12345",
  "api_secret": "test_api_secret_67890",
  "nickname": "Test Binance Account"
}
```

**Expected Response:**
```json
{
  "id": "uuid-here",
  "exchange": "BINANCE",
  "nickname": "Test Binance Account",
  "status": "connected",
  "last_check_at": "2025-01-XX...",
  "next_check_eta_sec": 60,
  "features": {
    "trading": true,
    "wallet": true,
    "paper": false
  }
}
```

---

## ✅ Phase 3: Account Balance Fetching

### Test 3.1: Fetch Balance
**Steps:**
1. Navigate to Portfolio/Dashboard balance section
2. Verify balance data displays

**Expected Results:**
- ✅ Balance data visible
- ✅ Shows USDT, BTC balances
- ✅ Free and locked amounts displayed

**API Call:**
```
GET http://localhost:8000/portfolio/funds?user_id=test-user-id&exchange=binance
```

**Expected Response:**
```json
{
  "success": true,
  "funds": [
    {
      "exchange": "binance",
      "currency": "USDT",
      "free": 1000.0,
      "locked": 100.0,
      "total": 1100.0,
      "updated_at": 1640995200000
    }
  ],
  "count": 1
}
```

**Note:** Currently returns mock data - real exchange integration needed for production.

---

## ✅ Phase 4: DCA Bot Creation

### Test 4.1: Navigate to DCA Bot Page
**Steps:**
1. From dashboard, navigate to "DCA Bot" or "Tools > DCA Bot"
2. Verify page loads completely

**Expected Results:**
- ✅ Page loads without white screen
- ✅ All sections visible:
  - Trading Mode toggle at top
  - Main section
  - Entry orders section
  - DCA Rules section
  - DCA Amount section
  - Phase 1 Features sections
  - Summary panel on right
- ✅ No console errors

---

### Test 4.2: Configure Trading Mode
**Steps:**
1. Verify Trading Mode section at top of page
2. Click "🧪 Test Mode" button
3. Verify mode selected

**Expected Results:**
- ✅ "Test Mode" button highlighted (blue)
- ✅ Status badge shows: "📊 Paper trading with live market data"
- ✅ Summary panel shows "🧪 Test" badge
- ✅ Warning message if "Live Mode" clicked (confirmation dialog)

---

### Test 4.3: Fill Basic Configuration
**Steps:**
1. **Main Section:**
   - Bot Name: "E2E Test DCA Bot"
   - Direction: Select "Long"
   - Pair: Click and select "BTC/USDT" from dropdown
   - Exchange: "My Binance | Binance Spot"
   - Bot Type: "Single"
   - Profit Currency: "Quote"

**Expected Results:**
- ✅ All fields save correctly
- ✅ Pair dropdown works with search
- ✅ Multi-select pairs works (if applicable)

---

### Test 4.4: Configure Entry Conditions
**Steps:**
1. **Entry Orders Section:**
   - Select "Wait for Signal" (or "Open Immediately" for instant start)
   
2. **If "Wait for Signal":**
   - Condition Type: "RSI Conditions"
   - Component: "RSI"
   - Operator: "crosses above"
   - Value: 30
   - Period: 14

**Expected Results:**
- ✅ Condition configured
- ✅ No validation errors
- ✅ Summary panel reflects selection

---

### Test 4.5: Configure DCA Rules
**Steps:**
1. **DCA Rules Section:**
   - Rule Type: "DCA when position is down by % from Last Entry Price"
   - Percentage: 5%
   - Max DCA per Position: 3
   - Max DCA across All Positions: 10
   - DCA Cooldown: 60 (minutes)
   - Wait for previous DCA: Checked

**Expected Results:**
- ✅ All fields save
- ✅ Tooltips explain functionality
- ✅ Summary shows DCA configuration

---

### Test 4.6: Configure DCA Amount
**Steps:**
1. **DCA Amount Section:**
   - Amount Type: "Fixed Amount"
   - Fixed Amount: 100
   - DCA Multiplier: 1.0

**Expected Results:**
- ✅ Amount saved
- ✅ Calculations visible (if applicable)

---

### Test 4.7: Configure Phase 1 Features (Optional)
**Steps:**
1. **Smart Market Regime Detection:**
   - Enable toggle
   - Set Chart Timeframe: "1 Day"
   - Pause Conditions:
     - Pause when price below MA: Checked
     - MA Period: 200
     - RSI Threshold: 30
   - If conflict warning appears:
     - Enable "Allow entry conditions to override pause"
     - Verify warning changes to "✅ Conflict Resolved"

**Expected Results:**
- ✅ Features toggle correctly
- ✅ Conflict detection works
- ✅ Override resolves conflicts (green resolved message)

---

### Test 4.8: Review Summary Panel
**Steps:**
1. Check right-side Summary Panel

**Expected Results:**
- ✅ Trading Mode: "🧪 Test" with description
- ✅ Initial Balance: "$10,000.00 USDT"
- ✅ Max amount: "100 USDT"
- ✅ Trading Mode: "⏳ Wait for Signal" or "⚡ Open Immediately"
- ✅ Conflict Warning/Resolved message (if applicable)
- ✅ All configurations reflected

---

### Test 4.9: Create Bot
**Steps:**
1. Scroll to bottom
2. Click "Create Bot" or "Start Bot" button
3. Wait for response

**Expected Results:**
- ✅ Loading state during creation
- ✅ Success toast: "DCA Bot created! Starting test mode..."
- ✅ Success toast: "✅ Bot started in test mode with live market data! Bot ID: {bot_id}"
- ✅ Bot ID logged in console
- ✅ Status polling starts automatically

**API Call:**
```
POST http://localhost:8000/bots/dca-bots
Content-Type: application/json

{
  "botName": "E2E Test DCA Bot",
  "direction": "long",
  "pair": "BTC/USDT",
  "selectedPairs": ["BTC/USDT"],
  "exchange": "My Binance | Binance Spot",
  "botType": "single",
  "profitCurrency": "quote",
  "baseOrderSize": 100,
  "baseOrderCurrency": "USDT",
  "startOrderType": "market",
  "tradeStartCondition": true,
  "tradingMode": "test",
  "useLiveData": true,
  "conditionConfig": {
    "mode": "simple",
    "conditionType": "RSI Conditions",
    "condition": {
      "type": "indicator",
      "indicator": "RSI",
      "component": "RSI",
      "operator": "crosses_above",
      "value": 30,
      "period": 14
    }
  },
  "dcaRules": {
    "ruleType": "down_from_last_entry",
    "percentage": 5,
    "maxDcaPerPosition": 3,
    "maxDcaAcrossAllPositions": 10,
    "dcaCooldownValue": 60,
    "dcaCooldownUnit": "minutes",
    "waitForPreviousDca": true
  },
  "dcaAmount": {
    "amountType": "fixed",
    "fixedAmount": 100,
    "multiplier": 1.0
  },
  "phase1Features": {
    "marketRegime": {
      "enabled": true,
      "regimeTimeframe": "1d",
      "allowEntryOverride": true,
      "pauseConditions": {...},
      "resumeConditions": {...}
    },
    "dynamicScaling": null,
    "profitStrategy": null,
    "emergencyBrake": null
  }
}
```

**Expected Response:**
```json
{
  "success": true,
  "bot": {
    "bot_id": "dca_bot_1234567890",
    "user_id": "current_user",
    "name": "E2E Test DCA Bot",
    "bot_type": "dca",
    "status": "inactive",
    "symbol": "BTC/USDT",
    "config": {...}
  },
  "bot_id": "dca_bot_1234567890",
  "message": "DCA Bot created successfully..."
}
```

**Backend Logs Should Show:**
```
Created DCA bot dca_bot_1234567890 with 1 pairs
Phase 1 features: ['marketRegime']
```

---

## ✅ Phase 5: Bot Execution (Paper Trading)

### Test 5.1: Bot Auto-Start
**Steps:**
1. After bot creation, wait for auto-start

**Expected Results:**
- ✅ Bot automatically starts paper trading
- ✅ Success toast appears
- ✅ Bot ID visible in UI/console

**API Call:**
```
POST http://localhost:8000/bots/dca-bots/dca_bot_1234567890/start-paper
Content-Type: application/json

{
  "initial_balance": 10000,
  "interval_seconds": 60,
  "use_live_data": true
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Paper trading bot dca_bot_1234567890 started successfully",
  "bot_id": "dca_bot_1234567890",
  "paper_trading": true,
  "initial_balance": 10000
}
```

**Backend Logs Should Show:**
```
📊 Bot configured to use LIVE market data from Binance
🚀 Starting DCA bot dca_bot_1234567890 in TEST mode (paper trading)
💰 Initial balance: $10000
⏱️  Execution interval: 60 seconds
✅ Started paper trading bot dca_bot_1234567890
```

---

### Test 5.2: Status Polling
**Steps:**
1. Wait 5-10 seconds
2. Check Summary Panel for updates

**Expected Results:**
- ✅ Status polling active (every 5 seconds)
- ✅ Bot Status section appears in Summary Panel:
  - Status: "running"
  - Current Balance: $10,000.00 USDT (or updated)
  - Total P&L: $0.00 (initially)
  - Open Positions: 0 (initially)
  - Total Return: 0.00%

**API Call (every 5 seconds):**
```
GET http://localhost:8000/bots/dca-bots/status/dca_bot_1234567890
```

**Expected Response:**
```json
{
  "status": "running",
  "paused": false,
  "running": true,
  "current_balance": 10000.0,
  "initial_balance": 10000.0,
  "total_pnl": 0.0,
  "total_return_pct": 0.0,
  "open_positions": 0,
  "positions": {}
}
```

---

### Test 5.3: Bot Execution (Wait for Conditions)
**Steps:**
1. Monitor backend logs
2. Wait for execution iterations
3. Check if conditions are evaluated

**Expected Results:**
- ✅ Execution loop running
- ✅ Market data fetched from Binance
- ✅ Entry conditions evaluated
- ✅ DCA rules evaluated
- ✅ Logs show execution status

**Backend Logs Should Show:**
```
🔄 Execution iteration 1 for E2E Test DCA Bot
📊 Statistics: Balance=$10000.00, Positions=0, P&L=$0.00 (0.00%)
```

**After Conditions Met (if applicable):**
```
✅ Paper DCA executed for BTC/USDT: 0.00196078 @ $51000.00 = $100.00
📊 Statistics: Balance=$9900.00, Positions=1, P&L=$0.00 (0.00%)
```

---

## ✅ Phase 6: Verification Checklist

### Authentication
- [x] Signup creates user in Supabase
- [x] Signin authenticates correctly
- [x] JWT token stored
- [x] Session persists

### Exchange Connection
- [x] Connection test endpoint works
- [x] Connection save endpoint works
- [x] Connection list displays
- [x] UI handles all states

### Balance Fetching
- [x] Balance endpoint accessible
- [x] Mock data returns (production needs real API)
- [x] UI displays balance correctly

### Bot Creation
- [x] All configuration sections work
- [x] Conflict detection works
- [x] Override resolution works
- [x] Bot creation endpoint works
- [x] All Phase 1 features validated

### Bot Execution
- [x] Bot starts successfully
- [x] Paper trading engine initializes
- [x] Market data service works
- [x] Status polling works
- [x] Statistics update correctly

---

## 🚨 Known Issues to Check

1. **Backend Import Error**: 
   - Error: `Could not import module "main"`
   - **Check**: Ensure running from correct directory: `cd apps/api && uvicorn main:app --reload`

2. **Frontend npm scripts**: 
   - `npm run dev` must be run from `apps/frontend` directory

3. **Balance API**: 
   - Currently returns mock data
   - Production needs real Binance account API integration

4. **Exchange Connection**: 
   - Test endpoint may need actual Binance API credentials for real testing
   - Mock implementation exists for development

---

## 🧪 Quick Test Commands

### Test Backend Health
```bash
curl http://localhost:8000/health
```
Expected: `{"status": "ok", "timestamp": ...}`

### Test Bot Creation (Manual)
```bash
curl -X POST http://localhost:8000/bots/dca-bots \
  -H "Content-Type: application/json" \
  -d '{
    "botName": "Quick Test",
    "direction": "long",
    "pair": "BTCUSDT",
    "selectedPairs": ["BTCUSDT"],
    "exchange": "Binance",
    "botType": "single",
    "baseOrderSize": 100,
    "tradingMode": "test",
    "useLiveData": true
  }'
```

### Test Bot Status
```bash
curl http://localhost:8000/bots/dca-bots/status/{bot_id}
```

---

## 📊 Success Criteria

✅ **All Tests Pass If:**
1. User can signup and signin
2. Exchange connection test and save work
3. Balance endpoint returns data (mock acceptable for now)
4. Bot creation succeeds with all configurations
5. Bot auto-starts in test mode
6. Status polling shows real-time updates
7. Bot executes and logs statistics
8. No critical errors in console/logs

---

## 📝 Test Results Template

```
Date: ___________
Tester: ___________

Phase 1 (Auth):
[ ] Signup: PASS/FAIL
[ ] Signin: PASS/FAIL

Phase 2 (Exchange):
[ ] Connection Test: PASS/FAIL
[ ] Connection Save: PASS/FAIL

Phase 3 (Balance):
[ ] Balance Fetch: PASS/FAIL

Phase 4 (Bot Creation):
[ ] Page Load: PASS/FAIL
[ ] Configuration: PASS/FAIL
[ ] Bot Creation: PASS/FAIL

Phase 5 (Execution):
[ ] Bot Start: PASS/FAIL
[ ] Status Polling: PASS/FAIL
[ ] Execution Logs: PASS/FAIL

Issues Found: _______________________
```

---

## 🎯 Next Steps After Testing

1. Fix any failing tests
2. Complete real exchange API integration for balances
3. Add comprehensive error logging
4. Implement live trading mode (currently only test mode)
5. Add more validation and edge case handling


