#!/usr/bin/env python3
"""
Test what symbols we're actually getting from !ticker@arr
"""

import asyncio
import json
from smartbots.arb.price_feed import PriceFeed

async def test_coverage():
    # Load required symbols
    with open('loops.json', 'r') as f:
        loops = json.load(f)
    
    all_symbols = set()
    for loop in loops:
        all_symbols.update(loop['pairs'])
    
    usdt_symbols = [s for s in all_symbols if s.endswith('USDT')]
    
    print(f"📊 COVERAGE TEST")
    print(f"=" * 50)
    print(f"Required USDT symbols: {len(usdt_symbols)}")
    
    # Connect to price feed
    feed = PriceFeed()
    await feed.connect_bookticker(set(usdt_symbols))
    
    # Wait for data
    print("⏳ Waiting for market data...")
    await asyncio.sleep(10)  # Wait 10 seconds
    
    # Analyze coverage
    available_symbols = set(feed.quotes.keys())
    usdt_available = [s for s in available_symbols if s.endswith('USDT')]
    
    print(f"\n📈 RESULTS:")
    print(f"Available USDT symbols: {len(usdt_available)}")
    print(f"Coverage: {len(usdt_available)/len(usdt_symbols)*100:.1f}%")
    
    # Show missing symbols
    missing_usdt = set(usdt_symbols) - set(usdt_available)
    print(f"Missing USDT symbols: {len(missing_usdt)}")
    
    if missing_usdt:
        print(f"\n❌ Missing USDT symbols (first 20):")
        for i, symbol in enumerate(sorted(list(missing_usdt))[:20]):
            print(f"{i+1:2}. {symbol}")
    
    # Show available symbols
    print(f"\n✅ Available USDT symbols (first 20):")
    for i, symbol in enumerate(sorted(usdt_available)[:20]):
        print(f"{i+1:2}. {symbol}")
    
    await feed.disconnect()

if __name__ == "__main__":
    asyncio.run(test_coverage())

