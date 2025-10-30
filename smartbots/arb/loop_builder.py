"""
Triangular arbitrage loop builder for USDT-anchored pairs.
"""

from typing import Dict, List, Set, Tuple


def build_usdt_loops(markets: List[Dict[str, str]]) -> List[Dict[str, List[str]]]:
    """
    Build all possible USDT-anchored triangular arbitrage loops.
    
    Args:
        markets: List of normalized market dictionaries
        
    Returns:
        List of loop dictionaries with path and pairs
    """
    # Build adjacency graph for efficient lookups
    graph = _build_market_graph(markets)
    
    loops = []
    visited_loops = set()
    
    # Find all USDT pairs
    usdt_pairs = [m for m in markets if m["quote"] == "USDT"]
    
    for usdt_pair in usdt_pairs:
        asset_a = usdt_pair["base"]
        
        # Skip if we've already processed this asset
        if asset_a == "USDT":
            continue
            
        # Find all assets that can be traded with asset_a
        for asset_b in graph.get(asset_a, []):
            if asset_b == asset_a or asset_b == "USDT":
                continue
                
            # Check if we can complete the triangle: B -> USDT
            if "USDT" in graph.get(asset_b, []):
                # Create loop identifier to avoid duplicates
                loop_id = tuple(sorted([asset_a, asset_b]))
                
                if loop_id not in visited_loops:
                    visited_loops.add(loop_id)
                    
                    # Build the loop
                    loop = _build_loop(asset_a, asset_b, markets)
                    if loop:
                        loops.append(loop)
    
    return loops


def _build_market_graph(markets: List[Dict[str, str]]) -> Dict[str, Set[str]]:
    """
    Build an adjacency graph from market data.
    
    Args:
        markets: List of normalized market dictionaries
        
    Returns:
        Dictionary mapping assets to sets of assets they can trade with
    """
    graph = {}
    
    for market in markets:
        base = market["base"]
        quote = market["quote"]
        
        # Add bidirectional edges (we can trade in both directions)
        if base not in graph:
            graph[base] = set()
        if quote not in graph:
            graph[quote] = set()
            
        graph[base].add(quote)
        graph[quote].add(base)
    
    return graph


def _build_loop(asset_a: str, asset_b: str, markets: List[Dict[str, str]]) -> Dict[str, List[str]]:
    """
    Build a specific triangular loop.
    
    Args:
        asset_a: First intermediate asset
        asset_b: Second intermediate asset  
        markets: List of normalized market dictionaries
        
    Returns:
        Loop dictionary with path and pairs, or None if loop is invalid
    """
    # Find the required trading pairs
    pair1 = _find_pair(asset_a, "USDT", markets)  # USDT -> A
    pair2 = _find_pair(asset_a, asset_b, markets)  # A -> B
    pair3 = _find_pair(asset_b, "USDT", markets)  # B -> USDT
    
    if not all([pair1, pair2, pair3]):
        return None
    
    return {
        "path": ["USDT", asset_a, asset_b, "USDT"],
        "pairs": [pair1, pair2, pair3]
    }


def _find_pair(asset1: str, asset2: str, markets: List[Dict[str, str]]) -> str:
    """
    Find the trading pair symbol for two assets.
    
    Args:
        asset1: First asset
        asset2: Second asset
        markets: List of normalized market dictionaries
        
    Returns:
        Trading pair symbol or None if not found
    """
    for market in markets:
        if ((market["base"] == asset1 and market["quote"] == asset2) or
            (market["base"] == asset2 and market["quote"] == asset1)):
            return market["symbol"]
    return None


def build_usdc_loops(markets: List[Dict[str, str]]) -> List[Dict[str, List[str]]]:
    """
    Build all possible USDC-anchored triangular arbitrage loops.
    
    Args:
        markets: List of normalized market dictionaries
        
    Returns:
        List of loop dictionaries with path and pairs
    """
    # Build adjacency graph for efficient lookups
    graph = _build_market_graph(markets)
    
    loops = []
    visited_loops = set()
    
    # Find all USDC pairs
    usdc_pairs = [m for m in markets if m["quote"] == "USDC"]
    
    for usdc_pair in usdc_pairs:
        asset_a = usdc_pair["base"]
        
        # Skip if we've already processed this asset
        if asset_a == "USDC":
            continue
            
        # Find all assets that can be traded with asset_a
        for asset_b in graph.get(asset_a, []):
            if asset_b == asset_a or asset_b == "USDC":
                continue
                
            # Check if we can complete the triangle: B -> USDC
            if "USDC" in graph.get(asset_b, []):
                # Create loop identifier to avoid duplicates
                loop_id = tuple(sorted([asset_a, asset_b]))
                
                if loop_id not in visited_loops:
                    visited_loops.add(loop_id)
                    
                    # Build the loop
                    loop = _build_usdc_loop(asset_a, asset_b, markets)
                    if loop:
                        loops.append(loop)
    
    return loops


def build_mixed_loops(markets: List[Dict[str, str]]) -> List[Dict[str, List[str]]]:
    """
    Build mixed arbitrage loops (USDT-USDC cross arbitrage).
    
    Examples:
    - USDT -> ADA -> USDC
    - USDT -> ADA -> BTC -> USDC
    - USDC -> ADA -> USDT
    - USDC -> BTC -> USDT
    
    Args:
        markets: List of normalized market dictionaries
        
    Returns:
        List of loop dictionaries with path and pairs
    """
    graph = _build_market_graph(markets)
    mixed_loops = []
    visited_loops = set()
    
    # Find 3-leg mixed loops: USDT -> A -> USDC
    usdt_pairs = [m for m in markets if m["quote"] == "USDT"]
    for usdt_pair in usdt_pairs:
        asset_a = usdt_pair["base"]
        if asset_a in ["USDT", "USDC"]:
            continue
        
        # Check if A -> USDC exists
        usdc_pair = _find_pair(asset_a, "USDC", markets)
        if usdc_pair:
            loop_id = f"USDT-{asset_a}-USDC"
            if loop_id not in visited_loops:
                visited_loops.add(loop_id)
                pair1 = _find_pair("USDT", asset_a, markets)
                pair2 = _find_pair(asset_a, "USDC", markets)
                if pair1 and pair2:
                    mixed_loops.append({
                        "path": ["USDT", asset_a, "USDC"],
                        "pairs": [pair1, pair2]
                    })
    
    # Find 3-leg mixed loops: USDC -> A -> USDT
    usdc_pairs = [m for m in markets if m["quote"] == "USDC"]
    for usdc_pair in usdc_pairs:
        asset_a = usdc_pair["base"]
        if asset_a in ["USDT", "USDC"]:
            continue
        
        # Check if A -> USDT exists
        usdt_pair = _find_pair(asset_a, "USDT", markets)
        if usdt_pair:
            loop_id = f"USDC-{asset_a}-USDT"
            if loop_id not in visited_loops:
                visited_loops.add(loop_id)
                pair1 = _find_pair("USDC", asset_a, markets)
                pair2 = _find_pair(asset_a, "USDT", markets)
                if pair1 and pair2:
                    mixed_loops.append({
                        "path": ["USDC", asset_a, "USDT"],
                        "pairs": [pair1, pair2]
                    })
    
    # Find 4-leg mixed loops: USDT -> A -> B -> USDC
    for usdt_pair in usdt_pairs:
        asset_a = usdt_pair["base"]
        if asset_a in ["USDT", "USDC"]:
            continue
        
        for asset_b in graph.get(asset_a, []):
            if asset_b in ["USDT", "USDC"] or asset_b == asset_a:
                continue
            
            # Check if B -> USDC exists
            if "USDC" in graph.get(asset_b, []):
                loop_id = tuple(sorted([asset_a, asset_b]))
                if loop_id not in visited_loops:
                    visited_loops.add(loop_id)
                    pair1 = _find_pair("USDT", asset_a, markets)
                    pair2 = _find_pair(asset_a, asset_b, markets)
                    pair3 = _find_pair(asset_b, "USDC", markets)
                    if all([pair1, pair2, pair3]):
                        mixed_loops.append({
                            "path": ["USDT", asset_a, asset_b, "USDC"],
                            "pairs": [pair1, pair2, pair3]
                        })
    
    # Find 4-leg mixed loops: USDC -> A -> B -> USDT
    for usdc_pair in usdc_pairs:
        asset_a = usdc_pair["base"]
        if asset_a in ["USDT", "USDC"]:
            continue
        
        for asset_b in graph.get(asset_a, []):
            if asset_b in ["USDT", "USDC"] or asset_b == asset_a:
                continue
            
            # Check if B -> USDT exists
            if "USDT" in graph.get(asset_b, []):
                loop_id = tuple(sorted([asset_a, asset_b]))
                if loop_id not in visited_loops:
                    visited_loops.add(loop_id)
                    pair1 = _find_pair("USDC", asset_a, markets)
                    pair2 = _find_pair(asset_a, asset_b, markets)
                    pair3 = _find_pair(asset_b, "USDT", markets)
                    if all([pair1, pair2, pair3]):
                        mixed_loops.append({
                            "path": ["USDC", asset_a, asset_b, "USDT"],
                            "pairs": [pair1, pair2, pair3]
                        })
    
    return mixed_loops


def build_fdusd_loops(markets: List[Dict[str, str]]) -> List[Dict[str, List[str]]]:
    """
    Build all possible FDUSD-anchored triangular arbitrage loops.
    
    Args:
        markets: List of normalized market dictionaries
        
    Returns:
        List of loop dictionaries with path and pairs
    """
    # Build adjacency graph for efficient lookups
    graph = _build_market_graph(markets)
    
    loops = []
    visited_loops = set()
    
    # Find all FDUSD pairs
    fdusd_pairs = [m for m in markets if m["quote"] == "FDUSD"]
    
    for fdusd_pair in fdusd_pairs:
        asset_a = fdusd_pair["base"]
        
        # Skip if we've already processed this asset
        if asset_a == "FDUSD":
            continue
            
        # Find all assets that can be traded with asset_a
        for asset_b in graph.get(asset_a, []):
            if asset_b == asset_a or asset_b == "FDUSD":
                continue
                
            # Check if we can complete the triangle: B -> FDUSD
            if "FDUSD" in graph.get(asset_b, []):
                # Create loop identifier to avoid duplicates
                loop_id = tuple(sorted([asset_a, asset_b]))
                
                if loop_id not in visited_loops:
                    visited_loops.add(loop_id)
                    
                    # Build the loop with correct FDUSD pairs
                    pair1 = _find_pair(asset_a, "FDUSD", markets)  # AFDUSD
                    pair2 = _find_pair(asset_a, asset_b, markets)  # AB or BA
                    pair3 = _find_pair(asset_b, "FDUSD", markets)  # BFDUSD
                    
                    if all([pair1, pair2, pair3]):
                        loops.append({
                            "path": ["FDUSD", asset_a, asset_b, "FDUSD"],
                            "pairs": [pair1, pair2, pair3]
                        })
    
    return loops


def build_all_loops(markets: List[Dict[str, str]]) -> List[Dict[str, List[str]]]:
    """
    Build all possible arbitrage loops (USDT, USDC, FDUSD, and mixed).
    
    Args:
        markets: List of normalized market dictionaries
        
    Returns:
        Combined list of all loop dictionaries
    """
    usdt_loops = build_usdt_loops(markets)
    usdc_loops = build_usdc_loops(markets)
    fdusd_loops = build_fdusd_loops(markets)
    mixed_loops = build_mixed_loops(markets)
    
    all_loops = usdt_loops + usdc_loops + fdusd_loops + mixed_loops
    
    print(f"📊 Loop Statistics:")
    print(f"  USDT loops: {len(usdt_loops)}")
    print(f"  USDC loops: {len(usdc_loops)}")
    print(f"  FDUSD loops: {len(fdusd_loops)}")
    print(f"  Mixed loops: {len(mixed_loops)}")
    print(f"  Total loops: {len(all_loops)}")
    
    return all_loops


def _build_usdc_loop(asset_a: str, asset_b: str, markets: List[Dict[str, str]]) -> Dict[str, List[str]]:
    """
    Build a specific USDC-anchored triangular loop.
    
    Args:
        asset_a: First intermediate asset
        asset_b: Second intermediate asset  
        markets: List of normalized market dictionaries
        
    Returns:
        Loop dictionary with path and pairs, or None if loop is invalid
    """
    # Find the required trading pairs
    pair1 = _find_pair(asset_a, "USDC", markets)  # USDC -> A
    pair2 = _find_pair(asset_a, asset_b, markets)  # A -> B
    pair3 = _find_pair(asset_b, "USDC", markets)  # B -> USDC
    
    if not all([pair1, pair2, pair3]):
        return None
    
    return {
        "path": ["USDC", asset_a, asset_b, "USDC"],
        "pairs": [pair1, pair2, pair3]
    }


def summary(loops: List[Dict[str, List[str]]]) -> Dict[str, any]:
    """
    Generate summary statistics for the loops.
    
    Args:
        loops: List of loop dictionaries
        
    Returns:
        Dictionary with total count and top 10 coins by frequency
    """
    coin_counts = {}
    
    for loop in loops:
        # Count intermediate assets (skip start/end assets)
        for asset in loop["path"][1:-1]:
            coin_counts[asset] = coin_counts.get(asset, 0) + 1
    
    # Sort by frequency and get top 10
    top_coins = sorted(coin_counts.items(), key=lambda x: x[1], reverse=True)[:10]
    
    return {
        "total_loops": len(loops),
        "top_10_coins": top_coins
    }
