"""FastAPI application for indicator engine."""

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict, List
import json
import asyncio
from contextlib import asynccontextmanager

from models import IndicatorRequest, IndicatorResponse, RealtimeSubscription, IndicatorUpdate
from mock_calculator import MockIndicatorCalculator as IndicatorCalculator
from data_provider import DataProviderFactory
from indicator_registry import get_all_indicators, get_indicator_config

# Global instances
calculator = IndicatorCalculator()
data_provider = DataProviderFactory.create_provider("mock")  # Use mock for testing
active_connections: Dict[str, List[WebSocket]] = {}

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    print("🚀 Starting Indicator Engine...")
    yield
    print("🛑 Shutting down Indicator Engine...")

app = FastAPI(
    title="Indicator Engine",
    description="TA-Lib powered technical indicator calculation engine",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "Indicator Engine API",
        "version": "1.0.0",
        "status": "running"
    }

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "indicator-engine"}

@app.get("/indicators")
async def get_indicators():
    """Get all available indicators."""
    indicators = get_all_indicators()
    return {
        "indicators": indicators,
        "count": len(indicators)
    }

@app.get("/indicators/{indicator_id}")
async def get_indicator(indicator_id: str):
    """Get specific indicator configuration."""
    config = get_indicator_config(indicator_id)
    if not config:
        raise HTTPException(status_code=404, detail=f"Indicator '{indicator_id}' not found")
    return config

@app.post("/calculate", response_model=IndicatorResponse)
async def calculate_indicator(request: IndicatorRequest):
    """Calculate indicator values for given data."""
    
    try:
        # Fetch price data
        price_data = await data_provider.get_klines(
            request.symbol, 
            request.interval, 
            request.data_points
        )
        
        # Calculate indicator
        response = calculator.calculate_indicator(
            price_data, 
            request.indicator, 
            request.parameters
        )
        
        # Set symbol and interval
        response.symbol = request.symbol
        response.interval = request.interval
        
        return response
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.websocket("/ws/realtime")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time indicator updates."""
    
    await websocket.accept()
    print(f"✅ WebSocket connected: {websocket.client}")
    
    try:
        while True:
            # Receive subscription request
            data = await websocket.receive_text()
            subscription_data = json.loads(data)
            
            if subscription_data.get("type") == "subscribe":
                subscription = RealtimeSubscription(**subscription_data)
                await handle_realtime_subscription(websocket, subscription)
            elif subscription_data.get("type") == "unsubscribe":
                await handle_realtime_unsubscription(websocket, subscription_data)
                
    except WebSocketDisconnect:
        print(f"🔌 WebSocket disconnected: {websocket.client}")
        await cleanup_connection(websocket)
    except Exception as e:
        print(f"❌ WebSocket error: {e}")
        await cleanup_connection(websocket)

async def handle_realtime_subscription(websocket: WebSocket, subscription: RealtimeSubscription):
    """Handle real-time indicator subscription."""
    
    subscription_key = f"{subscription.symbol}_{subscription.interval}_{subscription.indicator}"
    
    # Add connection to active connections
    if subscription_key not in active_connections:
        active_connections[subscription_key] = []
    active_connections[subscription_key].append(websocket)
    
    print(f"📊 Subscribed to {subscription_key}")
    
    # Start real-time data simulation
    asyncio.create_task(simulate_realtime_data(subscription_key, subscription))

async def handle_realtime_unsubscription(websocket: WebSocket, data: dict):
    """Handle real-time indicator unsubscription."""
    
    subscription_key = data.get("subscription_key")
    if subscription_key in active_connections:
        if websocket in active_connections[subscription_key]:
            active_connections[subscription_key].remove(websocket)
        if not active_connections[subscription_key]:
            del active_connections[subscription_key]
    
    print(f"📊 Unsubscribed from {subscription_key}")

async def simulate_realtime_data(subscription_key: str, subscription: RealtimeSubscription):
    """Simulate real-time data updates."""
    
    import random
    import time
    
    # Get initial data
    price_data = await data_provider.get_klines(
        subscription.symbol, 
        subscription.interval, 
        100  # Smaller dataset for real-time
    )
    
    # Calculate initial indicator values
    response = calculator.calculate_indicator(
        price_data, 
        subscription.indicator, 
        subscription.parameters
    )
    
    if not response.success:
        return
    
    # Get the latest indicator value
    latest_data = response.values[-1] if response.values else None
    if not latest_data:
        return
    
    # Simulate real-time updates
    while subscription_key in active_connections:
        try:
            # Generate new price data point
            last_price = latest_data['close']
            change = random.gauss(0, 0.001)  # Small random change
            new_price = last_price * (1 + change)
            
            # Create new price data point
            new_timestamp = int(time.time() * 1000)
            new_price_data = [{
                'timestamp': new_timestamp,
                'open': last_price,
                'high': max(last_price, new_price),
                'low': min(last_price, new_price),
                'close': new_price,
                'volume': random.uniform(100, 1000)
            }]
            
            # Calculate new indicator value (simplified)
            config = get_indicator_config(subscription.indicator)
            if config:
                # For simplicity, just add some random variation to the indicator
                indicator_value = latest_data.get(config.outputs[0], 0)
                if indicator_value is not None:
                    new_indicator_value = indicator_value + random.gauss(0, 0.1)
                else:
                    new_indicator_value = random.uniform(0, 100)
                
                # Create update message
                update = IndicatorUpdate(
                    symbol=subscription.symbol,
                    interval=subscription.interval,
                    indicator=subscription.indicator,
                    timestamp=new_timestamp,
                    values={config.outputs[0]: new_indicator_value}
                )
                
                # Send to all connected clients
                await broadcast_update(subscription_key, update)
                
                # Update latest data
                latest_data['close'] = new_price
                latest_data[config.outputs[0]] = new_indicator_value
            
            # Wait before next update
            await asyncio.sleep(1)  # Update every second
            
        except Exception as e:
            print(f"❌ Error in real-time simulation: {e}")
            break

async def broadcast_update(subscription_key: str, update: IndicatorUpdate):
    """Broadcast update to all connected clients."""
    
    if subscription_key in active_connections:
        message = json.dumps(update.dict())
        
        # Send to all connected clients
        for websocket in active_connections[subscription_key][:]:  # Copy list to avoid modification during iteration
            try:
                await websocket.send_text(message)
            except Exception as e:
                print(f"❌ Error sending update: {e}")
                # Remove disconnected client
                active_connections[subscription_key].remove(websocket)

async def cleanup_connection(websocket: WebSocket):
    """Clean up disconnected WebSocket connection."""
    
    for subscription_key, connections in active_connections.items():
        if websocket in connections:
            connections.remove(websocket)
            if not connections:
                del active_connections[subscription_key]

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
