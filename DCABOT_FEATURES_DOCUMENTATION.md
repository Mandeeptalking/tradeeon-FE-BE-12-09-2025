# DCABot.tsx - Complete Feature Documentation

This document provides a comprehensive overview of all features implemented in the `DCABot.tsx` component before its removal.

## 📋 Table of Contents
1. [Core Bot Configuration](#core-bot-configuration)
2. [Trading Modes](#trading-modes)
3. [Exchange & Pair Management](#exchange--pair-management)
4. [Entry Conditions](#entry-conditions)
5. [DCA Rules & Configuration](#dca-rules--configuration)
6. [Advanced Features (Phase 1)](#advanced-features-phase-1)
7. [Bot Status & Monitoring](#bot-status--monitoring)
8. [UI Components](#ui-components)

---

## Core Bot Configuration

### Basic Settings
- **Bot Name**: Customizable bot name (default: "ETH/USDT Classic trading")
- **Market Type**: Spot or Futures trading
- **Direction**: Long or Short positions
- **Bot Type**: Single pair or Multi-pair trading
- **Profit Currency**: Quote currency (USDT) or Base currency

### Order Configuration
- **Base Order Size**: Initial order amount (default: 20)
- **Base Order Currency**: Currency for initial order (auto-detected from pair)
- **Start Order Type**: Market or Limit order
- **Trade Start Condition**: 
  - Immediate start
  - Wait for entry signal/condition

---

## Trading Modes

### Test Mode (Paper Trading)
- Simulated trading with live market data
- No real money at risk
- Full feature testing

### Live Mode (Real Trading)
- Real money trading
- Requires confirmation modal
- Warning system before activation

---

## Exchange & Pair Management

### Exchange Selection
- Integration with Connections API
- Support for multiple exchanges:
  - Binance Spot
  - Binance Futures
  - Other exchanges via connection system
- Connection status validation
- Exchange-specific pair fetching

### Pair Management
- **Single Pair Mode**: One trading pair
- **Multi-Pair Mode**: Multiple pairs simultaneously
- **Pair Search**: Searchable dropdown with filtering
- **Quote Currency Filter**: Filter pairs by quote currency (USDT, BTC, etc.)
- **Binance Pairs API**: Fetches live trading pairs from Binance
- **Pair Selection**: Click to add/remove pairs
- **Helper Pairs**: Additional pairs for analysis

### Pair Features
- Real-time pair fetching from Binance API
- Status filtering (only TRADING pairs)
- Search functionality
- Multi-select support
- Visual pair management UI

---

## Entry Conditions

### Condition Types
1. **RSI Conditions**
   - RSI (Relative Strength Index)
   - Period configuration (default: 14)
   - Multiple operators:
     - `crosses_below`: RSI crosses below threshold
     - `crosses_above`: RSI crosses above threshold
     - `below`: RSI is below value
     - `above`: RSI is above value
     - `between`: RSI is between two values (lowerBound, upperBound)

2. **Moving Average Conditions**
   - EMA (Exponential Moving Average)
   - SMA (Simple Moving Average)
   - Fast/Slow MA crossovers
   - Price vs MA comparisons
   - Configurable periods

3. **MACD Conditions**
   - MACD line analysis
   - Signal line analysis
   - Histogram analysis
   - Customizable periods:
     - Fast period (default: 12)
     - Slow period (default: 26)
     - Signal period (default: 9)

4. **MFI Conditions** (Money Flow Index)
   - Period configuration
   - Threshold-based triggers

5. **CCI Conditions** (Commodity Channel Index)
   - Period configuration
   - Overbought/oversold detection

6. **Price Action Conditions**
   - Price vs Moving Average
   - Percentage-based price movements
   - MA type selection (EMA/SMA)
   - MA length configuration

### Condition Configuration
- **Timeframe**: 1m, 5m, 15m, 1h, 4h, 1d, etc.
- **Operators**: 
  - Comparison operators (>, <, =, >=, <=)
  - Cross operators (crosses_above, crosses_below)
  - Between operator (with lower/upper bounds)
- **Values**: Numeric thresholds
- **Periods**: Indicator-specific periods

### Condition Playbook System
- **Multiple Conditions**: Create multiple entry conditions
- **Logic Gates**: 
  - `ALL`: All conditions must be true
  - `ANY`: At least one condition must be true
- **Evaluation Order**:
  - Priority-based: Evaluate by priority number
  - Sequential: Evaluate in order
- **Priority System**: Assign priority numbers to conditions
- **Validity Duration**: 
  - Time-based validity (bars or minutes)
  - Configurable duration per condition
- **Condition Management**:
  - Add/Edit/Delete conditions
  - Enable/Disable individual conditions
  - Save conditions to playbook
  - Edit existing playbook conditions

---

## DCA Rules & Configuration

### DCA Trigger Types
1. **Down from Last Entry**
   - Triggers when price drops X% from last DCA entry
   - Configurable percentage (default: 2.0%)

2. **Down from Average Price**
   - Triggers when price drops X% from average entry price
   - Configurable percentage (default: 5.0%)

3. **Loss by Percent**
   - Triggers when position is down X%
   - Configurable percentage (default: 10.0%)

4. **Loss by Amount**
   - Triggers when position loss reaches X amount
   - Configurable amount (default: 100.0)

5. **Custom Condition**
   - Custom indicator-based triggers
   - Full condition builder support

### DCA Amount Configuration
- **Amount Type**: 
  - Fixed amount
  - Percentage of base order
- **DCA Amount**: Fixed amount value (default: 100.0)
- **DCA Percentage**: Percentage of base order (default: 10.0%)
- **DCA Multiplier**: Multiplier for progressive DCA (default: 1.0)

### DCA Limits
- **Max DCA per Position**: Maximum DCAs per single position (default: 5)
- **Max DCA Across All Positions**: Total DCAs across all positions (default: 20)
- **Max Total Investment per Position**: Maximum investment per position (default: 1000)

### DCA Spacing & Timing
- **DCA Cooldown**: 
  - Value: Configurable cooldown period
  - Unit: Minutes or Bars
- **Wait for Previous DCA**: Wait for previous DCA to complete before next
- **Stop DCA on Loss**:
  - Enabled/Disabled toggle
  - Type: Percent or Amount
  - Threshold configuration

---

## Advanced Features (Phase 1)

### 1. Market Regime Detection
**Purpose**: Pause trading during unfavorable market conditions

**Configuration**:
- **Enabled Toggle**: Enable/disable market regime detection
- **Regime Timeframe**: Timeframe for regime analysis (default: 1d)
- **Allow Entry Override**: Allow entry conditions to override pause

**Pause Conditions**:
- **Below Moving Average**: Pause when price is below MA
- **MA Period**: Moving average period (default: 200)
- **RSI Threshold**: RSI threshold for pause (default: 30)
- **Consecutive Periods**: Number of consecutive periods (default: 7)
- **Timeframe Scaling**: Scale periods based on timeframe

**Resume Conditions**:
- **Volume Decrease Threshold**: % decrease in volume (default: 20%)
- **Consolidation Periods**: Periods of consolidation (default: 5)
- **Price Range Percent**: ±% price range for consolidation (default: 5%)

**Notifications**: Enable/disable regime change notifications

### 2. Dynamic DCA Amount Scaling
**Purpose**: Adjust DCA amounts based on market conditions

**Configuration**:
- **Enabled Toggle**: Enable/disable dynamic scaling

**Volatility Multipliers**:
- Low Volatility: 1.2x (increase DCA)
- Normal Volatility: 1.0x (standard DCA)
- High Volatility: 0.7x (decrease DCA)

**Support/Resistance Multipliers**:
- Near Strong Support: 1.5x (increase DCA)
- Neutral Zone: 1.0x (standard DCA)
- Near Resistance: 0.5x (decrease DCA)

**Volume Profile Weight**: Enable/disable volume profile weighting

**Fear & Greed Index**:
- Extreme Fear: 1.8x (increase DCA)
- Neutral: 1.0x (standard DCA)
- Extreme Greed: 0.5x (decrease DCA)

### 3. Intelligent Profit Taking Strategy
**Purpose**: Optimize profit-taking with multiple strategies

**Configuration**:
- **Enabled Toggle**: Enable/disable profit strategy

**Partial Targets**:
- Multiple profit targets with sell percentages
- Example: 15% profit → sell 25%, 25% profit → sell 50%
- Configurable targets array

**Trailing Stop**:
- **Enabled**: Enable/disable trailing stop
- **Activation Profit**: Start trailing after X% profit (default: 10%)
- **Trailing Distance**: Maintain X% below peak (default: 5%)
- **Only Up**: Only move stop up, never down

**Take Profit and Restart**:
- **Enabled**: Enable/disable take profit restart
- **Profit Target**: Target profit % (default: 30%)
- **Use Original Capital**: Restart with original capital amount

**Time-Based Exit**:
- **Enabled**: Enable/disable time-based exit
- **Max Hold Days**: Maximum holding period (default: 30 days)
- **Min Profit**: Minimum profit required for exit (default: 10%)

### 4. Emergency Brake System
**Purpose**: Protect against flash crashes and market-wide crashes

**Configuration**:
- **Enabled Toggle**: Enable/disable emergency brake

**Circuit Breaker**:
- **Enabled**: Enable/disable circuit breaker
- **Flash Crash Percent**: % drop to trigger (default: 10%)
- **Time Window Minutes**: Time window for detection (default: 5 minutes)

**Market-Wide Crash Detection**:
- **Enabled**: Enable/disable market crash detection
- **Correlation Threshold**: Correlation threshold (default: 0.8 / 80%)
- **Market Drop Percent**: Market-wide drop % (default: 15%)

**Recovery Mode**:
- **Enabled**: Enable/disable recovery mode
- **Stabilization Bars**: Bars required for stabilization (default: 10)
- **Resume After Stabilized**: Auto-resume after stabilization

---

## Bot Status & Monitoring

### Status Polling
- Real-time status updates
- Configurable polling interval
- Status ref tracking (prevents dependency issues)
- Automatic polling on bot start

### Bot Status Information
- Current bot state
- Position information
- DCA count and status
- Profit/loss tracking
- Connection status

### Conflict Detection
- Detects configuration conflicts
- Warning system for conflicts
- Detailed conflict information
- Prevents invalid bot creation

---

## UI Components

### Modals
1. **Live Trading Confirmation Modal**
   - Warning about real money trading
   - Confirmation required before live mode

2. **Bot Summary Modal**
   - Complete bot configuration summary
   - Shows all settings before creation
   - Final confirmation step

### Information Dialogs
1. **Conditions Info Dialog**
   - Explains entry conditions
   - Usage instructions

2. **DCA Rules Info Dialog**
   - Explains DCA rules
   - Configuration guide

### Form Sections
- **Basic Configuration**: Bot name, market, direction, pairs
- **Entry Conditions**: Condition builder and playbook
- **DCA Configuration**: DCA rules and amounts
- **Advanced Features**: Phase 1 features configuration
- **Connection Status**: Exchange connection validation

### Validation
- **Config Validation**: Validates bot configuration before creation
- **Error Messages**: Clear error messages for invalid configs
- **Conflict Detection**: Warns about configuration conflicts
- **Connection Validation**: Ensures valid exchange connection

---

## API Integration

### Endpoints Used
- `/connections` - Fetch exchange connections
- `/bots` - Bot creation and management
- Binance API - Pair fetching and market data

### Authentication
- Uses authenticated fetch
- JWT token from Supabase
- Connection-based API access

---

## Key Functions

### Bot Creation
- `handleStartBot()`: Validates and creates bot
- `handleConfirmBotCreation()`: Final confirmation and API call
- `validateBotConfig()`: Comprehensive validation

### Condition Management
- `updatePlaybookCondition()`: Update playbook condition
- `saveConditionToPlaybook()`: Save condition to playbook
- Condition builder functions

### Pair Management
- `handlePairClick()`: Add/remove pairs
- `handleRemovePair()`: Remove specific pair
- `handleBotTypeChange()`: Switch between single/multi pair

### Connection Management
- `getConnectionStatus()`: Get connection status
- `fetchConnections()`: Load exchange connections

---

## Technical Details

### State Management
- Multiple useState hooks for configuration
- useRef for polling state
- useEffect for data fetching and updates

### Dependencies
- React Router (navigation)
- Sonner (toast notifications)
- Lucide React (icons)
- Custom UI components (Dialog, Tooltip)
- Custom API utilities

### File Size
- Approximately 5,927 lines of code
- Large component with extensive features
- Could benefit from component extraction

---

## Migration Notes

### If Re-implementing
1. Consider breaking into smaller components
2. Extract reusable logic into hooks
3. Separate form sections into components
4. Create shared types/interfaces
5. Consider state management library for complex state

### Preserved Functionality
- All features documented above
- API integration patterns
- Validation logic
- UI component structure

---

## Conclusion

The DCABot.tsx component was a comprehensive DCA trading bot configuration interface with:
- Advanced entry condition system
- Flexible DCA rules
- Market regime detection
- Dynamic scaling
- Intelligent profit taking
- Emergency brake system
- Multi-pair support
- Test and live trading modes

All features are preserved in git history and can be referenced or re-implemented as needed.

