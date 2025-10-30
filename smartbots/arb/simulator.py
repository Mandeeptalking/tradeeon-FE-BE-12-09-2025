"""
Virtual execution simulator for triangular arbitrage loops.
"""

import time
from typing import Dict, List, Optional, Tuple
from .profit_calc import ProfitCalculator
from .vwap import calculate_vwap_leg, validate_orderbook


class VirtualExecutor:
    """Simulates executing triangular arbitrage loops with VWAP pricing."""
    
    def __init__(self, 
                 trade_size: float, 
                 fee_rate: float, 
                 min_profit: float, 
                 safety: float):
        """
        Initialize virtual executor.
        
        Args:
            trade_size: Trade size in USDT
            fee_rate: Trading fee rate per leg
            min_profit: Minimum profit threshold in USDT
            safety: Safety margin percentage
        """
        self.trade_size = trade_size
        self.fee_rate = fee_rate
        self.min_profit = min_profit
        self.safety = safety
        self.profit_calc = ProfitCalculator(
            taker_fee_rate=fee_rate,
            min_profit_usdt=min_profit,
            safety_margin_pct=safety,
            trade_size_usdt=trade_size,
            use_vwap=True
        )
    
    def execute(self, 
                loop: Dict[str, List[str]], 
                quotes: Dict[str, Dict[str, float]], 
                orderbooks: Optional[Dict[str, Dict]] = None) -> Optional[Dict]:
        """
        Simulate executing the arbitrage loop with VWAP depth.
        
        Args:
            loop: Loop dictionary with 'path' and 'pairs'
            quotes: Current market quotes
            orderbooks: Optional order books for VWAP calculation
            
        Returns:
            Execution result dictionary or None if execution fails
        """
        try:
            path = loop['path']
            pairs = loop['pairs']
            
            # Validate we have all required quotes
            for pair in pairs:
                if pair not in quotes:
                    return None
            
            # Execute the arbitrage path: USDT -> X -> Y -> USDT
            execution_result = self._execute_arbitrage_path(path, pairs, quotes, orderbooks)
            
            if execution_result is None:
                return None
            
            # Add metadata
            execution_result.update({
                "loop": loop,
                "start_usdt": self.trade_size,
                "timestamp": int(time.time() * 1000),
                "executor_config": {
                    "trade_size": self.trade_size,
                    "fee_rate": self.fee_rate,
                    "min_profit": self.min_profit,
                    "safety": self.safety
                }
            })
            
            return execution_result
            
        except Exception as e:
            print(f"❌ Execution error: {e}")
            return None
    
    def _execute_arbitrage_path(self, 
                              path: List[str], 
                              pairs: List[str], 
                              quotes: Dict[str, Dict[str, float]],
                              orderbooks: Optional[Dict[str, Dict]]) -> Optional[Dict]:
        """
        Execute the arbitrage path step by step.
        
        Args:
            path: Trading path (e.g., ['USDT', 'BTC', 'ETH', 'USDT'])
            pairs: Trading pairs (e.g., ['BTCUSDT', 'BTCETH', 'ETHUSDT'])
            quotes: Current market quotes
            orderbooks: Optional order books for VWAP calculation
            
        Returns:
            Execution result or None if execution fails
        """
        try:
            legs = []
            amount = self.trade_size
            
            # Leg 1: USDT -> X (buy X with USDT)
            pair1 = pairs[0]
            asset_x = path[1]
            
            leg1_result = self._execute_leg(
                pair1, 'BUY', amount, True, quotes, orderbooks, asset_x
            )
            if leg1_result is None:
                return None
            
            legs.append(leg1_result)
            amount = leg1_result['received'] * (1 - self.fee_rate)
            
            # Leg 2: X -> Y
            pair2 = pairs[1]
            asset_y = path[2]
            
            leg2_result = self._execute_leg(
                pair2, 'SELL', amount, False, quotes, orderbooks, asset_y, asset_x
            )
            if leg2_result is None:
                return None
            
            legs.append(leg2_result)
            amount = leg2_result['received'] * (1 - self.fee_rate)
            
            # Leg 3: Y -> USDT (sell Y for USDT)
            pair3 = pairs[2]
            
            leg3_result = self._execute_leg(
                pair3, 'SELL', amount, False, quotes, orderbooks, 'USDT', asset_y
            )
            if leg3_result is None:
                return None
            
            legs.append(leg3_result)
            final_usdt = leg3_result['received'] * (1 - self.fee_rate)
            
            # Calculate profit
            net_profit = final_usdt - self.trade_size
            profit_pct = (net_profit / self.trade_size) * 100
            
            return {
                "legs": legs,
                "final_usdt": final_usdt,
                "net_profit": net_profit,
                "profit_pct": profit_pct,
                "success": True
            }
            
        except Exception as e:
            print(f"❌ Path execution error: {e}")
            return None
    
    def _execute_leg(self, 
                    pair: str, 
                    side: str, 
                    amount: float, 
                    is_quote_amount: bool,
                    quotes: Dict[str, Dict[str, float]],
                    orderbooks: Optional[Dict[str, Dict]],
                    target_asset: str,
                    source_asset: Optional[str] = None) -> Optional[Dict]:
        """
        Execute a single trading leg.
        
        Args:
            pair: Trading pair symbol
            side: 'BUY' or 'SELL'
            amount: Amount to trade
            is_quote_amount: True if amount is in quote currency
            quotes: Market quotes
            orderbooks: Optional order books
            target_asset: Asset we want to receive
            source_asset: Asset we're trading from (for direction determination)
            
        Returns:
            Leg execution result or None if execution fails
        """
        try:
            # Try VWAP first if order book is available
            if orderbooks and pair in orderbooks and validate_orderbook(orderbooks[pair]):
                vwap_price, filled_amount = calculate_vwap_leg(
                    orderbooks[pair], 
                    side.lower(), 
                    amount, 
                    is_quote_amount
                )
                
                if vwap_price is not None:
                    # VWAP execution successful
                    if is_quote_amount:
                        # We spent quote amount, received base amount
                        cost = amount
                        received = filled_amount
                    else:
                        # We sold base amount, received quote amount
                        cost = amount
                        received = filled_amount * vwap_price
                    
                    return {
                        "pair": pair,
                        "side": side,
                        "price": vwap_price,
                        "cost": cost,
                        "received": received,
                        "filled": filled_amount if not is_quote_amount else amount / vwap_price,
                        "method": "VWAP"
                    }
            
            # Fallback to top-of-book
            quote = quotes[pair]
            
            if side == 'BUY':
                if is_quote_amount:
                    # Buy with quote currency (spend USDT to get asset)
                    if pair.endswith('USDT'):
                        price = quote['ask']
                        received = amount / price
                        cost = amount
                    else:
                        # Inverse pair
                        price = 1.0 / quote['bid']
                        received = amount * price
                        cost = amount
                else:
                    # This case is unusual - buying with base currency
                    return None
            else:  # SELL
                if not is_quote_amount:
                    # Sell base currency to get quote currency
                    if pair.endswith('USDT'):
                        price = quote['bid']
                        received = amount * price
                        cost = amount
                    else:
                        # Need to determine direction
                        if source_asset and pair.startswith(source_asset):
                            # Direct pair (e.g., BTCETH where we're selling BTC)
                            price = quote['bid']
                            received = amount * price
                            cost = amount
                        else:
                            # Inverse pair (e.g., ETHBTC where we're selling BTC)
                            price = 1.0 / quote['ask']
                            received = amount / price
                            cost = amount
                else:
                    # This case is unusual - selling quote currency
                    return None
            
            return {
                "pair": pair,
                "side": side,
                "price": price,
                "cost": cost,
                "received": received,
                "filled": amount,
                "method": "TOB"
            }
            
        except Exception as e:
            print(f"❌ Leg execution error for {pair}: {e}")
            return None
    
    def is_profitable_opportunity(self, 
                                loop: Dict[str, List[str]], 
                                quotes: Dict[str, Dict[str, float]],
                                orderbooks: Optional[Dict[str, Dict]] = None) -> bool:
        """
        Check if a loop represents a profitable opportunity.
        
        Args:
            loop: Loop dictionary
            quotes: Market quotes
            orderbooks: Optional order books
            
        Returns:
            True if profitable, False otherwise
        """
        profit_data = self.profit_calc.calculate_loop_profit(loop, quotes, orderbooks)
        return profit_data is not None and profit_data.get('is_profitable', False)
    
    def get_execution_summary(self, execution_result: Dict) -> str:
        """
        Generate a summary string for an execution result.
        
        Args:
            execution_result: Execution result dictionary
            
        Returns:
            Formatted summary string
        """
        if not execution_result or not execution_result.get('success'):
            return "❌ Execution failed"
        
        loop = execution_result['loop']
        path_str = " → ".join(loop['path'])
        net_profit = execution_result['net_profit']
        profit_pct = execution_result['profit_pct']
        
        # Count VWAP vs TOB legs
        vwap_legs = sum(1 for leg in execution_result['legs'] if leg.get('method') == 'VWAP')
        total_legs = len(execution_result['legs'])
        
        method_str = f"VWAP({vwap_legs}/{total_legs})" if vwap_legs > 0 else "TOB"
        
        return (f"✅ EXECUTED | {path_str} | "
                f"+{net_profit:.2f} USDT | size={self.trade_size} | "
                f"edge=+{profit_pct:.2f}% | {method_str}")
    
    def get_detailed_execution_log(self, execution_result: Dict) -> str:
        """
        Generate detailed execution log.
        
        Args:
            execution_result: Execution result dictionary
            
        Returns:
            Detailed formatted log string
        """
        if not execution_result or not execution_result.get('success'):
            return "❌ Execution failed"
        
        lines = []
        lines.append(f"📊 EXECUTION DETAILS")
        lines.append(f"Path: {' → '.join(execution_result['loop']['path'])}")
        lines.append(f"Start: {execution_result['start_usdt']} USDT")
        lines.append(f"Final: {execution_result['final_usdt']:.2f} USDT")
        lines.append(f"Profit: +{execution_result['net_profit']:.2f} USDT ({execution_result['profit_pct']:.2f}%)")
        lines.append("")
        
        for i, leg in enumerate(execution_result['legs'], 1):
            lines.append(f"Leg {i}: {leg['pair']} {leg['side']}")
            lines.append(f"  Price: {leg['price']:.6f}")
            lines.append(f"  Filled: {leg['filled']:.6f}")
            lines.append(f"  Cost: {leg['cost']:.2f}")
            lines.append(f"  Received: {leg['received']:.6f}")
            lines.append(f"  Method: {leg['method']}")
            lines.append("")
        
        return "\n".join(lines)

