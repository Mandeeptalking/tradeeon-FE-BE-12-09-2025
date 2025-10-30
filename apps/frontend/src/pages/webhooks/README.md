# Webhook Strategies Module

## Overview
This module provides a framework for building and managing webhook-based trading strategies. It includes a complete UI scaffolding with state management, but no backend integration yet.

## Structure

```
webhooks/
├── WebhookStrategiesPage.tsx       # Main page component
├── components/
│   ├── StrategyList.tsx            # Sidebar with strategy cards
│   ├── StrategyTabs.tsx            # Tab navigation component
│   ├── StrategyRules.tsx           # Rules placeholder
│   ├── StrategyActions.tsx         # Actions placeholder
│   ├── StrategyMonitor.tsx         # Monitor placeholder
│   └── AddStrategyDialog.tsx       # Modal for creating strategies
└── README.md
```

## State Management

Located in `src/state/useWebhookStrategyStore.ts`:

- **strategies**: Array of mock webhook strategies
- **selectedStrategyId**: Currently selected strategy
- **Actions**: selectStrategy, addStrategy, deleteStrategy, updateStrategy

## Features

### Current Implementation
- ✅ Sidebar with strategy list
- ✅ Clickable strategy cards with status badges
- ✅ Add/Delete/Pause-Resume strategies
- ✅ Tab navigation (Rules, Actions, Monitor)
- ✅ Add Strategy dialog with name, mode, and status
- ✅ Zustand store for state management
- ✅ Mock data with 2 sample strategies

### Placeholder Sections
- Rules: Define strategy conditions
- Actions: Configure webhook actions
- Monitor: Real-time monitoring dashboard

## Usage

The page is accessible at `/webhook-strategies` and integrated into the dashboard navigation under "Tools".

## Next Steps

1. Implement Rules builder (conditions and logic)
2. Implement Actions configuration (webhook endpoints, payload)
3. Implement Monitor (real-time logs, metrics)
4. Connect to backend API
5. Add TradingView webhook integration

## Mock Data

The store includes 2 sample strategies:
- RSI Reversal Alert (Paper, Active)
- EMA Crossover Strategy (Live, Paused)

