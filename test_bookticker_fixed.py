#!/usr/bin/env python3
"""
Test script for !bookTicker stream with correct implementation.
"""

import asyncio
import websockets
import json
import time

async def test_bookticker_fixed():
    """Test !bookTicker stream with correct format."""
    print("🧪 Testing !bookTicker stream (FIXED)...")
    print("=" * 60)
    
    try:
        # Connect to !bookTicker stream
        stream_url = "wss://stream.binance.com:9443/ws/!bookTicker"
        print(f"🔌 Connecting to: {stream_url}")
        print("⏱️  Note: Updates every 5 seconds...")
        
        websocket = await websockets.connect(stream_url)
        print("✅ Connected successfully!")
        
        # Listen for messages
        message_count = 0
        start_time = time.time()
        major_pairs_found = set()
        
        print("📨 Listening for messages (waiting for 5s updates)...")
        
        async for message in websocket:
            message_count += 1
            
            if message_count <= 3:
                print(f"  📨 Message #{message_count}: {message[:200]}...")
            
            try:
                data = json.loads(message)
                
                # Check event type
                event_type = data.get('e', 'unknown')
                if event_type != 'bookTicker':
                    print(f"  ⚠️  Unexpected event type: {event_type}")
                    continue
                
                # Extract data
                symbol = data.get('s', 'UNKNOWN')
                bid_price = data.get('b', '0')
                bid_qty = data.get('B', '0')
                ask_price = data.get('a', '0')
                ask_qty = data.get('A', '0')
                update_id = data.get('u', 0)
                event_time = data.get('E', 0)
                
                # Track major pairs
                if symbol in ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'ADAUSDT', 'SOLUSDT']:
                    major_pairs_found.add(symbol)
                    spread = float(ask_price) - float(bid_price)
                    spread_pct = (spread / float(ask_price)) * 100 if float(ask_price) > 0 else 0
                    print(f"  🎯 MAJOR: {symbol} | Bid={bid_price} | Ask={ask_price} | Spread={spread_pct:.3f}% | Qty: {bid_qty}/{ask_qty}")
                
                # Show first few messages
                if message_count <= 10:
                    spread = float(ask_price) - float(bid_price)
                    spread_pct = (spread / float(ask_price)) * 100 if float(ask_price) > 0 else 0
                    print(f"  📈 {symbol}: Bid={bid_price}, Ask={ask_price}, Spread={spread_pct:.3f}%")
                
            except json.JSONDecodeError as e:
                print(f"  ❌ JSON Error: {e}")
                print(f"  Raw message: {message[:100]}...")
            except Exception as e:
                print(f"  ❌ Processing Error: {e}")
            
            # Stop after 30 seconds or 100 messages
            if time.time() - start_time > 30 or message_count >= 100:
                break
        
        print(f"\n📊 Test Results:")
        print(f"  Messages received: {message_count}")
        print(f"  Duration: {time.time() - start_time:.1f} seconds")
        print(f"  Major pairs found: {len(major_pairs_found)}")
        print(f"  Major pairs: {', '.join(sorted(major_pairs_found))}")
        
        if message_count == 0:
            print("  ❌ No messages received - stream may be down")
        elif message_count < 5:
            print("  ⚠️  Few messages - may be network issues or 5s update cycle")
        else:
            print("  ✅ Stream working! (5s update cycle is normal)")
        
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        if 'websocket' in locals():
            await websocket.close()
            print("🔌 WebSocket closed")

if __name__ == "__main__":
    asyncio.run(test_bookticker_fixed())

