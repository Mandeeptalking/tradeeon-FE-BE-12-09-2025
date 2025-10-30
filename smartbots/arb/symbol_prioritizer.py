from typing import List, Dict, Set, Tuple
from collections import defaultdict

class SymbolPrioritizer:
    """Prioritizes symbols based on their importance for arbitrage opportunities."""
    
    def __init__(self):
        # Major trading pairs (most important)
        self.major_pairs = [
            'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'ADAUSDT', 'SOLUSDT', 'XRPUSDT', 
            'DOGEUSDT', 'MATICUSDT', 'AVAXUSDT', 'LINKUSDT', 'LTCUSDT', 'ATOMUSDT',
            'UNIUSDT', 'FTMUSDT', 'NEARUSDT', 'ALGOUSDT', 'VETUSDT', 'ICPUSDT',
            'SANDUSDT', 'MANAUSDT', 'AXSUSDT', 'FLOWUSDT', 'APEUSDT', 'CHZUSDT'
        ]
        
        # Popular altcoins that frequently appear in arbitrage loops
        self.popular_altcoins = [
            'CRV', 'CHR', 'ARDR', 'KSM', 'STG', 'ME', 'MANTA', 'KDA', 'ZAR',
            'FIL', 'DOT', 'AAVE', 'COMP', 'MKR', 'SNX', 'YFI', '1INCH', 'SUSHI'
        ]
    
    def prioritize_symbols(self, all_symbols: Set[str], max_symbols: int = 150) -> List[str]:
        """
        Prioritize symbols for WebSocket subscription.
        
        Args:
            all_symbols: All symbols needed for arbitrage loops
            max_symbols: Maximum number of symbols to return
        
        Returns:
            List of prioritized symbols
        """
        priority_groups = []
        
        # Group 1: Major USDT pairs (highest priority)
        major_usdt = [s for s in all_symbols if s in self.major_pairs]
        priority_groups.append(('Major USDT pairs', major_usdt))
        
        # Group 2: Major BTC pairs
        major_btc = [s for s in all_symbols if s.endswith('BTC') and any(coin in s for coin in ['BTC', 'ETH', 'BNB', 'ADA', 'SOL'])]
        priority_groups.append(('Major BTC pairs', major_btc))
        
        # Group 3: Popular altcoin pairs
        popular_pairs = [s for s in all_symbols if any(coin in s for coin in self.popular_altcoins)]
        priority_groups.append(('Popular altcoin pairs', popular_pairs))
        
        # Group 4: USDC pairs (stablecoin arbitrage)
        usdc_pairs = [s for s in all_symbols if 'USDC' in s]
        priority_groups.append(('USDC pairs', usdc_pairs))
        
        # Group 5: Everything else
        remaining = all_symbols - set().union(*[group[1] for group in priority_groups])
        priority_groups.append(('Other pairs', list(remaining)))
        
        # Build final prioritized list
        prioritized = []
        for group_name, symbols in priority_groups:
            if len(prioritized) >= max_symbols:
                break
            remaining_slots = max_symbols - len(prioritized)
            prioritized.extend(symbols[:remaining_slots])
            
        return prioritized[:max_symbols]
    
    def get_symbol_importance_score(self, symbol: str) -> int:
        """
        Get importance score for a symbol (higher = more important).
        
        Args:
            symbol: Trading pair symbol
        
        Returns:
            Importance score (0-100)
        """
        score = 0
        
        # Major pairs get highest score
        if symbol in self.major_pairs:
            score += 100
        
        # USDT pairs are generally more important
        if 'USDT' in symbol:
            score += 50
        
        # BTC pairs are important for arbitrage
        if 'BTC' in symbol:
            score += 40
        
        # Popular altcoins
        if any(coin in symbol for coin in self.popular_altcoins):
            score += 30
        
        # USDC pairs for stablecoin arbitrage
        if 'USDC' in symbol:
            score += 20
        
        # ETH pairs
        if 'ETH' in symbol:
            score += 25
        
        # BNB pairs
        if 'BNB' in symbol:
            score += 15
        
        return score
    
    def analyze_arbitrage_coverage(self, loops: List[Dict], available_symbols: Set[str]) -> Dict:
        """
        Analyze how many arbitrage loops can be completed with available symbols.
        
        Args:
            loops: List of arbitrage loops
            available_symbols: Set of symbols with live quotes
        
        Returns:
            Analysis results
        """
        total_loops = len(loops)
        complete_loops = 0
        partial_loops = 0
        missing_symbols = defaultdict(int)
        
        for loop in loops:
            pairs = loop['pairs']
            available_pairs = [pair for pair in pairs if pair in available_symbols]
            
            if len(available_pairs) == len(pairs):
                complete_loops += 1
            elif len(available_pairs) > 0:
                partial_loops += 1
            
            # Track missing symbols
            for pair in pairs:
                if pair not in available_symbols:
                    missing_symbols[pair] += 1
        
        # Get top missing symbols
        top_missing = sorted(missing_symbols.items(), key=lambda x: x[1], reverse=True)[:10]
        
        return {
            'total_loops': total_loops,
            'complete_loops': complete_loops,
            'partial_loops': partial_loops,
            'coverage_percentage': (complete_loops / total_loops * 100) if total_loops > 0 else 0,
            'top_missing_symbols': top_missing
        }

