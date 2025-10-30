"""Intelligent Profit Taking Strategy Service - Handles profit target execution."""

import logging
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)


class ProfitTaker:
    """Handles intelligent profit taking strategies."""
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.partial_targets = config.get("partialTargets", [])
        self.trailing_stop = config.get("trailingStop", {})
        self.take_profit_restart = config.get("takeProfitAndRestart", {})
        self.time_based_exit = config.get("timeBasedExit", {})
        
        # State tracking per position
        self.position_peaks = {}  # Track peak prices for trailing stop
        self.position_entry_dates = {}  # Track entry dates for time-based exit
        self.executed_targets = {}  # Track which partial targets have been executed
        
    async def check_profit_targets(self, pair: str, current_price: float, 
                                   entry_price: float, position_size: float,
                                   entry_date: datetime) -> List[Dict[str, Any]]:
        """
        Check all profit-taking conditions and return actions to take.
        
        Returns:
            List of actions: [{"action": "sell_partial", "amount": X, "reason": "..."}, ...]
        """
        actions = []
        
        if not self.config.get("enabled"):
            return actions
            
        # Calculate current profit percentage
        profit_pct = ((current_price - entry_price) / entry_price) * 100
        
        # Initialize tracking for new position
        position_key = f"{pair}_{entry_date}"
        if position_key not in self.position_peaks:
            self.position_peaks[position_key] = current_price
            self.position_entry_dates[position_key] = entry_date
            self.executed_targets[position_key] = []
            
        # Update peak price for trailing stop
        if current_price > self.position_peaks[position_key]:
            self.position_peaks[position_key] = current_price
            
        # 1. Check Partial Profit Targets
        actions.extend(await self._check_partial_targets(
            position_key, profit_pct, position_size
        ))
        
        # 2. Check Trailing Stop Loss
        trailing_action = await self._check_trailing_stop(
            position_key, current_price, self.position_peaks[position_key],
            entry_price, profit_pct, position_size
        )
        if trailing_action:
            actions.append(trailing_action)
            
        # 3. Check Take Profit & Restart
        restart_action = await self._check_take_profit_restart(
            position_key, profit_pct, position_size
        )
        if restart_action:
            actions.append(restart_action)
            
        # 4. Check Time-Based Exit
        time_action = await self._check_time_based_exit(
            position_key, entry_date, profit_pct, position_size
        )
        if time_action:
            actions.append(time_action)
            
        return actions
        
    async def _check_partial_targets(self, position_key: str, profit_pct: float,
                                     position_size: float) -> List[Dict[str, Any]]:
        """Check if any partial profit targets should be executed."""
        actions = []
        executed = self.executed_targets.get(position_key, [])
        
        # Sort targets by profit percentage (ascending)
        sorted_targets = sorted(self.partial_targets, key=lambda x: x.get("profitPercent", 0))
        
        for target in sorted_targets:
            target_profit = target.get("profitPercent", 0)
            sell_pct = target.get("sellPercent", 0)
            target_id = f"{target_profit}_{sell_pct}"
            
            # Check if already executed
            if target_id in executed:
                continue
                
            # Check if profit target reached
            if profit_pct >= target_profit and sell_pct > 0:
                sell_amount = position_size * (sell_pct / 100)
                actions.append({
                    "action": "sell_partial",
                    "amount": sell_amount,
                    "reason": f"Partial profit target: {target_profit}% profit, selling {sell_pct}%",
                    "target_id": target_id
                })
                executed.append(target_id)
                
        self.executed_targets[position_key] = executed
        return actions
        
    async def _check_trailing_stop(self, position_key: str, current_price: float,
                                  peak_price: float, entry_price: float,
                                  profit_pct: float, position_size: float) -> Optional[Dict[str, Any]]:
        """Check if trailing stop loss should trigger."""
        if not self.trailing_stop.get("enabled"):
            return None
            
        activation_profit = self.trailing_stop.get("activationProfit", 10)
        trailing_distance = self.trailing_stop.get("trailingDistance", 5)
        only_up = self.trailing_stop.get("onlyUp", True)
        
        # Only activate trailing stop after reaching activation profit
        if profit_pct < activation_profit:
            return None
            
        # Calculate stop price based on peak
        stop_price = peak_price * (1 - trailing_distance / 100)
        
        # If only moving up, we should maintain the highest stop price
        if only_up:
            # Store the highest stop price we've seen
            if position_key not in self.__dict__.get("_trailing_stop_prices", {}):
                if not hasattr(self, "_trailing_stop_prices"):
                    self._trailing_stop_prices = {}
                self._trailing_stop_prices[position_key] = stop_price
            else:
                # Only update if new stop price is higher (only moving up)
                if stop_price > self._trailing_stop_prices[position_key]:
                    self._trailing_stop_prices[position_key] = stop_price
                else:
                    stop_price = self._trailing_stop_prices[position_key]
        else:
            # Allow trailing stop to move down
            if not hasattr(self, "_trailing_stop_prices"):
                self._trailing_stop_prices = {}
            self._trailing_stop_prices[position_key] = stop_price
            
        # Check if current price hit stop
        if current_price <= stop_price:
            return {
                "action": "sell_all",
                "amount": position_size,
                "reason": f"Trailing stop triggered: price {current_price:.2f} <= stop {stop_price:.2f}",
                "stop_price": stop_price
            }
            
        return None
        
    async def _check_take_profit_restart(self, position_key: str, profit_pct: float,
                                         position_size: float) -> Optional[Dict[str, Any]]:
        """Check if take profit and restart should trigger."""
        if not self.take_profit_restart.get("enabled"):
            return None
            
        profit_target = self.take_profit_restart.get("profitTarget", 30)
        
        if profit_pct >= profit_target:
            return {
                "action": "close_and_restart",
                "amount": position_size,
                "reason": f"Take profit target reached: {profit_pct:.2f}% >= {profit_target}%",
                "use_original_capital": self.take_profit_restart.get("useOriginalCapital", True)
            }
            
        return None
        
    async def _check_time_based_exit(self, position_key: str, entry_date: datetime,
                                     profit_pct: float, position_size: float) -> Optional[Dict[str, Any]]:
        """Check if time-based exit should trigger."""
        if not self.time_based_exit.get("enabled"):
            return None
            
        max_hold_days = self.time_based_exit.get("maxHoldDays", 30)
        min_profit = self.time_based_exit.get("minProfit", 10)
        
        # Calculate days held
        days_held = (datetime.now() - entry_date).days
        
        # Check if max hold days reached AND minimum profit met
        if days_held >= max_hold_days and profit_pct >= min_profit:
            return {
                "action": "sell_all",
                "amount": position_size,
                "reason": f"Time-based exit: held {days_held} days with {profit_pct:.2f}% profit",
                "days_held": days_held
            }
            
        return None


