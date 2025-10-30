#!/usr/bin/env python3
"""
Analyze bid-ask spreads to understand why arbitrage opportunities are rare
"""

import argparse
import asyncio
import json
import time
from datetime import datetime
from typing import Dict, List, Set

from smartbots.arb.price_feed import PriceFeed


async def main():
    parser = argparse.ArgumentParser(description="Analyze Bid-Ask Spreads")
    parser.add_argument("--loops", type=str, default="./all_loops_fixed_fdusd.json", help="Loops JSON file")
    parser.add_argument("--exclude", type=str, default="TRY,BRL,EUR", help="Comma-separated coins to exclude")
    
    args = parser.parse_args()
    
    print("📊 BID-ASK SPREAD ANALYSIS")
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
    
    print(f"🔍 Analyzing {len(filtered_loops)} loops")
    
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
    
    # Analyze spreads
    spreads = []
    for symbol, quote in fresh_quotes.items():
        bid = quote['bid']
        ask = quote['ask']
        if bid > 0 and ask > 0:
            spread_pct = ((ask - bid) / bid) * 100
            spreads.append({
                'symbol': symbol,
                'bid': bid,
                'ask': ask,
                'spread_pct': spread_pct
            })
    
    # Sort by spread
    spreads.sort(key=lambda x: x['spread_pct'])
    
    print(f"\n📊 SPREAD ANALYSIS:")
    print("=" * 80)
    
    print(f"Total pairs analyzed: {len(spreads)}")
    if spreads:
        avg_spread = sum(s['spread_pct'] for s in spreads) / len(spreads)
        min_spread = spreads[0]['spread_pct']
        max_spread = spreads[-1]['spread_pct']
        
        print(f"Average spread: {avg_spread:.3f}%")
        print(f"Minimum spread: {min_spread:.3f}%")
        print(f"Maximum spread: {max_spread:.3f}%")
    
    print(f"\n🎯 BEST SPREADS (Lowest):")
    print("-" * 60)
    for i, spread in enumerate(spreads[:20]):
        print(f"{i+1:2}. {spread['symbol']:12} | Bid: {spread['bid']:10.4f} | Ask: {spread['ask']:10.4f} | Spread: {spread['spread_pct']:.3f}%")
    
    print(f"\n❌ WORST SPREADS (Highest):")
    print("-" * 60)
    for i, spread in enumerate(spreads[-20:]):
        print(f"{i+1:2}. {spread['symbol']:12} | Bid: {spread['bid']:10.4f} | Ask: {spread['ask']:10.4f} | Spread: {spread['spread_pct']:.3f}%")
    
    # Analyze by pair type
    usdt_pairs = [s for s in spreads if s['symbol'].endswith('USDT')]
    usdc_pairs = [s for s in spreads if s['symbol'].endswith('USDC')]
    fdusd_pairs = [s for s in spreads if s['symbol'].endswith('FDUSD')]
    other_pairs = [s for s in spreads if not s['symbol'].endswith(('USDT', 'USDC', 'FDUSD'))]
    
    print(f"\n📈 SPREADS BY PAIR TYPE:")
    print("-" * 40)
    
    for pair_type, pairs in [("USDT", usdt_pairs), ("USDC", usdc_pairs), ("FDUSD", fdusd_pairs), ("Other", other_pairs)]:
        if pairs:
            avg_spread = sum(p['spread_pct'] for p in pairs) / len(pairs)
            min_spread = min(p['spread_pct'] for p in pairs)
            max_spread = max(p['spread_pct'] for p in pairs)
            print(f"{pair_type:6} pairs ({len(pairs):3}): Avg: {avg_spread:.3f}% | Min: {min_spread:.3f}% | Max: {max_spread:.3f}%")
    
    # Check spreads for arbitrage calculation impact
    print(f"\n🔍 ARBITRAGE IMPACT ANALYSIS:")
    print("-" * 50)
    
    # Calculate total spread cost for 3-leg arbitrage
    three_leg_cost = 0.3  # 0.1% per leg × 3 legs
    print(f"3-leg arbitrage needs to overcome:")
    print(f"  • Fees: 0.3% (3 × 0.1%)")
    print(f"  • Spreads: Variable per pair")
    print(f"  • Total needed: > 0.3% + spreads")
    
    # Count pairs that might work
    tight_spreads = [s for s in spreads if s['spread_pct'] < 0.05]  # < 0.05%
    medium_spreads = [s for s in spreads if 0.05 <= s['spread_pct'] < 0.1]  # 0.05-0.1%
    wide_spreads = [s for s in spreads if s['spread_pct'] >= 0.1]  # >= 0.1%
    
    print(f"\n📊 SPREAD DISTRIBUTION:")
    print(f"  Tight spreads (< 0.05%): {len(tight_spreads)} pairs")
    print(f"  Medium spreads (0.05-0.1%): {len(medium_spreads)} pairs")
    print(f"  Wide spreads (>= 0.1%): {len(wide_spreads)} pairs")
    
    print(f"\n💡 RECOMMENDATIONS:")
    print("-" * 30)
    print("1. Focus on pairs with spreads < 0.05%")
    print("2. Avoid pairs with spreads > 0.1%")
    print("3. Consider major pairs (BTC, ETH, BNB)")
    print("4. Monitor during high volatility periods")
    print("5. Use maker orders when possible (better prices)")
    
    await price_feed.disconnect()
    print("\n🔌 Disconnected from market data")


if __name__ == "__main__":
    asyncio.run(main())

