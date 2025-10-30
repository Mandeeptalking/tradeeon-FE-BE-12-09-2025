#!/usr/bin/env python3
"""
Simple test script to verify depth scanner functionality.
"""

import asyncio
import sys
from pathlib import Path

# Add the parent directory to Python path
sys.path.insert(0, str(Path(__file__).parent))

from smartbots.arb.depth_feed import subscribe_to_depth
from smartbots.arb.vwap import validate_orderbook, get_top_of_book


async def test_depth_feed():
    """Test depth feed functionality."""
    print("🧪 Testing depth feed...")
    
    try:
        # Test with a small set of symbols
        test_symbols = {"BTCUSDT", "ETHUSDT", "BNBUSDT"}
        
        depth_feed = await subscribe_to_depth(test_symbols, levels=5, max_concurrent=3)
        print("✅ Depth feed connected successfully!")
        
        # Wait for some order books
        print("⏳ Waiting for order books...")
        for i in range(10):
            await asyncio.sleep(1)
            orderbook_count = depth_feed.get_orderbook_count()
            print(f"   Order books received: {orderbook_count}")
            
            if orderbook_count >= 3:
                print("✅ Got all required order books!")
                break
        
        # Show some order books
        for symbol in test_symbols:
            orderbook = depth_feed.get_orderbook(symbol)
            if orderbook and validate_orderbook(orderbook):
                best_bid, best_ask = get_top_of_book(orderbook)
                print(f"   {symbol}: bid={best_bid:.4f}, ask={best_ask:.4f}")
            else:
                print(f"   {symbol}: No valid order book")
        
        await depth_feed.disconnect()
        print("👋 Disconnected")
        
    except Exception as e:
        print(f"❌ Test failed: {e}")


if __name__ == "__main__":
    asyncio.run(test_depth_feed())

