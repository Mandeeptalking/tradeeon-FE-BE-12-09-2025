"""Bot management API routes."""

from fastapi import APIRouter, HTTPException, Query, Path, Body, Depends
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


@router.get("/")
async def list_bots(
    status: Optional[BotStatus] = Query(None, description="Filter by status (optional)"),
    user: AuthedUser = Depends(get_current_user)
):
    """
    List user's bots from database.
    
    Requires authentication via Authorization header.
    User ID is extracted from JWT token automatically.
    """
    try:
        # Get user_id from authenticated user (extracted from JWT token)
        user_id = user.user_id
        logger.debug(f"Listing bots for user_id: {user_id}, status filter: {status}")
        
        bots_path = os.path.join(os.path.dirname(__file__), '..', '..', 'bots')
        if bots_path not in sys.path:
            sys.path.insert(0, bots_path)
        
        bots = []
        try:
            from db_service import db_service
            
            # Check if database service is enabled
            if not db_service.enabled:
                logger.error("Database service is not enabled! Cannot fetch bots.")
                logger.error(f"   Supabase client status: {db_service.supabase is not None if hasattr(db_service, 'supabase') else 'N/A'}")
                raise TradeeonError(
                    "Database service is not configured",
                    "SERVICE_UNAVAILABLE",
                    status_code=503
                )
            
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
                
        except TradeeonError:
            # Re-raise TradeeonError
            raise
        except Exception as db_error:
            logger.error(f"❌ Failed to fetch bots from database: {db_error}", exc_info=True)
            logger.error(f"   Error type: {type(db_error).__name__}")
            logger.error(f"   Error message: {str(db_error)}")
            
            # Log additional context
            logger.error(f"   Context:")
            logger.error(f"     - user_id: {user_id}")
            logger.error(f"     - status filter: {status_filter if 'status_filter' in locals() else 'N/A'}")
            
            # Don't return empty list on error - let the error propagate
            raise TradeeonError(
                f"Failed to fetch bots from database: {str(db_error)}",
                "DATABASE_ERROR",
                status_code=500
            )
        
        # Prepare response
        response = {
            "success": True,
            "bots": bots,
            "count": len(bots)
        }
        
        # Add diagnostic metadata in development mode
        # Note: os is already imported at module level
        if os.getenv("ENVIRONMENT", "").lower() != "production":
            response["_debug"] = {
                "user_id": user_id,
                "user_id_type": type(user_id).__name__,
                "status_filter": status.value if status else None,
                "query_executed": True,
                "result_count": len(bots),
                "database_service_enabled": db_service.enabled if 'db_service' in locals() else False
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
    user: AuthedUser = Depends(get_current_user)
):
    """Create a new DCA bot."""
    try:
        import time
        import sys
        # os is already imported at module level
        
        # Add bots directory to path
        bots_path = os.path.join(os.path.dirname(__file__), '..', '..', 'bots')
        if bots_path not in sys.path:
            sys.path.insert(0, bots_path)
        
        from db_service import db_service
        
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
    user: AuthedUser = Depends(get_current_user)
):
    """Start a DCA bot in paper trading mode."""
    try:
        import sys
        # os is already imported at module level
        
        # Use absolute path resolution for better reliability in Docker/production
        current_file = os.path.abspath(__file__)
        routers_dir = os.path.dirname(current_file)
        api_dir = os.path.dirname(routers_dir)
        apps_dir = os.path.dirname(api_dir)
        bots_path = os.path.join(apps_dir, 'bots')
        bots_path = os.path.abspath(bots_path)
        
        if not os.path.exists(bots_path):
            logger.error(f"❌ Bots directory not found at: {bots_path}")
            logger.error(f"   Current file: {current_file}")
            logger.error(f"   Routers dir: {routers_dir}")
            logger.error(f"   API dir: {api_dir}")
            logger.error(f"   Apps dir: {apps_dir}")
            raise TradeeonError(
                f"Bots module not found. Expected at: {bots_path}",
                "INTERNAL_SERVER_ERROR",
                status_code=500
            )
        
        if bots_path not in sys.path:
            sys.path.insert(0, bots_path)
        
        try:
            from db_service import db_service
            from bot_execution_service import bot_execution_service
        except ImportError as import_error:
            logger.error(f"❌ Failed to import bot services: {import_error}")
            logger.error(f"   Bots path: {bots_path}")
            logger.error(f"   Python path: {sys.path[:5]}")
            raise TradeeonError(
                f"Failed to import bot services: {str(import_error)}",
                "INTERNAL_SERVER_ERROR",
                status_code=500
            )
        
        # Check if db_service is enabled
        if not db_service or not db_service.enabled:
            logger.error("❌ Database service is not enabled!")
            raise TradeeonError(
                "Database service is not available. Please check backend configuration.",
                "SERVICE_UNAVAILABLE",
                status_code=503
            )
        
        # Check if bot_execution_service is available
        if not bot_execution_service:
            logger.error("❌ Bot execution service is not available!")
            raise TradeeonError(
                "Bot execution service is not available. Please check backend configuration.",
                "SERVICE_UNAVAILABLE",
                status_code=503
            )
        
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
        except Exception as start_error:
            logger.error(f"Error starting bot executor: {start_error}", exc_info=True)
            # If bot failed to start, update run status
            if run_id and db_service and db_service.enabled:
                try:
                    db_service.update_bot_run(run_id, status="error")
                except:
                    pass
            raise TradeeonError(
                f"Failed to start bot executor: {str(start_error)}",
                "INTERNAL_SERVER_ERROR",
                status_code=500
            )
        
        if not started:
            # If bot failed to start, update run status
            if run_id and db_service and db_service.enabled:
                try:
                    db_service.update_bot_run(run_id, status="error")
                except:
                    pass
            raise TradeeonError("Failed to start bot", "INTERNAL_SERVER_ERROR", status_code=500)
        
        # Update bot status to running
        db_service.update_bot_status(bot_id, "running")
        
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
        logger.error(f"Error starting DCA bot in paper mode: {e}", exc_info=True)
        raise TradeeonError(f"Failed to start bot: {str(e)}", "INTERNAL_SERVER_ERROR", status_code=500)


@router.get("/dca-bots/{bot_id}/status")
async def get_bot_status(
    bot_id: str = Path(..., description="Bot ID"),
    user: AuthedUser = Depends(get_current_user)
):
    """Get comprehensive status information for a bot."""
    try:
        bots_path = os.path.join(os.path.dirname(__file__), '..', '..', 'bots')
        if bots_path not in sys.path:
            sys.path.insert(0, bots_path)
        
        from db_service import db_service
        from bot_execution_service import bot_execution_service
        
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


@router.get("/dca-bots/{bot_id}/events")
async def get_bot_events(
    bot_id: str = Path(..., description="Bot ID"),
    run_id: Optional[str] = Query(None, description="Filter by run ID"),
    event_type: Optional[str] = Query(None, description="Filter by event type"),
    limit: int = Query(100, ge=1, le=1000, description="Number of events to retrieve"),
    offset: int = Query(0, ge=0, description="Offset for pagination"),
    user: AuthedUser = Depends(get_current_user)
):
    """Get bot events/logs."""
    try:
        bots_path = os.path.join(os.path.dirname(__file__), '..', '..', 'bots')
        if bots_path not in sys.path:
            sys.path.insert(0, bots_path)
        
        from db_service import db_service
        
        # Verify bot belongs to user
        bot_data = db_service.get_bot(bot_id, user_id=user.user_id)
        if not bot_data:
            raise NotFoundError("Bot", f"Bot {bot_id} not found or access denied")
        
        # Query events from database
        if not db_service.enabled or not db_service.supabase:
            return {
                "success": True,
                "events": [],
                "total": 0,
                "message": "Database service not available"
            }
        
        try:
            query = db_service.supabase.table("bot_events").select("*").eq("bot_id", bot_id).eq("user_id", user.user_id)
            
            if run_id:
                query = query.eq("run_id", run_id)
            if event_type:
                query = query.eq("event_type", event_type)
            
            # Get total count
            count_result = query.execute()
            total = len(count_result.data) if count_result.data else 0
            
            # Get paginated results
            query = query.order("created_at", desc=True).range(offset, offset + limit - 1)
            result = query.execute()
            
            events = result.data if result.data else []
            
            return {
                "success": True,
                "events": events,
                "total": total,
                "limit": limit,
                "offset": offset
            }
        except Exception as e:
            logger.error(f"Error fetching bot events: {e}", exc_info=True)
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
    user: AuthedUser = Depends(get_current_user)
):
    """Get bot order history."""
    try:
        bots_path = os.path.join(os.path.dirname(__file__), '..', '..', 'bots')
        if bots_path not in sys.path:
            sys.path.insert(0, bots_path)
        
        from db_service import db_service
        
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
    user: AuthedUser = Depends(get_current_user)
):
    """Get chronological timeline of bot events and orders."""
    try:
        bots_path = os.path.join(os.path.dirname(__file__), '..', '..', 'bots')
        if bots_path not in sys.path:
            sys.path.insert(0, bots_path)
        
        from db_service import db_service
        
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
    user: AuthedUser = Depends(get_current_user)
):
    """Stop a running DCA bot."""
    try:
        import sys
        # os is already imported at module level
        
        bots_path = os.path.join(os.path.dirname(__file__), '..', '..', 'bots')
        if bots_path not in sys.path:
            sys.path.insert(0, bots_path)
        
        from db_service import db_service
        from bot_execution_service import bot_execution_service
        
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
    user: AuthedUser = Depends(get_current_user)
):
    """Pause a running DCA bot."""
    try:
        import sys
        # os is already imported at module level
        
        bots_path = os.path.join(os.path.dirname(__file__), '..', '..', 'bots')
        if bots_path not in sys.path:
            sys.path.insert(0, bots_path)
        
        from db_service import db_service
        from bot_execution_service import bot_execution_service
        
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
    user: AuthedUser = Depends(get_current_user)
):
    """Resume a paused DCA bot."""
    try:
        import sys
        # os is already imported at module level
        
        bots_path = os.path.join(os.path.dirname(__file__), '..', '..', 'bots')
        if bots_path not in sys.path:
            sys.path.insert(0, bots_path)
        
        from db_service import db_service
        from bot_execution_service import bot_execution_service
        
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
    user: AuthedUser = Depends(get_current_user)
):
    """Delete a DCA bot."""
    try:
        import sys
        # os is already imported at module level
        
        # Use absolute path resolution for better reliability in Docker/production
        current_file = os.path.abspath(__file__)
        routers_dir = os.path.dirname(current_file)
        api_dir = os.path.dirname(routers_dir)
        apps_dir = os.path.dirname(api_dir)
        bots_path = os.path.join(apps_dir, 'bots')
        bots_path = os.path.abspath(bots_path)
        
        if not os.path.exists(bots_path):
            logger.error(f"❌ Bots directory not found at: {bots_path}")
            raise TradeeonError(
                f"Bots module not found. Expected at: {bots_path}",
                "INTERNAL_SERVER_ERROR",
                status_code=500
            )
        
        if bots_path not in sys.path:
            sys.path.insert(0, bots_path)
        
        try:
            from db_service import db_service
            from bot_execution_service import bot_execution_service
        except ImportError as import_error:
            logger.error(f"❌ Failed to import bot services: {import_error}")
            logger.error(f"   Bots path: {bots_path}")
            raise TradeeonError(
                f"Failed to import bot services: {str(import_error)}",
                "INTERNAL_SERVER_ERROR",
                status_code=500
            )
        
        # Check if db_service is enabled
        if not db_service or not db_service.enabled:
            logger.error("❌ Database service is not enabled!")
            raise TradeeonError(
                "Database service is not available. Please check backend configuration.",
                "SERVICE_UNAVAILABLE",
                status_code=503
            )
        
        # Check if bot_execution_service is available
        if not bot_execution_service:
            logger.error("❌ Bot execution service is not available!")
            raise TradeeonError(
                "Bot execution service is not available. Please check backend configuration.",
                "SERVICE_UNAVAILABLE",
                status_code=503
            )
        
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
