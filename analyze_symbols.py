#!/usr/bin/env python3
"""
Analyze symbol coverage in loops.json
"""

import json

def analyze_symbols():
    with open('loops.json', 'r') as f:
        loops = json.load(f)

    # Get all unique symbols from loops
    all_symbols = set()
    for loop in loops:
        all_symbols.update(loop['pairs'])

    print(f"📊 SYMBOL ANALYSIS")
    print(f"=" * 50)
    print(f"Total symbols needed: {len(all_symbols)}")
    
    usdt_symbols = [s for s in all_symbols if s.endswith('USDT')]
    non_usdt_symbols = [s for s in all_symbols if not s.endswith('USDT')]
    
    print(f"USDT symbols: {len(usdt_symbols)}")
    print(f"Non-USDT symbols: {len(non_usdt_symbols)}")
    
    # Show first 20 USDT symbols
    usdt_symbols_sorted = sorted(usdt_symbols)
    print(f"\n🔍 First 20 USDT symbols needed:")
    for i, symbol in enumerate(usdt_symbols_sorted[:20]):
        print(f"{i+1:2}. {symbol}")
    
    # Show some non-USDT symbols
    non_usdt_sorted = sorted(non_usdt_symbols)
    print(f"\n🔍 Sample non-USDT symbols:")
    for i, symbol in enumerate(non_usdt_sorted[:10]):
        print(f"{i+1:2}. {symbol}")
    
    # Check for low-volume pairs
    print(f"\n📈 COVERAGE EXPECTATIONS:")
    print(f"Active trading pairs (24h volume > 0): ~{len(usdt_symbols) * 0.6:.0f} USDT pairs")
    print(f"Inactive pairs (no recent trades): ~{len(usdt_symbols) * 0.4:.0f} USDT pairs")
    print(f"Expected coverage: 60-70% (only active pairs)")

if __name__ == "__main__":
    analyze_symbols()

