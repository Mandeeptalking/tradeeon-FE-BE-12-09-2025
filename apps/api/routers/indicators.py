"""Indicators API router - computes TA-Lib indicators from streamer channel data."""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException, Query
from typing import List, Dict, Any, Tuple, Optional
import numpy as np
import talib
import json
import logging
import asyncio
import time
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/indicators", tags=["indicators"])


def parse_specs(spec_string: str) -> List[Tuple[str, Dict[str, Any]]]:
    """Parse indicator specifications string into structured format.
    
    Args:
        spec_string: "RSI(14),EMA(20),MACD(12,26,9),BB(20,2)"
        
    Returns:
        List of (indicator_name, parameters) tuples
    """
    specs = []
    if not spec_string:
        return specs
    
    for spec in spec_string.split(','):
        spec = spec.strip()
        if not spec:
            continue
            
        if '(' in spec:
            # Parse indicator with parameters
            name = spec.split('(')[0].strip().upper()
            params_str = spec.split('(')[1].rstrip(')').strip()
            params = {}
            
            if params_str:
                # Parse comma-separated parameters
                param_pairs = params_str.split(',')
                for pair in param_pairs:
                    if '=' in pair:
                        key, value = pair.split('=', 1)
                        params[key.strip()] = float(value.strip())
                    else:
                        # Positional parameters for common indicators
                        if name == "RSI":
                            params["length"] = float(pair.strip())
                        elif name in ["EMA", "SMA"]:
                            params["length"] = float(pair.strip())
                        elif name == "MACD":
                            parts = [p.strip() for p in param_pairs]
                            if len(parts) >= 1:
                                params["fast"] = float(parts[0])
                            if len(parts) >= 2:
                                params["slow"] = float(parts[1])
                            if len(parts) >= 3:
                                params["signal"] = float(parts[2])
                        elif name == "BB":
                            parts = [p.strip() for p in param_pairs]
                            if len(parts) >= 1:
                                params["length"] = float(parts[0])
                            if len(parts) >= 2:
                                params["mult"] = float(parts[1])
        else:
            # Simple indicator name without parameters
            name = spec.strip().upper()
            params = {}
        
        specs.append((name, params))
    
    return specs


def compute_all(specs: List[Tuple[str, Dict[str, Any]]], candles: List[Dict[str, Any]]) -> Dict[str, List[Dict[str, Any]]]:
    """Compute all indicators using TA-Lib.
    
    Args:
        specs: List of (indicator_name, parameters) tuples
        candles: List of candle dictionaries with keys {t, o, h, l, c, v, x}
        
    Returns:
        Dictionary mapping indicator specs to computed values
    """
    if not candles:
        return {}
    
    # Convert candles to numpy arrays
    t = np.array([c["t"] for c in candles], dtype=np.int64)
    close = np.array([c["c"] for c in candles], dtype=np.float64)
    high = np.array([c["h"] for c in candles], dtype=np.float64)
    low = np.array([c["l"] for c in candles], dtype=np.float64)
    
    out = {}
    
    for sid, params in specs:
        # Create indicator key
        if params:
            param_str = ",".join([f"{k}={v}" for k, v in params.items()])
            key = f"{sid}({param_str})"
        else:
            key = sid
        
        try:
            if sid == "RSI":
                length = int(params.get("length", 14))
                r = talib.RSI(close, timeperiod=length)
                out[key] = [
                    {"t": int(tt), "rsi": float(v)} 
                    for tt, v in zip(t, r) 
                    if not np.isnan(v)
                ]
                
            elif sid == "EMA":
                length = int(params.get("length", 20))
                e = talib.EMA(close, timeperiod=length)
                out[key] = [
                    {"t": int(tt), "ema": float(v)} 
                    for tt, v in zip(t, e) 
                    if not np.isnan(v)
                ]
                
            elif sid == "SMA":
                length = int(params.get("length", 50))
                s = talib.SMA(close, timeperiod=length)
                out[key] = [
                    {"t": int(tt), "sma": float(v)} 
                    for tt, v in zip(t, s) 
                    if not np.isnan(v)
                ]
                
            elif sid == "MACD":
                fast = int(params.get("fast", 12))
                slow = int(params.get("slow", 26))
                signal = int(params.get("signal", 9))
                macd, sig, hist = talib.MACD(close, fastperiod=fast, slowperiod=slow, signalperiod=signal)
                out[key] = [
                    {"t": int(tt), "macd": float(m), "signal": float(s), "hist": float(h)}
                    for tt, m, s, h in zip(t, macd, sig, hist)
                    if not (np.isnan(m) or np.isnan(s) or np.isnan(h))
                ]
                
            elif sid == "BB":
                length = int(params.get("length", 20))
                mult = float(params.get("mult", 2.0))
                upper, mid, lower = talib.BBANDS(close, timeperiod=length, nbdevup=mult, nbdevdn=mult, matype=0)
                out[key] = [
                    {"t": int(tt), "upper": float(u), "basis": float(m), "lower": float(l)}
                    for tt, u, m, l in zip(t, upper, mid, lower)
                    if not (np.isnan(u) or np.isnan(m) or np.isnan(l))
                ]
                
            else:
                logger.warning(f"Unknown indicator: {sid}")
                
        except Exception as e:
            logger.error(f"Error computing {sid}: {e}")
            out[key] = []
    
    return out


async def get_channel_data(symbol: str, interval: str, limit: int = 2000) -> List[Dict[str, Any]]:
    """Get channel data from streamer service."""
    from apps.api.services.channel_service import channel_service
    return await channel_service.get_channel_data(symbol, interval, limit)


@router.get("/snapshot")
async def get_snapshot(
    symbol: str = Query(..., description="Trading symbol"),
    interval: str = Query(..., description="Time interval"),
    list: str = Query(..., description="Comma-separated indicator specifications")
):
    """Get snapshot of candles and computed indicators."""
    try:
        # Parse indicator specifications
        specs = parse_specs(list)
        if not specs:
            raise HTTPException(status_code=400, detail="No valid indicators specified")
        
        # Get channel data
        candles = await get_channel_data(symbol, interval, 2000)
        if not candles:
            raise HTTPException(status_code=404, detail=f"No data found for {symbol}:{interval}")
        
        # Compute indicators
        indicators = compute_all(specs, candles)
        
        return {
            "success": True,
            "symbol": symbol,
            "interval": interval,
            "candles": candles,
            "indicators": indicators,
            "count": len(candles)
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting indicator snapshot: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.websocket("/stream")
async def websocket_stream(
    websocket: WebSocket,
    symbol: str = Query(..., description="Trading symbol"),
    interval: str = Query(..., description="Time interval"),
    list: str = Query(..., description="Comma-separated indicator specifications")
):
    """WebSocket endpoint for real-time indicator updates."""
    await websocket.accept()
    
    try:
        # Parse indicator specifications
        specs = parse_specs(list)
        if not specs:
            await websocket.send_text(json.dumps({
                "type": "error",
                "message": "No valid indicators specified"
            }))
            return
        
        # Send initial snapshot
        candles = await get_channel_data(symbol, interval, 2000)
        if candles:
            indicators = compute_all(specs, candles)
            
            snapshot = {
                "type": "snapshot",
                "symbol": symbol,
                "interval": interval,
                "candles": candles,
                "indicators": indicators
            }
            await websocket.send_text(json.dumps(snapshot))
        
        # TODO: Subscribe to actual channel events from ChannelsHub
        # For now, simulate real-time updates
        import time
        update_count = 0
        
        while True:
            await asyncio.sleep(1)  # Simulate 1-second updates
            
            # Generate mock new candle
            current_time = int(time.time() * 1000)
            new_candle = {
                "t": current_time,
                "o": 50000.0 + update_count * 10,
                "h": 50000.0 + update_count * 10 + 100,
                "l": 50000.0 + update_count * 10 - 100,
                "c": 50000.0 + update_count * 10 + 50,
                "v": 1000.0,
                "x": False
            }
            
            # Send kline update
            kline_update = {
                "type": "kline",
                "symbol": symbol,
                "interval": interval,
                "candle": new_candle
            }
            await websocket.send_text(json.dumps(kline_update))
            
            # Recompute indicators with recent data (last 300 candles for warmup)
            recent_candles = await get_channel_data(symbol, interval, 300)
            recent_candles.append(new_candle)  # Add the new candle
            
            indicators_update = compute_all(specs, recent_candles)
            
            # Send indicator updates (only latest values)
            if indicators_update:
                latest_updates = {}
                for key, values in indicators_update.items():
                    if values:  # Only if we have valid values
                        latest_updates[key] = values[-1]  # Get the last computed value
                
                if latest_updates:
                    update_message = {
                        "type": "indicators:update",
                        "symbol": symbol,
                        "interval": interval,
                        "values": latest_updates
                    }
                    await websocket.send_text(json.dumps(update_message))
            
            update_count += 1
    
    except WebSocketDisconnect:
        logger.info(f"WebSocket client disconnected for {symbol}:{interval}")
    except Exception as e:
        logger.error(f"WebSocket error for {symbol}:{interval}: {e}")
        try:
            await websocket.send_text(json.dumps({
                "type": "error",
                "message": str(e)
            }))
        except:
            pass


@router.get("/health")
async def health_check():
    """Health check endpoint for indicators service."""
    try:
        # Test TA-Lib availability
        test_data = np.array([1.0, 2.0, 3.0, 4.0, 5.0], dtype=np.float64)
        rsi = talib.RSI(test_data, timeperiod=2)
        
        return {
            "status": "healthy",
            "service": "indicators",
            "talib_available": True,
            "timestamp": int(time.time() * 1000)
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "service": "indicators",
            "talib_available": False,
            "error": str(e),
            "timestamp": int(time.time() * 1000)
        }
