"""
Binance API client for fetching exchange information.
"""

import httpx
from typing import Dict, List, Any


def get_exchange_info() -> Dict[str, Any]:
    """
    Fetch Binance exchange information.
    
    Returns:
        Dict containing the full exchange info response from Binance
    """
    url = "https://api.binance.com/api/v3/exchangeInfo"
    
    try:
        with httpx.Client() as client:
            response = client.get(url)
            response.raise_for_status()
            return response.json()
    except httpx.RequestError as e:
        raise ConnectionError(f"Failed to fetch exchange info: {e}")
    except httpx.HTTPStatusError as e:
        raise ConnectionError(f"HTTP error {e.response.status_code}: {e.response.text}")


def normalize_symbols(symbols: List[Dict[str, Any]]) -> List[Dict[str, str]]:
    """
    Normalize and filter symbol data.
    
    Args:
        symbols: List of symbol dictionaries from Binance exchange info
        
    Returns:
        List of normalized market dictionaries with fields:
        - symbol: Trading pair symbol (e.g., "BNBUSDT")
        - base: Base asset (e.g., "BNB") 
        - quote: Quote asset (e.g., "USDT")
        - status: Trading status (e.g., "TRADING")
    """
    normalized = []
    
    for symbol_data in symbols:
        # Only include spot trading pairs that are currently trading
        if (symbol_data.get("status") == "TRADING" and 
            symbol_data.get("isSpotTradingAllowed", False)):
            
            normalized.append({
                "symbol": symbol_data["symbol"],
                "base": symbol_data["baseAsset"],
                "quote": symbol_data["quoteAsset"],
                "status": symbol_data["status"]
            })
    
    return normalized

