#!/usr/bin/env python3
"""
Fixed Binance WebSocket test using correct endpoints.
"""

import asyncio
import websockets
import json

async def test_binance_websocket_fixed():
    """Test Binance WebSocket with correct endpoints."""
    print("🧪 Testing Binance WebSocket with correct endpoints...")
    print("=" * 60)
    
    # Test different WebSocket endpoints
    test_cases = [
        {
            "name": "Single symbol ticker",
            "url": "wss://stream.binance.com:9443/ws/btcusdt@ticker",
            "expected": "BTCUSDT ticker data"
        },
        {
            "name": "Single symbol bookTicker", 
            "url": "wss://stream.binance.com:9443/ws/btcusdt@bookTicker",
            "expected": "BTCUSDT order book data"
        },
        {
            "name": "Multiple symbols combined",
            "url": "wss://stream.binance.com:9443/stream?streams=btcusdt@ticker/ethusdt@ticker",
            "expected": "BTC and ETH ticker data"
        },
        {
            "name": "All symbols ticker (limited)",
            "url": "wss://stream.binance.com:9443/ws/!ticker@arr",
            "expected": "All symbols ticker data"
        }
    ]
    
    for i, test in enumerate(test_cases, 1):
        print(f"\n{i}. {test['name']}")
        print(f"   URL: {test['url']}")
        print(f"   Expected: {test['expected']}")
        print("-" * 40)
        
        try:
            async with websockets.connect(test['url']) as websocket:
                print("   ✅ Connected successfully!")
                
                message_count = 0
                start_time = asyncio.get_event_loop().time()
                
                try:
                    # Wait for messages with timeout
                    while message_count < 5:
                        try:
                            message = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                            message_count += 1
                            
                            # Parse and display message
                            try:
                                data = json.loads(message)
                                print(f"   📨 Message #{message_count}: {json.dumps(data, indent=2)[:200]}...")
                                
                                # Check for specific data
                                if isinstance(data, dict):
                                    if 's' in data:  # symbol
                                        print(f"   📈 Symbol: {data['s']}")
                                    if 'c' in data:  # close price
                                        print(f"   💰 Price: {data['c']}")
                                    if 'b' in data and 'a' in data:  # bid/ask
                                        print(f"   📊 Bid: {data['b']}, Ask: {data['a']}")
                                elif isinstance(data, list):
                                    print(f"   📋 Array with {len(data)} items")
                                    
                            except json.JSONDecodeError:
                                print(f"   📨 Raw message #{message_count}: {message[:100]}...")
                                
                        except asyncio.TimeoutError:
                            print(f"   ⏰ No messages received within 5 seconds")
                            break
                            
                except websockets.exceptions.ConnectionClosed:
                    print("   🔌 Connection closed by server")
                    
                elapsed = asyncio.get_event_loop().time() - start_time
                if message_count > 0:
                    print(f"   ✅ SUCCESS: Received {message_count} messages in {elapsed:.1f}s")
                    return True
                else:
                    print(f"   ❌ No messages received")
                    
        except Exception as e:
            print(f"   ❌ Connection failed: {e}")
    
    print(f"\n❌ All WebSocket endpoints failed")
    return False

if __name__ == "__main__":
    asyncio.run(test_binance_websocket_fixed())

