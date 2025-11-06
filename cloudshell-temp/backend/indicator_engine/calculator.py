"""TA-Lib indicator calculator."""

import talib
import numpy as np
from typing import Dict, List, Any, Optional
from models import PriceData, IndicatorResponse, IndicatorConfig
from indicator_registry import get_indicator_config

class IndicatorCalculator:
    """Calculator for technical indicators using TA-Lib."""
    
    def __init__(self):
        self.supported_indicators = list(talib.get_functions())
    
    def calculate_indicator(
        self, 
        price_data: List[PriceData], 
        indicator_id: str, 
        parameters: Dict[str, Any]
    ) -> IndicatorResponse:
        """Calculate indicator values for given price data."""
        
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
            
            # Calculate indicator using TA-Lib
            indicator_values = self._calculate_talib_indicator(
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
    
    def _calculate_talib_indicator(
        self, 
        talib_function: str, 
        prices: Dict[str, np.ndarray], 
        parameters: Dict[str, Any]
    ) -> Dict[str, np.ndarray]:
        """Calculate indicator using TA-Lib function."""
        
        # Get TA-Lib function
        func = getattr(talib, talib_function)
        
        # Map TA-Lib function parameters to our data
        if talib_function in ['SMA', 'EMA', 'WMA', 'DEMA', 'TEMA', 'KAMA', 'RSI', 'ROC', 'MOM', 'PPO', 'TRIX']:
            # Single input functions (close price)
            result = func(prices['close'], **parameters)
            return {'value': result}
        
        elif talib_function == 'MACD':
            # MACD returns tuple (macd, signal, histogram)
            macd, signal, histogram = func(prices['close'], **parameters)
            return {
                'macd': macd,
                'signal': signal,
                'histogram': histogram
            }
        
        elif talib_function in ['STOCH', 'STOCHF']:
            # Stochastic functions return tuple (slowk, slowd) or (fastk, fastd)
            k, d = func(prices['high'], prices['low'], prices['close'], **parameters)
            if talib_function == 'STOCH':
                return {'slowk': k, 'slowd': d}
            else:
                return {'fastk': k, 'fastd': d}
        
        elif talib_function == 'STOCHRSI':
            # Stochastic RSI
            k, d = func(prices['close'], **parameters)
            return {'fastk': k, 'fastd': d}
        
        elif talib_function in ['WILLR', 'CCI']:
            # High, Low, Close functions
            result = func(prices['high'], prices['low'], prices['close'], **parameters)
            return {'value': result}
        
        elif talib_function == 'ULTOSC':
            # Ultimate Oscillator
            result = func(prices['high'], prices['low'], prices['close'], **parameters)
            return {'ultosc': result}
        
        elif talib_function == 'BBANDS':
            # Bollinger Bands
            upper, middle, lower = func(prices['close'], **parameters)
            return {
                'upper': upper,
                'middle': middle,
                'lower': lower
            }
        
        elif talib_function in ['ATR', 'NATR', 'TRANGE']:
            # True Range functions
            result = func(prices['high'], prices['low'], prices['close'], **parameters)
            return {'value': result}
        
        elif talib_function in ['AD', 'OBV']:
            # Volume-based functions
            result = func(prices['high'], prices['low'], prices['close'], prices['volume'])
            return {'value': result}
        
        elif talib_function == 'ADOSC':
            # Accumulation/Distribution Oscillator
            result = func(prices['high'], prices['low'], prices['close'], prices['volume'], **parameters)
            return {'adosc': result}
        
        elif talib_function == 'MFI':
            # Money Flow Index
            result = func(prices['high'], prices['low'], prices['close'], prices['volume'], **parameters)
            return {'mfi': result}
        
        elif talib_function in ['ADX', 'DX', 'MINUS_DI', 'MINUS_DM', 'PLUS_DI', 'PLUS_DM']:
            # Directional Movement functions
            result = func(prices['high'], prices['low'], prices['close'], **parameters)
            return {'value': result}
        
        elif talib_function == 'AROON':
            # Aroon
            aroon_down, aroon_up = func(prices['high'], prices['low'], **parameters)
            return {
                'aroon_down': aroon_down,
                'aroon_up': aroon_up
            }
        
        elif talib_function == 'AROONOSC':
            # Aroon Oscillator
            result = func(prices['high'], prices['low'], **parameters)
            return {'aroonosc': result}
        
        elif talib_function == 'CMO':
            # Chande Momentum Oscillator
            result = func(prices['close'], **parameters)
            return {'cmo': result}
        
        else:
            raise ValueError(f"Unsupported TA-Lib function: {talib_function}")
    
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
        return list(get_indicator_config(indicator_id) for indicator_id in INDICATOR_REGISTRY.keys())
    
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


