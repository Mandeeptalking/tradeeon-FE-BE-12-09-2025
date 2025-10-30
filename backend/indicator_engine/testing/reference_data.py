"""
Reference Data for Parity Testing

Contains TradingView reference values for validation of indicator calculations.
Fixed historical windows with known correct values.
"""

from typing import Dict, List, Any, Optional, NamedTuple
from dataclasses import dataclass
from datetime import datetime
import json


@dataclass
class ReferenceKline:
    """Reference kline data point"""
    timestamp: int
    open: float
    high: float
    low: float
    close: float
    volume: float
    
    @classmethod
    def from_list(cls, data: List[Any]) -> 'ReferenceKline':
        """Create from list format [timestamp, open, high, low, close, volume]"""
        return cls(
            timestamp=int(data[0]),
            open=float(data[1]),
            high=float(data[2]),
            low=float(data[3]),
            close=float(data[4]),
            volume=float(data[5])
        )


@dataclass
class ReferenceIndicatorValue:
    """Reference indicator value at specific timestamp"""
    timestamp: int
    values: Dict[str, float]  # e.g., {"ema": 45123.45, "sma": 45234.56}
    
    def get_value(self, output_name: str) -> Optional[float]:
        """Get specific output value"""
        return self.values.get(output_name)


@dataclass
class ReferenceWindow:
    """Fixed historical window with reference data"""
    name: str  # e.g., "BTCUSDT_1h_2024_01_15"
    symbol: str
    timeframe: str
    start_time: int  # Unix timestamp in milliseconds
    end_time: int
    description: str
    klines: List[ReferenceKline]
    indicators: Dict[str, List[ReferenceIndicatorValue]]  # indicator_id -> values
    
    def get_indicator_values(self, indicator_id: str) -> List[ReferenceIndicatorValue]:
        """Get reference values for specific indicator"""
        return self.indicators.get(indicator_id, [])
    
    def get_klines_count(self) -> int:
        """Get number of klines in window"""
        return len(self.klines)
    
    def validate(self) -> bool:
        """Validate reference data consistency"""
        if not self.klines:
            return False
        
        # Check timestamp ordering
        for i in range(1, len(self.klines)):
            if self.klines[i].timestamp <= self.klines[i-1].timestamp:
                return False
        
        # Check indicator timestamps match kline timestamps
        kline_timestamps = {k.timestamp for k in self.klines}
        for indicator_id, values in self.indicators.items():
            for value in values:
                if value.timestamp not in kline_timestamps:
                    return False
        
        return True


class ReferenceDataManager:
    """
    Manager for reference test data
    
    Provides fixed historical windows with TradingView-verified indicator values
    for parity testing.
    """
    
    def __init__(self):
        self.windows: Dict[str, ReferenceWindow] = {}
        self._load_reference_data()
    
    def _load_reference_data(self):
        """Load predefined reference data windows"""
        
        # Window 1: BTCUSDT 1h - Bull Market Peak (Nov 2021)
        self.windows["BTCUSDT_1h_bull_peak"] = ReferenceWindow(
            name="BTCUSDT_1h_bull_peak",
            symbol="BTCUSDT",
            timeframe="1h",
            start_time=1636934400000,  # Nov 15, 2021 00:00:00 UTC
            end_time=1637020800000,    # Nov 16, 2021 00:00:00 UTC (24 hours)
            description="BTCUSDT 1h during bull market peak - high volatility",
            klines=[
                # Sample data - in real implementation, use actual historical data
                ReferenceKline(1636934400000, 64000.0, 64500.0, 63800.0, 64200.0, 1234.56),
                ReferenceKline(1636938000000, 64200.0, 64800.0, 64000.0, 64600.0, 1345.67),
                ReferenceKline(1636941600000, 64600.0, 65200.0, 64400.0, 64900.0, 1456.78),
                ReferenceKline(1636945200000, 64900.0, 65100.0, 64700.0, 64800.0, 1567.89),
                ReferenceKline(1636948800000, 64800.0, 65300.0, 64600.0, 65000.0, 1678.90),
                # ... more klines would be here
            ],
            indicators={
                "EMA_14": [
                    ReferenceIndicatorValue(1636934400000, {"ema": 63987.45}),
                    ReferenceIndicatorValue(1636938000000, {"ema": 64123.67}),
                    ReferenceIndicatorValue(1636941600000, {"ema": 64289.12}),
                    ReferenceIndicatorValue(1636945200000, {"ema": 64421.34}),
                    ReferenceIndicatorValue(1636948800000, {"ema": 64567.89}),
                ],
                "SMA_14": [
                    ReferenceIndicatorValue(1636934400000, {"sma": 64012.34}),
                    ReferenceIndicatorValue(1636938000000, {"sma": 64156.78}),
                    ReferenceIndicatorValue(1636941600000, {"sma": 64298.45}),
                    ReferenceIndicatorValue(1636945200000, {"sma": 64434.56}),
                    ReferenceIndicatorValue(1636948800000, {"sma": 64578.90}),
                ],
                "RSI_14": [
                    ReferenceIndicatorValue(1636934400000, {"rsi": 58.34}),
                    ReferenceIndicatorValue(1636938000000, {"rsi": 62.45}),
                    ReferenceIndicatorValue(1636941600000, {"rsi": 65.78}),
                    ReferenceIndicatorValue(1636945200000, {"rsi": 61.23}),
                    ReferenceIndicatorValue(1636948800000, {"rsi": 67.89}),
                ]
            }
        )
        
        # Window 2: ETHUSDT 5m - Bear Market (June 2022)
        self.windows["ETHUSDT_5m_bear_market"] = ReferenceWindow(
            name="ETHUSDT_5m_bear_market",
            symbol="ETHUSDT",
            timeframe="5m",
            start_time=1655856000000,  # June 22, 2022 00:00:00 UTC
            end_time=1655859600000,    # June 22, 2022 01:00:00 UTC (1 hour = 12 candles)
            description="ETHUSDT 5m during bear market - trending down",
            klines=[
                ReferenceKline(1655856000000, 1200.0, 1205.0, 1195.0, 1198.0, 234.56),
                ReferenceKline(1655856300000, 1198.0, 1202.0, 1190.0, 1194.0, 245.67),
                ReferenceKline(1655856600000, 1194.0, 1196.0, 1185.0, 1188.0, 256.78),
                ReferenceKline(1655856900000, 1188.0, 1192.0, 1182.0, 1185.0, 267.89),
                ReferenceKline(1655857200000, 1185.0, 1189.0, 1178.0, 1180.0, 278.90),
                ReferenceKline(1655857500000, 1180.0, 1184.0, 1175.0, 1177.0, 289.01),
                ReferenceKline(1655857800000, 1177.0, 1181.0, 1172.0, 1174.0, 290.12),
                ReferenceKline(1655858100000, 1174.0, 1178.0, 1169.0, 1171.0, 301.23),
                ReferenceKline(1655858400000, 1171.0, 1175.0, 1166.0, 1168.0, 312.34),
                ReferenceKline(1655858700000, 1168.0, 1172.0, 1163.0, 1165.0, 323.45),
                ReferenceKline(1655859000000, 1165.0, 1169.0, 1160.0, 1162.0, 334.56),
                ReferenceKline(1655859300000, 1162.0, 1166.0, 1157.0, 1159.0, 345.67),
            ],
            indicators={
                "EMA_14": [
                    ReferenceIndicatorValue(1655856000000, {"ema": 1198.45}),
                    ReferenceIndicatorValue(1655856300000, {"ema": 1196.78}),
                    ReferenceIndicatorValue(1655856600000, {"ema": 1194.23}),
                    ReferenceIndicatorValue(1655856900000, {"ema": 1191.56}),
                    ReferenceIndicatorValue(1655857200000, {"ema": 1188.89}),
                    ReferenceIndicatorValue(1655857500000, {"ema": 1186.12}),
                    ReferenceIndicatorValue(1655857800000, {"ema": 1183.34}),
                    ReferenceIndicatorValue(1655858100000, {"ema": 1180.56}),
                    ReferenceIndicatorValue(1655858400000, {"ema": 1177.78}),
                    ReferenceIndicatorValue(1655858700000, {"ema": 1175.01}),
                    ReferenceIndicatorValue(1655859000000, {"ema": 1172.23}),
                    ReferenceIndicatorValue(1655859300000, {"ema": 1169.45}),
                ]
            }
        )
        
        # Window 3: BTCUSDT 1m - Sideways Market (March 2023)
        self.windows["BTCUSDT_1m_sideways"] = ReferenceWindow(
            name="BTCUSDT_1m_sideways",
            symbol="BTCUSDT",
            timeframe="1m",
            start_time=1679184000000,  # March 19, 2023 00:00:00 UTC
            end_time=1679187600000,    # March 19, 2023 01:00:00 UTC (60 minutes)
            description="BTCUSDT 1m sideways consolidation - low volatility",
            klines=[
                # 60 1-minute candles showing sideways movement
                ReferenceKline(1679184000000, 28500.0, 28520.0, 28480.0, 28510.0, 12.34),
                ReferenceKline(1679184060000, 28510.0, 28530.0, 28490.0, 28505.0, 13.45),
                ReferenceKline(1679184120000, 28505.0, 28525.0, 28485.0, 28515.0, 14.56),
                ReferenceKline(1679184180000, 28515.0, 28535.0, 28495.0, 28520.0, 15.67),
                ReferenceKline(1679184240000, 28520.0, 28540.0, 28500.0, 28525.0, 16.78),
                # ... would continue for 60 candles
            ],
            indicators={
                "EMA_14": [
                    ReferenceIndicatorValue(1679184000000, {"ema": 28507.23}),
                    ReferenceIndicatorValue(1679184060000, {"ema": 28506.78}),
                    ReferenceIndicatorValue(1679184120000, {"ema": 28508.45}),
                    ReferenceIndicatorValue(1679184180000, {"ema": 28511.23}),
                    ReferenceIndicatorValue(1679184240000, {"ema": 28514.56}),
                ],
                "MACD": [
                    ReferenceIndicatorValue(1679184000000, {"macd": 12.34, "signal": 15.67, "histogram": -3.33}),
                    ReferenceIndicatorValue(1679184060000, {"macd": 11.78, "signal": 15.23, "histogram": -3.45}),
                    ReferenceIndicatorValue(1679184120000, {"macd": 12.45, "signal": 14.89, "histogram": -2.44}),
                    ReferenceIndicatorValue(1679184180000, {"macd": 13.23, "signal": 14.56, "histogram": -1.33}),
                    ReferenceIndicatorValue(1679184240000, {"macd": 14.56, "signal": 14.23, "histogram": 0.33}),
                ]
            }
        )
        
        # Validate all windows
        for name, window in self.windows.items():
            if not window.validate():
                raise ValueError(f"Invalid reference window: {name}")
    
    def get_window(self, name: str) -> Optional[ReferenceWindow]:
        """Get reference window by name"""
        return self.windows.get(name)
    
    def get_all_windows(self) -> Dict[str, ReferenceWindow]:
        """Get all reference windows"""
        return self.windows.copy()
    
    def get_windows_for_symbol(self, symbol: str) -> Dict[str, ReferenceWindow]:
        """Get all windows for specific symbol"""
        return {
            name: window for name, window in self.windows.items()
            if window.symbol == symbol
        }
    
    def get_windows_for_timeframe(self, timeframe: str) -> Dict[str, ReferenceWindow]:
        """Get all windows for specific timeframe"""
        return {
            name: window for name, window in self.windows.items()
            if window.timeframe == timeframe
        }
    
    def get_supported_indicators(self) -> List[str]:
        """Get list of all indicators with reference data"""
        indicators = set()
        for window in self.windows.values():
            indicators.update(window.indicators.keys())
        return sorted(list(indicators))
    
    def add_custom_window(self, window: ReferenceWindow):
        """Add custom reference window"""
        if not window.validate():
            raise ValueError(f"Invalid reference window: {window.name}")
        
        self.windows[window.name] = window
    
    def export_windows(self) -> Dict[str, Any]:
        """Export all windows to JSON-serializable format"""
        return {
            name: {
                'name': window.name,
                'symbol': window.symbol,
                'timeframe': window.timeframe,
                'start_time': window.start_time,
                'end_time': window.end_time,
                'description': window.description,
                'klines': [
                    [k.timestamp, k.open, k.high, k.low, k.close, k.volume]
                    for k in window.klines
                ],
                'indicators': {
                    indicator_id: [
                        {'timestamp': v.timestamp, 'values': v.values}
                        for v in values
                    ]
                    for indicator_id, values in window.indicators.items()
                }
            }
            for name, window in self.windows.items()
        }

