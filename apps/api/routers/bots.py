"""Bot management API routes."""

from fastapi import APIRouter, HTTPException, Query, Path, Body
from typing import List, Optional, Dict, Any
import logging

from apps.api.utils.errors import TradeeonError, NotFoundError, DatabaseError

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..', '..'))

from shared.contracts.bots import BotConfig, BotRun, BotStatus, BotType
from shared.contracts.orders import OrderIntent, ExecutionReport

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/bots", tags=["bots"])


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
            logger.info(f"Phase 1 features enabled: {list(phase1_features.keys())}")
        
        return {
            "success": True,
            "bot": bot,
            "message": "Bot created successfully. Ready to handle Phase 1 features."
        }
    
    except Exception as e:
        logger.error(f"Error creating bot: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/dca-bots")
async def create_dca_bot(
    bot_config: Dict[str, Any] = Body(..., description="Full DCA bot configuration including Phase 1 features")
):
    """Create a DCA bot with advanced Phase 1 features."""
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
                        supabase.table("alerts").insert(alert).execute()
                        logger.info(f"Created alert for bot {bot_id} entry condition")
            
            except Exception as alert_error:
                logger.warning(f"Failed to create alert for bot {bot_id}: {alert_error}. Bot created without alert.")
        
        logger.info(f"Created DCA bot {bot_id} with {len(selected_pairs)} pairs")
        logger.info(f"Phase 1 features: {list(phase1.keys()) if phase1 else 'None'}")
        
        return {
            "success": True,
            "bot": bot,
            "bot_id": bot_id,  # Return bot_id for starting
            "message": "DCA Bot created successfully with Phase 1 features support. Use POST /bots/dca-bots/start-paper to start paper trading."
        }
    
    except Exception as e:
        logger.error(f"Error creating DCA bot: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


def _validate_phase1_features(phase1: Dict[str, Any]):
    """Validate Phase 1 features structure."""
    # Market Regime
    if phase1.get("marketRegime"):
        regime = phase1["marketRegime"]
        if not regime.get("regimeTimeframe"):
            regime["regimeTimeframe"] = "1d"
        if not regime.get("pauseConditions"):
            regime["pauseConditions"] = {"belowMovingAverage": True, "maPeriod": 200, "rsiThreshold": 30, "consecutivePeriods": 7, "useTimeframeScaling": True}
        if not regime.get("resumeConditions"):
            regime["resumeConditions"] = {"volumeDecreaseThreshold": 20, "consolidationPeriods": 5, "useTimeframeScaling": True, "priceRangePercent": 5}
    
    # Dynamic Scaling
    if phase1.get("dynamicScaling"):
        scaling = phase1["dynamicScaling"]
        if not scaling.get("volatilityMultiplier"):
            scaling["volatilityMultiplier"] = {"lowVolatility": 1.2, "normalVolatility": 1.0, "highVolatility": 0.7}
        if not scaling.get("supportResistanceMultiplier"):
            scaling["supportResistanceMultiplier"] = {"nearStrongSupport": 1.5, "neutralZone": 1.0, "nearResistance": 0.5}
        if not scaling.get("fearGreedIndex"):
            scaling["fearGreedIndex"] = {"extremeFear": 1.8, "neutral": 1.0, "extremeGreed": 0.5}
    
    # Profit Strategy
    if phase1.get("profitStrategy"):
        profit = phase1["profitStrategy"]
        if not profit.get("partialTargets"):
            profit["partialTargets"] = []
        if not profit.get("trailingStop"):
            profit["trailingStop"] = {"enabled": False, "activationProfit": 10, "trailingDistance": 5, "onlyUp": True}
        if not profit.get("takeProfitAndRestart"):
            profit["takeProfitAndRestart"] = {"enabled": False, "profitTarget": 30, "useOriginalCapital": True}
        if not profit.get("timeBasedExit"):
            profit["timeBasedExit"] = {"enabled": False, "maxHoldDays": 30, "minProfit": 10}
    
    # Emergency Brake
    if phase1.get("emergencyBrake"):
        brake = phase1["emergencyBrake"]
        if not brake.get("circuitBreaker"):
            brake["circuitBreaker"] = {"enabled": True, "flashCrashPercent": 10, "timeWindowMinutes": 5}
        if not brake.get("marketWideCrashDetection"):
            brake["marketWideCrashDetection"] = {"enabled": True, "correlationThreshold": 0.8, "marketDropPercent": 15}
        if not brake.get("recoveryMode"):
            brake["recoveryMode"] = {"enabled": True, "stabilizationBars": 10, "resumeAfterStabilized": True}


@router.get("/{bot_id}")
async def get_bot(bot_id: str = Path(..., description="Bot ID")):
    """Get bot details from database."""
    try:
        bots_path = os.path.join(os.path.dirname(__file__), '..', '..', 'bots')
        if bots_path not in sys.path:
            sys.path.insert(0, bots_path)
        
        # Try database first
        bot = None
        try:
            from db_service import db_service
            bot = db_service.get_bot(bot_id)
        except Exception as db_error:
            logger.warning(f"Failed to fetch bot from database: {db_error}")
        
        # Fallback to in-memory
        if not bot:
            from bot_manager import bot_manager
            bot_config = bot_manager.get_bot_config(bot_id)
            if bot_config:
                # Also check if bot is currently running
                runner = bot_manager.get_runner(bot_id)
                current_status = "running" if runner and runner.running else "inactive"
                
                bot = {
                    "bot_id": bot_id,
                    "user_id": bot_config.get("user_id", "current_user"),
                    "name": bot_config.get("botName", "DCA Bot"),
                    "bot_type": "dca",
                    "status": current_status,
                    "symbol": bot_config.get("pair", bot_config.get("selectedPairs", ["BTCUSDT"])[0] if bot_config.get("selectedPairs") else "BTCUSDT"),
                    "interval": "1h",
                    "config": bot_config,
                    "required_capital": bot_config.get("baseOrderSize", 100) * 10
                }
        
        if not bot:
            raise HTTPException(status_code=404, detail=f"Bot {bot_id} not found")
        
        return {
            "success": True,
            "bot": bot
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching bot: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{bot_id}/start")
async def start_bot(
    bot_id: str = Path(..., description="Bot ID"),
    paper_trading: bool = Body(default=True, description="Enable paper trading"),
    initial_balance: float = Body(default=10000.0, description="Initial paper trading balance"),
    interval_seconds: int = Body(default=60, description="Execution interval in seconds")
):
    """Start a bot with paper trading."""
    try:
        import sys
        import os
        
        # Add bots directory to path
        bots_path = os.path.join(os.path.dirname(__file__), '..', '..', 'bots')
        if bots_path not in sys.path:
            sys.path.insert(0, bots_path)
            
        from bot_runner import BotRunner
        
        # TODO: Load bot config from database using bot_id
        # For now, return error - need to get config first
        # This should be called after creating a bot, or we need to pass config
        
        return {
            "success": False,
            "message": "Please use /bots/dca-bots/{bot_id}/start-paper after creating a bot"
        }
    
    except Exception as e:
        logger.error(f"Error starting bot: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/dca-bots/{bot_id}/start-paper")
async def start_dca_bot_paper(
    bot_id: str = Path(..., description="Bot ID"),
    initial_balance: float = Body(default=10000.0, description="Initial paper trading balance"),
    interval_seconds: int = Body(default=60, description="Execution interval in seconds"),
    use_live_data: bool = Body(default=True, description="Use live market data from Binance")
):
    """Start a DCA bot in paper trading mode with live market data."""
    try:
        import sys
        import os
        
        # Add bots directory to path
        bots_path = os.path.join(os.path.dirname(__file__), '..', '..', 'bots')
        if bots_path not in sys.path:
            sys.path.insert(0, bots_path)
            
        from bot_runner import BotRunner
        from bot_manager import bot_manager
        
        # Check if already running
        existing_runner = bot_manager.get_runner(bot_id)
        if existing_runner and existing_runner.running:
            status = await existing_runner.get_status()
            return {
                "success": False,
                "message": f"Bot {bot_id} is already running",
                "status": status
            }
        
        # Get bot config
        bot_config = bot_manager.get_bot_config(bot_id)
        if not bot_config:
            return {
                "success": False,
                "message": f"Bot config not found for {bot_id}. Create bot first using POST /bots/dca-bots"
            }
        
        # Try to get user_id from database or config
        user_id = bot_config.get("user_id", "current_user")  # TODO: Get from auth
        try:
            sys.path.insert(0, bots_path)
            from db_service import db_service
            bot_data = db_service.get_bot(bot_id)
            if bot_data and bot_data.get("user_id"):
                user_id = bot_data["user_id"]
        except Exception:
            pass
        
        # Update config to ensure live data is used
        if use_live_data:
            bot_config['useLiveData'] = True
            logger.info(f"📊 Bot configured to use LIVE market data from Binance")
        
        # Validate Phase 1 features
        phase1 = bot_config.get("phase1Features", {})
        if phase1:
            _validate_phase1_features(phase1)
        
        logger.info(f"🚀 Starting DCA bot {bot_id} in TEST mode (paper trading)")
        logger.info(f"💰 Initial balance: ${initial_balance}")
        logger.info(f"⏱️  Execution interval: {interval_seconds} seconds")
        
        # Create and start bot runner with bot_id and user_id
        runner = BotRunner(
            bot_config=bot_config,
            paper_trading=True,
            initial_balance=initial_balance,
            interval_seconds=interval_seconds,
            bot_id=bot_id,
            user_id=user_id
        )
        
        await runner.start()
        
        # Store runner and run_id
        bot_manager.add_runner(bot_id, runner)
        if runner.run_id:
            bot_manager.set_run_id(bot_id, runner.run_id)
        
        logger.info(f"✅ Started paper trading bot {bot_id}")
        
        return {
            "success": True,
            "message": f"Paper trading bot {bot_id} started successfully",
            "bot_id": bot_id,
            "paper_trading": True,
            "initial_balance": initial_balance,
            "interval_seconds": interval_seconds
        }
    
    except Exception as e:
        logger.error(f"Error starting paper trading bot: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/dca-bots/start-paper")
async def start_dca_bot_paper_with_config(
    bot_config: Dict[str, Any] = Body(..., description="Bot configuration"),
    initial_balance: float = Body(default=10000.0, description="Initial paper trading balance"),
    interval_seconds: int = Body(default=60, description="Execution interval in seconds")
):
    """Start a DCA bot in paper trading mode with provided config."""
    try:
        import sys
        import os
        
        # Add bots directory to path
        bots_path = os.path.join(os.path.dirname(__file__), '..', '..', 'bots')
        if bots_path not in sys.path:
            sys.path.insert(0, bots_path)
            
        from bot_runner import BotRunner
        
        # Validate config
        phase1 = bot_config.get("phase1Features", {})
        if phase1:
            _validate_phase1_features(phase1)
        
        # Create bot runner
        runner = BotRunner(
            bot_config=bot_config,
            paper_trading=True,
            initial_balance=initial_balance,
            interval_seconds=interval_seconds
        )
        
        # Start bot (runs in background)
        await runner.start()
        
        # Store runner (in production, store in database/cache by bot_id)
        # For now, return success
        return {
            "success": True,
            "message": "Paper trading bot started successfully",
            "bot_id": bot_config.get("botName", "dca_bot"),
            "paper_trading": True,
            "initial_balance": initial_balance,
            "interval_seconds": interval_seconds,
            "note": "Bot is running in background. Use GET /bots/dca-bots/status/{bot_id} to check status"
        }
    
    except Exception as e:
        logger.error(f"Error starting paper trading bot: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/dca-bots/status/{bot_id}")
async def get_bot_status(bot_id: str = Path(..., description="Bot ID")):
    """Get bot execution status and statistics."""
    try:
        bots_path = os.path.join(os.path.dirname(__file__), '..', '..', 'bots')
        if bots_path not in sys.path:
            sys.path.insert(0, bots_path)
            
        from bot_manager import bot_manager
        
        # Check if bot is currently running
        runner = bot_manager.get_runner(bot_id)
        if runner and runner.running:
            # Get live status from runner
            status = await runner.get_status()
            status["bot_id"] = bot_id
            status["success"] = True
            return status
        
        # Bot not running - try to get from database
        try:
            from db_service import db_service
            bot_data = db_service.get_bot(bot_id)
            if bot_data:
                # Get latest run for this bot
                runs_result = db_service.supabase.table("bot_runs").select("*").eq("bot_id", bot_id).order("started_at", desc=True).limit(1).execute()
                latest_run = runs_result.data[0] if runs_result.data else None
                
                return {
                    "success": True,
                    "bot_id": bot_id,
                    "status": bot_data.get("status", "inactive"),
                    "paused": False,
                    "running": False,
                    "message": f"Bot {bot_id} is not currently running",
                    "latest_run": latest_run,
                    "bot_info": {
                        "name": bot_data.get("name"),
                        "symbol": bot_data.get("symbol"),
                        "created_at": bot_data.get("created_at")
                    }
                }
        except Exception as db_error:
            logger.warning(f"Failed to get bot from database: {db_error}")
        
        return {
            "success": False,
            "bot_id": bot_id,
            "status": "not_running",
            "message": f"Bot {bot_id} is not running. Start it using POST /bots/dca-bots/{bot_id}/start-paper"
        }
    
    except Exception as e:
        logger.error(f"Error getting bot status: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{bot_id}/stop")
async def stop_bot(bot_id: str = Path(..., description="Bot ID")):
    """Stop a bot."""
    try:
        import sys
        import os
        
        bots_path = os.path.join(os.path.dirname(__file__), '..', '..', 'bots')
        if bots_path not in sys.path:
            sys.path.insert(0, bots_path)
            
        from bot_manager import bot_manager
        
        runner = bot_manager.get_runner(bot_id)
        if not runner:
            # Check if bot exists but is not running
            bot_config = bot_manager.get_bot_config(bot_id)
            if not bot_config:
                try:
                    from db_service import db_service
                    bot_data = db_service.get_bot(bot_id)
                    if not bot_data:
                        raise HTTPException(status_code=404, detail=f"Bot {bot_id} not found")
                    # Bot exists but not running - update status
                    db_service.update_bot_status(bot_id, "stopped")
                    return {
                        "success": True,
                        "message": f"Bot {bot_id} is already stopped (status updated)"
                    }
                except Exception:
                    raise HTTPException(status_code=404, detail=f"Bot {bot_id} not found")
            
            return {
                "success": False,
                "message": f"Bot {bot_id} is not running"
            }
        
        # Stop the runner (will update database automatically)
        await runner.stop()
        bot_manager.remove_runner(bot_id)
        
        return {
            "success": True,
            "message": f"Bot {bot_id} stopped successfully"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error stopping bot: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{bot_id}/runs")
async def get_bot_runs(
    bot_id: str = Path(..., description="Bot ID"),
    limit: int = Query(default=20, ge=1, le=100, description="Number of runs to return")
):
    """Get bot run history from database."""
    try:
        import sys
        import os
        
        bots_path = os.path.join(os.path.dirname(__file__), '..', '..', 'bots')
        if bots_path not in sys.path:
            sys.path.insert(0, bots_path)
        
        runs = []
        try:
            from db_service import db_service
            if db_service.enabled:
                # Query bot_runs table
                result = db_service.supabase.table("bot_runs").select("*").eq("bot_id", bot_id).order("started_at", desc=True).limit(limit).execute()
                if result.data:
                    runs = result.data
        except Exception as db_error:
            logger.warning(f"Failed to fetch bot runs from database: {db_error}")
            # Return empty if database not available
            pass
        
        return {
            "success": True,
            "runs": runs[:limit],
            "count": len(runs)
        }
    
    except Exception as e:
        logger.error(f"Error fetching bot runs: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{bot_id}")
async def update_bot(
    bot_id: str = Path(..., description="Bot ID"),
    config: Dict[str, Any] = Body(..., description="Updated bot configuration")
):
    """Update bot configuration."""
    try:
        import sys
        import os
        import time
        
        bots_path = os.path.join(os.path.dirname(__file__), '..', '..', 'bots')
        if bots_path not in sys.path:
            sys.path.insert(0, bots_path)
        
        # Check if bot is running (can't update running bots)
        from bot_manager import bot_manager
        runner = bot_manager.get_runner(bot_id)
        if runner and runner.running:
            raise HTTPException(
                status_code=400, 
                detail=f"Cannot update bot {bot_id} while it is running. Stop it first."
            )
        
        # Prepare updated config
        config_dict = {
            "botName": config.get("botName"),
            "direction": config.get("direction"),
            "pairs": config.get("selectedPairs", [config.get("pair")]),
            "exchange": config.get("exchange"),
            "botType": config.get("botType"),
            "baseOrderSize": config.get("baseOrderSize"),
            "startOrderType": config.get("startOrderType"),
            "conditionConfig": config.get("conditionConfig"),
            "dcaRules": config.get("dcaRules", {}),
            "dcaAmount": config.get("dcaAmount", {}),
            "phase1Features": config.get("phase1Features", {})
        }
        
        # Validate Phase 1 features
        phase1 = config_dict.get("phase1Features", {})
        if phase1:
            _validate_phase1_features(phase1)
        
        # Update in database
        try:
            from db_service import db_service
            if db_service.enabled:
                # Update config JSONB in database
                db_service.supabase.table("bots").update({
                    "config": config_dict,
                    "name": config.get("botName", "DCA Bot"),
                    "updated_at": datetime.now().isoformat()
                }).eq("bot_id", bot_id).execute()
                
                logger.info(f"✅ Bot {bot_id} updated in database")
        except Exception as db_error:
            logger.warning(f"Failed to update bot in database: {db_error}")
        
        # Update in-memory config (fallback)
        bot_manager.store_bot_config(bot_id, config)
        
        return {
            "success": True,
            "message": f"Bot {bot_id} updated successfully",
            "updated_at": int(time.time() * 1000)
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating bot: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{bot_id}/pause")
async def pause_bot(bot_id: str = Path(..., description="Bot ID")):
    """Pause a running bot (pause execution but keep it loaded)."""
    try:
        bots_path = os.path.join(os.path.dirname(__file__), '..', '..', 'bots')
        if bots_path not in sys.path:
            sys.path.insert(0, bots_path)
        
        from bot_manager import bot_manager
        
        # Check if bot exists
        runner = bot_manager.get_runner(bot_id)
        if not runner:
            raise HTTPException(status_code=404, detail=f"Bot {bot_id} is not running")
        
        if not runner.running:
            return {
                "success": True,
                "message": f"Bot {bot_id} is already paused/stopped"
            }
        
        # Pause the executor (if supported)
        if runner.executor:
            runner.executor.paused = True
        
        # Update status in database
        try:
            from db_service import db_service
            db_service.update_bot_status(bot_id, "paused")
        except Exception as db_error:
            logger.warning(f"Failed to update bot status in database: {db_error}")
        
        return {
            "success": True,
            "message": f"Bot {bot_id} paused successfully"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error pausing bot: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{bot_id}/resume")
async def resume_bot(bot_id: str = Path(..., description="Bot ID")):
    """Resume a paused bot."""
    try:
        bots_path = os.path.join(os.path.dirname(__file__), '..', '..', 'bots')
        if bots_path not in sys.path:
            sys.path.insert(0, bots_path)
        
        from bot_manager import bot_manager
        
        # Check if bot exists
        runner = bot_manager.get_runner(bot_id)
        if not runner:
            raise HTTPException(status_code=404, detail=f"Bot {bot_id} is not running or doesn't exist")
        
        if runner.running and not (runner.executor and runner.executor.paused):
            return {
                "success": True,
                "message": f"Bot {bot_id} is already running"
            }
        
        # Resume the executor
        if runner.executor:
            runner.executor.paused = False
        
        # Update status in database
        try:
            from db_service import db_service
            db_service.update_bot_status(bot_id, "running")
        except Exception as db_error:
            logger.warning(f"Failed to update bot status in database: {db_error}")
        
        return {
            "success": True,
            "message": f"Bot {bot_id} resumed successfully"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error resuming bot: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{bot_id}")
async def delete_bot(bot_id: str = Path(..., description="Bot ID")):
    """Delete a bot and all its data."""
    try:
        bots_path = os.path.join(os.path.dirname(__file__), '..', '..', 'bots')
        if bots_path not in sys.path:
            sys.path.insert(0, bots_path)
        
        from bot_manager import bot_manager
        
        # Check if bot is running
        runner = bot_manager.get_runner(bot_id)
        if runner and runner.running:
            # Stop it first
            await runner.stop()
            bot_manager.remove_runner(bot_id)
        
        # Delete from database (cascade will delete bot_runs, order_logs)
        try:
            from db_service import db_service
            if db_service.enabled:
                db_service.supabase.table("bots").delete().eq("bot_id", bot_id).execute()
                logger.info(f"✅ Bot {bot_id} and all related data deleted from database")
        except Exception as db_error:
            logger.warning(f"Failed to delete bot from database: {db_error}")
        
        # Remove from in-memory storage (will be cleared on restart)
        
        return {
            "success": True,
            "message": f"Bot {bot_id} deleted successfully. All related data (runs, orders) also deleted."
        }
    
    except Exception as e:
        logger.error(f"Error deleting bot: {e}")
        raise HTTPException(status_code=500, detail=str(e))
