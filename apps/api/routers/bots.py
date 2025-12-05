"""Bot management API routes."""

from fastapi import APIRouter, HTTPException, Query, Path, Body, Depends, Request
from fastapi.exceptions import RequestValidationError
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


def get_bot_services(request: Request):
    """Dependency to get bot services from app state."""
    bot_execution_service = getattr(request.app.state, 'bot_execution_service', None)
    db_service = getattr(request.app.state, 'db_service', None)
    
    if bot_execution_service is None:
        logger.error("Bot execution service not available in app state")
        raise TradeeonError(
            "Bot execution service is not available. Please check backend configuration.",
            "SERVICE_UNAVAILABLE",
            status_code=503
        )
    
    if db_service is None or not db_service.enabled:
        logger.error("Database service not available or disabled in app state")
        raise TradeeonError(
            "Database service is not available. Please check backend configuration.",
            "SERVICE_UNAVAILABLE",
            status_code=503
        )
    
    return bot_execution_service, db_service


@router.get("/")
async def list_bots(
    status: Optional[BotStatus] = Query(None, description="Filter by status (optional)"),
    user: AuthedUser = Depends(get_current_user),
    services: tuple = Depends(get_bot_services)
):
    """
    List user's bots from database.
    
    Requires authentication via Authorization header.
    User ID is extracted from JWT token automatically.
    """
    try:
        bot_execution_service, db_service = services
        
        # Get user_id from authenticated user (extracted from JWT token)
        user_id = user.user_id
        logger.debug(f"Listing bots for user_id: {user_id}, status filter: {status}")
        
        status_filter = status.value if status else None
        logger.info(f"📋 Calling db_service.list_bots(user_id={user_id}, status={status_filter})")
        logger.debug(f"   User ID type: {type(user_id).__name__}")
        logger.debug(f"   User ID value: {user_id}")
        
        bots = db_service.list_bots(user_id, status_filter)
        
        logger.info(f"✅ db_service.list_bots() returned {len(bots)} bots for user {user_id}")
        
        if bots:
            logger.debug(f"Bot details summary:")
            for i, bot in enumerate(bots):
                logger.debug(f"   Bot {i+1}: id={bot.get('bot_id')}, name={bot.get('name')}, status={bot.get('status')}")
        else:
            logger.warning(f"⚠️  No bots returned for user {user_id}")
            logger.warning(f"   This could indicate:")
            logger.warning(f"   - User has no bots in database")
            logger.warning(f"   - RLS policy is blocking results")
            logger.warning(f"   - Status filter '{status_filter}' doesn't match")
            logger.warning(f"   - Query failed silently (check db_service logs)")
        
        # Prepare response
        response = {
            "success": True,
            "bots": bots,
            "count": len(bots)
        }
        
        # Add diagnostic metadata in development mode
        if os.getenv("ENVIRONMENT", "").lower() != "production":
            response["_debug"] = {
                "user_id": user_id,
                "user_id_type": type(user_id).__name__,
                "status_filter": status.value if status else None,
                "query_executed": True,
                "result_count": len(bots),
                "database_service_enabled": db_service.enabled
            }
            logger.debug(f"Response includes debug metadata: {response['_debug']}")
        
        return response
    
    except HTTPException:
        # Re-raise HTTP exceptions (like 401 from auth)
        raise
    except TradeeonError:
        raise
    except Exception as e:
        logger.error(f"Error listing bots: {e}", exc_info=True)
        # Provide more context in error message
        error_msg = f"Failed to list bots: {str(e)}"
        if "user_id" in str(e).lower() or "field required" in str(e).lower():
            error_msg = "Backend configuration error: The endpoint is expecting a parameter that should be extracted from authentication. Please ensure the backend is running the latest code."
        raise TradeeonError(
            error_msg,
            "INTERNAL_SERVER_ERROR",
            status_code=500
        )


@router.post("/dca-bots")
async def create_dca_bot(
    bot_config: Dict[str, Any] = Body(..., description="DCA bot configuration"),
    user: AuthedUser = Depends(get_current_user),
    services: tuple = Depends(get_bot_services)
):
    """Create a new DCA bot."""
    try:
        import time
        bot_execution_service, db_service = services
        
        user_id = user.user_id
        
        # Extract bot configuration
        bot_name = bot_config.get("name", f"DCA Bot {int(time.time())}")
        primary_pair = bot_config.get("selectedPairs", [bot_config.get("symbol", "BTCUSDT")])[0] if isinstance(bot_config.get("selectedPairs"), list) and bot_config.get("selectedPairs") else (bot_config.get("symbol") or "BTCUSDT")
        exchange = bot_config.get("exchange", "Binance")
        required_capital = bot_config.get("baseOrderSize", 100.0)
        
        # Generate bot ID
        bot_id = f"dca_bot_{int(time.time() * 1000)}"
        
        # Prepare config dict for database
        config_dict = {
            **bot_config,
            "bot_id": bot_id,
            "user_id": user_id,
            "created_at": int(time.time() * 1000)
        }
        
        # Save bot to database
        saved = db_service.create_bot(
            bot_id=bot_id,
            user_id=user_id,
            name=bot_name,
            bot_type="dca",
            symbol=primary_pair,
            interval="1h",
            config=config_dict,
            required_capital=required_capital
        )
        
        if not saved:
            raise TradeeonError(
                "Failed to save bot to database",
                "DATABASE_ERROR",
                status_code=500
            )
        
        logger.info(f"✅ Bot {bot_id} successfully saved to database with status 'inactive'")
        
        # Log bot creation event
        try:
            db_service.log_event(
                bot_id=bot_id,
                run_id=None,
                user_id=user_id,
                event_type="bot_created",
                event_category="system",
                message=f"Bot '{bot_name}' created successfully",
                symbol=primary_pair,
                details={
                    "bot_type": "dca",
                    "exchange": exchange,
                    "required_capital": required_capital,
                    "pairs": bot_config.get("selectedPairs", []),
                    "pair_mode": bot_config.get("pairMode", "single"),
                }
            )
        except Exception as log_error:
            logger.warning(f"Failed to log bot creation event: {log_error}")
            # Don't fail bot creation if logging fails
        
        # Convert entry conditions to alert format and create alert
        try:
            from apps.bots.entry_condition_to_alert import convert_entry_conditions_to_alert
            from apps.api.clients.supabase_client import supabase
            
            entry_conditions = bot_config.get("entryConditions")
            if entry_conditions and entry_conditions.get("entryType") == "conditional":
                alert = convert_entry_conditions_to_alert(
                    bot_id=bot_id,
                    user_id=user_id,
                    symbol=primary_pair,
                    entry_conditions_data=entry_conditions,
                    base_timeframe=bot_config.get("timeframe", "1h")
                )
                
                if alert and supabase:
                    try:
                        supabase.table("alerts").insert(alert).execute()
                        logger.info(f"✅ Created entry alert for bot {bot_id}")
                    except Exception as alert_error:
                        logger.warning(f"Failed to create alert for bot {bot_id}: {alert_error}")
                        # Don't fail bot creation if alert creation fails
                elif alert:
                    logger.warning(f"Supabase client not available, skipping alert creation for bot {bot_id}")
        except Exception as e:
            logger.warning(f"Error creating alert for bot {bot_id}: {e}", exc_info=True)
            # Don't fail bot creation if alert creation fails
        
        bot = {
            "bot_id": bot_id,
            "user_id": user_id,
            "name": bot_name,
            "bot_type": "dca",
            "status": "inactive",
            "symbol": primary_pair,
            "interval": "1h",
            "config": config_dict,
            "required_capital": required_capital,
            "created_at": int(time.time() * 1000),
            "updated_at": int(time.time() * 1000)
        }
        
        return {
            "success": True,
            "bot": bot,
            "bot_id": bot_id
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
    start_config: Optional[Dict[str, Any]] = Body(default=None, description="Start configuration"),
    user: AuthedUser = Depends(get_current_user),
    services: tuple = Depends(get_bot_services)
):
    """Start a DCA bot in paper trading mode."""
    try:
        bot_execution_service, db_service = services
        
        bot_data = db_service.get_bot(bot_id, user_id=user.user_id)
        if not bot_data:
            raise NotFoundError("Bot", f"Bot {bot_id} not found or access denied")
        
        current_status = bot_data.get("status", "inactive")
        
        # Validate that bot can be started (must be inactive or stopped)
        if current_status not in ["inactive", "stopped"]:
            if current_status == "running":
                return {
                    "success": True,
                    "message": "Bot is already running",
                    "bot_id": bot_id,
                    "status": "running"
                }
            elif current_status == "paused":
                raise TradeeonError(
                    "Bot is paused. Please resume it instead of starting it.",
                    "INVALID_STATUS_TRANSITION",
                    status_code=400
                )
            else:
                raise TradeeonError(
                    f"Cannot start bot with status: {current_status}. Bot must be inactive or stopped.",
                    "INVALID_STATUS_TRANSITION",
                    status_code=400
                )
        
        if bot_execution_service.is_running(bot_id):
            # Bot is running in memory but status might be out of sync
            logger.warning(f"Bot {bot_id} is running in memory but status is {current_status}. Updating status to running.")
            db_service.update_bot_status(bot_id, "running")
            return {
                "success": True,
                "message": "Bot is already running",
                "bot_id": bot_id,
                "status": "running"
            }
        
        bot_config = bot_data.get("config", {})
        bot_config["user_id"] = user.user_id
        
        # Handle optional start_config
        if start_config is None:
            start_config = {}
        
        initial_balance = start_config.get("initial_balance", 10000.0)
        interval_seconds = start_config.get("interval_seconds", 60)
        
        # Create bot run record FIRST (before starting bot so we can pass run_id)
        try:
            run_id = db_service.create_bot_run(bot_id=bot_id, user_id=user.user_id, status="running")
            if not run_id:
                logger.warning(f"Failed to create bot run record, continuing without run_id")
        except Exception as run_error:
            logger.error(f"Error creating bot run record: {run_error}", exc_info=True)
            run_id = None  # Continue without run_id
        
        # Start bot with run_id
        try:
            started = await bot_execution_service.start_bot(
                bot_id=bot_id,
                bot_config=bot_config,
                mode="paper",
                initial_balance=initial_balance,
                interval_seconds=interval_seconds,
                run_id=run_id  # Pass run_id to executor
            )
        except RuntimeError as start_error:
            # RuntimeError from bot_execution_service.start_bot with detailed message
            logger.error(f"Error starting bot executor: {start_error}", exc_info=True)
            # If bot failed to start, update run status
            if run_id and db_service and db_service.enabled:
                try:
                    db_service.update_bot_run(run_id, status="error")
                except:
                    pass
            raise TradeeonError(
                str(start_error),
                "INTERNAL_SERVER_ERROR",
                status_code=500,
                details={"bot_id": bot_id, "error_type": type(start_error).__name__}
            )
        except Exception as start_error:
            logger.error(f"Unexpected error starting bot executor: {start_error}", exc_info=True)
            # If bot failed to start, update run status
            if run_id and db_service and db_service.enabled:
                try:
                    db_service.update_bot_run(run_id, status="error")
                except:
                    pass
            raise TradeeonError(
                f"Failed to start bot executor: {str(start_error)}",
                "INTERNAL_SERVER_ERROR",
                status_code=500,
                details={"bot_id": bot_id, "error_type": type(start_error).__name__}
            )
        
        if not started:
            # If bot failed to start, update run status
            if run_id and db_service and db_service.enabled:
                try:
                    db_service.update_bot_run(run_id, status="error")
                except:
                    pass
            # Get more details about why it failed
            error_msg = "Failed to start bot. Check backend logs for details."
            if bot_execution_service:
                # Check if DCABotExecutor is available
                if not hasattr(bot_execution_service, 'DCABotExecutor') or bot_execution_service.DCABotExecutor is None:
                    error_msg = "DCABotExecutor is not available. Check bot module imports."
            raise TradeeonError(
                error_msg,
                "INTERNAL_SERVER_ERROR",
                status_code=500,
                details={"bot_id": bot_id, "user_id": user.user_id}
            )
        
        # Update bot status to running
        db_service.update_bot_status(bot_id, "running")
        
        # Log bot start event
        try:
            db_service.log_event(
                bot_id=bot_id,
                run_id=run_id,
                user_id=user.user_id,
                event_type="bot_started",
                event_category="system",
                message=f"Bot '{bot_data.get('name', bot_id)}' started in paper trading mode",
                symbol=bot_data.get("symbol"),
                details={
                    "trading_mode": "paper",
                    "run_id": str(run_id) if run_id else None,
                    "start_config": start_config or {},
                }
            )
        except Exception as log_error:
            logger.warning(f"Failed to log bot start event: {log_error}")
        
        logger.info(f"✅ DCA bot {bot_id} started in paper trading mode with run_id {run_id}")
        
        return {
            "success": True,
            "message": "Bot started successfully in paper trading mode",
            "bot_id": bot_id,
            "run_id": run_id,
            "status": "running",
            "mode": "paper"
        }
        
    except NotFoundError:
        raise
    except TradeeonError:
        raise
    except Exception as e:
        error_type = type(e).__name__
        error_message = str(e)
        logger.error(f"❌ Error starting DCA bot in paper mode: {error_type}: {error_message}", exc_info=True)
        logger.error(f"   Bot ID: {bot_id}")
        logger.error(f"   User ID: {user.user_id}")
        logger.error(f"   Error details: {repr(e)}")
        
        # Include more details in error message for debugging
        detailed_message = f"Failed to start bot: {error_message}"
        logger.error(f"   DB service enabled: {db_service.enabled if db_service else 'N/A'}")
        logger.error(f"   Bot execution service available: {bot_execution_service is not None if bot_execution_service else False}")
        
        raise TradeeonError(
            detailed_message,
            "INTERNAL_SERVER_ERROR",
            status_code=500,
            details={
                "error_type": error_type,
                "error_message": error_message,
                "bot_id": bot_id
            }
        )


@router.post("/dca-bots/{bot_id}/start")
async def start_dca_bot_live(
    bot_id: str = Path(..., description="Bot ID"),
    start_config: Optional[Dict[str, Any]] = Body(default=None, description="Start configuration"),
    user: AuthedUser = Depends(get_current_user),
    services: tuple = Depends(get_bot_services)
):
    """Start a DCA bot in live trading mode with real money."""
    try:
        bot_execution_service, db_service = services
        
        bot_data = db_service.get_bot(bot_id, user_id=user.user_id)
        if not bot_data:
            raise NotFoundError("Bot", f"Bot {bot_id} not found or access denied")
        
        current_status = bot_data.get("status", "inactive")
        
        # Validate that bot can be started (must be inactive or stopped)
        if current_status not in ["inactive", "stopped"]:
            if current_status == "running":
                return {
                    "success": True,
                    "message": "Bot is already running",
                    "bot_id": bot_id,
                    "status": "running"
                }
            elif current_status == "paused":
                raise TradeeonError(
                    "Bot is paused. Please resume it instead of starting it.",
                    "INVALID_STATUS_TRANSITION",
                    status_code=400
                )
            else:
                raise TradeeonError(
                    f"Cannot start bot with status: {current_status}. Bot must be inactive or stopped.",
                    "INVALID_STATUS_TRANSITION",
                    status_code=400
                )
        
        if bot_execution_service.is_running(bot_id):
            # Bot is running in memory but status might be out of sync
            logger.warning(f"Bot {bot_id} is running in memory but status is {current_status}. Updating status to running.")
            db_service.update_bot_status(bot_id, "running")
            return {
                "success": True,
                "message": "Bot is already running",
                "bot_id": bot_id,
                "status": "running"
            }
        
        # Verify user has active Binance connection
        from apps.api.clients.supabase_client import supabase
        if not supabase:
            raise TradeeonError(
                "Database service not available. Cannot verify Binance connection.",
                "SERVICE_UNAVAILABLE",
                status_code=503
            )
        
        connection_result = supabase.table("exchange_keys").select("*").eq(
            "user_id", user.user_id
        ).eq("exchange", "binance").eq("is_active", True).execute()
        
        if not connection_result.data:
            raise TradeeonError(
                "No active Binance connection found. Please connect your Binance account before starting live trading.",
                "BINANCE_CONNECTION_REQUIRED",
                status_code=400
            )
        
        bot_config = bot_data.get("config", {})
        bot_config["user_id"] = user.user_id
        
        # Handle optional start_config
        if start_config is None:
            start_config = {}
        
        # For live mode, initial_balance is not used (uses exchange balance)
        initial_balance = start_config.get("initial_balance", 0.0)  # Not used in live mode
        interval_seconds = start_config.get("interval_seconds", 60)
        
        # Create bot run record FIRST (before starting bot so we can pass run_id)
        try:
            run_id = db_service.create_bot_run(bot_id=bot_id, user_id=user.user_id, status="running")
            if not run_id:
                logger.warning(f"Failed to create bot run record, continuing without run_id")
        except Exception as run_error:
            logger.error(f"Error creating bot run record: {run_error}", exc_info=True)
            run_id = None  # Continue without run_id
        
        # Start bot with run_id in live mode
        try:
            started = await bot_execution_service.start_bot(
                bot_id=bot_id,
                bot_config=bot_config,
                mode="live",
                initial_balance=initial_balance,
                interval_seconds=interval_seconds,
                run_id=run_id  # Pass run_id to executor
            )
        except RuntimeError as start_error:
            # RuntimeError from bot_execution_service.start_bot with detailed message
            logger.error(f"Error starting bot executor: {start_error}", exc_info=True)
            # If bot failed to start, update run status
            if run_id and db_service and db_service.enabled:
                try:
                    db_service.update_bot_run(run_id, status="error")
                except:
                    pass
            raise TradeeonError(
                str(start_error),
                "INTERNAL_SERVER_ERROR",
                status_code=500,
                details={"bot_id": bot_id, "error_type": type(start_error).__name__}
            )
        except Exception as start_error:
            logger.error(f"Unexpected error starting bot executor: {start_error}", exc_info=True)
            # If bot failed to start, update run status
            if run_id and db_service and db_service.enabled:
                try:
                    db_service.update_bot_run(run_id, status="error")
                except:
                    pass
            raise TradeeonError(
                f"Failed to start bot executor: {str(start_error)}",
                "INTERNAL_SERVER_ERROR",
                status_code=500,
                details={"bot_id": bot_id, "error_type": type(start_error).__name__}
            )
        
        if not started:
            # If bot failed to start, update run status
            if run_id and db_service and db_service.enabled:
                try:
                    db_service.update_bot_run(run_id, status="error")
                except:
                    pass
            # Get more details about why it failed
            error_msg = "Failed to start bot. Check backend logs for details."
            if bot_execution_service:
                # Check if DCABotExecutor is available
                if not hasattr(bot_execution_service, 'DCABotExecutor') or bot_execution_service.DCABotExecutor is None:
                    error_msg = "DCABotExecutor is not available. Check bot module imports."
            raise TradeeonError(
                error_msg,
                "INTERNAL_SERVER_ERROR",
                status_code=500,
                details={"bot_id": bot_id, "user_id": user.user_id}
            )
        
        # Update bot status to running
        db_service.update_bot_status(bot_id, "running")
        
        # Log bot start event
        try:
            db_service.log_event(
                bot_id=bot_id,
                run_id=run_id,
                user_id=user.user_id,
                event_type="bot_started",
                event_category="system",
                message=f"Bot '{bot_data.get('name', bot_id)}' started in live trading mode",
                symbol=bot_data.get("symbol"),
                details={
                    "trading_mode": "live",
                    "run_id": str(run_id) if run_id else None,
                    "start_config": start_config or {},
                }
            )
        except Exception as log_error:
            logger.warning(f"Failed to log bot start event: {log_error}")
        
        logger.info(f"✅ DCA bot {bot_id} started in LIVE trading mode with run_id {run_id}")
        
        return {
            "success": True,
            "message": "Bot started successfully in live trading mode",
            "bot_id": bot_id,
            "run_id": run_id,
            "status": "running",
            "mode": "live"
        }
        
    except NotFoundError:
        raise
    except TradeeonError:
        raise
    except Exception as e:
        error_type = type(e).__name__
        error_message = str(e)
        logger.error(f"❌ Error starting DCA bot in live mode: {error_type}: {error_message}", exc_info=True)
        logger.error(f"   Bot ID: {bot_id}")
        logger.error(f"   User ID: {user.user_id}")
        logger.error(f"   Error details: {repr(e)}")
        
        # Include more details in error message for debugging
        detailed_message = f"Failed to start bot: {error_message}"
        logger.error(f"   DB service enabled: {db_service.enabled if db_service else 'N/A'}")
        logger.error(f"   Bot execution service available: {bot_execution_service is not None if bot_execution_service else False}")
        
        raise TradeeonError(
            detailed_message,
            "INTERNAL_SERVER_ERROR",
            status_code=500,
            details={
                "error_type": error_type,
                "error_message": error_message,
                "bot_id": bot_id
            }
        )


@router.get("/dca-bots/{bot_id}/status")
async def get_bot_status(
    bot_id: str = Path(..., description="Bot ID"),
    user: AuthedUser = Depends(get_current_user),
    services: tuple = Depends(get_bot_services)
):
    """Get comprehensive status information for a bot."""
    try:
        bot_execution_service, db_service = services
        
        # Verify bot belongs to user
        bot_data = db_service.get_bot(bot_id, user_id=user.user_id)
        if not bot_data:
            raise NotFoundError("Bot", f"Bot {bot_id} not found or access denied")
        
        # Get database status
        db_status = bot_data.get("status", "inactive")
        created_at = bot_data.get("created_at")
        updated_at = bot_data.get("updated_at")
        
        # Get in-memory status
        is_running_in_memory = bot_execution_service.is_running(bot_id)
        memory_status = None
        if is_running_in_memory:
            memory_status = await bot_execution_service.get_bot_status_info(bot_id)
        
        # Get latest run info
        latest_run = None
        if db_service.enabled and db_service.supabase:
            try:
                runs_result = db_service.supabase.table("bot_runs").select("*").eq("bot_id", bot_id).eq("user_id", user.user_id).order("started_at", desc=True).limit(1).execute()
                if runs_result.data and len(runs_result.data) > 0:
                    latest_run = runs_result.data[0]
            except Exception as e:
                logger.warning(f"Failed to get latest run: {e}")
        
        # Get recent activity (last 5 events)
        recent_events = []
        if db_service.enabled and db_service.supabase:
            try:
                events_result = db_service.supabase.table("bot_events").select("*").eq("bot_id", bot_id).eq("user_id", user.user_id).order("created_at", desc=True).limit(5).execute()
                if events_result.data:
                    recent_events = events_result.data
            except Exception as e:
                logger.warning(f"Failed to get recent events: {e}")
        
        # Determine overall status
        overall_status = "unknown"
        status_details = []
        
        if is_running_in_memory and memory_status:
            if memory_status.get("paused"):
                overall_status = "paused"
                status_details.append("Bot is paused")
            elif memory_status.get("is_healthy", True):
                overall_status = "running"
                status_details.append("Bot is actively running")
            else:
                overall_status = "running_unhealthy"
                status_details.append("Bot is running but may be stuck")
        elif db_status == "running":
            overall_status = "database_running_not_in_memory"
            status_details.append("Database shows running but bot not in memory (may have crashed)")
        else:
            overall_status = db_status
            status_details.append(f"Bot status: {db_status}")
        
        # Build response
        response = {
            "success": True,
            "bot_id": bot_id,
            "overall_status": overall_status,
            "status_details": status_details,
            "database": {
                "status": db_status,
                "created_at": created_at,
                "updated_at": updated_at
            },
            "memory": {
                "running_in_memory": is_running_in_memory,
                "status": memory_status
            },
            "latest_run": latest_run,
            "recent_activity": {
                "events_count": len(recent_events),
                "events": recent_events
            }
        }
        
        return response
        
    except NotFoundError:
        raise
    except Exception as e:
        logger.error(f"Error getting bot status: {e}", exc_info=True)
        raise TradeeonError(f"Failed to get bot status: {str(e)}", "INTERNAL_SERVER_ERROR", status_code=500)


@router.get("/dca-bots/{bot_id}/logs")
async def get_bot_logs(
    bot_id: str = Path(..., description="Bot ID"),
    run_id: Optional[str] = Query(None, description="Filter by run ID"),
    event_type: Optional[str] = Query(None, description="Filter by event type"),
    event_category: Optional[str] = Query(None, description="Filter by event category"),
    limit: int = Query(100, ge=1, le=1000, description="Number of events to retrieve"),
    offset: int = Query(0, ge=0, description="Offset for pagination"),
    user: AuthedUser = Depends(get_current_user),
    services: tuple = Depends(get_bot_services)
):
    """Get bot events/logs."""
    try:
        bot_execution_service, db_service = services
        
        # Verify bot belongs to user
        bot_data = db_service.get_bot(bot_id, user_id=user.user_id)
        if not bot_data:
            raise NotFoundError("Bot", f"Bot {bot_id} not found or access denied")
        
        # Query events from database
        if not db_service.enabled or not db_service.supabase:
            logger.warning(f"Database service not available for bot logs query (bot_id={bot_id}, user_id={user.user_id})")
            return {
                "success": True,
                "logs": [],
                "total": 0,
                "limit": limit,
                "offset": offset,
                "has_more": False,
                "message": "Database service not available"
            }
        
        try:
            logger.debug(f"Querying bot events: bot_id={bot_id}, user_id={user.user_id}, event_type={event_type}, event_category={event_category}")
            # Build base query - using bot_events table
            base_query = db_service.supabase.table("bot_events").select("*").eq("bot_id", bot_id).eq("user_id", user.user_id)
            
            if run_id:
                base_query = base_query.eq("run_id", run_id)
            if event_type:
                base_query = base_query.eq("event_type", event_type)
            if event_category:
                base_query = base_query.eq("event_category", event_category)
            
            # Get total count (execute a separate count query)
            count_query = db_service.supabase.table("bot_events").select("event_id", count="exact").eq("bot_id", bot_id).eq("user_id", user.user_id)
            if run_id:
                count_query = count_query.eq("run_id", run_id)
            if event_type:
                count_query = count_query.eq("event_type", event_type)
            if event_category:
                count_query = count_query.eq("event_category", event_category)
            
            count_result = count_query.execute()
            total = count_result.count if count_result.count is not None else 0
            logger.debug(f"Bot events count query result: total={total}")
            
            # Get paginated results (rebuild query for data)
            data_query = base_query.order("created_at", desc=True).range(offset, offset + limit - 1)
            result = data_query.execute()
            
            events = result.data if result.data else []
            logger.debug(f"Bot events data query result: found {len(events)} events")
            
            # Transform events to match frontend BotLog interface
            logs = []
            for event in events:
                log = {
                    "event_id": event.get("event_id"),
                    "bot_id": event.get("bot_id"),
                    "run_id": event.get("run_id"),
                    "user_id": event.get("user_id"),
                    "event_type": event.get("event_type"),
                    "event_category": event.get("event_category"),
                    "symbol": event.get("symbol"),
                    "message": event.get("message"),
                    "details": event.get("details", {}),
                    "created_at": event.get("created_at")
                }
                logs.append(log)
            
            return {
                "success": True,
                "logs": logs,
                "total": total,
                "limit": limit,
                "offset": offset,
                "has_more": (offset + limit) < total
            }
        except Exception as e:
            logger.error(f"Error fetching bot events: {e}", exc_info=True)
            logger.error(f"   bot_id={bot_id}, user_id={user.user_id}, event_type={event_type}, event_category={event_category}")
            raise TradeeonError(f"Failed to fetch bot events: {str(e)}", "DATABASE_ERROR", status_code=500)
            
    except NotFoundError:
        raise
    except TradeeonError:
        raise
    except Exception as e:
        logger.error(f"Error getting bot events: {e}", exc_info=True)
        raise TradeeonError(f"Failed to get bot events: {str(e)}", "INTERNAL_SERVER_ERROR", status_code=500)


@router.get("/dca-bots/{bot_id}/orders")
async def get_bot_orders(
    bot_id: str = Path(..., description="Bot ID"),
    run_id: Optional[str] = Query(None, description="Filter by run ID"),
    side: Optional[str] = Query(None, description="Filter by side (buy/sell)"),
    limit: int = Query(100, ge=1, le=1000, description="Number of orders to retrieve"),
    offset: int = Query(0, ge=0, description="Offset for pagination"),
    user: AuthedUser = Depends(get_current_user),
    services: tuple = Depends(get_bot_services)
):
    """Get bot order history."""
    try:
        bot_execution_service, db_service = services
        
        # Verify bot belongs to user
        bot_data = db_service.get_bot(bot_id, user_id=user.user_id)
        if not bot_data:
            raise NotFoundError("Bot", f"Bot {bot_id} not found or access denied")
        
        # Query orders from database
        if not db_service.enabled or not db_service.supabase:
            return {
                "success": True,
                "orders": [],
                "total": 0,
                "message": "Database service not available"
            }
        
        try:
            query = db_service.supabase.table("order_logs").select("*").eq("bot_id", bot_id).eq("user_id", user.user_id)
            
            if run_id:
                query = query.eq("run_id", run_id)
            if side:
                query = query.eq("side", side)
            
            # Get total count
            count_result = query.execute()
            total = len(count_result.data) if count_result.data else 0
            
            # Get paginated results
            query = query.order("created_at", desc=True).range(offset, offset + limit - 1)
            result = query.execute()
            
            orders = result.data if result.data else []
            
            return {
                "success": True,
                "orders": orders,
                "total": total,
                "limit": limit,
                "offset": offset
            }
        except Exception as e:
            logger.error(f"Error fetching bot orders: {e}", exc_info=True)
            raise TradeeonError(f"Failed to fetch bot orders: {str(e)}", "DATABASE_ERROR", status_code=500)
            
    except NotFoundError:
        raise
    except TradeeonError:
        raise
    except Exception as e:
        logger.error(f"Error getting bot orders: {e}", exc_info=True)
        raise TradeeonError(f"Failed to get bot orders: {str(e)}", "INTERNAL_SERVER_ERROR", status_code=500)


@router.get("/dca-bots/{bot_id}/timeline")
async def get_bot_timeline(
    bot_id: str = Path(..., description="Bot ID"),
    run_id: Optional[str] = Query(None, description="Filter by run ID"),
    limit: int = Query(200, ge=1, le=1000, description="Number of events to retrieve"),
    user: AuthedUser = Depends(get_current_user),
    services: tuple = Depends(get_bot_services)
):
    """Get chronological timeline of bot events and orders."""
    try:
        bot_execution_service, db_service = services
        
        # Verify bot belongs to user
        bot_data = db_service.get_bot(bot_id, user_id=user.user_id)
        if not bot_data:
            raise NotFoundError("Bot", f"Bot {bot_id} not found or access denied")
        
        if not db_service.enabled or not db_service.supabase:
            return {
                "success": True,
                "timeline": [],
                "message": "Database service not available"
            }
        
        try:
            timeline = []
            
            # Get events
            events_query = db_service.supabase.table("bot_events").select("*").eq("bot_id", bot_id).eq("user_id", user.user_id)
            if run_id:
                events_query = events_query.eq("run_id", run_id)
            events_result = events_query.order("created_at", desc=True).limit(limit).execute()
            
            if events_result.data:
                for event in events_result.data:
                    timeline.append({
                        "type": "event",
                        "timestamp": event.get("created_at"),
                        "data": event
                    })
            
            # Get orders
            orders_query = db_service.supabase.table("order_logs").select("*").eq("bot_id", bot_id).eq("user_id", user.user_id)
            if run_id:
                orders_query = orders_query.eq("run_id", run_id)
            orders_result = orders_query.order("created_at", desc=True).limit(limit).execute()
            
            if orders_result.data:
                for order in orders_result.data:
                    timeline.append({
                        "type": "order",
                        "timestamp": order.get("created_at"),
                        "data": order
                    })
            
            # Sort by timestamp (newest first)
            timeline.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
            
            # Limit to requested number
            timeline = timeline[:limit]
            
            return {
                "success": True,
                "timeline": timeline,
                "total": len(timeline)
            }
        except Exception as e:
            logger.error(f"Error fetching bot timeline: {e}", exc_info=True)
            raise TradeeonError(f"Failed to fetch bot timeline: {str(e)}", "DATABASE_ERROR", status_code=500)
            
    except NotFoundError:
        raise
    except TradeeonError:
        raise
    except Exception as e:
        logger.error(f"Error getting bot timeline: {e}", exc_info=True)
        raise TradeeonError(f"Failed to get bot timeline: {str(e)}", "INTERNAL_SERVER_ERROR", status_code=500)


@router.post("/dca-bots/{bot_id}/stop")
async def stop_dca_bot(
    bot_id: str = Path(..., description="Bot ID"),
    user: AuthedUser = Depends(get_current_user),
    services: tuple = Depends(get_bot_services)
):
    """Stop a running DCA bot."""
    try:
        bot_execution_service, db_service = services
        
        bot_data = db_service.get_bot(bot_id, user_id=user.user_id)
        if not bot_data:
            raise NotFoundError("Bot", f"Bot {bot_id} not found or access denied")
        
        current_status = bot_data.get("status", "inactive")
        
        # Validate that bot can be stopped (must be running or paused)
        if current_status not in ["running", "paused"]:
            if current_status in ["inactive", "stopped"]:
                return {
                    "success": True,
                    "message": "Bot is already stopped",
                    "bot_id": bot_id,
                    "status": "stopped"
                }
            else:
                raise TradeeonError(
                    f"Cannot stop bot with status: {current_status}. Bot must be running or paused.",
                    "INVALID_STATUS_TRANSITION",
                    status_code=400
                )
        
        # Stop the bot execution service
        stopped = await bot_execution_service.stop_bot(bot_id)
        
        # Update bot status to stopped
        db_service.update_bot_status(bot_id, "stopped")
        
        # Update all active bot runs to stopped
        try:
            active_runs = db_service.supabase.table("bot_runs").select("*").eq("bot_id", bot_id).eq("status", "running").execute()
            if active_runs.data:
                for run in active_runs.data:
                    db_service.update_bot_run(run["run_id"], status="stopped")
        except Exception as run_error:
            logger.warning(f"Failed to update bot run status: {run_error}")
        
        # Log bot stop event
        try:
            db_service.log_event(
                bot_id=bot_id,
                run_id=None,
                user_id=user.user_id,
                event_type="bot_stopped",
                event_category="system",
                message=f"Bot '{bot_data.get('name', bot_id)}' stopped",
                symbol=bot_data.get("symbol"),
                details={}
            )
        except Exception as log_error:
            logger.warning(f"Failed to log bot stop event: {log_error}")
        
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
        raise TradeeonError(f"Failed to stop bot: {str(e)}", "INTERNAL_SERVER_ERROR", status_code=500)


@router.post("/dca-bots/{bot_id}/pause")
async def pause_dca_bot(
    bot_id: str = Path(..., description="Bot ID"),
    user: AuthedUser = Depends(get_current_user),
    services: tuple = Depends(get_bot_services)
):
    """Pause a running DCA bot."""
    try:
        bot_execution_service, db_service = services
        
        bot_data = db_service.get_bot(bot_id, user_id=user.user_id)
        if not bot_data:
            raise NotFoundError("Bot", f"Bot {bot_id} not found or access denied")
        
        current_status = bot_data.get("status", "inactive")
        
        # Validate that bot can be paused (must be running)
        if current_status != "running":
            if current_status == "paused":
                return {
                    "success": True,
                    "message": "Bot is already paused",
                    "bot_id": bot_id,
                    "status": "paused"
                }
            else:
                raise TradeeonError(
                    f"Cannot pause bot with status: {current_status}. Bot must be running.",
                    "INVALID_STATUS_TRANSITION",
                    status_code=400
                )
        
        paused = await bot_execution_service.pause_bot(bot_id)
        
        if not paused:
            raise TradeeonError(
                "Bot is not running. Cannot pause.",
                "INVALID_STATUS_TRANSITION",
                status_code=400
            )
        
        # Update bot status to paused
        db_service.update_bot_status(bot_id, "paused")
        
        # Log bot pause event
        try:
            db_service.log_event(
                bot_id=bot_id,
                run_id=None,
                user_id=user.user_id,
                event_type="bot_paused",
                event_category="system",
                message=f"Bot '{bot_data.get('name', bot_id)}' paused",
                symbol=bot_data.get("symbol"),
                details={}
            )
        except Exception as log_error:
            logger.warning(f"Failed to log bot pause event: {log_error}")
        
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
        raise TradeeonError(f"Failed to pause bot: {str(e)}", "INTERNAL_SERVER_ERROR", status_code=500)


@router.post("/dca-bots/{bot_id}/resume")
async def resume_dca_bot(
    bot_id: str = Path(..., description="Bot ID"),
    user: AuthedUser = Depends(get_current_user),
    services: tuple = Depends(get_bot_services)
):
    """Resume a paused DCA bot."""
    try:
        bot_execution_service, db_service = services
        
        bot_data = db_service.get_bot(bot_id, user_id=user.user_id)
        if not bot_data:
            raise NotFoundError("Bot", f"Bot {bot_id} not found or access denied")
        
        current_status = bot_data.get("status", "inactive")
        
        # Validate that bot can be resumed (must be paused)
        if current_status != "paused":
            if current_status == "running":
                return {
                    "success": True,
                    "message": "Bot is already running",
                    "bot_id": bot_id,
                    "status": "running"
                }
            else:
                raise TradeeonError(
                    f"Cannot resume bot with status: {current_status}. Bot must be paused.",
                    "INVALID_STATUS_TRANSITION",
                    status_code=400
                )
        
        resumed = await bot_execution_service.resume_bot(bot_id)
        
        if not resumed:
            raise TradeeonError(
                "Bot is not paused. Cannot resume.",
                "INVALID_STATUS_TRANSITION",
                status_code=400
            )
        
        # Update bot status to running
        db_service.update_bot_status(bot_id, "running")
        
        # Log bot resume event
        try:
            db_service.log_event(
                bot_id=bot_id,
                run_id=None,
                user_id=user.user_id,
                event_type="bot_resumed",
                event_category="system",
                message=f"Bot '{bot_data.get('name', bot_id)}' resumed",
                symbol=bot_data.get("symbol"),
                details={}
            )
        except Exception as log_error:
            logger.warning(f"Failed to log bot resume event: {log_error}")
        
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
        raise TradeeonError(f"Failed to resume bot: {str(e)}", "INTERNAL_SERVER_ERROR", status_code=500)


@router.delete("/dca-bots/{bot_id}")
async def delete_dca_bot(
    bot_id: str = Path(..., description="Bot ID"),
    user: AuthedUser = Depends(get_current_user),
    services: tuple = Depends(get_bot_services)
):
    """Delete a DCA bot."""
    try:
        bot_execution_service, db_service = services
        
        bot_data = db_service.get_bot(bot_id, user_id=user.user_id)
        if not bot_data:
            raise NotFoundError("Bot", f"Bot {bot_id} not found or access denied")
        
        current_status = bot_data.get("status", "inactive")
        
        # If bot is running or paused, stop it first
        if current_status in ["running", "paused"]:
            if bot_execution_service.is_running(bot_id):
                logger.info(f"Stopping bot {bot_id} before deletion (status: {current_status})")
                try:
                    await bot_execution_service.stop_bot(bot_id)
                except Exception as stop_error:
                    logger.warning(f"Error stopping bot before deletion: {stop_error}")
            # Update status to stopped before deletion
            try:
                db_service.update_bot_status(bot_id, "stopped")
            except Exception as status_error:
                logger.warning(f"Error updating bot status before deletion: {status_error}")
        
        # Log bot deletion event BEFORE deletion (so we can reference bot name)
        bot_name = bot_data.get("name", bot_id)
        bot_symbol = bot_data.get("symbol")
        try:
            db_service.log_event(
                bot_id=bot_id,
                run_id=None,
                user_id=user.user_id,
                event_type="bot_deleted",
                event_category="system",
                message=f"Bot '{bot_name}' deleted",
                symbol=bot_symbol,
                details={}
            )
        except Exception as log_error:
            logger.warning(f"Failed to log bot deletion event: {log_error}")
        
        # Delete the bot
        logger.info(f"Attempting to delete bot {bot_id} for user {user.user_id}")
        deleted = db_service.delete_bot(bot_id, user_id=user.user_id)
        
        if not deleted:
            logger.error(f"❌ Failed to delete bot {bot_id}. delete_bot returned False")
            # Check if bot still exists
            check_bot = db_service.get_bot(bot_id, user_id=user.user_id)
            if check_bot:
                logger.error(f"   Bot still exists in database after delete attempt")
                raise TradeeonError(
                    "Failed to delete bot. Bot still exists in database.",
                    "INTERNAL_SERVER_ERROR",
                    status_code=500
                )
            else:
                logger.warning(f"   Bot not found in database (may have been already deleted)")
                # Return success if bot doesn't exist (idempotent delete)
                return {
                    "success": True,
                    "message": "Bot not found (may have been already deleted)",
                    "bot_id": bot_id
                }
        
        logger.info(f"✅ DCA bot {bot_id} deleted successfully")
        
        return {
            "success": True,
            "message": "Bot deleted successfully",
            "bot_id": bot_id
        }
        
    except NotFoundError:
        raise
    except Exception as e:
        logger.error(f"Error deleting DCA bot: {e}", exc_info=True)
        raise TradeeonError(f"Failed to delete bot: {str(e)}", "INTERNAL_SERVER_ERROR", status_code=500)
