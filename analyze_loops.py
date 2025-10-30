#!/usr/bin/env python3
"""
Analyze the loops to understand filtering
"""

import json

def analyze_loops():
    with open('all_loops.json', 'r') as f:
        loops = json.load(f)

    print("📊 LOOP TYPE ANALYSIS")
    print("=" * 50)

    usdt_loops = [loop for loop in loops if loop['path'][0] == 'USDT' and loop['path'][-1] == 'USDT']
    usdc_loops = [loop for loop in loops if loop['path'][0] == 'USDC' and loop['path'][-1] == 'USDC']
    mixed_loops = [loop for loop in loops if not (loop['path'][0] == loop['path'][-1])]

    print(f"USDT loops: {len(usdt_loops)}")
    print(f"USDC loops: {len(usdc_loops)}")
    print(f"Mixed loops: {len(mixed_loops)}")

    print("\n🔍 Sample USDC loops:")
    for i, loop in enumerate(usdc_loops[:5]):
        path_str = " → ".join(loop['path'])
        pairs_str = ", ".join(loop['pairs'])
        print(f"{i+1}. {path_str} | {pairs_str}")

    print("\n🔍 Sample Mixed loops:")
    for i, loop in enumerate(mixed_loops[:5]):
        path_str = " → ".join(loop['path'])
        pairs_str = ", ".join(loop['pairs'])
        print(f"{i+1}. {path_str} | {pairs_str}")

    # Check what coins are in the loops
    all_coins = set()
    for loop in loops:
        all_coins.update(loop['path'])

    print(f"\n📈 All coins in loops: {sorted(list(all_coins))}")
    
    # Check filtering impact
    excluded_coins = ['TRY', 'BRL', 'EUR', 'FDUSD']
    filtered_loops = []
    
    for loop in loops:
        if any(coin in loop['path'] for coin in excluded_coins):
            continue
        filtered_loops.append(loop)
    
    print(f"\n🚫 FILTERING IMPACT:")
    print(f"Original loops: {len(loops)}")
    print(f"After filtering: {len(filtered_loops)}")
    print(f"Excluded: {len(loops) - len(filtered_loops)}")
    
    # Analyze filtered loops by type
    usdt_filtered = [loop for loop in filtered_loops if loop['path'][0] == 'USDT' and loop['path'][-1] == 'USDT']
    usdc_filtered = [loop for loop in filtered_loops if loop['path'][0] == 'USDC' and loop['path'][-1] == 'USDC']
    mixed_filtered = [loop for loop in filtered_loops if not (loop['path'][0] == loop['path'][-1])]
    
    print(f"\n📊 After filtering:")
    print(f"USDT loops: {len(usdt_filtered)}")
    print(f"USDC loops: {len(usdc_filtered)}")
    print(f"Mixed loops: {len(mixed_filtered)}")

if __name__ == "__main__":
    analyze_loops()

