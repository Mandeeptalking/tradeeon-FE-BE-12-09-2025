"""Order management API routes - Now with real Binance integration"""

from fastapi import APIRouter, HTTPException, Query, Path, Body, Depends
from typing import List, Optional, Dict, Any
import logging
import time

from apps.api.deps.auth import get_current_user, AuthedUser
from apps.api.clients.supabase_client import supabase
from apps.api.utils.encryption import decrypt_value
from apps.api.binance_authenticated_client import BinanceAuthenticatedClient
from apps.api.utils.errors import NotFoundError, DatabaseError, ExternalServiceError

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..', '..'))

from shared.contracts.orders import OrderIntent, ExecutionReport, OrderStatus, OrderType

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/orders", tags=["orders"])


def _get_user_binance_connection(user_id: str) -> Optional[Dict]:
    """Get user's Binance connection from database"""
    if not supabase:
        return None
    
    try:
        result = supabase.table("exchange_keys").select("*").eq("user_id", user_id).eq("exchange", "binance").eq("is_active", True).execute()
        if result.data:
            return result.data[0]
        return None
    except Exception as e:
        logger.error(f"Error fetching Binance connection: {e}")
        return None


@router.post("/preview")
async def preview_order(
    bot_id: str = Body(..., description="Bot ID"),
    symbol: str = Body(..., description="Trading symbol"),
    side: str = Body(..., description="Order side (buy/sell)"),
    qty: float = Body(..., description="Order quantity"),
    order_type: OrderType = Body(..., description="Order type"),
    price: Optional[float] = Body(None, description="Limit price"),
    stop_price: Optional[float] = Body(None, description="Stop price"),
    user: AuthedUser = Depends(get_current_user)
):
    """Preview an order before placing it"""
    try:
        connection = _get_user_binance_connection(user.user_id)
        if not connection:
            raise NotFoundError("Binance connection", "No active connection found")
        
        # Decrypt API keys
        api_key = decrypt_value(connection["api_key_encrypted"])
        api_secret = decrypt_value(connection["api_secret_encrypted"])
        
        # Get account balance to check available funds
        async with BinanceAuthenticatedClient(api_key, api_secret) as client:
            account_info = await client.get_account_info()
        
        # Calculate required margin
        if side.upper() == 'BUY':
            # Need quote asset (e.g., USDT for BTCUSDT)
            quote_asset = symbol.replace('USDT', '').replace('BUSD', '')[-4:] if 'USDT' in symbol or 'BUSD' in symbol else 'USDT'
            balances = {b['asset']: float(b['free']) for b in account_info.get('balances', [])}
            available_balance = balances.get(quote_asset, 0.0)
            
            if order_type == OrderType.MARKET:
                # For market orders, estimate cost
                required_margin = qty * (price or 50000.0)  # Rough estimate
            else:
                required_margin = qty * (price or 0.0)
        else:
            # SELL - need base asset
            base_asset = symbol.replace('USDT', '').replace('BUSD', '')
            balances = {b['asset']: float(b['free']) for b in account_info.get('balances', [])}
            available_balance = balances.get(base_asset, 0.0)
            required_margin = qty
        
        # Check if sufficient balance
        can_execute = available_balance >= required_margin
        
        # Estimate fees (Binance spot trading fee is typically 0.1%)
        estimated_fees = required_margin * 0.001
        
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
            "can_execute": can_execute
        }
        
        return {
            "success": True,
            "preview": preview
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error previewing order: {e}")
        from apps.api.utils.errors import TradeeonError
        if isinstance(e, TradeeonError):
            raise
        raise ExternalServiceError("Binance", f"Failed to preview order: {str(e)}")


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
    time_in_force: str = Body(default="GTC", description="Time in force"),
    user: AuthedUser = Depends(get_current_user)
):
    """Place an order on Binance"""
    try:
        connection = _get_user_binance_connection(user.user_id)
        if not connection:
            raise NotFoundError("Binance connection", "No active connection found")
        
        # Decrypt API keys
        api_key = decrypt_value(connection["api_key_encrypted"])
        api_secret = decrypt_value(connection["api_secret_encrypted"])
        
        # Convert order type to Binance format
        binance_order_type = "MARKET" if order_type == OrderType.MARKET else "LIMIT"
        
        # Place order on Binance
        async with BinanceAuthenticatedClient(api_key, api_secret) as client:
            binance_order = await client.place_order(
                symbol=symbol,
                side=side.upper(),
                order_type=binance_order_type,
                quantity=qty,
                price=price,
                time_in_force=time_in_force
            )
        
        # Format as execution report
        execution_report = {
            "order_id": f"order_{int(time.time())}",
            "exchange_order_id": str(binance_order.get("orderId", "")),
            "bot_id": bot_id,
            "run_id": run_id,
            "symbol": symbol,
            "side": side.upper(),
            "status": binance_order.get("status", "NEW").lower(),
            "qty": float(binance_order.get("origQty", qty)),
            "filled_qty": float(binance_order.get("executedQty", 0.0)),
            "avg_price": float(binance_order.get("price", 0.0)) if binance_order.get("price") else None,
            "limit_price": price,
            "stop_price": stop_price,
            "fees": None,  # TODO: Extract from Binance response
            "created_at": binance_order.get("transactTime", int(time.time() * 1000)),
            "updated_at": int(time.time() * 1000)
        }
        
        # TODO: Save order to database
        
        return {
            "success": True,
            "execution_report": execution_report
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error placing order: {e}")
        error_msg = str(e)
        if "insufficient balance" in error_msg.lower():
            from apps.api.utils.errors import ValidationError
            raise ValidationError("Insufficient balance for this order")
        raise HTTPException(status_code=500, detail=f"Failed to place order: {str(e)}")


@router.get("/")
async def list_orders(
    bot_id: Optional[str] = Query(None, description="Filter by bot ID"),
    run_id: Optional[str] = Query(None, description="Filter by run ID"),
    status: Optional[OrderStatus] = Query(None, description="Filter by status"),
    symbol: Optional[str] = Query(None, description="Filter by symbol"),
    limit: int = Query(default=50, ge=1, le=100, description="Number of orders to return"),
    user: AuthedUser = Depends(get_current_user)
):
    """List user's orders from Binance"""
    try:
        connection = _get_user_binance_connection(user.user_id)
        if not connection:
            raise NotFoundError("Binance connection", "No active connection found")
        
        # Decrypt API keys
        api_key = decrypt_value(connection["api_key_encrypted"])
        api_secret = decrypt_value(connection["api_secret_encrypted"])
        
        # Get open orders from Binance
        async with BinanceAuthenticatedClient(api_key, api_secret) as client:
            open_orders = await client.get_open_orders(symbol=symbol)
        
        # Format orders
        orders = []
        for order in open_orders[:limit]:
            orders.append({
                "order_id": f"order_{order.get('orderId', '')}",
                "exchange_order_id": str(order.get("orderId", "")),
                "symbol": order.get("symbol", ""),
                "side": order.get("side", "").lower(),
                "status": order.get("status", "").lower(),
                "qty": float(order.get("origQty", 0.0)),
                "filled_qty": float(order.get("executedQty", 0.0)),
                "price": float(order.get("price", 0.0)),
                "created_at": order.get("time", int(time.time() * 1000)),
                "updated_at": order.get("updateTime", int(time.time() * 1000))
            })
        
        # TODO: Filter by bot_id, run_id, status from database
        
        return {
            "success": True,
            "orders": orders,
            "count": len(orders)
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error listing orders: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to list orders: {str(e)}")


@router.get("/{order_id}")
async def get_order(
    order_id: str = Path(..., description="Order ID"),
    user: AuthedUser = Depends(get_current_user)
):
    """Get order details"""
    try:
        # TODO: Get from database first, then from exchange if needed
        from apps.api.utils.errors import TradeeonError
        raise TradeeonError(
            "Not yet implemented - need exchange_order_id",
            "NOT_IMPLEMENTED",
            status_code=501
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting order: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get order: {str(e)}")


@router.delete("/{order_id}")
async def cancel_order(
    order_id: str = Path(..., description="Order ID"),
    symbol: str = Query(..., description="Trading symbol"),
    user: AuthedUser = Depends(get_current_user)
):
    """Cancel an order"""
    try:
        connection = _get_user_binance_connection(user.user_id)
        if not connection:
            raise NotFoundError("Binance connection", "No active connection found")
        
        # Decrypt API keys
        api_key = decrypt_value(connection["api_key_encrypted"])
        api_secret = decrypt_value(connection["api_secret_encrypted"])
        
        # TODO: Get exchange_order_id from database using order_id
        # For now, assume order_id is the exchange_order_id
        exchange_order_id = int(order_id.split('_')[-1]) if '_' in order_id else int(order_id)
        
        # Cancel order on Binance
        async with BinanceAuthenticatedClient(api_key, api_secret) as client:
            result = await client.cancel_order(symbol=symbol, order_id=exchange_order_id)
        
        return {
            "success": True,
            "message": "Order cancelled successfully",
            "order": result
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error cancelling order: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to cancel order: {str(e)}")
