#!/usr/bin/env python3
"""
Simple WebSocket test to verify connection.
"""

import asyncio
import websockets
import json

async def test_simple_websocket():
    """Test simple WebSocket connection."""
    print("🧪 Testing simple WebSocket connection...")
    
    # Try different URLs
    urls = [
        "wss://stream.binance.com:9443/ws/!bookTicker",
        "wss://stream.binance.com:9443/ws/btcusdt@bookTicker",
        "wss://stream.binance.com:9443/ws/btcusdt@ticker"
    ]
    
    for url in urls:
        print(f"\n🔌 Testing: {url}")
        try:
            async with websockets.connect(url) as websocket:
                print("✅ Connected!")
                
                # Wait for messages
                message_count = 0
                async for message in websocket:
                    message_count += 1
                    print(f"📨 Message #{message_count}: {message[:200]}...")
                    
                    if message_count >= 3:
                        break
                        
                if message_count > 0:
                    print(f"✅ SUCCESS: Received {message_count} messages from {url}")
                    return True
                else:
                    print(f"❌ No messages received from {url}")
                    
        except Exception as e:
            print(f"❌ Failed to connect to {url}: {e}")
    
    return False

if __name__ == "__main__":
    asyncio.run(test_simple_websocket())

