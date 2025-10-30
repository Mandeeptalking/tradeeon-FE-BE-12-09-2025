#!/usr/bin/env python3
"""
Professional Triangular Arbitrage Scanner with Paper Trading & Logging
"""

import argparse
import asyncio
import json
import time
import csv
import os
from datetime import datetime
from typing import Dict, List, Set

from smartbots.arb.price_feed import PriceFeed
from smartbots.arb.profit_calc import ProfitCalculator


class PaperTrader:
    """Paper trading with comprehensive logging"""
    
    def __init__(self, log_file: str = "arbitrage_trades.csv"):
        self.log_file = log_file
        self.trades = []
        self.total_profit = 0.0
        self.trade_count = 0
        self.winning_trades = 0
        self.losing_trades = 0
        
        # Initialize CSV file
        self._init_csv()
    
    def _init_csv(self):
        """Initialize CSV file with headers"""
        if not os.path.exists(self.log_file):
            with open(self.log_file, 'w', newline='') as f:
                writer = csv.writer(f)
                writer.writerow([
                    'Timestamp', 'Trade_ID', 'Path', 'Pairs', 'Start_Currency', 
                    'Start_Amount', 'End_Currency', 'End_Amount', 'Net_Profit', 
                    'Profit_Percent', 'Total_Fees', 'Fee_Rate', 'Mode'
                ])
    
    def execute_paper_trade(self, loop: Dict, profit_data: Dict) -> Dict:
        """Execute a paper trade and log it"""
        self.trade_count += 1
        
        trade_id = f"ARB_{self.trade_count:04d}"
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        path_str = " → ".join(loop['path'])
        pairs_str = ", ".join(loop['pairs'])
        start_currency = profit_data.get('start_currency', 'USDT')
        end_currency = profit_data.get('end_currency', 'USDT')
        start_amount = profit_data['start_usdt']
        end_amount = profit_data['final_usdt']
        net_profit = profit_data['net_profit_usdt']
        profit_pct = profit_data['profit_pct']
        
        # Calculate total fees
        num_legs = len(loop['pairs'])
        fee_rate = 0.001  # 0.1% per leg
        total_fees = start_amount * fee_rate * num_legs
        
        # Update statistics
        self.total_profit += net_profit
        if net_profit > 0:
            self.winning_trades += 1
        else:
            self.losing_trades += 1
        
        # Create trade record
        trade_record = {
            'trade_id': trade_id,
            'timestamp': timestamp,
            'path': path_str,
            'pairs': pairs_str,
            'start_currency': start_currency,
            'start_amount': start_amount,
            'end_currency': end_currency,
            'end_amount': end_amount,
            'net_profit': net_profit,
            'profit_percent': profit_pct,
            'total_fees': total_fees,
            'fee_rate': fee_rate,
            'mode': profit_data.get('mode', 'TOB'),
            'num_legs': num_legs
        }
        
        self.trades.append(trade_record)
        
        # Log to CSV
        with open(self.log_file, 'a', newline='') as f:
            writer = csv.writer(f)
            writer.writerow([
                timestamp, trade_id, path_str, pairs_str, start_currency,
                f"{start_amount:.2f}", end_currency, f"{end_amount:.2f}", 
                f"{net_profit:.2f}", f"{profit_pct:.2f}%", f"{total_fees:.2f}",
                f"{fee_rate*100:.1f}%", profit_data.get('mode', 'TOB')
            ])
        
        return trade_record
    
    def get_summary(self) -> Dict:
        """Get trading summary statistics"""
        win_rate = (self.winning_trades / self.trade_count * 100) if self.trade_count > 0 else 0
        avg_profit = self.total_profit / self.trade_count if self.trade_count > 0 else 0
        
        return {
            'total_trades': self.trade_count,
            'winning_trades': self.winning_trades,
            'losing_trades': self.losing_trades,
            'win_rate': win_rate,
            'total_profit': self.total_profit,
            'avg_profit': avg_profit
        }


async def main():
    parser = argparse.ArgumentParser(description="Professional Arbitrage Scanner with Paper Trading")
    parser.add_argument("--loops", type=str, default="./all_loops.json", help="Loops JSON file")
    parser.add_argument("--trade-size", type=float, default=200.0, help="Trade size in USDT/USDC")
    parser.add_argument("--min-profit", type=float, default=1.0, help="Minimum profit in USDT/USDC")
    parser.add_argument("--fee", type=float, default=0.001, help="Taker fee rate (0.001 = 0.1%)")
    parser.add_argument("--safety", type=float, default=0.001, help="Safety margin (0.001 = 0.1%)")
    parser.add_argument("--tick-ms", type=int, default=5000, help="Tick interval in milliseconds")
    parser.add_argument("--max-loops", type=int, default=50, help="Maximum loops to scan")
    parser.add_argument("--exclude", type=str, default="TRY,BRL,EUR", help="Comma-separated coins to exclude")
    parser.add_argument("--log-file", type=str, default="arbitrage_trades.csv", help="Trade log file")
    parser.add_argument("--max-ticks", type=int, default=20, help="Maximum ticks to run (0 = unlimited)")
    
    args = parser.parse_args()
    
    print("🚀 PROFESSIONAL ARBITRAGE SCANNER")
    print("=" * 80)
    print(f"📈 Trade Size: {args.trade_size} USDT/USDC")
    print(f"💰 Minimum Profit: {args.min_profit} USDT/USDC")
    print(f"💸 Fee Rate: {args.fee*100:.1f}% per leg")
    print(f"🛡️  Safety Margin: {args.safety*100:.1f}%")
    print(f"⏱️  Scan Interval: {args.tick_ms}ms")
    print(f"📝 Log File: {args.log_file}")
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
    
    # Filter loops
    excluded_coins = [coin.strip().upper() for coin in args.exclude.split(',')]
    filtered_loops = []
    
    for loop in loops:
        if any(coin in loop['path'] for coin in excluded_coins):
            continue
        filtered_loops.append(loop)
    
    if len(loops) - len(filtered_loops) > 0:
        print(f"🚫 Excluded {len(loops) - len(filtered_loops)} loops containing: {', '.join(excluded_coins)}")
    
    # Balance loop types
    if args.max_loops > 0:
        usdt_loops = [loop for loop in filtered_loops if loop['path'][0] == 'USDT' and loop['path'][-1] == 'USDT']
        usdc_loops = [loop for loop in filtered_loops if loop['path'][0] == 'USDC' and loop['path'][-1] == 'USDC']
        mixed_loops = [loop for loop in filtered_loops if not (loop['path'][0] == loop['path'][-1])]
        
        max_per_type = max(1, args.max_loops // 3)
        balanced_loops = []
        balanced_loops.extend(usdt_loops[:max_per_type])
        balanced_loops.extend(usdc_loops[:max_per_type])
        balanced_loops.extend(mixed_loops[:max_per_type])
        
        remaining_slots = args.max_loops - len(balanced_loops)
        if remaining_slots > 0:
            all_remaining = usdt_loops[max_per_type:] + usdc_loops[max_per_type:] + mixed_loops[max_per_type:]
            balanced_loops.extend(all_remaining[:remaining_slots])
        
        filtered_loops = balanced_loops
    
    usdt_count = len([loop for loop in filtered_loops if loop['path'][0] == 'USDT' and loop['path'][-1] == 'USDT'])
    usdc_count = len([loop for loop in filtered_loops if loop['path'][0] == 'USDC' and loop['path'][-1] == 'USDC'])
    mixed_count = len([loop for loop in filtered_loops if not (loop['path'][0] == loop['path'][-1])])
    
    print(f"🔍 Scanning {len(filtered_loops)} loops:")
    print(f"  • USDT loops: {usdt_count}")
    print(f"  • USDC loops: {usdc_count}")
    print(f"  • Mixed loops: {mixed_count}")
    
    # Get required symbols
    required_symbols = set()
    for loop in filtered_loops:
        required_symbols.update(loop['pairs'])
    
    print(f"📡 Monitoring {len(required_symbols)} trading pairs")
    
    # Initialize components
    price_feed = PriceFeed()
    calculator = ProfitCalculator(
        taker_fee_rate=args.fee,
        min_profit_usdt=args.min_profit,
        safety_margin_pct=args.safety,
        trade_size_usdt=args.trade_size,
        use_vwap=False
    )
    paper_trader = PaperTrader(args.log_file)
    
    # Connect to price feed
    print("\n🔌 Connecting to Binance live market data...")
    await price_feed.connect_bookticker(required_symbols)
    print("✅ Connected to Binance !ticker@arr stream")
    
    # Wait for market data
    print("⏳ Waiting for market quotes...")
    start_time = time.time()
    while True:
        coverage = price_feed.coverage(required_symbols)
        quote_count = price_feed.get_quote_count()
        print(f"   📊 Coverage: {coverage:.1%} ({quote_count}/{len(required_symbols)} symbols)")
        
        if coverage >= 0.4:  # 40% coverage
            print("✅ Sufficient market data received!")
            break
        
        if time.time() - start_time > 30:
            print("⚠️  Timeout waiting for quotes, proceeding with available data...")
            break
        
        await asyncio.sleep(2)
    
    # Main scanning loop
    print(f"\n🎯 STARTING LIVE ARBITRAGE SCANNING")
    print("=" * 80)
    
    tick_count = 0
    opportunities_found = 0
    profitable_trades = 0
    
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
            
            if len(fresh_quotes) < len(required_symbols) * 0.3:
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
                    # Execute paper trade
                    trade_record = paper_trader.execute_paper_trade(loop, profit_data)
                    profitable_trades += 1
                    
                    # Display trade details
                    path_str = " → ".join(loop['path'])
                    pairs_str = ", ".join(loop['pairs'])
                    start_currency = profit_data.get('start_currency', 'USDT')
                    end_currency = profit_data.get('end_currency', 'USDT')
                    net_profit = profit_data['net_profit_usdt']
                    profit_pct = profit_data['profit_pct']
                    num_legs = len(loop['pairs'])
                    total_fees = args.trade_size * args.fee * num_legs
                    
                    print(f"🎯 TRADE #{trade_record['trade_id']}")
                    print(f"   Path: {path_str}")
                    print(f"   Pairs: {pairs_str}")
                    print(f"   Start: {args.trade_size:.2f} {start_currency}")
                    print(f"   End: {profit_data['final_usdt']:.2f} {end_currency}")
                    print(f"   Fees: {total_fees:.2f} {start_currency} ({num_legs} legs × {args.fee*100:.1f}%)")
                    print(f"   NET PROFIT: +{net_profit:.2f} {end_currency} ({profit_pct:+.2f}%)")
                    print(f"   Mode: {profit_data.get('mode', 'TOB')}")
                    print()
                
                if len(profitable_opportunities) > 3:
                    print(f"   ... and {len(profitable_opportunities) - 3} more opportunities")
                    print()
                
            else:
                print("📈 No profitable opportunities found (fees + spreads > profit)")
            
            # Show running summary every 5 scans
            if tick_count % 5 == 0:
                summary = paper_trader.get_summary()
                print("📊 TRADING SUMMARY")
                print("-" * 30)
                print(f"   Total Trades: {summary['total_trades']}")
                print(f"   Winning: {summary['winning_trades']} | Losing: {summary['losing_trades']}")
                print(f"   Win Rate: {summary['win_rate']:.1f}%")
                print(f"   Total P&L: {summary['total_profit']:+.2f} USDT")
                print(f"   Average: {summary['avg_profit']:+.2f} USDT per trade")
                print()
            
            await asyncio.sleep(args.tick_ms / 1000)
    
    except KeyboardInterrupt:
        print(f"\n\n⏹️  SCANNING STOPPED BY USER")
    
    finally:
        # Final summary
        summary = paper_trader.get_summary()
        print("\n" + "=" * 80)
        print("📊 FINAL TRADING SUMMARY")
        print("=" * 80)
        print(f"⏱️  Scanning Duration: {tick_count} ticks")
        print(f"📈 Opportunities Found: {opportunities_found}")
        print(f"💰 Profitable Trades: {profitable_trades}")
        print(f"📊 Success Rate: {profitable_trades/opportunities_found*100:.1f}%" if opportunities_found > 0 else "Success Rate: 0%")
        print()
        print(f"🎯 PAPER TRADING RESULTS:")
        print(f"   Total Trades: {summary['total_trades']}")
        print(f"   Winning Trades: {summary['winning_trades']}")
        print(f"   Losing Trades: {summary['losing_trades']}")
        print(f"   Win Rate: {summary['win_rate']:.1f}%")
        print(f"   Total P&L: {summary['total_profit']:+.2f} USDT")
        print(f"   Average P&L: {summary['avg_profit']:+.2f} USDT per trade")
        print()
        print(f"📝 Trade log saved to: {args.log_file}")
        print("=" * 80)
        
        await price_feed.disconnect()
        print("🔌 Disconnected from market data")


if __name__ == "__main__":
    asyncio.run(main())

