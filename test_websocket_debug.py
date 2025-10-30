#!/usr/bin/env python3
"""
Debug script to test Binance WebSocket connection and verify real market data.
"""

import asyncio
import websockets
import json
import time

async def test_binance_websocket():
    """Test Binance WebSocket connection with debug output."""
    print("🧪 Testing Binance WebSocket connection...")
    print("=" * 50)
    
    try:
        # Connect to Binance WebSocket
        uri = "wss://stream.binance.com:9443/ws/!bookTicker"
        print(f"🔌 Connecting to: {uri}")
        
        async with websockets.connect(uri) as websocket:
            print("✅ WebSocket connected successfully!")
            print("📡 Listening for market data...")
            print("=" * 50)
            
            message_count = 0
            symbols_received = set()
            start_time = time.time()
            
            try:
                async for message in websocket:
                    message_count += 1
                    current_time = time.strftime("%H:%M:%S")
                    
                    # Parse message
                    try:
                        data = json.loads(message)
                        
                        # Handle different message formats
                        if 'data' in data:
                            ticker_data = data['data']
                        else:
                            ticker_data = data
                        
                        symbol = ticker_data.get('s', 'UNKNOWN')
                        bid = ticker_data.get('b', '0')
                        ask = ticker_data.get('a', '0')
                        
                        symbols_received.add(symbol)
                        
                        # Show first few messages in detail
                        if message_count <= 5:
                            print(f"[{current_time}] Message #{message_count}:")
                            print(f"  Symbol: {symbol}")
                            print(f"  Bid: {bid}")
                            print(f"  Ask: {ask}")
                            print(f"  Spread: {float(ask) - float(bid):.6f}")
                            print()
                        
                        # Show progress every 10 messages
                        elif message_count % 10 == 0:
                            elapsed = time.time() - start_time
                            print(f"[{current_time}] Received {message_count} messages | "
                                  f"{len(symbols_received)} unique symbols | "
                                  f"{message_count/elapsed:.1f} msg/sec")
                        
                        # Stop after 30 seconds or 100 messages
                        if time.time() - start_time > 30 or message_count >= 100:
                            break
                            
                    except json.JSONDecodeError as e:
                        print(f"❌ Failed to parse message: {e}")
                        print(f"Raw message: {message[:200]}...")
                        continue
                        
            except websockets.exceptions.ConnectionClosed:
                print("🔌 WebSocket connection closed")
                
    except Exception as e:
        print(f"❌ Connection failed: {e}")
        return False
    
    # Final summary
    elapsed = time.time() - start_time
    print("=" * 50)
    print("📊 FINAL RESULTS:")
    print(f"  Total messages received: {message_count}")
    print(f"  Unique symbols: {len(symbols_received)}")
    print(f"  Time elapsed: {elapsed:.1f} seconds")
    print(f"  Messages per second: {message_count/elapsed:.1f}")
    print(f"  Sample symbols: {', '.join(list(symbols_received)[:10])}")
    
    if message_count > 0:
        print("✅ SUCCESS: Receiving real market data from Binance!")
        return True
    else:
        print("❌ FAILED: No market data received")
        return False

if __name__ == "__main__":
    asyncio.run(test_binance_websocket())

