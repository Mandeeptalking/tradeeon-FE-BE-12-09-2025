#!/usr/bin/env python3
"""
Enhanced arbitrage scanner with multi-connection WebSocket support.
This version can handle more symbols by using multiple WebSocket connections.
"""

import asyncio
import argparse
import json
import time
from pathlib import Path
from typing import Set, List, Dict, Optional

# Add the parent directory to Python path
import sys
sys.path.insert(0, str(Path(__file__).parent.parent))

from smartbots.arb.multi_price_feed import connect_to_binance_multi
from smartbots.arb.symbol_prioritizer import SymbolPrioritizer
from smartbots.arb.profit_calc import ProfitCalculator

async def load_loops(loops_file: str) -> List[Dict]:
    """Load arbitrage loops from JSON file."""
    try:
        with open(loops_file, 'r') as f:
            loops = json.load(f)
        print(f"📊 Loaded {len(loops)} loops from {loops_file}")
        return loops
    except FileNotFoundError:
        print(f"❌ Loops file not found: {loops_file}")
        return []
    except json.JSONDecodeError as e:
        print(f"❌ Invalid JSON in {loops_file}: {e}")
        return []

def filter_loops(loops: List[Dict], exclude_coins: List[str]) -> List[Dict]:
    """Filter out loops containing excluded coins."""
    if not exclude_coins:
        return loops
    
    filtered = []
    excluded_count = 0
    
    for loop in loops:
        path = loop['path']
        if not any(coin in exclude_coins for coin in path):
            filtered.append(loop)
        else:
            excluded_count += 1
    
    print(f"🚫 Excluded {excluded_count} loops containing: {', '.join(exclude_coins)}")
    return filtered

def extract_required_symbols(loops: List[Dict]) -> Set[str]:
    """Extract all unique symbols needed for the loops."""
    symbols = set()
    for loop in loops:
        symbols.update(loop['pairs'])
    return symbols

async def main():
    parser = argparse.ArgumentParser(description="Enhanced triangular arbitrage scanner with multi-connection support")
    parser.add_argument("--loops", default="loops.json", help="Loops JSON file (default: loops.json)")
    parser.add_argument("--trade-size", type=float, default=100.0, help="Trade size in USDT (default: 100)")
    parser.add_argument("--min-profit", type=float, default=2.0, help="Minimum profit in USDT (default: 2)")
    parser.add_argument("--fee", type=float, default=0.001, help="Taker fee rate (default: 0.001)")
    parser.add_argument("--safety", type=float, default=0.001, help="Safety margin (default: 0.001)")
    parser.add_argument("--max-connections", type=int, default=3, help="Max WebSocket connections (default: 3)")
    parser.add_argument("--max-symbols", type=int, default=150, help="Max symbols to subscribe to (default: 150)")
    parser.add_argument("--tick-ms", type=int, default=3000, help="Scan interval in milliseconds (default: 3000)")
    parser.add_argument("--max-loops", type=int, default=50, help="Max loops to scan per tick (default: 50)")
    parser.add_argument("--exclude", type=str, help="Comma-separated list of coins to exclude (e.g., TRY,BRL,EUR)")
    
    args = parser.parse_args()
    
    print("🚀 Starting ENHANCED triangular arbitrage scanner...")
    print("=" * 80)
    
    # Load and filter loops
    loops = await load_loops(args.loops)
    if not loops:
        return
    
    exclude_coins = args.exclude.split(',') if args.exclude else []
    loops = filter_loops(loops, exclude_coins)
    
    if not loops:
        print("❌ No loops to scan after filtering")
        return
    
    # Extract and prioritize symbols
    all_symbols = extract_required_symbols(loops)
    print(f"🔍 Total required symbols: {len(all_symbols)}")
    
    prioritizer = SymbolPrioritizer()
    prioritized_symbols = prioritizer.prioritize_symbols(all_symbols, args.max_symbols)
    print(f"🎯 Prioritized symbols for subscription: {len(prioritized_symbols)}")
    
    # Show top missing symbols analysis
    analysis = prioritizer.analyze_arbitrage_coverage(loops, set(prioritized_symbols))
    print(f"📊 Expected coverage: {analysis['coverage_percentage']:.1f}% ({analysis['complete_loops']}/{analysis['total_loops']} loops)")
    
    if analysis['top_missing_symbols']:
        print("🔍 Top missing symbols:")
        for symbol, count in analysis['top_missing_symbols'][:5]:
            print(f"  - {symbol}: needed by {count} loops")
    
    # Initialize profit calculator
    profit_calc = ProfitCalculator(
        taker_fee_rate=args.fee,
        min_profit_usdt=args.min_profit,
        safety_margin_pct=args.safety,
        trade_size_usdt=args.trade_size,
        use_vwap=False  # Use top-of-book for now
    )
    
    # Connect to price feed
    print(f"\n🔌 Connecting to Binance with {args.max_connections} WebSocket connections...")
    price_feed = await connect_to_binance_multi(set(prioritized_symbols), args.max_connections)
    print("✅ Connected to price feed!")
    
    # Wait for quotes
    print("⏳ Waiting for market quotes...")
    start_time = time.time()
    while time.time() - start_time < 15:  # Wait up to 15 seconds
        quote_count = price_feed.get_quote_count()
        print(f"   Quotes received: {quote_count}")
        if quote_count >= 20:  # Wait for at least 20 quotes
            break
        await asyncio.sleep(1)
    
    quotes = price_feed.get_all_quotes()
    print(f"✅ Received {len(quotes)} quotes")
    
    # Show sample quotes
    print("📈 Sample quotes:")
    for i, (symbol, quote) in enumerate(list(quotes.items())[:10]):
        spread = quote['ask'] - quote['bid']
        spread_pct = (spread / quote['ask']) * 100 if quote['ask'] > 0 else 0
        print(f"  {symbol:12}: bid={quote['bid']:8.4f}, ask={quote['ask']:8.4f}, spread={spread_pct:.3f}%")
    
    # Start scanning
    print(f"\n🚀 Starting live scanning...")
    print(f"📈 Trade size: {args.trade_size} USDT")
    print(f"💰 Min profit: {args.min_profit} USDT")
    print(f"💸 Fee rate: {args.fee*100:.2f}%")
    print(f"🛡️  Safety margin: {args.safety*100:.2f}%")
    print(f"⏱️  Scan interval: {args.tick_ms}ms")
    print(f"🔢 Max loops per tick: {args.max_loops}")
    print("=" * 80)
    
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
            
            # Scan loops
            loops_to_scan = loops[:args.max_loops]  # Limit for performance
            
            for i, loop in enumerate(loops_to_scan):
                pairs = loop['pairs']
                path_str = " → ".join(loop['path'])
                
                # Check if all quotes are available
                missing_quotes = [pair for pair in pairs if pair not in quotes]
                
                if missing_quotes:
                    if i < 5:  # Only show first 5 missing for brevity
                        print(f"  ⚠️  {path_str}: Missing quotes for {', '.join(missing_quotes)}")
                    continue
                
                # Calculate profit
                try:
                    result = profit_calc.calculate_loop_profit(loop, quotes)
                    
                    if result and result['net_profit_usdt'] >= args.min_profit:
                        opportunities_found += 1
                        total_opportunities += 1
                        
                        # Simulate execution (for demo purposes)
                        if result['net_profit_usdt'] >= args.min_profit * 1.5:  # Higher threshold for execution
                            executions_performed += 1
                            total_executions += 1
                            print(f"  ✅ EXECUTED | {path_str} | +{result['net_profit_usdt']:.2f} USDT | size={args.trade_size} | edge=+{result['profit_pct']:.2f}%")
                        else:
                            print(f"  💰 OPPORTUNITY | {path_str} | +{result['net_profit_usdt']:.2f} USDT | edge=+{result['profit_pct']:.2f}%")
                
                except Exception as e:
                    if i < 5:  # Only show first 5 errors for brevity
                        print(f"  ❌ {path_str}: Error - {e}")
            
            # Print tick summary
            print(f"📊 Tick Summary:")
            print(f"  Loops checked: {len(loops_to_scan)}")
            print(f"  Opportunities found: {opportunities_found}")
            print(f"  Executions performed: {executions_performed}")
            print(f"  Total opportunities: {total_opportunities}")
            print(f"  Total executions: {total_executions}")
            print(f"  Market data: {len(quotes)} quotes available")
            
            # Update quotes periodically
            if tick_count % 10 == 0:  # Every 10 ticks
                current_quotes = price_feed.get_all_quotes()
                if len(current_quotes) > len(quotes):
                    quotes.update(current_quotes)
                    print(f"  📈 Updated quotes: {len(quotes)} total")
            
            await asyncio.sleep(args.tick_ms / 1000)
            
    except KeyboardInterrupt:
        print("\n\n🛑 Scanner stopped by user")
    except Exception as e:
        print(f"\n❌ Scanner error: {e}")
    finally:
        await price_feed.disconnect()
        print("👋 Goodbye!")

if __name__ == "__main__":
    asyncio.run(main())
