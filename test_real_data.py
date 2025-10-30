#!/usr/bin/env python3
"""
Simple test to verify we're getting real market data.
"""

import asyncio
import sys
from pathlib import Path

# Add the parent directory to Python path
sys.path.insert(0, str(Path(__file__).parent))

from smartbots.arb.price_feed import PriceFeed

async def test_real_data():
    """Test that we're receiving real market data."""
    print("🧪 Testing real market data reception...")
    print("=" * 50)
    
    # Create price feed
    feed = PriceFeed()
    
    # Connect without filtering (get all symbols)
    print("🔌 Connecting to Binance WebSocket (all symbols)...")
    await feed.connect_bookticker()
    
    print("⏳ Waiting for market data...")
    
    # Wait and show progress
    for i in range(10):
        await asyncio.sleep(1)
        quote_count = feed.get_quote_count()
        print(f"  [{i+1:2d}s] Quotes received: {quote_count}")
        
        if quote_count >= 10:
            break
    
    # Show sample data
    quotes = feed.get_all_quotes()
    print(f"\n📊 Sample market data ({len(quotes)} symbols):")
    print("-" * 50)
    
    for i, (symbol, quote) in enumerate(list(quotes.items())[:10]):
        spread = quote['ask'] - quote['bid']
        spread_pct = (spread / quote['bid']) * 100
        print(f"{i+1:2d}. {symbol:12} | "
              f"Bid: {quote['bid']:8.4f} | "
              f"Ask: {quote['ask']:8.4f} | "
              f"Spread: {spread:.4f} ({spread_pct:.3f}%)")
    
    if len(quotes) > 10:
        print(f"... and {len(quotes) - 10} more symbols")
    
    # Test specific symbols we need
    test_symbols = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT']
    print(f"\n🔍 Testing specific symbols:")
    for symbol in test_symbols:
        if symbol in quotes:
            quote = quotes[symbol]
            print(f"  ✅ {symbol}: Bid={quote['bid']:.4f}, Ask={quote['ask']:.4f}")
        else:
            print(f"  ❌ {symbol}: Not available")
    
    # Disconnect
    await feed.disconnect()
    
    if len(quotes) > 0:
        print(f"\n✅ SUCCESS: Received real market data for {len(quotes)} symbols!")
        return True
    else:
        print(f"\n❌ FAILED: No market data received")
        return False

if __name__ == "__main__":
    asyncio.run(test_real_data())

