"""Support/Resistance Detection Service - Detects S/R levels using multiple methods."""

import logging
from typing import Dict, Any, List, Tuple, Optional
import pandas as pd
import numpy as np

logger = logging.getLogger(__name__)


class SupportResistanceDetector:
    """Detects support and resistance levels using multiple timeframe analysis."""
    
    def __init__(self, timeframes: List[str] = ["1h", "4h", "1d"]):
        self.timeframes = timeframes
        self.level_cache = {}  # Cache levels per timeframe
        
    async def detect_levels(self, df: pd.DataFrame, timeframe: str) -> Dict[str, List[float]]:
        """
        Detect support and resistance levels for a given timeframe.
        
        Returns:
            {
                "support": [list of support prices],
                "resistance": [list of resistance prices],
                "pivot_point": float
            }
        """
        levels = {
            "support": [],
            "resistance": [],
            "pivot_point": None
        }
        
        if len(df) < 20:
            return levels
            
        # Method 1: Pivot Points
        pivot_levels = self._calculate_pivot_points(df)
        levels["pivot_point"] = pivot_levels["pivot"]
        levels["support"].extend([pivot_levels["s1"], pivot_levels["s2"]])
        levels["resistance"].extend([pivot_levels["r1"], pivot_levels["r2"]])
        
        # Method 2: Historical Price Clusters
        cluster_levels = self._find_price_clusters(df)
        levels["support"].extend(cluster_levels["support"])
        levels["resistance"].extend(cluster_levels["resistance"])
        
        # Remove duplicates and sort
        levels["support"] = sorted(set([s for s in levels["support"] if s > 0]))
        levels["resistance"] = sorted(set([r for r in levels["resistance"] if r > 0]))
        
        # Cache levels
        self.level_cache[timeframe] = levels
        
        return levels
        
    async def get_multitimeframe_levels(self, market_data: Dict[str, pd.DataFrame]) -> Dict[str, Any]:
        """
        Get S/R levels across multiple timeframes and find confluence.
        
        Args:
            market_data: Dict of {timeframe: DataFrame}
            
        Returns:
            {
                "strong_support": float,
                "strong_resistance": float,
                "all_levels": {timeframe: {support: [], resistance: []}}
            }
        """
        all_levels = {}
        
        # Detect levels for each timeframe
        for tf in self.timeframes:
            if tf in market_data:
                levels = await self.detect_levels(market_data[tf], tf)
                all_levels[tf] = levels
                
        # Find confluence (levels that appear on multiple timeframes)
        confluence = self._find_confluence(all_levels)
        
        return {
            "strong_support": confluence.get("strong_support"),
            "strong_resistance": confluence.get("strong_resistance"),
            "all_levels": all_levels,
            "confluence": confluence
        }
        
    async def get_current_zone(self, current_price: float, levels: Dict[str, Any], 
                               threshold_percent: float = 2.0) -> str:
        """
        Determine current zone (near support, near resistance, or neutral).
        
        Returns:
            "near_strong_support", "near_resistance", or "neutral"
        """
        strong_support = levels.get("strong_support")
        strong_resistance = levels.get("strong_resistance")
        
        if strong_support:
            distance_to_support = abs(current_price - strong_support) / strong_support * 100
            if distance_to_support <= threshold_percent:
                return "near_strong_support"
                
        if strong_resistance:
            distance_to_resistance = abs(current_price - strong_resistance) / strong_resistance * 100
            if distance_to_resistance <= threshold_percent:
                return "near_resistance"
                
        return "neutral"
        
    def _calculate_pivot_points(self, df: pd.DataFrame) -> Dict[str, float]:
        """Calculate pivot points from previous period."""
        if len(df) < 2:
            return {"pivot": 0, "s1": 0, "s2": 0, "r1": 0, "r2": 0}
            
        # Use previous period's H, L, C
        prev_high = df['high'].iloc[-2]
        prev_low = df['low'].iloc[-2]
        prev_close = df['close'].iloc[-2]
        
        pivot = (prev_high + prev_low + prev_close) / 3
        r1 = 2 * pivot - prev_low
        r2 = pivot + (prev_high - prev_low)
        s1 = 2 * pivot - prev_high
        s2 = pivot - (prev_high - prev_low)
        
        return {
            "pivot": pivot,
            "s1": s1,
            "s2": s2,
            "r1": r1,
            "r2": r2
        }
        
    def _find_price_clusters(self, df: pd.DataFrame, lookback: int = 30) -> Dict[str, List[float]]:
        """Find price levels where price spent significant time (clusters)."""
        support_levels = []
        resistance_levels = []
        
        if len(df) < lookback:
            lookback = len(df)
            
        recent_df = df.tail(lookback)
        
        # Find swing highs (resistance) and swing lows (support)
        window = 5
        for i in range(window, len(recent_df) - window):
            if recent_df['high'].iloc[i] == recent_df['high'].iloc[i-window:i+window].max():
                resistance_levels.append(recent_df['high'].iloc[i])
            if recent_df['low'].iloc[i] == recent_df['low'].iloc[i-window:i+window].min():
                support_levels.append(recent_df['low'].iloc[i])
                
        return {
            "support": support_levels,
            "resistance": resistance_levels
        }
        
    def _find_confluence(self, all_levels: Dict[str, Dict]) -> Dict[str, Optional[float]]:
        """Find S/R levels that appear across multiple timeframes."""
        # Collect all support and resistance levels with timeframe weighting
        support_scores = {}
        resistance_scores = {}
        
        timeframe_weights = {
            "1h": 1,
            "4h": 2,
            "1d": 3,
            "1w": 5
        }
        
        # Score levels based on timeframe confirmation
        for tf, levels in all_levels.items():
            weight = timeframe_weights.get(tf, 1)
            
            for support in levels.get("support", []):
                # Group similar levels (within 1%)
                nearest = self._find_nearest_level(support, support_scores.keys())
                if nearest and abs(support - nearest) / nearest < 0.01:
                    support_scores[nearest] += weight
                else:
                    support_scores[support] = weight
                    
            for resistance in levels.get("resistance", []):
                nearest = self._find_nearest_level(resistance, resistance_scores.keys())
                if nearest and abs(resistance - nearest) / nearest < 0.01:
                    resistance_scores[nearest] += weight
                else:
                    resistance_scores[resistance] = weight
                    
        # Find strongest levels (highest score)
        strong_support = max(support_scores, key=support_scores.get) if support_scores else None
        strong_resistance = max(resistance_scores, key=resistance_scores.get) if resistance_scores else None
        
        return {
            "strong_support": strong_support,
            "strong_resistance": strong_resistance,
            "support_scores": support_scores,
            "resistance_scores": resistance_scores
        }
        
    def _find_nearest_level(self, price: float, levels: List[float]) -> Optional[float]:
        """Find nearest level in list."""
        if not levels:
            return None
        return min(levels, key=lambda x: abs(x - price))


