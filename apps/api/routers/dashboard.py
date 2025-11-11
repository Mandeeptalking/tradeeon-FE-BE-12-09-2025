"""
Dashboard API endpoints - Account info, balances, active trades
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, Any, List, Optional
import logging

from apps.api.deps.auth import get_current_user, AuthedUser
from apps.api.clients.supabase_client import supabase
from apps.api.utils.encryption import decrypt_value
from apps.api.binance_authenticated_client import BinanceAuthenticatedClient
from apps.api.utils.errors import NotFoundError

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


def _get_user_binance_connection(user_id: str) -> Optional[Dict]:
    """Get user's Binance connection"""
    if not supabase:
        return None
    
    try:
        result = supabase.table("exchange_keys").select("*").eq("user_id", user_id).eq("exchange", "binance").eq("is_active", True).execute()
        if result.data and len(result.data) > 0:
            return result.data[0]
        return None
    except Exception as e:
        logger.error(f"Error fetching Binance connection: {e}")
        return None


@router.get("/account")
async def get_account_info(user: AuthedUser = Depends(get_current_user)):
    """Get Binance account information"""
    try:
        connection = _get_user_binance_connection(user.user_id)
        if not connection:
            raise HTTPException(status_code=404, detail="No active Binance connection found")
        
        # Decrypt API keys
        api_key = decrypt_value(connection["api_key_encrypted"])
        api_secret = decrypt_value(connection["api_secret_encrypted"])
        
        async with BinanceAuthenticatedClient(api_key, api_secret) as client:
            account_info = await client.get_account_info()
            
            # Format response
            return {
                "success": True,
                "account": {
                    "maker_commission": account_info.get("makerCommission", 0),
                    "taker_commission": account_info.get("takerCommission", 0),
                    "buyer_commission": account_info.get("buyerCommission", 0),
                    "seller_commission": account_info.get("sellerCommission", 0),
                    "can_trade": account_info.get("canTrade", False),
                    "can_withdraw": account_info.get("canWithdraw", False),
                    "can_deposit": account_info.get("canDeposit", False),
                    "update_time": account_info.get("updateTime", 0),
                    "account_type": account_info.get("accountType", "SPOT"),
                    "balances": account_info.get("balances", [])
                }
            }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching account info: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch account info: {str(e)}")


@router.get("/balance")
async def get_balance(
    asset: Optional[str] = None,
    user: AuthedUser = Depends(get_current_user)
):
    """Get account balance, optionally filtered by asset (e.g., USDT)"""
    try:
        connection = _get_user_binance_connection(user.user_id)
        if not connection:
            raise HTTPException(status_code=404, detail="No active Binance connection found")
        
        # Decrypt API keys
        api_key = decrypt_value(connection["api_key_encrypted"])
        api_secret = decrypt_value(connection["api_secret_encrypted"])
        
        async with BinanceAuthenticatedClient(api_key, api_secret) as client:
            balances = await client.get_balance(asset=asset)
            
            return {
                "success": True,
                "balances": balances,
                "count": len(balances)
            }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching balance: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch balance: {str(e)}")


@router.get("/usdt-balance")
async def get_usdt_balance(user: AuthedUser = Depends(get_current_user)):
    """Get USDT balance specifically"""
    try:
        connection = _get_user_binance_connection(user.user_id)
        if not connection:
            raise HTTPException(status_code=404, detail="No active Binance connection found")
        
        # Decrypt API keys
        api_key = decrypt_value(connection["api_key_encrypted"])
        api_secret = decrypt_value(connection["api_secret_encrypted"])
        
        async with BinanceAuthenticatedClient(api_key, api_secret) as client:
            balances = await client.get_balance(asset="USDT")
            
            usdt_balance = {
                "free": 0.0,
                "locked": 0.0,
                "total": 0.0
            }
            
            if balances and len(balances) > 0:
                usdt_balance = balances[0]
            
            return {
                "success": True,
                "balance": usdt_balance
            }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching USDT balance: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch USDT balance: {str(e)}")


@router.get("/active-trades")
async def get_active_trades(
    symbol: Optional[str] = None,
    user: AuthedUser = Depends(get_current_user)
):
    """Get active/open orders (trades)"""
    try:
        connection = _get_user_binance_connection(user.user_id)
        if not connection:
            raise HTTPException(status_code=404, detail="No active Binance connection found")
        
        # Decrypt API keys
        api_key = decrypt_value(connection["api_key_encrypted"])
        api_secret = decrypt_value(connection["api_secret_encrypted"])
        
        async with BinanceAuthenticatedClient(api_key, api_secret) as client:
            open_orders = await client.get_open_orders(symbol=symbol)
            
            # Format orders
            formatted_orders = []
            for order in open_orders:
                formatted_orders.append({
                    "order_id": order.get("orderId"),
                    "symbol": order.get("symbol"),
                    "side": order.get("side"),
                    "type": order.get("type"),
                    "quantity": float(order.get("origQty", 0)),
                    "price": float(order.get("price", 0)),
                    "status": order.get("status"),
                    "time": order.get("time"),
                    "update_time": order.get("updateTime")
                })
            
            return {
                "success": True,
                "orders": formatted_orders,
                "count": len(formatted_orders)
            }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching active trades: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch active trades: {str(e)}")


@router.get("/summary")
async def get_dashboard_summary(user: AuthedUser = Depends(get_current_user)):
    """Get complete dashboard summary: account info, USDT balance, active trades, assets"""
    try:
        connection = _get_user_binance_connection(user.user_id)
        if not connection:
            raise HTTPException(status_code=404, detail="No active Binance connection found")
        
        # Decrypt API keys
        api_key = decrypt_value(connection["api_key_encrypted"])
        api_secret = decrypt_value(connection["api_secret_encrypted"])
        
        async with BinanceAuthenticatedClient(api_key, api_secret) as client:
            # Fetch all data in parallel
            account_info = await client.get_account_info()
            balances = await client.get_balance()
            open_orders = await client.get_open_orders()
            
            # Get USDT balance
            usdt_balance = {"free": 0.0, "locked": 0.0, "total": 0.0}
            for balance in balances:
                if balance["asset"] == "USDT":
                    usdt_balance = balance
                    break
            
            # Format assets (non-zero balances)
            assets = [
                {
                    "asset": b["asset"],
                    "free": b["free"],
                    "locked": b["locked"],
                    "total": b["total"]
                }
                for b in balances
                if b["total"] > 0
            ]
            
            # Format active trades
            active_trades = [
                {
                    "order_id": order.get("orderId"),
                    "symbol": order.get("symbol"),
                    "side": order.get("side"),
                    "type": order.get("type"),
                    "quantity": float(order.get("origQty", 0)),
                    "price": float(order.get("price", 0)),
                    "status": order.get("status"),
                    "time": order.get("time")
                }
                for order in open_orders
            ]
            
            return {
                "success": True,
                "account": {
                    "can_trade": account_info.get("canTrade", False),
                    "can_withdraw": account_info.get("canWithdraw", False),
                    "can_deposit": account_info.get("canDeposit", False),
                    "account_type": account_info.get("accountType", "SPOT")
                },
                "usdt_balance": usdt_balance,
                "assets": assets,
                "active_trades": active_trades,
                "stats": {
                    "total_assets": len(assets),
                    "total_active_trades": len(active_trades),
                    "total_balance_usdt": usdt_balance["total"]
                }
            }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching dashboard summary: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch dashboard summary: {str(e)}")

