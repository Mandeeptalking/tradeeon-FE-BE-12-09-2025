#!/usr/bin/env python3
"""
Verbose live triangular arbitrage simulator that shows detailed scanning activity.
"""

import argparse
import asyncio
import json
import sys
import time
from pathlib import Path
from typing import Set, List, Dict, Any, Optional

# Add the parent directory to Python path to import our modules
sys.path.insert(0, str(Path(__file__).parent.parent))

from smartbots.arb.price_feed import connect_to_binance, PriceFeed
from smartbots.arb.depth_feed import subscribe_to_depth, DepthFeed
from smartbots.arb.simulator import VirtualExecutor
from smartbots.arb.ledger import Ledger


async def main():
    """Main CLI function with verbose output."""
    parser = argparse.ArgumentParser(description="Verbose triangular arbitrage simulator")
    parser.add_argument("--loops", type=str, default="loops.json", help="Loops JSON file")
    parser.add_argument("--trade-size", type=float, default=200.0, help="Trade size in USDT")
    parser.add_argument("--min-profit", type=float, default=2.0, help="Minimum profit in USDT")
    parser.add_argument("--fee", type=float, default=0.001, help="Trading fee rate")
    parser.add_argument("--safety", type=float, default=0.001, help="Safety margin percentage")
    parser.add_argument("--exclude", type=str, default="", help="Comma-separated coins to exclude")
    parser.add_argument("--tick-ms", type=int, default=1000, help="Scanning interval in milliseconds")
    parser.add_argument("--max-loops", type=int, default=100, help="Maximum loops to scan per tick")
    
    args = parser.parse_args()
    
    # Parse exclude coins
    exclude_coins = set()
    if args.exclude:
        exclude_coins = set(coin.strip().upper() for coin in args.exclude.split(','))
    
    print("🚀 Starting VERBOSE triangular arbitrage simulator...")
    print("=" * 80)
    
    # Load loops
    try:
        with open(args.loops, 'r') as f:
            all_loops = json.load(f)
        
        # Filter excluded coins
        loops = []
        for loop in all_loops:
            path = loop['path']
            intermediate_assets = path[1:-1]
            if not any(asset in exclude_coins for asset in intermediate_assets):
                loops.append(loop)
        
        print(f"📊 Loaded {len(loops)} loops from {args.loops}")
        if exclude_coins:
            print(f"🚫 Excluded coins: {', '.join(sorted(exclude_coins))}")
        
        # Show sample loops
        print(f"\n🔍 Sample loops to scan:")
        for i, loop in enumerate(loops[:10], 1):
            path_str = " → ".join(loop['path'])
            pairs_str = ", ".join(loop['pairs'])
            print(f"  {i:2d}. {path_str}")
            print(f"      pairs: {pairs_str}")
        
        if len(loops) > 10:
            print(f"      ... and {len(loops) - 10} more loops")
            
    except Exception as e:
        print(f"❌ Error loading loops: {e}")
        return
    
    # Setup executor
    executor = VirtualExecutor(
        trade_size=args.trade_size,
        fee_rate=args.fee,
        min_profit=args.min_profit,
        safety=args.safety
    )
    
    # Get required symbols
    from smartbots.arb.profit_calc import ProfitCalculator
    temp_calc = ProfitCalculator()
    required_symbols = temp_calc.get_required_symbols(loops)
    print(f"\n🔍 Required symbols: {len(required_symbols)}")
    print(f"Sample symbols: {', '.join(list(required_symbols)[:20])}")
    
    # Connect to price feed
    print(f"\n🔌 Connecting to Binance WebSocket...")
    price_feed = await connect_to_binance(required_symbols)
    print("✅ Connected to price feed!")
    
    # Wait for quotes
    print("⏳ Waiting for market quotes...")
    start_time = time.time()
    while time.time() - start_time < 30:
        quote_count = price_feed.get_quote_count()
        if quote_count >= 100:
            break
        print(f"   Quotes received: {quote_count}")
        await asyncio.sleep(1)
    
    quotes = price_feed.get_all_quotes()
    print(f"✅ Received {len(quotes)} quotes")
    
    # Show sample quotes
    print(f"\n📈 Sample quotes:")
    for symbol, quote in list(quotes.items())[:10]:
        print(f"  {symbol}: bid={quote['bid']:.4f}, ask={quote['ask']:.4f}")
    
    print(f"\n🚀 Starting live scanning...")
    print(f"📈 Trade size: {args.trade_size} USDT")
    print(f"💰 Min profit: {args.min_profit} USDT")
    print(f"💸 Fee rate: {args.fee*100:.3f}%")
    print(f"🛡️  Safety margin: {args.safety*100:.3f}%")
    print(f"⏱️  Scan interval: {args.tick_ms}ms")
    print(f"🔢 Max loops per tick: {args.max_loops}")
    print("=" * 80)
    
    # Main scanning loop
    tick_count = 0
    total_opportunities = 0
    total_executions = 0
    
    try:
        while True:
            tick_count += 1
            current_time = time.strftime("%H:%M:%S")
            
            print(f"\n🔄 TICK #{tick_count} [{current_time}]")
            print("-" * 40)
            
            opportunities_found = 0
            executions_performed = 0
            loops_checked = 0
            
            # Scan limited number of loops per tick
            loops_to_scan = loops[:args.max_loops]
            
            for i, loop in enumerate(loops_to_scan):
                loops_checked += 1
                path_str = " → ".join(loop['path'])
                pairs_str = ", ".join(loop['pairs'])
                
                # Check if we have quotes for all pairs
                missing_quotes = [pair for pair in loop['pairs'] if pair not in quotes]
                if missing_quotes:
                    if i < 5:  # Show first few missing quote cases
                        print(f"  ⚠️  {path_str}: Missing quotes for {', '.join(missing_quotes)}")
                    continue
                
                # Check profitability
                is_profitable = executor.is_profitable_opportunity(loop, quotes)
                
                if is_profitable:
                    opportunities_found += 1
                    print(f"  💰 OPPORTUNITY FOUND: {path_str}")
                    print(f"     pairs: {pairs_str}")
                    
                    # Execute virtual trade
                    execution_result = executor.execute(loop, quotes)
                    
                    if execution_result and execution_result.get('success'):
                        executions_performed += 1
                        net_profit = execution_result['net_profit']
                        profit_pct = execution_result['profit_pct']
                        
                        print(f"     ✅ EXECUTED: +{net_profit:.2f} USDT ({profit_pct:+.2f}%)")
                    else:
                        print(f"     ❌ Execution failed")
                else:
                    # Show first few non-profitable loops for debugging
                    if i < 5:
                        print(f"  ❌ {path_str}: Not profitable")
            
            # Update totals
            total_opportunities += opportunities_found
            total_executions += executions_performed
            
            # Print tick summary
            print(f"\n📊 Tick Summary:")
            print(f"  Loops checked: {loops_checked}")
            print(f"  Opportunities found: {opportunities_found}")
            print(f"  Executions performed: {executions_performed}")
            print(f"  Total opportunities: {total_opportunities}")
            print(f"  Total executions: {total_executions}")
            
            # Show market data status
            quote_count = price_feed.get_quote_count()
            print(f"  Market data: {quote_count} quotes available")
            
            # Sleep for next tick
            await asyncio.sleep(args.tick_ms / 1000.0)
            
    except KeyboardInterrupt:
        print(f"\n\n🛑 Simulator stopped by user")
        print("=" * 80)
        print(f"📊 FINAL SUMMARY:")
        print(f"  Total ticks: {tick_count}")
        print(f"  Total opportunities found: {total_opportunities}")
        print(f"  Total executions performed: {total_executions}")
        print(f"  Execution rate: {(total_executions/max(total_opportunities,1)*100):.1f}%")
        print("=" * 80)
        
    except Exception as e:
        print(f"❌ Simulator error: {e}")
        
    finally:
        await price_feed.disconnect()
        print("👋 Goodbye!")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n👋 Goodbye!")
    except Exception as e:
        print(f"❌ Fatal error: {e}")
        sys.exit(1)
