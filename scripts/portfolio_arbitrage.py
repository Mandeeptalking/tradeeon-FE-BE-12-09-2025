#!/usr/bin/env python3
"""
Portfolio-Based Arbitrage Scanner
Start with a portfolio of assets and find optimal trading paths to maximize total value
"""

import argparse
import asyncio
import json
import time
from datetime import datetime
from typing import Dict, List, Set, Tuple
from itertools import combinations, permutations

from smartbots.arb.price_feed import PriceFeed
from smartbots.arb.profit_calc import ProfitCalculator


class PortfolioArbitrage:
    def __init__(self, initial_portfolio: Dict[str, float], fee_rate: float = 0.001):
        """
        Initialize portfolio arbitrage scanner.
        
        Args:
            initial_portfolio: Starting portfolio {asset: amount}
            fee_rate: Trading fee rate (0.001 = 0.1%)
        """
        self.initial_portfolio = initial_portfolio.copy()
        self.fee_rate = fee_rate
        self.total_initial_value = sum(initial_portfolio.values())
        
        # Create all possible trading pairs from portfolio assets
        self.portfolio_assets = list(initial_portfolio.keys())
        self.trading_pairs = self._generate_trading_pairs()
        
        print(f"🎯 PORTFOLIO ARBITRAGE INITIALIZED")
        print(f"💰 Initial Portfolio: {self.initial_portfolio}")
        print(f"📊 Total Initial Value: {self.total_initial_value:.2f} USDT")
        print(f"🔄 Trading Pairs: {len(self.trading_pairs)}")
    
    def _generate_trading_pairs(self) -> List[str]:
        """Generate all possible trading pairs from portfolio assets."""
        pairs = []
        
        # Add direct pairs (A/USDT, A/USDC, etc.)
        stablecoins = ['USDT', 'USDC', 'FDUSD']
        for asset in self.portfolio_assets:
            for stable in stablecoins:
                pairs.append(f"{asset}{stable}")
        
        # Add cross pairs (A/B, B/A)
        for asset1 in self.portfolio_assets:
            for asset2 in self.portfolio_assets:
                if asset1 != asset2:
                    pairs.append(f"{asset1}{asset2}")
        
        return pairs
    
    def calculate_portfolio_value(self, portfolio: Dict[str, float], quotes: Dict[str, Dict]) -> float:
        """Calculate total portfolio value in USDT."""
        total_value = 0.0
        
        for asset, amount in portfolio.items():
            if asset == 'USDT':
                total_value += amount
            else:
                # Try to find USDT pair for this asset
                usdt_pair = f"{asset}USDT"
                if usdt_pair in quotes:
                    # Use mid price
                    mid_price = (quotes[usdt_pair]['bid'] + quotes[usdt_pair]['ask']) / 2
                    total_value += amount * mid_price
                else:
                    # Asset value unknown, assume original value
                    total_value += amount
        
        return total_value
    
    def find_arbitrage_opportunities(self, quotes: Dict[str, Dict]) -> List[Dict]:
        """Find arbitrage opportunities within the portfolio."""
        opportunities = []
        
        # Strategy 1: Direct asset swaps (2-leg)
        for asset1, amount1 in self.initial_portfolio.items():
            if amount1 <= 0:
                continue
                
            for asset2 in self.portfolio_assets:
                if asset1 == asset2:
                    continue
                
                # Check direct swap: Asset1 -> Asset2
                swap_result = self._simulate_direct_swap(asset1, amount1, asset2, quotes)
                if swap_result:
                    opportunities.append({
                        'type': 'direct_swap',
                        'path': f"{asset1} → {asset2}",
                        'start_amount': amount1,
                        'end_amount': swap_result['amount'],
                        'profit': swap_result['profit'],
                        'profit_pct': swap_result['profit_pct']
                    })
        
        # Strategy 2: Triangular arbitrage (3-leg)
        for asset1, amount1 in self.initial_portfolio.items():
            if amount1 <= 0:
                continue
                
            for asset2 in self.portfolio_assets:
                if asset1 == asset2:
                    continue
                    
                for asset3 in self.portfolio_assets:
                    if asset3 in [asset1, asset2]:
                        continue
                    
                    # Check triangular: Asset1 -> Asset2 -> Asset3
                    triangle_result = self._simulate_triangular(asset1, amount1, asset2, asset3, quotes)
                    if triangle_result:
                        opportunities.append({
                            'type': 'triangular',
                            'path': f"{asset1} → {asset2} → {asset3}",
                            'start_amount': amount1,
                            'end_amount': triangle_result['amount'],
                            'profit': triangle_result['profit'],
                            'profit_pct': triangle_result['profit_pct']
                        })
        
        # Sort by profit
        opportunities.sort(key=lambda x: x['profit'], reverse=True)
        return opportunities
    
    def _simulate_direct_swap(self, from_asset: str, amount: float, to_asset: str, quotes: Dict[str, Dict]) -> Dict:
        """Simulate direct asset swap."""
        try:
            # Find trading pair
            pair = f"{from_asset}{to_asset}"
            if pair not in quotes:
                # Try reverse pair
                pair = f"{to_asset}{from_asset}"
                if pair not in quotes:
                    return None
            
            quote = quotes[pair]
            
            # Convert both assets to USDT value for proper comparison
            from_usdt_value = self._get_usdt_value(from_asset, amount, quotes)
            if from_usdt_value is None:
                return None
            
            if pair.startswith(from_asset):
                # from_asset/to_asset: sell from_asset at bid price
                received_amount = (amount * quote['bid']) * (1 - self.fee_rate)
            else:
                # to_asset/from_asset: buy to_asset at ask price
                received_amount = (amount / quote['ask']) * (1 - self.fee_rate)
            
            # Convert received amount to USDT value
            to_usdt_value = self._get_usdt_value(to_asset, received_amount, quotes)
            if to_usdt_value is None:
                return None
            
            # Calculate profit in USDT
            profit = to_usdt_value - from_usdt_value
            profit_pct = (profit / from_usdt_value) * 100 if from_usdt_value > 0 else 0
            
            return {
                'amount': received_amount,
                'profit': profit,
                'profit_pct': profit_pct
            }
            
        except Exception:
            return None
    
    def _get_usdt_value(self, asset: str, amount: float, quotes: Dict[str, Dict]) -> float:
        """Get USDT value of an asset amount."""
        if asset == 'USDT':
            return amount
        
        # Try to find USDT pair
        usdt_pair = f"{asset}USDT"
        if usdt_pair in quotes:
            quote = quotes[usdt_pair]
            mid_price = (quote['bid'] + quote['ask']) / 2
            return amount * mid_price
        
        # If no USDT pair, try to find via other stablecoins
        for stable in ['USDC', 'FDUSD']:
            stable_pair = f"{asset}{stable}"
            if stable_pair in quotes:
                quote = quotes[stable_pair]
                mid_price = (quote['bid'] + quote['ask']) / 2
                
                # Convert stablecoin to USDT (assume 1:1 for stablecoins)
                stable_value = amount * mid_price
                return stable_value
        
        return None
    
    def _simulate_triangular(self, asset1: str, amount: float, asset2: str, asset3: str, quotes: Dict[str, Dict]) -> Dict:
        """Simulate triangular arbitrage path."""
        try:
            # Get original USDT value
            original_usdt_value = self._get_usdt_value(asset1, amount, quotes)
            if original_usdt_value is None:
                return None
            
            current_amount = amount
            
            # Leg 1: Asset1 -> Asset2
            leg1_result = self._simulate_direct_swap(asset1, current_amount, asset2, quotes)
            if not leg1_result:
                return None
            current_amount = leg1_result['amount']
            
            # Leg 2: Asset2 -> Asset3
            leg2_result = self._simulate_direct_swap(asset2, current_amount, asset3, quotes)
            if not leg2_result:
                return None
            
            final_amount = leg2_result['amount']
            
            # Get final USDT value
            final_usdt_value = self._get_usdt_value(asset3, final_amount, quotes)
            if final_usdt_value is None:
                return None
            
            # Calculate profit in USDT
            profit = final_usdt_value - original_usdt_value
            profit_pct = (profit / original_usdt_value) * 100 if original_usdt_value > 0 else 0
            
            return {
                'amount': final_amount,
                'profit': profit,
                'profit_pct': profit_pct
            }
            
        except Exception:
            return None


async def main():
    parser = argparse.ArgumentParser(description="Portfolio-Based Arbitrage Scanner")
    parser.add_argument("--portfolio", type=str, default="DOT:100,ADA:100,ETH:100,BTC:100,XRP:100,POL:100", help="Initial portfolio (asset:amount)")
    parser.add_argument("--fee", type=float, default=0.001, help="Trading fee rate (0.001 = 0.1%)")
    parser.add_argument("--min-profit", type=float, default=1.0, help="Minimum profit threshold")
    parser.add_argument("--tick-ms", type=int, default=3000, help="Tick interval in milliseconds")
    parser.add_argument("--show-all", action="store_true", help="Show all opportunities")
    
    args = parser.parse_args()
    
    print("🎯 PORTFOLIO ARBITRAGE SCANNER")
    print("=" * 80)
    
    # Parse portfolio
    portfolio = {}
    for item in args.portfolio.split(','):
        asset, amount = item.split(':')
        portfolio[asset] = float(amount)
    
    print(f"📊 Initial Portfolio:")
    for asset, amount in portfolio.items():
        print(f"  • {asset}: {amount} units")
    
    # Initialize portfolio arbitrage
    portfolio_arb = PortfolioArbitrage(portfolio, args.fee)
    
    # Get required trading pairs
    required_pairs = set(portfolio_arb.trading_pairs)
    print(f"📡 Monitoring {len(required_pairs)} trading pairs")
    
    # Initialize price feed
    price_feed = PriceFeed()
    
    # Connect to price feed
    print(f"\n🔌 Connecting to Binance live market data...")
    await price_feed.connect_bookticker(required_pairs)
    print("✅ Connected to Binance !ticker@arr stream")
    
    # Wait for market data
    print("⏳ Waiting for market quotes...")
    start_time = time.time()
    
    while True:
        coverage = price_feed.coverage(required_pairs)
        quote_count = price_feed.get_quote_count()
        elapsed = time.time() - start_time
        
        print(f"   📊 Coverage: {coverage:.1%} ({quote_count}/{len(required_pairs)} pairs) - {elapsed:.0f}s")
        
        if coverage >= 0.3:  # 30% coverage minimum
            print("✅ Sufficient market data received!")
            break
        
        if elapsed > 30:
            print("⚠️  Timeout waiting for quotes, proceeding with available data...")
            break
        
        await asyncio.sleep(3)
    
    # Get fresh quotes
    fresh_quotes = price_feed.get_fresh_quotes(required_pairs, max_age_seconds=10.0)
    print(f"📈 Got quotes for {len(fresh_quotes)} pairs")
    
    # Show sample quotes
    print(f"\n📊 SAMPLE PORTFOLIO QUOTES:")
    for pair in sorted(list(fresh_quotes.keys()))[:10]:
        quote = fresh_quotes[pair]
        spread_pct = ((quote['ask'] - quote['bid']) / quote['bid']) * 100 if quote['bid'] > 0 else 0
        print(f"  {pair:12}: Bid={quote['bid']:10.4f}, Ask={quote['ask']:10.4f}, Spread={spread_pct:.3f}%")
    
    # Main scanning loop
    print(f"\n🎯 STARTING PORTFOLIO ARBITRAGE SCANNING")
    print("=" * 80)
    print("💡 This will run continuously until you press Ctrl+C")
    print("=" * 80)
    
    tick_count = 0
    total_opportunities = 0
    
    try:
        while True:  # INFINITE LOOP - only stops with Ctrl+C
            tick_count += 1
            current_time = datetime.now().strftime("%H:%M:%S")
            
            print(f"\n[{current_time}] 🔍 SCAN #{tick_count}")
            print("-" * 60)
            
            # Get fresh quotes
            fresh_quotes = price_feed.get_fresh_quotes(required_pairs, max_age_seconds=10.0)
            coverage = len(fresh_quotes) / len(required_pairs) * 100
            
            print(f"📊 Market Data: {len(fresh_quotes)}/{len(required_pairs)} pairs ({coverage:.1f}% coverage)")
            
            if len(fresh_quotes) < len(required_pairs) * 0.2:
                print("⚠️  Insufficient market data, skipping scan...")
                await asyncio.sleep(args.tick_ms / 1000)
                continue
            
            # Find arbitrage opportunities
            opportunities = portfolio_arb.find_arbitrage_opportunities(fresh_quotes)
            profitable_opportunities = [opp for opp in opportunities if opp['profit'] >= args.min_profit]
            
            total_opportunities += len(profitable_opportunities)
            
            print(f"🧮 Found {len(opportunities)} total opportunities")
            print(f"💰 Profitable opportunities: {len(profitable_opportunities)}")
            
            if profitable_opportunities:
                print(f"\n🎯 TOP PROFITABLE OPPORTUNITIES:")
                print("=" * 60)
                
                for i, opp in enumerate(profitable_opportunities[:10]):
                    print(f"{i+1:2}. {opp['type'].upper()}: {opp['path']}")
                    print(f"    Start: {opp['start_amount']:.2f} | End: {opp['end_amount']:.2f}")
                    print(f"    Profit: +{opp['profit']:.2f} ({opp['profit_pct']:+.2f}%)")
                    print()
                
                if len(profitable_opportunities) > 10:
                    print(f"    ... and {len(profitable_opportunities) - 10} more opportunities")
                    print()
            
            elif args.show_all and opportunities:
                print(f"\n📊 ALL OPPORTUNITIES (INCLUDING UNPROFITABLE):")
                print("=" * 60)
                
                for i, opp in enumerate(opportunities[:10]):
                    status = "✅ PROFITABLE" if opp['profit'] >= args.min_profit else "❌ LOSS"
                    print(f"{i+1:2}. {opp['path']:30} | {opp['profit']:+.2f} ({opp['profit_pct']:+.2f}%) | {status}")
                
                if len(opportunities) > 10:
                    print(f"  ... and {len(opportunities) - 10} more opportunities")
                    print()
            
            else:
                print("📈 No profitable opportunities found")
                if not args.show_all:
                    print("💡 Use --show-all to see all opportunities")
            
            # Show running statistics every 10 scans
            if tick_count % 10 == 0:
                print(f"\n📊 RUNNING STATISTICS (after {tick_count} scans):")
                print(f"   Total profitable opportunities found: {total_opportunities}")
                print(f"   Average per scan: {total_opportunities/tick_count:.1f}")
                print()
            
            await asyncio.sleep(args.tick_ms / 1000)
    
    except KeyboardInterrupt:
        print(f"\n\n⏹️  SCANNING STOPPED BY USER (Ctrl+C)")
    
    finally:
        # Final summary
        print("\n" + "=" * 80)
        print("📊 FINAL PORTFOLIO ARBITRAGE SUMMARY")
        print("=" * 80)
        print(f"⏱️  Scanning Duration: {tick_count} scans")
        print(f"💰 Total Profitable Opportunities: {total_opportunities}")
        print(f"📡 Trading Pairs Monitored: {len(required_pairs)}")
        print(f"📊 Final Quote Coverage: {len(fresh_quotes)}/{len(required_pairs)} ({len(fresh_quotes)/len(required_pairs)*100:.1f}%)")
        print(f"🎯 Portfolio Assets: {', '.join(portfolio.keys())}")
        print("=" * 80)
        
        await price_feed.disconnect()
        print("🔌 Disconnected from market data")


if __name__ == "__main__":
    asyncio.run(main())
