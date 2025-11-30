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

# Add backend and alerts paths for evaluator
backend_path = os.path.join(os.path.dirname(__file__), '..', '..', 'backend')
alerts_path = os.path.join(os.path.dirname(__file__), '..', 'alerts')
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)
if alerts_path not in sys.path:
    sys.path.insert(0, alerts_path)

from market_data import MarketDataService
from paper_trading import PaperTradingEngine
from db_service import db_service

logger = logging.getLogger(__name__)


class DCABotExecutor:
    """Executes DCA bot strategy with advanced features."""
    
    def __init__(self, bot_config: Dict[str, Any], paper_trading: bool = True, 
                 initial_balance: float = 10000.0):
        self.config = bot_config
        self.bot_id = None
        self.user_id = None
        self.run_id = None
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
                run_id=self.run_id,
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
        bot_name = self.config.get('botName', 'Unknown')
        logger.info(f"Initializing DCA bot: {bot_name} (Paper Trading: {self.paper_trading})")
        
        # Log initialization event
        if self.bot_id and self.user_id and db_service:
            db_service.log_event(
                bot_id=self.bot_id,
                run_id=getattr(self, 'run_id', None),
                user_id=self.user_id,
                event_type="bot_initialized",
                event_category="system",
                message=f"DCA bot '{bot_name}' initialized in {'paper trading' if self.paper_trading else 'live trading'} mode",
                details={
                    "bot_name": bot_name,
                    "paper_trading": self.paper_trading,
                    "pairs": self.config.get("selectedPairs", []),
                    "interval": self.config.get("interval", "1h")
                }
            )
        
        # Initialize market data service
        await self.market_data.initialize()
        
        # Initialize trading engine if paper trading
        if self.paper_trading:
            balance = self.trading_engine.get_balance()
            logger.info(f"Paper trading initialized with balance: {balance}")
            
            # Log balance initialization
            if self.bot_id and self.user_id and db_service:
                db_service.log_event(
                    bot_id=self.bot_id,
                    run_id=getattr(self, 'run_id', None),
                    user_id=self.user_id,
                    event_type="balance_initialized",
                    event_category="system",
                    message=f"Paper trading balance initialized: ${balance:.2f}",
                    details={"initial_balance": balance}
                )
        
        self.status = "running"
        
    async def execute_once(self):
        """Execute one iteration of the bot."""
        if self.paused:
            logger.info("Bot is paused by market regime detection")
            # Log pause event
            if self.bot_id and self.user_id and db_service:
                db_service.log_event(
                    bot_id=self.bot_id,
                    run_id=getattr(self, 'run_id', None),
                    user_id=self.user_id,
                    event_type="bot_paused",
                    event_category="system",
                    message="Bot execution paused by market regime detection",
                    details={"reason": "market_regime"}
                )
            return
            
        # Process each pair
        pairs = self.config.get("selectedPairs", [])
        
        # Normalize pair format (ETH/USDT -> ETHUSDT)
        def normalize_pair(pair: str) -> str:
            """Normalize pair format for API calls."""
            return pair.replace('/', '').replace('-', '').upper()
        
        # Fetch current prices for all pairs
        current_prices = {}
        market_data_dict = {}
        
        for pair in pairs:
            # Normalize pair for API calls
            normalized_pair = normalize_pair(pair)
            logger.debug(f"Processing pair: {pair} (normalized: {normalized_pair})")
            
            # Get current price
            price = await self.market_data.get_current_price(normalized_pair)
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
            normalized_pair = normalize_pair(pair)
            if normalized_pair not in current_prices or current_prices[normalized_pair] <= 0:
                logger.warning(f"Could not fetch price for {pair} (normalized: {normalized_pair}), skipping")
                continue
                
            current_price = current_prices[normalized_pair]
            
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
                        # Log override
                        if self.bot_id and self.user_id and db_service:
                            db_service.log_event(
                                bot_id=self.bot_id,
                                run_id=getattr(self, 'run_id', None),
                                user_id=self.user_id,
                                event_type="market_regime_override",
                                event_category="risk",
                                message=f"Market regime pause overridden by entry condition for {pair}",
                                symbol=pair,
                                details={"reason": regime_result.get('reason'), "override_reason": "entry_condition_triggered"}
                            )
                        # Don't pause - entry condition takes precedence
                    else:
                        self.paused = True
                        reason = regime_result.get('reason', 'Unknown')
                        logger.info(f"⏸️ Market regime pause for {pair}: {reason}")
                        # Log pause
                        if self.bot_id and self.user_id and db_service:
                            db_service.log_event(
                                bot_id=self.bot_id,
                                run_id=getattr(self, 'run_id', None),
                                user_id=self.user_id,
                                event_type="market_regime_pause",
                                event_category="risk",
                                message=f"Market regime pause for {pair}: {reason}",
                                symbol=pair,
                                details={"reason": reason}
                            )
                        continue
                elif regime_result.get("should_resume"):
                    self.paused = False
                    reason = regime_result.get('reason', 'Unknown')
                    logger.info(f"▶️ Market regime resume for {pair}: {reason}")
                    # Log resume
                    if self.bot_id and self.user_id and db_service:
                        db_service.log_event(
                            bot_id=self.bot_id,
                            run_id=getattr(self, 'run_id', None),
                            user_id=self.user_id,
                            event_type="market_regime_resume",
                            event_category="risk",
                            message=f"Market regime resume for {pair}: {reason}",
                            symbol=pair,
                            details={"reason": reason}
                        )
            
            # Check emergency brake
            emergency_brake_triggered = await self._check_emergency_brake(pair, current_price, market_data_dict)
            if emergency_brake_triggered:
                logger.warning(f"Emergency brake triggered for {pair} - skipping")
                # Emergency brake logging is done in _check_emergency_brake method
                continue
            
            # Check profit targets before new DCA
            await self._check_and_execute_profit_targets(pair, current_price)
                    
            await self._process_pair(pair, current_price, market_data_dict.get(pair))
            
    async def _process_pair(self, pair: str, current_price: float, market_df: Optional[pd.DataFrame] = None):
        """Process a single trading pair."""
        # Check if we should execute DCA
        should_execute = await self._should_execute_dca(pair, current_price, market_df)
        logger.info(f"Should execute DCA for {pair}: {should_execute} (price: ${current_price:.2f})")
        if not should_execute:
            logger.debug(f"Skipping DCA for {pair} - conditions not met")
            return
            
        # Calculate DCA amount with dynamic scaling
        base_amount = self.config.get("baseOrderSize", 100)
        scaled_amount = await self._calculate_scaled_amount(pair, base_amount, market_df)
        
        # Execute DCA order
        if self.paper_trading and self.trading_engine:
            # Log DCA trigger event
            if self.bot_id and self.user_id and db_service:
                db_service.log_event(
                    bot_id=self.bot_id,
                    run_id=getattr(self, 'run_id', None),
                    user_id=self.user_id,
                    event_type="dca_triggered",
                    event_category="execution",
                    message=f"DCA triggered for {pair}: ${scaled_amount:.2f} @ ${current_price:.2f}",
                    symbol=pair,
                    details={
                        "amount": scaled_amount,
                        "price": current_price,
                        "base_amount": self.config.get("baseOrderSize", 100),
                        "scaled": scaled_amount != self.config.get("baseOrderSize", 100)
                    }
                )
            
            logger.info(f"🔄 Attempting to execute DCA order for {pair}: ${scaled_amount:.2f} @ ${current_price:.2f}")
            result = await self.trading_engine.execute_buy(pair, scaled_amount, current_price)
            logger.info(f"📊 DCA execution result for {pair}: {result}")
            if result.get("success"):
                logger.info(f"✅ Paper DCA executed for {pair}: {result['quantity']:.6f} @ ${current_price:.2f} = ${scaled_amount:.2f}")
                self.last_dca_time[pair] = datetime.now()
                
                # Log successful DCA execution
                if self.bot_id and self.user_id and db_service:
                    db_service.log_event(
                        bot_id=self.bot_id,
                        run_id=getattr(self, 'run_id', None),
                        user_id=self.user_id,
                        event_type="dca_executed",
                        event_category="execution",
                        message=f"DCA executed successfully for {pair}: {result['quantity']:.6f} @ ${current_price:.2f}",
                        symbol=pair,
                        details={
                            "order_id": result.get("order_id"),
                            "quantity": result['quantity'],
                            "price": current_price,
                            "cost": scaled_amount,
                            "timestamp": result.get("timestamp").isoformat() if result.get("timestamp") else None
                        }
                    )
                
                # Update position state
                self.position_states[pair] = {
                    "last_entry_price": current_price,
                    "last_entry_time": datetime.now(),
                    "total_entries": len(self.trading_engine.positions.get(pair, {}).get("entries", []))
                }
            else:
                error_msg = result.get('error', 'Unknown error')
                logger.error(f"❌ DCA failed for {pair}: {error_msg}")
                
                # Log DCA failure
                if self.bot_id and self.user_id and db_service:
                    db_service.log_event(
                        bot_id=self.bot_id,
                        run_id=getattr(self, 'run_id', None),
                        user_id=self.user_id,
                        event_type="dca_failed",
                        event_category="execution",
                        message=f"DCA execution failed for {pair}: {error_msg}",
                        symbol=pair,
                        details={"error": error_msg, "amount": scaled_amount, "price": current_price}
                    )
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
        
        # For first trade: if "Open Immediately" mode, skip condition check, DCA rules, and cooldown
        if is_first_trade and not trade_start_condition:
            # Open immediately - skip all checks for first trade
            logger.info(f"First trade for {pair}: Opening immediately (no condition check, no DCA rules, no cooldown)")
            # Skip to execution - don't check anything for immediate first trade
            # Return True to proceed with order execution
            return True
        else:
            # Check entry conditions for subsequent trades or if "Wait for Signal" mode
            if condition_config:
                if not await self._evaluate_entry_conditions(pair, condition_config, market_df):
                    return False
                    
            # Check DCA rules (only for subsequent trades or if "Wait for Signal" mode)
            dca_rules = self.config.get("dcaRules", {})
            dca_rule_result = await self._evaluate_dca_rules(pair, dca_rules, current_price)
            if not dca_rule_result:
                # Log DCA rule failure
                if self.bot_id and self.user_id and db_service:
                    db_service.log_event(
                        bot_id=self.bot_id,
                        run_id=getattr(self, 'run_id', None),
                        user_id=self.user_id,
                        event_type="dca_rule_failed",
                        event_category="condition",
                        message=f"DCA rule not met for {pair}",
                        symbol=pair,
                        details={"rule_type": dca_rules.get("ruleType"), "current_price": current_price}
                    )
                return False
            else:
                # Log DCA rule pass
                if self.bot_id and self.user_id and db_service:
                    db_service.log_event(
                        bot_id=self.bot_id,
                        run_id=getattr(self, 'run_id', None),
                        user_id=self.user_id,
                        event_type="dca_rule_passed",
                        event_category="condition",
                        message=f"DCA rule met for {pair}",
                        symbol=pair,
                        details={"rule_type": dca_rules.get("ruleType"), "current_price": current_price}
                    )
            
            # Check cooldown (only for subsequent trades or if "Wait for Signal" mode)
            dca_rules = self.config.get("dcaRules", {})
            cooldown_result = await self._check_dca_cooldown(pair, dca_rules)
            if not cooldown_result:
                # Log cooldown active and return False
                if self.bot_id and self.user_id and db_service:
                    last_dca = self.last_dca_time.get(pair)
                    db_service.log_event(
                        bot_id=self.bot_id,
                        run_id=getattr(self, 'run_id', None),
                        user_id=self.user_id,
                        event_type="cooldown_active",
                        event_category="system",
                        message=f"DCA cooldown active for {pair}",
                        symbol=pair,
                        details={
                            "last_dca_time": last_dca.isoformat() if last_dca else None,
                            "cooldown_value": dca_rules.get("dcaCooldownValue", 0),
                            "cooldown_unit": dca_rules.get("dcaCooldownUnit", "minutes")
                        }
                    )
                return False
            
        return True
        
    async def _evaluate_entry_conditions(self, pair: str, condition_config: Dict,
                                        market_df: Optional[pd.DataFrame] = None) -> bool:
        """Evaluate entry conditions (playbook or simple) using backend evaluator."""
        # If no condition config, allow entry
        if condition_config is None:
            return True
        
        if market_df is None or market_df.empty:
            # If conditions are set but no data, skip
            if condition_config:
                logger.warning(f"No market data for {pair}, cannot evaluate conditions")
                return False
            return True  # No conditions = allow entry
        
        try:
            # Import evaluator and alert manager
            from backend.evaluator import evaluate_condition, evaluate_playbook
            from apps.alerts.alert_manager import AlertManager
            from apps.alerts.datasource import CandleSource
            
            # Prepare dataframe: ensure it has 'time' column (AlertManager expects 'time' not 'open_time')
            df = market_df.copy()
            if 'time' not in df.columns and 'open_time' in df.columns:
                df['time'] = df['open_time']
            elif 'time' not in df.columns:
                # If no time column, create one from index or use sequential
                if df.index.name == 'time' or isinstance(df.index, pd.DatetimeIndex):
                    df = df.reset_index()
                    if 'time' not in df.columns:
                        df['time'] = df.index
            
            # Get mode (playbook or simple)
            mode = condition_config.get("mode", "simple")
            
            if mode == "playbook":
                # Playbook mode: multiple conditions with AND/OR logic
                playbook_conditions = condition_config.get("conditions", [])
                gate_logic = condition_config.get("gateLogic", "ALL")  # ALL = AND, ANY = OR
                
                if not playbook_conditions:
                    logger.warning(f"No conditions in playbook for {pair}")
                    return True  # No conditions = allow entry
                
                # Extract conditions for indicator application
                conditions_to_evaluate = []
                for playbook_condition in playbook_conditions:
                    if not playbook_condition.get("enabled", True):
                        continue
                    
                    condition_data = playbook_condition.get("condition", {})
                    condition_type = playbook_condition.get("conditionType", "indicator")
                    
                    # Build condition dict for evaluator
                    condition = {
                        "type": "price" if condition_type == "Price Action" else "indicator",
                        "indicator": condition_data.get("indicator"),
                        "component": condition_data.get("component"),
                        "operator": condition_data.get("operator", ">"),
                        "compareWith": condition_data.get("compareWith", "value"),
                        "compareValue": condition_data.get("compareValue") or condition_data.get("value"),
                        "timeframe": condition_data.get("timeframe", "same"),
                        "period": condition_data.get("period"),
                    }
                    
                    # Add RHS for price action conditions
                    if condition_data.get("rhs"):
                        condition["rhs"] = condition_data.get("rhs")
                    
                    # Add price field for price conditions
                    if condition_type == "Price Action":
                        condition["priceField"] = condition_data.get("priceField", "close")
                        condition["maLength"] = condition_data.get("maLength")
                        condition["priceMaType"] = condition_data.get("priceMaType", "EMA")
                        condition["percentage"] = condition_data.get("percentage")
                    
                    # Add bounds for 'between' operator
                    if condition_data.get("lowerBound") is not None:
                        condition["lowerBound"] = condition_data.get("lowerBound")
                    if condition_data.get("upperBound") is not None:
                        condition["upperBound"] = condition_data.get("upperBound")
                    
                    conditions_to_evaluate.append(condition)
                
                if not conditions_to_evaluate:
                    return True  # No enabled conditions = allow entry
                
                # Apply indicators needed for conditions
                df_with_indicators = await self._apply_indicators(df, conditions_to_evaluate)
                
                # Build playbook structure for evaluator
                playbook = {
                    "gateLogic": gate_logic,
                    "evaluationOrder": "priority",
                    "conditions": []
                }
                
                for i, playbook_condition in enumerate(playbook_conditions):
                    if not playbook_condition.get("enabled", True):
                        continue
                    
                    condition_data = playbook_condition.get("condition", {})
                    condition_type = playbook_condition.get("conditionType", "indicator")
                    
                    condition = {
                        "type": "price" if condition_type == "Price Action" else "indicator",
                        "indicator": condition_data.get("indicator"),
                        "component": condition_data.get("component"),
                        "operator": condition_data.get("operator", ">"),
                        "compareWith": condition_data.get("compareWith", "value"),
                        "compareValue": condition_data.get("compareValue") or condition_data.get("value"),
                        "timeframe": condition_data.get("timeframe", "same"),
                        "period": condition_data.get("period"),
                    }
                    
                    if condition_data.get("rhs"):
                        condition["rhs"] = condition_data.get("rhs")
                    
                    if condition_type == "Price Action":
                        condition["priceField"] = condition_data.get("priceField", "close")
                        condition["maLength"] = condition_data.get("maLength")
                        condition["priceMaType"] = condition_data.get("priceMaType", "EMA")
                        condition["percentage"] = condition_data.get("percentage")
                    
                    if condition_data.get("lowerBound") is not None:
                        condition["lowerBound"] = condition_data.get("lowerBound")
                    if condition_data.get("upperBound") is not None:
                        condition["upperBound"] = condition_data.get("upperBound")
                    
                    playbook["conditions"].append({
                        "id": playbook_condition.get("id", f"cond_{i}"),
                        "priority": playbook_condition.get("priority", i),
                        "enabled": True,
                        "condition": condition,
                        "logic": playbook_condition.get("logic", "AND"),
                        "validityDuration": playbook_condition.get("validityDuration"),
                        "validityDurationUnit": playbook_condition.get("validityDurationUnit", "bars")
                    })
                
                # Evaluate playbook
                result = evaluate_playbook(df_with_indicators, playbook)
                triggered = result.get("triggered", False)
                
                if triggered:
                    logger.info(f"✅ Entry conditions met for {pair} (playbook mode, {gate_logic} logic)")
                    # Log entry condition pass
                    if self.bot_id and self.user_id and db_service:
                        db_service.log_event(
                            bot_id=self.bot_id,
                            run_id=getattr(self, 'run_id', None),
                            user_id=self.user_id,
                            event_type="entry_condition_passed",
                            event_category="condition",
                            message=f"Entry conditions met for {pair} (playbook mode, {gate_logic} logic)",
                            symbol=pair,
                            details={"mode": "playbook", "gate_logic": gate_logic, "conditions_count": len(playbook_conditions)}
                        )
                else:
                    logger.debug(f"❌ Entry conditions not met for {pair} (playbook mode)")
                    # Log entry condition fail
                    if self.bot_id and self.user_id and db_service:
                        db_service.log_event(
                            bot_id=self.bot_id,
                            run_id=getattr(self, 'run_id', None),
                            user_id=self.user_id,
                            event_type="entry_condition_failed",
                            event_category="condition",
                            message=f"Entry conditions not met for {pair} (playbook mode)",
                            symbol=pair,
                            details={"mode": "playbook", "gate_logic": gate_logic}
                        )
                
                return triggered
            
            else:
                # Simple mode: single condition
                condition_data = condition_config.get("condition", {})
                condition_type = condition_config.get("conditionType", "indicator")
                
                if not condition_data:
                    return True  # No condition = allow entry
                
                # Build condition dict
                condition = {
                    "type": "price" if condition_type == "Price Action" else "indicator",
                    "indicator": condition_data.get("indicator"),
                    "component": condition_data.get("component"),
                    "operator": condition_data.get("operator", ">"),
                    "compareWith": condition_data.get("compareWith", "value"),
                    "compareValue": condition_data.get("compareValue") or condition_data.get("value"),
                    "timeframe": condition_data.get("timeframe", "same"),
                    "period": condition_data.get("period"),
                }
                
                # Add RHS for price action conditions
                if condition_data.get("rhs"):
                    condition["rhs"] = condition_data.get("rhs")
                
                # Add price field for price conditions
                if condition_type == "Price Action":
                    condition["priceField"] = condition_data.get("priceField", "close")
                    condition["maLength"] = condition_data.get("maLength")
                    condition["priceMaType"] = condition_data.get("priceMaType", "EMA")
                    condition["percentage"] = condition_data.get("percentage")
                
                # Add bounds for 'between' operator
                if condition_data.get("lowerBound") is not None:
                    condition["lowerBound"] = condition_data.get("lowerBound")
                if condition_data.get("upperBound") is not None:
                    condition["upperBound"] = condition_data.get("upperBound")
                
                # Apply indicators needed for condition
                df_with_indicators = await self._apply_indicators(df, [condition])
                
                # Evaluate condition
                row_index = len(df_with_indicators) - 1
                if row_index < 0:
                    logger.warning(f"Empty dataframe after indicator application for {pair}")
                    return False
                
                result = evaluate_condition(df_with_indicators, row_index, condition)
                
                if result:
                    logger.info(f"✅ Entry condition met for {pair} (simple mode)")
                    # Log entry condition pass
                    if self.bot_id and self.user_id and db_service:
                        db_service.log_event(
                            bot_id=self.bot_id,
                            run_id=getattr(self, 'run_id', None),
                            user_id=self.user_id,
                            event_type="entry_condition_passed",
                            event_category="condition",
                            message=f"Entry condition met for {pair} (simple mode)",
                            symbol=pair,
                            details={"mode": "simple", "condition": condition}
                        )
                else:
                    logger.debug(f"❌ Entry condition not met for {pair} (simple mode)")
                    # Log entry condition fail
                    if self.bot_id and self.user_id and db_service:
                        db_service.log_event(
                            bot_id=self.bot_id,
                            run_id=getattr(self, 'run_id', None),
                            user_id=self.user_id,
                            event_type="entry_condition_failed",
                            event_category="condition",
                            message=f"Entry condition not met for {pair} (simple mode)",
                            symbol=pair,
                            details={"mode": "simple"}
                        )
                
                return result
                
        except Exception as e:
            logger.error(f"Error evaluating entry conditions for {pair}: {e}", exc_info=True)
            # On error, be conservative: don't allow entry
            return False
    
    async def _apply_indicators(self, df: pd.DataFrame, conditions: List[Dict]) -> pd.DataFrame:
        """
        Apply indicators needed for conditions to the dataframe.
        
        Uses AlertManager's indicator application logic.
        """
        try:
            from apps.alerts.alert_manager import AlertManager
            from apps.alerts.datasource import CandleSource
            
            # Create AlertManager instance for indicator calculation
            # We don't need a real CandleSource since we're providing the dataframe
            src = CandleSource()
            manager = AlertManager(src)
            
            # Apply indicators
            df_with_indicators = manager._apply_needed_indicators(df, conditions)
            
            return df_with_indicators
            
        except Exception as e:
            logger.error(f"Error applying indicators: {e}", exc_info=True)
            # Return original dataframe on error
            return df
        
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
            # Evaluate custom condition using evaluator
            try:
                custom_condition_config = dca_rules.get("customCondition", {})
                if not custom_condition_config:
                    logger.warning(f"No custom condition config for {pair}")
                    return False
                
                condition_data = custom_condition_config.get("condition", {})
                if not condition_data:
                    logger.warning(f"No condition data in custom condition for {pair}")
                    return False
                
                condition_type = custom_condition_config.get("conditionType", "indicator")
                
                # Get market data if not already available
                # We need market data for indicator evaluation
                interval = self.config.get("interval", "1h")
                market_df = await self.market_data.get_klines_as_dataframe(pair, interval, 200)
                
                if market_df.empty:
                    logger.warning(f"No market data for custom condition evaluation for {pair}")
                    return False
                
                # Prepare dataframe: ensure it has 'time' column
                df = market_df.copy()
                if 'time' not in df.columns and 'open_time' in df.columns:
                    df['time'] = df['open_time']
                elif 'time' not in df.columns:
                    if df.index.name == 'time' or isinstance(df.index, pd.DatetimeIndex):
                        df = df.reset_index()
                        if 'time' not in df.columns:
                            df['time'] = df.index
                
                # Build condition dict
                condition = {
                    "type": "price" if condition_type == "Price Action" else "indicator",
                    "indicator": condition_data.get("indicator"),
                    "component": condition_data.get("component"),
                    "operator": condition_data.get("operator", ">"),
                    "compareWith": condition_data.get("compareWith", "value"),
                    "compareValue": condition_data.get("compareValue") or condition_data.get("value"),
                    "timeframe": condition_data.get("timeframe", "same"),
                    "period": condition_data.get("period"),
                }
                
                # Add RHS for price action conditions
                if condition_data.get("rhs"):
                    condition["rhs"] = condition_data.get("rhs")
                
                # Add price field for price conditions
                if condition_type == "Price Action":
                    condition["priceField"] = condition_data.get("priceField", "close")
                    condition["maLength"] = condition_data.get("maLength")
                    condition["priceMaType"] = condition_data.get("priceMaType", "EMA")
                    condition["percentage"] = condition_data.get("percentage")
                
                # Add bounds for 'between' operator
                if condition_data.get("lowerBound") is not None:
                    condition["lowerBound"] = condition_data.get("lowerBound")
                if condition_data.get("upperBound") is not None:
                    condition["upperBound"] = condition_data.get("upperBound")
                
                # Apply indicators and evaluate
                df_with_indicators = await self._apply_indicators(df, [condition])
                
                if df_with_indicators.empty:
                    logger.warning(f"Empty dataframe after indicator application for custom condition on {pair}")
                    return False
                
                from backend.evaluator import evaluate_condition
                row_index = len(df_with_indicators) - 1
                result = evaluate_condition(df_with_indicators, row_index, condition)
                
                if result:
                    logger.info(f"✅ Custom DCA condition met for {pair}")
                else:
                    logger.debug(f"❌ Custom DCA condition not met for {pair}")
                
                return result
                
            except Exception as e:
                logger.error(f"Error evaluating custom DCA condition for {pair}: {e}", exc_info=True)
                return False
            
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
            # Convert bars to time based on bot's timeframe
            timeframe = self.config.get("interval", "1h")
            
            # Timeframe to minutes mapping
            timeframe_minutes = {
                "1m": 1,
                "5m": 5,
                "15m": 15,
                "30m": 30,
                "1h": 60,
                "4h": 240,
                "1d": 1440,
                "1w": 10080
            }
            
            minutes_per_bar = timeframe_minutes.get(timeframe, 60)  # Default to 1h
            cooldown_delta = timedelta(minutes=cooldown_value * minutes_per_bar)
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
            reason = result.get('reason', 'Unknown')
            logger.warning(f"🚨 Emergency brake triggered for {pair}: {reason}")
            
            # Log emergency brake trigger
            if self.bot_id and self.user_id and db_service:
                db_service.log_event(
                    bot_id=self.bot_id,
                    run_id=getattr(self, 'run_id', None),
                    user_id=self.user_id,
                    event_type="emergency_brake_triggered",
                    event_category="risk",
                    message=f"Emergency brake triggered for {pair}: {reason}",
                    symbol=pair,
                    details={"reason": reason, "current_price": current_price}
                )
            
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
            action_type = action["action"]
            reason = action.get("reason", "")
            
            # Log profit target hit
            if self.bot_id and self.user_id and db_service:
                db_service.log_event(
                    bot_id=self.bot_id,
                    run_id=getattr(self, 'run_id', None),
                    user_id=self.user_id,
                    event_type="profit_target_hit",
                    event_category="execution",
                    message=f"Profit target hit for {pair}: {action_type} - {reason}",
                    symbol=pair,
                    details={
                        "action": action_type,
                        "reason": reason,
                        "current_price": current_price,
                        "entry_price": entry_price,
                        "pnl_percent": position_pnl.get("pnl_percent", 0),
                        "pnl_amount": position_pnl.get("pnl_amount", 0)
                    }
                )
            
            if action_type == "sell_partial":
                await self.trading_engine.execute_sell(
                    pair, action["amount"], current_price,
                    reason=reason
                )
            elif action_type == "sell_all":
                await self.trading_engine.execute_sell(
                    pair, position_pnl["total_qty"], current_price,
                    reason=reason
                )
            elif action_type == "close_and_restart":
                await self.trading_engine.execute_sell(
                    pair, position_pnl["total_qty"], current_price,
                    reason=reason
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

