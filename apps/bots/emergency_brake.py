"""Emergency Brake System - Detects flash crashes and market-wide crashes."""

import logging
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
import pandas as pd
import numpy as np

logger = logging.getLogger(__name__)


class EmergencyBrake:
    """Emergency brake system for DCA bots."""
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.circuit_breaker = config.get("circuitBreaker", {})
        self.market_crash = config.get("marketWideCrashDetection", {})
        self.recovery_mode = config.get("recoveryMode", {})
        
        # State tracking
        self.triggered_at: Optional[datetime] = None
        self.trigger_reason: Optional[str] = None
        self.price_history = {}  # Track recent prices for flash crash detection
        self.stabilization_count = {}  # Track stabilization bars per pair
        
    async def check_emergency_conditions(self, pair: str, current_price: float,
                                        market_data: Optional[Dict[str, pd.DataFrame]] = None) -> Dict[str, Any]:
        """
        Check all emergency brake conditions.
        
        Returns:
            {
                "should_pause": bool,
                "reason": str,
                "trigger_type": "circuit_breaker" | "market_crash" | None
            }
        """
        result = {
            "should_pause": False,
            "reason": None,
            "trigger_type": None
        }
        
        if not self.config.get("enabled"):
            return result
            
        # If already triggered, check recovery mode
        if self.triggered_at:
            recovery_check = await self._check_recovery(pair, current_price, market_data)
            if recovery_check.get("recovered"):
                result["should_pause"] = False
                result["reason"] = recovery_check.get("reason")
                self.triggered_at = None
                self.trigger_reason = None
                return result
            else:
                result["should_pause"] = True
                result["reason"] = self.trigger_reason or "Emergency brake active"
                return result
        
        # 1. Check Circuit Breaker (Flash Crash Detection)
        circuit_result = await self._check_circuit_breaker(pair, current_price)
        if circuit_result["triggered"]:
            self.triggered_at = datetime.now()
            self.trigger_reason = circuit_result["reason"]
            result["should_pause"] = True
            result["reason"] = circuit_result["reason"]
            result["trigger_type"] = "circuit_breaker"
            return result
            
        # 2. Check Market-Wide Crash Detection
        if market_data:
            market_result = await self._check_market_crash(pair, current_price, market_data)
            if market_result["triggered"]:
                self.triggered_at = datetime.now()
                self.trigger_reason = market_result["reason"]
                result["should_pause"] = True
                result["reason"] = market_result["reason"]
                result["trigger_type"] = "market_crash"
                return result
                
        return result
        
    async def _check_circuit_breaker(self, pair: str, current_price: float) -> Dict[str, Any]:
        """Check for flash crash conditions."""
        if not self.circuit_breaker.get("enabled"):
            return {"triggered": False}
            
        flash_crash_pct = self.circuit_breaker.get("flashCrashPercent", 10)
        time_window_minutes = self.circuit_breaker.get("timeWindowMinutes", 5)
        
        # Initialize price history for pair
        if pair not in self.price_history:
            self.price_history[pair] = []
            
        # Add current price with timestamp
        now = datetime.now()
        self.price_history[pair].append({
            "price": current_price,
            "timestamp": now
        })
        
        # Clean old entries (older than time window)
        window_start = now - timedelta(minutes=time_window_minutes)
        self.price_history[pair] = [
            entry for entry in self.price_history[pair]
            if entry["timestamp"] >= window_start
        ]
        
        # Check for flash crash: significant drop in time window
        if len(self.price_history[pair]) >= 2:
            prices = [e["price"] for e in self.price_history[pair]]
            max_price = max(prices)
            min_price = min(prices)
            
            if max_price > 0:
                drop_pct = ((max_price - min_price) / max_price) * 100
                
                if drop_pct >= flash_crash_pct:
                    return {
                        "triggered": True,
                        "reason": f"Flash crash detected: {drop_pct:.2f}% drop in {time_window_minutes} minutes"
                    }
                    
        return {"triggered": False}
        
    async def _check_market_crash(self, pair: str, current_price: float,
                                 market_data: Dict[str, pd.DataFrame]) -> Dict[str, Any]:
        """Check for market-wide crash using correlation analysis."""
        if not self.market_crash.get("enabled"):
            return {"triggered": False}
            
        correlation_threshold = self.market_crash.get("correlationThreshold", 0.8)
        market_drop_pct = self.market_crash.get("marketDropPercent", 15)
        
        # Need at least 2 pairs to check correlation
        if len(market_data) < 2:
            return {"triggered": False}
            
        try:
            # Calculate price changes for all pairs
            price_changes = {}
            for sym, df in market_data.items():
                if len(df) >= 2:
                    # Get price change over recent period (e.g., last 24 hours represented by recent bars)
                    recent_periods = min(24, len(df))
                    old_price = df['close'].iloc[-recent_periods] if recent_periods > 0 else df['close'].iloc[0]
                    new_price = df['close'].iloc[-1]
                    if old_price > 0:
                        change_pct = ((new_price - old_price) / old_price) * 100
                        price_changes[sym] = change_pct
                        
            if len(price_changes) < 2:
                return {"triggered": False}
                
            # Check if majority of pairs are dropping
            negative_changes = [pct for pct in price_changes.values() if pct < 0]
            avg_drop = abs(np.mean(negative_changes)) if negative_changes else 0
            
            # Check correlation (simplified: if most pairs dropping together)
            if avg_drop >= market_drop_pct and len(negative_changes) >= len(price_changes) * correlation_threshold:
                return {
                    "triggered": True,
                    "reason": f"Market-wide crash: {len(negative_changes)}/{len(price_changes)} pairs down, avg {avg_drop:.2f}%"
                }
                
        except Exception as e:
            logger.error(f"Error checking market crash: {e}")
            
        return {"triggered": False}
        
    async def _check_recovery(self, pair: str, current_price: float,
                             market_data: Optional[Dict[str, pd.DataFrame]]) -> Dict[str, Any]:
        """Check if market has recovered and we should resume."""
        if not self.recovery_mode.get("enabled"):
            return {"recovered": False}
            
        stabilization_bars = self.recovery_mode.get("stabilizationBars", 10)
        
        # Initialize stabilization tracking
        if pair not in self.stabilization_count:
            self.stabilization_count[pair] = 0
            
        # Check if price has stabilized (not dropping further)
        # Simplified: count consecutive bars where price is not in flash crash territory
        if pair in self.price_history and len(self.price_history[pair]) >= 2:
            recent_prices = self.price_history[pair][-stabilization_bars:]
            if len(recent_prices) >= stabilization_bars:
                prices = [e["price"] for e in recent_prices]
                # Check if price variation is minimal (stabilized)
                price_variation = (max(prices) - min(prices)) / max(prices) * 100 if max(prices) > 0 else 0
                
                # Consider stabilized if variation is less than 2% over stabilization period
                if price_variation < 2.0:
                    self.stabilization_count[pair] += 1
                else:
                    self.stabilization_count[pair] = 0
                    
                if self.stabilization_count[pair] >= stabilization_bars:
                    if self.recovery_mode.get("resumeAfterStabilized", True):
                        return {
                            "recovered": True,
                            "reason": f"Market stabilized: {stabilization_bars} stable bars"
                        }
                    
        return {"recovered": False}
        
    def manual_panic(self):
        """Manually trigger emergency brake (panic button)."""
        self.triggered_at = datetime.now()
        self.trigger_reason = "Manual panic button activated"
        logger.warning("Manual panic button activated - all DCAs paused")
        
    def manual_resume(self):
        """Manually resume after emergency brake."""
        self.triggered_at = None
        self.trigger_reason = None
        logger.info("Manual resume - emergency brake released")


