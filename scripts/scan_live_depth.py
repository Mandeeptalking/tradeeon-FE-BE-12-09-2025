#!/usr/bin/env python3
"""
Live triangular arbitrage scanner with TOB→VWAP promotion.
Uses !bookTicker for all quotes, then promotes promising loops to VWAP depth analysis.
"""

import asyncio
import argparse
import json
import time
from pathlib import Path
from typing import Set, List, Dict, Optional, Tuple

# Add the parent directory to Python path
import sys
sys.path.insert(0, str(Path(__file__).parent.parent))

from smartbots.arb.price_feed import connect_to_binance
from smartbots.arb.depth_pool import DepthPoolManager
from smartbots.arb.profit_calc import ProfitCalculator
# LoopBuilder not needed for this script

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
    parser = argparse.ArgumentParser(description="Live triangular arbitrage scanner with TOB→VWAP promotion")
    parser.add_argument("--loops", default="loops.json", help="Loops JSON file (default: loops.json)")
    parser.add_argument("--trade-size", type=float, default=200.0, help="Trade size in USDT (default: 200)")
    parser.add_argument("--min-profit", type=float, default=2.0, help="Minimum profit in USDT (default: 2)")
    parser.add_argument("--fee", type=float, default=0.001, help="Taker fee rate (default: 0.001)")
    parser.add_argument("--safety", type=float, default=0.001, help="Safety margin (default: 0.001)")
    parser.add_argument("--max-depth-symbols", type=int, default=120, help="Max depth symbols (default: 120)")
    parser.add_argument("--candidate-loops", type=int, default=50, help="Top candidate loops for VWAP (default: 50)")
    parser.add_argument("--min-rough-edge", type=float, default=0.004, help="Min rough edge for VWAP promotion (default: 0.004)")
    parser.add_argument("--depth-levels", type=int, default=5, help="Depth levels (5, 10, or 20) (default: 5)")
    parser.add_argument("--tick-ms", type=int, default=300, help="Scan interval in milliseconds (default: 300)")
    parser.add_argument("--max-loops", type=int, default=100, help="Max loops to scan per tick (default: 100)")
    parser.add_argument("--exclude", type=str, help="Comma-separated list of coins to exclude (e.g., TRY,BRL,EUR,FDUSD,TUSD)")
    
    args = parser.parse_args()
    
    print("🚀 Starting TOB→VWAP triangular arbitrage scanner...")
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
    
    # Extract required symbols
    required_symbols = extract_required_symbols(loops)
    print(f"🔍 Total required symbols: {len(required_symbols)}")
    
    # Initialize profit calculators
    tob_calc = ProfitCalculator(
        taker_fee_rate=args.fee,
        min_profit_usdt=0.1,  # Lower threshold for TOB screening
        safety_margin_pct=0.0,  # No safety margin for rough screening
        trade_size_usdt=args.trade_size,
        use_vwap=False
    )
    
    vwap_calc = ProfitCalculator(
        taker_fee_rate=args.fee,
        min_profit_usdt=args.min_profit,
        safety_margin_pct=args.safety,
        trade_size_usdt=args.trade_size,
        use_vwap=True
    )
    
    # Initialize depth pool manager
    depth_pool = DepthPoolManager(
        max_symbols=args.max_depth_symbols,
        levels=args.depth_levels,
        interval_ms=100
    )
    
    # Connect to price feed (!bookTicker)
    print(f"\n🔌 Connecting to Binance !bookTicker stream...")
    price_feed = await connect_to_binance()
    print("✅ Connected to price feed!")
    
    # Wait for quotes with coverage check
    print("⏳ Waiting for market quotes...")
    start_time = time.time()
    while time.time() - start_time < 30:  # Wait up to 30 seconds
        coverage = price_feed.coverage(required_symbols)
        quote_count = price_feed.get_quote_count()
        print(f"   Coverage: {coverage:.1%} ({quote_count} quotes)")
        
        if coverage >= 0.9:  # 90% coverage threshold
            print("✅ Sufficient coverage achieved!")
            break
        await asyncio.sleep(2)
    
    if price_feed.coverage(required_symbols) < 0.9:
        print("⚠️  Warning: Low coverage, continuing anyway...")
    
    # Get fresh quotes
    quotes = price_feed.get_fresh_quotes(required_symbols)
    print(f"✅ Using {len(quotes)} fresh quotes for scanning")
    
    # Start scanning
    print(f"\n🚀 Starting live scanning...")
    print(f"📈 Trade size: {args.trade_size} USDT")
    print(f"💰 Min profit: {args.min_profit} USDT")
    print(f"💸 Fee rate: {args.fee*100:.2f}%")
    print(f"🛡️  Safety margin: {args.safety*100:.2f}%")
    print(f"⏱️  Scan interval: {args.tick_ms}ms")
    print(f"🔢 Max loops per tick: {args.max_loops}")
    print(f"📊 Max depth symbols: {args.max_depth_symbols}")
    print(f"🎯 Min rough edge: {args.min_rough_edge*100:.1f}%")
    print(f"🔍 Candidate loops: {args.candidate_loops}")
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
            
            # Get fresh quotes
            quotes = price_feed.get_fresh_quotes(required_symbols)
            
            # Step 1: TOB screening - evaluate all loops with TOB
            print("🔍 Step 1: TOB screening...")
            candidate_loops = []
            tob_opportunities = 0
            
            loops_to_scan = loops[:args.max_loops]  # Limit for performance
            
            for loop in loops_to_scan:
                result = tob_calc.calculate_loop_profit_tob(loop, quotes)
                if result and result['profit_pct'] >= args.min_rough_edge * 100:
                    candidate_loops.append((loop, result))
                    tob_opportunities += 1
            
            # Sort by rough edge and take top candidates
            candidate_loops.sort(key=lambda x: x[1]['profit_pct'], reverse=True)
            top_candidates = candidate_loops[:args.candidate_loops]
            
            print(f"  📊 TOB opportunities: {tob_opportunities}")
            print(f"  🎯 Top candidates: {len(top_candidates)}")
            
            if not top_candidates:
                print("  ⏭️  No candidates for VWAP analysis")
                continue
            
            # Step 2: Collect symbols from top candidates
            candidate_symbols = set()
            for loop, _ in top_candidates:
                candidate_symbols.update(loop['pairs'])
            
            print(f"  🔍 Candidate symbols: {len(candidate_symbols)}")
            
            # Step 3: Ensure depth streams for candidate symbols
            await depth_pool.ensure(candidate_symbols)
            
            # Step 4: VWAP analysis on top candidates
            print("🔍 Step 2: VWAP analysis...")
            vwap_opportunities = 0
            executions = 0
            
            for loop, tob_result in top_candidates:
                # Get orderbooks for this loop
                orderbooks = {}
                for pair in loop['pairs']:
                    orderbook = depth_pool.get_orderbook(pair)
                    if orderbook:
                        orderbooks[pair] = orderbook
                
                # Calculate with VWAP
                vwap_result = vwap_calc.calculate_loop_profit(loop, quotes, orderbooks)
                
                if vwap_result and vwap_result['is_profitable']:
                    vwap_opportunities += 1
                    total_opportunities += 1
                    
                    path_str = " → ".join(loop['path'])
                    pairs_str = ", ".join(loop['pairs'])
                    
                    # Simulate execution if profit is high enough
                    if vwap_result['net_profit_usdt'] >= args.min_profit * 1.5:
                        executions += 1
                        total_executions += 1
                        print(f"  ✅ EXECUTED | {path_str} | +{vwap_result['net_profit_usdt']:.2f} USDT | size={args.trade_size} | edge=+{vwap_result['profit_pct']:.2f}% | {vwap_result.get('mode', 'TOB')}")
                    else:
                        print(f"  💰 OPPORTUNITY | {path_str} | +{vwap_result['net_profit_usdt']:.2f} USDT | edge=+{vwap_result['profit_pct']:.2f}% | {vwap_result.get('mode', 'TOB')}")
            
            # Print tick summary
            print(f"📊 Tick Summary:")
            print(f"  Loops checked: {len(loops_to_scan)}")
            print(f"  TOB opportunities: {tob_opportunities}")
            print(f"  VWAP opportunities: {vwap_opportunities}")
            print(f"  Executions performed: {executions}")
            print(f"  Total opportunities: {total_opportunities}")
            print(f"  Total executions: {total_executions}")
            print(f"  Market data: {len(quotes)} quotes available")
            print(f"  Depth data: {depth_pool.get_pool_stats()['tracked_symbols']} orderbooks available")
            
            await asyncio.sleep(args.tick_ms / 1000)
            
    except KeyboardInterrupt:
        print("\n\n🛑 Scanner stopped by user")
    except Exception as e:
        print(f"\n❌ Scanner error: {e}")
    finally:
        await price_feed.disconnect()
        await depth_pool.cleanup()
        print("👋 Goodbye!")

if __name__ == "__main__":
    asyncio.run(main())