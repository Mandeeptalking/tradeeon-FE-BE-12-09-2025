# Quick Start: Set Up Database Tables

## TL;DR - 3 Ways to Create Tables

### ⚡ Option 1: Automated Script (Recommended)
```bash
python run_migration.py
```

### 📋 Option 2: Supabase Dashboard (Easiest)
1. Open [Supabase SQL Editor](https://supabase.com/dashboard)
2. Copy content from `infra/supabase/migrations/001_initial_schema.sql`
3. Paste and click "Run"

### 🔧 Option 3: Manual via Supabase
1. Go to https://supabase.com/dashboard
2. Select your project → Database → SQL Editor
3. Run the migration file

---

## ⚠️ IMPORTANT: You MUST Create Tables

The code will NOT work without these tables:
- ❌ No persistence
- ❌ Bot data lost on restart
- ❌ Can't track history
- ❌ No audit trail

---

## 📊 Required Tables

| Table | Purpose |
|-------|---------|
| `bots` | Bot configurations |
| `bot_runs` | Execution runs |
| `order_logs` | Trade history |
| `positions` | Open positions |
| `funds` | Account balances |

---

## ✅ After Setup

Your system will have:
- ✅ Full bot persistence
- ✅ Complete audit trail
- ✅ Execution history
- ✅ Cross-session continuity
- ✅ All CRUD operations working

---

## 🐛 Need Help?

See `SUPABASE_SETUP_GUIDE.md` for detailed instructions and troubleshooting.


