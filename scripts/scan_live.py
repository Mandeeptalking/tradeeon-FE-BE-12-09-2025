#!/usr/bin/env python3
"""
Live triangular arbitrage scanner with real-time price monitoring.
"""

import argparse
import asyncio
import json
import sys
import time
from pathlib import Path
from typing import Set, List, Dict, Any

# Add the parent directory to Python path to import our modules
sys.path.insert(0, str(Path(__file__).parent.parent))

from smartbots.arb.price_feed import connect_to_binance, PriceFeed
from smartbots.arb.profit_calc import ProfitCalculator


class LiveArbitrageScanner:
    """Live scanner for triangular arbitrage opportunities."""
    
    def __init__(self, 
                 loops_file: str = "loops.json",
                 trade_size: float = 200.0,
                 min_profit: float = 2.0,
                 fee: float = 0.001,
                 safety: float = 0.001,
                 exclude_coins: Set[str] = None,
                 print_top: int = 0):
        """
        Initialize the live scanner.
        
        Args:
            loops_file: Path to loops JSON file
            trade_size: Trade size in USDT
            min_profit: Minimum profit threshold in USDT
            fee: Trading fee rate
            safety: Safety margin percentage
            exclude_coins: Set of coins to exclude
            print_top: Number of top opportunities to print periodically
        """
        self.loops_file = loops_file
        self.trade_size = trade_size
        self.min_profit = min_profit
        self.fee = fee
        self.safety = safety
        self.exclude_coins = exclude_coins or set()
        self.print_top = print_top
        
        self.loops = []
        self.price_feed = None
        self.profit_calc = None
        self.required_symbols = set()
        
    def load_loops(self) -> None:
        """Load loops from JSON file."""
        try:
            with open(self.loops_file, 'r') as f:
                all_loops = json.load(f)
            
            # Filter out excluded coins
            self.loops = []
            for loop in all_loops:
                path = loop['path']
                # Check if any intermediate assets are in exclude list
                intermediate_assets = path[1:-1]  # Exclude USDT start/end
                if not any(asset in self.exclude_coins for asset in intermediate_assets):
                    self.loops.append(loop)
            
            print(f"📊 Loaded {len(self.loops)} loops from {self.loops_file}")
            if self.exclude_coins:
                print(f"🚫 Excluded coins: {', '.join(sorted(self.exclude_coins))}")
                
        except FileNotFoundError:
            print(f"❌ Loops file not found: {self.loops_file}")
            sys.exit(1)
        except json.JSONDecodeError as e:
            print(f"❌ Invalid JSON in loops file: {e}")
            sys.exit(1)
    
    def setup_calculator(self) -> None:
        """Setup profit calculator."""
        self.profit_calc = ProfitCalculator(
            taker_fee_rate=self.fee,
            min_profit_usdt=self.min_profit,
            safety_margin_pct=self.safety,
            trade_size_usdt=self.trade_size
        )
        
        # Get required symbols
        self.required_symbols = self.profit_calc.get_required_symbols(self.loops)
        print(f"🔍 Required symbols: {len(self.required_symbols)}")
    
    async def connect_to_market(self) -> None:
        """Connect to Binance WebSocket."""
        try:
            self.price_feed = await connect_to_binance(self.required_symbols)
            print("✅ Connected to Binance WebSocket")
        except Exception as e:
            print(f"❌ Failed to connect to market data: {e}")
            sys.exit(1)
    
    async def wait_for_quotes(self, timeout: float = 30.0) -> None:
        """Wait for quotes to become available."""
        print("⏳ Waiting for market data...")
        
        start_time = time.time()
        while time.time() - start_time < timeout:
            quote_count = self.price_feed.get_quote_count()
            required_count = len(self.required_symbols)
            
            if quote_count >= min(required_count * 0.8, 100):  # At least 80% or 100 quotes
                print(f"✅ Received {quote_count} quotes (required: {required_count})")
                return
            
            await asyncio.sleep(0.5)
        
        print(f"⚠️  Timeout waiting for quotes. Got {self.price_feed.get_quote_count()} quotes")
    
    async def scan_opportunities(self) -> None:
        """Main scanning loop."""
        print(f"🚀 Starting live scan...")
        print(f"📈 Trade size: {self.trade_size} USDT")
        print(f"💰 Min profit: {self.min_profit} USDT")
        print(f"💸 Fee rate: {self.fee*100:.3f}%")
        print(f"🛡️  Safety margin: {self.safety*100:.3f}%")
        print("-" * 80)
        
        last_top_print = 0
        
        try:
            while True:
                # Get current quotes
                quotes = self.price_feed.get_all_quotes()
                
                if not quotes:
                    await asyncio.sleep(0.1)
                    continue
                
                # Find profitable opportunities
                profitable = self.profit_calc.filter_profitable_loops(self.loops, quotes)
                
                # Print individual opportunities
                for loop, profit_data in profitable:
                    self._print_opportunity(loop, profit_data)
                
                # Print top N summary periodically
                if self.print_top > 0 and time.time() - last_top_print > 5.0:
                    self._print_top_opportunities(profitable[:self.print_top])
                    last_top_print = time.time()
                
                # Sleep to avoid CPU spinning
                await asyncio.sleep(0.2)
                
        except KeyboardInterrupt:
            print("\n🛑 Scanner stopped by user")
        except Exception as e:
            print(f"❌ Scanner error: {e}")
        finally:
            if self.price_feed:
                await self.price_feed.disconnect()
    
    def _print_opportunity(self, loop: Dict[str, List[str]], profit_data: Dict[str, float]) -> None:
        """Print a single opportunity."""
        timestamp = time.strftime("%H:%M:%S")
        path_str = " → ".join(loop['path'])
        pairs_str = ", ".join(loop['pairs'])
        net_profit = profit_data['net_profit_usdt']
        profit_pct = profit_data['profit_pct']
        
        print(f"[{timestamp}] {path_str:<30} | pairs: {pairs_str:<25} | "
              f"size={self.trade_size} | net=+{net_profit:.2f} USDT | edge=+{profit_pct:.2f}%")
    
    def _print_top_opportunities(self, top_opportunities: List[tuple]) -> None:
        """Print top N opportunities summary."""
        if not top_opportunities:
            return
        
        print(f"\n🏆 TOP {len(top_opportunities)} OPPORTUNITIES")
        print("-" * 80)
        
        for i, (loop, profit_data) in enumerate(top_opportunities, 1):
            path_str = " → ".join(loop['path'])
            net_profit = profit_data['net_profit_usdt']
            profit_pct = profit_data['profit_pct']
            print(f"{i:2d}. {path_str:<30} | +{net_profit:.2f} USDT | +{profit_pct:.2f}%")
        
        print("-" * 80)


async def main():
    """Main CLI function."""
    parser = argparse.ArgumentParser(
        description="Live triangular arbitrage scanner"
    )
    parser.add_argument(
        "--loops",
        type=str,
        default="loops.json",
        help="Path to loops JSON file (default: loops.json)"
    )
    parser.add_argument(
        "--trade-size",
        type=float,
        default=200.0,
        help="Trade size in USDT (default: 200)"
    )
    parser.add_argument(
        "--min-profit",
        type=float,
        default=2.0,
        help="Minimum profit in USDT (default: 2)"
    )
    parser.add_argument(
        "--fee",
        type=float,
        default=0.001,
        help="Trading fee rate (default: 0.001)"
    )
    parser.add_argument(
        "--safety",
        type=float,
        default=0.001,
        help="Safety margin percentage (default: 0.001)"
    )
    parser.add_argument(
        "--print-top",
        type=int,
        default=0,
        help="Print top N opportunities every 5 seconds (default: 0)"
    )
    parser.add_argument(
        "--exclude",
        type=str,
        default="",
        help="Comma-separated list of coins to exclude (e.g., TRY,BRL,EUR)"
    )
    
    args = parser.parse_args()
    
    # Parse exclude coins
    exclude_coins = set()
    if args.exclude:
        exclude_coins = set(coin.strip().upper() for coin in args.exclude.split(','))
    
    # Create scanner
    scanner = LiveArbitrageScanner(
        loops_file=args.loops,
        trade_size=args.trade_size,
        min_profit=args.min_profit,
        fee=args.fee,
        safety=args.safety,
        exclude_coins=exclude_coins,
        print_top=args.print_top
    )
    
    # Run scanner
    scanner.load_loops()
    scanner.setup_calculator()
    await scanner.connect_to_market()
    await scanner.wait_for_quotes()
    await scanner.scan_opportunities()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n👋 Goodbye!")
    except Exception as e:
        print(f"❌ Fatal error: {e}")
        sys.exit(1)

