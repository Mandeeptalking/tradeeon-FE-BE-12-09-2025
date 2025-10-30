"""Shared enumerations across Tradeeon services."""

from enum import Enum


class Exchange(str, Enum):
    """Supported exchanges."""
    BINANCE = "binance"
    ZERODHA = "zerodha"
    COINBASE = "coinbase"
    KRAKEN = "kraken"


class Interval(str, Enum):
    """Time intervals."""
    M1 = "1m"
    M3 = "3m"
    M5 = "5m"
    M15 = "15m"
    M30 = "30m"
    H1 = "1h"
    H2 = "2h"
    H4 = "4h"
    H6 = "6h"
    H12 = "12h"
    D1 = "1d"
    W1 = "1w"
    MN1 = "1M"


class QuoteAsset(str, Enum):
    """Common quote assets."""
    USDT = "USDT"
    USDC = "USDC"
    BTC = "BTC"
    ETH = "ETH"
    BNB = "BNB"
    INR = "INR"


class OrderSide(str, Enum):
    """Order sides."""
    BUY = "buy"
    SELL = "sell"


class TimeInForce(str, Enum):
    """Time in force options."""
    GTC = "GTC"  # Good Till Cancelled
    IOC = "IOC"  # Immediate or Cancel
    FOK = "FOK"  # Fill or Kill
    GTX = "GTX"  # Good Till Crossing

