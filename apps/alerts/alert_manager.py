from typing import List, Dict, Any
import pandas as pd
import numpy as np
import datetime as dt
from apps.alerts.datasource import CandleSource
from apps.alerts import state
from apps.api.clients.supabase_client import supabase
from backend.evaluator import evaluate_condition, evaluate_playbook

TABLE = "alerts"
LOG_TABLE = "alerts_log"

class AlertManager:
    def __init__(self, candle_source: CandleSource):
        self.src = candle_source

    def fetch_active_alerts(self) -> List[Dict[str,Any]]:
        if supabase is None:
            return []  # Return empty list if Supabase not configured
        res = supabase.table(TABLE).select("*").eq("status","active").execute()
        return res.data or []

    def _get_base_df(self, symbol: str, tf: str) -> pd.DataFrame:
        return self.src.get_recent(symbol, tf, limit=1000)

    def _resolve_tf_df(self, base_df: pd.DataFrame, cond_tf: str, base_tf: str, symbol: str) -> pd.DataFrame:
        if cond_tf in ("same", base_tf):
            return base_df
        return self.src.upsample_or_downsample(base_df, cond_tf)

    def _apply_needed_indicators(self, df: pd.DataFrame, conditions: List[Dict[str,Any]]) -> pd.DataFrame:
        """
        Apply only indicators referenced by LHS/RHS across conditions for this DF.
        Extracts parameters from conditions and applies appropriate indicators.
        """
        if df.empty:
            return df
        out = df.copy()
        
        # Track needed indicators with their parameters
        indicator_configs = {}  # {indicator_name: {params}}
        
        for cond in conditions:
            cond_type = cond.get("type", "indicator")
            
            if cond_type == "indicator":
                indicator = cond.get("indicator")
                if indicator:
                    if indicator not in indicator_configs:
                        indicator_configs[indicator] = {}
                    
                    # Extract parameters from condition
                    if indicator == "RSI":
                        period = cond.get("period") or cond.get("compareValue") or 14
                        indicator_configs[indicator]["period"] = period
                    elif indicator == "MFI":
                        period = cond.get("mfiPeriod") or cond.get("period") or cond.get("compareValue") or 14
                        indicator_configs[indicator]["period"] = period
                    elif indicator == "CCI":
                        period = cond.get("cciPeriod") or cond.get("period") or cond.get("compareValue") or 14
                        indicator_configs[indicator]["period"] = period
                    elif indicator == "MACD":
                        fast = cond.get("fastPeriod") or cond.get("fast") or 12
                        slow = cond.get("slowPeriod") or cond.get("slow") or 26
                        signal = cond.get("signalPeriod") or cond.get("signal") or 9
                        indicator_configs[indicator]["fast"] = fast
                        indicator_configs[indicator]["slow"] = slow
                        indicator_configs[indicator]["signal"] = signal
                    elif indicator in ["EMA", "SMA", "WMA", "TEMA", "KAMA", "MAMA", "VWMA", "Hull"]:
                        # For MA indicators, extract period/length
                        period = cond.get("period") or cond.get("maLength") or cond.get("fastMA") or cond.get("slowMA") or 20
                        indicator_configs[indicator]["period"] = period
                        # For Moving Average condition, we need fast and slow
                        if cond.get("fastMA") and cond.get("slowMA"):
                            fast_period = cond.get("fastMA")
                            slow_period = cond.get("slowMA")
                            ma_type = cond.get("maType", "EMA")
                            # Create separate entries for fast and slow MA
                            fast_key = f"{ma_type}_Fast"
                            slow_key = f"{ma_type}_Slow"
                            indicator_configs[fast_key] = {"period": fast_period, "maType": ma_type}
                            indicator_configs[slow_key] = {"period": slow_period, "maType": ma_type}
                            indicator_configs[indicator]["fast"] = fast_period
                            indicator_configs[indicator]["slow"] = slow_period
                            indicator_configs[indicator]["maType"] = ma_type
                    
                    # Check RHS for Price Action conditions
                    if cond.get("compareWith") == "indicator_component" and cond.get("rhs"):
                        rhs = cond["rhs"]
                        rhs_indicator = rhs.get("indicator")
                        if rhs_indicator:
                            if rhs_indicator not in indicator_configs:
                                indicator_configs[rhs_indicator] = {}
                            # Extract MA parameters for Price Action
                            if rhs_indicator in ["EMA", "SMA", "WMA", "TEMA", "KAMA", "MAMA", "VWMA", "Hull"]:
                                ma_length = cond.get("maLength") or 20
                                indicator_configs[rhs_indicator]["period"] = ma_length
                                indicator_configs[rhs_indicator]["maType"] = cond.get("priceMaType", "EMA")
            
            elif cond_type == "price":
                # Price Action conditions use MA in RHS
                if cond.get("compareWith") == "indicator_component" and cond.get("rhs"):
                    rhs = cond["rhs"]
                    rhs_indicator = rhs.get("indicator") or cond.get("priceMaType", "EMA")
                    if rhs_indicator not in indicator_configs:
                        indicator_configs[rhs_indicator] = {}
                    ma_length = cond.get("maLength") or 20
                    indicator_configs[rhs_indicator]["period"] = ma_length
                    indicator_configs[rhs_indicator]["maType"] = cond.get("priceMaType", "EMA")

        # Apply indicators with their parameters
        for indicator, config in indicator_configs.items():
            if indicator == "RSI":
                period = config.get("period", 14)
                out = self._add_rsi(out, period)
            elif indicator == "MFI":
                period = config.get("period", 14)
                out = self._add_mfi(out, period)
            elif indicator == "CCI":
                period = config.get("period", 14)
                out = self._add_cci(out, period)
            elif indicator == "EMA":
                period = config.get("period") or config.get("fast") or config.get("slow") or 20
                out = self._add_ema(out, period)
            elif indicator == "SMA":
                period = config.get("period") or config.get("fast") or config.get("slow") or 20
                out = self._add_sma(out, period)
            elif indicator == "MACD":
                fast = config.get("fast", 12)
                slow = config.get("slow", 26)
                signal = config.get("signal", 9)
                out = self._add_macd(out, fast, slow, signal)
            elif indicator.endswith("_Fast"):
                # Handle Fast MA (e.g., EMA_Fast)
                ma_type = config.get("maType", "EMA")
                period = config.get("period", 20)
                if ma_type == "EMA":
                    fast_ema = out['close'].ewm(span=period).mean()
                    out[f"{ma_type}_Fast"] = fast_ema
                    out[f"{ma_type}_Fast_{ma_type}"] = fast_ema
                elif ma_type == "SMA":
                    fast_sma = out['close'].rolling(window=period).mean()
                    out[f"{ma_type}_Fast"] = fast_sma
                    out[f"{ma_type}_Fast_{ma_type}"] = fast_sma
                else:
                    # Fallback to EMA
                    fast_ema = out['close'].ewm(span=period).mean()
                    out[f"{ma_type}_Fast"] = fast_ema
            elif indicator.endswith("_Slow"):
                # Handle Slow MA (e.g., EMA_Slow)
                ma_type = config.get("maType", "EMA")
                period = config.get("period", 20)
                if ma_type == "EMA":
                    slow_ema = out['close'].ewm(span=period).mean()
                    out[f"{ma_type}_Slow"] = slow_ema
                    out[f"{ma_type}_Slow_{ma_type}"] = slow_ema
                elif ma_type == "SMA":
                    slow_sma = out['close'].rolling(window=period).mean()
                    out[f"{ma_type}_Slow"] = slow_sma
                    out[f"{ma_type}_Slow_{ma_type}"] = slow_sma
                else:
                    # Fallback to EMA
                    slow_ema = out['close'].ewm(span=period).mean()
                    out[f"{ma_type}_Slow"] = slow_ema
            elif indicator in ["WMA", "TEMA", "KAMA", "MAMA", "VWMA", "Hull"]:
                # For now, use EMA calculation as fallback
                # In production, these should use proper implementations
                period = config.get("period") or config.get("fast") or config.get("slow") or 20
                out = self._add_ema(out, period)  # Fallback to EMA
                # Map to the correct column name
                out[f"{indicator}"] = out["EMA"]
                out[f"{indicator}_{indicator}"] = out["EMA"]

        return out

    def _add_rsi(self, df: pd.DataFrame, period: int = 14) -> pd.DataFrame:
        """Add RSI indicator (simplified implementation)"""
        if len(df) < period + 1:
            df['RSI'] = np.nan
            return df
        
        delta = df['close'].diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
        rs = gain / loss
        rsi = 100 - (100 / (1 + rs))
        
        df['RSI'] = rsi
        df['RSI_RSI'] = rsi  # Alias for component matching
        return df

    def _add_mfi(self, df: pd.DataFrame, period: int = 14) -> pd.DataFrame:
        """Add Money Flow Index (MFI) indicator"""
        if len(df) < period + 1:
            df['MFI'] = np.nan
            return df
        
        # Typical Price
        typical_price = (df['high'] + df['low'] + df['close']) / 3
        
        # Money Flow
        money_flow = typical_price * df['volume']
        
        # Positive and Negative Money Flow
        positive_money_flow = money_flow.where(typical_price > typical_price.shift(1), 0).rolling(window=period).sum()
        negative_money_flow = money_flow.where(typical_price < typical_price.shift(1), 0).rolling(window=period).sum()
        
        # Money Flow Index
        mfi = 100 - (100 / (1 + positive_money_flow / negative_money_flow.replace(0, np.nan)))
        
        df['MFI'] = mfi
        df['MFI_MFI'] = mfi  # Alias for component matching
        return df

    def _add_cci(self, df: pd.DataFrame, period: int = 14) -> pd.DataFrame:
        """Add Commodity Channel Index (CCI) indicator"""
        if len(df) < period:
            df['CCI'] = np.nan
            return df
        
        # Typical Price
        typical_price = (df['high'] + df['low'] + df['close']) / 3
        
        # Simple Moving Average of Typical Price
        sma_tp = typical_price.rolling(window=period).mean()
        
        # Mean Deviation
        mean_deviation = typical_price.rolling(window=period).apply(
            lambda x: np.mean(np.abs(x - x.mean())), raw=False
        )
        
        # CCI = (Typical Price - SMA) / (0.015 * Mean Deviation)
        cci = (typical_price - sma_tp) / (0.015 * mean_deviation.replace(0, np.nan))
        
        df['CCI'] = cci
        df['CCI_CCI'] = cci  # Alias for component matching
        return df

    def _add_ema(self, df: pd.DataFrame, period: int = 20) -> pd.DataFrame:
        """Add EMA indicator (simplified implementation)"""
        if len(df) < period:
            df['EMA'] = np.nan
            return df
        
        ema = df['close'].ewm(span=period).mean()
        df['EMA'] = ema
        df['EMA_EMA'] = ema  # Alias for component matching
        return df

    def _add_sma(self, df: pd.DataFrame, period: int = 20) -> pd.DataFrame:
        """Add SMA indicator (simplified implementation)"""
        if len(df) < period:
            df['SMA'] = np.nan
            return df
        
        sma = df['close'].rolling(window=period).mean()
        df['SMA'] = sma
        df['SMA_SMA'] = sma  # Alias for component matching
        return df

    def _add_macd(self, df: pd.DataFrame, fast: int = 12, slow: int = 26, signal: int = 9) -> pd.DataFrame:
        """Add MACD indicator with all components"""
        if len(df) < slow:
            df['MACD'] = np.nan
            df['MACD_macd_line'] = np.nan
            df['MACD_signal_line'] = np.nan
            df['MACD_histogram'] = np.nan
            df['MACD_zero_line'] = 0.0
            return df
        
        ema_fast = df['close'].ewm(span=fast).mean()
        ema_slow = df['close'].ewm(span=slow).mean()
        macd_line = ema_fast - ema_slow
        signal_line = macd_line.ewm(span=signal).mean()
        histogram = macd_line - signal_line
        
        # Set all column naming variations for component matching
        df['MACD'] = macd_line
        df['MACD_MACD'] = macd_line
        df['MACD_macd_line'] = macd_line
        df['MACD_MACD Line'] = macd_line
        df['MACD_signal_line'] = signal_line
        df['MACD_Signal Line'] = signal_line
        df['MACD_Signal'] = signal_line
        df['MACD_histogram'] = histogram
        df['MACD_Histogram'] = histogram
        df['MACD_zero_line'] = 0.0
        df['MACD_Zero Line'] = 0.0
        
        return df

    def evaluate_alert(self, alert: Dict[str,Any]) -> Dict[str,Any] | None:
        """
        Returns payload if triggered else None.
        Supports both simple conditions and playbook mode.
        """
        symbol = alert["symbol"]
        base_tf = alert["base_timeframe"]
        
        # Check if this is a playbook configuration
        condition_config = alert.get("conditionConfig") or alert.get("condition_config")
        if condition_config and condition_config.get("mode") == "playbook":
            # Use playbook evaluation
            return self._evaluate_playbook_alert(alert, condition_config)
        
        # Fall back to simple condition evaluation
        conditions = alert.get("conditions", [])
        logic = alert.get("logic","AND")

        base_df = self._get_base_df(symbol, base_tf)
        if base_df is None or base_df.empty:
            return None

        # Evaluate on the latest bar of each condition's timeframe
        snapshots = {}
        latest_bar_time = None

        per_tf_frames = {}  # cache per condition timeframe

        # Build per-timeframe frames with indicators applied only as needed
        # Group conditions by timeframe
        tf_groups: Dict[str, List[Dict[str,Any]]] = {}
        for c in conditions:
            tf = c.get("timeframe","same")
            tf_groups.setdefault(tf, []).append(c)

        for tf, conds in tf_groups.items():
            df_tf = self._resolve_tf_df(base_df, tf, base_tf, symbol)
            if df_tf is None or df_tf.empty:
                return None
            df_tf = self._apply_needed_indicators(df_tf, conds)
            per_tf_frames[tf] = df_tf

        # Build a unified evaluation row dictionary the evaluator understands
        # evaluator.evaluate_condition() should accept (df, row_index, condition)
        results = []
        ctx_snapshot = {"indicators": {}, "price": {}, "timeframe": base_tf}

        for tf, df_tf in per_tf_frames.items():
            last_idx = len(df_tf) - 1
            if last_idx < 1:
                return None
            last_row = df_tf.iloc[last_idx]
            last_time = pd.to_datetime(last_row["time"])
            if latest_bar_time is None or last_time > latest_bar_time:
                latest_bar_time = last_time

        # Fire mode debouncing
        alert_id = alert["alert_id"]
        fire_mode = alert.get("fireMode", "per_bar")
        last_fired = state.get_last_fired(alert_id)
        
        if fire_mode == "per_bar":
            # Only fire once per candle timestamp
            if last_fired is not None and pd.to_datetime(last_fired) == pd.to_datetime(latest_bar_time):
                return None
        elif fire_mode == "per_close":
            # Only fire after candle is closed (next tick or finalized flag)
            # For now, we'll use the same logic as per_bar
            if last_fired is not None and pd.to_datetime(last_fired) == pd.to_datetime(latest_bar_time):
                return None
        elif fire_mode == "per_tick":
            # Allow multiple triggers within same bar (keyed by milliseconds)
            # This would require tick-level data, for now we'll use per_bar logic
            if last_fired is not None and pd.to_datetime(last_fired) == pd.to_datetime(latest_bar_time):
                return None

        # Now actually evaluate each condition on its TF frame, using last bar
        for c in conditions:
            tf = c.get("timeframe","same")
            df_tf = per_tf_frames[tf]
            idx = len(df_tf) - 1
            ok = evaluate_condition(df_tf, idx, c)  # your function signature may differ
            results.append(ok)

        group_ok = all(results) if logic == "AND" else any(results)
        if not group_ok:
            return None

        # Build snapshot for logging / webhook
        # Collect the base last row details
        base_last = per_tf_frames.get("same", per_tf_frames.get(base_tf))
        if base_last is None or base_last.empty:
            base_last = base_df
        base_last_row = base_last.iloc[-1]
        ctx_snapshot["price"] = {
            "open": float(base_last_row["open"]),
            "high": float(base_last_row["high"]),
            "low": float(base_last_row["low"]),
            "close": float(base_last_row["close"]),
            "volume": float(base_last_row["volume"]),
        }
        ctx_snapshot["time"] = str(latest_bar_time)

        # Optionally include some indicator values used (lightweight)
        # You can extend your evaluator to return component names it used and fetch from df
        # For now, skip or include minimal
        return {
            "latest_bar_time": str(latest_bar_time),
            "snapshot": ctx_snapshot
        }

    def _evaluate_playbook_alert(self, alert: Dict[str,Any], condition_config: Dict[str,Any]) -> Dict[str,Any] | None:
        """
        Evaluate alert using playbook mode with priority, validity duration, and AND/OR logic.
        """
        symbol = alert["symbol"]
        base_tf = alert["base_timeframe"]
        playbook = condition_config.get("playbook") or condition_config
        
        base_df = self._get_base_df(symbol, base_tf)
        if base_df is None or base_df.empty:
            return None
        
        conditions = playbook.get("conditions", [])
        if not conditions:
            return None
        
        # Get or initialize condition states for validity duration tracking
        alert_id = alert.get("alert_id")
        condition_states = state.get_condition_states(alert_id) if alert_id else {}
        
        # Group conditions by timeframe and prepare dataframes
        tf_groups: Dict[str, List[Dict[str,Any]]] = {}
        for c_item in conditions:
            c = c_item.get("condition", {})
            tf = c.get("timeframe", "same")
            tf_groups.setdefault(tf, []).append(c)
        
        per_tf_frames = {}
        for tf, conds in tf_groups.items():
            df_tf = self._resolve_tf_df(base_df, tf, base_tf, symbol)
            if df_tf is None or df_tf.empty:
                return None
            df_tf = self._apply_needed_indicators(df_tf, conds)
            per_tf_frames[tf] = df_tf
        
        # Get the base timeframe dataframe for playbook evaluation
        base_df_tf = per_tf_frames.get("same") or per_tf_frames.get(base_tf) or base_df
        
        # Prepare playbook structure with conditions mapped to their dataframes
        # For simplicity, evaluate on base timeframe - in production you'd evaluate each on its own TF
        evaluation_df = base_df_tf
        
        # Evaluate playbook
        result = evaluate_playbook(evaluation_df, playbook, condition_states)
        
        # Save condition states for next evaluation
        if alert_id and result.get("condition_states"):
            state.set_condition_states(alert_id, result["condition_states"])
        
        if not result.get("triggered", False):
            return None
        
        # Fire mode debouncing
        fire_mode = alert.get("fireMode", "per_bar")
        last_fired = state.get_last_fired(alert_id) if alert_id else None
        latest_bar_time = pd.to_datetime(evaluation_df.iloc[-1]["time"]) if len(evaluation_df) > 0 else None
        
        if fire_mode == "per_bar" and last_fired:
            if pd.to_datetime(last_fired) == latest_bar_time:
                return None
        
        # Build snapshot
        base_last_row = evaluation_df.iloc[-1]
        ctx_snapshot = {
            "indicators": {},
            "price": {
                "open": float(base_last_row["open"]),
                "high": float(base_last_row["high"]),
                "low": float(base_last_row["low"]),
                "close": float(base_last_row["close"]),
                "volume": float(base_last_row["volume"]),
            },
            "timeframe": base_tf,
            "time": str(latest_bar_time),
            "playbook_result": {
                "satisfied_conditions": result.get("satisfied_conditions", []),
                "failed_conditions": result.get("failed_conditions", []),
                "condition_results": result.get("condition_results", {})
            }
        }
        
        return {
            "latest_bar_time": str(latest_bar_time),
            "snapshot": ctx_snapshot
        }

    def log_and_dispatch(self, alert: Dict[str,Any], payload: Dict[str,Any]):
        if supabase is None:
            return  # Skip if Supabase not configured
            
        supabase.table(LOG_TABLE).insert({
            "alert_id": alert["alert_id"],
            "payload": payload["snapshot"]
        }).execute()
        supabase.table(TABLE).update({
            "last_triggered_at": payload["latest_bar_time"]
        }).eq("alert_id", alert["alert_id"]).execute()
        state.set_last_fired(alert["alert_id"], payload["latest_bar_time"])

    def simulate(self, alert: Dict[str, Any]) -> Dict[str, Any]:
        """Simulate alert evaluation without side effects."""
        symbol = alert["symbol"]
        base_tf = alert["base_timeframe"]
        conditions = alert["conditions"]
        logic = alert.get("logic", "AND")

        base_df = self._get_base_df(symbol, base_tf)
        if base_df is None or base_df.empty:
            return {"would_fire": False, "reasons": [], "snapshot": {"error": "no data"}}

        # Group conditions by timeframe
        tf_groups: Dict[str, List[Dict[str, Any]]] = {}
        for c in conditions:
            tf = c.get("timeframe", "same")
            tf_groups.setdefault(tf, []).append(c)

        per_tf_frames = {}
        for tf, conds in tf_groups.items():
            df_tf = self._resolve_tf_df(base_df, tf, base_tf, symbol)
            if df_tf is None or df_tf.empty:
                return {"would_fire": False, "reasons": [], "snapshot": {"error": f"no data for {tf}"}}
            df_tf = self._apply_needed_indicators(df_tf, conds)
            per_tf_frames[tf] = df_tf

        reasons = []
        for c in conditions:
            tf = c.get("timeframe", "same")
            df_tf = per_tf_frames[tf]
            idx = len(df_tf) - 1
            ok = evaluate_condition(df_tf, idx, c)
            reasons.append({"condition_id": c["id"], "ok": bool(ok)})

        group_ok = all(r["ok"] for r in reasons) if logic == "AND" else any(r["ok"] for r in reasons)

        base_last = per_tf_frames.get("same", per_tf_frames.get(base_tf, base_df))
        row = base_last.iloc[-1]
        snapshot = {
            "price": {
                "open": float(row["open"]),
                "high": float(row["high"]),
                "low": float(row["low"]),
                "close": float(row["close"]),
                "volume": float(row["volume"])
            }
        }

        return {"would_fire": group_ok, "reasons": reasons, "snapshot": snapshot}
