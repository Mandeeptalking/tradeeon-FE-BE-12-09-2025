#!/usr/bin/env python3
"""
Tradeeon TA-Lib Service Example

This is a complete FastAPI service that provides technical analysis indicators
using pandas-ta and TA-Lib. Deploy this alongside your frontend for production use.

Usage:
    python ta_service_example.py

Then set VITE_TA_SERVICE_URL=http://localhost:8000 in your frontend.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pandas as pd
import pandas_ta as ta
import talib
import numpy as np
from typing import List, Dict, Any, Optional
import json

app = FastAPI(title="Tradeeon TA Service", version="1.0.0")

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class IndicatorResponse(BaseModel):
    t: int
    v: Optional[float]

class IndicatorRequest(BaseModel):
    symbol: str
    tf: str
    name: str
    params: Dict[str, Any] = {}
    source: str = "close"

# Mock data function - replace with your real data source
def load_candles(symbol: str, tf: str) -> pd.DataFrame:
    """
    Load OHLCV data for a symbol and timeframe.
    
    In production, this would connect to your database or data provider.
    For now, we'll generate mock data.
    """
    import random
    from datetime import datetime, timedelta
    
    # Generate mock data
    periods = 1000
    start_time = datetime.now() - timedelta(minutes=periods)
    
    # Mock OHLCV data
    data = []
    base_price = 50000 if "BTC" in symbol.upper() else 3000
    
    for i in range(periods):
        timestamp = start_time + timedelta(minutes=i)
        
        # Generate realistic price movement
        price_change = random.uniform(-0.02, 0.02)  # ±2% change
        base_price *= (1 + price_change)
        
        high = base_price * (1 + random.uniform(0, 0.01))
        low = base_price * (1 - random.uniform(0, 0.01))
        close = base_price
        open_price = base_price * (1 + random.uniform(-0.005, 0.005))
        volume = random.uniform(100, 1000)
        
        data.append({
            "time": int(timestamp.timestamp() * 1000),
            "open": open_price,
            "high": high,
            "low": low,
            "close": close,
            "volume": volume
        })
    
    return pd.DataFrame(data)

def calculate_indicator(df: pd.DataFrame, name: str, params: Dict[str, Any], source: str = "close") -> pd.Series:
    """
    Calculate technical indicator using pandas-ta or TA-Lib.
    """
    try:
        if name.upper() == "EMA":
            return ta.ema(df[source], length=params.get("length", 20))
        
        elif name.upper() == "RSI":
            return ta.rsi(df[source], length=params.get("length", 14))
        
        elif name.upper() == "MACD":
            macd_data = ta.macd(
                df[source], 
                fast=params.get("fast", 12), 
                slow=params.get("slow", 26), 
                signal=params.get("signal", 9)
            )
            # Return MACD line (not signal or histogram)
            return macd_data["MACD_12_26_9"] if "MACD_12_26_9" in macd_data else macd_data.iloc[:, 0]
        
        elif name.upper() == "BBANDS":
            bb_data = ta.bbands(
                df[source], 
                length=params.get("length", 20), 
                std=params.get("std", 2)
            )
            # Return upper band
            return bb_data["BBU_20_2.0"] if "BBU_20_2.0" in bb_data else bb_data.iloc[:, 0]
        
        elif name.upper() == "STOCH":
            stoch_data = ta.stoch(
                df["high"], df["low"], df["close"], 
                k=params.get("k", 14), 
                d=params.get("d", 3)
            )
            # Return %K line
            return stoch_data["STOCHk_14_3_3"] if "STOCHk_14_3_3" in stoch_data else stoch_data.iloc[:, 0]
        
        elif name.upper() == "ATR":
            return ta.atr(df["high"], df["low"], df["close"], length=params.get("length", 14))
        
        elif name.upper() == "ADX":
            return ta.adx(df["high"], df["low"], df["close"], length=params.get("length", 14))
        
        elif name.upper() == "SMA":
            return ta.sma(df[source], length=params.get("length", 20))
        
        elif name.upper() == "WMA":
            return ta.wma(df[source], length=params.get("length", 20))
        
        elif name.upper() == "DEMA":
            return ta.dema(df[source], length=params.get("length", 20))
        
        elif name.upper() == "TEMA":
            return ta.tema(df[source], length=params.get("length", 20))
        
        elif name.upper() == "TRIMA":
            return ta.trima(df[source], length=params.get("length", 20))
        
        elif name.upper() == "KAMA":
            return ta.kama(df[source], length=params.get("length", 20))
        
        elif name.upper() == "MAMA":
            mama_data = ta.mama(df[source])
            return mama_data["MAMA"] if "MAMA" in mama_data else mama_data.iloc[:, 0]
        
        elif name.upper() == "VWMA":
            return ta.vwma(df[source], df["volume"], length=params.get("length", 20))
        
        elif name.upper() == "HULLMA":
            return ta.hma(df[source], length=params.get("length", 20))
        
        elif name.upper() == "ALMA":
            return ta.alma(df[source], length=params.get("length", 20))
        
        elif name.upper() == "T3":
            return ta.t3(df[source], length=params.get("length", 20))
        
        elif name.upper() == "ZLEMA":
            return ta.zlma(df[source], length=params.get("length", 20))
        
        elif name.upper() == "WCP":
            return ta.wcp(df["high"], df["low"], df["close"])
        
        elif name.upper() == "VWAP":
            return ta.vwap(df["high"], df["low"], df["close"], df["volume"])
        
        elif name.upper() == "SMMA":
            return ta.rma(df[source], length=params.get("length", 20))
        
        elif name.upper() == "FRAMA":
            return ta.frama(df[source], length=params.get("length", 20))
        
        elif name.upper() == "ICHIMOKU":
            ichimoku_data = ta.ichimoku(df["high"], df["low"], df["close"])
            # Return conversion line
            return ichimoku_data["ITS_9_26_52"] if "ITS_9_26_52" in ichimoku_data else ichimoku_data.iloc[:, 0]
        
        elif name.upper() == "AROON":
            aroon_data = ta.aroon(df["high"], df["low"], length=params.get("length", 14))
            # Return Aroon Up
            return aroon_data["AROONU_14"] if "AROONU_14" in aroon_data else aroon_data.iloc[:, 0]
        
        elif name.upper() == "PSAR":
            return ta.psar(df["high"], df["low"], df["close"])
        
        elif name.upper() == "SUPERTREND":
            supertrend_data = ta.supertrend(df["high"], df["low"], df["close"])
            # Return SuperTrend
            return supertrend_data["SUPERT_7_3.0"] if "SUPERT_7_3.0" in supertrend_data else supertrend_data.iloc[:, 0]
        
        elif name.upper() == "ZSCORE":
            return ta.zscore(df[source], length=params.get("length", 20))
        
        elif name.upper() == "STDEV":
            return ta.stdev(df[source], length=params.get("length", 20))
        
        elif name.upper() == "VAR":
            return ta.variance(df[source], length=params.get("length", 20))
        
        elif name.upper() == "CORREL":
            # Correlation with another series (requires second series)
            return ta.correlation(df[source], df["close"], length=params.get("length", 20))
        
        elif name.upper() == "ROC":
            return ta.roc(df[source], length=params.get("length", 10))
        
        elif name.upper() == "MOM":
            return ta.mom(df[source], length=params.get("length", 10))
        
        elif name.upper() == "MASSI":
            return ta.massi(df["high"], df["low"], length=params.get("length", 25))
        
        elif name.upper() == "TRANGE":
            return ta.trange(df["high"], df["low"], df["close"])
        
        elif name.upper() == "TYPPRICE":
            return ta.typprice(df["high"], df["low"], df["close"])
        
        elif name.upper() == "WCLPRICE":
            return ta.wclprice(df["high"], df["low"], df["close"])
        
        elif name.upper() == "UO":
            return ta.uo(df["high"], df["low"], df["close"])
        
        elif name.upper() == "STOCHRSI":
            stochrsi_data = ta.stochrsi(df[source], length=params.get("length", 14))
            return stochrsi_data["STOCHRSIk_14_14_3_3"] if "STOCHRSIk_14_14_3_3" in stochrsi_data else stochrsi_data.iloc[:, 0]
        
        elif name.upper() == "WILLR":
            return ta.willr(df["high"], df["low"], df["close"], length=params.get("length", 14))
        
        elif name.upper() == "ULTOSC":
            return ta.ultosc(df["high"], df["low"], df["close"])
        
        elif name.upper() == "TRIN":
            return ta.trin(df["high"], df["low"], df["close"], df["volume"])
        
        elif name.upper() == "AD":
            return ta.ad(df["high"], df["low"], df["close"], df["volume"])
        
        elif name.upper() == "OBV":
            return ta.obv(df["close"], df["volume"])
        
        elif name.upper() == "CMF":
            return ta.cmf(df["high"], df["low"], df["close"], df["volume"], length=params.get("length", 20))
        
        elif name.upper() == "FI":
            return ta.fi(df["close"], df["volume"], length=params.get("length", 1))
        
        elif name.upper() == "EOM":
            return ta.eom(df["high"], df["low"], df["close"], df["volume"], length=params.get("length", 14))
        
        elif name.upper() == "VPT":
            return ta.vpt(df["close"], df["volume"])
        
        elif name.upper() == "NVI":
            return ta.nvi(df["close"], df["volume"])
        
        elif name.upper() == "PVI":
            return ta.pvi(df["close"], df["volume"])
        
        elif name.upper() == "MFI":
            return ta.mfi(df["high"], df["low"], df["close"], df["volume"], length=params.get("length", 14))
        
        elif name.upper() == "TSI":
            return ta.tsi(df[source], fast=params.get("fast", 13), slow=params.get("slow", 25))
        
        elif name.upper() == "UO":
            return ta.uo(df["high"], df["low"], df["close"])
        
        elif name.upper() == "AO":
            return ta.ao(df["high"], df["low"], fast=params.get("fast", 5), slow=params.get("slow", 34))
        
        elif name.upper() == "BIAS":
            return ta.bias(df[source], length=params.get("length", 26))
        
        elif name.upper() == "ER":
            return ta.er(df[source], length=params.get("length", 10))
        
        elif name.upper() == "KST":
            kst_data = ta.kst(df[source])
            return kst_data["KST_10_15_20_30_10_10_10_15"] if "KST_10_15_20_30_10_10_10_15" in kst_data else kst_data.iloc[:, 0]
        
        elif name.upper() == "DMI":
            dmi_data = ta.dmi(df["high"], df["low"], df["close"], length=params.get("length", 14))
            return dmi_data["DMP_14"] if "DMP_14" in dmi_data else dmi_data.iloc[:, 0]
        
        elif name.upper() == "PSAR":
            return ta.psar(df["high"], df["low"], df["close"])
        
        elif name.upper() == "SUPERTREND":
            supertrend_data = ta.supertrend(df["high"], df["low"], df["close"])
            return supertrend_data["SUPERT_7_3.0"] if "SUPERT_7_3.0" in supertrend_data else supertrend_data.iloc[:, 0]
        
        else:
            # Try to use TA-Lib directly as fallback
            try:
                talib_func = getattr(talib, name.upper())
                if name.upper() in ["RSI", "EMA", "SMA", "WMA", "DEMA", "TEMA", "TRIMA", "KAMA", "MAMA", "VWMA", "HULLMA", "ALMA", "T3", "ZLEMA", "WCP", "VWAP", "SMMA", "FRAMA", "ICHIMOKU", "AROON", "PSAR", "SUPERTREND", "ZSCORE", "STDEV", "VAR", "CORREL", "ROC", "MOM", "MASSI", "TRANGE", "TYPPRICE", "WCLPRICE", "UO", "STOCHRSI", "WILLR", "ULTOSC", "TRIN", "AD", "OBV", "CMF", "FI", "EOM", "VPT", "NVI", "PVI", "MFI", "TSI", "UO", "AO", "BIAS", "ER", "KST", "DMI", "PSAR", "SUPERTREND"]:
                    result = talib_func(df[source], **params)
                else:
                    # For indicators that need multiple inputs
                    if name.upper() in ["MACD", "BBANDS", "STOCH", "ATR", "ADX", "AROON", "DMI", "SUPERTREND"]:
                        if name.upper() == "MACD":
                            result = talib.MACD(df[source], fastperiod=params.get("fast", 12), slowperiod=params.get("slow", 26), signalperiod=params.get("signal", 9))[0]
                        elif name.upper() == "BBANDS":
                            result = talib.BBANDS(df[source], timeperiod=params.get("length", 20), nbdevup=params.get("std", 2), nbdevdn=params.get("std", 2))[0]
                        elif name.upper() == "STOCH":
                            result = talib.STOCH(df["high"], df["low"], df["close"], fastk_period=params.get("k", 14), slowk_period=params.get("d", 3))[0]
                        elif name.upper() == "ATR":
                            result = talib.ATR(df["high"], df["low"], df["close"], timeperiod=params.get("length", 14))
                        elif name.upper() == "ADX":
                            result = talib.ADX(df["high"], df["low"], df["close"], timeperiod=params.get("length", 14))
                        elif name.upper() == "AROON":
                            result = talib.AROON(df["high"], df["low"], timeperiod=params.get("length", 14))[0]
                        elif name.upper() == "DMI":
                            result = talib.PLUS_DM(df["high"], df["low"], timeperiod=params.get("length", 14))
                        elif name.upper() == "SUPERTREND":
                            # SuperTrend is not in TA-Lib, use pandas-ta
                            supertrend_data = ta.supertrend(df["high"], df["low"], df["close"])
                            result = supertrend_data["SUPERT_7_3.0"] if "SUPERT_7_3.0" in supertrend_data else supertrend_data.iloc[:, 0]
                        else:
                            result = talib_func(df[source], **params)
                    else:
                        result = talib_func(df[source], **params)
                
                return pd.Series(result, index=df.index)
                
            except (AttributeError, Exception) as e:
                print(f"Indicator {name} not found in TA-Lib: {e}")
                return pd.Series([None] * len(df), index=df.index)
                
    except Exception as e:
        print(f"Error calculating {name}: {e}")
        return pd.Series([None] * len(df), index=df.index)

@app.get("/")
async def root():
    return {"message": "Tradeeon TA Service", "version": "1.0.0"}

@app.get("/health")
async def health():
    return {"status": "healthy"}

@app.get("/series")
async def get_series(
    symbol: str,
    tf: str,
    name: str,
    params: str = "{}",
    source: str = "close"
):
    """
    Get technical indicator series data.
    
    Parameters:
    - symbol: Trading pair symbol (e.g., BTCUSDT)
    - tf: Timeframe (e.g., 1m, 5m, 1h, 1d)
    - name: Indicator name (e.g., EMA, RSI, MACD)
    - params: JSON string of indicator parameters
    - source: Price source (close, open, high, low, hlc3, ohlc4)
    """
    try:
        # Load data
        df = load_candles(symbol, tf)
        
        if df.empty:
            raise HTTPException(status_code=404, detail=f"No data found for {symbol} {tf}")
        
        # Parse parameters
        try:
            params_dict = json.loads(params) if isinstance(params, str) else params
        except json.JSONDecodeError:
            params_dict = {}
        
        # Calculate indicator
        indicator_series = calculate_indicator(df, name, params_dict, source)
        
        # Convert to response format
        result = []
        for i, (timestamp, value) in enumerate(zip(df["time"], indicator_series)):
            result.append({
                "t": int(timestamp),
                "v": float(value) if pd.notna(value) and value is not None else None
            })
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/indicators")
async def list_indicators():
    """
    List all available indicators.
    """
    indicators = [
        {"name": "EMA", "description": "Exponential Moving Average", "params": ["length"]},
        {"name": "RSI", "description": "Relative Strength Index", "params": ["length"]},
        {"name": "MACD", "description": "Moving Average Convergence Divergence", "params": ["fast", "slow", "signal"]},
        {"name": "BBANDS", "description": "Bollinger Bands", "params": ["length", "std"]},
        {"name": "STOCH", "description": "Stochastic Oscillator", "params": ["k", "d"]},
        {"name": "ATR", "description": "Average True Range", "params": ["length"]},
        {"name": "ADX", "description": "Average Directional Index", "params": ["length"]},
        {"name": "SMA", "description": "Simple Moving Average", "params": ["length"]},
        {"name": "WMA", "description": "Weighted Moving Average", "params": ["length"]},
        {"name": "DEMA", "description": "Double Exponential Moving Average", "params": ["length"]},
        {"name": "TEMA", "description": "Triple Exponential Moving Average", "params": ["length"]},
        {"name": "TRIMA", "description": "Triangular Moving Average", "params": ["length"]},
        {"name": "KAMA", "description": "Kaufman's Adaptive Moving Average", "params": ["length"]},
        {"name": "MAMA", "description": "MESA Adaptive Moving Average", "params": []},
        {"name": "VWMA", "description": "Volume Weighted Moving Average", "params": ["length"]},
        {"name": "HULLMA", "description": "Hull Moving Average", "params": ["length"]},
        {"name": "ALMA", "description": "Arnaud Legoux Moving Average", "params": ["length"]},
        {"name": "T3", "description": "T3 Moving Average", "params": ["length"]},
        {"name": "ZLEMA", "description": "Zero Lag Exponential Moving Average", "params": ["length"]},
        {"name": "WCP", "description": "Weighted Close Price", "params": []},
        {"name": "VWAP", "description": "Volume Weighted Average Price", "params": []},
        {"name": "SMMA", "description": "Smoothed Moving Average", "params": ["length"]},
        {"name": "FRAMA", "description": "Fractal Adaptive Moving Average", "params": ["length"]},
        {"name": "ICHIMOKU", "description": "Ichimoku Cloud", "params": []},
        {"name": "AROON", "description": "Aroon Oscillator", "params": ["length"]},
        {"name": "PSAR", "description": "Parabolic SAR", "params": []},
        {"name": "SUPERTREND", "description": "SuperTrend", "params": []},
        {"name": "ZSCORE", "description": "Z-Score", "params": ["length"]},
        {"name": "STDEV", "description": "Standard Deviation", "params": ["length"]},
        {"name": "VAR", "description": "Variance", "params": ["length"]},
        {"name": "CORREL", "description": "Correlation", "params": ["length"]},
        {"name": "ROC", "description": "Rate of Change", "params": ["length"]},
        {"name": "MOM", "description": "Momentum", "params": ["length"]},
        {"name": "MASSI", "description": "Mass Index", "params": ["length"]},
        {"name": "TRANGE", "description": "True Range", "params": []},
        {"name": "TYPPRICE", "description": "Typical Price", "params": []},
        {"name": "WCLPRICE", "description": "Weighted Close Price", "params": []},
        {"name": "UO", "description": "Ultimate Oscillator", "params": []},
        {"name": "STOCHRSI", "description": "Stochastic RSI", "params": ["length"]},
        {"name": "WILLR", "description": "Williams %R", "params": ["length"]},
        {"name": "ULTOSC", "description": "Ultimate Oscillator", "params": []},
        {"name": "TRIN", "description": "TRIN", "params": []},
        {"name": "AD", "description": "Accumulation/Distribution", "params": []},
        {"name": "OBV", "description": "On Balance Volume", "params": []},
        {"name": "CMF", "description": "Chaikin Money Flow", "params": ["length"]},
        {"name": "FI", "description": "Force Index", "params": ["length"]},
        {"name": "EOM", "description": "Ease of Movement", "params": ["length"]},
        {"name": "VPT", "description": "Volume Price Trend", "params": []},
        {"name": "NVI", "description": "Negative Volume Index", "params": []},
        {"name": "PVI", "description": "Positive Volume Index", "params": []},
        {"name": "MFI", "description": "Money Flow Index", "params": ["length"]},
        {"name": "TSI", "description": "True Strength Index", "params": ["fast", "slow"]},
        {"name": "AO", "description": "Awesome Oscillator", "params": ["fast", "slow"]},
        {"name": "BIAS", "description": "Bias", "params": ["length"]},
        {"name": "ER", "description": "Efficiency Ratio", "params": ["length"]},
        {"name": "KST", "description": "Know Sure Thing", "params": []},
        {"name": "DMI", "description": "Directional Movement Index", "params": ["length"]},
    ]
    
    return {"indicators": indicators}

if __name__ == "__main__":
    import uvicorn
    print("Starting Tradeeon TA Service...")
    print("Available at: http://localhost:8000")
    print("API docs at: http://localhost:8000/docs")
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
