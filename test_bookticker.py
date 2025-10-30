#!/usr/bin/env python3
"""
Test script to debug !bookTicker stream.
"""

import asyncio
import websockets
import json
import time

async def test_bookticker():
    """Test !bookTicker stream directly."""
    print("🧪 Testing !bookTicker stream...")
    print("=" * 50)
    
    try:
        # Connect to !bookTicker stream
        stream_url = "wss://stream.binance.com:9443/ws/!bookTicker"
        print(f"🔌 Connecting to: {stream_url}")
        
        websocket = await websockets.connect(stream_url)
        print("✅ Connected successfully!")
        
        # Listen for messages
        message_count = 0
        start_time = time.time()
        
        print("📨 Listening for messages...")
        
        async for message in websocket:
            message_count += 1
            
            if message_count <= 5:
                print(f"  📨 Message #{message_count}: {message[:200]}...")
            
            try:
                data = json.loads(message)
                symbol = data.get('s', 'UNKNOWN')
                bid = data.get('b', '0')
                ask = data.get('a', '0')
                
                if message_count <= 10:
                    print(f"  📈 {symbol}: Bid={bid}, Ask={ask}")
                
                # Check for major pairs
                if symbol in ['BTCUSDT', 'ETHUSDT', 'BNBUSDT']:
                    print(f"  🎯 MAJOR PAIR: {symbol} - Bid={bid}, Ask={ask}")
                
            except json.JSONDecodeError as e:
                print(f"  ❌ JSON Error: {e}")
                print(f"  Raw message: {message[:100]}...")
            
            # Stop after 30 seconds or 100 messages
            if time.time() - start_time > 30 or message_count >= 100:
                break
        
        print(f"\n📊 Test Results:")
        print(f"  Messages received: {message_count}")
        print(f"  Duration: {time.time() - start_time:.1f} seconds")
        
        if message_count == 0:
            print("  ❌ No messages received - stream may be down or filtered")
        elif message_count < 10:
            print("  ⚠️  Very few messages - may be network issues")
        else:
            print("  ✅ Stream working normally")
        
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        if 'websocket' in locals():
            await websocket.close()
            print("🔌 WebSocket closed")

if __name__ == "__main__":
    asyncio.run(test_bookticker())

