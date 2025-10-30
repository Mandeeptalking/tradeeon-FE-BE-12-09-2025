"""Market Regime Detection Service - Handles pause/resume logic based on market conditions."""

import logging
from typing import Dict, Any, Optional
from datetime import datetime, timedelta
import pandas as pd
import numpy as np

logger = logging.getLogger(__name__)


class MarketRegimeDetector:
    """Detects market regimes and manages bot pause/resume."""
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.pause_conditions = config.get("pauseConditions", {})
        self.resume_conditions = config.get("resumeConditions", {})
        self.regime_timeframe = config.get("regimeTimeframe", "1d")
        
        # State tracking
        self.current_regime = "normal"  # normal, bear, accumulation
        self.pause_start_time: Optional[datetime] = None
        self.consecutive_bearish_periods = 0
        self.consolidation_periods = 0
        self.volume_history = []  # Track volume for decrease detection
        
    async def check_regime(self, market_data: pd.DataFrame, pair: str) -> Dict[str, Any]:
        """
        Check current market regime and determine if bot should pause/resume.
        
        Returns:
            {
                "should_pause": bool,
                "should_resume": bool,
                "regime": str,
                "reason": str
            }
        """
        result = {
            "should_pause": False,
            "should_resume": False,
            "regime": self.current_regime,
            "reason": None
        }
        
        if self.current_regime == "normal":
            # Check for bear market (pause conditions)
            if await self._check_pause_conditions(market_data):
                result["should_pause"] = True
                result["regime"] = "bear"
                result["reason"] = "Bear market detected - pause conditions met"
                self.current_regime = "bear"
                self.pause_start_time = datetime.now()
                
        elif self.current_regime == "bear":
            # Check for accumulation zone (resume conditions)
            if await self._check_resume_conditions(market_data):
                result["should_resume"] = True
                result["regime"] = "accumulation"
                result["reason"] = "Accumulation zone detected - resuming DCAs"
                self.current_regime = "accumulation"
                
        elif self.current_regime == "accumulation":
            # Return to normal after accumulation
            result["regime"] = "normal"
            self.current_regime = "normal"
            
        return result
        
    async def _check_pause_conditions(self, df: pd.DataFrame) -> bool:
        """Check if pause conditions are met."""
        if not self.pause_conditions.get("belowMovingAverage"):
            return False
            
        # Calculate MA
        ma_period = self.pause_conditions.get("maPeriod", 200)
        rsi_threshold = self.pause_conditions.get("rsiThreshold", 30)
        consecutive_periods = self.pause_conditions.get("consecutivePeriods", 7)
        
        # Check if price below MA and RSI below threshold
        if len(df) < ma_period:
            return False
            
        # Calculate indicators
        df['MA'] = df['close'].rolling(window=ma_period).mean()
        df['RSI'] = self._calculate_rsi(df['close'], 14)
        
        current_price = df['close'].iloc[-1]
        current_ma = df['MA'].iloc[-1]
        current_rsi = df['RSI'].iloc[-1]
        
        # Check conditions
        below_ma = current_price < current_ma
        rsi_oversold = current_rsi < rsi_threshold
        
        if below_ma and rsi_oversold:
            self.consecutive_bearish_periods += 1
            if self.consecutive_bearish_periods >= consecutive_periods:
                return True
        else:
            self.consecutive_bearish_periods = 0
            
        return False
        
    async def _check_resume_conditions(self, df: pd.DataFrame) -> bool:
        """Check if resume conditions are met."""
        volume_decrease_threshold = self.resume_conditions.get("volumeDecreaseThreshold", 20)
        consolidation_periods = self.resume_conditions.get("consolidationPeriods", 5)
        price_range_percent = self.resume_conditions.get("priceRangePercent", 5)
        
        # Check volume decrease
        if len(df) < 20:
            return False
            
        recent_volume = df['volume'].tail(10).mean()
        older_volume = df['volume'].iloc[:-10].tail(10).mean()
        
        volume_decrease = ((older_volume - recent_volume) / older_volume) * 100
        volume_decreased = volume_decrease >= volume_decrease_threshold
        
        # Check consolidation (price in range)
        recent_high = df['high'].tail(consolidation_periods).max()
        recent_low = df['low'].tail(consolidation_periods).min()
        recent_avg = (recent_high + recent_low) / 2
        
        price_range = ((recent_high - recent_low) / recent_avg) * 100
        is_consolidating = price_range <= price_range_percent
        
        if volume_decreased and is_consolidating:
            self.consolidation_periods += 1
            if self.consolidation_periods >= consolidation_periods:
                return True
        else:
            self.consolidation_periods = 0
            
        return False
        
    def _calculate_rsi(self, prices: pd.Series, period: int = 14) -> pd.Series:
        """Calculate RSI indicator."""
        delta = prices.diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
        rs = gain / loss
        rsi = 100 - (100 / (1 + rs))
        return rsi


