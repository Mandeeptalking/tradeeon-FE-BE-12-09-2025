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
            # Fetch SPOT account info
            account_info = await client.get_account_info()
            balances = await client.get_balance()
            # Get open orders from both SPOT and Futures
            open_orders = await client.get_all_open_orders()
            
            # Check for Futures account - try multiple methods
            account_types = ["SPOT"]
            futures_info = None
            futures_enabled = False
            
            # Method 1: Try to get Futures account info
            try:
                futures_info = await client.get_futures_account_info()
                account_types.append("FUTURES")
                futures_enabled = True
                logger.info("✅ Futures account detected via account info")
            except Exception as e:
                error_str = str(e)
                logger.debug(f"Futures account info check failed: {error_str}")
                
                # Method 2: Check for active Futures positions (if account info fails)
                # If user has active positions, Futures is definitely enabled
                try:
                    futures_positions = await client.get_futures_positions()
                    if futures_positions and len(futures_positions) > 0:
                        account_types.append("FUTURES")
                        futures_enabled = True
                        logger.info(f"✅ Futures account detected via active positions: {len(futures_positions)} positions")
                    else:
                        logger.debug("No active Futures positions found")
                except Exception as pos_error:
                    logger.debug(f"Futures positions check also failed: {pos_error}")
                
                # Log warning only if both methods failed and it's not a "not enabled" error
                if not futures_enabled:
                    if "404" not in error_str and "Not Found" not in error_str and "not enabled" not in error_str.lower():
                        logger.warning(f"Error checking Futures account: {e}")
            
            # Get USDT balance
            usdt_balance = {"free": 0.0, "locked": 0.0, "total": 0.0}
            for balance in balances:
                if balance["asset"] == "USDT":
                    usdt_balance = balance
                    break
            
            # Calculate total portfolio value in USDT
            total_portfolio_value = usdt_balance["total"]  # Start with USDT balance
            try:
                portfolio_value = await client.get_portfolio_value()
                total_portfolio_value = portfolio_value.get("total_value_usdt", usdt_balance["total"])
            except Exception as e:
                logger.warning(f"Failed to get portfolio value, using USDT balance only: {e}")
                # Fallback: just use USDT balance
            
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
            
            # Format active trades (open orders)
            active_trades = [
                {
                    "order_id": order.get("orderId"),
                    "symbol": order.get("symbol"),
                    "side": order.get("side"),
                    "type": order.get("type"),
                    "quantity": float(order.get("origQty", 0)),
                    "price": float(order.get("price", 0)),
                    "status": order.get("status"),
                    "time": order.get("time"),
                    "account_type": order.get("account_type", "SPOT")  # SPOT or FUTURES
                }
                for order in open_orders
            ]
            
            # Get Futures positions (active positions, not orders)
            futures_positions_list = []
            if futures_enabled:
                try:
                    futures_positions = await client.get_futures_positions()
                    futures_positions_list = [
                        {
                            "symbol": pos.get("symbol"),
                            "position_side": pos.get("positionSide", "BOTH"),  # LONG, SHORT, or BOTH
                            "position_amount": float(pos.get("positionAmt", 0)),
                            "entry_price": float(pos.get("entryPrice", 0)),
                            "mark_price": float(pos.get("markPrice", 0)),
                            "unrealized_pnl": float(pos.get("unRealizedProfit", 0)),
                            "leverage": int(pos.get("leverage", 1)),
                            "liquidation_price": float(pos.get("liquidationPrice", 0)),
                            "account_type": "FUTURES"
                        }
                        for pos in futures_positions
                        if float(pos.get("positionAmt", 0)) != 0  # Only non-zero positions
                    ]
                except Exception as pos_error:
                    logger.debug(f"Failed to fetch Futures positions: {pos_error}")
            
            return {
                "success": True,
                "account": {
                    "can_trade": account_info.get("canTrade", False),
                    "can_withdraw": account_info.get("canWithdraw", False),
                    "can_deposit": account_info.get("canDeposit", False),
                    "account_type": account_types[0],  # Primary account type (for backward compatibility)
                    "account_types": account_types  # List of all available account types
                },
                "usdt_balance": usdt_balance,
                "assets": assets,
                "active_trades": active_trades,  # Open orders
                "futures_positions": futures_positions_list,  # Active Futures positions
                "stats": {
                    "total_assets": len(assets),
                    "total_active_trades": len(active_trades),
                    "total_futures_positions": len(futures_positions_list),
                    "total_balance_usdt": usdt_balance["total"]
                }
            }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching dashboard summary: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch dashboard summary: {str(e)}")

