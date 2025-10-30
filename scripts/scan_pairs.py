#!/usr/bin/env python3
"""
CLI tool for scanning Binance pairs and building triangular arbitrage loops.
"""

import argparse
import json
import sys
from pathlib import Path

# Add the parent directory to Python path to import our modules
sys.path.insert(0, str(Path(__file__).parent.parent))

from smartbots.arb.binance_client import get_exchange_info, normalize_symbols
from smartbots.arb.loop_builder import build_usdt_loops, summary


def main():
    """Main CLI function."""
    parser = argparse.ArgumentParser(
        description="Scan Binance pairs and build USDT triangular arbitrage loops"
    )
    parser.add_argument(
        "--save",
        type=str,
        help="Save all loops to a JSON file"
    )
    
    args = parser.parse_args()
    
    try:
        print("🔄 Fetching Binance exchange information...")
        
        # Fetch and normalize data
        exchange_info = get_exchange_info()
        all_symbols = normalize_symbols(exchange_info["symbols"])
        
        # Filter USDT symbols
        usdt_symbols = [s for s in all_symbols if s["quote"] == "USDT"]
        
        print("✅ Data fetched successfully!")
        print()
        
        # Build triangular loops
        print("🔍 Building USDT triangular arbitrage loops...")
        loops = build_usdt_loops(all_symbols)
        
        # Generate summary
        stats = summary(loops)
        
        # Print results
        print_results(all_symbols, usdt_symbols, loops, stats)
        
        # Save to file if requested
        if args.save:
            save_loops(loops, args.save)
            
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)


def print_results(all_symbols, usdt_symbols, loops, stats):
    """Print formatted results to console."""
    
    print("📊 RESULTS")
    print("=" * 50)
    print(f"Total tradable symbols: {len(all_symbols)}")
    print(f"Total USDT spot symbols: {len(usdt_symbols)}")
    print(f"Total USDT-based triangular loops: {stats['total_loops']}")
    print()
    
    print("🏆 TOP 10 COINS BY LOOP FREQUENCY")
    print("-" * 40)
    for i, (coin, count) in enumerate(stats['top_10_coins'], 1):
        print(f"{i:2d}. {coin:<8} - {count} loops")
    print()
    
    print("🔗 EXAMPLE LOOPS")
    print("-" * 40)
    
    # Show first 5 loops as examples
    example_loops = loops[:5]
    for i, loop in enumerate(example_loops, 1):
        path_str = " → ".join(loop["path"])
        pairs_str = ", ".join(loop["pairs"])
        print(f"{i}. {path_str:<25} | pairs: {pairs_str}")
    
    if len(loops) > 5:
        print(f"... and {len(loops) - 5} more loops")


def save_loops(loops, filename):
    """Save loops to a JSON file."""
    try:
        with open(filename, 'w') as f:
            json.dump(loops, f, indent=2)
        print(f"\n💾 Saved {len(loops)} loops to {filename}")
    except Exception as e:
        print(f"❌ Failed to save loops: {e}")


if __name__ == "__main__":
    main()

