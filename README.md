# Smart Bots - Binance Arbitrage Scanner

A Python 3.11 CLI tool for scanning Binance trading pairs and building triangular arbitrage loops.

## Features

- 🔍 Scans all Binance spot trading pairs
- 🔗 Builds USDT-anchored triangular arbitrage loops
- 📊 Provides detailed statistics and analysis
- 💾 Export loops to JSON for further analysis
- ⚡ Fast and lightweight (minimal dependencies)

## Installation

### Option 1: Using uv (recommended)
```bash
uv pip install -r requirements.txt
```

### Option 2: Using pip
```bash
pip install -r requirements.txt
```

## Usage

### Basic scan
```bash
python -m scripts.scan_pairs
```

### Save results to file
```bash
python -m scripts.scan_pairs --save loops.json
```

### Live arbitrage scanning
```bash
python -m scripts.scan_live --loops loops.json --trade-size 200 --min-profit 2 --fee 0.001 --safety 0.001
```

### Exclude low-quality pairs
```bash
python -m scripts.scan_live --exclude TRY,BRL,EUR --print-top 5
```

### Live depth scanning with VWAP
```bash
python -m scripts.scan_live_depth \
  --loops loops.json \
  --trade-size 200 \
  --min-profit 2 \
  --fee 0.001 \
  --safety 0.001 \
  --depth-levels 10 \
  --max-depth-streams 120 \
  --exclude TRY,BRL,EUR \
  --tick-ms 300 \
  --print-top 5
```

### Live simulation with virtual execution
```bash
python -m scripts.simulate_live \
  --loops loops.json \
  --trade-size 200 \
  --min-profit 2 \
  --fee 0.001 \
  --safety 0.001 \
  --depth-levels 10 \
  --log-csv trades.csv \
  --ledger-db sim_trades.db
```

## Expected Output

### Static Loop Discovery
```
🔄 Fetching Binance exchange information...
✅ Data fetched successfully!

🔍 Building USDT triangular arbitrage loops...

📊 RESULTS
==================================================
Total tradable symbols: 1530
Total USDT spot symbols: 418
Total USDT-based triangular loops: 1076

🏆 TOP 10 COINS BY LOOP FREQUENCY
----------------------------------------
 1. TRY      - 275 loops
 2. USDC     - 241 loops
 3. BTC      - 220 loops
 4. FDUSD    - 139 loops
 5. BNB      - 84 loops
 6. ETH      - 64 loops
 7. EUR      - 40 loops
 8. BRL      - 25 loops
 9. SOL      - 12 loops
10. XRP      - 11 loops

🔗 EXAMPLE LOOPS
----------------------------------------
1. USDT → BTC → CTK → USDT   | pairs: BTCUSDT, CTKBTC, CTKUSDT
2. USDT → BTC → JOE → USDT   | pairs: BTCUSDT, JOEBTC, JOEUSDT
3. USDT → BTC → API3 → USDT  | pairs: BTCUSDT, API3BTC, API3USDT
4. USDT → BTC → NEO → USDT   | pairs: BTCUSDT, NEOBTC, NEOUSDT
5. USDT → BTC → KAVA → USDT  | pairs: BTCUSDT, KAVABTC, KAVAUSDT
... and 1071 more loops

💾 Saved 1076 loops to loops.json
```

### Live Arbitrage Scanning
```
📊 Loaded 1076 loops from loops.json
🚫 Excluded coins: BRL, EUR, TRY
🔍 Required symbols: 892
🔌 Connecting to Binance WebSocket: wss://stream.binance.com:9443/ws/!bookTicker
✅ WebSocket connected successfully!
✅ Received 892 quotes (required: 892)
🚀 Starting live scan...
📈 Trade size: 200 USDT
💰 Min profit: 2 USDT
💸 Fee rate: 0.100%
🛡️  Safety margin: 0.100%
--------------------------------------------------------------------------------
[14:42:31] USDT → BNB → BTC → USDT           | pairs: BNBUSDT, BNBBTC, BTCUSDT | size=200 | net=+2.37 USDT | edge=+1.18%
[14:42:32] USDT → ETH → BTC → USDT           | pairs: ETHUSDT, ETHBTC, BTCUSDT | size=200 | net=+2.15 USDT | edge=+1.08%
[14:42:33] USDT → ADA → ETH → USDT           | pairs: ADAUSDT, ADAETH, ETHUSDT | size=200 | net=+2.89 USDT | edge=+1.44%

🏆 TOP 5 OPPORTUNITIES
--------------------------------------------------------------------------------
 1. USDT → ADA → ETH → USDT           | +2.89 USDT | +1.44%
 2. USDT → BNB → BTC → USDT           | +2.37 USDT | +1.18%
 3. USDT → ETH → BTC → USDT           | +2.15 USDT | +1.08%
 4. USDT → SOL → BTC → USDT           | +2.08 USDT | +1.04%
 5. USDT → XRP → ETH → USDT           | +2.03 USDT | +1.02%
--------------------------------------------------------------------------------
```

### Live Depth Scanning with VWAP
```
📊 Loaded 736 loops from loops.json
🚫 Excluded coins: BRL, EUR, TRY
🔍 Required symbols: 892
🔌 Connecting to Binance WebSocket: wss://stream.binance.com:9443/ws/!bookTicker
✅ WebSocket connected successfully!
✅ Price feed: 892 quotes
✅ Depth feed: 120 orderbooks
🔍 Subscribing to 120 depth streams (levels=10)
⚠️  772 symbols will use top-of-book fallback
✅ Connected to Binance depth feed
✅ Price feed: 892 quotes
✅ Depth feed: 120 orderbooks
🚀 Starting live depth scan...
📈 Trade size: 200 USDT
💰 Min profit: 2 USDT
💸 Fee rate: 0.100%
🛡️  Safety margin: 0.100%
📊 Depth levels: 10
🔗 Max depth streams: 120
--------------------------------------------------------------------------------
[14:42:31.205] USDT → BNB → BTC → USDT           | pairs: BNBUSDT, BNBBTC, BTCUSDT | size=200 | net=+2.37 USDT | edge=+1.18% | mode: VWAP(10)
[14:42:32.156] USDT → ETH → BTC → USDT           | pairs: ETHUSDT, ETHBTC, BTCUSDT | size=200 | net=+2.15 USDT | edge=+1.08% | mode: VWAP(10)
[14:42:33.089] USDT → ADA → ETH → USDT           | pairs: ADAUSDT, ADAETH, ETHUSDT | size=200 | net=+2.89 USDT | edge=+1.44% | mode: VWAP(10)
[14:42:33.234] USDT → SOL → BTC → USDT           | pairs: SOLUSDT, SOLBTC, BTCUSDT | size=200 | net=+2.08 USDT | edge=+1.04% | mode: TOB

🏆 TOP 5 OPPORTUNITIES
--------------------------------------------------------------------------------
 1. USDT → ADA → ETH → USDT           | +2.89 USDT | +1.44% | VWAP(10)
 2. USDT → BNB → BTC → USDT           | +2.37 USDT | +1.18% | VWAP(10)
 3. USDT → ETH → BTC → USDT           | +2.15 USDT | +1.08% | VWAP(10)
 4. USDT → SOL → BTC → USDT           | +2.08 USDT | +1.04% | TOB
 5. USDT → XRP → ETH → USDT           | +2.03 USDT | +1.02% | TOB
--------------------------------------------------------------------------------
```

### Live Simulation with Virtual Execution
```
📊 Loaded 736 loops from loops.json
🚫 Excluded coins: BRL, EUR, TRY
🔍 Required symbols: 892
🔍 Subscribing to 120 depth streams (levels=10)
✅ Connected to Binance depth feed
📝 Trade logging to CSV: trades.csv
💾 Trade logging to database: sim_trades.db
🚀 Starting live arbitrage simulation...
📈 Trade size: 200 USDT
💰 Min profit: 2 USDT
💸 Fee rate: 0.100%
🛡️  Safety margin: 0.100%
📊 Depth levels: 10
🔗 Max depth streams: 120
--------------------------------------------------------------------------------
[14:42:31.205] ✅ EXECUTED | USDT → BNB → BTC → USDT | +2.37 USDT | size=200 | edge=+1.18% | VWAP(3/3)
[14:42:32.156] ✅ EXECUTED | USDT → ETH → BTC → USDT | +2.15 USDT | size=200 | edge=+1.08% | VWAP(2/3)
[14:42:33.089] ✅ EXECUTED | USDT → ADA → ETH → USDT | +2.89 USDT | size=200 | edge=+1.44% | VWAP(3/3)

📊 SIMULATION PERFORMANCE
------------------------------------------------------------
Trades: 23 | Wins: 18 | Losses: 5 | Win Rate: 78.3%
Net: +28.4 USDT | Avg: +1.23 | Max: +3.45
Equity: +28.4 USDT | Max Drawdown: 2.1
------------------------------------------------------------
Opportunities Found: 156
Executions Performed: 23
Execution Rate: 14.7%
Market Data: 892 quotes available
Depth Data: 120 orderbooks available

📊 FINAL SIMULATION RESULTS
============================================================
📊 FINAL LEDGER SUMMARY
------------------------------------------------------------
Trades: 23 | Wins: 18 | Losses: 5 | Win Rate: 78.3%
Net: +28.4 USDT | Avg: +1.23 | Max: +3.45
Equity: +28.4 USDT | Max Drawdown: 2.1
------------------------------------------------------------

🎯 SIMULATION STATISTICS
------------------------------
Total Opportunities Found: 156
Total Executions Performed: 23
Overall Execution Rate: 14.7%

📈 RECENT TRADES
------------------------------
[14:45:23] USDT → ADA → ETH → USDT | +2.89 USDT | +1.44%
[14:45:22] USDT → BNB → BTC → USDT | +2.37 USDT | +1.18%
[14:45:21] USDT → ETH → BTC → USDT | +2.15 USDT | +1.08%
[14:45:20] USDT → SOL → BTC → USDT | +2.08 USDT | +1.04%
[14:45:19] USDT → XRP → ETH → USDT | +2.03 USDT | +1.02%

✅ Simulation completed successfully!
============================================================
```

## Project Structure

```
smartbots/
├── arb/
│   ├── __init__.py
│   ├── binance_client.py      # Binance API client
│   ├── loop_builder.py        # Triangular loop builder
│   ├── price_feed.py          # Real-time price feed (bookTicker)
│   ├── depth_feed.py          # Order book depth streams
│   ├── vwap.py               # VWAP calculations
│   ├── profit_calc.py        # Profit calculation with VWAP support
│   ├── simulator.py          # Virtual execution simulator
│   └── ledger.py             # PnL tracking and persistence
├── scripts/
│   ├── __init__.py
│   ├── scan_pairs.py          # Static loop discovery
│   ├── scan_live.py           # Live top-of-book scanner
│   ├── scan_live_depth.py     # Live VWAP depth scanner
│   └── simulate_live.py       # Live simulation with virtual execution
├── requirements.txt           # Dependencies
├── pyproject.toml            # Project configuration
└── README.md                 # This file
```

## How It Works

1. **Fetch Data**: Retrieves all trading pairs from Binance exchange info API
2. **Normalize**: Filters for active spot trading pairs only
3. **Build Graph**: Creates an adjacency graph of tradeable asset pairs
4. **Find Loops**: Discovers all triangular paths: USDT → A → B → USDT
5. **Analyze**: Generates statistics and rankings

## Dependencies

- `httpx>=0.24.0` - Modern HTTP client for API requests
- `websockets>=11.0.0` - WebSocket client for real-time data

## Requirements

- Python 3.11+
- Internet connection for Binance API access

## Notes

- No API keys required (uses public Binance endpoints)
- No trading functionality (analysis only)
- Results are deterministic based on current market pairs
- Loops are deduplicated (A,B ≡ B,A)

## Live Scanning Features

### Top-of-Book Scanner (`scan_live.py`)
- ✅ **Real-time price monitoring** via Binance WebSocket
- ✅ **Profit calculation with fees** and safety margins
- ✅ **Configurable parameters** (trade size, min profit, fees)
- ✅ **Coin filtering** to exclude low-quality pairs
- ✅ **Top N opportunities** display
- ✅ **Graceful error handling** for missing quotes

### Depth Scanner with VWAP (`scan_live_depth.py`)
- ✅ **Order book depth streams** (5, 10, or 20 levels)
- ✅ **VWAP calculations** for realistic fill prices
- ✅ **Intelligent symbol prioritization** (high liquidity first)
- ✅ **Automatic fallback** to top-of-book when depth unavailable
- ✅ **Configurable stream limits** (max concurrent depth streams)
- ✅ **Mixed mode display** (shows VWAP vs TOB per leg)
- ✅ **Subscription cap handling** (prioritizes most important symbols)

### Live Simulator with Virtual Execution (`simulate_live.py`)
- ✅ **Virtual trade execution** using VWAP pricing
- ✅ **PnL tracking** with comprehensive statistics
- ✅ **Trade persistence** (CSV and SQLite database)
- ✅ **Real-time performance monitoring** with periodic summaries
- ✅ **Execution rate tracking** (opportunities vs actual executions)
- ✅ **Detailed trade logging** with leg-by-leg breakdown
- ✅ **Win/loss analysis** with drawdown tracking
- ✅ **Safe operation** (no real orders placed)

## VWAP vs Top-of-Book

### VWAP (Volume Weighted Average Price)
- **More accurate** profit calculations based on actual order book depth
- **Realistic fills** that account for market impact
- **Configurable depth levels** (5, 10, or 20 levels)
- **Automatic fallback** to top-of-book when insufficient depth

### Top-of-Book (TOB)
- **Faster calculations** using best bid/ask only
- **Wider coverage** (all symbols available)
- **Simpler implementation** with fewer WebSocket connections
- **Good for screening** before detailed VWAP analysis

### Subscription Management
- **Intelligent prioritization** of symbols based on liquidity and loop frequency
- **Configurable limits** to avoid overwhelming Binance WebSocket limits
- **Graceful degradation** when symbol count exceeds stream limits
- **Mixed mode operation** (VWAP for prioritized symbols, TOB for others)

## Virtual Execution vs Real Trading

### Virtual Execution (Current Implementation)
- ✅ **Safe testing** - No real money at risk
- ✅ **Real-time market data** - Uses live Binance feeds
- ✅ **VWAP pricing** - Realistic execution prices
- ✅ **Complete PnL tracking** - Full trade history and statistics
- ✅ **Backtesting capability** - Analyze historical performance
- ✅ **Risk-free optimization** - Test strategies without capital

### Real Trading (Future Enhancement)
- ⚠️ **Requires API keys** - Binance trading credentials
- ⚠️ **Capital at risk** - Real money involved
- ⚠️ **Regulatory compliance** - Trading regulations apply
- ⚠️ **Infrastructure requirements** - Reliable execution systems

### Data Persistence
- **CSV Export**: Human-readable trade logs for analysis
- **SQLite Database**: Structured data for complex queries
- **Trade Details**: Complete leg-by-leg execution records
- **Performance Metrics**: Win rate, drawdown, execution statistics

## Future Enhancements

- Multi-exchange support
- Historical backtesting
- Automated trading execution (with proper risk management)
- Portfolio management integration
- Advanced order book analysis (full depth + snapshots)
- Machine learning for opportunity prediction