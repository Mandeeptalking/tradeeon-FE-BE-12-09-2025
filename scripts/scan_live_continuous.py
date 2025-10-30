#!/usr/bin/env python3
"""
Continuous Arbitrage Scanner - Shows actual arbitrage paths being scanned
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
    parser = argparse.ArgumentParser(description="Continuous Arbitrage Scanner")
    parser.add_argument("--loops", type=str, default="./all_loops.json", help="Loops JSON file")
    parser.add_argument("--trade-size", type=float, default=200.0, help="Trade size in USDT/USDC")
    parser.add_argument("--min-profit", type=float, default=1.0, help="Minimum profit in USDT/USDC")
    parser.add_argument("--fee", type=float, default=0.001, help="Taker fee rate (0.001 = 0.1%)")
    parser.add_argument("--safety", type=float, default=0.001, help="Safety margin (0.001 = 0.1%)")
    parser.add_argument("--tick-ms", type=int, default=3000, help="Tick interval in milliseconds")
    parser.add_argument("--exclude", type=str, default="TRY,BRL,EUR", help="Comma-separated coins to exclude")
    parser.add_argument("--show-paths", action="store_true", help="Show arbitrage paths being scanned")
    parser.add_argument("--show-all-opportunities", action="store_true", help="Show all opportunities (even unprofitable)")
    
    args = parser.parse_args()
    
    print("🚀 CONTINUOUS ARBITRAGE SCANNER")
    print("=" * 80)
    print("💡 Press Ctrl+C to stop scanning")
    print("=" * 80)
    
    # Load loops
    try:
        with open(args.loops, 'r') as f:
            loops = json.load(f)
        print(f"📊 Loaded {len(loops)} arbitrage loops")
    except FileNotFoundError:
        print(f"❌ Loops file not found: {args.loops}")
        print("💡 Run: python -m scripts.scan_all_pairs --save all_loops.json")
        return
    
    # Filter loops (exclude specified coins)
    excluded_coins = [coin.strip().upper() for coin in args.exclude.split(',')]
    filtered_loops = []
    
    for loop in loops:
        if any(coin in loop['path'] for coin in excluded_coins):
            continue
        filtered_loops.append(loop)
    
    if len(loops) - len(filtered_loops) > 0:
        print(f"🚫 Excluded {len(loops) - len(filtered_loops)} loops containing: {', '.join(excluded_coins)}")
    
    # Count loop types
    usdt_loops = [loop for loop in filtered_loops if loop['path'][0] == 'USDT' and loop['path'][-1] == 'USDT']
    usdc_loops = [loop for loop in filtered_loops if loop['path'][0] == 'USDC' and loop['path'][-1] == 'USDC']
    mixed_loops = [loop for loop in filtered_loops if not (loop['path'][0] == loop['path'][-1])]
    
    print(f"🔍 Scanning {len(filtered_loops)} loops:")
    print(f"  • USDT loops: {len(usdt_loops)}")
    print(f"  • USDC loops: {len(usdc_loops)}")
    print(f"  • Mixed loops: {len(mixed_loops)}")
    
    # Get ALL required symbols
    required_symbols = set()
    for loop in filtered_loops:
        required_symbols.update(loop['pairs'])
    
    print(f"📡 Monitoring {len(required_symbols)} trading pairs")
    
    # Show sample arbitrage paths if requested
    if args.show_paths:
        print("\n🔄 SAMPLE ARBITRAGE PATHS BEING SCANNED:")
        print("=" * 60)
        
        print(f"\n🔸 USDT TRIANGULAR LOOPS:")
        for i, loop in enumerate(usdt_loops[:10]):
            path_str = " → ".join(loop['path'])
            pairs_str = ", ".join(loop['pairs'])
            print(f"  {i+1:2}. {path_str:30} | {pairs_str}")
        
        print(f"\n🔸 USDC TRIANGULAR LOOPS:")
        for i, loop in enumerate(usdc_loops[:10]):
            path_str = " → ".join(loop['path'])
            pairs_str = ", ".join(loop['pairs'])
            print(f"  {i+1:2}. {path_str:30} | {pairs_str}")
        
        print(f"\n🔸 MIXED ARBITRAGE PATHS:")
        for i, loop in enumerate(mixed_loops[:10]):
            path_str = " → ".join(loop['path'])
            pairs_str = ", ".join(loop['pairs'])
            print(f"  {i+1:2}. {path_str:30} | {pairs_str}")
    
    # Initialize components
    price_feed = PriceFeed()
    calculator = ProfitCalculator(
        taker_fee_rate=args.fee,
        min_profit_usdt=args.min_profit,
        safety_margin_pct=args.safety,
        trade_size_usdt=args.trade_size,
        use_vwap=False
    )
    
    # Connect to price feed
    print(f"\n🔌 Connecting to Binance live market data...")
    print(f"📡 Requesting quotes for {len(required_symbols)} symbols...")
    await price_feed.connect_bookticker(required_symbols)
    print("✅ Connected to Binance !ticker@arr stream")
    
    # Wait for market data
    print("⏳ Waiting for market quotes...")
    start_time = time.time()
    max_wait_time = 30
    
    while True:
        coverage = price_feed.coverage(required_symbols)
        quote_count = price_feed.get_quote_count()
        elapsed = time.time() - start_time
        
        print(f"   📊 Coverage: {coverage:.1%} ({quote_count}/{len(required_symbols)} symbols) - {elapsed:.0f}s")
        
        if coverage >= 0.3:  # 30% coverage minimum
            print("✅ Sufficient market data received!")
            break
        
        if elapsed > max_wait_time:
            print(f"⚠️  Timeout after {max_wait_time}s, proceeding with available data...")
            break
        
        await asyncio.sleep(3)
    
    # Show what symbols we actually got quotes for
    fresh_quotes = price_feed.get_fresh_quotes(required_symbols, max_age_seconds=10.0)
    available_usdt = [s for s in fresh_quotes if s.endswith('USDT')]
    available_usdc = [s for s in fresh_quotes if s.endswith('USDC')]
    available_other = [s for s in fresh_quotes if not s.endswith(('USDT', 'USDC'))]
    
    print(f"\n📈 ACTUAL QUOTE COVERAGE:")
    print(f"  • USDT pairs with quotes: {len(available_usdt)}/{len([s for s in required_symbols if s.endswith('USDT')])} ({len(available_usdt)/len([s for s in required_symbols if s.endswith('USDT')])*100:.1f}%)")
    print(f"  • USDC pairs with quotes: {len(available_usdc)}/{len([s for s in required_symbols if s.endswith('USDC')])} ({len(available_usdc)/len([s for s in required_symbols if s.endswith('USDC')])*100:.1f}%)")
    print(f"  • Other pairs with quotes: {len(available_other)}/{len([s for s in required_symbols if not s.endswith(('USDT', 'USDC'))])} ({len(available_other)/len([s for s in required_symbols if not s.endswith(('USDT', 'USDC'))])*100:.1f}%)")
    print(f"  • Total coverage: {len(fresh_quotes)}/{len(required_symbols)} ({len(fresh_quotes)/len(required_symbols)*100:.1f}%)")
    
    # Main scanning loop - RUNS FOREVER until Ctrl+C
    print(f"\n🎯 STARTING CONTINUOUS ARBITRAGE SCANNING")
    print("=" * 80)
    print("💡 This will run continuously until you press Ctrl+C")
    print("=" * 80)
    
    tick_count = 0
    opportunities_found = 0
    total_calculations = 0
    
    try:
        while True:  # INFINITE LOOP - only stops with Ctrl+C
            tick_count += 1
            current_time = datetime.now().strftime("%H:%M:%S")
            
            print(f"\n[{current_time}] 🔍 SCAN #{tick_count}")
            print("-" * 60)
            
            # Get fresh quotes
            fresh_quotes = price_feed.get_fresh_quotes(required_symbols, max_age_seconds=10.0)
            coverage = len(fresh_quotes) / len(required_symbols) * 100
            
            print(f"📊 Market Data: {len(fresh_quotes)}/{len(required_symbols)} pairs ({coverage:.1f}% coverage)")
            
            if len(fresh_quotes) < len(required_symbols) * 0.2:
                print("⚠️  Insufficient market data, skipping scan...")
                await asyncio.sleep(args.tick_ms / 1000)
                continue
            
            # Scan for opportunities
            profitable_opportunities = []
            all_opportunities = []
            all_calculations = 0
            
            for i, loop in enumerate(filtered_loops):
                profit_data = calculator.calculate_loop_profit(loop, fresh_quotes)
                if profit_data:
                    all_calculations += 1
                    all_opportunities.append((loop, profit_data))
                    
                    if profit_data['is_profitable']:
                        profitable_opportunities.append((loop, profit_data))
            
            total_calculations += all_calculations
            opportunities_found += len(profitable_opportunities)
            
            # Sort by profit
            profitable_opportunities.sort(key=lambda x: x[1]['net_profit_usdt'], reverse=True)
            all_opportunities.sort(key=lambda x: x[1]['net_profit_usdt'], reverse=True)
            
            print(f"🧮 Calculations: {all_calculations}/{len(filtered_loops)} loops processed")
            
            # Show profitable opportunities
            if profitable_opportunities:
                print(f"💰 PROFITABLE OPPORTUNITIES: {len(profitable_opportunities)}")
                print("=" * 60)
                
                for i, (loop, profit_data) in enumerate(profitable_opportunities[:5]):  # Show top 5
                    path_str = " → ".join(loop['path'])
                    pairs_str = ", ".join(loop['pairs'])
                    net_profit = profit_data['net_profit_usdt']
                    profit_pct = profit_data['profit_pct']
                    
                    print(f"🎯 OPPORTUNITY #{i+1}")
                    print(f"   Path: {path_str}")
                    print(f"   Pairs: {pairs_str}")
                    print(f"   NET PROFIT: +{net_profit:.2f} USDT ({profit_pct:+.2f}%)")
                    print(f"   Mode: {profit_data.get('mode', 'TOB')}")
                    print()
                
                if len(profitable_opportunities) > 5:
                    print(f"   ... and {len(profitable_opportunities) - 5} more opportunities")
                    print()
            
            # Show all opportunities (even unprofitable) if requested
            elif args.show_all_opportunities and all_opportunities:
                print(f"📊 ALL OPPORTUNITIES (INCLUDING UNPROFITABLE): {len(all_opportunities)}")
                print("=" * 60)
                
                for i, (loop, profit_data) in enumerate(all_opportunities[:10]):  # Show top 10
                    path_str = " → ".join(loop['path'])
                    pairs_str = ", ".join(loop['pairs'])
                    net_profit = profit_data['net_profit_usdt']
                    profit_pct = profit_data['profit_pct']
                    status = "✅ PROFITABLE" if profit_data['is_profitable'] else "❌ LOSS"
                    
                    print(f"  {i+1:2}. {path_str:25} | {pairs_str:30} | {net_profit:+.2f} USDT ({profit_pct:+.2f}%) | {status}")
                
                if len(all_opportunities) > 10:
                    print(f"  ... and {len(all_opportunities) - 10} more opportunities")
                    print()
            
            else:
                print("📈 No profitable opportunities found (fees + spreads > profit)")
                if not args.show_all_opportunities:
                    print("💡 Use --show-all-opportunities to see all calculations")
            
            # Show running statistics every 10 scans
            if tick_count % 10 == 0:
                print(f"\n📊 RUNNING STATISTICS (after {tick_count} scans):")
                print(f"   Total calculations: {total_calculations}")
                print(f"   Opportunities found: {opportunities_found}")
                print(f"   Success rate: {opportunities_found/total_calculations*100:.1f}%" if total_calculations > 0 else "Success rate: 0%")
                print()
            
            await asyncio.sleep(args.tick_ms / 1000)
    
    except KeyboardInterrupt:
        print(f"\n\n⏹️  SCANNING STOPPED BY USER (Ctrl+C)")
    
    finally:
        # Final summary
        print("\n" + "=" * 80)
        print("📊 FINAL SCANNING SUMMARY")
        print("=" * 80)
        print(f"⏱️  Scanning Duration: {tick_count} scans")
        print(f"🧮 Total calculations: {total_calculations}")
        print(f"📈 Opportunities Found: {opportunities_found}")
        print(f"📡 Total Symbols Monitored: {len(required_symbols)}")
        print(f"📊 Final Quote Coverage: {len(fresh_quotes)}/{len(required_symbols)} ({len(fresh_quotes)/len(required_symbols)*100:.1f}%)")
        print(f"🎯 Success Rate: {opportunities_found/total_calculations*100:.1f}%" if total_calculations > 0 else "Success Rate: 0%")
        print("=" * 80)
        
        await price_feed.disconnect()
        print("🔌 Disconnected from market data")


if __name__ == "__main__":
    asyncio.run(main())

