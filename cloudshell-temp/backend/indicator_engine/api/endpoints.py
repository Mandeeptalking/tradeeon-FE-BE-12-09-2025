"""
REST API Endpoints for Indicator Engine

Provides endpoints for:
- Chart snapshots with indicators
- Individual indicator values at specific timestamps
- WebSocket streaming for real-time updates
- Strategy engine integration
"""

from fastapi import APIRouter, HTTPException, Query, WebSocket, WebSocketDisconnect, Depends
from fastapi.responses import JSONResponse
from typing import List, Optional, Dict, Any, Union
from pydantic import BaseModel, Field
import time
import logging
import asyncio
import json
from datetime import datetime

from ..core.engine import IndicatorEngine
from ..core.registry import IndicatorRegistry
from ..core.cache import IndicatorCache, CacheConfig
from ..core.ring_buffer import NormalizedKline

logger = logging.getLogger(__name__)

# Global instances (would be dependency injected in real app)
engine = IndicatorEngine()
cache = IndicatorCache()
registry = IndicatorRegistry()

router = APIRouter(prefix="/v1", tags=["indicators"])


class IndicatorValueRequest(BaseModel):
    """Request model for indicator value lookup"""
    symbol: str = Field(..., description="Trading symbol (e.g., BTCUSDT)")
    timeframe: str = Field(..., alias="tf", description="Timeframe (e.g., 1m, 5m, 1h)")
    indicator_id: str = Field(..., alias="id", description="Indicator spec (e.g., EMA@1.2.0@20)")
    timestamp: int = Field(..., alias="t", description="Unix timestamp in milliseconds")


class IndicatorValueResponse(BaseModel):
    """Response model for indicator value"""
    symbol: str
    timeframe: str
    indicator_id: str
    full_indicator_id: str  # Versioned ID (e.g., EMA@1.2.0)
    timestamp: int
    values: Dict[str, Optional[float]]  # e.g., {"ema": 45123.45}
    is_valid: bool
    warmup_complete: bool
    calculation_time_ms: float
    cached: bool = False


class ChartSnapshotRequest(BaseModel):
    """Request model for chart snapshot"""
    symbol: str
    timeframe: str = Field(default="1h", alias="tf")
    indicators: List[str] = Field(default_factory=list, description="List of indicator specs")
    max_bars: int = Field(default=1000, ge=1, le=10000)
    include_warmup: bool = Field(default=False, description="Include warmup period data")


class ChartSnapshotResponse(BaseModel):
    """Response model for chart snapshot"""
    symbol: str
    timeframe: str
    total_bars: int
    klines: List[Dict[str, Any]]
    indicators: Dict[str, Dict[str, Any]]
    timestamp: int
    cache_hit: bool = False
    calculation_time_ms: float
    warmup_masked: bool = True


@router.get("/indicator/value", response_model=IndicatorValueResponse)
async def get_indicator_value(
    symbol: str = Query(..., description="Trading symbol"),
    tf: str = Query(..., description="Timeframe"),
    id: str = Query(..., description="Indicator specification (e.g., EMA@1.2.0@20)"),
    t: int = Query(..., description="Unix timestamp in milliseconds")
):
    """
    Get exact indicator value at specific timestamp
    
    Used by strategy engines and backtests for reproducible calculations.
    Supports versioned indicators for consistency.
    
    Examples:
    - /v1/indicator/value?symbol=BTCUSDT&tf=1h&id=EMA@20&t=1636934400000
    - /v1/indicator/value?symbol=ETHUSDT&tf=5m&id=RSI@1.2.0@14&t=1636934400000
    - /v1/indicator/value?symbol=BTCUSDT&tf=1h&id=MACD@12,26,9&t=1636934400000
    """
    start_time = time.time()
    
    try:
        # Parse and validate indicator spec
        try:
            indicator_instance, full_id = registry.create_indicator(id)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=f"Invalid indicator specification: {e}")
        
        # Check cache first
        cached_value = await cache.get_indicator(symbol, tf, full_id)
        if cached_value and cached_value.get('timestamp') == t:
            calc_time = (time.time() - start_time) * 1000
            return IndicatorValueResponse(
                symbol=symbol,
                timeframe=tf,
                indicator_id=id,
                full_indicator_id=full_id,
                timestamp=t,
                values=cached_value.get('values', {}),
                is_valid=cached_value.get('is_valid', False),
                warmup_complete=cached_value.get('warmup_complete', False),
                calculation_time_ms=calc_time,
                cached=True
            )
        
        # Get historical data up to timestamp
        klines = engine.buffer_store.get_all_klines(symbol, tf)
        
        if not klines:
            raise HTTPException(
                status_code=404, 
                detail=f"No data found for {symbol} {tf}"
            )
        
        # Find the exact timestamp or closest before
        target_kline = None
        kline_index = -1
        
        for i, kline in enumerate(klines):
            if kline.timestamp == t:
                target_kline = kline
                kline_index = i
                break
            elif kline.timestamp < t:
                target_kline = kline
                kline_index = i
            else:
                break
        
        if target_kline is None:
            raise HTTPException(
                status_code=404,
                detail=f"No data available at or before timestamp {t}"
            )
        
        # Calculate indicator value by replaying history up to target timestamp
        temp_indicator = registry.create_indicator(id)[0]
        
        # Process all klines up to and including target
        for i in range(kline_index + 1):
            kline = klines[i]
            if i == 0:
                result = temp_indicator.finalize_bar(kline)
            else:
                result = temp_indicator.finalize_bar(kline)
        
        # Get final result
        final_result = temp_indicator.finalize_bar(target_kline)
        
        # Prepare response
        calc_time = (time.time() - start_time) * 1000
        
        response = IndicatorValueResponse(
            symbol=symbol,
            timeframe=tf,
            indicator_id=id,
            full_indicator_id=full_id,
            timestamp=target_kline.timestamp,
            values=final_result.get_all_values(),
            is_valid=final_result.is_complete,
            warmup_complete=temp_indicator.is_warmed_up(),
            calculation_time_ms=calc_time,
            cached=False
        )
        
        # Cache the result
        cache_data = {
            'timestamp': target_kline.timestamp,
            'values': response.values,
            'is_valid': response.is_valid,
            'warmup_complete': response.warmup_complete
        }
        await cache.set_indicator(symbol, tf, full_id, cache_data)
        
        return response
        
    except Exception as e:
        logger.error(f"Error getting indicator value: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/chart/snapshot", response_model=ChartSnapshotResponse)
async def get_chart_snapshot(
    symbol: str = Query(..., description="Trading symbol"),
    tf: str = Query(default="1h", description="Timeframe"),
    indicators: List[str] = Query(default=[], description="Indicator specifications"),
    max_bars: int = Query(default=1000, ge=1, le=10000, description="Maximum bars to return"),
    include_warmup: bool = Query(default=False, description="Include warmup period")
):
    """
    Get chart snapshot with klines and indicators
    
    Returns data formatted for KLineCharts consumption.
    Supports caching for sub-100ms latency on popular pairs.
    
    Examples:
    - /v1/chart/snapshot?symbol=BTCUSDT&tf=1h&max_bars=500
    - /v1/chart/snapshot?symbol=ETHUSDT&tf=5m&indicators=EMA@20,RSI@14&max_bars=1000
    """
    start_time = time.time()
    
    try:
        # Check cache first
        cache_key_indicators = indicators if indicators else []
        cached_snapshot = await cache.get_snapshot(symbol, tf, cache_key_indicators, max_bars)
        
        if cached_snapshot:
            calc_time = (time.time() - start_time) * 1000
            cached_snapshot['cache_hit'] = True
            cached_snapshot['calculation_time_ms'] = calc_time
            return ChartSnapshotResponse(**cached_snapshot)
        
        # Generate snapshot from engine
        snapshot = engine.get_chart_snapshot(
            symbol=symbol,
            timeframe=tf,
            indicators=indicators,
            max_bars=max_bars
        )
        
        # Apply warmup masking if requested
        if not include_warmup:
            for indicator_id, indicator_data in snapshot['indicators'].items():
                values = indicator_data.get('values', [])
                spec = indicator_data.get('spec', {})
                warmup_period = spec.get('warmup', 0)
                
                # Mask warmup period values
                for i, value_point in enumerate(values):
                    if i < warmup_period:
                        for key in value_point.keys():
                            if key != 'timestamp':
                                value_point[key] = None
        
        calc_time = (time.time() - start_time) * 1000
        
        response_data = {
            **snapshot,
            'cache_hit': False,
            'calculation_time_ms': calc_time
        }
        
        # Cache the result
        await cache.set_snapshot(symbol, tf, response_data, indicators, max_bars)
        
        return ChartSnapshotResponse(**response_data)
        
    except Exception as e:
        logger.error(f"Error getting chart snapshot: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/indicators/registry")
async def get_indicator_registry():
    """Get available indicators and their versions"""
    return {
        'registry': registry.get_registry_info(),
        'cache_status': cache.get_cache_status(),
        'engine_stats': engine.get_stats()
    }


@router.post("/indicators/register")
async def register_indicator(
    indicator_id: str,
    version: str = "1.0.0",
    set_as_default: bool = True
):
    """Register a new indicator (dev endpoint)"""
    # This would be used for dynamic indicator registration
    # For now, return registry info
    return {"message": "Dynamic registration not implemented", "registry": registry.get_registry_info()}


class WebSocketManager:
    """Manages WebSocket connections for real-time streaming"""
    
    def __init__(self):
        self.connections: Dict[str, WebSocket] = {}
        self.subscriptions: Dict[str, Dict[str, Any]] = {}
    
    async def connect(self, websocket: WebSocket, client_id: str):
        """Accept WebSocket connection"""
        await websocket.accept()
        self.connections[client_id] = websocket
        logger.info(f"WebSocket connected: {client_id}")
    
    def disconnect(self, client_id: str):
        """Remove WebSocket connection"""
        if client_id in self.connections:
            del self.connections[client_id]
        if client_id in self.subscriptions:
            del self.subscriptions[client_id]
        logger.info(f"WebSocket disconnected: {client_id}")
    
    async def send_to_client(self, client_id: str, data: Dict[str, Any]):
        """Send data to specific client"""
        if client_id in self.connections:
            try:
                await self.connections[client_id].send_text(json.dumps(data))
            except Exception as e:
                logger.error(f"Error sending to {client_id}: {e}")
                self.disconnect(client_id)
    
    async def broadcast_update(self, symbol: str, timeframe: str, update_data: Dict[str, Any]):
        """Broadcast update to subscribed clients"""
        for client_id, subscription in self.subscriptions.items():
            if (subscription.get('symbol') == symbol and 
                subscription.get('timeframe') == timeframe):
                await self.send_to_client(client_id, update_data)


ws_manager = WebSocketManager()


@router.websocket("/stream")
async def websocket_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint for real-time chart updates
    
    Protocol:
    1. Client sends subscription: {"action": "subscribe", "symbol": "BTCUSDT", "timeframe": "1h", "indicators": ["EMA@20"]}
    2. Server sends updates: {"type": "tick"|"bar_close", "symbol": "BTCUSDT", "kline": {...}, "indicators": {...}}
    3. Client sends param changes: {"action": "update_params", "indicators": ["EMA@50"]}
    """
    client_id = f"ws_{int(time.time() * 1000)}"
    await ws_manager.connect(websocket, client_id)
    
    try:
        while True:
            # Receive message from client
            data = await websocket.receive_text()
            message = json.loads(data)
            
            action = message.get('action')
            
            if action == 'subscribe':
                # Subscribe to symbol/timeframe/indicators
                symbol = message.get('symbol')
                timeframe = message.get('timeframe')
                indicators = message.get('indicators', [])
                max_bars = message.get('max_bars', 1000)
                
                # Store subscription
                ws_manager.subscriptions[client_id] = {
                    'symbol': symbol,
                    'timeframe': timeframe,
                    'indicators': indicators,
                    'max_bars': max_bars
                }
                
                # Add to engine
                engine.add_subscription(client_id, symbol, timeframe, indicators, max_bars)
                
                # Send initial snapshot
                snapshot = await get_chart_snapshot(symbol, timeframe, indicators, max_bars)
                await ws_manager.send_to_client(client_id, {
                    'type': 'snapshot',
                    'data': snapshot.dict()
                })
                
            elif action == 'update_params':
                # Update indicator parameters
                indicators = message.get('indicators', [])
                
                if client_id in ws_manager.subscriptions:
                    subscription = ws_manager.subscriptions[client_id]
                    subscription['indicators'] = indicators
                    
                    # Reconnect with new parameters
                    engine.remove_subscription(client_id)
                    engine.add_subscription(
                        client_id,
                        subscription['symbol'],
                        subscription['timeframe'],
                        indicators,
                        subscription['max_bars']
                    )
                    
                    # Send updated snapshot
                    snapshot = await get_chart_snapshot(
                        subscription['symbol'],
                        subscription['timeframe'],
                        indicators,
                        subscription['max_bars']
                    )
                    await ws_manager.send_to_client(client_id, {
                        'type': 'params_updated',
                        'data': snapshot.dict()
                    })
            
            elif action == 'ping':
                # Heartbeat
                await ws_manager.send_to_client(client_id, {'type': 'pong'})
                
    except WebSocketDisconnect:
        ws_manager.disconnect(client_id)
        engine.remove_subscription(client_id)
    except Exception as e:
        logger.error(f"WebSocket error for {client_id}: {e}")
        ws_manager.disconnect(client_id)
        engine.remove_subscription(client_id)


# Event handlers for engine updates
def on_tick_update(event_data: Dict[str, Any]):
    """Handle tick updates from engine"""
    asyncio.create_task(
        ws_manager.broadcast_update(
            event_data['symbol'],
            event_data['timeframe'],
            {
                'type': 'tick',
                'symbol': event_data['symbol'],
                'timeframe': event_data['timeframe'],
                'kline': event_data['kline'],
                'indicators': event_data['indicators'],
                'timestamp': event_data['timestamp']
            }
        )
    )


def on_bar_close(event_data: Dict[str, Any]):
    """Handle bar close events from engine"""
    asyncio.create_task(
        ws_manager.broadcast_update(
            event_data['symbol'],
            event_data['timeframe'],
            {
                'type': 'bar_close',
                'symbol': event_data['symbol'],
                'timeframe': event_data['timeframe'],
                'kline': event_data['kline'],
                'indicators': event_data['indicators'],
                'timestamp': event_data['timestamp']
            }
        )
    )


# Register event handlers
engine.on_tick_callbacks.append(on_tick_update)
engine.on_bar_close_callbacks.append(on_bar_close)

