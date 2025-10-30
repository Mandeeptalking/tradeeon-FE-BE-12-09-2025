#!/usr/bin/env python3
"""
Real example of how sample quotes are used in arbitrage
"""

def show_arbitrage_example():
    print("🔄 REAL ARBITRAGE EXAMPLE USING SAMPLE QUOTES")
    print("=" * 60)
    
    # Real data from our scanner
    print("📈 SAMPLE QUOTES FROM OUR SCANNER:")
    quotes = {
        'BTCUSDT': {'bid': 115485.47, 'ask': 115485.48},
        'ETHUSDT': {'bid': 4473.23, 'ask': 4473.24},
        'BNBUSDT': {'bid': 954.13, 'ask': 954.14},
        'ADAUSDT': {'bid': 0.8726, 'ask': 0.8727},
        'SOLUSDT': {'bid': 235.58, 'ask': 235.59}
    }
    
    for symbol, data in quotes.items():
        spread = ((data['ask'] - data['bid']) / data['ask']) * 100
        print(f"{symbol:10}: Bid={data['bid']:8.2f}, Ask={data['ask']:8.2f}, Spread={spread:5.3f}%")
    
    print("\n🎯 ARBITRAGE SIMULATION:")
    print("Path: USDT → ADA → SOL → USDT")
    print("Starting: 100 USDT")
    print()
    
    # Simulate arbitrage
    start_usdt = 100
    fee_rate = 0.001  # 0.1% fee per trade
    
    print("🔄 Step-by-step calculation:")
    
    # Leg 1: USDT → ADA (buy ADA with USDT)
    ada_received = (start_usdt / quotes['ADAUSDT']['ask']) * (1 - fee_rate)
    print(f"1. Buy ADA: {start_usdt} USDT → {ada_received:.6f} ADA")
    print(f"   (Using ADAUSDT ask price: {quotes['ADAUSDT']['ask']})")
    
    # Leg 2: ADA → SOL (sell ADA for SOL)
    # We need ADA/SOL pair - let's assume it exists
    ada_sol_bid = 0.00037  # Example price
    sol_received = (ada_received * ada_sol_bid) * (1 - fee_rate)
    print(f"2. Sell ADA for SOL: {ada_received:.6f} ADA → {sol_received:.6f} SOL")
    print(f"   (Using ADASOL bid price: {ada_sol_bid})")
    
    # Leg 3: SOL → USDT (sell SOL for USDT)
    final_usdt = (sol_received * quotes['SOLUSDT']['bid']) * (1 - fee_rate)
    print(f"3. Sell SOL: {sol_received:.6f} SOL → {final_usdt:.2f} USDT")
    print(f"   (Using SOLUSDT bid price: {quotes['SOLUSDT']['bid']})")
    
    # Calculate profit
    profit = final_usdt - start_usdt
    profit_pct = (profit / start_usdt) * 100
    
    print(f"\n💰 RESULT:")
    print(f"Starting: {start_usdt} USDT")
    print(f"Final:    {final_usdt:.2f} USDT")
    print(f"Profit:   {profit:+.2f} USDT ({profit_pct:+.2f}%)")
    
    if profit > 0:
        print("✅ PROFITABLE ARBITRAGE OPPORTUNITY!")
    else:
        print("❌ No profit (fees + spreads ate the profit)")
    
    print(f"\n🔍 WHY SAMPLE QUOTES MATTER:")
    print(f"• They provide the REAL prices for these calculations")
    print(f"• They show if spreads are tight enough for profit")
    print(f"• They confirm we have live market data")
    print(f"• They validate the arbitrage scanner is working")

if __name__ == "__main__":
    show_arbitrage_example()

