"""Order management API routes."""

from fastapi import APIRouter, HTTPException, Query, Path, Body
from typing import List, Optional, Dict, Any
import logging

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..', '..'))

from shared.contracts.orders import OrderIntent, ExecutionReport, OrderStatus, OrderType
from shared.contracts.bots import BotConfig

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/orders", tags=["orders"])


@router.post("/preview")
async def preview_order(
    bot_id: str = Body(..., description="Bot ID"),
    symbol: str = Body(..., description="Trading symbol"),
    side: str = Body(..., description="Order side (buy/sell)"),
    qty: float = Body(..., description="Order quantity"),
    order_type: OrderType = Body(..., description="Order type"),
    price: Optional[float] = Body(None, description="Limit price"),
    stop_price: Optional[float] = Body(None, description="Stop price")
):
    """Preview order with margin checks and estimated fees."""
    try:
        # TODO: Integrate with exchange client for real-time data
        # For now, return mock preview
        import time
        
        # Mock margin check
        required_margin = qty * (price or 50000.0)  # Assume BTC price
        available_balance = 10000.0  # Mock available balance
        
        if required_margin > available_balance:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient balance. Required: {required_margin}, Available: {available_balance}"
            )
        
        # Mock fee calculation
        estimated_fees = required_margin * 0.001  # 0.1% fee
        
        preview = {
            "symbol": symbol,
            "side": side,
            "qty": qty,
            "order_type": order_type.value,
            "price": price,
            "stop_price": stop_price,
            "required_margin": required_margin,
            "estimated_fees": estimated_fees,
            "total_cost": required_margin + estimated_fees,
            "available_balance": available_balance,
            "can_execute": True
        }
        
        return {
            "success": True,
            "preview": preview
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error previewing order: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/place")
async def place_order(
    bot_id: str = Body(..., description="Bot ID"),
    run_id: Optional[str] = Body(None, description="Bot run ID"),
    symbol: str = Body(..., description="Trading symbol"),
    side: str = Body(..., description="Order side (buy/sell)"),
    qty: float = Body(..., description="Order quantity"),
    order_type: OrderType = Body(..., description="Order type"),
    price: Optional[float] = Body(None, description="Limit price"),
    stop_price: Optional[float] = Body(None, description="Stop price"),
    time_in_force: str = Body(default="GTC", description="Time in force")
):
    """Place an order."""
    try:
        # TODO: Integrate with exchange client
        # For now, return mock execution report
        import time
        
        order_id = f"order_{int(time.time())}"
        exchange_order_id = f"ex_{int(time.time())}"
        
        # Mock order execution
        execution_report = {
            "order_id": order_id,
            "exchange_order_id": exchange_order_id,
            "bot_id": bot_id,
            "run_id": run_id,
            "symbol": symbol,
            "side": side,
            "status": "submitted",
            "qty": qty,
            "filled_qty": 0.0,
            "avg_price": None,
            "limit_price": price,
            "stop_price": stop_price,
            "fees": None,
            "created_at": int(time.time() * 1000),
            "updated_at": int(time.time() * 1000)
        }
        
        return {
            "success": True,
            "execution_report": execution_report
        }
    
    except Exception as e:
        logger.error(f"Error placing order: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/")
async def list_orders(
    bot_id: Optional[str] = Query(None, description="Filter by bot ID"),
    run_id: Optional[str] = Query(None, description="Filter by run ID"),
    status: Optional[OrderStatus] = Query(None, description="Filter by status"),
    limit: int = Query(default=50, ge=1, le=100, description="Number of orders to return")
):
    """List orders with optional filters."""
    try:
        # TODO: Integrate with Supabase
        # For now, return mock data
        orders = [
            {
                "order_id": "order_1",
                "exchange_order_id": "ex_1",
                "bot_id": "bot_1",
                "run_id": "run_1",
                "symbol": "BTCUSDT",
                "side": "buy",
                "status": "filled",
                "qty": 0.001,
                "filled_qty": 0.001,
                "avg_price": 50000.0,
                "limit_price": 50000.0,
                "stop_price": None,
                "fees": 0.05,
                "created_at": 1640995200000,
                "updated_at": 1640995200000
            }
        ]
        
        # Apply filters
        if bot_id:
            orders = [o for o in orders if o["bot_id"] == bot_id]
        if run_id:
            orders = [o for o in orders if o["run_id"] == run_id]
        if status:
            orders = [o for o in orders if o["status"] == status.value]
        
        return {
            "success": True,
            "orders": orders[:limit],
            "count": len(orders)
        }
    
    except Exception as e:
        logger.error(f"Error listing orders: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{order_id}")
async def get_order(order_id: str = Path(..., description="Order ID")):
    """Get order details."""
    try:
        # TODO: Integrate with Supabase
        # For now, return mock data
        order = {
            "order_id": order_id,
            "exchange_order_id": "ex_1",
            "bot_id": "bot_1",
            "run_id": "run_1",
            "symbol": "BTCUSDT",
            "side": "buy",
            "status": "filled",
            "qty": 0.001,
            "filled_qty": 0.001,
            "avg_price": 50000.0,
            "limit_price": 50000.0,
            "stop_price": None,
            "fees": 0.05,
            "created_at": 1640995200000,
            "updated_at": 1640995200000
        }
        
        return {
            "success": True,
            "order": order
        }
    
    except Exception as e:
        logger.error(f"Error fetching order: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{order_id}/cancel")
async def cancel_order(order_id: str = Path(..., description="Order ID")):
    """Cancel an order."""
    try:
        # TODO: Integrate with exchange client
        # For now, return mock response
        import time
        
        return {
            "success": True,
            "message": f"Order {order_id} cancelled",
            "updated_at": int(time.time() * 1000)
        }
    
    except Exception as e:
        logger.error(f"Error cancelling order: {e}")
        raise HTTPException(status_code=500, detail=str(e))
