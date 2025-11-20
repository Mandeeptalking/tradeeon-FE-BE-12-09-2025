"""Centralized Condition Evaluator - Evaluates conditions once and distributes to all subscribers."""

import asyncio
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime
import pandas as pd
import sys
import os

# Add paths
bots_path = os.path.dirname(__file__)
if bots_path not in sys.path:
    sys.path.insert(0, bots_path)

from market_data import MarketDataService
from backend.evaluator import evaluate_condition

logger = logging.getLogger(__name__)


class CentralizedConditionEvaluator:
    """
    Centralized condition evaluator that:
    1. Fetches market data once per symbol/timeframe
    2. Calculates indicators once
    3. Evaluates all conditions for that symbol/timeframe
    4. Publishes events when conditions are triggered
    """
    
    def __init__(self, supabase_client=None, event_bus=None):
        self.market_data = MarketDataService()
        self.supabase = supabase_client
        self.event_bus = event_bus  # Redis/RabbitMQ event bus
        self.evaluation_cache = {}  # Cache indicator values
        self.running = False
        
    async def initialize(self):
        """Initialize the evaluator."""
        await self.market_data.initialize()
        self.running = True
        logger.info("Centralized Condition Evaluator initialized")
    
    async def evaluate_symbol_timeframe(self, symbol: str, timeframe: str):
        """
        Evaluate all conditions for a specific symbol/timeframe.
        
        This is the core optimization: fetch data once, calculate indicators once,
        evaluate all conditions using cached values.
        
        KEY OPTIMIZATION: Even if 500 users have different price ranges on BTCUSDT,
        we fetch BTCUSDT data ONCE and evaluate all conditions together.
        """
        if not self.running:
            return
        
        try:
            # Step 1: Fetch market data once (shared by ALL conditions for this symbol/timeframe)
            logger.debug(f"Fetching market data for {symbol} {timeframe} (shared by all conditions)")
            df = await self.market_data.get_klines_as_dataframe(symbol, timeframe, limit=200)
            
            if df.empty:
                logger.warning(f"No data for {symbol} {timeframe}")
                return
            
            # Step 2: Get ALL conditions for this symbol/timeframe
            # This includes conditions from ALL users with different price ranges
            conditions = await self._get_conditions_for_symbol_timeframe(symbol, timeframe)
            
            if not conditions:
                logger.debug(f"No conditions to evaluate for {symbol} {timeframe}")
                return
            
            logger.debug(f"Evaluating {len(conditions)} conditions for {symbol} {timeframe} using shared market data")
            
            # Step 3: Calculate indicators once (only for indicator-based conditions)
            # Price conditions don't need indicators - they use price directly
            indicator_cache = await self._calculate_indicators(df, conditions)
            
            # Step 4: Evaluate each condition using the SAME market data
            # Even if conditions have different price ranges, they all use same price data
            current_price = float(df.iloc[-1]["close"])
            
            for condition in conditions:
                await self._evaluate_condition(condition, df, indicator_cache, symbol, timeframe)
            
            # Step 5: Update evaluation cache
            await self._update_evaluation_cache(symbol, timeframe, df.iloc[-1].name, indicator_cache)
            
        except Exception as e:
            logger.error(f"Error evaluating {symbol} {timeframe}: {e}", exc_info=True)
    
    async def _get_conditions_for_symbol_timeframe(self, symbol: str, timeframe: str) -> List[Dict]:
        """Get all unique conditions for a symbol/timeframe."""
        if not self.supabase:
            return []
        
        try:
            result = self.supabase.table("condition_registry").select("*").eq(
                "symbol", symbol
            ).eq("timeframe", timeframe).execute()
            
            return result.data if result.data else []
        except Exception as e:
            logger.error(f"Error fetching conditions: {e}")
            return []
    
    async def _calculate_indicators(self, df: pd.DataFrame, conditions: List[Dict]) -> Dict[str, Any]:
        """
        Calculate all needed indicators once.
        
        Returns a cache of indicator values that can be reused.
        Note: Price conditions don't need indicator calculation - price is already in df.
        """
        cache = {}
        indicators_needed = set()
        
        # Collect all unique indicators needed (skip price conditions)
        for condition in conditions:
            indicator_config = condition.get("indicator_config", {})
            condition_type = indicator_config.get("condition_type", "indicator")
            
            # Skip price conditions - they use price directly from df
            if condition_type == "price":
                continue
            
            indicator = indicator_config.get("indicator")
            if indicator:
                indicators_needed.add(indicator)
        
        # Calculate each indicator once
        for indicator in indicators_needed:
            try:
                if indicator == "RSI":
                    period = 14  # Default, could be extracted from condition
                    cache["RSI"] = self._calculate_rsi(df, period)
                elif indicator == "MACD":
                    cache["MACD"] = self._calculate_macd(df)
                elif indicator in ["EMA", "SMA"]:
                    period = 20  # Default
                    cache[indicator] = self._calculate_ma(df, indicator, period)
                # Add more indicators as needed
            except Exception as e:
                logger.error(f"Error calculating {indicator}: {e}")
        
        return cache
    
    async def _evaluate_condition(
        self, 
        condition: Dict, 
        df: pd.DataFrame, 
        indicator_cache: Dict,
        symbol: str,
        timeframe: str
    ):
        """Evaluate a single condition."""
        try:
            condition_id = condition["condition_id"]
            indicator_config = condition.get("indicator_config", {})
            condition_type = indicator_config.get("condition_type", "indicator")
            
            # Prepare condition for evaluation
            eval_condition = {
                "type": condition_type,
                "indicator": indicator_config.get("indicator"),
                "component": indicator_config.get("component"),
                "operator": indicator_config.get("operator", "between" if condition_type == "price" else ">"),
                "compareWith": indicator_config.get("compare_with", "value"),
                "compareValue": indicator_config.get("compare_value"),
                "period": indicator_config.get("period"),
            }
            
            # Handle price conditions (for grid bots)
            if condition_type == "price":
                eval_condition["priceField"] = indicator_config.get("price_field", "close")
                # Add bounds for "between" operator
                if indicator_config.get("lower_bound") is not None:
                    eval_condition["lowerBound"] = indicator_config["lower_bound"]
                if indicator_config.get("upper_bound") is not None:
                    eval_condition["upperBound"] = indicator_config["upper_bound"]
            
            # Evaluate condition
            row_index = len(df) - 1  # Latest candle
            triggered = evaluate_condition(df, row_index, eval_condition)
            
            if triggered:
                # Condition triggered! Publish event
                await self._publish_condition_trigger(condition_id, symbol, timeframe, eval_condition, df.iloc[-1])
                
                # Update condition stats
                await self._update_condition_stats(condition_id)
        
        except Exception as e:
            logger.error(f"Error evaluating condition {condition.get('condition_id')}: {e}", exc_info=True)
    
    async def _publish_condition_trigger(
        self,
        condition_id: str,
        symbol: str,
        timeframe: str,
        condition: Dict,
        latest_candle: pd.Series
    ):
        """Publish condition trigger event to all subscribers."""
        try:
            # Get all subscribers for this condition
            if self.supabase:
                subscribers = self.supabase.table("user_condition_subscriptions").select(
                    "user_id, bot_id, bot_type, bot_config"
                ).eq("condition_id", condition_id).eq("active", True).execute()
                
                if not subscribers.data:
                    logger.debug(f"No subscribers for condition {condition_id}")
                    return
                
                # Create trigger event
                trigger_event = {
                    "condition_id": condition_id,
                    "symbol": symbol,
                    "timeframe": timeframe,
                    "triggered_at": datetime.now().isoformat(),
                    "trigger_value": {
                        "price": float(latest_candle.get("close", 0)),
                        "volume": float(latest_candle.get("volume", 0)),
                    },
                    "subscribers_count": len(subscribers.data)
                }
                
                # Log trigger
                if self.supabase:
                    self.supabase.table("condition_triggers").insert(trigger_event).execute()
                
                # Publish to event bus (if available)
                if self.event_bus:
                    channel = f"condition.{condition_id}"
                    await self.event_bus.publish(channel, trigger_event)
                    logger.debug(f"Published trigger event to channel: {channel}")
                
                # Notify each subscriber
                for subscriber in subscribers.data:
                    await self._notify_subscriber(subscriber, trigger_event)
                
                logger.info(f"✅ Condition {condition_id} triggered for {len(subscribers.data)} subscribers")
        
        except Exception as e:
            logger.error(f"Error publishing condition trigger: {e}", exc_info=True)
    
    async def _notify_subscriber(self, subscriber: Dict, trigger_event: Dict):
        """
        Notify a single subscriber about condition trigger.
        
        Note: Actual bot execution is handled by BotNotifier service
        which subscribes to Redis event bus. This method is kept for
        backward compatibility and direct notifications if needed.
        """
        logger.info(f"Notifying user {subscriber['user_id']} bot {subscriber['bot_id']} about condition trigger")
        
        # Bot execution is handled by BotNotifier service via Redis event bus
        # This method logs the notification for tracking purposes
    
    async def _update_condition_stats(self, condition_id: str):
        """Update condition statistics."""
        if not self.supabase:
            return
        
        try:
            # Get current trigger count
            current = self.supabase.table("condition_registry").select("trigger_count").eq("condition_id", condition_id).execute()
            current_count = current.data[0]["trigger_count"] if current.data else 0
            
            # Update with incremented count
            self.supabase.table("condition_registry").update({
                "last_triggered_at": datetime.now().isoformat(),
                "trigger_count": current_count + 1,
                "last_evaluated_at": datetime.now().isoformat()
            }).eq("condition_id", condition_id).execute()
        except Exception as e:
            logger.error(f"Error updating condition stats: {e}")
    
    async def _update_evaluation_cache(
        self,
        symbol: str,
        timeframe: str,
        candle_time: datetime,
        indicator_cache: Dict
    ):
        """Update evaluation cache for reuse."""
        # Store in cache table for future use
        if self.supabase:
            try:
                cache_entry = {
                    "symbol": symbol,
                    "timeframe": timeframe,
                    "candle_time": candle_time.isoformat(),
                    "indicator_values": indicator_cache,
                    "evaluated_at": datetime.now().isoformat()
                }
                # Note: This would need condition_id, but we're caching per symbol/timeframe
                # For now, skip detailed caching
            except Exception as e:
                logger.error(f"Error updating cache: {e}")
    
    # Indicator calculation methods
    def _calculate_rsi(self, df: pd.DataFrame, period: int = 14) -> pd.Series:
        """Calculate RSI."""
        delta = df['close'].diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
        rs = gain / loss
        rsi = 100 - (100 / (1 + rs))
        return rsi
    
    def _calculate_macd(self, df: pd.DataFrame) -> Dict[str, pd.Series]:
        """Calculate MACD."""
        ema_12 = df['close'].ewm(span=12).mean()
        ema_26 = df['close'].ewm(span=26).mean()
        macd = ema_12 - ema_26
        signal = macd.ewm(span=9).mean()
        histogram = macd - signal
        return {
            "macd": macd,
            "signal": signal,
            "histogram": histogram
        }
    
    def _calculate_ma(self, df: pd.DataFrame, ma_type: str, period: int) -> pd.Series:
        """Calculate moving average."""
        if ma_type == "EMA":
            return df['close'].ewm(span=period).mean()
        elif ma_type == "SMA":
            return df['close'].rolling(window=period).mean()
        else:
            return df['close'].ewm(span=period).mean()  # Default to EMA
    
    async def start_evaluation_loop(self, symbols: Optional[List[str]] = None, timeframes: List[str] = ["1m"], interval_seconds: int = 60):
        """
        Start continuous evaluation loop.
        
        If symbols not provided, dynamically discovers symbols from active conditions.
        This ensures we only evaluate symbols that have active conditions.
        """
        logger.info(f"Starting evaluation loop for timeframes: {timeframes}")
        
        while self.running:
            try:
                # Get active symbols from conditions (if not provided)
                if symbols is None:
                    symbols = await self._get_active_symbols()
                    logger.debug(f"Discovered {len(symbols)} active symbols from conditions")
                
                # Evaluate all symbol/timeframe combinations in parallel
                tasks = []
                for symbol in symbols:
                    for timeframe in timeframes:
                        tasks.append(self.evaluate_symbol_timeframe(symbol, timeframe))
                
                # Run evaluations in parallel (different symbols evaluated simultaneously)
                results = await asyncio.gather(*tasks, return_exceptions=True)
                
                # Log any errors
                for i, result in enumerate(results):
                    if isinstance(result, Exception):
                        symbol_idx = i // len(timeframes)
                        timeframe_idx = i % len(timeframes)
                        logger.error(f"Error evaluating {symbols[symbol_idx]} {timeframes[timeframe_idx]}: {result}")
                
                # Wait before next cycle
                await asyncio.sleep(interval_seconds)
            
            except Exception as e:
                logger.error(f"Error in evaluation loop: {e}", exc_info=True)
                await asyncio.sleep(interval_seconds)
    
    async def _get_active_symbols(self) -> List[str]:
        """Get list of symbols that have active conditions."""
        if not self.supabase:
            return []
        
        try:
            # Get unique symbols from condition registry
            result = self.supabase.table("condition_registry").select("symbol").execute()
            if not result.data:
                return []
            
            # Extract unique symbols
            symbols = list(set([row["symbol"] for row in result.data]))
            return symbols
        except Exception as e:
            logger.error(f"Error getting active symbols: {e}")
            return []
    
    async def stop(self):
        """Stop the evaluator."""
        self.running = False
        # Cleanup market data service
        if hasattr(self, 'market_data') and self.market_data:
            await self.market_data.cleanup()
        logger.info("Centralized Condition Evaluator stopped")

