"""Mock calculator for testing without TA-Lib."""

import numpy as np
from typing import Dict, List, Any, Optional
from models import PriceData, IndicatorResponse, IndicatorConfig
from indicator_registry import get_indicator_config

class MockIndicatorCalculator:
    """Mock calculator that simulates TA-Lib calculations."""
    
    def __init__(self):
        self.supported_indicators = [
            'SMA', 'EMA', 'RSI', 'MACD', 'STOCH', 'BBANDS', 'ATR', 'ADX'
        ]
    
    def calculate_indicator(
        self, 
        price_data: List[PriceData], 
        indicator_id: str, 
        parameters: Dict[str, Any]
    ) -> IndicatorResponse:
        """Calculate indicator values using mock implementations."""
        
        try:
            # Get indicator configuration
            config = get_indicator_config(indicator_id)
            if not config:
                return IndicatorResponse(
                    symbol="",
                    interval="",
                    indicator=indicator_id,
                    parameters=parameters,
                    values=[],
                    success=False,
                    error=f"Indicator '{indicator_id}' not found"
                )
            
            # Convert price data to numpy arrays
            prices = self._prepare_price_arrays(price_data)
            
            # Calculate indicator using mock implementations
            indicator_values = self._calculate_mock_indicator(
                config.talib_function, 
                prices, 
                parameters
            )
            
            # Format results
            formatted_values = self._format_indicator_values(
                price_data, 
                indicator_values, 
                config.outputs
            )
            
            return IndicatorResponse(
                symbol="",  # Will be set by caller
                interval="",  # Will be set by caller
                indicator=indicator_id,
                parameters=parameters,
                values=formatted_values,
                success=True,
                error=None
            )
            
        except Exception as e:
            return IndicatorResponse(
                symbol="",
                interval="",
                indicator=indicator_id,
                parameters=parameters,
                values=[],
                success=False,
                error=f"Calculation error: {str(e)}"
            )
    
    def _prepare_price_arrays(self, price_data: List[PriceData]) -> Dict[str, np.ndarray]:
        """Convert price data to numpy arrays."""
        if not price_data:
            raise ValueError("No price data provided")
        
        return {
            'open': np.array([p.open for p in price_data], dtype=np.float64),
            'high': np.array([p.high for p in price_data], dtype=np.float64),
            'low': np.array([p.low for p in price_data], dtype=np.float64),
            'close': np.array([p.close for p in price_data], dtype=np.float64),
            'volume': np.array([p.volume for p in price_data], dtype=np.float64),
        }
    
    def _calculate_mock_indicator(
        self, 
        talib_function: str, 
        prices: Dict[str, np.ndarray], 
        parameters: Dict[str, Any]
    ) -> Dict[str, np.ndarray]:
        """Calculate indicator using mock implementations."""
        
        close = prices['close']
        high = prices['high']
        low = prices['low']
        volume = prices['volume']
        
        if talib_function == 'SMA':
            period = parameters.get('timeperiod', 20)
            result = self._mock_sma(close, period)
            return {'sma': result}
        
        elif talib_function == 'EMA':
            period = parameters.get('timeperiod', 20)
            result = self._mock_ema(close, period)
            return {'ema': result}
        
        elif talib_function == 'RSI':
            period = parameters.get('timeperiod', 14)
            result = self._mock_rsi(close, period)
            return {'rsi': result}
        
        elif talib_function == 'MACD':
            fast = parameters.get('fastperiod', 12)
            slow = parameters.get('slowperiod', 26)
            signal = parameters.get('signalperiod', 9)
            macd, signal_line, histogram = self._mock_macd(close, fast, slow, signal)
            return {
                'macd': macd,
                'signal': signal_line,
                'histogram': histogram
            }
        
        elif talib_function == 'STOCH':
            k_period = parameters.get('fastk_period', 5)
            d_period = parameters.get('slowk_period', 3)
            slowk, slowd = self._mock_stoch(high, low, close, k_period, d_period)
            return {'slowk': slowk, 'slowd': slowd}
        
        elif talib_function == 'BBANDS':
            period = parameters.get('timeperiod', 20)
            std_dev = parameters.get('nbdevup', 2)
            upper, middle, lower = self._mock_bbands(close, period, std_dev)
            return {
                'upper': upper,
                'middle': middle,
                'lower': lower
            }
        
        elif talib_function == 'ATR':
            period = parameters.get('timeperiod', 14)
            result = self._mock_atr(high, low, close, period)
            return {'atr': result}
        
        elif talib_function == 'ADX':
            period = parameters.get('timeperiod', 14)
            result = self._mock_adx(high, low, close, period)
            return {'adx': result}
        
        else:
            # Default mock implementation
            result = np.random.uniform(0, 100, len(close))
            return {'value': result}
    
    def _mock_sma(self, prices: np.ndarray, period: int) -> np.ndarray:
        """Mock Simple Moving Average."""
        result = np.full(len(prices), np.nan)
        for i in range(period - 1, len(prices)):
            result[i] = np.mean(prices[i - period + 1:i + 1])
        return result
    
    def _mock_ema(self, prices: np.ndarray, period: int) -> np.ndarray:
        """Mock Exponential Moving Average."""
        alpha = 2.0 / (period + 1)
        result = np.full(len(prices), np.nan)
        result[0] = prices[0]
        for i in range(1, len(prices)):
            result[i] = alpha * prices[i] + (1 - alpha) * result[i - 1]
        return result
    
    def _mock_rsi(self, prices: np.ndarray, period: int) -> np.ndarray:
        """Mock Relative Strength Index."""
        result = np.full(len(prices), np.nan)
        deltas = np.diff(prices)
        gains = np.where(deltas > 0, deltas, 0)
        losses = np.where(deltas < 0, -deltas, 0)
        
        for i in range(period, len(prices)):
            avg_gain = np.mean(gains[i - period:i])
            avg_loss = np.mean(losses[i - period:i])
            if avg_loss == 0:
                result[i] = 100
            else:
                rs = avg_gain / avg_loss
                result[i] = 100 - (100 / (1 + rs))
        return result
    
    def _mock_macd(self, prices: np.ndarray, fast: int, slow: int, signal: int) -> tuple:
        """Mock MACD."""
        ema_fast = self._mock_ema(prices, fast)
        ema_slow = self._mock_ema(prices, slow)
        macd = ema_fast - ema_slow
        signal_line = self._mock_ema(macd, signal)
        histogram = macd - signal_line
        return macd, signal_line, histogram
    
    def _mock_stoch(self, high: np.ndarray, low: np.ndarray, close: np.ndarray, k_period: int, d_period: int) -> tuple:
        """Mock Stochastic Oscillator."""
        slowk = np.full(len(close), np.nan)
        for i in range(k_period - 1, len(close)):
            highest = np.max(high[i - k_period + 1:i + 1])
            lowest = np.min(low[i - k_period + 1:i + 1])
            if highest != lowest:
                slowk[i] = 100 * (close[i] - lowest) / (highest - lowest)
            else:
                slowk[i] = 50
        
        slowd = self._mock_sma(slowk, d_period)
        return slowk, slowd
    
    def _mock_bbands(self, prices: np.ndarray, period: int, std_dev: float) -> tuple:
        """Mock Bollinger Bands."""
        sma = self._mock_sma(prices, period)
        std = np.full(len(prices), np.nan)
        
        for i in range(period - 1, len(prices)):
            std[i] = np.std(prices[i - period + 1:i + 1])
        
        upper = sma + (std * std_dev)
        lower = sma - (std * std_dev)
        return upper, sma, lower
    
    def _mock_atr(self, high: np.ndarray, low: np.ndarray, close: np.ndarray, period: int) -> np.ndarray:
        """Mock Average True Range."""
        tr1 = high - low
        tr2 = np.abs(high - np.roll(close, 1))
        tr3 = np.abs(low - np.roll(close, 1))
        tr = np.maximum(tr1, np.maximum(tr2, tr3))
        
        result = np.full(len(close), np.nan)
        for i in range(period - 1, len(close)):
            result[i] = np.mean(tr[i - period + 1:i + 1])
        return result
    
    def _mock_adx(self, high: np.ndarray, low: np.ndarray, close: np.ndarray, period: int) -> np.ndarray:
        """Mock Average Directional Index."""
        # Simplified ADX calculation
        result = np.full(len(close), np.nan)
        for i in range(period, len(close)):
            # Mock ADX calculation (simplified)
            result[i] = np.random.uniform(20, 50)
        return result
    
    def _format_indicator_values(
        self, 
        price_data: List[PriceData], 
        indicator_values: Dict[str, np.ndarray], 
        outputs: List[str]
    ) -> List[Dict[str, Any]]:
        """Format indicator values for response."""
        
        formatted_values = []
        
        for i, price_point in enumerate(price_data):
            value_dict = {
                'timestamp': price_point.timestamp,
                'open': price_point.open,
                'high': price_point.high,
                'low': price_point.low,
                'close': price_point.close,
                'volume': price_point.volume
            }
            
            # Add indicator values
            for output in outputs:
                if output in indicator_values:
                    value = indicator_values[output][i]
                    # Handle NaN values
                    if np.isnan(value):
                        value_dict[output] = None
                    else:
                        value_dict[output] = float(value)
                else:
                    value_dict[output] = None
            
            formatted_values.append(value_dict)
        
        return formatted_values
    
    def get_supported_indicators(self) -> List[str]:
        """Get list of supported indicators."""
        return self.supported_indicators
    
    def validate_parameters(self, indicator_id: str, parameters: Dict[str, Any]) -> bool:
        """Validate indicator parameters."""
        config = get_indicator_config(indicator_id)
        if not config:
            return False
        
        # Check if all required parameters are provided
        for param_name in config.parameters.keys():
            if param_name not in parameters:
                return False
        
        return True


