from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime

class SymbolInfo(BaseModel):
    symbol: str
    baseAsset: str
    quoteAsset: str
    status: str
    isSpotTradingAllowed: bool
    isMarginTradingAllowed: bool
    filters: List[Dict[str, Any]]

class TickerData(BaseModel):
    symbol: str
    price: float
    price_change: float
    price_change_percent: float
    weighted_avg_price: float
    prev_close_price: float
    last_qty: float
    bid_price: float
    ask_price: float
    open_price: float
    high_price: float
    low_price: float
    volume: float
    quote_volume: float
    open_time: int
    close_time: int
    first_id: int
    last_id: int
    count: int

class KlineData(BaseModel):
    open_time: int
    open: float
    high: float
    low: float
    close: float
    volume: float
    close_time: int
    quote_asset_volume: float
    number_of_trades: int
    taker_buy_base_asset_volume: float
    taker_buy_quote_asset_volume: float
    ignore: str

class OrderBookData(BaseModel):
    last_update_id: int
    bids: List[List[float]]
    asks: List[List[float]]

class TradeData(BaseModel):
    id: int
    price: float
    qty: float
    quote_qty: float
    time: int
    is_buyer_maker: bool
    is_best_match: bool

class MarketDataResponse(BaseModel):
    success: bool
    data: Optional[Any] = None
    error: Optional[str] = None
    timestamp: int

class SymbolListResponse(BaseModel):
    success: bool
    symbols: List[SymbolInfo]
    count: int
    timestamp: int

class TickerResponse(BaseModel):
    success: bool
    tickers: List[TickerData]
    timestamp: int

class KlineResponse(BaseModel):
    success: bool
    symbol: str
    interval: str
    klines: List[KlineData]
    timestamp: int

class OrderBookResponse(BaseModel):
    success: bool
    symbol: str
    orderbook: OrderBookData
    timestamp: int

class TradesResponse(BaseModel):
    success: bool
    symbol: str
    trades: List[TradeData]
    timestamp: int


