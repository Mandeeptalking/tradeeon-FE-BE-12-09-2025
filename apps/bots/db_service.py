"""Database service for bot persistence."""

import logging
import sys
import os
from typing import Optional, Dict, Any, List
from datetime import datetime

# Add parent directory to path to import supabase_client
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'api'))
try:
    from clients.supabase_client import supabase
except ImportError:
    supabase = None

logger = logging.getLogger(__name__)


class BotDatabaseService:
    """Service for persisting bot data to Supabase database."""
    
    def __init__(self):
        self.supabase = supabase
        self.enabled = supabase is not None
        
        # Log initialization details
        logger.info(f"🔧 BotDatabaseService initialization:")
        logger.debug(f"   Supabase client available: {supabase is not None}")
        logger.debug(f"   Service enabled: {self.enabled}")
        
        if self.enabled:
            # Verify service role key is being used (bypasses RLS)
            import os
            service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
            if service_key:
                logger.info(f"✅ Using SUPABASE_SERVICE_ROLE_KEY (RLS bypass enabled)")
                logger.debug(f"   Service key length: {len(service_key)}")
                logger.debug(f"   Service key preview: {service_key[:20]}...{service_key[-10:]}")
            else:
                logger.warning(f"⚠️  SUPABASE_SERVICE_ROLE_KEY not found - RLS policies may block queries")
        
        if not self.enabled:
            import os
            env = os.getenv("ENVIRONMENT", "development")
            if env == "production":
                raise RuntimeError(
                    "Database service is required in production. "
                    "Please configure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables."
                )
            logger.warning("Supabase not configured, database operations disabled. Bot data will only be stored in memory.")
            logger.warning("   To enable: Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables")
    
    def create_bot(
        self, 
        bot_id: str,
        user_id: str,
        name: str,
        bot_type: str,
        symbol: str,
        interval: str,
        config: Dict[str, Any],
        required_capital: float,
        max_position_size: Optional[float] = None,
        risk_per_trade: Optional[float] = None
    ) -> bool:
        """Create a bot record in the database."""
        if not self.enabled:
            logger.debug(f"Database disabled, skipping bot creation for {bot_id}")
            return False
        
        try:
            # First, ensure user profile exists in public.users table
            # Check if user exists
            user_check = self.supabase.table("users").select("id").eq("id", user_id).execute()
            if not user_check.data:
                logger.warning(f"User {user_id} not found in users table, attempting to create profile...")
                try:
                    # Try to get user info from auth.users (requires service role)
                    # For now, create a minimal profile
                    from datetime import datetime
                    self.supabase.table("users").insert({
                        "id": user_id,
                        "email": f"{user_id}@tradeeon.local",  # Placeholder
                        "created_at": datetime.now().isoformat(),
                        "updated_at": datetime.now().isoformat()
                    }).execute()
                    logger.info(f"✅ Created user profile for {user_id}")
                except Exception as user_error:
                    logger.error(f"❌ Failed to create user profile: {user_error}")
                    # Continue anyway - might be a permissions issue
            
            # Insert bot
            result = self.supabase.table("bots").insert({
                "bot_id": bot_id,
                "user_id": user_id,
                "name": name,
                "bot_type": bot_type,
                "status": "inactive",
                "symbol": symbol,
                "interval": interval,
                "config": config,
                "required_capital": required_capital,
                "max_position_size": max_position_size,
                "risk_per_trade": risk_per_trade
            }).execute()
            
            if result.data:
                logger.info(f"✅ Bot {bot_id} saved to database successfully")
                logger.debug(f"Bot data: {result.data}")
                return True
            else:
                logger.error(f"❌ Bot insert returned no data: {result}")
                return False
        except Exception as e:
            logger.error(f"❌ Failed to save bot {bot_id} to database: {e}", exc_info=True)
            logger.error(f"   Error type: {type(e).__name__}")
            logger.error(f"   User ID: {user_id} (type: {type(user_id).__name__})")
            if hasattr(e, 'message'):
                logger.error(f"   Error message: {e.message}")
            if hasattr(e, 'details'):
                logger.error(f"   Error details: {e.details}")
            return False
    
    def update_bot_status(self, bot_id: str, status: str) -> bool:
        """Update bot status in database."""
        if not self.enabled:
            return False
        
        try:
            self.supabase.table("bots").update({
                "status": status,
                "updated_at": datetime.now().isoformat()
            }).eq("bot_id", bot_id).execute()
            
            logger.debug(f"Updated bot {bot_id} status to {status}")
            return True
        except Exception as e:
            logger.error(f"Failed to update bot status: {e}")
            return False
    
    def create_bot_run(
        self,
        bot_id: str,
        user_id: str,
        status: str = "running"
    ) -> Optional[str]:
        """Create a bot run record and return run_id."""
        if not self.enabled:
            return None
        
        try:
            result = self.supabase.table("bot_runs").insert({
                "bot_id": bot_id,
                "user_id": user_id,
                "status": status,
                "started_at": datetime.now().isoformat()
            }).execute()
            
            if result.data and len(result.data) > 0:
                run_id = result.data[0]["run_id"]
                logger.info(f"✅ Created bot run {run_id} for bot {bot_id}")
                return run_id
            return None
        except Exception as e:
            logger.error(f"❌ Failed to create bot run: {e}")
            return None
    
    def update_bot_run(
        self,
        run_id: str,
        status: Optional[str] = None,
        total_trades: Optional[int] = None,
        total_pnl: Optional[float] = None,
        max_drawdown: Optional[float] = None,
        meta: Optional[Dict[str, Any]] = None
    ) -> bool:
        """Update bot run statistics."""
        if not self.enabled:
            return False
        
        try:
            update_data = {}
            if status:
                update_data["status"] = status
                if status in ["completed", "stopped", "error"]:
                    update_data["ended_at"] = datetime.now().isoformat()
            if total_trades is not None:
                update_data["total_trades"] = total_trades
            if total_pnl is not None:
                update_data["total_pnl"] = total_pnl
            if max_drawdown is not None:
                update_data["max_drawdown"] = max_drawdown
            if meta:
                update_data["meta"] = meta
            
            if update_data:
                self.supabase.table("bot_runs").update(update_data).eq("run_id", run_id).execute()
            
            return True
        except Exception as e:
            logger.error(f"Failed to update bot run: {e}")
            return False
    
    def log_order(
        self,
        bot_id: str,
        run_id: Optional[str],
        user_id: str,
        symbol: str,
        side: str,
        qty: float,
        order_type: str,
        status: str,
        filled_qty: float,
        avg_price: float,
        exchange_order_id: Optional[str] = None,
        limit_price: Optional[float] = None,
        stop_price: Optional[float] = None,
        fees: Optional[float] = None
    ) -> bool:
        """Log an order to the database."""
        if not self.enabled:
            return False
        
        try:
            order_data = {
                "bot_id": bot_id,
                "user_id": user_id,
                "symbol": symbol,
                "side": side,
                "qty": qty,
                "order_type": order_type,
                "status": status,
                "filled_qty": filled_qty,
                "avg_price": avg_price
            }
            
            if run_id:
                order_data["run_id"] = run_id
            if exchange_order_id:
                order_data["exchange_order_id"] = exchange_order_id
            if limit_price:
                order_data["limit_price"] = limit_price
            if stop_price:
                order_data["stop_price"] = stop_price
            if fees is not None:
                order_data["fees"] = fees
            
            self.supabase.table("order_logs").insert(order_data).execute()
            logger.debug(f"Logged order: {side} {qty} {symbol} @ {avg_price}")
            return True
        except Exception as e:
            logger.error(f"Failed to log order: {e}")
            return False
    
    def upsert_position(
        self,
        user_id: str,
        symbol: str,
        qty: float,
        avg_price: float,
        current_price: Optional[float] = None,
        unrealized_pnl: Optional[float] = None,
        unrealized_pnl_percent: Optional[float] = None
    ) -> bool:
        """Create or update a position."""
        if not self.enabled:
            return False
        
        try:
            position_data = {
                "user_id": user_id,
                "symbol": symbol,
                "qty": qty,
                "avg_price": avg_price
            }
            
            if current_price:
                position_data["current_price"] = current_price
            if unrealized_pnl is not None:
                position_data["unrealized_pnl"] = unrealized_pnl
            if unrealized_pnl_percent is not None:
                position_data["unrealized_pnl_percent"] = unrealized_pnl_percent
            
            # Use upsert with on_conflict to handle unique constraint
            self.supabase.table("positions").upsert(
                position_data,
                on_conflict="user_id,symbol"
            ).execute()
            
            return True
        except Exception as e:
            logger.error(f"Failed to upsert position: {e}")
            return False
    
    def delete_position(self, user_id: str, symbol: str) -> bool:
        """Delete a position (when fully closed)."""
        if not self.enabled:
            return False
        
        try:
            self.supabase.table("positions").delete().eq("user_id", user_id).eq("symbol", symbol).execute()
            return True
        except Exception as e:
            logger.error(f"Failed to delete position: {e}")
            return False
    
    def upsert_funds(
        self,
        user_id: str,
        exchange: str,
        currency: str,
        free: float,
        locked: float = 0.0
    ) -> bool:
        """Create or update funds balance."""
        if not self.enabled:
            return False
        
        try:
            funds_data = {
                "user_id": user_id,
                "exchange": exchange,
                "currency": currency,
                "free": free,
                "locked": locked
            }
            
            self.supabase.table("funds").upsert(
                funds_data,
                on_conflict="user_id,exchange,currency"
            ).execute()
            
            return True
        except Exception as e:
            logger.error(f"Failed to upsert funds: {e}")
            return False
    
    def get_bot(self, bot_id: str, user_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """Get bot configuration from database."""
        if not self.enabled:
            return None
        
        try:
            query = self.supabase.table("bots").select("*").eq("bot_id", bot_id)
            if user_id:
                query = query.eq("user_id", user_id)
            
            result = query.single().execute()
            return result.data if result.data else None
        except Exception as e:
            logger.error(f"Failed to get bot: {e}")
            return None
    
    def list_bots(self, user_id: str, status: Optional[str] = None) -> list:
        """List all bots for a user."""
        if not self.enabled:
            logger.warning("Database service is disabled, cannot list bots")
            logger.warning(f"   Supabase client status: {self.supabase is not None}")
            return []
        
        try:
            # Comprehensive logging before query
            logger.info(f"🔍 Starting bot list query for user_id: {user_id}")
            logger.debug(f"   User ID type: {type(user_id).__name__}")
            logger.debug(f"   User ID value: {user_id}")
            logger.debug(f"   Status filter: {status}")
            logger.debug(f"   Supabase client available: {self.supabase is not None}")
            
            # Verify Supabase client
            if not self.supabase:
                logger.error("❌ Supabase client is None despite service being enabled!")
                return []
            
            # Build query with detailed logging
            logger.debug("Building Supabase query...")
            query = self.supabase.table("bots").select("*").eq("user_id", user_id)
            logger.debug(f"   Base query: table('bots').select('*').eq('user_id', '{user_id}')")
            
            if status:
                query = query.eq("status", status)
                logger.debug(f"   Added status filter: .eq('status', '{status}')")
            
            # Log query details before execution
            logger.info(f"📤 Executing Supabase query for user {user_id}...")
            logger.debug(f"   Query parameters: user_id={user_id}, status={status}")
            
            # Execute query
            result = query.execute()
            
            # Comprehensive logging after query
            logger.info(f"📥 Supabase query executed successfully")
            logger.debug(f"   Result object type: {type(result).__name__}")
            logger.debug(f"   Result.data type: {type(result.data).__name__}")
            logger.debug(f"   Result.data is None: {result.data is None}")
            
            if result.data is not None:
                logger.debug(f"   Result.data length: {len(result.data)}")
                logger.debug(f"   Result.data content: {result.data}")
                
                if len(result.data) > 0:
                    logger.info(f"✅ Successfully fetched {len(result.data)} bots for user {user_id}")
                    bot_ids = [bot.get('bot_id', 'N/A') for bot in result.data]
                    bot_names = [bot.get('name', 'N/A') for bot in result.data]
                    logger.debug(f"   Bot IDs: {bot_ids}")
                    logger.debug(f"   Bot names: {bot_names}")
                    logger.debug(f"   Bot statuses: {[bot.get('status', 'N/A') for bot in result.data]}")
                    return result.data
                else:
                    logger.info(f"✅ Query successful but no bots found for user {user_id}")
                    logger.debug(f"   This could mean:")
                    logger.debug(f"   - User has no bots in database")
                    logger.debug(f"   - RLS policy is filtering out results")
                    logger.debug(f"   - Status filter '{status}' doesn't match any bots")
                    return []
            else:
                logger.warning(f"⚠️  Query returned None data for user {user_id}")
                logger.debug(f"   Result object: {result}")
                return []
                
        except Exception as e:
            # Comprehensive error logging
            logger.error(f"❌ Failed to list bots for user {user_id}: {e}", exc_info=True)
            logger.error(f"   Error type: {type(e).__name__}")
            logger.error(f"   Error message: {str(e)}")
            
            # Log exception attributes
            if hasattr(e, 'message'):
                logger.error(f"   Exception.message: {e.message}")
            if hasattr(e, 'details'):
                logger.error(f"   Exception.details: {e.details}")
            if hasattr(e, 'code'):
                logger.error(f"   Exception.code: {e.code}")
            if hasattr(e, 'hint'):
                logger.error(f"   Exception.hint: {e.hint}")
            
            # Log full traceback
            import traceback
            logger.error(f"   Full traceback:\n{traceback.format_exc()}")
            
            # Log query context for debugging
            logger.error(f"   Query context:")
            logger.error(f"     - user_id: {user_id} (type: {type(user_id).__name__})")
            logger.error(f"     - status filter: {status}")
            logger.error(f"     - Supabase client: {self.supabase is not None}")
            
            return []
    
    def delete_bot(self, bot_id: str, user_id: str) -> bool:
        """Delete a bot from the database."""
        if not self.enabled:
            logger.debug(f"Database disabled, skipping bot deletion for {bot_id}")
            return False
        
        try:
            # First, check if bot exists
            check_result = self.supabase.table("bots").select("bot_id").eq("bot_id", bot_id).eq("user_id", user_id).execute()
            
            if not check_result.data:
                logger.warning(f"Bot {bot_id} not found or doesn't belong to user {user_id}")
                return False  # Bot doesn't exist, return False (API will handle idempotent delete)
            
            # Delete bot (user_id check ensures user can only delete their own bots)
            result = self.supabase.table("bots").delete().eq("bot_id", bot_id).eq("user_id", user_id).execute()
            
            # Verify deletion by checking if bot still exists
            verify_result = self.supabase.table("bots").select("bot_id").eq("bot_id", bot_id).eq("user_id", user_id).execute()
            
            if verify_result.data:
                logger.error(f"❌ Bot {bot_id} still exists after delete operation")
                return False
            else:
                logger.info(f"✅ Bot {bot_id} deleted from database successfully")
                return True
        except Exception as e:
            logger.error(f"❌ Failed to delete bot {bot_id} from database: {e}", exc_info=True)
            logger.error(f"   Error type: {type(e).__name__}")
            if hasattr(e, 'message'):
                logger.error(f"   Error message: {e.message}")
            if hasattr(e, 'details'):
                logger.error(f"   Error details: {e.details}")
            return False
    
    def save_bot_state(
        self,
        bot_id: str,
        run_id: Optional[str],
        state: Dict[str, Any]
    ) -> bool:
        """
        Save bot execution state to database for recovery.
        
        Args:
            bot_id: Bot identifier
            run_id: Current run identifier
            state: State dictionary containing execution state
            
        Returns:
            True if saved successfully, False otherwise
        """
        if not self.enabled:
            return False
        
        try:
            # Store state in bot_runs meta field or create a separate state record
            if run_id:
                # Update run with state
                self.supabase.table("bot_runs").update({
                    "meta": state,
                    "updated_at": datetime.now().isoformat()
                }).eq("run_id", run_id).execute()
            else:
                # Store in bot config or create state record
                # For now, we'll store in the latest run's meta
                latest_run = self.supabase.table("bot_runs").select("run_id").eq("bot_id", bot_id).order("started_at", desc=True).limit(1).execute()
                if latest_run.data:
                    run_id = latest_run.data[0]["run_id"]
                    self.supabase.table("bot_runs").update({
                        "meta": state,
                        "updated_at": datetime.now().isoformat()
                    }).eq("run_id", run_id).execute()
            
            logger.debug(f"Saved bot state for {bot_id} (run_id: {run_id})")
            return True
        except Exception as e:
            logger.error(f"Failed to save bot state: {e}", exc_info=True)
            return False
    
    def load_bot_state(
        self,
        bot_id: str,
        run_id: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Load bot execution state from database.
        
        Args:
            bot_id: Bot identifier
            run_id: Optional run identifier (loads latest if not provided)
            
        Returns:
            State dictionary or None if not found
        """
        if not self.enabled:
            return None
        
        try:
            if run_id:
                result = self.supabase.table("bot_runs").select("meta").eq("run_id", run_id).execute()
            else:
                # Get latest run
                result = self.supabase.table("bot_runs").select("run_id, meta").eq("bot_id", bot_id).order("started_at", desc=True).limit(1).execute()
            
            if result.data and len(result.data) > 0:
                meta = result.data[0].get("meta")
                if meta and isinstance(meta, dict):
                    logger.debug(f"Loaded bot state for {bot_id} (run_id: {run_id or 'latest'})")
                    return meta
            
            return None
        except Exception as e:
            logger.error(f"Failed to load bot state: {e}", exc_info=True)
            return None
    
    def get_active_bots_for_recovery(self) -> List[Dict[str, Any]]:
        """
        Get list of bots that were running/paused and need recovery on restart.
        
        Returns:
            List of bot dictionaries with status 'running' or 'paused'
        """
        if not self.enabled:
            return []
        
        try:
            result = self.supabase.table("bots").select("*").in_("status", ["running", "paused"]).execute()
            if result.data:
                logger.info(f"Found {len(result.data)} bots for recovery (status: running/paused)")
                return result.data
            return []
        except Exception as e:
            logger.error(f"Failed to get active bots for recovery: {e}", exc_info=True)
            return []
    
    def log_event(
        self,
        bot_id: str,
        run_id: Optional[str],
        user_id: str,
        event_type: str,
        event_category: str,
        message: str,
        symbol: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None
    ) -> bool:
        """
        Log a bot event to the database (legacy - kept for backward compatibility).
        For important events, use log_live_event instead.
        
        Args:
            bot_id: Bot identifier
            run_id: Optional run identifier
            user_id: User identifier
            event_type: Type of event
            event_category: Category
            message: Human-readable message
            symbol: Optional trading symbol
            details: Optional JSON details about the event
            
        Returns:
            True if logged successfully, False otherwise
        """
        # Legacy method - now logs to bot_events (old table)
        # Use log_live_event for important events
        if not self.enabled:
            logger.debug(f"Database disabled, skipping event log: {event_type} - {message}")
            return False
        
        try:
            event_data = {
                "bot_id": bot_id,
                "user_id": user_id,
                "event_type": event_type,
                "event_category": event_category,
                "message": message,
                "details": details or {}
            }
            
            if run_id:
                event_data["run_id"] = run_id
            if symbol:
                event_data["symbol"] = symbol
            
            self.supabase.table("bot_events").insert(event_data).execute()
            logger.debug(f"Logged event (legacy): {event_type} - {message}")
            return True
        except Exception as e:
            logger.error(f"Failed to log event: {e}")
            return False
    
    def log_live_event(
        self,
        bot_id: str,
        run_id: Optional[str],
        user_id: str,
        event_type: str,
        event_category: str,
        message: str,
        symbol: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None
    ) -> bool:
        """
        Log an important bot event to bot_events_live table (source of truth).
        
        Only logs important user-actionable events:
        - bot_created, bot_started, bot_stopped, bot_paused, bot_resumed, bot_deleted
        - order_executed, order_simulated, dca_started, dca_order_placed
        - entry_condition_met, profit_target_hit
        
        Args:
            bot_id: Bot identifier
            run_id: Optional run identifier
            user_id: User identifier
            event_type: Type of event (must be from allowed list)
            event_category: Category ('system', 'execution', 'condition', 'profit')
            message: Human-readable message
            symbol: Optional trading symbol
            details: Optional JSON details about the event
            
        Returns:
            True if logged successfully, False otherwise
        """
        if not self.enabled:
            logger.debug(f"Database disabled, skipping live event log: {event_type} - {message}")
            return False
        
        # Validate event_type is from allowed list
        allowed_types = {
            'bot_created', 'bot_started', 'bot_stopped', 'bot_paused', 'bot_resumed', 
            'bot_deleted', 'order_executed', 'order_simulated', 'dca_started', 
            'dca_order_placed', 'entry_condition_met', 'profit_target_hit'
        }
        
        if event_type not in allowed_types:
            logger.warning(f"Event type '{event_type}' not in allowed list for bot_events_live, skipping")
            return False
        
        try:
            event_data = {
                "bot_id": bot_id,
                "user_id": user_id,
                "event_type": event_type,
                "event_category": event_category,
                "message": message,
                "details": details or {}
            }
            
            if run_id:
                event_data["run_id"] = run_id
            if symbol:
                event_data["symbol"] = symbol
            
            self.supabase.table("bot_events_live").insert(event_data).execute()
            logger.info(f"Logged live event: {event_type} - {message}")
            return True
        except Exception as e:
            logger.error(f"Failed to log live event: {e}")
            return False


# Global instance
db_service = BotDatabaseService()


