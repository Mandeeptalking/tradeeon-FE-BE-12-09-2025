"""Market data API routes - thin wrapper around streamer service."""

from fastapi import APIRouter, HTTPException, Query, WebSocket, WebSocketDisconnect
from typing import List, Optional
import json
import logging

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..', '..'))

from shared.contracts.market import Snapshot
from shared.enums import Interval, QuoteAsset

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/market", tags=["market"])


@router.get("/symbols")
async def get_symbols(
    venue: str = Query(default="binance", description="Exchange venue"),
    quote: str = Query(default="USDT", description="Quote asset filter")
):
    """Get available trading symbols."""
    try:
        # TODO: Integrate with Binance source
        # For now, return mock data
        symbols = [
            {"symbol": "BTCUSDT", "baseAsset": "BTC", "quoteAsset": "USDT", "status": "TRADING"},
            {"symbol": "ETHUSDT", "baseAsset": "ETH", "quoteAsset": "USDT", "status": "TRADING"},
            {"symbol": "BNBUSDT", "baseAsset": "BNB", "quoteAsset": "USDT", "status": "TRADING"},
        ]
        
        if quote != "ALL":
            symbols = [s for s in symbols if s["quoteAsset"] == quote]
        
        return {
            "success": True,
            "symbols": symbols,
            "count": len(symbols),
            "venue": venue
        }
    
    except Exception as e:
        logger.error(f"Error fetching symbols: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/klines")
async def get_klines(
    symbol: str = Query(..., description="Trading symbol"),
    interval: str = Query(default="1m", description="Time interval"),
    limit: int = Query(default=1000, ge=1, le=1000, description="Number of candles")
):
    """Get historical kline data."""
    try:
        # TODO: Integrate with streamer service or Binance source
        # For now, return mock data
        import time
        current_time = int(time.time() * 1000)
        
        candles = []
        for i in range(limit):
            candles.append({
                "t": current_time - (limit - i) * 60000,  # 1 minute intervals
                "o": 50000.0 + i * 10,
                "h": 50000.0 + i * 10 + 100,
                "l": 50000.0 + i * 10 - 100,
                "c": 50000.0 + i * 10 + 50,
                "v": 1000.0,
                "x": True
            })
        
        return {
            "success": True,
            "symbol": symbol,
            "interval": interval,
            "klines": candles,
            "count": len(candles)
        }
    
    except Exception as e:
        logger.error(f"Error fetching klines: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.websocket("/stream")
async def websocket_stream(websocket: WebSocket):
    """WebSocket endpoint for real-time market data streaming."""
    await websocket.accept()
    
    try:
        # TODO: Integrate with streamer WebSocket server
        # For now, send mock data
        import asyncio
        import time
        
        while True:
            # Send mock candle data
            message = {
                "type": "kline",
                "symbol": "BTCUSDT",
                "interval": "1m",
                "candle": {
                    "t": int(time.time() * 1000),
                    "o": 50000.0,
                    "h": 50100.0,
                    "l": 49900.0,
                    "c": 50050.0,
                    "v": 1000.0,
                    "x": False
                }
            }
            
            await websocket.send_text(json.dumps(message))
            await asyncio.sleep(1)  # Send every second
    
    except WebSocketDisconnect:
        logger.info("WebSocket client disconnected")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        await websocket.close()


@router.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "market",
        "timestamp": int(time.time() * 1000)
    }
