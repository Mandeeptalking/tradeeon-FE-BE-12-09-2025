"""
Volume Weighted Average Price (VWAP) calculations for order book depth.
"""

from typing import List, Tuple, Optional


def buy_vwap_from_asks(asks: List[Tuple[float, float]], quote_amount: float) -> Tuple[Optional[float], float]:
    """
    Calculate VWAP for buying with a fixed quote amount.
    
    Args:
        asks: List of (price, quantity) tuples sorted from lowest to highest price
        quote_amount: Amount of quote currency to spend
        
    Returns:
        Tuple of (average_price, base_filled) or (None, 0.0) if insufficient depth
    """
    if not asks or quote_amount <= 0:
        return None, 0.0
    
    total_cost = 0.0
    total_base = 0.0
    remaining_quote = quote_amount
    
    for price, qty in asks:
        if remaining_quote <= 0:
            break
            
        # Calculate cost for this level
        available_quote = price * qty
        cost_at_level = min(remaining_quote, available_quote)
        base_at_level = cost_at_level / price
        
        total_cost += cost_at_level
        total_base += base_at_level
        remaining_quote -= cost_at_level
    
    # If we couldn't fill the entire amount, return None
    if remaining_quote > 0.0001:  # Small tolerance for floating point
        return None, 0.0
    
    # Calculate VWAP
    vwap = total_cost / total_base if total_base > 0 else None
    
    return vwap, total_base


def sell_vwap_into_bids(bids: List[Tuple[float, float]], base_amount: float) -> Tuple[Optional[float], float]:
    """
    Calculate VWAP for selling a fixed base amount.
    
    Args:
        bids: List of (price, quantity) tuples sorted from highest to lowest price
        base_amount: Amount of base currency to sell
        
    Returns:
        Tuple of (average_price, quote_received) or (None, 0.0) if insufficient depth
    """
    if not bids or base_amount <= 0:
        return None, 0.0
    
    total_quote = 0.0
    total_base_sold = 0.0
    remaining_base = base_amount
    
    for price, qty in bids:
        if remaining_base <= 0:
            break
            
        # Calculate how much we can sell at this level
        base_sold_at_level = min(remaining_base, qty)
        quote_received_at_level = base_sold_at_level * price
        
        total_quote += quote_received_at_level
        total_base_sold += base_sold_at_level
        remaining_base -= base_sold_at_level
    
    # If we couldn't sell the entire amount, return None
    if remaining_base > 0.0001:  # Small tolerance for floating point
        return None, 0.0
    
    # Calculate VWAP
    vwap = total_quote / total_base_sold if total_base_sold > 0 else None
    
    return vwap, total_quote


def calculate_vwap_leg(orderbook: dict, direction: str, amount: float, is_quote: bool) -> Tuple[Optional[float], float]:
    """
    Calculate VWAP for a trading leg.
    
    Args:
        orderbook: Order book dictionary with 'bids' and 'asks' lists
        direction: 'buy' or 'sell'
        amount: Amount to trade
        is_quote: True if amount is in quote currency, False if in base currency
        
    Returns:
        Tuple of (vwap_price, filled_amount) or (None, 0.0) if insufficient depth
    """
    if not orderbook or not orderbook.get('bids') or not orderbook.get('asks'):
        return None, 0.0
    
    bids = orderbook['bids']
    asks = orderbook['asks']
    
    if direction == 'buy':
        if is_quote:
            # Buying with quote currency (spending quote to get base)
            return buy_vwap_from_asks(asks, amount)
        else:
            # This case is unusual (buying with base currency)
            # We'd need to sell base to get quote, then buy with quote
            # For simplicity, skip this case
            return None, 0.0
    else:  # sell
        if is_quote:
            # This case is unusual (selling quote currency)
            # For simplicity, skip this case
            return None, 0.0
        else:
            # Selling base currency to get quote
            return sell_vwap_into_bids(bids, amount)


def validate_orderbook(orderbook: dict, min_levels: int = 3) -> bool:
    """
    Validate order book has sufficient depth.
    
    Args:
        orderbook: Order book dictionary
        min_levels: Minimum number of levels required
        
    Returns:
        True if order book is valid, False otherwise
    """
    if not orderbook:
        return False
    
    bids = orderbook.get('bids', [])
    asks = orderbook.get('asks', [])
    
    if len(bids) < min_levels or len(asks) < min_levels:
        return False
    
    # Check for valid prices and quantities
    for price, qty in bids + asks:
        if price <= 0 or qty <= 0:
            return False
    
    # Check for reasonable spread
    if asks and bids:
        best_ask = asks[0][0]
        best_bid = bids[0][0]
        if best_ask <= best_bid:
            return False
        
        # Check for reasonable spread (not more than 10%)
        spread_pct = (best_ask - best_bid) / best_bid
        if spread_pct > 0.1:
            return False
    
    return True


def get_top_of_book(orderbook: dict) -> Tuple[Optional[float], Optional[float]]:
    """
    Get top-of-book prices from order book.
    
    Args:
        orderbook: Order book dictionary
        
    Returns:
        Tuple of (best_bid, best_ask) or (None, None) if unavailable
    """
    if not orderbook:
        return None, None
    
    bids = orderbook.get('bids', [])
    asks = orderbook.get('asks', [])
    
    best_bid = bids[0][0] if bids else None
    best_ask = asks[0][0] if asks else None
    
    return best_bid, best_ask

