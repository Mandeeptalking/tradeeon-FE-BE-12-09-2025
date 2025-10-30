#!/usr/bin/env python3
"""
Live triangular arbitrage simulator with virtual execution and PnL tracking.
"""

import argparse
import asyncio
import json
import sys
import time
from pathlib import Path
from typing import Set, List, Dict, Any, Optional

# Add the parent directory to Python path to import our modules
sys.path.insert(0, str(Path(__file__).parent.parent))

from smartbots.arb.price_feed import connect_to_binance, PriceFeed
from smartbots.arb.depth_feed import subscribe_to_depth, DepthFeed
from smartbots.arb.simulator import VirtualExecutor
from smartbots.arb.ledger import Ledger


class LiveArbitrageSimulator:
    """Live simulator for triangular arbitrage with virtual execution."""
    
    def __init__(self, 
                 loops_file: str = "loops.json",
                 trade_size: float = 200.0,
                 min_profit: float = 2.0,
                 fee: float = 0.001,
                 safety: float = 0.001,
                 depth_levels: int = 5,
                 max_depth_streams: int = 120,
                 exclude_coins: Set[str] = None,
                 tick_ms: int = 300,
                 print_top: int = 0,
                 csv_file: Optional[str] = None,
                 db_file: Optional[str] = None,
                 debug: bool = False):
        """
        Initialize the live arbitrage simulator.
        
        Args:
            loops_file: Path to loops JSON file
            trade_size: Trade size in USDT
            min_profit: Minimum profit threshold in USDT
            fee: Trading fee rate
            safety: Safety margin percentage
            depth_levels: Depth levels (5, 10, or 20)
            max_depth_streams: Maximum concurrent depth streams
            exclude_coins: Set of coins to exclude
            tick_ms: Evaluation interval in milliseconds
            print_top: Number of top opportunities to print periodically
            csv_file: Optional CSV file for trade logging
            db_file: Optional SQLite database file for trade logging
        """
        self.loops_file = loops_file
        self.trade_size = trade_size
        self.min_profit = min_profit
        self.fee = fee
        self.safety = safety
        self.depth_levels = depth_levels
        self.max_depth_streams = max_depth_streams
        self.exclude_coins = exclude_coins or set()
        self.tick_ms = tick_ms
        self.print_top = print_top
        self.csv_file = csv_file
        self.db_file = db_file
        self.debug = debug
        
        self.loops = []
        self.price_feed = None
        self.depth_feed = None
        self.executor = None
        self.ledger = None
        self.required_symbols = set()
        
        # Statistics
        self.opportunities_found = 0
        self.executions_performed = 0
        self.last_summary_time = 0
        
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
    
    def setup_executor_and_ledger(self) -> None:
        """Setup virtual executor and ledger."""
        # Initialize virtual executor
        self.executor = VirtualExecutor(
            trade_size=self.trade_size,
            fee_rate=self.fee,
            min_profit=self.min_profit,
            safety=self.safety
        )
        
        # Initialize ledger
        self.ledger = Ledger(csv_file=self.csv_file, db_file=self.db_file)
        
        # Get required symbols
        from smartbots.arb.profit_calc import ProfitCalculator
        temp_calc = ProfitCalculator()
        self.required_symbols = temp_calc.get_required_symbols(self.loops)
        print(f"🔍 Required symbols: {len(self.required_symbols)}")
        
        if self.csv_file:
            print(f"📝 Trade logging to CSV: {self.csv_file}")
        if self.db_file:
            print(f"💾 Trade logging to database: {self.db_file}")
    
    async def connect_to_market(self) -> None:
        """Connect to Binance WebSocket for both price feed and depth feed."""
        try:
            # Connect to price feed (bookTicker for all symbols)
            self.price_feed = await connect_to_binance()
            print("✅ Connected to Binance price feed")
            
            # Connect to depth feed (partial depth for prioritized symbols)
            self.depth_feed = await subscribe_to_depth(
                self.required_symbols, 
                self.depth_levels, 
                self.max_depth_streams
            )
            print("✅ Connected to Binance depth feed")
            
        except Exception as e:
            print(f"❌ Failed to connect to market data: {e}")
            sys.exit(1)
    
    async def wait_for_data(self, timeout: float = 30.0) -> None:
        """Wait for both price and depth data to become available."""
        print("⏳ Waiting for market data...")
        
        start_time = time.time()
        while time.time() - start_time < timeout:
            quote_count = self.price_feed.get_quote_count()
            orderbook_count = self.depth_feed.get_orderbook_count()
            required_count = len(self.required_symbols)
            
            min_required = min(required_count * 0.8, 100)
            
            if quote_count >= min_required:
                print(f"✅ Price feed: {quote_count} quotes")
                print(f"✅ Depth feed: {orderbook_count} orderbooks")
                
                if self.debug:
                    # Show sample of monitored pairs
                    sample_quotes = list(self.price_feed.get_all_quotes().keys())[:10]
                    print(f"🔍 Sample monitored pairs: {', '.join(sample_quotes)}")
                    
                    # Show sample loops
                    sample_loops = self.loops[:5]
                    print("🔍 Sample loops to scan:")
                    for i, loop in enumerate(sample_loops, 1):
                        path_str = " → ".join(loop['path'])
                        pairs_str = ", ".join(loop['pairs'])
                        print(f"  {i}. {path_str} | pairs: {pairs_str}")
                
                return
            
            await asyncio.sleep(0.5)
        
        print(f"⚠️  Timeout waiting for data. Got {quote_count} quotes, {orderbook_count} orderbooks")
    
    async def simulate_opportunities(self) -> None:
        """Main simulation loop."""
        print(f"🚀 Starting live arbitrage simulation...")
        print(f"📈 Trade size: {self.trade_size} USDT")
        print(f"💰 Min profit: {self.min_profit} USDT")
        print(f"💸 Fee rate: {self.fee*100:.3f}%")
        print(f"🛡️  Safety margin: {self.safety*100:.3f}%")
        print(f"📊 Depth levels: {self.depth_levels}")
        print(f"🔗 Max depth streams: {self.max_depth_streams}")
        print("-" * 80)
        
        try:
            while True:
                # Get current data
                quotes = self.price_feed.get_all_quotes()
                orderbooks = self.depth_feed.orderbooks if self.depth_feed else {}
                
                if not quotes:
                    await asyncio.sleep(self.tick_ms / 1000.0)
                    continue
                
                # Find and execute profitable opportunities
                await self._process_opportunities(quotes, orderbooks)
                
                # Print periodic summary
                current_time = time.time()
                if current_time - self.last_summary_time > 60.0:  # Every 60 seconds
                    self._print_periodic_summary()
                    self.last_summary_time = current_time
                
                # Sleep for the configured tick interval
                await asyncio.sleep(self.tick_ms / 1000.0)
                
        except KeyboardInterrupt:
            print("\n🛑 Simulator stopped by user")
        except Exception as e:
            print(f"❌ Simulator error: {e}")
        finally:
            await self._cleanup()
    
    async def _process_opportunities(self, quotes: Dict, orderbooks: Dict) -> None:
        """Process profitable opportunities and execute virtual trades."""
        opportunities_found = 0
        executions_performed = 0
        loops_checked = 0
        
        # Show scanning status every 100 loops
        if len(self.loops) > 100 and hasattr(self, '_last_status_time'):
            current_time = time.time()
            if current_time - self._last_status_time > 10:  # Every 10 seconds
                print(f"🔍 Scanning {len(self.loops)} loops... ({len(quotes)} quotes, {len(orderbooks)} orderbooks)")
                self._last_status_time = current_time
        else:
            self._last_status_time = time.time()
        
        for loop in self.loops:
            loops_checked += 1
            
            # Check if we have quotes for all pairs in this loop
            missing_quotes = [pair for pair in loop['pairs'] if pair not in quotes]
            if missing_quotes:
                continue  # Skip loops with missing data
            
            # Check if this is a profitable opportunity
            is_profitable = self.executor.is_profitable_opportunity(loop, quotes, orderbooks)
            
            if is_profitable:
                opportunities_found += 1
                
                # Execute virtual trade
                start_time = time.time()
                execution_result = self.executor.execute(loop, quotes, orderbooks)
                execution_time = int((time.time() - start_time) * 1000)
                
                if execution_result and execution_result.get('success'):
                    executions_performed += 1
                    
                    # Record trade in ledger
                    self.ledger.record_trade(execution_result, execution_time)
                    
                    # Print execution result
                    summary = self.executor.get_execution_summary(execution_result)
                    timestamp = time.strftime("%H:%M:%S")
                    print(f"[{timestamp}] {summary}")
                    
                    # Optional: Print detailed execution log for first few trades
                    if executions_performed <= 3:
                        detailed_log = self.executor.get_detailed_execution_log(execution_result)
                        print(detailed_log)
                else:
                    # Show why execution failed
                    path_str = " → ".join(loop['path'])
                    print(f"⚠️  Execution failed for {path_str}")
            else:
                # Optionally show rejected opportunities for debugging
                if opportunities_found == 0 and loops_checked % 500 == 0:
                    path_str = " → ".join(loop['path'])
                    pairs_str = ", ".join(loop['pairs'])
                    print(f"🔍 Checked {loops_checked}/{len(self.loops)} loops... (Latest: {path_str} | pairs: {pairs_str})")
        
        # Update statistics
        self.opportunities_found += opportunities_found
        self.executions_performed += executions_performed
    
    def _print_periodic_summary(self) -> None:
        """Print periodic summary of simulation performance."""
        if self.executions_performed == 0:
            print(f"\n📊 SIMULATION STATUS | Opportunities: {self.opportunities_found} | Executions: 0")
            return
        
        self.ledger.print_summary("SIMULATION PERFORMANCE")
        
        # Additional simulation metrics
        execution_rate = (self.executions_performed / max(self.opportunities_found, 1)) * 100
        print(f"Opportunities Found: {self.opportunities_found}")
        print(f"Executions Performed: {self.executions_performed}")
        print(f"Execution Rate: {execution_rate:.1f}%")
        
        # Market data status
        if self.price_feed:
            quote_count = self.price_feed.get_quote_count()
            print(f"Market Data: {quote_count} quotes available")
        
        if self.depth_feed:
            orderbook_count = self.depth_feed.get_orderbook_count()
            print(f"Depth Data: {orderbook_count} orderbooks available")
    
    async def _cleanup(self) -> None:
        """Clean up connections and print final summary."""
        print("\n🔄 Shutting down simulator...")
        
        # Disconnect from market feeds
        if self.price_feed:
            await self.price_feed.disconnect()
        if self.depth_feed:
            await self.depth_feed.disconnect()
        
        # Print final summary
        print("\n📊 FINAL SIMULATION RESULTS")
        print("=" * 60)
        self.ledger.print_summary("FINAL LEDGER SUMMARY")
        
        print(f"\n🎯 SIMULATION STATISTICS")
        print("-" * 30)
        print(f"Total Opportunities Found: {self.opportunities_found}")
        print(f"Total Executions Performed: {self.executions_performed}")
        
        if self.opportunities_found > 0:
            execution_rate = (self.executions_performed / self.opportunities_found) * 100
            print(f"Overall Execution Rate: {execution_rate:.1f}%")
        
        # Show recent trades if available
        recent_trades = self.ledger.get_recent_trades(5)
        if recent_trades:
            print(f"\n📈 RECENT TRADES")
            print("-" * 30)
            for trade in recent_trades:
                timestamp = datetime.fromtimestamp(trade['timestamp'] / 1000).strftime('%H:%M:%S')
                print(f"[{timestamp}] {trade['loop_path']} | "
                      f"{trade['net_profit']:+.2f} USDT | "
                      f"{trade['profit_pct']:+.2f}%")
        
        print("\n✅ Simulation completed successfully!")
        print("=" * 60)


async def main():
    """Main CLI function."""
    parser = argparse.ArgumentParser(
        description="Live triangular arbitrage simulator with virtual execution"
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
        "--depth-levels",
        type=int,
        default=5,
        choices=[5, 10, 20],
        help="Depth levels for order book (default: 5)"
    )
    parser.add_argument(
        "--max-depth-streams",
        type=int,
        default=120,
        help="Maximum concurrent depth streams (default: 120)"
    )
    parser.add_argument(
        "--exclude",
        type=str,
        default="",
        help="Comma-separated list of coins to exclude (e.g., TRY,BRL,EUR)"
    )
    parser.add_argument(
        "--tick-ms",
        type=int,
        default=300,
        help="Evaluation interval in milliseconds (default: 300)"
    )
    parser.add_argument(
        "--print-top",
        type=int,
        default=0,
        help="Print top N opportunities every 5 seconds (default: 0)"
    )
    parser.add_argument(
        "--log-csv",
        type=str,
        help="CSV file path for trade logging (optional)"
    )
    parser.add_argument(
        "--ledger-db",
        type=str,
        help="SQLite database file path for trade logging (optional)"
    )
    parser.add_argument(
        "--debug",
        action="store_true",
        help="Enable debug mode with verbose output"
    )
    
    args = parser.parse_args()
    
    # Parse exclude coins
    exclude_coins = set()
    if args.exclude:
        exclude_coins = set(coin.strip().upper() for coin in args.exclude.split(','))
    
        # Create simulator
        simulator = LiveArbitrageSimulator(
            loops_file=args.loops,
            trade_size=args.trade_size,
            min_profit=args.min_profit,
            fee=args.fee,
            safety=args.safety,
            depth_levels=args.depth_levels,
            max_depth_streams=args.max_depth_streams,
            exclude_coins=exclude_coins,
            tick_ms=args.tick_ms,
            print_top=args.print_top,
            csv_file=args.log_csv,
            db_file=args.ledger_db,
            debug=args.debug
        )
    
    # Run simulator
    simulator.load_loops()
    simulator.setup_executor_and_ledger()
    await simulator.connect_to_market()
    await simulator.wait_for_data()
    await simulator.simulate_opportunities()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n👋 Goodbye!")
    except Exception as e:
        print(f"❌ Fatal error: {e}")
        sys.exit(1)
