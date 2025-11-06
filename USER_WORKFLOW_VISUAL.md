# User Workflow - Visual Summary

## 🎯 Complete User Journey

```
┌─────────────────────────────────────────────────────────────────┐
│                    TRADEEON USER WORKFLOW                       │
└─────────────────────────────────────────────────────────────────┘

1. SIGNUP
   ┌─────────────┐
   │  Home Page  │
   └──────┬──────┘
          │ Click "Sign Up"
          ▼
   ┌─────────────┐
   │ Signup Form │ → Validate → Create Account → Redirect
   └─────────────┘

2. LOGIN
   ┌─────────────┐
   │ Signin Form │ → Authenticate → Create Session
   └──────┬──────┘
          │ Success
          ▼
   ┌─────────────┐
   │  Dashboard  │
   └─────────────┘

3. CONNECT EXCHANGE
   ┌──────────────┐
   │ Connections  │
   └──────┬───────┘
          │ Click "Connect"
          ▼
   ┌──────────────────────┐
   │ Connect Exchange Flow │
   │ 1. Select Exchange    │
   │ 2. Enter API Keys      │
   │ 3. Test Connection     │
   │ 4. Save (Encrypted)    │
   └──────┬─────────────────┘
          │ Success
          ▼
   ┌──────────────┐
   │ Exchange     │ ← Connected & Active
   │ Connected    │
   └──────────────┘

4. CREATE DCA BOT
   ┌─────────────┐
   │ DCA Bot Page│
   └──────┬──────┘
          │ Configure
          ▼
   ┌─────────────────────────┐
   │ Bot Configuration        │
   │ • Basic Settings         │
   │ • Entry Conditions       │
   │ • DCA Rules              │
   │ • Limits & Safety        │
   └──────┬───────────────────┘
          │ Create Bot
          ▼
   ┌─────────────────────────┐
   │ Bot Created             │
   │ • Bot record saved       │
   │ • Alert created (if cond)│
   │ • Status: Paused         │
   └──────┬───────────────────┘

5. ACTIVATE BOT
   ┌─────────────┐
   │  Bots List  │
   └──────┬──────┘
          │ Activate
          ▼
   ┌─────────────────────────┐
   │ Bot Active               │
   │ • Status: Active          │
   │ • Alert: Active (if cond)│
   │ • Monitoring: Enabled     │
   └──────┬───────────────────┘

6. AUTOMATED EXECUTION
   ┌─────────────────────────┐
   │ Alert Runner            │
   │ • Monitors conditions    │
   │ • Evaluates market data  │
   └──────┬───────────────────┘
          │ Condition Met
          ▼
   ┌─────────────────────────┐
   │ Bot Action Handler      │
   │ • Validates bot          │
   │ • Executes entry order   │
   │ • Creates DCA alert      │
   └──────┬───────────────────┘
          │
          ▼
   ┌─────────────────────────┐
   │ Position Created         │
   │ • Entry order filled     │
   │ • DCA monitoring active  │
   └──────┬───────────────────┘
          │ DCA Condition Met
          ▼
   ┌─────────────────────────┐
   │ DCA Order Executed       │
   │ • Average price updated  │
   │ • DCA count incremented  │
   └─────────────────────────┘

7. MONITOR & MANAGE
   ┌─────────────────────────┐
   │ Portfolio               │
   │ • View holdings          │
   │ • Track P&L              │
   │ • Real-time updates      │
   └─────────────────────────┘
          │
   ┌─────────────────────────┐
   │ Activity                │
   │ • Trading history        │
   │ • Order logs            │
   │ • Event feed            │
   └─────────────────────────┘
          │
   ┌─────────────────────────┐
   │ Bot Management          │
   │ • Pause/Resume          │
   │ • Edit configuration    │
   │ • View performance      │
   └─────────────────────────┘
```

---

## 🔄 Key Flows

### Authentication Flow:
```
User → Signup → Supabase Auth → User Created → Login → JWT Token → Protected Routes
```

### Exchange Connection Flow:
```
User → Select Exchange → Enter Keys → Test → Encrypt → Save to DB → Active
```

### Bot Creation Flow:
```
User → Configure Bot → Set Conditions → Create Bot → Create Alert → Bot Ready
```

### Bot Execution Flow:
```
Alert Runner → Condition Check → Condition Met → Bot Handler → Entry Order → DCA Monitoring → DCA Orders
```

---

## 📊 Data Flow

### Signup:
```
Frontend → supabase.auth.signUp() → Supabase Auth → auth.users
```

### Login:
```
Frontend → supabase.auth.signInWithPassword() → JWT Token → Auth Store → Protected Routes
```

### Connect Exchange:
```
Frontend → POST /api/connections → Backend → Encrypt Keys → Supabase → exchange_keys table
```

### Create Bot:
```
Frontend → POST /api/bots/dca → Backend → bots table + alerts table (if conditions)
```

### Bot Execution:
```
Alert Runner → Condition Evaluation → Alert Fired → Bot Handler → Exchange API → Order Executed
```

---

## 🔐 Security Points

1. **Authentication:**
   - JWT tokens (Supabase)
   - Session persistence
   - Protected routes

2. **API Keys:**
   - Encrypted at rest
   - Only decrypted when needed
   - Stored in Supabase (encrypted)

3. **Data Isolation:**
   - Row Level Security (RLS)
   - User ID filtering
   - Users only see their data

---

## ✅ User Actions Checklist

- [ ] Sign up account
- [ ] Login
- [ ] Connect at least one exchange
- [ ] Create DCA bot
- [ ] Configure entry conditions
- [ ] Set DCA rules
- [ ] Activate bot
- [ ] Monitor portfolio
- [ ] View activity
- [ ] Manage bot (pause/resume/edit)

---

**This visual map shows the complete user journey from signup to active trading!** 🚀

