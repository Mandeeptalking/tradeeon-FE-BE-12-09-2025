"""
Portfolio management API routes - Now with real Binance integration
"""

from fastapi import APIRouter, HTTPException, Query, Depends
from typing import List, Optional, Dict, Any
import logging
import time

from apps.api.deps.auth import get_current_user, AuthedUser
from apps.api.clients.supabase_client import supabase
from apps.api.utils.encryption import decrypt_value
from apps.api.binance_authenticated_client import BinanceAuthenticatedClient
from apps.api.utils.errors import NotFoundError, ValidationError, ExternalServiceError

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/portfolio", tags=["portfolio"])


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


@router.get("/holdings")
async def get_holdings(
    currency: Optional[str] = Query(None, description="Filter by currency"),
    user: AuthedUser = Depends(get_current_user)
):
    """Get user's asset holdings from Binance"""
    try:
        connection = _get_user_binance_connection(user.user_id)
        if not connection:
            raise NotFoundError("Binance connection", "Please connect your exchange first")
        
        # Decrypt API keys
        api_key = decrypt_value(connection["api_key_encrypted"])
        api_secret = decrypt_value(connection["api_secret_encrypted"])
        
        # Fetch real balances from Binance
        async with BinanceAuthenticatedClient(api_key, api_secret) as client:
            balances = await client.get_balance(asset=currency)
        
        # Format as holdings
        holdings = []
        for balance in balances:
            holdings.append({
                "currency": balance["asset"],
                "qty": balance["total"],
                "free": balance["free"],
                "locked": balance["locked"],
                "current_price": 0.0,  # TODO: Fetch current prices
                "total_value": balance["total"],  # TODO: Calculate in USDT
                "unrealized_pnl": 0.0,
                "updated_at": int(time.time() * 1000)
            })
        
        return {
            "success": True,
            "holdings": holdings,
            "count": len(holdings),
            "exchange": "binance"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching holdings: {e}")
        from apps.api.utils.errors import TradeeonError
        if isinstance(e, TradeeonError):
            raise
        raise ExternalServiceError("Binance", f"Failed to fetch holdings: {str(e)}")


@router.get("/funds")
async def get_funds(
    exchange: Optional[str] = Query(None, description="Filter by exchange"),
    user: AuthedUser = Depends(get_current_user)
):
    """Get user's available funds from Binance"""
    try:
        if exchange and exchange.lower() != "binance":
            raise ValidationError("Only Binance is currently supported")
        
        connection = _get_user_binance_connection(user.user_id)
        if not connection:
            raise HTTPException(status_code=404, detail="No active Binance connection found")
        
        # Decrypt API keys
        api_key = decrypt_value(connection["api_key_encrypted"])
        api_secret = decrypt_value(connection["api_secret_encrypted"])
        
        # Fetch real balances
        async with BinanceAuthenticatedClient(api_key, api_secret) as client:
            balances = await client.get_balance()
        
        # Format as funds
        funds = []
        for balance in balances:
            funds.append({
                "exchange": "binance",
                "currency": balance["asset"],
                "free": balance["free"],
                "locked": balance["locked"],
                "total": balance["total"],
                "updated_at": int(time.time() * 1000)
            })
        
        return {
            "success": True,
            "funds": funds,
            "count": len(funds)
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching funds: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch funds: {str(e)}")


@router.get("/summary")
async def get_portfolio_summary(user: AuthedUser = Depends(get_current_user)):
    """Get portfolio summary from Binance"""
    try:
        connection = _get_user_binance_connection(user.user_id)
        if not connection:
            raise HTTPException(status_code=404, detail="No active Binance connection found")
        
        # Decrypt API keys
        api_key = decrypt_value(connection["api_key_encrypted"])
        api_secret = decrypt_value(connection["api_secret_encrypted"])
        
        # Fetch portfolio value
        async with BinanceAuthenticatedClient(api_key, api_secret) as client:
            portfolio = await client.get_portfolio_value()
            balances = await client.get_balance()
        
        # TODO: Calculate PnL, etc. from trade history
        summary = {
            "total_value": portfolio["total_value_usdt"],
            "total_pnl": 0.0,  # TODO: Calculate from trade history
            "total_pnl_percent": 0.0,
            "day_pnl": 0.0,
            "day_pnl_percent": 0.0,
            "active_bots": 0,  # TODO: Count active bots
            "total_trades": 0,  # TODO: Count trades
            "win_rate": 0.0,
            "sharpe_ratio": 0.0,
            "max_drawdown": 0.0,
            "asset_count": portfolio["asset_count"],
            "updated_at": int(time.time() * 1000)
        }
        
        return {
            "success": True,
            "summary": summary
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching portfolio summary: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch summary: {str(e)}")


@router.get("/positions")
async def get_positions(
    symbol: Optional[str] = Query(None, description="Filter by symbol"),
    user: AuthedUser = Depends(get_current_user)
):
    """Get user's trading positions (from balances)"""
    try:
        connection = _get_user_binance_connection(user.user_id)
        if not connection:
            raise HTTPException(status_code=404, detail="No active Binance connection found")
        
        # Decrypt API keys
        api_key = decrypt_value(connection["api_key_encrypted"])
        api_secret = decrypt_value(connection["api_secret_encrypted"])
        
        # Get balances (non-zero holdings)
        async with BinanceAuthenticatedClient(api_key, api_secret) as client:
            balances = await client.get_balance()
        
        # Format as positions (only non-stablecoin assets)
        positions = []
        stablecoins = {'USDT', 'USDC', 'BUSD', 'DAI', 'TUSD'}
        
        for balance in balances:
            if balance["asset"] not in stablecoins and balance["total"] > 0:
                positions.append({
                    "symbol": f"{balance['asset']}USDT",  # Assume USDT pair
                    "qty": balance["total"],
                    "avg_price": 0.0,  # TODO: Calculate from trade history
                    "current_price": 0.0,  # TODO: Fetch current price
                    "unrealized_pnl": 0.0,
                    "unrealized_pnl_percent": 0.0,
                    "updated_at": int(time.time() * 1000)
                })
        
        if symbol:
            positions = [p for p in positions if p["symbol"] == symbol]
        
        return {
            "success": True,
            "positions": positions,
            "count": len(positions)
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching positions: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch positions: {str(e)}")


@router.get("/performance")
async def get_performance(
    period: str = Query(default="30d", description="Performance period"),
    bot_id: Optional[str] = Query(None, description="Filter by bot ID"),
    user: AuthedUser = Depends(get_current_user)
):
    """Get portfolio performance metrics"""
    try:
        # TODO: Calculate from trade history
        # For now, return basic structure
        performance = {
            "period": period,
            "total_return": 0.0,
            "annualized_return": 0.0,
            "volatility": 0.0,
            "sharpe_ratio": 0.0,
            "max_drawdown": 0.0,
            "win_rate": 0.0,
            "profit_factor": 0.0,
            "trades": 0,
            "avg_trade_duration": 0,
            "updated_at": int(time.time() * 1000)
        }
        
        return {
            "success": True,
            "performance": performance
        }
    
    except Exception as e:
        logger.error(f"Error fetching performance: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch performance: {str(e)}")
