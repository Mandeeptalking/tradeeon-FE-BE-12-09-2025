"""DCA Bot Executor - Handles execution of DCA bot with Phase 1 advanced features."""

import asyncio
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
import pandas as pd
import numpy as np
import sys
import os

# Add necessary paths
bots_path = os.path.dirname(__file__)
if bots_path not in sys.path:
    sys.path.insert(0, bots_path)

from market_data import MarketDataService
from paper_trading import PaperTradingEngine

logger = logging.getLogger(__name__)


class DCABotExecutor:
    """Executes DCA bot strategy with advanced features."""
    
    def __init__(self, bot_config: Dict[str, Any], paper_trading: bool = True, 
                 initial_balance: float = 10000.0):
        self.config = bot_config
        self.bot_id = None
        self.user_id = None
        self.status = "inactive"
        self.paper_trading = paper_trading
        
        # Phase 1 Features
        self.market_regime = bot_config.get("phase1Features", {}).get("marketRegime")
        self.dynamic_scaling = bot_config.get("phase1Features", {}).get("dynamicScaling")
        self.profit_strategy = bot_config.get("phase1Features", {}).get("profitStrategy")
        self.emergency_brake = bot_config.get("phase1Features", {}).get("emergencyBrake")
        
        # Market data service
        self.market_data = MarketDataService()
        
        # Paper trading engine
        if paper_trading:
            self.trading_engine = PaperTradingEngine(
                initial_balance=initial_balance,
                bot_id=self.bot_id,
                run_id=getattr(self, 'run_id', None),
                user_id=self.user_id
            )
        else:
            self.trading_engine = None  # Real trading not implemented yet
            
        # State tracking
        self.paused = False  # Market regime pause state
        self.last_dca_time = {}  # Track last DCA per pair
        self.position_states = {}  # Track positions per pair
        self.regime_state = {}  # Market regime tracking
        
    async def initialize(self):
        """Initialize bot executor."""
        logger.info(f"Initializing DCA bot: {self.config.get('botName')} (Paper Trading: {self.paper_trading})")
        
        # Initialize market data service
        await self.market_data.initialize()
        
        # Initialize trading engine if paper trading
        if self.paper_trading:
            logger.info(f"Paper trading initialized with balance: {self.trading_engine.get_balance()}")
        
        self.status = "running"
        
    async def execute_once(self):
        """Execute one iteration of the bot."""
        if self.paused:
            logger.info("Bot is paused by market regime detection")
            return
            
        # Process each pair
        pairs = self.config.get("selectedPairs", [])
        
        # Fetch current prices for all pairs
        current_prices = {}
        market_data_dict = {}
        
        for pair in pairs:
            # Get current price
            price = await self.market_data.get_current_price(pair)
            if price > 0:
                current_prices[pair] = price
                
                # Get market data for regime detection and emergency brake
                if self.market_regime or self.emergency_brake:
                    regime_tf = self.market_regime.get("regimeTimeframe", "1d") if self.market_regime else "1h"
                    df = await self.market_data.get_klines_as_dataframe(pair, regime_tf, 200)
                    if not df.empty:
                        market_data_dict[pair] = df
        
        # Process each pair with real market data
        for pair in pairs:
            if pair not in current_prices or current_prices[pair] <= 0:
                logger.warning(f"Could not fetch price for {pair}, skipping")
                continue
                
            current_price = current_prices[pair]
            
            # Check market regime detection (but allow override if entry condition triggers)
            if self.market_regime and market_data_dict.get(pair) is not None:
                regime_result = await self._check_market_regime(pair, market_data_dict[pair])
                allow_override = self.market_regime.get("allowEntryOverride", False)
                
                # Check if entry condition would trigger (only if override enabled)
                entry_would_trigger = False
                if allow_override:
                    condition_config = self.config.get("conditionConfig")
                    if condition_config:
                        entry_would_trigger = await self._evaluate_entry_conditions(pair, condition_config, market_data_dict.get(pair))
                
                if regime_result.get("should_pause"):
                    if allow_override and entry_would_trigger:
                        logger.info(f"⚠️ Market regime wants to pause, but entry condition overrides for {pair}")
                        # Don't pause - entry condition takes precedence
                    else:
                        self.paused = True
                        logger.info(f"⏸️ Market regime pause for {pair}: {regime_result.get('reason')}")
                        continue
                elif regime_result.get("should_resume"):
                    self.paused = False
                    logger.info(f"▶️ Market regime resume for {pair}: {regime_result.get('reason')}")
            
            # Check emergency brake
            if await self._check_emergency_brake(pair, current_price, market_data_dict):
                logger.warning(f"Emergency brake triggered for {pair} - skipping")
                continue
            
            # Check profit targets before new DCA
            await self._check_and_execute_profit_targets(pair, current_price)
                    
            await self._process_pair(pair, current_price, market_data_dict.get(pair))
            
    async def _process_pair(self, pair: str, current_price: float, market_df: Optional[pd.DataFrame] = None):
        """Process a single trading pair."""
        # Check if we should execute DCA
        if not await self._should_execute_dca(pair, current_price, market_df):
            return
            
        # Calculate DCA amount with dynamic scaling
        base_amount = self.config.get("baseOrderSize", 100)
        scaled_amount = await self._calculate_scaled_amount(pair, base_amount, market_df)
        
        # Execute DCA order
        if self.paper_trading and self.trading_engine:
            result = await self.trading_engine.execute_buy(pair, scaled_amount, current_price)
            if result.get("success"):
                logger.info(f"✅ Paper DCA executed for {pair}: {result['quantity']:.6f} @ ${current_price:.2f} = ${scaled_amount:.2f}")
                self.last_dca_time[pair] = datetime.now()
                
                # Update position state
                self.position_states[pair] = {
                    "last_entry_price": current_price,
                    "last_entry_time": datetime.now(),
                    "total_entries": len(self.trading_engine.positions.get(pair, {}).get("entries", []))
                }
            else:
                logger.error(f"❌ DCA failed for {pair}: {result.get('error')}")
        else:
            logger.info(f"Would execute DCA for {pair}: ${scaled_amount} @ ${current_price:.2f}")
            # TODO: Real exchange integration
        
    async def _should_execute_dca(self, pair: str, current_price: float, 
                                  market_df: Optional[pd.DataFrame] = None) -> bool:
        """Check if DCA should execute based on conditions."""
        # Check if this is the first trade (no position yet)
        if self.paper_trading and self.trading_engine:
            position = self.trading_engine.get_position(pair)
            is_first_trade = not position or not position.get("entries") or len(position.get("entries", [])) == 0
        else:
            is_first_trade = pair not in self.position_states
        
        # Check entry conditions (playbook or simple)
        condition_config = self.config.get("conditionConfig")
        trade_start_condition = self.config.get("tradeStartCondition", False)
        
        # For first trade: if "Open Immediately" mode, skip condition check
        if is_first_trade and not trade_start_condition:
            # Open immediately - skip condition check for first trade
            logger.info(f"First trade for {pair}: Opening immediately (no condition check)")
        elif condition_config:
            # Check conditions for subsequent trades or if "Wait for Signal" mode
            if not await self._evaluate_entry_conditions(pair, condition_config, market_df):
                return False
                
        # Check DCA rules
        dca_rules = self.config.get("dcaRules", {})
        if not await self._evaluate_dca_rules(pair, dca_rules, current_price):
            return False
            
        # Check cooldown
        if not await self._check_dca_cooldown(pair, dca_rules):
            return False
            
        return True
        
    async def _evaluate_entry_conditions(self, pair: str, condition_config: Dict,
                                        market_df: Optional[pd.DataFrame] = None) -> bool:
        """Evaluate entry conditions (playbook or simple)."""
        # TODO: Integrate with alert evaluator for condition evaluation
        # For now, if no market data, return True (no condition filtering)
        if market_df is None or market_df.empty:
            # If conditions are set but no data, skip
            if condition_config:
                logger.warning(f"No market data for {pair}, cannot evaluate conditions")
                return False
            return True
            
        # Basic implementation - integrate with evaluator.py later
        # For now, return True to allow testing
        return True
        
    async def _evaluate_dca_rules(self, pair: str, dca_rules: Dict, 
                                  current_price: float) -> bool:
        """Evaluate DCA trigger rules."""
        rule_type = dca_rules.get("ruleType")
        
        if not rule_type:
            return True  # No DCA rule = always execute
            
        # Get position data from paper trading engine
        if self.paper_trading and self.trading_engine:
            position = self.trading_engine.get_position(pair)
            position_pnl = self.trading_engine.get_position_pnl(pair, current_price)
        else:
            position = None
            position_pnl = None
            
        if rule_type == "down_from_last_entry":
            # Check if price dropped X% from last entry
            if not position or not position.get("entries"):
                # No position yet, allow first entry
                return True
                
            last_entry = position["entries"][-1]
            last_price = last_entry["price"]
            drop_pct = dca_rules.get("percentage", 5)
            
            price_drop = ((last_price - current_price) / last_price) * 100
            return price_drop >= drop_pct
            
        elif rule_type == "down_from_average":
            # Check if price dropped X% from average
            if not position_pnl or position_pnl["avg_entry_price"] == 0:
                return True  # No position yet
                
            avg_price = position_pnl["avg_entry_price"]
            drop_pct = dca_rules.get("percentage", 5)
            
            price_drop = ((avg_price - current_price) / avg_price) * 100
            return price_drop >= drop_pct
            
        elif rule_type == "loss_by_percent":
            # Check if position is in loss by %
            if not position_pnl:
                return False  # No position = no loss
                
            loss_pct = dca_rules.get("lossPercent", 10)
            return position_pnl["pnl_percent"] <= -loss_pct
            
        elif rule_type == "loss_by_amount":
            # Check if position loss exceeds amount
            if not position_pnl:
                return False
                
            loss_amount = dca_rules.get("lossAmount", 100)
            return position_pnl["pnl_amount"] <= -loss_amount
            
        elif rule_type == "custom":
            # Evaluate custom condition
            # TODO: Use evaluator
            return True
            
        return False
        
    async def _check_dca_cooldown(self, pair: str, dca_rules: Dict) -> bool:
        """Check if DCA cooldown period has passed."""
        cooldown_value = dca_rules.get("dcaCooldownValue", 0)
        cooldown_unit = dca_rules.get("dcaCooldownUnit", "minutes")
        
        if cooldown_value == 0:
            return True
            
        last_dca = self.last_dca_time.get(pair)
        if not last_dca:
            return True
            
        if cooldown_unit == "minutes":
            cooldown_delta = timedelta(minutes=cooldown_value)
        elif cooldown_unit == "bars":
            # TODO: Convert bars to time based on timeframe
            cooldown_delta = timedelta(minutes=cooldown_value * 5)  # Placeholder
        else:
            cooldown_delta = timedelta(minutes=cooldown_value)
            
        return datetime.now() - last_dca > cooldown_delta
        
    async def _calculate_scaled_amount(self, pair: str, base_amount: float,
                                      market_df: Optional[pd.DataFrame] = None) -> float:
        """Calculate DCA amount with dynamic scaling."""
        if not self.dynamic_scaling:
            return base_amount
            
        amount = base_amount
        
        # Apply volatility scaling
        if self.dynamic_scaling.get("volatilityMultiplier"):
            amount *= await self._get_volatility_multiplier(pair, market_df)
            
        # Apply S/R scaling
        if self.dynamic_scaling.get("supportResistanceMultiplier"):
            amount *= await self._get_sr_multiplier(pair, market_df)
            
        # Apply Fear & Greed scaling
        if self.dynamic_scaling.get("fearGreedIndex"):
            amount *= await self._get_fear_greed_multiplier()
            
        return round(amount, 2)
        
    async def _get_volatility_multiplier(self, pair: str, 
                                         market_df: Optional[pd.DataFrame] = None) -> float:
        """Get volatility-based multiplier."""
        if not market_df or market_df.empty:
            multipliers = self.dynamic_scaling.get("volatilityMultiplier", {})
            return multipliers.get("normalVolatility", 1.0)
            
        # Import volatility calculator
        from volatility_calculator import VolatilityCalculator
        
        calc = VolatilityCalculator(period=14)
        state = calc.get_volatility_state(market_df)
        multipliers = self.dynamic_scaling.get("volatilityMultiplier", {})
        
        if state == "low":
            return multipliers.get("lowVolatility", 1.2)
        elif state == "high":
            return multipliers.get("highVolatility", 0.7)
        else:
            return multipliers.get("normalVolatility", 1.0)
        
    async def _get_sr_multiplier(self, pair: str, 
                                 market_df: Optional[pd.DataFrame] = None) -> float:
        """Get support/resistance multiplier."""
        if not market_df or market_df.empty:
            multipliers = self.dynamic_scaling.get("supportResistanceMultiplier", {})
            return multipliers.get("neutralZone", 1.0)
            
        # Import S/R detector
        from support_resistance import SupportResistanceDetector
        
        detector = SupportResistanceDetector(timeframes=["1h", "4h", "1d"])
        current_price = float(market_df['close'].iloc[-1])
        
        # Get levels for current timeframe
        levels = await detector.detect_levels(market_df, "1h")  # Use 1h for now
        zone = await detector.get_current_zone(current_price, levels, threshold_percent=2.0)
        
        multipliers = self.dynamic_scaling.get("supportResistanceMultiplier", {})
        
        if zone == "near_strong_support":
            return multipliers.get("nearStrongSupport", 1.5)
        elif zone == "near_resistance":
            return multipliers.get("nearResistance", 0.5)
        else:
            return multipliers.get("neutralZone", 1.0)
        
    async def _get_fear_greed_multiplier(self) -> float:
        """Get Fear & Greed Index multiplier."""
        # TODO: Fetch Fear & Greed Index from API
        # For now, return neutral
        multipliers = self.dynamic_scaling.get("fearGreedIndex", {})
        return multipliers.get("neutral", 1.0)
        
    async def _check_emergency_brake(self, pair: str, current_price: float,
                                     market_data: Optional[Dict[str, pd.DataFrame]] = None) -> bool:
        """Check if emergency brake should trigger."""
        if not self.emergency_brake:
            return False
            
        from emergency_brake import EmergencyBrake
        
        brake = EmergencyBrake(self.emergency_brake)
        
        # Prepare market data dict for crash detection
        market_data_dict = market_data if market_data else {}
        
        result = await brake.check_emergency_conditions(pair, current_price, market_data_dict)
        
        if result["should_pause"]:
            self.paused = True
            logger.warning(f"🚨 Emergency brake triggered for {pair}: {result['reason']}")
            
        return result["should_pause"]
        
    async def _check_and_execute_profit_targets(self, pair: str, current_price: float):
        """Check and execute profit taking strategies."""
        if not self.paper_trading or not self.trading_engine:
            return
            
        position = self.trading_engine.get_position(pair)
        if not position or not position.get("entries"):
            return  # No position
            
        # Get position details
        position_pnl = self.trading_engine.get_position_pnl(pair, current_price)
        if position_pnl["avg_entry_price"] == 0:
            return
            
        # Check profit targets
        actions = await self._check_profit_targets(
            pair, current_price,
            position_pnl["avg_entry_price"],
            position_pnl["total_qty"],
            position["entries"][0]["date"] if position["entries"] else datetime.now()
        )
        
        # Execute sell actions
        for action in actions:
            if action["action"] == "sell_partial":
                await self.trading_engine.execute_sell(
                    pair, action["amount"], current_price,
                    reason=action["reason"]
                )
            elif action["action"] == "sell_all":
                await self.trading_engine.execute_sell(
                    pair, position_pnl["total_qty"], current_price,
                    reason=action["reason"]
                )
            elif action["action"] == "close_and_restart":
                await self.trading_engine.execute_sell(
                    pair, position_pnl["total_qty"], current_price,
                    reason=action["reason"]
                )
                # TODO: Restart bot with original capital
        
    async def _check_market_regime(self, pair: str, market_df: pd.DataFrame) -> Dict[str, Any]:
        """Check market regime and determine pause/resume."""
        if not self.market_regime or not self.market_regime.get("enabled"):
            return {"should_pause": False, "should_resume": False}
            
        from regime_detector import MarketRegimeDetector
        
        detector = MarketRegimeDetector(self.market_regime)
        result = await detector.check_regime(market_df, pair)
        
        return result
        
    async def _check_profit_targets(self, pair: str, current_price: float,
                                   entry_price: float, position_size: float,
                                   entry_date) -> List[Dict[str, Any]]:
        """Check and execute profit taking strategies."""
        if not self.profit_strategy:
            return []
            
        from profit_taker import ProfitTaker
        
        taker = ProfitTaker(self.profit_strategy)
        
        # Get entry date (should come from position tracking)
        if not entry_date:
            entry_date = datetime.now() - timedelta(days=1)
            
        actions = await taker.check_profit_targets(
            pair, current_price, entry_price, position_size, entry_date
        )
        
        return actions
        
    async def cleanup(self):
        """Cleanup resources."""
        await self.market_data.cleanup()
        
    async def get_statistics(self) -> Dict[str, Any]:
        """Get bot execution statistics."""
        if not self.paper_trading or not self.trading_engine:
            return {}
            
        # Get current prices for all positions
        current_prices = {}
        for pair in self.config.get("selectedPairs", []):
            try:
                price = await self.market_data.get_current_price(pair)
                if price > 0:
                    current_prices[pair] = price
            except Exception as e:
                logger.error(f"Error fetching price for {pair}: {e}")
                
        stats = self.trading_engine.get_statistics(current_prices)
        stats["paused"] = self.paused
        stats["last_dca_times"] = {
            pair: dt.isoformat() if dt else None
            for pair, dt in self.last_dca_time.items()
        }
        
        # Add position details
        position_details = {}
        for pair in self.config.get("selectedPairs", []):
            if pair in current_prices:
                pos_pnl = self.trading_engine.get_position_pnl(pair, current_prices[pair])
                position_details[pair] = pos_pnl
                
        stats["positions"] = position_details
        
        return stats


async def execute_dca_bot(bot_config: Dict[str, Any]) -> Dict[str, Any]:
    """Entry point for executing a DCA bot."""
    executor = DCABotExecutor(bot_config)
    await executor.initialize()
    await executor.execute_once()
    return {"status": "success", "executed": True}

