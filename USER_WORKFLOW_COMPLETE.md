# Complete User Interaction Workflow - Tradeeon

## 📋 User Journey Overview

This document outlines the complete user interaction flow from signup to active trading bot management.

---

## 🚀 1. User Signup

### Flow:
```
Home Page → Signup Page → Email Verification (if enabled) → Signin Page
```

### Steps:

1. **User visits:** `https://www.tradeeon.com/`
   - Sees landing page with features
   - Clicks "Get Started" or "Sign Up"

2. **Signup Form** (`/signup`):
   - **Required Fields:**
     - First Name
     - Last Name
     - Email
     - Password (min 6 characters)
     - Confirm Password
   - **Optional:**
     - Phone Number
   
3. **Validation:**
   - Email format validation
   - Password length check
   - Password match verification
   - Name required

4. **Submission:**
   - Calls `supabase.auth.signUp()`
   - Stores user metadata (first_name, last_name, phone)
   - Creates user in Supabase Auth

5. **Success:**
   - Shows success message
   - Redirects to `/signin` after 2 seconds
   - User can now login

### Database Impact:
- ✅ Creates record in `auth.users` (Supabase)
- ✅ User metadata stored in `auth.users.user_metadata`

---

## 🔐 2. User Login

### Flow:
```
Signin Page → Authentication → Dashboard (/app)
```

### Steps:

1. **User visits:** `/signin`
   - Can also come from signup redirect
   - Can access from "Sign In" link

2. **Login Form:**
   - **Required Fields:**
     - Email
     - Password
   
3. **Validation:**
   - Email format validation
   - Password required

4. **Authentication:**
   - Calls `supabase.auth.signInWithPassword()`
   - Validates credentials with Supabase
   - Returns JWT token

5. **Session Management:**
   - `useAuth` hook initializes
   - Checks for existing session
   - Updates auth store with user data:
     - User ID
     - Email
     - Name (from metadata or email prefix)

6. **Success:**
   - Updates `useAuthStore` with user data
   - Sets `isAuthenticated = true`
   - Redirects to `/app` (Dashboard)

### Protected Routes:
- All `/app/*` routes require authentication
- If not authenticated → Redirects to `/signin`
- Preserves intended route in state for redirect after login

### Session Persistence:
- Session stored in browser (Supabase handles)
- On page refresh:
  - `useAuth` hook checks session
  - Restores authentication state
  - User stays logged in

---

## 🔗 3. Connect Exchange

### Flow:
```
Dashboard → Connections Page → Connect Exchange Drawer → Test → Save
```

### Steps:

1. **Access Connections:**
   - User clicks "Connections" in sidebar (`/app/connections`)
   - Sees list of available exchanges:
     - Binance
     - Coinbase Pro
     - Kraken
     - Zerodha

2. **Open Connect Drawer:**
   - Clicks "Connect Exchange" or "+" button
   - Opens `ConnectExchangeDrawer` component

3. **Step 1: Select Exchange**
   - Choose exchange from list
   - Shows exchange logo and info
   - Click "Next"

4. **Step 2: Enter API Keys**
   - **Required:**
     - API Key
     - API Secret
   - **Optional (for Coinbase/Kraken):**
     - Passphrase
   - **Optional:**
     - Nickname (to identify connection)
   - Fields are masked (show/hide toggle)
   - Click "Next"

5. **Step 3: Test Connection**
   - Validates API keys with exchange
   - Calls `/api/connections/test` endpoint
   - **Backend:**
     - Connects to exchange API
     - Validates credentials
     - Returns connection status
   - Shows test result:
     - ✅ Success: "Connection verified"
     - ❌ Error: Shows error message
   - Click "Next" if successful

6. **Step 4: Review & Save**
   - Shows summary:
     - Exchange name
     - Nickname (if set)
     - Connection status
   - Click "Save Connection"

7. **Save to Database:**
   - Calls `/api/connections` POST endpoint
   - **Backend:**
     - Encrypts API keys (using Supabase encryption)
     - Stores in `exchange_keys` table:
       - `user_id` (from JWT)
       - `exchange` (binance, coinbase, etc.)
       - `api_key_encrypted`
       - `api_secret_encrypted`
       - `passphrase_encrypted` (if required)
       - `is_active = true`
       - `permissions` (JSON)
   - Returns connection object

8. **Success:**
   - Closes drawer
   - Refreshes connections list
   - Shows success toast
   - Connection appears in connections list

### Connection Management:

**View Connections:**
- List shows all connected exchanges
- Status indicators:
  - ✅ Connected (green)
  - ⚠️ Degraded (yellow)
  - ❌ Error (red)

**Test Connection:**
- Click "Test" button on any connection
- Validates credentials in real-time

**Edit Connection:**
- Click "Edit" button
- Opens drawer with existing data
- Can update nickname or rotate keys

**Rotate Keys:**
- Open "Rotate Keys" modal
- Enter new API keys
- Test new keys
- Update in database

**Revoke Connection:**
- Click "Revoke" button
- Confirmation modal
- Sets `is_active = false`
- Removes from active connections

---

## 🤖 4. Create DCA Bot

### Flow:
```
Dashboard → DCA Bot Page → Configure Bot → Create Bot → Bot Active
```

### Steps:

1. **Access DCA Bot Page:**
   - User clicks "DCA Bot" in sidebar (`/app/dca-bot`)
   - Or from Dashboard → "Create Bot"

2. **Bot Configuration:**

   **Basic Settings:**
   - **Bot Name:** Custom name (e.g., "ETH/USDT Classic trading")
   - **Trading Mode:** 
     - `test` (Paper Trading - default)
     - `live` (Real Trading)
   - **Market Type:**
     - `spot` (Spot Trading)
     - `futures` (Futures Trading)
   - **Direction:**
     - `long` (Buy/Go Long)
     - `short` (Sell/Go Short)
   - **Exchange:** Select from connected exchanges
   - **Trading Pair:** 
     - Single pair (e.g., "ETH/USDT")
     - Multiple pairs (multi-pair mode)
   - **Profit Currency:**
     - `quote` (USDT, etc.)
     - `base` (ETH, BTC, etc.)

3. **Entry Orders Configuration:**
   - **Order Size:** Amount per order (e.g., 20 USDT)
   - **Order Currency:** Quote or base currency
   - **Start Order Type:**
     - `market` (Market order)
     - `limit` (Limit order)
   - **Trade Start Condition:** Enable/disable entry conditions

4. **Entry Conditions (Optional):**

   **Option A: Single Condition:**
   - Select condition type:
     - RSI Conditions
     - Moving Average
     - MACD
     - Price Action
     - MFI
     - CCI
   - Configure:
     - Indicator parameters
     - Operator (>, <, between, etc.)
     - Value/threshold
     - Timeframe

   **Option B: Condition Playbook:**
   - **Playbook Mode:** Enable
   - **Gate Logic:**
     - `ALL` (All conditions must be true)
     - `ANY` (At least one condition must be true)
   - **Evaluation Order:**
     - `priority` (Evaluate by priority)
     - `sequential` (Evaluate in order)
   - **Add Conditions:**
     - Multiple conditions
     - Each with:
       - Condition type
       - Parameters
       - Priority (1-N)
       - Validity duration (bars/minutes)
       - Logic (AND/OR)

5. **DCA Rules Configuration:**
   - **DCA Trigger Type:**
     - `down_from_last_entry` (Price drops X% from last entry)
     - `down_from_average_price` (Price drops X% from average)
     - `loss_by_percent` (Position loss X%)
     - `loss_by_amount` (Position loss $X)
     - `custom_condition` (Custom indicator condition)
   
   - **DCA Limits:**
     - Max DCA per position (e.g., 5)
     - Max DCA across all positions (e.g., 20)
   
   - **DCA Spacing & Timing:**
     - Cooldown between DCAs (minutes/bars)
     - Wait for previous DCA completion
   
   - **Position Limits:**
     - Max total investment per position
     - Stop DCA on loss (with threshold)

6. **Create Bot:**
   - Click "Create Bot" button
   - **Frontend:**
     - Validates all required fields
     - Prepares bot configuration object
     - Calls `/api/bots/dca` POST endpoint
   
   - **Backend:**
     - Validates user authentication
     - Validates exchange connection exists
     - Creates bot record in `bots` table:
       - `user_id`
       - `bot_type = 'dca'`
       - `name`
       - `exchange`
       - `symbol` (primary pair)
       - `config` (JSON with all settings)
       - `status = 'paused'` (default)
       - `created_at`
   
   - **Alert System Integration:**
     - If entry conditions configured:
       - Converts bot conditions to alert format
       - Creates alert in `alerts` table:
         - `user_id`
         - `symbol`
         - `conditions` (from bot)
         - `action.type = 'bot_trigger'`
         - `action.bot_id` (links to bot)
         - `action.action_type = 'execute_entry'`
         - `status = 'active'` (if bot active)
       - Alert runner will monitor and trigger bot entry

7. **Success:**
   - Bot created
   - Redirects to bot management or shows bot details
   - Bot appears in bots list
   - Status: `paused` (user must activate)

---

## ▶️ 5. Activate/Manage Bot

### Flow:
```
Bot List → Bot Details → Activate/Deactivate → Monitor
```

### Steps:

1. **View Bots:**
   - Go to `/app/bots`
   - See list of all bots:
     - Bot name
     - Exchange
     - Pair
     - Status (active/paused/error)
     - P&L (24h, total)
     - Orders count

2. **Bot Actions:**

   **Activate Bot:**
   - Click "Activate" or toggle switch
   - Calls `/api/bots/{bot_id}/activate`
   - **Backend:**
     - Updates `bots.status = 'active'`
     - Activates associated alert (if exists)
     - Bot starts monitoring entry conditions

   **Pause Bot:**
   - Click "Pause" or toggle switch
   - Calls `/api/bots/{bot_id}/pause`
   - **Backend:**
     - Updates `bots.status = 'paused'`
     - Pauses associated alert
     - Bot stops monitoring

   **Edit Bot:**
   - Click "Edit" button
   - Opens bot configuration page
   - Can modify:
     - Bot name
     - Entry conditions
     - DCA rules
     - Limits
   - Saves changes to database

   **Delete Bot:**
   - Click "Delete" button
   - Confirmation modal
   - Calls `/api/bots/{bot_id}` DELETE
   - **Backend:**
     - Deletes bot record
     - Deletes associated alert
     - Cancels any pending orders

3. **Bot Details View:**
   - Shows:
     - Bot configuration
     - Current status
     - Performance metrics:
       - Total P&L
       - Return %
       - Open positions
       - Total invested
     - Order history
     - Position details

---

## 📊 6. Monitor Portfolio

### Flow:
```
Dashboard → Portfolio Page → View Holdings & Performance
```

### Steps:

1. **Access Portfolio:**
   - Click "Portfolio" in sidebar (`/app/portfolio`)

2. **Portfolio Overview:**
   - **Total Portfolio Value:** Sum of all holdings
   - **Total P&L:** Overall profit/loss
   - **Return %:** Percentage return
   - **Active Positions:** Number of open positions

3. **Holdings List:**
   - Shows all positions across exchanges:
     - Symbol (e.g., ETH/USDT)
     - Exchange
     - Quantity
     - Average Price
     - Current Price
     - P&L (per position)
     - P&L % (per position)

4. **Exchange Breakdown:**
   - Grouped by exchange
   - Shows balances per exchange
   - Can filter by exchange

5. **Real-time Updates:**
   - Fetches live prices from exchanges
   - Updates P&L calculations
   - Refreshes every 30 seconds (configurable)

---

## 📈 7. View Activity & Analytics

### Flow:
```
Dashboard → Activity Page → View Trading History
```

### Steps:

1. **Access Activity:**
   - Click "Activity" in sidebar (`/app/activity`)

2. **Activity Feed:**
   - Shows chronological list of:
     - Bot entries (when conditions met)
     - DCA orders executed
     - Profit-taking events
     - Bot status changes
     - Error events
   
   - Each entry shows:
     - Timestamp
     - Event type
     - Bot name
     - Symbol
     - Details (amount, price, etc.)
     - Status

3. **Filtering:**
   - Filter by:
     - Date range
     - Bot
     - Exchange
     - Event type
     - Symbol

4. **Order History:**
   - Detailed list of all orders:
     - Order ID
     - Type (entry, DCA, exit)
     - Symbol
     - Side (buy/sell)
     - Quantity
     - Price
     - Status (filled/pending/cancelled)
     - Timestamp

---

## 🔄 8. Bot Execution Flow (Automated)

### When Entry Condition Triggers:

1. **Alert System Detects Condition:**
   - Alert runner polls for active alerts
   - Evaluates conditions against market data
   - When condition met:
     - Fires alert
     - Calls `dispatch_alert_action()`

2. **Bot Action Handler:**
   - Receives `bot_trigger` action
   - Extracts bot ID from action
   - Fetches bot configuration from database
   - Validates:
     - Bot is active
     - Exchange connection is valid
     - Sufficient balance available

3. **Execute Entry Order:**
   - Creates order:
     - Type: Market or Limit (from config)
     - Side: Buy (for long) or Sell (for short)
     - Symbol: Primary pair
     - Quantity: From base order size
   - Places order via exchange API
   - Records order in database

4. **Create DCA Alert:**
   - After entry order:
     - Creates DCA alert for this position
     - Monitors for DCA trigger conditions
     - Alert runner will trigger DCAs when conditions met

5. **Monitor Position:**
   - Track position:
     - Entry price
     - Current price
     - P&L
     - DCA count
   - Check DCA rules:
     - Price drops X% → Trigger DCA
     - Loss threshold → Trigger DCA or stop
   - Check profit-taking rules (if configured)

6. **Execute DCA Orders:**
   - When DCA condition met:
     - Creates DCA order
     - Places order via exchange API
     - Updates position average price
     - Increments DCA count
     - Records in activity log

7. **Profit-Taking (if configured):**
   - Monitor profit targets
   - When target reached:
     - Execute exit order
     - Close position
     - Record profit
     - Update bot statistics

---

## 📋 Complete User Journey Map

```
1. Landing Page (/)
   ↓
2. Signup (/signup)
   ↓
3. Signin (/signin)
   ↓
4. Dashboard (/app)
   ↓
5. Connect Exchange (/app/connections)
   ↓
6. Create DCA Bot (/app/dca-bot)
   ↓
7. Activate Bot
   ↓
8. Monitor:
   - Portfolio (/app/portfolio)
   - Activity (/app/activity)
   - Bot Status (/app/bots)
```

---

## 🔐 Security & Data Flow

### Authentication:
- **JWT Tokens:** Supabase manages JWT tokens
- **Session:** Stored in browser (Supabase handles)
- **API Calls:** Include `Authorization: Bearer <token>` header
- **Backend Validation:** Verifies JWT on every API call

### Data Encryption:
- **API Keys:** Encrypted using Supabase encryption
- **Stored in:** `exchange_keys` table (encrypted columns)
- **Decryption:** Only on backend when needed for API calls

### User Data Isolation:
- **Row Level Security (RLS):** Supabase RLS policies
- **User ID:** Extracted from JWT token
- **All queries:** Filtered by `user_id`
- **Users can only:** Access their own data

---

## 🎯 Key User Actions Summary

| Action | Route | Authentication | Database Impact |
|--------|-------|----------------|-----------------|
| **Signup** | `/signup` | ❌ | Creates `auth.users` |
| **Login** | `/signin` | ❌ | Creates session |
| **Connect Exchange** | `/app/connections` | ✅ | Creates `exchange_keys` |
| **Create Bot** | `/app/dca-bot` | ✅ | Creates `bots` + `alerts` |
| **Activate Bot** | `/app/bots` | ✅ | Updates `bots.status` |
| **View Portfolio** | `/app/portfolio` | ✅ | Reads `bots`, `orders` |
| **View Activity** | `/app/activity` | ✅ | Reads `orders`, `alerts` |

---

## 📝 Notes

- **Paper Trading:** Default mode for safety
- **Real Trading:** Requires explicit activation
- **Entry Conditions:** Optional - bot can start immediately or wait for conditions
- **DCA Rules:** Flexible - can trigger on price drops, losses, or custom conditions
- **Alert System:** Powers bot entry conditions (cost-efficient)
- **Exchange Support:** Binance, Coinbase, Kraken, Zerodha

---

**This workflow ensures a smooth, secure, and intuitive user experience from signup to active trading!** 🚀


