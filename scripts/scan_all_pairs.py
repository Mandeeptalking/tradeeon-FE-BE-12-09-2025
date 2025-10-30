#!/usr/bin/env python3
"""
Scan for all types of arbitrage loops (USDT, USDC, and mixed).
"""

import argparse
import json
import asyncio
from smartbots.arb.binance_client import get_exchange_info, normalize_symbols
from smartbots.arb.loop_builder import build_all_loops, summary as loop_summary_func

async def main():
    parser = argparse.ArgumentParser(description="Scan Binance for all types of arbitrage loops.")
    parser.add_argument("--save", type=str, help="Save all loops to a specified JSON file (e.g., all_loops.json)")
    args = parser.parse_args()

    print("🔄 Fetching Binance exchange information...")
    try:
        exchange_info = get_exchange_info()
        print("✅ Data fetched successfully!")
    except Exception as e:
        print(f"❌ Failed to fetch exchange info: {e}")
        return

    markets = normalize_symbols(exchange_info.get('symbols', []))
    total_tradable_symbols = len(markets)
    usdt_spot_symbols = len([m for m in markets if m['quote'] == 'USDT' or m['base'] == 'USDT'])
    usdc_spot_symbols = len([m for m in markets if m['quote'] == 'USDC' or m['base'] == 'USDC'])

    print("\n🔍 Building ALL arbitrage loops (USDT + USDC + Mixed)...")
    loops = build_all_loops(markets)
    loop_summary = loop_summary_func(loops)

    print("\n📊 RESULTS")
    print("==================================================")
    print(f"Total tradable symbols: {total_tradable_symbols}")
    print(f"Total USDT spot symbols: {usdt_spot_symbols}")
    print(f"Total USDC spot symbols: {usdc_spot_symbols}")
    print(f"Total arbitrage loops: {loop_summary['total_loops']}")

    print("\n🏆 TOP 10 COINS BY LOOP FREQUENCY")
    print("----------------------------------------")
    for i, (coin, count) in enumerate(loop_summary['top_10_coins']):
        print(f"{i+1:2}. {coin:8} - {count} loops")

    # Show examples of each type
    usdt_loops = [loop for loop in loops if loop['path'][0] == 'USDT' and loop['path'][-1] == 'USDT']
    usdc_loops = [loop for loop in loops if loop['path'][0] == 'USDC' and loop['path'][-1] == 'USDC']
    mixed_loops = [loop for loop in loops if not (loop['path'][0] == loop['path'][-1])]

    print("\n🔗 EXAMPLE USDT LOOPS")
    print("----------------------------------------")
    for i, loop in enumerate(usdt_loops[:5]):
        path_str = " → ".join(loop['path'])
        pairs_str = ", ".join(loop['pairs'])
        print(f"{i+1}. {path_str:30} | pairs: {pairs_str}")

    print("\n🔗 EXAMPLE USDC LOOPS")
    print("----------------------------------------")
    for i, loop in enumerate(usdc_loops[:5]):
        path_str = " → ".join(loop['path'])
        pairs_str = ", ".join(loop['pairs'])
        print(f"{i+1}. {path_str:30} | pairs: {pairs_str}")

    print("\n🔗 EXAMPLE MIXED LOOPS")
    print("----------------------------------------")
    for i, loop in enumerate(mixed_loops[:5]):
        path_str = " → ".join(loop['path'])
        pairs_str = ", ".join(loop['pairs'])
        print(f"{i+1}. {path_str:30} | pairs: {pairs_str}")

    if args.save:
        try:
            with open(args.save, 'w') as f:
                json.dump(loops, f, indent=2)
            print(f"\n💾 Saved {len(loops)} loops to {args.save}")
        except IOError as e:
            print(f"❌ Failed to save loops to {args.save}: {e}")

if __name__ == "__main__":
    asyncio.run(main())
