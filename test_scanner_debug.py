#!/usr/bin/env python3
"""
Debug version of the scanner to identify issues
"""

import asyncio
import json
from smartbots.arb.price_feed import PriceFeed
from smartbots.arb.profit_calc import ProfitCalculator

async def test_scanner():
    print("🔍 DEBUGGING SCANNER...")
    
    # Load a few loops
    with open('all_loops.json', 'r') as f:
        loops = json.load(f)
    
    # Take just 3 loops for testing
    test_loops = loops[:3]
    print(f"📊 Testing with {len(test_loops)} loops:")
    for i, loop in enumerate(test_loops):
        print(f"  {i+1}. {' → '.join(loop['path'])} | {', '.join(loop['pairs'])}")
    
    # Get required symbols
    required_symbols = set()
    for loop in test_loops:
        required_symbols.update(loop['pairs'])
    
    print(f"🔍 Required symbols: {sorted(list(required_symbols))}")
    
    # Initialize components
    price_feed = PriceFeed()
    calculator = ProfitCalculator(
        taker_fee_rate=0.001,
        min_profit_usdt=0.5,
        safety_margin_pct=0.001,
        trade_size_usdt=100.0,
        use_vwap=False
    )
    
    # Connect to price feed
    print("🔌 Connecting to price feed...")
    await price_feed.connect_bookticker(required_symbols)
    print("✅ Connected!")
    
    # Wait for data
    print("⏳ Waiting for quotes...")
    for i in range(10):
        coverage = price_feed.coverage(required_symbols)
        quote_count = price_feed.get_quote_count()
        print(f"  Attempt {i+1}: Coverage={coverage:.1%} ({quote_count} quotes)")
        
        if quote_count > 0:
            print("✅ Got some quotes!")
            break
        
        await asyncio.sleep(1)
    
    # Show available quotes
    quotes = price_feed.get_all_quotes()
    print(f"\n📈 Available quotes ({len(quotes)}):")
    for symbol, quote in list(quotes.items())[:10]:
        print(f"  {symbol}: Bid={quote['bid']:.4f}, Ask={quote['ask']:.4f}")
    
    # Test profit calculation
    print(f"\n🧮 Testing profit calculation...")
    for i, loop in enumerate(test_loops):
        print(f"\n  Loop {i+1}: {' → '.join(loop['path'])}")
        profit_data = calculator.calculate_loop_profit(loop, quotes)
        
        if profit_data:
            print(f"    Final: {profit_data['final_usdt']:.2f} USDT")
            print(f"    Profit: {profit_data['net_profit_usdt']:+.2f} USDT")
            print(f"    Profit %: {profit_data['profit_pct']:+.2f}%")
            print(f"    Profitable: {profit_data['is_profitable']}")
        else:
            print(f"    ❌ Could not calculate (missing quotes)")
    
    await price_feed.disconnect()
    print("\n✅ Test complete!")

if __name__ == "__main__":
    asyncio.run(test_scanner())

