# Quick Start Guide

Get your Tradeeon DCA Bot system up and running in minutes!

---

## 🚀 Prerequisites

- Python 3.11+
- Node.js 18+ (for frontend)
- Supabase account (free tier works)

---

## 📦 Installation

### 1. Clone the Repository (if not already done)

```bash
git clone https://github.com/Mandeeptalking/tradeeon-FE-BE-12-09-2025.git
cd tradeeon-FE-BE-12-09-2025
```

### 2. Install Backend Dependencies

```bash
pip install -r requirements.txt
```

### 3. Install Frontend Dependencies

```bash
cd apps/frontend
npm install
cd ../..
```

---

## ⚙️ Configuration

### Step 1: Create Backend `.env` File

**Windows (PowerShell):**
```powershell
Copy-Item "infra\configs\env.template" ".env"
```

**Linux/Mac:**
```bash
cp infra/configs/env.template .env
```

### Step 2: Create Frontend `.env` File

**Windows (PowerShell):**
```powershell
Copy-Item "apps\frontend\.env.example" "apps\frontend\.env"
```

**Linux/Mac:**
```bash
cp apps/frontend/.env.example apps/frontend/.env
```

### Step 3: Get Supabase Credentials

1. Create a free account at https://supabase.com
2. Create a new project
3. Go to **Settings** → **API**
4. Copy these values:
   - **Project URL** → `SUPABASE_URL`
   - **anon public key** → `SUPABASE_ANON_KEY`
   - **service_role secret key** → `SUPABASE_SERVICE_ROLE_KEY`

### Step 4: Fill Backend `.env` File

Edit `.env` (at project root) and update these values:

```bash
# Replace with your actual values
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJxxxxx
SUPABASE_SERVICE_ROLE_KEY=eyJxxxxx

# Generate a random 32-character encryption key
ENCRYPTION_KEY=your_random_32_character_key_here
```

### Step 5: Fill Frontend `.env` File

Edit `apps/frontend/.env` and update these values:

```bash
# Same URL and anon key as backend
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxxxx
VITE_API_URL=http://localhost:8000
```

**Generate encryption key (for backend):**
```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

### Step 6: Create Database Tables

**Option A: Using Supabase Dashboard (Recommended)**

1. Go to https://supabase.com/dashboard
2. Select your project
3. Click **SQL Editor** in left sidebar
4. Copy content from `infra/supabase/migrations/001_initial_schema.sql`
5. Paste and click **"Run"**
6. Verify tables created in **Table Editor**

**Option B: Using Python Script**

```bash
python run_migration.py
```

---

## 🏃 Running the Application

### Terminal 1: Start Backend API

```bash
cd apps/api
python main.py
```

You should see:
```
✅ API server running on http://localhost:8000
```

### Terminal 2: Start Frontend

```bash
cd apps/frontend
npm run dev
```

You should see:
```
✅ Frontend running on http://localhost:5173
```

### Terminal 3: Start Bot Runner (Optional - for live trading)

```bash
python -m apps.bots.bot_runner
```

---

## 🌐 Access the Application

- **Frontend**: http://localhost:5173
- **API Docs**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/health

---

## ✅ Verify Everything Works

### 1. Check API Health

```bash
curl http://localhost:8000/health
```

Expected response:
```json
{"status": "healthy"}
```

### 2. Test Database Connection

```bash
python check_tables.py
```

Expected output:
```
✅ All tables exist
```

### 3. Create Your First DCA Bot

1. Open http://localhost:5173
2. Navigate to **Tools** → **DCA Bot**
3. Configure your bot:
   - Set trading pair (e.g., BTC/USDT)
   - Set DCA amount
   - Configure entry conditions (optional)
   - Set DCA rules
4. Click **"Start Bot"**

---

## 🧪 Test Mode

The bot runs in **Test Mode** by default (paper trading with live data):

- ✅ Uses real market data from Binance
- ✅ No real money traded
- ✅ Perfect for testing strategies
- ✅ Switch to Live Mode when ready

---

## 📚 Next Steps

- [DCA Bot Documentation](DCA_BOT_INNOVATION_ROADMAP.md)
- [Database Setup Guide](SUPABASE_SETUP_GUIDE.md)
- [Condition Verification](DCA_BOT_CONDITIONS_VERIFICATION.md)
- [E2E Testing Guide](TEST_SCENARIO.md)

---

## 🐛 Troubleshooting

### "Missing required environment variables"
→ Create `.env` files (see Steps 1-2 above)

**Frontend Error: "Missing Supabase environment variables"**
→ Create `apps/frontend/.env` file (see Step 2 above)

### "relation 'public.bots' does not exist"
→ Create database tables (see Step 4 above)

### "Module not found"
→ Install dependencies: `pip install -r requirements.txt` and `cd apps/frontend && npm install`

### "Port already in use"
→ Change port in `.env` or stop conflicting services

---

## 📞 Need Help?

- Check [SUPABASE_SETUP_GUIDE.md](SUPABASE_SETUP_GUIDE.md) for detailed setup instructions
- Check [Common Issues](SUPABASE_SETUP_GUIDE.md#-common-issues) for troubleshooting
- Check logs in terminal for detailed error messages

---

**Happy Trading! 🚀**

