#!/usr/bin/env python3
"""
Test script to show what pairs are being scanned.
"""

import asyncio
import sys
from pathlib import Path

# Add the parent directory to Python path
sys.path.insert(0, str(Path(__file__).parent))

from smartbots.arb.price_feed import connect_to_binance
from smartbots.arb.profit_calc import ProfitCalculator


async def test_scanning():
    """Test what pairs are being scanned."""
    print("🧪 Testing pair scanning...")
    
    # Load loops
    import json
    with open("loops.json", 'r') as f:
        loops = json.load(f)
    
    print(f"📊 Loaded {len(loops)} loops")
    
    # Show sample loops
    print("\n🔍 Sample loops to scan:")
    for i, loop in enumerate(loops[:10], 1):
        path_str = " → ".join(loop['path'])
        pairs_str = ", ".join(loop['pairs'])
        print(f"  {i}. {path_str}")
        print(f"     pairs: {pairs_str}")
    
    # Get required symbols
    calc = ProfitCalculator()
    required_symbols = calc.get_required_symbols(loops)
    print(f"\n🔍 Required symbols: {len(required_symbols)}")
    print(f"Sample symbols: {list(required_symbols)[:20]}")
    
    # Connect to price feed
    print("\n🔌 Connecting to Binance...")
    price_feed = await connect_to_binance()
    print("✅ Connected!")
    
    # Wait for quotes
    print("⏳ Waiting for quotes...")
    for i in range(10):
        await asyncio.sleep(1)
        quote_count = price_feed.get_quote_count()
        print(f"   Quotes received: {quote_count}")
        
        if quote_count > 100:
            break
    
    # Show sample quotes
    quotes = price_feed.get_all_quotes()
    print(f"\n📈 Sample quotes received:")
    for symbol, quote in list(quotes.items())[:10]:
        print(f"  {symbol}: bid={quote['bid']:.4f}, ask={quote['ask']:.4f}")
    
    # Test profit calculation on a few loops
    print(f"\n🧮 Testing profit calculation on first 5 loops...")
    for i, loop in enumerate(loops[:5]):
        path_str = " → ".join(loop['path'])
        profit_data = calc.calculate_loop_profit(loop, quotes)
        
        if profit_data:
            status = "✅ Profitable" if profit_data['is_profitable'] else "❌ Not profitable"
            profit = profit_data['net_profit_usdt']
            print(f"  {i+1}. {path_str}: {status} ({profit:+.2f} USDT)")
        else:
            print(f"  {i+1}. {path_str}: ❌ Missing quotes")
    
    await price_feed.disconnect()
    print("\n🎉 Test completed!")


if __name__ == "__main__":
    asyncio.run(test_scanning())

