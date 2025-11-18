"""Bot management API routes."""

from fastapi import APIRouter, HTTPException, Query, Path, Body
from typing import List, Optional, Dict, Any
import logging

from apps.api.utils.errors import TradeeonError, NotFoundError, DatabaseError
from apps.api.deps.auth import get_current_user, AuthedUser

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..', '..'))

from shared.contracts.bots import BotConfig, BotRun, BotStatus, BotType

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/bots", tags=["bots"])


def extract_conditions_from_dca_config(bot_config: Dict[str, Any], symbol: str) -> List[Dict[str, Any]]:
    """
    Extract conditions from DCA bot configuration.
    
    Returns a list of normalized conditions ready for registration.
    """
    conditions = []
    condition_config = bot_config.get("conditionConfig")
    
    if not condition_config:
        return conditions
    
    # Handle playbook mode (multiple conditions)
    if condition_config.get("mode") == "playbook":
        playbook_conditions = condition_config.get("conditions", [])
        for playbook_condition in playbook_conditions:
            if not playbook_condition.get("enabled", True):
                continue
            
            condition_data = playbook_condition.get("condition", {})
            condition_type = playbook_condition.get("conditionType", "indicator")
            
            # Build normalized condition
            condition = {
                "type": "price" if condition_type == "Price Action" else "indicator",
                "symbol": symbol.upper().replace("/", ""),
                "timeframe": condition_data.get("timeframe", "1h"),
                "indicator": condition_data.get("indicator"),
                "component": condition_data.get("component"),
                "operator": condition_data.get("operator", "crosses_below"),
                "compareWith": condition_data.get("compareWith", "value"),
                "compareValue": condition_data.get("compareValue") or condition_data.get("value"),
                "period": condition_data.get("period"),
                "lowerBound": condition_data.get("lowerBound"),
                "upperBound": condition_data.get("upperBound"),
            }
            
            # Remove None values
            condition = {k: v for k, v in condition.items() if v is not None}
            conditions.append(condition)
    
    # Handle simple mode (single condition)
    elif condition_config.get("mode") == "simple":
        condition_data = condition_config.get("condition", {})
        condition_type = condition_config.get("conditionType", "indicator")
        
        condition = {
            "type": "price" if condition_type == "Price Action" else "indicator",
            "symbol": symbol.upper().replace("/", ""),
            "timeframe": condition_data.get("timeframe", "1h"),
            "indicator": condition_data.get("indicator"),
            "component": condition_data.get("component"),
            "operator": condition_data.get("operator", "crosses_below"),
            "compareWith": condition_data.get("compareWith", "value"),
            "compareValue": condition_data.get("compareValue") or condition_data.get("value"),
            "period": condition_data.get("period"),
            "lowerBound": condition_data.get("lowerBound"),
            "upperBound": condition_data.get("upperBound"),
        }
        
        # Remove None values
        condition = {k: v for k, v in condition.items() if v is not None}
        conditions.append(condition)
    
    # Handle DCA rules custom conditions
    dca_rules = bot_config.get("dcaRules", {})
    if dca_rules.get("customCondition"):
        custom_condition = dca_rules.get("customCondition", {}).get("condition", {})
        condition_type = dca_rules.get("customCondition", {}).get("conditionType", "indicator")
        
        condition = {
            "type": "price" if condition_type == "Price Action" else "indicator",
            "symbol": symbol.upper().replace("/", ""),
            "timeframe": custom_condition.get("timeframe", "1h"),
            "indicator": custom_condition.get("indicator"),
            "component": custom_condition.get("component"),
            "operator": custom_condition.get("operator", "crosses_below"),
            "compareWith": custom_condition.get("compareWith", "value"),
            "compareValue": custom_condition.get("compareValue") or custom_condition.get("value"),
            "period": custom_condition.get("period"),
        }
        
        # Remove None values
        condition = {k: v for k, v in condition.items() if v is not None}
        conditions.append(condition)
    
    return conditions


async def register_condition_via_api(condition: Dict[str, Any], api_base_url: str = None) -> Optional[str]:
    """
    Register a condition via the condition registry API.
    
    Returns condition_id if successful, None otherwise.
    """
    try:
        if api_base_url is None:
            # Use internal import to call directly
            from apps.api.routers.condition_registry import normalize_condition, hash_condition
            from apps.api.clients.supabase_client import supabase
            from datetime import datetime
            
            # Normalize and hash condition
            normalized = normalize_condition(condition)
            condition_id = hash_condition(normalized)
            
            # Check if condition already exists
            if supabase:
                existing = supabase.table("condition_registry").select("*").eq("condition_id", condition_id).execute()
                
                if existing.data:
                    logger.info(f"Condition {condition_id} already exists in registry")
                    return condition_id
            
            # Create new condition entry
            condition_entry = {
                "condition_id": condition_id,
                "condition_type": normalized.get("condition_type", "indicator"),
                "symbol": normalized.get("symbol"),
                "timeframe": normalized.get("timeframe"),
                "indicator_config": normalized,
                "created_at": datetime.now().isoformat(),
                "last_evaluated_at": None,
                "evaluation_count": 0,
                "last_triggered_at": None,
                "trigger_count": 0
            }
            
            if supabase:
                result = supabase.table("condition_registry").insert(condition_entry).execute()
                logger.info(f"Registered new condition {condition_id}")
                return condition_id
            else:
                logger.warning("Supabase not available - condition not persisted")
                return None
        else:
            # Use HTTP API call (fallback - not recommended)
            logger.warning("HTTP API calls not implemented - using internal calls only")
            return None
    except Exception as e:
        logger.error(f"Error registering condition: {e}", exc_info=True)
        return None


async def subscribe_bot_to_condition_via_api(
    bot_id: str,
    condition_id: str,
    bot_type: str,
    bot_config: Dict[str, Any],
    user_id: str,
    api_base_url: str = None
) -> Optional[str]:
    """
    Subscribe a bot to a condition via the condition registry API.
    
    Returns subscription_id if successful, None otherwise.
    """
    try:
        if api_base_url is None:
            # Use internal import to call directly
            from apps.api.clients.supabase_client import supabase
            from datetime import datetime
            
            # Verify condition exists
            if supabase:
                condition_check = supabase.table("condition_registry").select("*").eq("condition_id", condition_id).execute()
                if not condition_check.data:
                    logger.warning(f"Condition {condition_id} not found in registry")
                    return None
            
            # Check for existing subscription
            if supabase:
                existing = supabase.table("user_condition_subscriptions").select("*").eq(
                    "user_id", user_id
                ).eq("bot_id", bot_id).eq("condition_id", condition_id).eq("active", True).execute()
                
                if existing.data:
                    logger.info(f"Bot {bot_id} already subscribed to condition {condition_id}")
                    return existing.data[0]["id"]
            
            # Create subscription
            subscription = {
                "user_id": user_id,
                "bot_id": bot_id,
                "condition_id": condition_id,
                "bot_type": bot_type,
                "bot_config": bot_config,
                "created_at": datetime.now().isoformat(),
                "active": True,
                "last_triggered_at": None
            }
            
            if supabase:
                result = supabase.table("user_condition_subscriptions").insert(subscription).execute()
                subscription_id = result.data[0]["id"] if result.data else None
                logger.info(f"Bot {bot_id} subscribed to condition {condition_id}")
                return subscription_id
            else:
                logger.warning("Supabase not available - subscription not persisted")
                return None
        else:
            # Use HTTP API call (requires auth token)
            # For now, we'll use internal calls
            logger.warning("HTTP API subscription not implemented - using internal calls")
            return None
    except Exception as e:
        logger.error(f"Error subscribing bot to condition: {e}", exc_info=True)
        return None


@router.get("/")
async def list_bots(
    user_id: str = Query(..., description="User ID"),
    status: Optional[BotStatus] = Query(None, description="Filter by status")
):
    """List user's bots from database."""
    try:
        bots_path = os.path.join(os.path.dirname(__file__), '..', '..', 'bots')
        if bots_path not in sys.path:
            sys.path.insert(0, bots_path)
        
        bots = []
        try:
            from db_service import db_service
            bots = db_service.list_bots(user_id, status.value if status else None)
        except Exception as db_error:
            logger.warning(f"Failed to fetch bots from database: {db_error}. Returning empty list.")
        
        return {
            "success": True,
            "bots": bots,
            "count": len(bots)
        }
    
    except TradeeonError:
        raise
    except Exception as e:
        logger.error(f"Error listing bots: {e}")
        raise TradeeonError(
            f"Failed to list bots: {str(e)}",
            "INTERNAL_SERVER_ERROR",
            status_code=500
        )


@router.post("/")
async def create_bot(
    user_id: str = Body(..., description="User ID"),
    name: str = Body(..., description="Bot name"),
    bot_type: BotType = Body(..., description="Bot type"),
    symbol: str = Body(..., description="Trading symbol"),
    interval: str = Body(default="1m", description="Time interval"),
    config: Dict[str, Any] = Body(..., description="Bot configuration"),
    required_capital: Optional[float] = Body(None, description="Required capital")
):
    """Create a new bot."""
    try:
        import time
        import sys
        import os
        
        # Add bots directory to path
        bots_path = os.path.join(os.path.dirname(__file__), '..', '..', 'bots')
        if bots_path not in sys.path:
            sys.path.insert(0, bots_path)
        
        bot_id = f"bot_{int(time.time())}"
        
        # Validate Phase 1 features if present
        phase1_features = config.get("phase1Features", {})
        if phase1_features:
            # Validate market regime config
            if phase1_features.get("marketRegime"):
                regime = phase1_features["marketRegime"]
                if not regime.get("regimeTimeframe"):
                    regime["regimeTimeframe"] = "1d"  # Default
                    
            # Validate dynamic scaling config
            if phase1_features.get("dynamicScaling"):
                scaling = phase1_features["dynamicScaling"]
                if not scaling.get("volatilityMultiplier"):
                    scaling["volatilityMultiplier"] = {
                        "lowVolatility": 1.2,
                        "normalVolatility": 1.0,
                        "highVolatility": 0.7
                    }
                if not scaling.get("supportResistanceMultiplier"):
                    scaling["supportResistanceMultiplier"] = {
                        "nearStrongSupport": 1.5,
                        "neutralZone": 1.0,
                        "nearResistance": 0.5
                    }
                if not scaling.get("fearGreedIndex"):
                    scaling["fearGreedIndex"] = {
                        "extremeFear": 1.8,
                        "neutral": 1.0,
                        "extremeGreed": 0.5
                    }
        
        bot = {
            "bot_id": bot_id,
            "user_id": user_id,
            "name": name,
            "bot_type": bot_type.value,
            "status": "inactive",
            "symbol": symbol,
            "interval": interval,
            "config": config,
            "required_capital": required_capital,
            "created_at": int(time.time() * 1000),
            "updated_at": int(time.time() * 1000)
        }
        
        # TODO: Save to Supabase
        # For now, log the config structure
        logger.info(f"Created bot {bot_id} with config keys: {list(config.keys())}")
        if phase1_features:
            logger.info(f"Phase 1 features: {list(phase1_features.keys())}")
        
        return {
            "success": True,
            "bot": bot,
            "bot_id": bot_id
        }
    
    except TradeeonError:
        raise
    except Exception as e:
        logger.error(f"Error creating bot: {e}")
        raise TradeeonError(
            f"Failed to create bot: {str(e)}",
            "INTERNAL_SERVER_ERROR",
            status_code=500
        )


def _validate_phase1_features(phase1: Dict[str, Any]):
    """Validate Phase 1 features structure."""
    # Market Regime
    if phase1.get("marketRegime"):
        regime = phase1["marketRegime"]
        if not regime.get("regimeTimeframe"):
            regime["regimeTimeframe"] = "1d"
    
    # Dynamic Scaling
    if phase1.get("dynamicScaling"):
        scaling = phase1["dynamicScaling"]
        if not scaling.get("volatilityMultiplier"):
            scaling["volatilityMultiplier"] = {
                "lowVolatility": 1.2,
                "normalVolatility": 1.0,
                "highVolatility": 0.7
            }
        if not scaling.get("supportResistanceMultiplier"):
            scaling["supportResistanceMultiplier"] = {
                "nearStrongSupport": 1.5,
                "neutralZone": 1.0,
                "nearResistance": 0.5
            }
        if not scaling.get("fearGreedIndex"):
            scaling["fearGreedIndex"] = {
                "extremeFear": 1.8,
                "neutral": 1.0,
                "extremeGreed": 0.5
            }


@router.post("/dca-bots")
async def create_dca_bot(
    bot_config: Dict[str, Any] = Body(..., description="Full DCA bot configuration including Phase 1 features")
):
    """Create a DCA bot with advanced Phase 1 features and condition registry integration."""
    try:
        import time
        import sys
        import os
        
        # Add bots directory to path
        bots_path = os.path.join(os.path.dirname(__file__), '..', '..', 'bots')
        if bots_path not in sys.path:
            sys.path.insert(0, bots_path)
        
        # Import alert converter
        from apps.api.modules.bots.alert_converter import convert_bot_entry_to_alert_conditions, convert_playbook_conditions_to_alert
        from apps.api.clients.supabase_client import supabase
        
        bot_id = f"dca_bot_{int(time.time())}"
        
        # Get user_id from auth (TODO: integrate with actual auth)
        user_id = bot_config.get("user_id") or "current_user"  # TODO: Get from auth header
        
        # Extract key fields
        bot_name = bot_config.get("botName", "DCA Bot")
        selected_pairs = bot_config.get("selectedPairs", [bot_config.get("pair", "BTCUSDT")])
        primary_pair = selected_pairs[0] if selected_pairs else bot_config.get("pair", "BTCUSDT")
        
        # Validate and prepare config
        config_dict = {
            "botName": bot_name,
            "direction": bot_config.get("direction", "long"),
            "pairs": selected_pairs,
            "exchange": bot_config.get("exchange", "Binance"),
            "botType": bot_config.get("botType", "dca"),
            "baseOrderSize": bot_config.get("baseOrderSize", 100),
            "startOrderType": bot_config.get("startOrderType", "market"),
            "conditionConfig": bot_config.get("conditionConfig"),
            "dcaRules": bot_config.get("dcaRules", {}),
            "dcaAmount": bot_config.get("dcaAmount", {}),
            "phase1Features": bot_config.get("phase1Features", {})
        }
        
        # Validate Phase 1 features structure
        phase1 = config_dict.get("phase1Features", {})
        if phase1:
            # Ensure all Phase 1 features have proper structure
            _validate_phase1_features(phase1)
        
        # ===== PHASE 1.3: CONDITION REGISTRY INTEGRATION =====
        condition_ids = []
        subscription_ids = []
        
        # Extract conditions from bot config
        conditions = extract_conditions_from_dca_config(bot_config, primary_pair)
        
        if conditions:
            logger.info(f"Extracted {len(conditions)} conditions from bot config for bot {bot_id}")
            
            # Register each condition
            for condition in conditions:
                try:
                    condition_id = await register_condition_via_api(condition)
                    if condition_id:
                        condition_ids.append(condition_id)
                        logger.info(f"Registered condition {condition_id} for bot {bot_id}")
                        
                        # Subscribe bot to condition
                        subscription_id = await subscribe_bot_to_condition_via_api(
                            bot_id=bot_id,
                            condition_id=condition_id,
                            bot_type="dca",
                            bot_config=config_dict,
                            user_id=user_id
                        )
                        if subscription_id:
                            subscription_ids.append(subscription_id)
                            logger.info(f"Subscribed bot {bot_id} to condition {condition_id}")
                    else:
                        logger.warning(f"Failed to register condition for bot {bot_id}: {condition}")
                except Exception as cond_error:
                    logger.error(f"Error processing condition for bot {bot_id}: {cond_error}", exc_info=True)
                    # Continue with bot creation even if condition registration fails
        else:
            logger.info(f"No conditions found in bot config for bot {bot_id}")
        
        # Store condition IDs in bot config
        if condition_ids:
            config_dict["condition_ids"] = condition_ids
            config_dict["subscription_ids"] = subscription_ids
            logger.info(f"Stored {len(condition_ids)} condition IDs in bot config")
        # ===== END PHASE 1.3 INTEGRATION =====
        
        required_capital = bot_config.get("baseOrderSize", 100) * 10  # Estimate
        
        # Save bot to database
        try:
            sys.path.insert(0, bots_path)
            from db_service import db_service
            db_service.create_bot(
                bot_id=bot_id,
                user_id=user_id,
                name=bot_name,
                bot_type="dca",
                symbol=primary_pair,
                interval="1h",
                config=config_dict,
                required_capital=required_capital,
                max_position_size=None,
                risk_per_trade=None
            )
        except Exception as db_error:
            logger.warning(f"Failed to save bot to database: {db_error}. Continuing with in-memory storage.")
        
        bot = {
            "bot_id": bot_id,
            "user_id": user_id,
            "name": bot_name,
            "bot_type": "dca",
            "status": "inactive",
            "symbol": primary_pair,
            "interval": "1h",  # Default, can be configured
            "config": config_dict,
            "required_capital": required_capital,
            "created_at": int(time.time() * 1000),
            "updated_at": int(time.time() * 1000)
        }
        
        # Store bot config for later use (in-memory fallback)
        from bot_manager import bot_manager
        bot_manager.store_bot_config(bot_id, bot_config)
        
        # Create alert for entry condition if present
        condition_config = config_dict.get("conditionConfig")
        if condition_config:
            try:
                # Check if using playbook mode
                if condition_config.get("mode") == "playbook":
                    playbook_conditions = condition_config.get("conditions", [])
                    if playbook_conditions:
                        # Convert playbook to alert format
                        alert_condition_config = convert_playbook_conditions_to_alert(
                            playbook_conditions,
                            condition_config.get("baseTimeframe", "15m")
                        )
                        
                        # Create alert
                        alert = {
                            "user_id": user_id,
                            "symbol": primary_pair,
                            "base_timeframe": condition_config.get("baseTimeframe", "15m"),
                            "conditionConfig": alert_condition_config,
                            "conditions": alert_condition_config.get("conditions", []),
                            "logic": alert_condition_config.get("gateLogic", "ALL"),
                            "action": {
                                "type": "bot_trigger",
                                "bot_id": bot_id,
                                "action_type": "execute_entry"
                            },
                            "status": "active" if bot_config.get("status") == "active" else "paused"
                        }
                        
                        # Save to alerts table
                        supabase.table("alerts").insert(alert).execute()
                        logger.info(f"Created alert for bot {bot_id} entry condition (playbook mode)")
                
                # Check if single entry condition
                elif condition_config.get("entryCondition"):
                    entry_condition = condition_config.get("entryCondition")
                    condition_type = condition_config.get("entryConditionType")
                    
                    if entry_condition and condition_type:
                        # Convert to alert format
                        alert_conditions = convert_bot_entry_to_alert_conditions(
                            entry_condition,
                            condition_type
                        )
                        
                        # Create alert
                        alert = {
                            "user_id": user_id,
                            "symbol": primary_pair,
                            "base_timeframe": entry_condition.get("timeframe", "15m"),
                            "conditions": alert_conditions,
                            "logic": "AND",
                            "action": {
                                "type": "bot_trigger",
                                "bot_id": bot_id,
                                "action_type": "execute_entry"
                            },
                            "status": "active" if bot_config.get("status") == "active" else "paused"
                        }
                        
                        # Save to alerts table
                        if supabase:
                            supabase.table("alerts").insert(alert).execute()
                            logger.info(f"Created alert for bot {bot_id} entry condition")
            except Exception as alert_error:
                logger.warning(f"Failed to create alert for bot {bot_id}: {alert_error}")
        
        return {
            "success": True,
            "bot": bot,
            "bot_id": bot_id,
            "condition_ids": condition_ids,  # Return condition IDs for frontend
            "subscription_ids": subscription_ids  # Return subscription IDs for frontend
        }
    
    except TradeeonError:
        raise
    except Exception as e:
        logger.error(f"Error creating DCA bot: {e}", exc_info=True)
        raise TradeeonError(
            f"Failed to create DCA bot: {str(e)}",
            "INTERNAL_SERVER_ERROR",
            status_code=500
        )


@router.post("/dca-bots/{bot_id}/start-paper")
async def start_dca_bot_paper(
    bot_id: str = Path(..., description="Bot ID"),
    start_config: Dict[str, Any] = Body(default={}, description="Start configuration"),
    user: AuthedUser = Depends(get_current_user)
):
    """Start a DCA bot in paper trading mode."""
    try:
        import sys
        import os
        
        # Add bots directory to path
        bots_path = os.path.join(os.path.dirname(__file__), '..', '..', 'bots')
        if bots_path not in sys.path:
            sys.path.insert(0, bots_path)
        
        from db_service import db_service
        from bot_execution_service import bot_execution_service
        
        # Get bot from database
        if not db_service or not db_service.enabled:
            raise TradeeonError(
                "Database service not available",
                "SERVICE_UNAVAILABLE",
                status_code=503
            )
        
        # Get bot from database (already filtered by user_id)
        bot_data = db_service.get_bot(bot_id, user_id=user.user_id)
        
        if not bot_data:
            raise NotFoundError("Bot", f"Bot {bot_id} not found or access denied")
        
        # Check if bot is already running
        if bot_execution_service.is_running(bot_id):
            return {
                "success": True,
                "message": "Bot is already running",
                "bot_id": bot_id,
                "status": "running"
            }
        
        # Get bot config
        bot_config = bot_data.get("config", {})
        bot_config["user_id"] = user.user_id  # Ensure user_id is in config
        bot_config["botName"] = bot_data.get("name", "DCA Bot")
        
        # Get start configuration
        initial_balance = start_config.get("initial_balance", 10000.0)
        interval_seconds = start_config.get("interval_seconds", 60)
        use_live_data = start_config.get("use_live_data", True)
        
        # Start bot
        started = await bot_execution_service.start_bot(
            bot_id=bot_id,
            bot_config=bot_config,
            mode="paper",
            initial_balance=initial_balance,
            interval_seconds=interval_seconds
        )
        
        if not started:
            raise TradeeonError(
                "Failed to start bot",
                "INTERNAL_SERVER_ERROR",
                status_code=500
            )
        
        # Create bot run record
        if db_service:
            run_id = db_service.create_bot_run(
                bot_id=bot_id,
                user_id=user.user_id,
                status="running"
            )
        else:
            run_id = None
        
        logger.info(f"✅ DCA bot {bot_id} started in paper trading mode")
        
        return {
            "success": True,
            "message": "Bot started successfully in paper trading mode",
            "bot_id": bot_id,
            "run_id": run_id,
            "status": "running",
            "mode": "paper",
            "initial_balance": initial_balance,
            "interval_seconds": interval_seconds
        }
        
    except NotFoundError:
        raise
    except TradeeonError:
        raise
    except Exception as e:
        logger.error(f"Error starting DCA bot in paper mode: {e}", exc_info=True)
        raise TradeeonError(
            f"Failed to start bot: {str(e)}",
            "INTERNAL_SERVER_ERROR",
            status_code=500
        )


@router.post("/dca-bots/{bot_id}/start")
async def start_dca_bot_live(
    bot_id: str = Path(..., description="Bot ID"),
    start_config: Dict[str, Any] = Body(default={}, description="Start configuration"),
    user: AuthedUser = Depends(get_current_user)
):
    """Start a DCA bot in live trading mode (NOT IMPLEMENTED YET)."""
    raise HTTPException(
        status_code=501,
        detail="Live trading is not implemented yet. Please use paper trading mode for now."
    )


# ==================== BOT CONTROL ENDPOINTS ====================

@router.post("/dca-bots/{bot_id}/stop")
async def stop_dca_bot(
    bot_id: str = Path(..., description="Bot ID"),
    user: AuthedUser = Depends(get_current_user)
):
    """Stop a running DCA bot."""
    try:
        import sys
        import os
        
        # Add bots directory to path
        bots_path = os.path.join(os.path.dirname(__file__), '..', '..', 'bots')
        if bots_path not in sys.path:
            sys.path.insert(0, bots_path)
        
        from db_service import db_service
        from bot_execution_service import bot_execution_service
        
        # Verify bot belongs to user
        bot_data = db_service.get_bot(bot_id, user_id=user.user_id)
        if not bot_data:
            raise NotFoundError("Bot", f"Bot {bot_id} not found or access denied")
        
        # Stop bot
        stopped = await bot_execution_service.stop_bot(bot_id)
        
        if not stopped:
            # Bot might not be running
            return {
                "success": True,
                "message": "Bot is not running or already stopped",
                "bot_id": bot_id,
                "status": "stopped"
            }
        
        logger.info(f"✅ DCA bot {bot_id} stopped successfully")
        
        return {
            "success": True,
            "message": "Bot stopped successfully",
            "bot_id": bot_id,
            "status": "stopped"
        }
        
    except NotFoundError:
        raise
    except Exception as e:
        logger.error(f"Error stopping DCA bot: {e}", exc_info=True)
        raise TradeeonError(
            f"Failed to stop bot: {str(e)}",
            "INTERNAL_SERVER_ERROR",
            status_code=500
        )


@router.post("/dca-bots/{bot_id}/pause")
async def pause_dca_bot(
    bot_id: str = Path(..., description="Bot ID"),
    user: AuthedUser = Depends(get_current_user)
):
    """Pause a running DCA bot."""
    try:
        import sys
        import os
        
        # Add bots directory to path
        bots_path = os.path.join(os.path.dirname(__file__), '..', '..', 'bots')
        if bots_path not in sys.path:
            sys.path.insert(0, bots_path)
        
        from db_service import db_service
        from bot_execution_service import bot_execution_service
        
        # Verify bot belongs to user
        bot_data = db_service.get_bot(bot_id, user_id=user.user_id)
        if not bot_data:
            raise NotFoundError("Bot", f"Bot {bot_id} not found or access denied")
        
        # Pause bot
        paused = await bot_execution_service.pause_bot(bot_id)
        
        if not paused:
            # Bot might not be running
            raise HTTPException(
                status_code=400,
                detail="Bot is not running. Cannot pause."
            )
        
        logger.info(f"✅ DCA bot {bot_id} paused successfully")
        
        return {
            "success": True,
            "message": "Bot paused successfully",
            "bot_id": bot_id,
            "status": "paused"
        }
        
    except NotFoundError:
        raise
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error pausing DCA bot: {e}", exc_info=True)
        raise TradeeonError(
            f"Failed to pause bot: {str(e)}",
            "INTERNAL_SERVER_ERROR",
            status_code=500
        )


@router.post("/dca-bots/{bot_id}/resume")
async def resume_dca_bot(
    bot_id: str = Path(..., description="Bot ID"),
    user: AuthedUser = Depends(get_current_user)
):
    """Resume a paused DCA bot."""
    try:
        import sys
        import os
        
        # Add bots directory to path
        bots_path = os.path.join(os.path.dirname(__file__), '..', '..', 'bots')
        if bots_path not in sys.path:
            sys.path.insert(0, bots_path)
        
        from db_service import db_service
        from bot_execution_service import bot_execution_service
        
        # Verify bot belongs to user
        bot_data = db_service.get_bot(bot_id, user_id=user.user_id)
        if not bot_data:
            raise NotFoundError("Bot", f"Bot {bot_id} not found or access denied")
        
        # Resume bot
        resumed = await bot_execution_service.resume_bot(bot_id)
        
        if not resumed:
            # Bot might not be running
            raise HTTPException(
                status_code=400,
                detail="Bot is not running. Cannot resume."
            )
        
        logger.info(f"✅ DCA bot {bot_id} resumed successfully")
        
        return {
            "success": True,
            "message": "Bot resumed successfully",
            "bot_id": bot_id,
            "status": "running"
        }
        
    except NotFoundError:
        raise
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error resuming DCA bot: {e}", exc_info=True)
        raise TradeeonError(
            f"Failed to resume bot: {str(e)}",
            "INTERNAL_SERVER_ERROR",
            status_code=500
        )


# ==================== BOT STATUS & MONITORING ENDPOINTS ====================

@router.get("/dca-bots/{bot_id}/status")
@router.get("/dca-bots/status/{bot_id}")  # Alternative path for frontend compatibility
async def get_dca_bot_status(
    bot_id: str = Path(..., description="Bot ID"),
    user: AuthedUser = Depends(get_current_user)
):
    """Get current status and statistics of a DCA bot."""
    try:
        import sys
        import os
        
        # Add bots directory to path
        bots_path = os.path.join(os.path.dirname(__file__), '..', '..', 'bots')
        if bots_path not in sys.path:
            sys.path.insert(0, bots_path)
        
        from db_service import db_service
        from bot_execution_service import bot_execution_service
        
        # Get bot from database
        bot_data = db_service.get_bot(bot_id, user_id=user.user_id)
        if not bot_data:
            raise NotFoundError("Bot", f"Bot {bot_id} not found or access denied")
        
        # Get execution service status
        execution_status = bot_execution_service.get_bot_status(bot_id)
        
        # Get bot executor if running
        executor = None
        if bot_execution_service.is_running(bot_id):
            executor = bot_execution_service.running_bots.get(bot_id)
        
        # Build status response
        status_data = {
            "success": True,
            "bot_id": bot_id,
            "status": execution_status.get("status", "inactive") if execution_status else "inactive",
            "paused": execution_status.get("paused", False) if execution_status else False,
            "paper_trading": execution_status.get("paper_trading", True) if execution_status else True,
            "running": execution_status.get("running", False) if execution_status else False,
        }
        
        # Add paper trading statistics if executor is available
        if executor and executor.paper_trading and executor.trading_engine:
            trading_engine = executor.trading_engine
            
            # Get balance
            balance = trading_engine.get_balance()
            
            # Get positions
            positions = {}
            total_invested = 0.0
            total_position_value = 0.0
            total_unrealized_pnl = 0.0
            
            for pair in executor.config.get("selectedPairs", []):
                position = trading_engine.get_position(pair)
                if position and position.get("total_qty", 0) > 0:
                    # Get current price
                    try:
                        current_price = await executor.market_data.get_current_price(pair)
                        if current_price > 0:
                            # Calculate P&L
                            pnl_data = trading_engine.get_position_pnl(pair, current_price)
                            
                            positions[pair] = {
                                "qty": float(position.get("total_qty", 0)),
                                "avg_entry_price": pnl_data.get("avg_entry_price", 0.0),
                                "current_price": current_price,
                                "pnl_amount": pnl_data.get("pnl_amount", 0.0),
                                "pnl_percent": pnl_data.get("pnl_percent", 0.0),
                                "invested": pnl_data.get("invested", 0.0),
                                "current_value": pnl_data.get("current_value", 0.0)
                            }
                            
                            total_invested += pnl_data.get("invested", 0.0)
                            total_position_value += pnl_data.get("current_value", 0.0)
                            total_unrealized_pnl += pnl_data.get("pnl_amount", 0.0)
                    except Exception as e:
                        logger.warning(f"Could not fetch price for {pair}: {e}")
            
            # Get total realized P&L
            total_realized_pnl = float(trading_engine.total_realized_pnl)
            
            # Calculate total P&L
            total_pnl = total_realized_pnl + total_unrealized_pnl
            
            # Calculate return percentage
            initial_balance = float(trading_engine.initial_balance)
            return_pct = (total_pnl / initial_balance * 100) if initial_balance > 0 else 0.0
            
            # Add to status data
            status_data.update({
                "initial_balance": initial_balance,
                "current_balance": balance,
                "balance": balance,  # Alias for frontend compatibility
                "total_invested": total_invested,
                "total_position_value": total_position_value,
                "total_realized_pnl": total_realized_pnl,
                "total_unrealized_pnl": total_unrealized_pnl,
                "total_pnl": total_pnl,
                "totalPnl": total_pnl,  # Alias for frontend compatibility
                "total_return_pct": return_pct,
                "returnPct": return_pct,  # Alias for frontend compatibility
                "open_positions": len(positions),
                "openPositions": len(positions),  # Alias for frontend compatibility
                "positions": positions
            })
        
        return status_data
        
    except NotFoundError:
        raise
    except Exception as e:
        logger.error(f"Error getting DCA bot status: {e}", exc_info=True)
        raise TradeeonError(
            f"Failed to get bot status: {str(e)}",
            "INTERNAL_SERVER_ERROR",
            status_code=500
        )


@router.get("/dca-bots/{bot_id}/positions")
async def get_dca_bot_positions(
    bot_id: str = Path(..., description="Bot ID"),
    user: AuthedUser = Depends(get_current_user)
):
    """Get all positions for a DCA bot."""
    try:
        import sys
        import os
        
        # Add bots directory to path
        bots_path = os.path.join(os.path.dirname(__file__), '..', '..', 'bots')
        if bots_path not in sys.path:
            sys.path.insert(0, bots_path)
        
        from db_service import db_service
        from bot_execution_service import bot_execution_service
        
        # Verify bot belongs to user
        bot_data = db_service.get_bot(bot_id, user_id=user.user_id)
        if not bot_data:
            raise NotFoundError("Bot", f"Bot {bot_id} not found or access denied")
        
        # Get executor if running
        if not bot_execution_service.is_running(bot_id):
            return {
                "success": True,
                "bot_id": bot_id,
                "positions": {},
                "count": 0
            }
        
        executor = bot_execution_service.running_bots.get(bot_id)
        if not executor or not executor.paper_trading or not executor.trading_engine:
            return {
                "success": True,
                "bot_id": bot_id,
                "positions": {},
                "count": 0
            }
        
        trading_engine = executor.trading_engine
        positions = {}
        
        # Get positions for all pairs
        for pair in executor.config.get("selectedPairs", []):
            position = trading_engine.get_position(pair)
            if position and position.get("total_qty", 0) > 0:
                try:
                    current_price = await executor.market_data.get_current_price(pair)
                    if current_price > 0:
                        pnl_data = trading_engine.get_position_pnl(pair, current_price)
                        
                        positions[pair] = {
                            "qty": float(position.get("total_qty", 0)),
                            "avg_entry_price": pnl_data.get("avg_entry_price", 0.0),
                            "current_price": current_price,
                            "pnl_amount": pnl_data.get("pnl_amount", 0.0),
                            "pnl_percent": pnl_data.get("pnl_percent", 0.0),
                            "invested": pnl_data.get("invested", 0.0),
                            "current_value": pnl_data.get("current_value", 0.0),
                            "entries": position.get("entries", [])
                        }
                except Exception as e:
                    logger.warning(f"Could not fetch position data for {pair}: {e}")
        
        return {
            "success": True,
            "bot_id": bot_id,
            "positions": positions,
            "count": len(positions)
        }
        
    except NotFoundError:
        raise
    except Exception as e:
        logger.error(f"Error getting bot positions: {e}", exc_info=True)
        raise TradeeonError(
            f"Failed to get bot positions: {str(e)}",
            "INTERNAL_SERVER_ERROR",
            status_code=500
        )


@router.get("/dca-bots/{bot_id}/orders")
async def get_dca_bot_orders(
    bot_id: str = Path(..., description="Bot ID"),
    limit: int = Query(100, description="Maximum number of orders to return"),
    user: AuthedUser = Depends(get_current_user)
):
    """Get order history for a DCA bot."""
    try:
        import sys
        import os
        
        # Add bots directory to path
        bots_path = os.path.join(os.path.dirname(__file__), '..', '..', 'bots')
        if bots_path not in sys.path:
            sys.path.insert(0, bots_path)
        
        from db_service import db_service
        from bot_execution_service import bot_execution_service
        
        # Verify bot belongs to user
        bot_data = db_service.get_bot(bot_id, user_id=user.user_id)
        if not bot_data:
            raise NotFoundError("Bot", f"Bot {bot_id} not found or access denied")
        
        # Get orders from paper trading engine if running
        orders = []
        if bot_execution_service.is_running(bot_id):
            executor = bot_execution_service.running_bots.get(bot_id)
            if executor and executor.paper_trading and executor.trading_engine:
                order_history = executor.trading_engine.order_history
                # Return most recent orders
                orders = order_history[-limit:] if len(order_history) > limit else order_history
        
        return {
            "success": True,
            "bot_id": bot_id,
            "orders": orders,
            "count": len(orders)
        }
        
    except NotFoundError:
        raise
    except Exception as e:
        logger.error(f"Error getting bot orders: {e}", exc_info=True)
        raise TradeeonError(
            f"Failed to get bot orders: {str(e)}",
            "INTERNAL_SERVER_ERROR",
            status_code=500
        )


@router.get("/dca-bots/{bot_id}/pnl")
async def get_dca_bot_pnl(
    bot_id: str = Path(..., description="Bot ID"),
    user: AuthedUser = Depends(get_current_user)
):
    """Get P&L summary for a DCA bot."""
    try:
        import sys
        import os
        
        # Add bots directory to path
        bots_path = os.path.join(os.path.dirname(__file__), '..', '..', 'bots')
        if bots_path not in sys.path:
            sys.path.insert(0, bots_path)
        
        from db_service import db_service
        from bot_execution_service import bot_execution_service
        
        # Verify bot belongs to user
        bot_data = db_service.get_bot(bot_id, user_id=user.user_id)
        if not bot_data:
            raise NotFoundError("Bot", f"Bot {bot_id} not found or access denied")
        
        # Get P&L from paper trading engine if running
        if not bot_execution_service.is_running(bot_id):
            return {
                "success": True,
                "bot_id": bot_id,
                "total_pnl": 0.0,
                "realized_pnl": 0.0,
                "unrealized_pnl": 0.0,
                "return_pct": 0.0
            }
        
        executor = bot_execution_service.running_bots.get(bot_id)
        if not executor or not executor.paper_trading or not executor.trading_engine:
            return {
                "success": True,
                "bot_id": bot_id,
                "total_pnl": 0.0,
                "realized_pnl": 0.0,
                "unrealized_pnl": 0.0,
                "return_pct": 0.0
            }
        
        trading_engine = executor.trading_engine
        
        # Calculate unrealized P&L from positions
        total_unrealized_pnl = 0.0
        for pair in executor.config.get("selectedPairs", []):
            position = trading_engine.get_position(pair)
            if position and position.get("total_qty", 0) > 0:
                try:
                    current_price = await executor.market_data.get_current_price(pair)
                    if current_price > 0:
                        pnl_data = trading_engine.get_position_pnl(pair, current_price)
                        total_unrealized_pnl += pnl_data.get("pnl_amount", 0.0)
                except Exception as e:
                    logger.warning(f"Could not calculate P&L for {pair}: {e}")
        
        # Get realized P&L
        total_realized_pnl = float(trading_engine.total_realized_pnl)
        
        # Total P&L
        total_pnl = total_realized_pnl + total_unrealized_pnl
        
        # Return percentage
        initial_balance = float(trading_engine.initial_balance)
        return_pct = (total_pnl / initial_balance * 100) if initial_balance > 0 else 0.0
        
        return {
            "success": True,
            "bot_id": bot_id,
            "total_pnl": total_pnl,
            "realized_pnl": total_realized_pnl,
            "unrealized_pnl": total_unrealized_pnl,
            "return_pct": return_pct,
            "initial_balance": initial_balance,
            "current_balance": float(trading_engine.get_balance())
        }
        
    except NotFoundError:
        raise
    except Exception as e:
        logger.error(f"Error getting bot P&L: {e}", exc_info=True)
        raise TradeeonError(
            f"Failed to get bot P&L: {str(e)}",
            "INTERNAL_SERVER_ERROR",
            status_code=500
        )
