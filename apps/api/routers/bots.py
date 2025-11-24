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
        import os
        
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
    start_config: Dict[str, Any] = Body(default={}, description="Start configuration"),
    user: AuthedUser = Depends(get_current_user)
):
    """Start a DCA bot in paper trading mode."""
    try:
        import sys
        import os
        
        bots_path = os.path.join(os.path.dirname(__file__), '..', '..', 'bots')
        if bots_path not in sys.path:
            sys.path.insert(0, bots_path)
        
        from db_service import db_service
        from bot_execution_service import bot_execution_service
        
        bot_data = db_service.get_bot(bot_id, user_id=user.user_id)
        if not bot_data:
            raise NotFoundError("Bot", f"Bot {bot_id} not found or access denied")
        
        if bot_execution_service.is_running(bot_id):
            return {
                "success": True,
                "message": "Bot is already running",
                "bot_id": bot_id,
                "status": "running"
            }
        
        bot_config = bot_data.get("config", {})
        bot_config["user_id"] = user.user_id
        
        initial_balance = start_config.get("initial_balance", 10000.0)
        interval_seconds = start_config.get("interval_seconds", 60)
        
        started = await bot_execution_service.start_bot(
            bot_id=bot_id,
            bot_config=bot_config,
            mode="paper",
            initial_balance=initial_balance,
            interval_seconds=interval_seconds
        )
        
        if not started:
            raise TradeeonError("Failed to start bot", "INTERNAL_SERVER_ERROR", status_code=500)
        
        db_service.update_bot_status(bot_id, "running")
        run_id = db_service.create_bot_run(bot_id=bot_id, user_id=user.user_id, status="running")
        
        logger.info(f"✅ DCA bot {bot_id} started in paper trading mode")
        
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


@router.post("/dca-bots/{bot_id}/stop")
async def stop_dca_bot(
    bot_id: str = Path(..., description="Bot ID"),
    user: AuthedUser = Depends(get_current_user)
):
    """Stop a running DCA bot."""
    try:
        import sys
        import os
        
        bots_path = os.path.join(os.path.dirname(__file__), '..', '..', 'bots')
        if bots_path not in sys.path:
            sys.path.insert(0, bots_path)
        
        from db_service import db_service
        from bot_execution_service import bot_execution_service
        
        bot_data = db_service.get_bot(bot_id, user_id=user.user_id)
        if not bot_data:
            raise NotFoundError("Bot", f"Bot {bot_id} not found or access denied")
        
        stopped = await bot_execution_service.stop_bot(bot_id)
        db_service.update_bot_status(bot_id, "stopped")
        
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
        import os
        
        bots_path = os.path.join(os.path.dirname(__file__), '..', '..', 'bots')
        if bots_path not in sys.path:
            sys.path.insert(0, bots_path)
        
        from db_service import db_service
        from bot_execution_service import bot_execution_service
        
        bot_data = db_service.get_bot(bot_id, user_id=user.user_id)
        if not bot_data:
            raise NotFoundError("Bot", f"Bot {bot_id} not found or access denied")
        
        paused = await bot_execution_service.pause_bot(bot_id)
        db_service.update_bot_status(bot_id, "paused")
        
        if not paused:
            raise HTTPException(status_code=400, detail="Bot is not running. Cannot pause.")
        
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
        import os
        
        bots_path = os.path.join(os.path.dirname(__file__), '..', '..', 'bots')
        if bots_path not in sys.path:
            sys.path.insert(0, bots_path)
        
        from db_service import db_service
        from bot_execution_service import bot_execution_service
        
        bot_data = db_service.get_bot(bot_id, user_id=user.user_id)
        if not bot_data:
            raise NotFoundError("Bot", f"Bot {bot_id} not found or access denied")
        
        resumed = await bot_execution_service.resume_bot(bot_id)
        db_service.update_bot_status(bot_id, "running")
        
        if not resumed:
            raise HTTPException(status_code=400, detail="Bot is not paused. Cannot resume.")
        
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
        import os
        
        bots_path = os.path.join(os.path.dirname(__file__), '..', '..', 'bots')
        if bots_path not in sys.path:
            sys.path.insert(0, bots_path)
        
        from db_service import db_service
        from bot_execution_service import bot_execution_service
        
        bot_data = db_service.get_bot(bot_id, user_id=user.user_id)
        if not bot_data:
            raise NotFoundError("Bot", f"Bot {bot_id} not found or access denied")
        
        if bot_execution_service.is_running(bot_id):
            await bot_execution_service.stop_bot(bot_id)
        
        deleted = db_service.delete_bot(bot_id, user_id=user.user_id)
        
        if not deleted:
            raise TradeeonError("Failed to delete bot", "INTERNAL_SERVER_ERROR", status_code=500)
        
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
