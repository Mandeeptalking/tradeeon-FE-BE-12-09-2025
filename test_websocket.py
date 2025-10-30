#!/usr/bin/env python3
"""
Simple test script to verify WebSocket connection.
"""

import asyncio
import sys
from pathlib import Path

# Add the parent directory to Python path
sys.path.insert(0, str(Path(__file__).parent))

from smartbots.arb.price_feed import connect_to_binance


async def test_connection():
    """Test WebSocket connection."""
    print("🧪 Testing WebSocket connection...")
    
    try:
        # Test with a small set of symbols
        test_symbols = {"BTCUSDT", "ETHUSDT", "BNBUSDT"}
        
        feed = await connect_to_binance(test_symbols)
        print("✅ Connected successfully!")
        
        # Wait for some quotes
        print("⏳ Waiting for quotes...")
        for i in range(10):
            await asyncio.sleep(1)
            quote_count = feed.get_quote_count()
            print(f"   Quotes received: {quote_count}")
            
            if quote_count >= 3:
                print("✅ Got all required quotes!")
                break
        
        # Show some quotes
        quotes = feed.get_all_quotes()
        for symbol, quote in list(quotes.items())[:3]:
            print(f"   {symbol}: bid={quote['bid']:.4f}, ask={quote['ask']:.4f}")
        
        await feed.disconnect()
        print("👋 Disconnected")
        
    except Exception as e:
        print(f"❌ Test failed: {e}")


if __name__ == "__main__":
    asyncio.run(test_connection())

