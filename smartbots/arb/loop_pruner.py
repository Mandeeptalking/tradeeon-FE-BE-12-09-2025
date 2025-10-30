"""
Loop pruning utility to reduce symbol count by filtering to major intermediate assets.
"""

from typing import List, Dict, Set
from collections import defaultdict

class LoopPruner:
    """Prunes loops to reduce symbol count by filtering to major intermediate assets."""
    
    def __init__(self):
        # Whitelist of major intermediate assets for arbitrage
        self.major_assets = {
            'BTC', 'ETH', 'BNB', 'SOL', 'XRP', 'ADA', 'DOGE', 'TON', 
            'AVAX', 'TRX', 'LINK', 'MATIC', 'LTC', 'ATOM', 'UNI', 
            'FTM', 'NEAR', 'ALGO', 'VET', 'ICP', 'SAND', 'MANA', 
            'AXS', 'FLOW', 'APE', 'CHZ', 'DOT', 'AAVE', 'COMP', 
            'MKR', 'SNX', 'YFI', '1INCH', 'SUSHI', 'CRV'
        }
        
        # Base asset (always included)
        self.base_asset = 'USDT'
    
    def prune_loops(self, loops: List[Dict], keep_ratio: float = 0.3) -> List[Dict]:
        """
        Prune loops to keep only those with major intermediate assets.
        
        Args:
            loops: List of arbitrage loops
            keep_ratio: Ratio of loops to keep (0.0 to 1.0)
            
        Returns:
            Pruned list of loops
        """
        print(f"🔍 Pruning loops with major assets: {', '.join(sorted(self.major_assets))}")
        
        # Categorize loops
        major_loops = []
        other_loops = []
        
        for loop in loops:
            path = loop['path']
            # Check if intermediate assets (excluding USDT) are in major assets
            intermediate_assets = set(path[1:-1])  # Exclude first and last (USDT)
            
            if intermediate_assets.issubset(self.major_assets):
                major_loops.append(loop)
            else:
                other_loops.append(loop)
        
        print(f"📊 Loop categorization:")
        print(f"  Major asset loops: {len(major_loops)}")
        print(f"  Other loops: {len(other_loops)}")
        
        # Select loops to keep
        target_count = int(len(loops) * keep_ratio)
        
        # Prioritize major asset loops
        if len(major_loops) >= target_count:
            selected_loops = major_loops[:target_count]
            print(f"✅ Selected {len(selected_loops)} major asset loops")
        else:
            # Take all major loops + some others
            remaining_slots = target_count - len(major_loops)
            selected_loops = major_loops + other_loops[:remaining_slots]
            print(f"✅ Selected {len(major_loops)} major + {remaining_slots} other loops")
        
        return selected_loops
    
    def get_symbol_reduction_stats(self, original_loops: List[Dict], pruned_loops: List[Dict]) -> Dict:
        """
        Get statistics about symbol reduction from pruning.
        
        Args:
            original_loops: Original list of loops
            pruned_loops: Pruned list of loops
            
        Returns:
            Statistics dictionary
        """
        def extract_symbols(loops):
            symbols = set()
            for loop in loops:
                symbols.update(loop['pairs'])
            return symbols
        
        original_symbols = extract_symbols(original_loops)
        pruned_symbols = extract_symbols(pruned_loops)
        
        return {
            'original_loops': len(original_loops),
            'pruned_loops': len(pruned_loops),
            'loop_reduction': len(original_loops) - len(pruned_loops),
            'loop_reduction_pct': (len(original_loops) - len(pruned_loops)) / len(original_loops) * 100,
            'original_symbols': len(original_symbols),
            'pruned_symbols': len(pruned_symbols),
            'symbol_reduction': len(original_symbols) - len(pruned_symbols),
            'symbol_reduction_pct': (len(original_symbols) - len(pruned_symbols)) / len(original_symbols) * 100
        }
    
    def get_asset_frequency(self, loops: List[Dict]) -> Dict[str, int]:
        """
        Get frequency of each asset in the loops.
        
        Args:
            loops: List of arbitrage loops
            
        Returns:
            Dictionary of asset -> frequency
        """
        asset_count = defaultdict(int)
        
        for loop in loops:
            path = loop['path']
            # Count intermediate assets (excluding USDT)
            for asset in path[1:-1]:
                asset_count[asset] += 1
        
        return dict(sorted(asset_count.items(), key=lambda x: x[1], reverse=True))
    
    def suggest_whitelist_expansion(self, loops: List[Dict], top_n: int = 20) -> List[str]:
        """
        Suggest additional assets to add to the whitelist based on frequency.
        
        Args:
            loops: List of arbitrage loops
            top_n: Number of top assets to suggest
            
        Returns:
            List of suggested assets to add to whitelist
        """
        asset_freq = self.get_asset_frequency(loops)
        
        # Filter out assets already in whitelist and USDT
        suggestions = []
        for asset, freq in asset_freq.items():
            if asset not in self.major_assets and asset != self.base_asset:
                suggestions.append((asset, freq))
        
        # Return top N suggestions
        return [asset for asset, _ in suggestions[:top_n]]

