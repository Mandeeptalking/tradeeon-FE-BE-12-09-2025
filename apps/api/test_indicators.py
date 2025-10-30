"""Test script for indicators API."""

import asyncio
import aiohttp
import json
import websockets


async def test_snapshot():
    """Test the indicators snapshot endpoint."""
    url = "http://localhost:8000/indicators/snapshot"
    params = {
        "symbol": "BTCUSDT",
        "interval": "1m",
        "list": "RSI(14),EMA(20),MACD(12,26,9),BB(20,2)"
    }
    
    async with aiohttp.ClientSession() as session:
        async with session.get(url, params=params) as response:
            if response.status == 200:
                data = await response.json()
                print("✅ Snapshot test passed")
                print(f"   Candles: {len(data['candles'])}")
                print(f"   Indicators: {list(data['indicators'].keys())}")
                
                # Show sample indicator data
                for indicator_name, values in data['indicators'].items():
                    if values:
                        print(f"   {indicator_name}: {len(values)} values, latest: {values[-1]}")
            else:
                print(f"❌ Snapshot test failed: {response.status}")
                print(await response.text())


async def test_websocket():
    """Test the indicators WebSocket endpoint."""
    uri = "ws://localhost:8000/indicators/stream?symbol=BTCUSDT&interval=1m&list=RSI(14),EMA(20)"
    
    try:
        async with websockets.connect(uri) as websocket:
            print("✅ WebSocket connected")
            
            # Wait for snapshot
            snapshot = await websocket.recv()
            data = json.loads(snapshot)
            print(f"   Received snapshot: {data['type']}")
            print(f"   Candles: {len(data['candles'])}")
            print(f"   Indicators: {list(data['indicators'].keys())}")
            
            # Wait for a few updates
            for i in range(3):
                message = await websocket.recv()
                data = json.loads(message)
                print(f"   Update {i+1}: {data['type']}")
                
                if data['type'] == 'indicators:update':
                    print(f"     Values: {list(data['values'].keys())}")
    
    except Exception as e:
        print(f"❌ WebSocket test failed: {e}")


async def test_health():
    """Test the health check endpoint."""
    url = "http://localhost:8000/indicators/health"
    
    async with aiohttp.ClientSession() as session:
        async with session.get(url) as response:
            if response.status == 200:
                data = await response.json()
                print("✅ Health check passed")
                print(f"   Status: {data['status']}")
                print(f"   TA-Lib available: {data['talib_available']}")
            else:
                print(f"❌ Health check failed: {response.status}")


async def main():
    """Run all tests."""
    print("🧪 Testing Indicators API...")
    print()
    
    print("1. Testing health check...")
    await test_health()
    print()
    
    print("2. Testing snapshot endpoint...")
    await test_snapshot()
    print()
    
    print("3. Testing WebSocket stream...")
    await test_websocket()
    print()
    
    print("✅ All tests completed!")


if __name__ == "__main__":
    asyncio.run(main())


