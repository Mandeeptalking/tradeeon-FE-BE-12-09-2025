"""Database service for bot persistence."""

import logging
import sys
import os
from typing import Optional, Dict, Any
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
        
        if not self.enabled:
            import os
            env = os.getenv("ENVIRONMENT", "development")
            if env == "production":
                raise RuntimeError(
                    "Database service is required in production. "
                    "Please configure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables."
                )
            logger.warning("Supabase not configured, database operations disabled. Bot data will only be stored in memory.")
    
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
            return []
        
        try:
            query = self.supabase.table("bots").select("*").eq("user_id", user_id)
            if status:
                query = query.eq("status", status)
            
            result = query.execute()
            return result.data if result.data else []
        except Exception as e:
            logger.error(f"Failed to list bots: {e}")
            return []
    
    def delete_bot(self, bot_id: str, user_id: str) -> bool:
        """Delete a bot from the database."""
        if not self.enabled:
            logger.debug(f"Database disabled, skipping bot deletion for {bot_id}")
            return False
        
        try:
            # Delete bot (user_id check ensures user can only delete their own bots)
            result = self.supabase.table("bots").delete().eq("bot_id", bot_id).eq("user_id", user_id).execute()
            
            if result.data:
                logger.info(f"✅ Bot {bot_id} deleted from database successfully")
                return True
            else:
                logger.warning(f"Bot {bot_id} not found or already deleted")
                return False
        except Exception as e:
            logger.error(f"❌ Failed to delete bot {bot_id} from database: {e}", exc_info=True)
            return False


# Global instance
db_service = BotDatabaseService()


