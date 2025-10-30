#!/usr/bin/env python3
"""
Working live triangular arbitrage scanner with detailed logging and verification.
Uses individual ticker streams (proven to work) with smart symbol management.
"""

import asyncio
import argparse
import json
import time
import csv
from pathlib import Path
from typing import Set, List, Dict, Optional, Tuple
from datetime import datetime
import os

# Add the parent directory to Python path
import sys
sys.path.insert(0, str(Path(__file__).parent.parent))

from smartbots.arb.price_feed import connect_to_binance
from smartbots.arb.profit_calc import ProfitCalculator

class ArbitrageLogger:
    """Logger for arbitrage opportunities and performance."""
    
    def __init__(self, log_dir: str = "arbitrage_logs"):
        self.log_dir = Path(log_dir)
        self.log_dir.mkdir(exist_ok=True)
        
        # CSV files for logging
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        self.opportunities_file = self.log_dir / f"opportunities_{timestamp}.csv"
        self.summary_file = self.log_dir / f"summary_{timestamp}.txt"
        
        # Initialize CSV files
        self._init_csv_files()
        
        # Statistics
        self.stats = {
            'total_ticks': 0,
            'total_opportunities': 0,
            'total_profit': 0.0,
            'start_time': time.time(),
            'pairs_scanned': set(),
            'loops_analyzed': 0,
            'best_opportunity': None
        }
    
    def _init_csv_files(self):
        """Initialize CSV files with headers."""
        with open(self.opportunities_file, 'w', newline='') as f:
            writer = csv.writer(f)
            writer.writerow([
                'timestamp', 'tick', 'loop', 'pairs', 'profit_usdt', 'profit_pct', 
                'trade_size', 'candidate_rank'
            ])
    
    def log_opportunity(self, tick: int, loop: Dict, result: Dict, rank: int = 0):
        """Log an arbitrage opportunity."""
        timestamp = datetime.now().isoformat()
        path_str = " → ".join(loop['path'])
        pairs_str = ", ".join(loop['pairs'])
        
        with open(self.opportunities_file, 'a', newline='') as f:
            writer = csv.writer(f)
            writer.writerow([
                timestamp, tick, path_str, pairs_str, 
                f"{result['net_profit_usdt']:.4f}", f"{result['profit_pct']:.4f}",
                result['start_usdt'], rank
            ])
        
        # Update stats
        self.stats['total_opportunities'] += 1
        self.stats['total_profit'] += result['net_profit_usdt']
        self.stats['pairs_scanned'].update(loop['pairs'])
        
        # Track best opportunity
        if (self.stats['best_opportunity'] is None or 
            result['net_profit_usdt'] > self.stats['best_opportunity']['profit']):
            self.stats['best_opportunity'] = {
                'loop': path_str,
                'pairs': pairs_str,
                'profit': result['net_profit_usdt'],
                'pct': result['profit_pct'],
                'tick': tick
            }
    
    def get_running_summary(self) -> Dict:
        """Get current running summary."""
        runtime = time.time() - self.stats['start_time']
        
        return {
            'runtime_minutes': runtime / 60,
            'total_ticks': self.stats['total_ticks'],
            'total_opportunities': self.stats['total_opportunities'],
            'total_profit': self.stats['total_profit'],
            'pairs_scanned': len(self.stats['pairs_scanned']),
            'loops_analyzed': self.stats['loops_analyzed'],
            'avg_opportunities_per_tick': self.stats['total_opportunities'] / max(1, self.stats['total_ticks']),
            'best_opportunity': self.stats['best_opportunity']
        }
    
    def save_summary(self):
        """Save final summary to file."""
        summary = self.get_running_summary()
        
        with open(self.summary_file, 'w') as f:
            f.write("ARBITRAGE SCANNER SUMMARY\n")
            f.write("=" * 50 + "\n\n")
            f.write(f"Runtime: {summary['runtime_minutes']:.1f} minutes\n")
            f.write(f"Total ticks: {summary['total_ticks']}\n")
            f.write(f"Total opportunities found: {summary['total_opportunities']}\n")
            f.write(f"Total profit: {summary['total_profit']:.2f} USDT\n")
            f.write(f"Pairs scanned: {summary['pairs_scanned']}\n")
            f.write(f"Loops analyzed: {summary['loops_analyzed']}\n")
            f.write(f"Average opportunities per tick: {summary['avg_opportunities_per_tick']:.2f}\n\n")
            
            if summary['best_opportunity']:
                f.write("BEST OPPORTUNITY:\n")
                f.write("-" * 20 + "\n")
                best = summary['best_opportunity']
                f.write(f"Loop: {best['loop']}\n")
                f.write(f"Pairs: {best['pairs']}\n")
                f.write(f"Profit: {best['profit']:.4f} USDT ({best['pct']:.2f}%)\n")
                f.write(f"Found at tick: {best['tick']}\n\n")
            
            f.write("SCANNED PAIRS:\n")
            f.write("-" * 20 + "\n")
            for pair in sorted(self.stats['pairs_scanned']):
                f.write(f"{pair}\n")
        
        print(f"📝 Summary saved to: {self.summary_file}")

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

async def verify_real_data(price_feed, required_symbols: Set[str]) -> Dict:
    """Verify we're getting real market data."""
    print("\n🔍 VERIFYING REAL MARKET DATA")
    print("=" * 50)
    
    # Get fresh quotes
    quotes = price_feed.get_fresh_quotes(required_symbols)
    
    # Check major pairs
    major_pairs = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'ADAUSDT', 'SOLUSDT']
    
    print("📈 Major pair verification:")
    for pair in major_pairs:
        if pair in quotes:
            quote = quotes[pair]
            spread = quote['ask'] - quote['bid']
            spread_pct = (spread / quote['ask']) * 100
            print(f"  ✅ {pair}: Bid={quote['bid']:.4f}, Ask={quote['ask']:.4f}, Spread={spread_pct:.3f}%")
        else:
            print(f"  ❌ {pair}: Not available")
    
    # Check coverage
    coverage = price_feed.coverage(required_symbols)
    print(f"\n📊 Coverage: {coverage:.1%} ({len(quotes)}/{len(required_symbols)} symbols)")
    
    # Check quote freshness
    current_time = time.time()
    stale_count = 0
    for symbol, quote in quotes.items():
        quote_time = quote['ts'] / 1000.0
        if current_time - quote_time > 5:  # 5 seconds
            stale_count += 1
    
    print(f"⏰ Quote freshness: {len(quotes) - stale_count}/{len(quotes)} fresh (within 5s)")
    
    # Show sample quotes
    print(f"\n📈 Sample quotes:")
    for i, (symbol, quote) in enumerate(list(quotes.items())[:10]):
        spread = quote['ask'] - quote['bid']
        spread_pct = (spread / quote['ask']) * 100 if quote['ask'] > 0 else 0
        print(f"  {symbol:12}: bid={quote['bid']:8.4f}, ask={quote['ask']:8.4f}, spread={spread_pct:.3f}%")
    
    return {
        'coverage': coverage,
        'total_quotes': len(quotes),
        'fresh_quotes': len(quotes) - stale_count,
        'major_pairs_available': sum(1 for p in major_pairs if p in quotes)
    }

async def main():
    parser = argparse.ArgumentParser(description="Working live triangular arbitrage scanner")
    parser.add_argument("--loops", default="loops.json", help="Loops JSON file (default: loops.json)")
    parser.add_argument("--trade-size", type=float, default=200.0, help="Trade size in USDT (default: 200)")
    parser.add_argument("--min-profit", type=float, default=1.0, help="Minimum profit in USDT (default: 1)")
    parser.add_argument("--fee", type=float, default=0.001, help="Taker fee rate (default: 0.001)")
    parser.add_argument("--safety", type=float, default=0.001, help="Safety margin (default: 0.001)")
    parser.add_argument("--tick-ms", type=int, default=3000, help="Scan interval in milliseconds (default: 3000)")
    parser.add_argument("--max-loops", type=int, default=100, help="Max loops to scan per tick (default: 100)")
    parser.add_argument("--log-dir", default="arbitrage_logs", help="Log directory (default: arbitrage_logs)")
    parser.add_argument("--exclude", type=str, help="Comma-separated list of coins to exclude")
    parser.add_argument("--verify-only", action="store_true", help="Only verify data, don't scan")
    
    args = parser.parse_args()
    
    print("🚀 Starting WORKING triangular arbitrage scanner...")
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
    
    # Initialize logger
    logger = ArbitrageLogger(args.log_dir)
    
    # Initialize profit calculator
    profit_calc = ProfitCalculator(
        taker_fee_rate=args.fee,
        min_profit_usdt=args.min_profit,
        safety_margin_pct=args.safety,
        trade_size_usdt=args.trade_size,
        use_vwap=False  # Use TOB only for now
    )
    
    # Connect to price feed (using working individual streams)
    print(f"\n🔌 Connecting to Binance ticker streams...")
    price_feed = await connect_to_binance(required_symbols)
    print("✅ Connected to price feed!")
    
    # Wait for quotes and verify
    print("⏳ Waiting for market quotes...")
    start_time = time.time()
    while time.time() - start_time < 30:
        coverage = price_feed.coverage(required_symbols)
        quote_count = price_feed.get_quote_count()
        print(f"   Coverage: {coverage:.1%} ({quote_count} quotes)")
        
        if coverage >= 0.3:  # Lower threshold since we're using limited streams
            print("✅ Sufficient coverage achieved!")
            break
        await asyncio.sleep(2)
    
    # Verify real data
    verification = await verify_real_data(price_feed, required_symbols)
    
    if args.verify_only:
        print("\n✅ Verification complete. Exiting as requested.")
        await price_feed.disconnect()
        return
    
    if verification['coverage'] < 0.1:
        print("⚠️  Warning: Very low coverage, results will be limited")
    
    # Start scanning
    print(f"\n🚀 Starting live scanning...")
    print(f"📈 Trade size: {args.trade_size} USDT")
    print(f"💰 Min profit: {args.min_profit} USDT")
    print(f"💸 Fee rate: {args.fee*100:.2f}%")
    print(f"🛡️  Safety margin: {args.safety*100:.2f}%")
    print(f"⏱️  Scan interval: {args.tick_ms}ms")
    print(f"📝 Logging to: {args.log_dir}")
    print("=" * 80)
    
    tick_count = 0
    
    try:
        while True:
            tick_count += 1
            current_time = time.strftime("%H:%M:%S")
            print(f"\n🔄 TICK #{tick_count} [{current_time}]")
            print("-" * 40)
            
            # Get fresh quotes
            quotes = price_feed.get_fresh_quotes(required_symbols)
            
            # Scan loops
            opportunities = 0
            loops_to_scan = loops[:args.max_loops]
            
            print(f"🔍 Scanning {len(loops_to_scan)} loops...")
            
            for rank, loop in enumerate(loops_to_scan):
                result = profit_calc.calculate_loop_profit_tob(loop, quotes)
                
                if result and result['is_profitable']:
                    opportunities += 1
                    
                    # Log opportunity
                    logger.log_opportunity(tick_count, loop, result, rank)
                    
                    path_str = " → ".join(loop['path'])
                    pairs_str = ", ".join(loop['pairs'])
                    
                    print(f"  💰 OPPORTUNITY | {path_str} | +{result['net_profit_usdt']:.2f} USDT | edge=+{result['profit_pct']:.2f}%")
            
            # Update stats
            logger.stats['total_ticks'] += 1
            logger.stats['loops_analyzed'] += len(loops_to_scan)
            
            # Print tick summary
            print(f"📊 Tick Summary:")
            print(f"  Loops checked: {len(loops_to_scan)}")
            print(f"  Opportunities found: {opportunities}")
            print(f"  Market data: {len(quotes)} quotes available")
            print(f"  Coverage: {price_feed.coverage(required_symbols):.1%}")
            
            # Show running summary every 10 ticks
            if tick_count % 10 == 0:
                summary = logger.get_running_summary()
                print(f"\n📊 RUNNING SUMMARY")
                print(f"  Runtime: {summary['runtime_minutes']:.1f} minutes")
                print(f"  Total opportunities: {summary['total_opportunities']}")
                print(f"  Total profit: {summary['total_profit']:.2f} USDT")
                print(f"  Pairs scanned: {summary['pairs_scanned']}")
                
                if summary['best_opportunity']:
                    best = summary['best_opportunity']
                    print(f"  Best opportunity: {best['profit']:.2f} USDT ({best['pct']:.2f}%) - {best['loop']}")
            
            await asyncio.sleep(args.tick_ms / 1000)
            
    except KeyboardInterrupt:
        print("\n\n🛑 Scanner stopped by user")
    except Exception as e:
        print(f"\n❌ Scanner error: {e}")
    finally:
        # Save final summary
        logger.save_summary()
        
        # Cleanup
        await price_feed.disconnect()
        print("👋 Goodbye!")

if __name__ == "__main__":
    asyncio.run(main())

