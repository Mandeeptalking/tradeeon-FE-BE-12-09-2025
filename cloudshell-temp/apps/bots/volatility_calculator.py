"""Volatility Calculator - Calculates ATR and volatility states."""

import logging
from typing import Dict, Any
import pandas as pd
import numpy as np

logger = logging.getLogger(__name__)


class VolatilityCalculator:
    """Calculates market volatility using ATR (Average True Range)."""
    
    def __init__(self, period: int = 14):
        self.period = period
        
    def calculate_atr(self, df: pd.DataFrame) -> pd.Series:
        """Calculate ATR (Average True Range)."""
        high = df['high']
        low = df['low']
        close = df['close']
        
        # True Range = max of:
        # - High - Low
        # - |High - Previous Close|
        # - |Low - Previous Close|
        tr1 = high - low
        tr2 = abs(high - close.shift())
        tr3 = abs(low - close.shift())
        
        tr = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
        
        # ATR = Simple Moving Average of True Range
        atr = tr.rolling(window=self.period).mean()
        
        return atr
        
    def get_volatility_state(self, df: pd.DataFrame) -> str:
        """
        Determine volatility state (low, normal, high).
        
        Returns:
            "low", "normal", or "high"
        """
        if len(df) < self.period * 2:
            return "normal"
            
        atr = self.calculate_atr(df)
        current_atr = atr.iloc[-1]
        average_atr = atr.iloc[:-1].tail(20).mean()  # Average of recent 20 periods
        
        if pd.isna(current_atr) or pd.isna(average_atr) or average_atr == 0:
            return "normal"
            
        # Compare current ATR to average
        ratio = current_atr / average_atr
        
        if ratio < 0.7:
            return "low"
        elif ratio > 1.3:
            return "high"
        else:
            return "normal"
            
    def get_volatility_multiplier(self, df: pd.DataFrame, multipliers: Dict[str, float]) -> float:
        """
        Get volatility-based multiplier.
        
        Args:
            df: Price DataFrame
            multipliers: Dict with "lowVolatility", "normalVolatility", "highVolatility"
            
        Returns:
            Multiplier value
        """
        state = self.get_volatility_state(df)
        return multipliers.get(f"{state}Volatility" if state != "normal" else "normalVolatility", 
                             multipliers.get("normalVolatility", 1.0))


