#!/usr/bin/env python3
"""
Full Coverage Arbitrage Scanner - Shows all pairs being monitored
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
    parser = argparse.ArgumentParser(description="Full Coverage Arbitrage Scanner")
    parser.add_argument("--loops", type=str, default="./all_loops.json", help="Loops JSON file")
    parser.add_argument("--trade-size", type=float, default=200.0, help="Trade size in USDT/USDC")
    parser.add_argument("--min-profit", type=float, default=1.0, help="Minimum profit in USDT/USDC")
    parser.add_argument("--fee", type=float, default=0.001, help="Taker fee rate (0.001 = 0.1%)")
    parser.add_argument("--safety", type=float, default=0.001, help="Safety margin (0.001 = 0.1%)")
    parser.add_argument("--tick-ms", type=int, default=3000, help="Tick interval in milliseconds")
    parser.add_argument("--exclude", type=str, default="TRY,BRL,EUR", help="Comma-separated coins to exclude")
    parser.add_argument("--show-pairs", action="store_true", help="Show all pairs being monitored")
    parser.add_argument("--max-ticks", type=int, default=5, help="Maximum ticks to run (0 = unlimited)")
    
    args = parser.parse_args()
    
    print("🚀 FULL COVERAGE ARBITRAGE SCANNER")
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
    
    # Show symbol breakdown
    usdt_symbols = [s for s in required_symbols if s.endswith('USDT')]
    usdc_symbols = [s for s in required_symbols if s.endswith('USDC')]
    other_symbols = [s for s in required_symbols if not s.endswith(('USDT', 'USDC'))]
    
    print(f"  • USDT pairs: {len(usdt_symbols)}")
    print(f"  • USDC pairs: {len(usdc_symbols)}")
    print(f"  • Other pairs: {len(other_symbols)}")
    
    # Show sample pairs if requested
    if args.show_pairs:
        print("\n📋 SAMPLE PAIRS BEING MONITORED:")
        print("=" * 60)
        
        print(f"\n🔸 USDT PAIRS ({len(usdt_symbols)} total):")
        for i, symbol in enumerate(sorted(usdt_symbols)[:20]):
            print(f"  {i+1:2}. {symbol}")
        if len(usdt_symbols) > 20:
            print(f"  ... and {len(usdt_symbols) - 20} more USDT pairs")
        
        print(f"\n🔸 USDC PAIRS ({len(usdc_symbols)} total):")
        for i, symbol in enumerate(sorted(usdc_symbols)[:15]):
            print(f"  {i+1:2}. {symbol}")
        if len(usdc_symbols) > 15:
            print(f"  ... and {len(usdc_symbols) - 15} more USDC pairs")
        
        print(f"\n🔸 OTHER PAIRS ({len(other_symbols)} total):")
        for i, symbol in enumerate(sorted(other_symbols)[:20]):
            print(f"  {i+1:2}. {symbol}")
        if len(other_symbols) > 20:
            print(f"  ... and {len(other_symbols) - 20} more other pairs")
    
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
    print(f"  • USDT pairs with quotes: {len(available_usdt)}/{len(usdt_symbols)} ({len(available_usdt)/len(usdt_symbols)*100:.1f}%)")
    print(f"  • USDC pairs with quotes: {len(available_usdc)}/{len(usdc_symbols)} ({len(available_usdc)/len(usdc_symbols)*100:.1f}%)")
    print(f"  • Other pairs with quotes: {len(available_other)}/{len(other_symbols)} ({len(available_other)/len(other_symbols)*100:.1f}%)")
    print(f"  • Total coverage: {len(fresh_quotes)}/{len(required_symbols)} ({len(fresh_quotes)/len(required_symbols)*100:.1f}%)")
    
    # Show some sample quotes
    print(f"\n📊 SAMPLE LIVE QUOTES:")
    sample_symbols = sorted(list(fresh_quotes.keys()))[:10]
    for symbol in sample_symbols:
        quote = fresh_quotes[symbol]
        spread_pct = ((quote['ask'] - quote['bid']) / quote['bid']) * 100 if quote['bid'] > 0 else 0
        print(f"  {symbol:12}: Bid={quote['bid']:10.4f}, Ask={quote['ask']:10.4f}, Spread={spread_pct:.3f}%")
    
    # Main scanning loop
    print(f"\n🎯 STARTING LIVE ARBITRAGE SCANNING")
    print("=" * 80)
    
    tick_count = 0
    opportunities_found = 0
    
    try:
        while True:
            tick_count += 1
            current_time = datetime.now().strftime("%H:%M:%S")
            
            if args.max_ticks > 0 and tick_count > args.max_ticks:
                print(f"\n⏹️  Reached maximum ticks ({args.max_ticks}), stopping...")
                break
            
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
            all_calculations = 0
            
            for loop in filtered_loops:
                profit_data = calculator.calculate_loop_profit(loop, fresh_quotes)
                if profit_data:
                    all_calculations += 1
                    if profit_data['is_profitable']:
                        profitable_opportunities.append((loop, profit_data))
            
            opportunities_found += len(profitable_opportunities)
            
            # Sort by profit
            profitable_opportunities.sort(key=lambda x: x[1]['net_profit_usdt'], reverse=True)
            
            print(f"🧮 Calculations: {all_calculations}/{len(filtered_loops)} loops processed")
            
            if profitable_opportunities:
                print(f"💰 PROFITABLE OPPORTUNITIES: {len(profitable_opportunities)}")
                print("=" * 60)
                
                for i, (loop, profit_data) in enumerate(profitable_opportunities[:3]):  # Show top 3
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
                
                if len(profitable_opportunities) > 3:
                    print(f"   ... and {len(profitable_opportunities) - 3} more opportunities")
                    print()
                
            else:
                print("📈 No profitable opportunities found (fees + spreads > profit)")
            
            await asyncio.sleep(args.tick_ms / 1000)
    
    except KeyboardInterrupt:
        print(f"\n\n⏹️  SCANNING STOPPED BY USER")
    
    finally:
        # Final summary
        print("\n" + "=" * 80)
        print("📊 FINAL SCANNING SUMMARY")
        print("=" * 80)
        print(f"⏱️  Scanning Duration: {tick_count} ticks")
        print(f"📈 Opportunities Found: {opportunities_found}")
        print(f"📡 Total Symbols Monitored: {len(required_symbols)}")
        print(f"📊 Final Quote Coverage: {len(fresh_quotes)}/{len(required_symbols)} ({len(fresh_quotes)/len(required_symbols)*100:.1f}%)")
        print("=" * 80)
        
        await price_feed.disconnect()
        print("🔌 Disconnected from market data")


if __name__ == "__main__":
    asyncio.run(main())

