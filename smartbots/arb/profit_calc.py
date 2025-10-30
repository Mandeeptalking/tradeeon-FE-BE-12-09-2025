"""
Profit calculation for triangular arbitrage loops.
"""

from typing import Dict, List, Optional, Tuple
import math
from .vwap import calculate_vwap_leg, validate_orderbook, get_top_of_book


class ProfitCalculator:
    """Calculate profitability of triangular arbitrage loops."""
    
    def __init__(self, 
                 taker_fee_rate: float = 0.001,
                 min_profit_usdt: float = 2.0,
                 safety_margin_pct: float = 0.001,
                 trade_size_usdt: float = 200.0,
                 use_vwap: bool = True):
        """
        Initialize profit calculator.
        
        Args:
            taker_fee_rate: Trading fee rate (default 0.1%)
            min_profit_usdt: Minimum profit in USDT (default 2.0)
            safety_margin_pct: Safety margin percentage (default 0.1%)
            trade_size_usdt: Trade size in USDT (default 200.0)
            use_vwap: Whether to use VWAP calculations (default True)
        """
        self.taker_fee_rate = taker_fee_rate
        self.min_profit_usdt = min_profit_usdt
        self.safety_margin_pct = safety_margin_pct
        self.trade_size_usdt = trade_size_usdt
        self.use_vwap = use_vwap
    
    def calculate_loop_profit_tob(self, 
                                loop: Dict[str, List[str]], 
                                quotes: Dict[str, Dict[str, float]]) -> Optional[Dict[str, float]]:
        """
        Calculate profit using top-of-book only (fast approximation).
        
        Args:
            loop: Loop dictionary with 'path' and 'pairs'
            quotes: Dictionary of symbol quotes with bid/ask prices
            
        Returns:
            Profit calculation result or None if calculation fails
        """
        try:
            path = loop['path']
            pairs = loop['pairs']
            
            # Validate we have all required quotes
            for pair in pairs:
                if pair not in quotes:
                    return None
            
            # Calculate using top-of-book
            final_usdt = self._simulate_arbitrage_path(path, pairs, quotes)
            
            if final_usdt is None:
                return None
            
            # Calculate metrics
            net_profit_usdt = final_usdt - self.trade_size_usdt
            profit_ratio = final_usdt / self.trade_size_usdt
            profit_pct = (profit_ratio - 1) * 100
            
            # Check if profitable
            min_ratio = 1 + self.safety_margin_pct + (self.min_profit_usdt / self.trade_size_usdt)
            is_profitable = (profit_ratio >= min_ratio and 
                           net_profit_usdt >= self.min_profit_usdt)
            
            return {
                'final_usdt': final_usdt,
                'net_profit_usdt': net_profit_usdt,
                'profit_ratio': profit_ratio,
                'profit_pct': profit_pct,
                'is_profitable': is_profitable,
                'start_usdt': self.trade_size_usdt,
                'mode': 'TOB'
            }
            
        except Exception:
            return None

    def calculate_loop_profit(self, 
                            loop: Dict[str, List[str]], 
                            quotes: Dict[str, Dict[str, float]],
                            orderbooks: Optional[Dict[str, Dict]] = None) -> Optional[Dict[str, float]]:
        """
        Calculate profit for a single loop.
        
        Args:
            loop: Loop dictionary with 'path' and 'pairs'
            quotes: Dictionary of symbol quotes with bid/ask prices
            orderbooks: Optional dictionary of order books for VWAP calculation
            
        Returns:
            Profit calculation result or None if calculation fails
        """
        try:
            path = loop['path']
            pairs = loop['pairs']
            
            # Validate we have all required quotes
            for pair in pairs:
                if pair not in quotes:
                    return None
            
            # Choose calculation method with fallback
            if self.use_vwap and orderbooks:
                # Try VWAP first, fallback to TOB if any symbol missing from depth
                missing_depth = any(pair not in orderbooks for pair in pairs)
                if missing_depth:
                    # Fallback to TOB
                    final_usdt = self._simulate_arbitrage_path(path, pairs, quotes)
                    mode_info = {"mode": "TOB (fallback)"}
                else:
                    # Use VWAP
                    final_usdt, mode_info = self._simulate_arbitrage_path_vwap(path, pairs, quotes, orderbooks)
            else:
                # Use TOB only
                final_usdt = self._simulate_arbitrage_path(path, pairs, quotes)
                mode_info = {"mode": "TOB"}
            
            if final_usdt is None:
                return None
            
            # Calculate metrics based on starting currency
            start_currency = path[0]
            if start_currency == 'USDT':
                start_amount = self.trade_size_usdt
            elif start_currency == 'USDC':
                start_amount = self.trade_size_usdt  # Assume same size for USDC
            else:
                start_amount = self.trade_size_usdt
            
            # Convert final amount to USDT equivalent for profit calculation
            if path[-1] == 'USDT':
                final_usdt_equiv = final_usdt
            elif path[-1] == 'USDC':
                # Convert USDC to USDT using USDCUSDT rate (assume 1:1 for now)
                final_usdt_equiv = final_usdt  # USDC ≈ USDT
            else:
                final_usdt_equiv = final_usdt  # Assume already in USDT equivalent
            
            net_profit_usdt = final_usdt_equiv - start_amount
            profit_ratio = final_usdt_equiv / start_amount
            profit_pct = (profit_ratio - 1) * 100
            
            # Check if profitable
            min_ratio = 1 + self.safety_margin_pct + (self.min_profit_usdt / start_amount)
            is_profitable = (profit_ratio >= min_ratio and 
                           net_profit_usdt >= self.min_profit_usdt)
            
            result = {
                'final_usdt': final_usdt_equiv,
                'net_profit_usdt': net_profit_usdt,
                'profit_ratio': profit_ratio,
                'profit_pct': profit_pct,
                'is_profitable': is_profitable,
                'start_usdt': start_amount,
                'start_currency': start_currency,
                'end_currency': path[-1]
            }
            
            # Add mode information
            result.update(mode_info)
            
            return result
            
        except Exception:
            return None
    
    def _simulate_arbitrage_path(self, 
                                path: List[str], 
                                pairs: List[str], 
                                quotes: Dict[str, Dict[str, float]]) -> Optional[float]:
        """
        Simulate the arbitrage path and calculate final amount.
        
        Args:
            path: Trading path (e.g., ['USDT', 'BTC', 'ETH', 'USDT'] or ['USDC', 'ADA', 'USDT'])
            pairs: Trading pairs (e.g., ['BTCUSDT', 'BTCETH', 'ETHUSDT'] or ['ADAUSDC', 'ADAUSDT'])
            quotes: Current market quotes
            
        Returns:
            Final amount in the target currency or None if calculation fails
        """
        try:
            # Determine starting currency and amount
            start_currency = path[0]
            if start_currency == 'USDT':
                amount = self.trade_size_usdt
            elif start_currency == 'USDC':
                amount = self.trade_size_usdt  # Assume same size for USDC
            else:
                amount = self.trade_size_usdt
            
            # Process each leg of the path
            for i in range(len(pairs)):
                pair = pairs[i]
                quote = quotes[pair]
                
                if i == 0:
                    # First leg: Start currency -> First asset
                    from_currency = path[0]
                    to_asset = path[1]
                    
                    if pair.endswith(from_currency):
                        # XUSDT format: buy X with USDT at ask price
                        amount = (amount / quote['ask']) * (1 - self.taker_fee_rate)
                    else:
                        # USDTX format: sell USDT for X at bid price
                        amount = (amount * quote['bid']) * (1 - self.taker_fee_rate)
                
                elif i == len(pairs) - 1:
                    # Last leg: Last asset -> End currency
                    from_asset = path[-2]
                    to_currency = path[-1]
                    
                    if pair.endswith(to_currency):
                        # XUSDT format: sell X for USDT at bid price
                        amount = (amount * quote['bid']) * (1 - self.taker_fee_rate)
                    else:
                        # USDTX format: buy USDT with X at ask price
                        amount = (amount / quote['ask']) * (1 - self.taker_fee_rate)
                
                else:
                    # Middle leg: Asset -> Asset
                    from_asset = path[i]
                    to_asset = path[i + 1]
                    
                    if pair.startswith(from_asset):
                        # XYT format: sell X for Y at bid price
                        amount = (amount * quote['bid']) * (1 - self.taker_fee_rate)
                    else:
                        # YXT format: buy Y with X at ask price
                        amount = (amount / quote['ask']) * (1 - self.taker_fee_rate)
            
            return amount
            
        except Exception:
            return None
    
    def validate_quotes(self, quotes: Dict[str, Dict[str, float]]) -> bool:
        """
        Validate quote data quality.
        
        Args:
            quotes: Dictionary of quotes to validate
            
        Returns:
            True if quotes are valid, False otherwise
        """
        for symbol, quote in quotes.items():
            bid = quote.get('bid', 0)
            ask = quote.get('ask', 0)
            
            # Check for invalid prices
            if bid <= 0 or ask <= 0:
                return False
            
            # Check for unreasonable spread (more than 10%)
            spread_pct = (ask - bid) / bid
            if spread_pct > 0.1:
                return False
        
        return True
    
    def get_required_symbols(self, loops: List[Dict[str, List[str]]]) -> set:
        """
        Get all required symbols for the given loops.
        
        Args:
            loops: List of loop dictionaries
            
        Returns:
            Set of required trading pair symbols
        """
        symbols = set()
        for loop in loops:
            symbols.update(loop['pairs'])
        return symbols
    
    def filter_profitable_loops(self, 
                               loops: List[Dict[str, List[str]]], 
                               quotes: Dict[str, Dict[str, float]],
                               orderbooks: Optional[Dict[str, Dict]] = None) -> List[Tuple[Dict, Dict[str, float]]]:
        """
        Filter loops that are profitable.
        
        Args:
            loops: List of loop dictionaries
            quotes: Current market quotes
            orderbooks: Optional order books for VWAP calculation
            
        Returns:
            List of tuples (loop, profit_data) for profitable loops
        """
        profitable = []
        
        for loop in loops:
            profit_data = self.calculate_loop_profit(loop, quotes, orderbooks)
            if profit_data and profit_data['is_profitable']:
                profitable.append((loop, profit_data))
        
        # Sort by net profit (descending)
        profitable.sort(key=lambda x: x[1]['net_profit_usdt'], reverse=True)
        
        return profitable
    
    def _simulate_arbitrage_path_vwap(self, 
                                    path: List[str], 
                                    pairs: List[str], 
                                    quotes: Dict[str, Dict[str, float]],
                                    orderbooks: Dict[str, Dict]) -> Tuple[Optional[float], Dict[str, str]]:
        """
        Simulate arbitrage path using VWAP calculations with fallback to top-of-book.
        
        Args:
            path: Trading path (e.g., ['USDT', 'BTC', 'ETH', 'USDT'])
            pairs: Trading pairs (e.g., ['BTCUSDT', 'BTCETH', 'ETHUSDT'])
            quotes: Current market quotes
            orderbooks: Order books for VWAP calculation
            
        Returns:
            Tuple of (final_usdt_amount, mode_info) or (None, {}) if calculation fails
        """
        try:
            amount = self.trade_size_usdt
            mode_info = {"mode": "VWAP"}
            
            # Leg 1: USDT -> X (buy X with USDT)
            pair1 = pairs[0]
            asset_x = path[1]
            
            # Try VWAP first, fallback to top-of-book
            if pair1 in orderbooks and validate_orderbook(orderbooks[pair1]):
                vwap_price, x_qty = calculate_vwap_leg(orderbooks[pair1], 'buy', amount, True)
                if vwap_price is not None:
                    amount = x_qty * (1 - self.taker_fee_rate)
                    mode_info[f"leg1_{pair1}"] = "VWAP"
                else:
                    # Fallback to top-of-book
                    quote1 = quotes[pair1]
                    if pair1.endswith('USDT'):
                        amount = (amount / quote1['ask']) * (1 - self.taker_fee_rate)
                    else:
                        amount = (amount * quote1['bid']) * (1 - self.taker_fee_rate)
                    mode_info[f"leg1_{pair1}"] = "TOB"
            else:
                # Fallback to top-of-book
                quote1 = quotes[pair1]
                if pair1.endswith('USDT'):
                    amount = (amount / quote1['ask']) * (1 - self.taker_fee_rate)
                else:
                    amount = (amount * quote1['bid']) * (1 - self.taker_fee_rate)
                mode_info[f"leg1_{pair1}"] = "TOB"
            
            # Leg 2: X -> Y
            pair2 = pairs[1]
            asset_y = path[2]
            
            # Determine direction and try VWAP
            if pair2 in orderbooks and validate_orderbook(orderbooks[pair2]):
                if pair2.startswith(asset_x):
                    # XYT format: sell X for Y
                    vwap_price, y_qty = calculate_vwap_leg(orderbooks[pair2], 'sell', amount, False)
                    if vwap_price is not None:
                        amount = y_qty * (1 - self.taker_fee_rate)
                        mode_info[f"leg2_{pair2}"] = "VWAP"
                    else:
                        # Fallback
                        quote2 = quotes[pair2]
                        amount = (amount * quote2['bid']) * (1 - self.taker_fee_rate)
                        mode_info[f"leg2_{pair2}"] = "TOB"
                else:
                    # YXT format: buy Y with X
                    vwap_price, y_qty = calculate_vwap_leg(orderbooks[pair2], 'buy', amount, False)
                    if vwap_price is not None:
                        amount = y_qty * (1 - self.taker_fee_rate)
                        mode_info[f"leg2_{pair2}"] = "VWAP"
                    else:
                        # Fallback
                        quote2 = quotes[pair2]
                        amount = (amount / quote2['ask']) * (1 - self.taker_fee_rate)
                        mode_info[f"leg2_{pair2}"] = "TOB"
            else:
                # Fallback to top-of-book
                quote2 = quotes[pair2]
                if pair2.startswith(asset_x):
                    amount = (amount * quote2['bid']) * (1 - self.taker_fee_rate)
                else:
                    amount = (amount / quote2['ask']) * (1 - self.taker_fee_rate)
                mode_info[f"leg2_{pair2}"] = "TOB"
            
            # Leg 3: Y -> USDT (sell Y for USDT)
            pair3 = pairs[2]
            
            # Try VWAP first, fallback to top-of-book
            if pair3 in orderbooks and validate_orderbook(orderbooks[pair3]):
                vwap_price, final_usdt = calculate_vwap_leg(orderbooks[pair3], 'sell', amount, False)
                if vwap_price is not None:
                    final_usdt *= (1 - self.taker_fee_rate)
                    mode_info[f"leg3_{pair3}"] = "VWAP"
                else:
                    # Fallback
                    quote3 = quotes[pair3]
                    if pair3.endswith('USDT'):
                        final_usdt = (amount * quote3['bid']) * (1 - self.taker_fee_rate)
                    else:
                        final_usdt = (amount / quote3['ask']) * (1 - self.taker_fee_rate)
                    mode_info[f"leg3_{pair3}"] = "TOB"
            else:
                # Fallback to top-of-book
                quote3 = quotes[pair3]
                if pair3.endswith('USDT'):
                    final_usdt = (amount * quote3['bid']) * (1 - self.taker_fee_rate)
                else:
                    final_usdt = (amount / quote3['ask']) * (1 - self.taker_fee_rate)
                mode_info[f"leg3_{pair3}"] = "TOB"
            
            return final_usdt, mode_info
            
        except Exception:
            return None, {}
