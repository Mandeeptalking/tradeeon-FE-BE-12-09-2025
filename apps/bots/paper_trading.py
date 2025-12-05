"""Paper Trading Engine - Simulates trades without real money."""

import logging
import sys
import os
from typing import Dict, Any, List, Optional
from datetime import datetime
from decimal import Decimal, getcontext

# Set precision for decimal operations
getcontext().prec = 28

# Import database service
sys.path.insert(0, os.path.dirname(__file__))
try:
    from .db_service import db_service
except ImportError:
    db_service = None

logger = logging.getLogger(__name__)


class PaperTradingEngine:
    """Paper trading engine for simulating DCA bot trades."""
    
    def __init__(self, initial_balance: float = 10000.0, base_currency: str = "USDT",
                 bot_id: Optional[str] = None, run_id: Optional[str] = None,
                 user_id: Optional[str] = None):
        self.initial_balance = Decimal(str(initial_balance))
        self.base_balance = Decimal(str(initial_balance))  # USDT balance
        self.base_currency = base_currency
        self.bot_id = bot_id
        self.run_id = run_id
        self.user_id = user_id
        
        # Track positions per pair
        # Format: {pair: {"entries": [{"price": X, "amount": Y, "date": Z}], "total_qty": Q}}
        self.positions: Dict[str, Dict[str, Any]] = {}
        
        # Track orders
        self.order_history: List[Dict[str, Any]] = []
        
        # Track P&L
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
        
    def get_balance(self) -> float:
        """Get current base currency balance."""
        return float(self.base_balance)
        
    def get_position(self, pair: str) -> Optional[Dict[str, Any]]:
        """Get position details for a pair."""
        return self.positions.get(pair)
        
    def get_position_value(self, pair: str, current_price: float) -> float:
        """Get current position value."""
        if pair not in self.positions:
            return 0.0
            
        position = self.positions[pair]
        total_qty = Decimal(str(position.get("total_qty", 0)))
        return float(total_qty * Decimal(str(current_price)))
        
    def get_position_pnl(self, pair: str, current_price: float) -> Dict[str, Any]:
        """Calculate position P&L."""
        if pair not in self.positions:
            return {
                "pnl_percent": 0.0,
                "pnl_amount": 0.0,
                "invested": 0.0,
                "current_value": 0.0,
                "avg_entry_price": 0.0
            }
            
        position = self.positions[pair]
        entries = position.get("entries", [])
        total_qty = Decimal(str(position.get("total_qty", 0)))
        current_price_dec = Decimal(str(current_price))
        
        if total_qty == 0:
            return {
                "pnl_percent": 0.0,
                "pnl_amount": 0.0,
                "invested": 0.0,
                "current_value": 0.0,
                "avg_entry_price": 0.0
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
        
    async def execute_buy(self, pair: str, amount: float, price: float,
                          order_type: str = "market") -> Dict[str, Any]:
        """
        Execute a buy order (DCA entry).
        
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
            logger.error(f"Error executing buy order: {e}")
            return {"success": False, "error": str(e)}
            
    async def execute_sell(self, pair: str, quantity: float, price: float,
                          order_type: str = "market", reason: str = "") -> Dict[str, Any]:
        """
        Execute a sell order (profit taking).
        
        Returns:
            {
                "success": bool,
                "order_id": str,
                "quantity": float,
                "price": float,
                "proceeds": float,
                "timestamp": datetime
            }
        """
        try:
            if pair not in self.positions:
                return {"success": False, "error": f"No position for {pair}"}
                
            position = self.positions[pair]
            available_qty = position.get("total_qty", Decimal("0"))
            quantity_dec = Decimal(str(quantity))
            
            if available_qty < quantity_dec:
                return {
                    "success": False,
                    "error": f"Insufficient quantity. Need {quantity}, have {available_qty}"
                }
                
            price_dec = Decimal(str(price))
            proceeds = quantity_dec * price_dec
            
            # Calculate P&L (FIFO basis - simplified)
            # Get average entry price for sold quantity
            avg_entry = sum(e["price"] * e["amount"] for e in position["entries"]) / sum(e["amount"] for e in position["entries"]) if position["entries"] else 0
            cost_basis = Decimal(str(avg_entry)) * quantity_dec
            pnl = proceeds - cost_basis
            
            # Reduce position
            position["total_qty"] -= quantity_dec
            if position["total_qty"] <= 0:
                # Close position
                position["total_qty"] = Decimal("0")
                position["entries"] = []
                if position["total_qty"] == 0:
                    # Remove from positions
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
                    fees=0.0  # Paper trading has no fees
                )
            
            # Update or delete position in database
            if self.user_id and db_service:
                remaining_qty = float(position["total_qty"])
                if remaining_qty > 0:
                    # Update position
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
                    # Delete position (fully closed)
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
            logger.error(f"Error executing sell order: {e}")
            return {"success": False, "error": str(e)}
            
    def get_statistics(self, current_prices: Dict[str, float]) -> Dict[str, Any]:
        """Get overall trading statistics."""
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
            "open_positions": len([p for p in self.positions.values() if p.get("total_qty", 0) > 0]),
            "total_orders": len(self.order_history)
        }

