# Phase-1: Indicator Foundations

This directory contains the Phase-1 implementation of the indicator system foundations for Lightweight Charts.

## Overview

Phase-1 provides a complete foundation for indicators without any actual indicator calculations. It includes:

- **Type-safe contracts** with Zod validation
- **Data ingestion** with historical and live data support
- **State management** with ring buffers and series state
- **Renderer system** with pane management and series mapping
- **UI components** for crosshair sync, autoscale, and diagnostics
- **Demo page** with mock indicators

## Architecture

```
src/
├── contracts/           # Type definitions and validation
│   ├── candle.ts       # Candle data structure
│   ├── indicator.ts    # Indicator specifications and metadata
│   └── validation.ts   # Zod schemas and validation functions
├── engine/             # Data processing and state management
│   ├── ingest/         # Data ingestion (historical + live)
│   ├── state/          # Ring buffers and series state
│   └── bridge/         # Indicator bus for pub/sub
├── renderer/           # Chart rendering system
│   ├── panes/          # Pane management
│   ├── series/         # Series mapping and management
│   └── ui/             # UI components (crosshair, autoscale, diagnostics)
└── pages/              # Demo pages
    └── ChartStudio.tsx # Main demo page
```

## Key Components

### Contracts

- **Candle**: Price bar data with validation
- **IndicatorSpec**: Indicator configuration
- **IndicatorInstanceMeta**: Runtime indicator metadata
- **IndicatorUpdate**: Live indicator data updates

### Engine

- **HistoryClient**: Loads historical data (mock or real)
- **LiveStreamClient**: Real-time data streaming
- **PartialFinalController**: Manages bar lifecycle
- **RingBuffer**: Efficient circular buffer for time series
- **SeriesState**: Manages price and indicator data
- **IndicatorBus**: Pub/sub system for indicator updates

### Renderer

- **PaneManager**: Creates and manages chart panes
- **SeriesMapper**: Maps data to Lightweight Charts series
- **CrosshairSync**: Synchronizes crosshairs across panes
- **AutoscaleController**: Manages price scale behavior
- **DiagnosticsOverlay**: Performance monitoring UI

## Usage

### Basic Setup

```typescript
import { ChartRoot } from './renderer/ChartRoot';
import { createSeriesState } from './engine/state/seriesState';
import { createIndicatorBus } from './engine/bridge/indicatorBus';

// Create core instances
const seriesState = createSeriesState(1000);
const indicatorBus = createIndicatorBus(seriesState);

// Render chart
<ChartRoot
  symbol="BTCUSDT"
  timeframe="1m"
  seriesState={seriesState}
  indicatorBus={indicatorBus}
  showDiagnostics={true}
/>
```

### Adding Mock Indicators

```typescript
import { createIndicatorSpec, createIndicatorInstanceMeta } from './contracts/indicator';

// Create indicator specification
const rsiSpec = createIndicatorSpec('RSI', { period: 14 }, '1m', 'new');

// Create indicator instance metadata
const rsiMeta = createIndicatorInstanceMeta(
  rsiSpec.id,
  [{ key: 'rsi', type: 'line', overlay: false, levels: [30, 50, 70] }],
  14,
  'new'
);

// Add to chart (implementation depends on your setup)
chartRoot.addIndicatorPane(rsiMeta);
```

### Data Flow

1. **Historical Data**: `HistoryClient` → `SeriesState` → `ChartRoot`
2. **Live Data**: `LiveStreamClient` → `PartialFinalController` → `SeriesState` → `ChartRoot`
3. **Indicator Data**: `IndicatorBus` → `SeriesState` → `ChartRoot`

## Testing

Run the test suite:

```bash
npm run test
```

Tests cover:
- Contract validation
- Ring buffer operations
- Partial/final bar lifecycle
- Series state management

## Demo Page

Visit `/chart-studio` to see the complete system in action:

- Add/remove mock indicators (RSI, MACD, EMA, BB)
- Toggle live data simulation
- View performance diagnostics
- Test pane management and crosshair sync

## Phase-2 Integration

To add real indicator calculations in Phase-2:

1. **Replace mock data generation** with real indicator calculations
2. **Connect to indicator calculation engine** via the `IndicatorBus`
3. **Add new indicator types** by extending the contracts
4. **Implement custom renderers** for new series types

The foundation is designed to be completely agnostic to the actual indicator calculation logic, making Phase-2 integration straightforward.

## Performance Considerations

- **Ring buffers** limit memory usage with configurable capacity
- **Delta updates** avoid full redraws on every update
- **Throttled rendering** prevents UI blocking during high-frequency updates
- **Diagnostics overlay** provides real-time performance monitoring

## Error Handling

- **Validation errors** are caught and displayed in the UI
- **WebSocket reconnection** handles network issues gracefully
- **Error boundaries** prevent chart crashes from propagating
- **Graceful degradation** when indicators fail to load

## Browser Support

- Modern browsers with ES2020+ support
- WebSocket support for live data
- Canvas support for Lightweight Charts
- Performance API for diagnostics

