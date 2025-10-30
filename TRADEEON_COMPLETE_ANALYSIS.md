# Tradeeon - Complete Codebase Analysis

## Overview

Tradeeon is a comprehensive cryptocurrency trading platform that combines:
- **Frontend**: React/TypeScript web application with advanced canvas-based charting
- **Backend**: FastAPI-based REST API with Binance integration
- **Arbitrage System**: Python-based triangular arbitrage detection and simulation
- **Analytics**: Statistical analysis tools for correlation and spread analysis

## Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend API   │    │  Arbitrage      │
│   (React/TS)    │◄──►│   (FastAPI)     │◄──►│  System (Python)│
│                 │    │                 │    │                 │
│ • Canvas Charts │    │ • Binance API   │    │ • Loop Builder  │
│ • Trading UI    │    │ • Portfolio     │    │ • Profit Calc   │
│ • Auth System   │    │ • Analytics     │    │ • Simulation    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Binance       │    │   Supabase      │    │   Data Storage  │
│   WebSocket     │    │   Auth/DB       │    │   (CSV/SQLite)  │
│   Real-time     │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 1. Backend Architecture (FastAPI)

### Core Structure
```
apps/api/
├── main.py              # FastAPI app with CORS, routes, and Binance endpoints
├── models.py            # Pydantic models for API responses
├── binance_client.py    # Async Binance API client
└── routers/
    ├── connections.py   # Exchange connection management
    ├── portfolio.py     # Portfolio data and analytics
    └── analytics.py     # Correlation and spread analysis
```

### Key Features
- **FastAPI Framework**: Modern async Python web framework
- **CORS Enabled**: Configured for frontend at `localhost:5173`
- **Binance Integration**: Real-time market data via REST API
- **Modular Design**: Separate routers for different functionality

### API Endpoints

#### Core Endpoints
- `GET /health` - Health check
- `GET /me` - User information

#### Binance Market Data
- `GET /api/symbols` - All trading symbols
- `GET /api/ticker/24hr` - 24hr price statistics
- `GET /api/ticker/price` - Latest prices
- `GET /api/klines` - Candlestick data
- `GET /api/depth` - Order book data
- `GET /api/trades` - Recent trades
- `GET /api/aggTrades` - Aggregate trades

#### Frontend-Specific
- `GET /api/market/overview` - Market overview for dashboard
- `GET /api/chart/data/{symbol}` - Chart data formatted for frontend

#### Connections Management
- `GET /connections/connections` - List all connections
- `POST /connections/connections` - Create/update connection
- `POST /connections/connections/test` - Test connection
- `POST /connections/connections/{id}/rotate` - Rotate API keys
- `DELETE /connections/connections/{id}` - Revoke connection
- `GET /connections/connections/audit` - Audit events

#### Portfolio Analytics
- `GET /portfolio/overview` - Portfolio overview metrics
- `GET /portfolio/equity_curve` - Equity curve data
- `GET /portfolio/allocation` - Asset allocation
- `GET /portfolio/holdings` - Holdings data

#### Advanced Analytics
- `GET /analytics/correlation` - Rolling correlation between symbols
- `GET /analytics/spread-zscore` - Spread z-score analysis

### Data Models
```python
# Key Pydantic models
class SymbolInfo(BaseModel):
    symbol: str
    baseAsset: str
    quoteAsset: str
    status: str
    isSpotTradingAllowed: bool

class TickerData(BaseModel):
    symbol: str
    price: float
    price_change: float
    price_change_percent: float
    # ... more fields
```

## 2. Frontend Architecture (React/TypeScript)

### Core Structure
```
apps/frontend/src/
├── main.tsx              # App entry point with routing
├── App.tsx               # Main app component with routes
├── components/           # Reusable UI components
│   ├── Layout/          # App shell and navigation
│   ├── chart/           # Chart-related components
│   ├── connections/     # Exchange connection UI
│   ├── portfolio/       # Portfolio visualization
│   └── ui/              # Base UI components
├── pages/               # Route components
│   ├── app/            # Protected app pages
│   ├── chart/          # Chart studio pages
│   └── auth/           # Authentication pages
├── canvas/              # Custom canvas chart implementation
├── lib/                 # Utilities and services
├── store/               # State management (Zustand)
└── hooks/               # Custom React hooks
```

### Key Technologies
- **React 18** with TypeScript
- **Vite** for build tooling
- **Tailwind CSS** for styling
- **React Router** for navigation
- **Zustand** for state management
- **TanStack Query** for API data fetching
- **Supabase** for authentication
- **Canvas API** for custom charting

### Pages and Features

#### Authentication Flow
- `Home` - Landing page
- `SignIn/Signup` - Authentication with Supabase
- `GetStarted` - Onboarding flow

#### Main Application (Protected)
- `Dashboard` - Overview dashboard
- `Connections` - Exchange connection management
- `Portfolio` - Portfolio analytics and visualization
- `Bots` - Trading bot management
- `Activity` - Activity logs
- `Settings` - User settings

#### Charting System
- `ChartStudio` - Main chart interface
- `ChartV1` - Alternative chart view
- `CanvasChartPage` - Advanced canvas-based charts
- `LiveCharts` - Real-time chart updates
- `RSIChart` - RSI indicator charts
- `ZScore` - Z-score analysis charts

### Canvas Chart Implementation

The canvas chart system is a sophisticated, custom-built charting solution:

#### Key Features
- **Multi-pane Layout**: Price pane + indicator panes (RSI, etc.)
- **Real-time Updates**: Live data from Binance WebSocket
- **Interactive Controls**: Zoom, pan, crosshair, tooltips
- **Technical Indicators**: EMA, RSI with customizable parameters
- **Responsive Design**: Adapts to different screen sizes
- **Performance Optimized**: Canvas rendering with RAF scheduling

#### Technical Implementation
```typescript
// Core chart component
export const CanvasCandleChart = forwardRef<CanvasCandleChartHandle, CanvasCandleChartProps>(
  ({ className, timeframe = '1m', onIndicatorSettings }, ref) => {
    // Chart state management
    const timeState = useRef({ barWidth: 8, gap: 2, rightOffsetBars: 2 });
    const priceState = useRef({ auto: true, paddingPct: 0.05, verticalScale: 1.0 });
    
    // Multi-pane layout system
    const getPaneLayout = (containerHeight, activeIndicators, userPaneHeights) => {
      // Calculate pane heights and positions
    };
    
    // Real-time data handling
    useEffect(() => {
      const feed = new BinanceFeed();
      feed.subscribeKlines({
        symbol, interval: timeframe,
        onSnapshot: (arr) => setCandles(arr.map(toCandle)),
        onUpdate: (c) => {
          const newCandle = toCandle(c);
          setCandles(prev => updateCandles(prev, newCandle));
        }
      });
    }, [symbol, timeframe]);
  }
);
```

#### Indicator System
- **EMA (Exponential Moving Average)**: Configurable periods
- **RSI (Relative Strength Index)**: With optional EMA smoothing
- **Extensible Architecture**: Easy to add new indicators

### State Management

#### Zustand Stores
```typescript
// Auth store
export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  login: async (email, password) => { /* Supabase auth */ },
  logout: async () => { /* Clean logout */ }
}));

// Chart store
export const useChartStore = create<ChartState>((set) => ({
  symbol: 'BTCUSDT',
  timeframe: '1h',
  setSymbol: (symbol) => set({ symbol }),
  setTimeframe: (timeframe) => set({ timeframe })
}));
```

### Data Flow
1. **User Interaction** → React components
2. **State Updates** → Zustand stores
3. **API Calls** → TanStack Query
4. **Real-time Data** → Binance WebSocket → Canvas updates
5. **Authentication** → Supabase → Protected routes

## 3. Arbitrage System (Python)

### Core Structure
```
smartbots/
├── arb/                 # Arbitrage engine
│   ├── loop_builder.py  # Triangular loop discovery
│   ├── profit_calc.py   # Profit calculation with VWAP
│   ├── simulator.py     # Virtual execution simulator
│   ├── depth_feed.py    # Order book depth streams
│   ├── vwap.py          # VWAP calculations
│   └── ledger.py        # PnL tracking
├── scripts/             # CLI tools
│   ├── scan_pairs.py    # Static loop discovery
│   ├── scan_live.py     # Live top-of-book scanner
│   ├── scan_live_depth.py # Live VWAP depth scanner
│   └── simulate_live.py # Live simulation
└── requirements.txt     # Dependencies
```

### Key Features

#### Loop Discovery
- **Triangular Arbitrage**: USDT → X → Y → USDT patterns
- **Multi-Stablecoin Support**: USDT, USDC, FDUSD
- **Mixed Loops**: Cross-stablecoin arbitrage
- **Graph-based Algorithm**: Efficient loop detection

#### Profit Calculation
```python
class ProfitCalculator:
    def __init__(self, taker_fee_rate=0.001, min_profit_usdt=2.0, 
                 safety_margin_pct=0.001, trade_size_usdt=200.0, use_vwap=True):
        # Configuration for profit calculations
    
    def calculate_loop_profit(self, loop, quotes, orderbooks=None):
        # Calculate profit with VWAP fallback to top-of-book
        if self.use_vwap and orderbooks:
            return self._simulate_arbitrage_path_vwap(path, pairs, quotes, orderbooks)
        else:
            return self._simulate_arbitrage_path(path, pairs, quotes)
```

#### VWAP (Volume Weighted Average Price)
- **Realistic Execution**: Uses order book depth for accurate fills
- **Configurable Levels**: 5, 10, or 20 depth levels
- **Fallback System**: Top-of-book when depth unavailable
- **Performance Tracking**: Shows VWAP vs TOB per leg

#### Virtual Execution Simulator
```python
class VirtualExecutor:
    def execute(self, loop, quotes, orderbooks=None):
        # Simulate executing arbitrage loop with VWAP pricing
        # Returns detailed execution results with leg-by-leg breakdown
    
    def is_profitable_opportunity(self, loop, quotes, orderbooks=None):
        # Quick profitability check
        return self.profit_calc.calculate_loop_profit(loop, quotes, orderbooks)['is_profitable']
```

### Data Sources
- **Binance REST API**: Exchange info, symbols, historical data
- **Binance WebSocket**: Real-time price feeds (`!bookTicker`)
- **Binance Depth Streams**: Order book data for VWAP calculations

### Performance Metrics
- **Execution Rate**: Opportunities found vs executions performed
- **Win Rate**: Successful vs failed trades
- **PnL Tracking**: Net profit, drawdown, equity curve
- **Data Persistence**: CSV logs and SQLite database

## 4. Analytics Backend

### Structure
```
backend/analytics/
├── core/                # Core analytics engine
├── routers/            # FastAPI analytics endpoints
└── tests/              # Test suite
```

### Features
- **Rolling Correlation**: Pearson correlation between trading pairs
- **Spread Z-Score**: Statistical analysis of price spreads
- **OLS Hedge Ratio**: Optimal hedge ratio calculations
- **Time Series Analysis**: Configurable windows and intervals

## 5. Data Flow Architecture

### Real-time Data Flow
1. **Binance WebSocket** → Price updates
2. **Frontend BinanceFeed** → Normalized candle data
3. **Canvas Chart** → Real-time rendering
4. **Arbitrage Scanner** → Opportunity detection
5. **Virtual Simulator** → Execution simulation

### API Data Flow
1. **Frontend Request** → FastAPI Backend
2. **Binance Client** → REST API calls
3. **Data Processing** → Pydantic models
4. **Response** → JSON to frontend
5. **TanStack Query** → Caching and state management

### Authentication Flow
1. **User Login** → Supabase Auth
2. **JWT Token** → Stored in Zustand
3. **Protected Routes** → Route guards
4. **API Calls** → Token in headers
5. **Session Management** → Auto-refresh

## 6. Key Technologies and Dependencies

### Backend
- **FastAPI**: Modern Python web framework
- **Pydantic**: Data validation and serialization
- **aiohttp**: Async HTTP client for Binance API
- **websockets**: WebSocket client for real-time data
- **pandas**: Data analysis for analytics
- **numpy**: Numerical computations

### Frontend
- **React 18**: UI framework
- **TypeScript**: Type safety
- **Vite**: Build tool and dev server
- **Tailwind CSS**: Utility-first CSS
- **React Router**: Client-side routing
- **Zustand**: Lightweight state management
- **TanStack Query**: Server state management
- **Supabase**: Authentication and database
- **Canvas API**: Custom chart rendering
- **WebSocket API**: Real-time data

### Arbitrage System
- **httpx**: HTTP client for API calls
- **websockets**: WebSocket for real-time feeds
- **asyncio**: Async programming
- **sqlite3**: Local data storage
- **csv**: Trade logging

## 7. Development and Deployment

### Development Setup
```bash
# Backend
cd apps/api
pip install -e .
uvicorn main:app --reload --port 8000

# Frontend
cd apps/frontend
npm install
npm run dev

# Arbitrage System
cd smartbots
pip install -r requirements.txt
python -m scripts.scan_live --loops loops.json
```

### Environment Configuration
- **Frontend**: Vite dev server on port 5173
- **Backend**: FastAPI on port 8000
- **CORS**: Configured for localhost development
- **Supabase**: Environment variables for auth

## 8. Key Features Summary

### Trading Platform
- ✅ **Real-time Market Data**: Binance WebSocket integration
- ✅ **Advanced Charting**: Custom canvas-based charts with indicators
- ✅ **Portfolio Management**: Holdings, allocation, equity tracking
- ✅ **Exchange Connections**: Multi-exchange support (Binance, Coinbase, Kraken)
- ✅ **Authentication**: Secure user management with Supabase

### Arbitrage System
- ✅ **Triangular Arbitrage**: Automated loop discovery
- ✅ **VWAP Execution**: Realistic order book simulation
- ✅ **Virtual Trading**: Risk-free strategy testing
- ✅ **Performance Analytics**: Win rate, PnL, execution metrics
- ✅ **Multi-Stablecoin**: USDT, USDC, FDUSD support

### Analytics
- ✅ **Correlation Analysis**: Rolling correlation between pairs
- ✅ **Spread Analysis**: Z-score and hedge ratio calculations
- ✅ **Technical Indicators**: EMA, RSI with customization
- ✅ **Real-time Updates**: Live data processing and visualization

## 9. Security and Best Practices

### Security Measures
- **API Key Management**: Secure storage and rotation
- **CORS Configuration**: Restricted origins
- **Input Validation**: Pydantic models for data validation
- **Error Handling**: Comprehensive error management
- **Rate Limiting**: Respect Binance API limits

### Code Quality
- **TypeScript**: Full type safety in frontend
- **Pydantic**: Runtime type validation in backend
- **Error Boundaries**: React error handling
- **Async/Await**: Modern async patterns
- **Modular Design**: Separation of concerns

## 10. Future Enhancements

### Planned Features
- **Real Trading**: Integration with exchange APIs for live trading
- **Multi-Exchange**: Support for more exchanges
- **Advanced Indicators**: More technical analysis tools
- **Machine Learning**: Predictive models for opportunities
- **Mobile App**: React Native mobile application
- **Cloud Deployment**: Production deployment on cloud platforms

This comprehensive analysis covers all aspects of the Tradeeon codebase, from the sophisticated canvas charting system to the advanced arbitrage detection algorithms. The platform demonstrates modern web development practices with real-time data processing, advanced analytics, and a robust trading infrastructure.
