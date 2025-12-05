"""Unified Trading Service - Handles both paper and live trading modes."""

import logging
import sys
import os
from typing import Dict, Any, List, Optional
from datetime import datetime
from decimal import Decimal, getcontext

# Set precision for decimal operations
getcontext().prec = 28

# Add paths for imports
sys.path.insert(0, os.path.dirname(__file__))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'api'))

try:
    from .db_service import db_service
except ImportError:
    db_service = None

try:
    from clients.supabase_client import supabase
except ImportError:
    supabase = None

try:
    from apps.api.binance_authenticated_client import BinanceAuthenticatedClient
    from apps.api.utils.encryption import decrypt_value
except ImportError:
    BinanceAuthenticatedClient = None
    decrypt_value = None

logger = logging.getLogger(__name__)


class TradingService:
    """Unified trading service for both paper and live trading modes."""
    
    def __init__(
        self,
        paper_trading: bool,
        user_id: str,
        bot_id: str,
        run_id: Optional[str] = None,
        initial_balance: float = 10000.0,
        base_currency: str = "USDT"
    ):
        """
        Initialize trading service.
        
        Args:
            paper_trading: True for paper trading, False for live trading
            user_id: User ID
            bot_id: Bot ID
            run_id: Bot run ID
            initial_balance: Initial balance for paper trading
            base_currency: Base currency (default: USDT)
        """
        self.paper_trading = paper_trading
        self.user_id = user_id
        self.bot_id = bot_id
        self.run_id = run_id
        self.base_currency = base_currency
        
        if paper_trading:
            # Paper trading: maintain internal state
            self.initial_balance = Decimal(str(initial_balance))
            self.base_balance = Decimal(str(initial_balance))
            self.positions: Dict[str, Dict[str, Any]] = {}
            self.order_history: List[Dict[str, Any]] = []
            self.total_invested = Decimal("0")
            self.total_realized_pnl = Decimal("0")
            
            # Sync initial balance to database
            if self.user_id and db_service:
                db_service.upsert_funds(
                    user_id=self.user_id,
                    exchange="paper_trading",
                    currency=self.base_currency,
                    free=float(self.base_balance),
                    locked=0.0
                )
        else:
            # Live trading: will use Binance API
            self.binance_client = None
            self._binance_connection = None
            self._api_key = None
            self._api_secret = None
            
            # For live mode, we'll track positions from orders
            # (can also sync from exchange if needed)
            self.positions: Dict[str, Dict[str, Any]] = {}
            self.order_history: List[Dict[str, Any]] = []
        
        logger.info(f"TradingService initialized: mode={'paper' if paper_trading else 'live'}, user_id={user_id}, bot_id={bot_id}")
    
    async def _initialize_binance_client(self) -> bool:
        """
        Initialize Binance client for live trading.
        
        Validates the connection and tests API keys before use.
        """
        if self.paper_trading:
            return False
        
        if self.binance_client is not None:
            return True
        
        try:
            connection = await self._get_user_binance_connection()
            if not connection:
                logger.error(f"No Binance connection found for user {self.user_id}")
                return False
            
            if not decrypt_value:
                logger.error("decrypt_value function not available")
                return False
            
            # Decrypt API keys
            try:
                self._api_key = decrypt_value(connection["api_key_encrypted"])
                self._api_secret = decrypt_value(connection["api_secret_encrypted"])
            except Exception as e:
                logger.error(f"Failed to decrypt API keys: {e}", exc_info=True)
                return False
            
            if not self._api_key or not self._api_secret:
                logger.error("Decrypted API keys are empty")
                return False
            
            # Validate connection status
            connection_status = connection.get("status", "unknown")
            if connection_status not in ["connected", "degraded"]:
                logger.warning(
                    f"Connection status is '{connection_status}', but proceeding. "
                    f"Connection ID: {connection.get('id')}"
                )
            
            # Test API keys by making a lightweight API call
            if BinanceAuthenticatedClient:
                try:
                    async with BinanceAuthenticatedClient(self._api_key, self._api_secret) as test_client:
                        # Test with account info call (lightweight)
                        account_info = await test_client.get_account_info()
                        if account_info:
                            logger.info(
                                f"✅ Binance API keys validated successfully. "
                                f"Connection ID: {connection.get('id')}, "
                                f"Nickname: {connection.get('nickname', 'N/A')}"
                            )
                        else:
                            logger.warning("Account info call returned empty, but proceeding")
                except Exception as test_error:
                    error_msg = str(test_error)
                    logger.error(
                        f"❌ Binance API key validation failed: {error_msg}. "
                        f"Connection ID: {connection.get('id')}"
                    )
                    
                    # Provide helpful error messages
                    if "Invalid API-key" in error_msg or "Invalid signature" in error_msg:
                        raise ValueError(
                            f"Invalid API keys for connection '{connection.get('nickname', connection.get('id'))}'. "
                            f"Please check your API keys in the Connections page."
                        )
                    elif "IP" in error_msg or "whitelist" in error_msg.lower():
                        raise ValueError(
                            f"IP whitelist error for connection '{connection.get('nickname', connection.get('id'))}'. "
                            f"Please ensure the server IP is whitelisted in your Binance API settings."
                        )
                    else:
                        raise ValueError(
                            f"Failed to validate API keys: {error_msg}. "
                            f"Please check your connection settings."
                        )
            else:
                logger.warning("BinanceAuthenticatedClient not available, skipping validation")
            
            self._binance_connection = connection
            
            logger.info(
                f"✅ Binance connection initialized successfully for user {self.user_id}. "
                f"Connection ID: {connection.get('id')}, Nickname: {connection.get('nickname', 'N/A')}"
            )
            return True
            
        except ValueError:
            # Re-raise validation errors
            raise
        except Exception as e:
            logger.error(f"Failed to initialize Binance client: {e}", exc_info=True)
            return False
    
    async def _get_user_binance_connection(self) -> Optional[Dict]:
        """
        Get user's Binance connection from database.
        
        Supports:
        - connection_id: If specified in bot config, use that specific connection
        - connection_nickname: If specified in bot config, use connection with that nickname
        - Otherwise: Use the first active Binance connection
        
        Returns:
            Connection dict with api_key_encrypted, api_secret_encrypted, etc.
        """
        if not supabase:
            logger.error("Supabase not available")
            return None
        
        try:
            # Get bot config to check for connection preference
            connection_id = None
            connection_nickname = None
            
            if self.bot_id and db_service:
                try:
                    bot_data = db_service.get_bot(self.bot_id, user_id=self.user_id)
                    if bot_data and bot_data.get("config"):
                        config = bot_data.get("config", {})
                        connection_id = config.get("connection_id")
                        connection_nickname = config.get("connection_nickname")
                except Exception as e:
                    logger.warning(f"Could not get bot config for connection selection: {e}")
            
            # Build query
            query = supabase.table("exchange_keys").select("*").eq(
                "user_id", self.user_id
            ).eq("exchange", "binance").eq("is_active", True)
            
            # Apply connection filter if specified
            if connection_id:
                query = query.eq("id", connection_id)
                logger.info(f"Looking for specific connection_id: {connection_id}")
            elif connection_nickname:
                query = query.eq("nickname", connection_nickname)
                logger.info(f"Looking for connection with nickname: {connection_nickname}")
            
            result = query.execute()
            
            if not result.data:
                if connection_id or connection_nickname:
                    logger.error(
                        f"No active Binance connection found matching criteria: "
                        f"connection_id={connection_id}, nickname={connection_nickname}"
                    )
                else:
                    logger.error(f"No active Binance connection found for user {self.user_id}")
                return None
            
            connection = result.data[0]
            
            # Validate connection has required fields
            if not connection.get("api_key_encrypted") or not connection.get("api_secret_encrypted"):
                logger.error(f"Connection {connection.get('id')} missing API keys")
                return None
            
            logger.info(
                f"Found Binance connection: id={connection.get('id')}, "
                f"nickname={connection.get('nickname')}, status={connection.get('status', 'unknown')}"
            )
            
            return connection
            
        except Exception as e:
            logger.error(f"Error fetching Binance connection: {e}", exc_info=True)
            return None
    
    def get_balance(self) -> float:
        """Get current base currency balance."""
        if self.paper_trading:
            return float(self.base_balance)
        else:
            # For live mode, would need to query exchange
            # For now, return 0 and let caller handle it
            # TODO: Implement exchange balance query if needed
            return 0.0
    
    def get_position(self, pair: str) -> Optional[Dict[str, Any]]:
        """Get position details for a pair."""
        return self.positions.get(pair)
    
    def get_position_value(self, pair: str, current_price: float) -> float:
        """Get current position value."""
        position = self.get_position(pair)
        if not position:
            return 0.0
        
        if self.paper_trading:
            total_qty = Decimal(str(position.get("total_qty", 0)))
            return float(total_qty * Decimal(str(current_price)))
        else:
            # For live mode, use tracked quantity
            total_qty = position.get("total_qty", 0)
            return float(total_qty * current_price)
    
    def get_position_pnl(self, pair: str, current_price: float) -> Dict[str, Any]:
        """Calculate position P&L."""
        # Get position (handles both exact and normalized formats)
        position = self.get_position(pair)
        if not position:
            return {
                "pnl_percent": 0.0,
                "pnl_amount": 0.0,
                "invested": 0.0,
                "current_value": 0.0,
                "avg_entry_price": 0.0,
                "total_qty": 0.0
            }
        
        entries = position.get("entries", [])
        
        if self.paper_trading:
            total_qty = Decimal(str(position.get("total_qty", 0)))
            current_price_dec = Decimal(str(current_price))
            
            if total_qty == 0:
                return {
                    "pnl_percent": 0.0,
                    "pnl_amount": 0.0,
                    "invested": 0.0,
                    "current_value": 0.0,
                    "avg_entry_price": 0.0,
                    "total_qty": 0.0
                }
            
            # Calculate average entry price
            total_cost = Decimal("0")
            for entry in entries:
                cost = Decimal(str(entry["price"])) * Decimal(str(entry["amount"]))
                total_cost += cost
            
            avg_entry_price = total_cost / total_qty if total_qty > 0 else Decimal("0")
            invested = float(total_cost)
            current_value = float(total_qty * current_price_dec)
            
            pnl_amount = current_value - invested
            pnl_percent = (pnl_amount / invested * 100) if invested > 0 else 0.0
            
            return {
                "pnl_percent": float(pnl_percent),
                "pnl_amount": float(pnl_amount),
                "invested": invested,
                "current_value": current_value,
                "avg_entry_price": float(avg_entry_price),
                "total_qty": float(total_qty)
            }
        else:
            # Live mode: calculate from tracked entries
            if not entries:
                return {
                    "pnl_percent": 0.0,
                    "pnl_amount": 0.0,
                    "invested": 0.0,
                    "current_value": 0.0,
                    "avg_entry_price": 0.0,
                    "total_qty": 0.0
                }
            
            total_qty = sum(e.get("amount", 0) for e in entries)
            if total_qty == 0:
                return {
                    "pnl_percent": 0.0,
                    "pnl_amount": 0.0,
                    "invested": 0.0,
                    "current_value": 0.0,
                    "avg_entry_price": 0.0,
                    "total_qty": 0.0
                }
            
            total_cost = sum(e.get("price", 0) * e.get("amount", 0) for e in entries)
            avg_entry_price = total_cost / total_qty if total_qty > 0 else 0.0
            invested = total_cost
            current_value = total_qty * current_price
            
            pnl_amount = current_value - invested
            pnl_percent = (pnl_amount / invested * 100) if invested > 0 else 0.0
            
            return {
                "pnl_percent": pnl_percent,
                "pnl_amount": pnl_amount,
                "invested": invested,
                "current_value": current_value,
                "avg_entry_price": avg_entry_price,
                "total_qty": total_qty
            }
    
    async def execute_buy(self, pair: str, amount: float, price: float,
                          order_type: str = "market") -> Dict[str, Any]:
        """
        Execute a buy order.
        
        Args:
            pair: Trading pair (e.g., "BTCUSDT")
            amount: Amount in quote currency (e.g., USDT)
            price: Current price
            order_type: Order type ("market" or "limit")
        
        Returns:
            {
                "success": bool,
                "order_id": str,
                "quantity": float,
                "price": float,
                "cost": float,
                "timestamp": datetime
            }
        """
        if self.paper_trading:
            return await self._execute_buy_paper(pair, amount, price, order_type)
        else:
            return await self._execute_buy_live(pair, amount, price, order_type)
    
    async def _execute_buy_paper(self, pair: str, amount: float, price: float,
                                  order_type: str) -> Dict[str, Any]:
        """Execute buy order in paper trading mode."""
        try:
            amount_dec = Decimal(str(amount))
            price_dec = Decimal(str(price))
            
            # Calculate quantity (amount / price)
            quantity = amount_dec / price_dec
            cost = amount_dec
            
            # Check balance
            if self.base_balance < cost:
                return {
                    "success": False,
                    "error": f"Insufficient balance. Need {cost}, have {self.base_balance}"
                }
            
            # Deduct from balance
            self.base_balance -= cost
            
            # Add to position
            if pair not in self.positions:
                self.positions[pair] = {
                    "entries": [],
                    "total_qty": Decimal("0")
                }
            
            self.positions[pair]["entries"].append({
                "price": float(price),
                "amount": float(quantity),
                "date": datetime.now(),
                "cost": float(cost)
            })
            self.positions[pair]["total_qty"] += quantity
            
            self.total_invested += cost
            
            # Record order
            order_id = f"paper_{pair}_{datetime.now().timestamp()}"
            order = {
                "order_id": order_id,
                "pair": pair,
                "side": "buy",
                "type": order_type,
                "quantity": float(quantity),
                "price": float(price),
                "cost": float(cost),
                "timestamp": datetime.now(),
                "status": "filled"
            }
            self.order_history.append(order)
            
            # Log order to database
            if self.bot_id and self.user_id and db_service:
                db_service.log_order(
                    bot_id=self.bot_id,
                    run_id=self.run_id,
                    user_id=self.user_id,
                    symbol=pair,
                    side="buy",
                    qty=float(quantity),
                    order_type=order_type,
                    status="filled",
                    filled_qty=float(quantity),
                    avg_price=float(price),
                    exchange_order_id=order_id
                )
            
            # Update position in database
            if self.user_id and db_service:
                position_pnl = self.get_position_pnl(pair, float(price))
                db_service.upsert_position(
                    user_id=self.user_id,
                    symbol=pair,
                    qty=float(self.positions[pair]["total_qty"]),
                    avg_price=position_pnl.get("avg_entry_price", float(price)),
                    current_price=float(price),
                    unrealized_pnl=position_pnl.get("pnl_amount", 0),
                    unrealized_pnl_percent=position_pnl.get("pnl_percent", 0)
                )
            
            # Update balance in database
            if self.user_id and db_service:
                db_service.upsert_funds(
                    user_id=self.user_id,
                    exchange="paper_trading",
                    currency=self.base_currency,
                    free=float(self.base_balance),
                    locked=0.0
                )
            
            logger.info(f"Paper trade BUY: {pair} {quantity} @ {price} = {cost}")
            
            # Log buy event
            if self.bot_id and self.user_id and db_service:
                db_service.log_event(
                    bot_id=self.bot_id,
                    run_id=self.run_id,
                    user_id=self.user_id,
                    event_type="order_executed",
                    event_category="execution",
                    message=f"Buy order executed for {pair}: {quantity} @ {price} = {cost}",
                    symbol=pair,
                    details={
                        "side": "buy",
                        "quantity": float(quantity),
                        "price": float(price),
                        "cost": float(cost),
                        "order_id": order_id
                    }
                )
            
            return {
                "success": True,
                "order_id": order_id,
                "quantity": float(quantity),
                "price": float(price),
                "cost": float(cost),
                "timestamp": datetime.now()
            }
            
        except Exception as e:
            logger.error(f"Error executing paper buy order: {e}", exc_info=True)
            return {"success": False, "error": str(e)}
    
    async def _execute_buy_live(self, pair: str, amount: float, price: float,
                                order_type: str) -> Dict[str, Any]:
        """Execute buy order in live trading mode."""
        try:
            # Initialize Binance client if needed (validates API keys)
            try:
                if not await self._initialize_binance_client():
                    return {
                        "success": False,
                        "error": "Failed to initialize Binance connection. Please check your connection settings."
                    }
            except ValueError as ve:
                # Re-raise validation errors (these have user-friendly messages)
                return {
                    "success": False,
                    "error": str(ve)
                }
            
            if not BinanceAuthenticatedClient:
                return {
                    "success": False,
                    "error": "BinanceAuthenticatedClient not available"
                }
            
            # Normalize pair format (ETH/USDT -> ETHUSDT)
            normalized_pair = pair.replace('/', '').replace('-', '').upper()
            
            # Calculate quantity (amount / price)
            quantity = amount / price
            
            # Place order on Binance
            async with BinanceAuthenticatedClient(self._api_key, self._api_secret) as client:
                binance_order_type = "MARKET" if order_type == "market" else "LIMIT"
                
                binance_order = await client.place_order(
                    symbol=normalized_pair,
                    side="BUY",
                    order_type=binance_order_type,
                    quantity=quantity,
                    price=price if order_type == "limit" else None,
                    time_in_force="GTC"
                )
            
            # Extract order details
            exchange_order_id = str(binance_order.get("orderId", ""))
            filled_qty = float(binance_order.get("executedQty", quantity))
            avg_price = float(binance_order.get("price", price))
            if not avg_price or avg_price == 0:
                # For market orders, use current price or calculate from fills
                avg_price = price
            
            order_id = f"live_{normalized_pair}_{exchange_order_id}"
            cost = filled_qty * avg_price
            
            # Track position
            if normalized_pair not in self.positions:
                self.positions[normalized_pair] = {
                    "entries": [],
                    "total_qty": 0.0
                }
            
            self.positions[normalized_pair]["entries"].append({
                "price": avg_price,
                "amount": filled_qty,
                "date": datetime.now(),
                "cost": cost
            })
            self.positions[normalized_pair]["total_qty"] += filled_qty
            
            # Record order
            order = {
                "order_id": order_id,
                "pair": normalized_pair,
                "side": "buy",
                "type": order_type,
                "quantity": filled_qty,
                "price": avg_price,
                "cost": cost,
                "timestamp": datetime.now(),
                "status": binance_order.get("status", "FILLED").lower(),
                "exchange_order_id": exchange_order_id
            }
            self.order_history.append(order)
            
            # Log order to database
            if self.bot_id and self.user_id and db_service:
                db_service.log_order(
                    bot_id=self.bot_id,
                    run_id=self.run_id,
                    user_id=self.user_id,
                    symbol=normalized_pair,
                    side="buy",
                    qty=filled_qty,
                    order_type=order_type,
                    status=binance_order.get("status", "FILLED").lower(),
                    filled_qty=filled_qty,
                    avg_price=avg_price,
                    exchange_order_id=exchange_order_id
                )
            
            # Update position in database
            if self.user_id and db_service:
                position_pnl = self.get_position_pnl(normalized_pair, avg_price)
                db_service.upsert_position(
                    user_id=self.user_id,
                    symbol=normalized_pair,
                    qty=self.positions[normalized_pair]["total_qty"],
                    avg_price=position_pnl.get("avg_entry_price", avg_price),
                    current_price=avg_price,
                    unrealized_pnl=position_pnl.get("pnl_amount", 0),
                    unrealized_pnl_percent=position_pnl.get("pnl_percent", 0)
                )
            
            logger.info(f"Live trade BUY: {normalized_pair} {filled_qty} @ {avg_price} = {cost}")
            
            # Log buy event
            if self.bot_id and self.user_id and db_service:
                db_service.log_event(
                    bot_id=self.bot_id,
                    run_id=self.run_id,
                    user_id=self.user_id,
                    event_type="order_executed",
                    event_category="execution",
                    message=f"Buy order executed for {normalized_pair}: {filled_qty} @ {avg_price} = {cost}",
                    symbol=normalized_pair,
                    details={
                        "side": "buy",
                        "quantity": filled_qty,
                        "price": avg_price,
                        "cost": cost,
                        "order_id": order_id,
                        "exchange_order_id": exchange_order_id
                    }
                )
            
            return {
                "success": True,
                "order_id": order_id,
                "quantity": filled_qty,
                "price": avg_price,
                "cost": cost,
                "timestamp": datetime.now()
            }
            
        except Exception as e:
            logger.error(f"Error executing live buy order: {e}", exc_info=True)
            error_msg = str(e)
            
            # Log error event
            if self.bot_id and self.user_id and db_service:
                db_service.log_event(
                    bot_id=self.bot_id,
                    run_id=self.run_id,
                    user_id=self.user_id,
                    event_type="order_failed",
                    event_category="execution",
                    message=f"Buy order failed for {pair}: {error_msg}",
                    symbol=pair,
                    details={"error": error_msg, "side": "buy"}
                )
            
            return {"success": False, "error": error_msg}
    
    async def execute_sell(self, pair: str, quantity: float, price: float,
                          order_type: str = "market", reason: str = "") -> Dict[str, Any]:
        """
        Execute a sell order.
        
        Args:
            pair: Trading pair
            quantity: Quantity to sell
            price: Current price
            order_type: Order type
            reason: Reason for selling
        
        Returns:
            {
                "success": bool,
                "order_id": str,
                "quantity": float,
                "price": float,
                "proceeds": float,
                "pnl": float,
                "timestamp": datetime
            }
        """
        if self.paper_trading:
            return await self._execute_sell_paper(pair, quantity, price, order_type, reason)
        else:
            return await self._execute_sell_live(pair, quantity, price, order_type, reason)
    
    async def _execute_sell_paper(self, pair: str, quantity: float, price: float,
                                  order_type: str, reason: str) -> Dict[str, Any]:
        """Execute sell order in paper trading mode."""
        try:
            if pair not in self.positions:
                return {"success": False, "error": f"No position for {pair}"}
            
            position = self.positions[pair]
            available_qty = Decimal(str(position.get("total_qty", 0)))
            quantity_dec = Decimal(str(quantity))
            
            if available_qty < quantity_dec:
                return {
                    "success": False,
                    "error": f"Insufficient quantity. Need {quantity}, have {available_qty}"
                }
            
            price_dec = Decimal(str(price))
            proceeds = quantity_dec * price_dec
            
            # Calculate P&L (FIFO basis - simplified)
            avg_entry = sum(e["price"] * e["amount"] for e in position["entries"]) / sum(e["amount"] for e in position["entries"]) if position["entries"] else 0
            cost_basis = Decimal(str(avg_entry)) * quantity_dec
            pnl = proceeds - cost_basis
            
            # Reduce position
            position["total_qty"] -= quantity_dec
            if position["total_qty"] <= 0:
                position["total_qty"] = Decimal("0")
                position["entries"] = []
                if position["total_qty"] == 0:
                    self.positions.pop(pair, None)
            
            # Add to balance
            self.base_balance += proceeds
            self.total_realized_pnl += pnl
            
            # Record order
            order_id = f"paper_{pair}_{datetime.now().timestamp()}"
            order = {
                "order_id": order_id,
                "pair": pair,
                "side": "sell",
                "type": order_type,
                "quantity": float(quantity),
                "price": float(price),
                "proceeds": float(proceeds),
                "pnl": float(pnl),
                "reason": reason,
                "timestamp": datetime.now(),
                "status": "filled"
            }
            self.order_history.append(order)
            
            # Log order to database
            if self.bot_id and self.user_id and db_service:
                db_service.log_order(
                    bot_id=self.bot_id,
                    run_id=self.run_id,
                    user_id=self.user_id,
                    symbol=pair,
                    side="sell",
                    qty=float(quantity),
                    order_type=order_type,
                    status="filled",
                    filled_qty=float(quantity),
                    avg_price=float(price),
                    exchange_order_id=order_id,
                    fees=0.0
                )
            
            # Update or delete position in database
            if self.user_id and db_service:
                remaining_qty = float(position["total_qty"])
                if remaining_qty > 0:
                    position_pnl = self.get_position_pnl(pair, float(price))
                    db_service.upsert_position(
                        user_id=self.user_id,
                        symbol=pair,
                        qty=remaining_qty,
                        avg_price=position_pnl.get("avg_entry_price", 0),
                        current_price=float(price),
                        unrealized_pnl=position_pnl.get("pnl_amount", 0),
                        unrealized_pnl_percent=position_pnl.get("pnl_percent", 0)
                    )
                else:
                    db_service.delete_position(self.user_id, pair)
            
            # Update balance in database
            if self.user_id and db_service:
                db_service.upsert_funds(
                    user_id=self.user_id,
                    exchange="paper_trading",
                    currency=self.base_currency,
                    free=float(self.base_balance),
                    locked=0.0
                )
            
            logger.info(f"Paper trade SELL: {pair} {quantity} @ {price} = {proceeds} (P&L: {pnl})")
            
            # Log sell event
            if self.bot_id and self.user_id and db_service:
                db_service.log_event(
                    bot_id=self.bot_id,
                    run_id=self.run_id,
                    user_id=self.user_id,
                    event_type="order_executed",
                    event_category="execution",
                    message=f"Sell order executed for {pair}: {quantity} @ {price} = {proceeds} (P&L: {pnl:.2f})",
                    symbol=pair,
                    details={
                        "side": "sell",
                        "quantity": float(quantity),
                        "price": float(price),
                        "proceeds": float(proceeds),
                        "pnl": float(pnl),
                        "reason": reason,
                        "order_id": order_id
                    }
                )
            
            return {
                "success": True,
                "order_id": order_id,
                "quantity": float(quantity),
                "price": float(price),
                "proceeds": float(proceeds),
                "pnl": float(pnl),
                "timestamp": datetime.now()
            }
            
        except Exception as e:
            logger.error(f"Error executing paper sell order: {e}", exc_info=True)
            return {"success": False, "error": str(e)}
    
    async def _execute_sell_live(self, pair: str, quantity: float, price: float,
                                  order_type: str, reason: str) -> Dict[str, Any]:
        """Execute sell order in live trading mode."""
        try:
            # Initialize Binance client if needed (validates API keys)
            try:
                if not await self._initialize_binance_client():
                    return {
                        "success": False,
                        "error": "Failed to initialize Binance connection. Please check your connection settings."
                    }
            except ValueError as ve:
                # Re-raise validation errors (these have user-friendly messages)
                return {
                    "success": False,
                    "error": str(ve)
                }
            
            if not BinanceAuthenticatedClient:
                return {
                    "success": False,
                    "error": "BinanceAuthenticatedClient not available"
                }
            
            # Normalize pair format
            normalized_pair = pair.replace('/', '').replace('-', '').upper()
            
            # Check if we have position
            if normalized_pair not in self.positions:
                return {"success": False, "error": f"No position for {normalized_pair}"}
            
            position = self.positions[normalized_pair]
            available_qty = position.get("total_qty", 0)
            
            if available_qty < quantity:
                return {
                    "success": False,
                    "error": f"Insufficient quantity. Need {quantity}, have {available_qty}"
                }
            
            # Place order on Binance
            async with BinanceAuthenticatedClient(self._api_key, self._api_secret) as client:
                binance_order_type = "MARKET" if order_type == "market" else "LIMIT"
                
                binance_order = await client.place_order(
                    symbol=normalized_pair,
                    side="SELL",
                    order_type=binance_order_type,
                    quantity=quantity,
                    price=price if order_type == "limit" else None,
                    time_in_force="GTC"
                )
            
            # Extract order details
            exchange_order_id = str(binance_order.get("orderId", ""))
            filled_qty = float(binance_order.get("executedQty", quantity))
            avg_price = float(binance_order.get("price", price))
            if not avg_price or avg_price == 0:
                avg_price = price
            
            proceeds = filled_qty * avg_price
            
            # Calculate P&L
            avg_entry = sum(e.get("price", 0) * e.get("amount", 0) for e in position["entries"]) / sum(e.get("amount", 0) for e in position["entries"]) if position["entries"] else 0
            cost_basis = avg_entry * filled_qty
            pnl = proceeds - cost_basis
            
            # Reduce position
            position["total_qty"] -= filled_qty
            if position["total_qty"] <= 0:
                position["total_qty"] = 0.0
                position["entries"] = []
                if position["total_qty"] == 0:
                    self.positions.pop(normalized_pair, None)
            
            order_id = f"live_{normalized_pair}_{exchange_order_id}"
            
            # Record order
            order = {
                "order_id": order_id,
                "pair": normalized_pair,
                "side": "sell",
                "type": order_type,
                "quantity": filled_qty,
                "price": avg_price,
                "proceeds": proceeds,
                "pnl": pnl,
                "reason": reason,
                "timestamp": datetime.now(),
                "status": binance_order.get("status", "FILLED").lower(),
                "exchange_order_id": exchange_order_id
            }
            self.order_history.append(order)
            
            # Log order to database
            if self.bot_id and self.user_id and db_service:
                db_service.log_order(
                    bot_id=self.bot_id,
                    run_id=self.run_id,
                    user_id=self.user_id,
                    symbol=normalized_pair,
                    side="sell",
                    qty=filled_qty,
                    order_type=order_type,
                    status=binance_order.get("status", "FILLED").lower(),
                    filled_qty=filled_qty,
                    avg_price=avg_price,
                    exchange_order_id=exchange_order_id
                )
            
            # Update or delete position in database
            if self.user_id and db_service:
                remaining_qty = position.get("total_qty", 0)
                if remaining_qty > 0:
                    position_pnl = self.get_position_pnl(normalized_pair, avg_price)
                    db_service.upsert_position(
                        user_id=self.user_id,
                        symbol=normalized_pair,
                        qty=remaining_qty,
                        avg_price=position_pnl.get("avg_entry_price", 0),
                        current_price=avg_price,
                        unrealized_pnl=position_pnl.get("pnl_amount", 0),
                        unrealized_pnl_percent=position_pnl.get("pnl_percent", 0)
                    )
                else:
                    db_service.delete_position(self.user_id, normalized_pair)
            
            logger.info(f"Live trade SELL: {normalized_pair} {filled_qty} @ {avg_price} = {proceeds} (P&L: {pnl})")
            
            # Log sell event
            if self.bot_id and self.user_id and db_service:
                db_service.log_event(
                    bot_id=self.bot_id,
                    run_id=self.run_id,
                    user_id=self.user_id,
                    event_type="order_executed",
                    event_category="execution",
                    message=f"Sell order executed for {normalized_pair}: {filled_qty} @ {avg_price} = {proceeds} (P&L: {pnl:.2f})",
                    symbol=normalized_pair,
                    details={
                        "side": "sell",
                        "quantity": filled_qty,
                        "price": avg_price,
                        "proceeds": proceeds,
                        "pnl": pnl,
                        "reason": reason,
                        "order_id": order_id,
                        "exchange_order_id": exchange_order_id
                    }
                )
            
            return {
                "success": True,
                "order_id": order_id,
                "quantity": filled_qty,
                "price": avg_price,
                "proceeds": proceeds,
                "pnl": pnl,
                "timestamp": datetime.now()
            }
            
        except Exception as e:
            logger.error(f"Error executing live sell order: {e}", exc_info=True)
            error_msg = str(e)
            
            # Log error event
            if self.bot_id and self.user_id and db_service:
                db_service.log_event(
                    bot_id=self.bot_id,
                    run_id=self.run_id,
                    user_id=self.user_id,
                    event_type="order_failed",
                    event_category="execution",
                    message=f"Sell order failed for {pair}: {error_msg}",
                    symbol=pair,
                    details={"error": error_msg, "side": "sell"}
                )
            
            return {"success": False, "error": error_msg}
    
    def get_statistics(self, current_prices: Dict[str, float]) -> Dict[str, Any]:
        """Get overall trading statistics."""
        if self.paper_trading:
            total_current_value = Decimal("0")
            for pair, price in current_prices.items():
                pos_value = Decimal(str(self.get_position_value(pair, price)))
                total_current_value += pos_value
            
            unrealized_pnl = total_current_value - self.total_invested
            
            return {
                "initial_balance": float(self.initial_balance),
                "current_balance": float(self.base_balance),
                "total_invested": float(self.total_invested),
                "total_position_value": float(total_current_value),
                "realized_pnl": float(self.total_realized_pnl),
                "unrealized_pnl": float(unrealized_pnl),
                "total_pnl": float(self.total_realized_pnl + unrealized_pnl),
                "total_return_pct": float((self.total_realized_pnl + unrealized_pnl) / self.initial_balance * 100) if self.initial_balance > 0 else 0.0,
                "open_positions": len([p for p in self.positions.values() if (p.get("total_qty", 0) if isinstance(p.get("total_qty", 0), (int, float)) else float(p.get("total_qty", 0))) > 0]),
                "total_orders": len(self.order_history)
            }
        else:
            # Live mode: calculate from tracked positions
            total_invested = 0.0
            total_current_value = 0.0
            
            for pair, price in current_prices.items():
                position_pnl = self.get_position_pnl(pair, price)
                total_invested += position_pnl.get("invested", 0)
                total_current_value += position_pnl.get("current_value", 0)
            
            unrealized_pnl = total_current_value - total_invested
            realized_pnl = sum(o.get("pnl", 0) for o in self.order_history if o.get("side") == "sell")
            
            return {
                "initial_balance": 0.0,  # Would need to track from exchange
                "current_balance": 0.0,  # Would need to query from exchange
                "total_invested": total_invested,
                "total_position_value": total_current_value,
                "realized_pnl": realized_pnl,
                "unrealized_pnl": unrealized_pnl,
                "total_pnl": realized_pnl + unrealized_pnl,
                "total_return_pct": 0.0,  # Would need initial balance
                "open_positions": len([p for p in self.positions.values() if p.get("total_qty", 0) > 0]),
                "total_orders": len(self.order_history)
            }

