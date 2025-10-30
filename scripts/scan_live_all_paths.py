#!/usr/bin/env python3
"""
Live scanner for ALL arbitrage paths (USDT, USDC, and mixed).
"""

import argparse
import asyncio
import json
import time
from typing import Dict, List, Set

from smartbots.arb.price_feed import PriceFeed
from smartbots.arb.profit_calc import ProfitCalculator


async def main():
    parser = argparse.ArgumentParser(description="Live scanner for all arbitrage paths")
    parser.add_argument("--loops", type=str, default="./all_loops.json", help="Loops JSON file")
    parser.add_argument("--trade-size", type=float, default=200.0, help="Trade size in USDT")
    parser.add_argument("--min-profit", type=float, default=2.0, help="Minimum profit in USDT")
    parser.add_argument("--fee", type=float, default=0.001, help="Taker fee rate (0.001 = 0.1%)")
    parser.add_argument("--safety", type=float, default=0.001, help="Safety margin (0.001 = 0.1%)")
    parser.add_argument("--tick-ms", type=int, default=3000, help="Tick interval in milliseconds")
    parser.add_argument("--max-loops", type=int, default=100, help="Maximum loops to scan")
    parser.add_argument("--exclude", type=str, default="TRY,BRL,EUR,FDUSD", help="Comma-separated coins to exclude")
    parser.add_argument("--verify-only", action="store_true", help="Only verify market data, don't scan")
    parser.add_argument("--show-all", action="store_true", help="Show all opportunities, not just profitable ones")
    
    args = parser.parse_args()
    
    print("🚀 Starting COMPREHENSIVE arbitrage scanner...")
    print("=" * 80)
    
    # Load loops
    try:
        with open(args.loops, 'r') as f:
            loops = json.load(f)
        print(f"📊 Loaded {len(loops)} loops from {args.loops}")
    except FileNotFoundError:
        print(f"❌ Loops file not found: {args.loops}")
        print("💡 Run: python -m scripts.scan_all_pairs --save all_loops.json")
        return
    
    # Filter loops
    excluded_coins = [coin.strip().upper() for coin in args.exclude.split(',')]
    filtered_loops = []
    
    for loop in loops:
        # Check if loop contains any excluded coins
        if any(coin in loop['path'] for coin in excluded_coins):
            continue
        filtered_loops.append(loop)
    
    excluded_count = len(loops) - len(filtered_loops)
    if excluded_count > 0:
        print(f"🚫 Excluded {excluded_count} loops containing: {', '.join(excluded_coins)}")
    
    # Limit loops for testing with balanced types
    if args.max_loops > 0:
        # Ensure we get a mix of all loop types
        usdt_loops = [loop for loop in filtered_loops if loop['path'][0] == 'USDT' and loop['path'][-1] == 'USDT']
        usdc_loops = [loop for loop in filtered_loops if loop['path'][0] == 'USDC' and loop['path'][-1] == 'USDC']
        mixed_loops = [loop for loop in filtered_loops if not (loop['path'][0] == loop['path'][-1])]
        
        # Take balanced sample from each type
        max_per_type = max(1, args.max_loops // 3)
        balanced_loops = []
        balanced_loops.extend(usdt_loops[:max_per_type])
        balanced_loops.extend(usdc_loops[:max_per_type])
        balanced_loops.extend(mixed_loops[:max_per_type])
        
        # Fill remaining slots with any type
        remaining_slots = args.max_loops - len(balanced_loops)
        if remaining_slots > 0:
            all_remaining = usdt_loops[max_per_type:] + usdc_loops[max_per_type:] + mixed_loops[max_per_type:]
            balanced_loops.extend(all_remaining[:remaining_slots])
        
        filtered_loops = balanced_loops
    
    print(f"🔍 Scanning {len(filtered_loops)} loops")
    
    # Get required symbols
    required_symbols = set()
    for loop in filtered_loops:
        required_symbols.update(loop['pairs'])
    
    print(f"🔍 Required symbols: {len(required_symbols)}")
    
    # Initialize components
    price_feed = PriceFeed()
    calculator = ProfitCalculator(
        taker_fee_rate=args.fee,
        min_profit_usdt=args.min_profit,
        safety_margin_pct=args.safety,
        trade_size_usdt=args.trade_size,
        use_vwap=False  # Use TOB for now
    )
    
    # Connect to price feed
    print("🔌 Connecting to Binance price feed...")
    await price_feed.connect_bookticker(required_symbols)
    print("✅ Connected to price feed!")
    
    # Wait for market data
    print("⏳ Waiting for market quotes...")
    start_time = time.time()
    while True:
        coverage = price_feed.coverage(required_symbols)
        print(f"   Coverage: {coverage:.1%} ({price_feed.get_quote_count()} quotes)")
        
        if coverage >= 0.3:  # 30% coverage is enough for testing
            print("✅ Sufficient coverage achieved!")
            break
        
        if time.time() - start_time > 30:
            print("⚠️  Timeout waiting for quotes, proceeding anyway...")
            break
        
        await asyncio.sleep(1)
    
    if args.verify_only:
        print("\n🔍 VERIFYING REAL MARKET DATA")
        print("=" * 50)
        
        # Check major pairs
        major_pairs = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'ADAUSDT', 'SOLUSDT']
        usdc_pairs = ['BTCUSDC', 'ETHUSDC', 'BNBUSDC', 'ADAUSDC']
        
        print("📈 Major USDT pairs:")
        for pair in major_pairs:
            quote = price_feed.get_quote(pair)
            if quote:
                spread = ((quote['ask'] - quote['bid']) / quote['ask']) * 100
                print(f"  ✅ {pair}: Bid={quote['bid']:8.4f}, Ask={quote['ask']:8.4f}, Spread={spread:5.3f}%")
            else:
                print(f"  ❌ {pair}: Not available")
        
        print("\n📈 Major USDC pairs:")
        for pair in usdc_pairs:
            quote = price_feed.get_quote(pair)
            if quote:
                spread = ((quote['ask'] - quote['bid']) / quote['ask']) * 100
                print(f"  ✅ {pair}: Bid={quote['bid']:8.4f}, Ask={quote['ask']:8.4f}, Spread={spread:5.3f}%")
            else:
                print(f"  ❌ {pair}: Not available")
        
        # Show coverage by loop type
        usdt_loops = [loop for loop in filtered_loops if loop['path'][0] == 'USDT' and loop['path'][-1] == 'USDT']
        usdc_loops = [loop for loop in filtered_loops if loop['path'][0] == 'USDC' and loop['path'][-1] == 'USDC']
        mixed_loops = [loop for loop in filtered_loops if not (loop['path'][0] == loop['path'][-1])]
        
        print(f"\n📊 Loop Coverage:")
        print(f"  USDT loops: {len(usdt_loops)}")
        print(f"  USDC loops: {len(usdc_loops)}")
        print(f"  Mixed loops: {len(mixed_loops)}")
        
        print(f"\n📊 Market Data Coverage:")
        coverage = price_feed.coverage(required_symbols)
        print(f"  Total coverage: {coverage:.1%} ({price_feed.get_quote_count()}/{len(required_symbols)} symbols)")
        
        print("\n✅ Verification complete. Exiting as requested.")
        await price_feed.disconnect()
        return
    
    # Main scanning loop
    print(f"\n🚀 Starting live arbitrage scanning...")
    print(f"📈 Trade size: {args.trade_size} USDT")
    print(f"💰 Min profit: {args.min_profit} USDT")
    print(f"💸 Fee rate: {args.fee*100:.1f}%")
    print(f"🛡️  Safety margin: {args.safety*100:.1f}%")
    print(f"⏱️  Tick interval: {args.tick_ms}ms")
    print("-" * 80)
    
    tick_count = 0
    opportunities_found = 0
    profitable_count = 0
    
    try:
        # Limit to 10 ticks for testing
        max_ticks = 10
        
        while tick_count < max_ticks:
            tick_count += 1
            current_time = time.strftime("%H:%M:%S")
            
            print(f"[{current_time}] 🔍 Tick {tick_count}/{max_ticks} - Getting quotes...")
            
            # Get fresh quotes
            fresh_quotes = price_feed.get_fresh_quotes(required_symbols, max_age_seconds=5.0)
            
            print(f"[{current_time}] 📊 Got {len(fresh_quotes)}/{len(required_symbols)} fresh quotes")
            
            if len(fresh_quotes) < len(required_symbols) * 0.3:
                print(f"[{current_time}] ⚠️  Low quote coverage: {len(fresh_quotes)}/{len(required_symbols)}")
                await asyncio.sleep(args.tick_ms / 1000)
                continue
            
            # Scan loops
            profitable_loops = []
            all_opportunities = []
            
            for loop in filtered_loops:
                profit_data = calculator.calculate_loop_profit(loop, fresh_quotes)
                
                if profit_data:
                    all_opportunities.append((loop, profit_data))
                    
                    if profit_data['is_profitable']:
                        profitable_loops.append((loop, profit_data))
            
            # Sort by profit
            profitable_loops.sort(key=lambda x: x[1]['net_profit_usdt'], reverse=True)
            all_opportunities.sort(key=lambda x: x[1]['net_profit_usdt'], reverse=True)
            
            # Show results
            if profitable_loops:
                profitable_count += len(profitable_loops)
                print(f"\n[{current_time}] 🎯 FOUND {len(profitable_loops)} PROFITABLE OPPORTUNITIES!")
                
                for i, (loop, profit_data) in enumerate(profitable_loops[:5]):  # Show top 5
                    path_str = " → ".join(loop['path'])
                    pairs_str = ", ".join(loop['pairs'])
                    net_profit = profit_data['net_profit_usdt']
                    profit_pct = profit_data['profit_pct']
                    start_currency = profit_data.get('start_currency', 'USDT')
                    end_currency = profit_data.get('end_currency', 'USDT')
                    
                    print(f"  💰 #{i+1}: {path_str}")
                    print(f"      Pairs: {pairs_str}")
                    print(f"      Profit: +{net_profit:.2f} USDT ({profit_pct:+.2f}%) | Size: {args.trade_size} {start_currency}")
                    print(f"      Mode: {profit_data.get('mode', 'TOB')} | Fees: {args.fee*100:.1f}% per leg")
                    print()
            
            elif args.show_all and all_opportunities:
                # Show top opportunities even if not profitable
                print(f"\n[{current_time}] 📊 Top opportunities (not profitable):")
                for i, (loop, profit_data) in enumerate(all_opportunities[:3]):
                    path_str = " → ".join(loop['path'])
                    net_profit = profit_data['net_profit_usdt']
                    profit_pct = profit_data['profit_pct']
                    print(f"  📈 #{i+1}: {path_str} | {net_profit:+.2f} USDT ({profit_pct:+.2f}%)")
            
            else:
                print(f"[{current_time}] 🔍 Scanning... | Coverage: {len(fresh_quotes)}/{len(required_symbols)} | Ticks: {tick_count}")
            
            opportunities_found += len(all_opportunities)
            await asyncio.sleep(args.tick_ms / 1000)
    
    except KeyboardInterrupt:
        print(f"\n\n📊 SCANNING SUMMARY")
        print("=" * 50)
        print(f"Total ticks: {tick_count}")
        print(f"Opportunities found: {opportunities_found}")
        print(f"Profitable opportunities: {profitable_count}")
        print(f"Success rate: {profitable_count/opportunities_found*100:.1f}%" if opportunities_found > 0 else "Success rate: 0%")
        
        print(f"\n📊 Loop Type Breakdown:")
        usdt_count = len([loop for loop in filtered_loops if loop['path'][0] == 'USDT' and loop['path'][-1] == 'USDT'])
        usdc_count = len([loop for loop in filtered_loops if loop['path'][0] == 'USDC' and loop['path'][-1] == 'USDC'])
        mixed_count = len([loop for loop in filtered_loops if not (loop['path'][0] == loop['path'][-1])])
        print(f"  USDT loops: {usdt_count}")
        print(f"  USDC loops: {usdc_count}")
        print(f"  Mixed loops: {mixed_count}")
        
        await price_feed.disconnect()
        print("🔌 Disconnected from price feed")


if __name__ == "__main__":
    asyncio.run(main())
