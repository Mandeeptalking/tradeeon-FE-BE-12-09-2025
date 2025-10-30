#!/usr/bin/env python3
"""
Test the impact of different fee rates on arbitrage profitability
"""

import argparse
import asyncio
import json
import time
from datetime import datetime
from typing import Dict, List, Set

from smartbots.arb.price_feed import PriceFeed
from smartbots.arb.profit_calc import ProfitCalculator


async def main():
    parser = argparse.ArgumentParser(description="Test Fee Impact on Arbitrage")
    parser.add_argument("--loops", type=str, default="./all_loops_fixed_fdusd.json", help="Loops JSON file")
    parser.add_argument("--trade-size", type=float, default=200.0, help="Trade size in USDT/USDC/FDUSD")
    parser.add_argument("--min-profit", type=float, default=0.1, help="Minimum profit threshold")
    parser.add_argument("--tick-ms", type=int, default=3000, help="Tick interval in milliseconds")
    parser.add_argument("--exclude", type=str, default="TRY,BRL,EUR", help="Comma-separated coins to exclude")
    
    args = parser.parse_args()
    
    print("🔍 FEE IMPACT ANALYSIS")
    print("=" * 80)
    
    # Load loops
    try:
        with open(args.loops, 'r') as f:
            loops = json.load(f)
        print(f"📊 Loaded {len(loops)} arbitrage loops")
    except FileNotFoundError:
        print(f"❌ Loops file not found: {args.loops}")
        return
    
    # Filter loops
    excluded_coins = [coin.strip().upper() for coin in args.exclude.split(',')]
    filtered_loops = []
    
    for loop in loops:
        if any(coin in loop['path'] for coin in excluded_coins):
            continue
        filtered_loops.append(loop)
    
    print(f"🔍 Testing {len(filtered_loops)} loops")
    
    # Get required symbols
    required_symbols = set()
    for loop in filtered_loops:
        required_symbols.update(loop['pairs'])
    
    print(f"📡 Monitoring {len(required_symbols)} trading pairs")
    
    # Initialize price feed
    price_feed = PriceFeed()
    
    # Connect to price feed
    print(f"\n🔌 Connecting to Binance live market data...")
    await price_feed.connect_bookticker(required_symbols)
    print("✅ Connected to Binance !ticker@arr stream")
    
    # Wait for market data
    print("⏳ Waiting for market quotes...")
    start_time = time.time()
    
    while True:
        coverage = price_feed.coverage(required_symbols)
        quote_count = price_feed.get_quote_count()
        elapsed = time.time() - start_time
        
        print(f"   📊 Coverage: {coverage:.1%} ({quote_count}/{len(required_symbols)} symbols) - {elapsed:.0f}s")
        
        if coverage >= 0.4:  # 40% coverage minimum
            print("✅ Sufficient market data received!")
            break
        
        if elapsed > 30:
            print("⚠️  Timeout waiting for quotes, proceeding with available data...")
            break
        
        await asyncio.sleep(3)
    
    # Get fresh quotes
    fresh_quotes = price_feed.get_fresh_quotes(required_symbols, max_age_seconds=10.0)
    print(f"📈 Got quotes for {len(fresh_quotes)} pairs")
    
    # Test different fee rates
    fee_rates = [
        (0.001, "0.1% (Standard)"),
        (0.00075, "0.075% (BNB Discount)"),
        (0.0005, "0.05% (VIP)"),
        (0.0001, "0.01% (Low)"),
        (0.0, "0.0% (Zero Fee)")
    ]
    
    print(f"\n🎯 TESTING DIFFERENT FEE RATES:")
    print("=" * 80)
    
    for fee_rate, description in fee_rates:
        print(f"\n💰 Fee Rate: {description}")
        print("-" * 50)
        
        calculator = ProfitCalculator(
            taker_fee_rate=fee_rate,
            min_profit_usdt=args.min_profit,
            safety_margin_pct=0.001,
            trade_size_usdt=args.trade_size,
            use_vwap=False
        )
        
        profitable_opportunities = []
        all_calculations = 0
        
        for loop in filtered_loops:
            profit_data = calculator.calculate_loop_profit(loop, fresh_quotes)
            if profit_data:
                all_calculations += 1
                if profit_data['is_profitable']:
                    profitable_opportunities.append((loop, profit_data))
        
        # Sort by profit
        profitable_opportunities.sort(key=lambda x: x[1]['net_profit_usdt'], reverse=True)
        
        print(f"🧮 Calculations: {all_calculations}/{len(filtered_loops)} loops processed")
        print(f"💰 Profitable opportunities: {len(profitable_opportunities)}")
        
        if profitable_opportunities:
            print(f"🎯 Top 3 opportunities:")
            for i, (loop, profit_data) in enumerate(profitable_opportunities[:3]):
                path_str = " → ".join(loop['path'])
                net_profit = profit_data['net_profit_usdt']
                profit_pct = profit_data['profit_pct']
                
                print(f"  {i+1}. {path_str:30} | +{net_profit:.2f} USDT ({profit_pct:+.2f}%)")
            
            if len(profitable_opportunities) > 3:
                print(f"  ... and {len(profitable_opportunities) - 3} more")
        else:
            print("  ❌ No profitable opportunities found")
        
        # Calculate success rate
        success_rate = len(profitable_opportunities) / all_calculations * 100 if all_calculations > 0 else 0
        print(f"📊 Success rate: {success_rate:.1f}%")
    
    print(f"\n" + "=" * 80)
    print("📊 FEE IMPACT SUMMARY:")
    print("=" * 80)
    print("💡 Key Insights:")
    print("  • Lower fees = More profitable opportunities")
    print("  • Zero fees would show theoretical maximum profit")
    print("  • BNB discount (0.075%) provides meaningful improvement")
    print("  • VIP levels can significantly increase opportunities")
    print()
    print("🎯 Recommendations:")
    print("  • Use 0.1% for conservative estimates")
    print("  • Use 0.075% if you hold BNB")
    print("  • Monitor for promotional zero-fee periods")
    print("  • Consider VIP level requirements")
    
    await price_feed.disconnect()
    print("🔌 Disconnected from market data")


if __name__ == "__main__":
    asyncio.run(main())

