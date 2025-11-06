"""Indicator registry with TA-Lib configurations."""

from typing import Dict, List
from models import IndicatorConfig, IndicatorCategory, IndicatorType

# TA-Lib Indicator Registry
INDICATOR_REGISTRY: Dict[str, IndicatorConfig] = {
    # Trend Indicators
    "SMA": IndicatorConfig(
        id="SMA",
        name="Simple Moving Average",
        description="Simple Moving Average",
        category=IndicatorCategory.TREND,
        type=IndicatorType.OVERLAY,
        talib_function="SMA",
        parameters={"timeperiod": 20},
        outputs=["sma"],
        colors={"sma": "#1e88e5"}
    ),
    
    "EMA": IndicatorConfig(
        id="EMA",
        name="Exponential Moving Average",
        description="Exponential Moving Average",
        category=IndicatorCategory.TREND,
        type=IndicatorType.OVERLAY,
        talib_function="EMA",
        parameters={"timeperiod": 20},
        outputs=["ema"],
        colors={"ema": "#4ecdc4"}
    ),
    
    "WMA": IndicatorConfig(
        id="WMA",
        name="Weighted Moving Average",
        description="Weighted Moving Average",
        category=IndicatorCategory.TREND,
        type=IndicatorType.OVERLAY,
        talib_function="WMA",
        parameters={"timeperiod": 20},
        outputs=["wma"],
        colors={"wma": "#45b7d1"}
    ),
    
    "DEMA": IndicatorConfig(
        id="DEMA",
        name="Double Exponential Moving Average",
        description="Double Exponential Moving Average",
        category=IndicatorCategory.TREND,
        type=IndicatorType.OVERLAY,
        talib_function="DEMA",
        parameters={"timeperiod": 20},
        outputs=["dema"],
        colors={"dema": "#96ceb4"}
    ),
    
    "TEMA": IndicatorConfig(
        id="TEMA",
        name="Triple Exponential Moving Average",
        description="Triple Exponential Moving Average",
        category=IndicatorCategory.TREND,
        type=IndicatorType.OVERLAY,
        talib_function="TEMA",
        parameters={"timeperiod": 20},
        outputs=["tema"],
        colors={"tema": "#feca57"}
    ),
    
    "KAMA": IndicatorConfig(
        id="KAMA",
        name="Kaufman Adaptive Moving Average",
        description="Kaufman Adaptive Moving Average",
        category=IndicatorCategory.TREND,
        type=IndicatorType.OVERLAY,
        talib_function="KAMA",
        parameters={"timeperiod": 20},
        outputs=["kama"],
        colors={"kama": "#ff9ff3"}
    ),
    
    # Momentum Indicators
    "RSI": IndicatorConfig(
        id="RSI",
        name="Relative Strength Index",
        description="Relative Strength Index",
        category=IndicatorCategory.MOMENTUM,
        type=IndicatorType.OSCILLATOR,
        talib_function="RSI",
        parameters={"timeperiod": 14},
        outputs=["rsi"],
        colors={"rsi": "#6a5acd"},
        level_lines={"overbought": 70, "oversold": 30}
    ),
    
    "MACD": IndicatorConfig(
        id="MACD",
        name="Moving Average Convergence Divergence",
        description="Moving Average Convergence Divergence",
        category=IndicatorCategory.MOMENTUM,
        type=IndicatorType.OSCILLATOR,
        talib_function="MACD",
        parameters={"fastperiod": 12, "slowperiod": 26, "signalperiod": 9},
        outputs=["macd", "signal", "histogram"],
        colors={"macd": "#2962ff", "signal": "#ff6d00", "histogram": "#26a69a"},
        level_lines={"zero": 0}
    ),
    
    "STOCH": IndicatorConfig(
        id="STOCH",
        name="Stochastic Oscillator",
        description="Stochastic Oscillator",
        category=IndicatorCategory.MOMENTUM,
        type=IndicatorType.OSCILLATOR,
        talib_function="STOCH",
        parameters={"fastk_period": 5, "slowk_period": 3, "slowd_period": 3},
        outputs=["slowk", "slowd"],
        colors={"slowk": "#ff6b6b", "slowd": "#4ecdc4"},
        level_lines={"overbought": 80, "oversold": 20}
    ),
    
    "STOCHF": IndicatorConfig(
        id="STOCHF",
        name="Stochastic Fast",
        description="Stochastic Fast",
        category=IndicatorCategory.MOMENTUM,
        type=IndicatorType.OSCILLATOR,
        talib_function="STOCHF",
        parameters={"fastk_period": 5, "fastd_period": 3},
        outputs=["fastk", "fastd"],
        colors={"fastk": "#ff6b6b", "fastd": "#4ecdc4"},
        level_lines={"overbought": 80, "oversold": 20}
    ),
    
    "STOCHRSI": IndicatorConfig(
        id="STOCHRSI",
        name="Stochastic RSI",
        description="Stochastic RSI",
        category=IndicatorCategory.MOMENTUM,
        type=IndicatorType.OSCILLATOR,
        talib_function="STOCHRSI",
        parameters={"timeperiod": 14, "fastk_period": 5, "fastd_period": 3},
        outputs=["fastk", "fastd"],
        colors={"fastk": "#ff6b6b", "fastd": "#4ecdc4"},
        level_lines={"overbought": 80, "oversold": 20}
    ),
    
    "WILLR": IndicatorConfig(
        id="WILLR",
        name="Williams %R",
        description="Williams %R",
        category=IndicatorCategory.MOMENTUM,
        type=IndicatorType.OSCILLATOR,
        talib_function="WILLR",
        parameters={"timeperiod": 14},
        outputs=["willr"],
        colors={"willr": "#8e24aa"},
        level_lines={"overbought": -20, "oversold": -80}
    ),
    
    "CCI": IndicatorConfig(
        id="CCI",
        name="Commodity Channel Index",
        description="Commodity Channel Index",
        category=IndicatorCategory.MOMENTUM,
        type=IndicatorType.OSCILLATOR,
        talib_function="CCI",
        parameters={"timeperiod": 20},
        outputs=["cci"],
        colors={"cci": "#8e24aa"},
        level_lines={"overbought": 100, "oversold": -100}
    ),
    
    "ROC": IndicatorConfig(
        id="ROC",
        name="Rate of Change",
        description="Rate of Change",
        category=IndicatorCategory.MOMENTUM,
        type=IndicatorType.OSCILLATOR,
        talib_function="ROC",
        parameters={"timeperiod": 10},
        outputs=["roc"],
        colors={"roc": "#ff5722"}
    ),
    
    "MOM": IndicatorConfig(
        id="MOM",
        name="Momentum",
        description="Momentum",
        category=IndicatorCategory.MOMENTUM,
        type=IndicatorType.OSCILLATOR,
        talib_function="MOM",
        parameters={"timeperiod": 10},
        outputs=["mom"],
        colors={"mom": "#ff5722"}
    ),
    
    "PPO": IndicatorConfig(
        id="PPO",
        name="Percentage Price Oscillator",
        description="Percentage Price Oscillator",
        category=IndicatorCategory.MOMENTUM,
        type=IndicatorType.OSCILLATOR,
        talib_function="PPO",
        parameters={"fastperiod": 12, "slowperiod": 26},
        outputs=["ppo"],
        colors={"ppo": "#9c27b0"}
    ),
    
    "TRIX": IndicatorConfig(
        id="TRIX",
        name="TRIX",
        description="TRIX",
        category=IndicatorCategory.MOMENTUM,
        type=IndicatorType.OSCILLATOR,
        talib_function="TRIX",
        parameters={"timeperiod": 30},
        outputs=["trix"],
        colors={"trix": "#9c27b0"}
    ),
    
    "ULTOSC": IndicatorConfig(
        id="ULTOSC",
        name="Ultimate Oscillator",
        description="Ultimate Oscillator",
        category=IndicatorCategory.MOMENTUM,
        type=IndicatorType.OSCILLATOR,
        talib_function="ULTOSC",
        parameters={"timeperiod1": 7, "timeperiod2": 14, "timeperiod3": 28},
        outputs=["ultosc"],
        colors={"ultosc": "#ff9800"},
        level_lines={"overbought": 70, "oversold": 30}
    ),
    
    # Volatility Indicators
    "BBANDS": IndicatorConfig(
        id="BBANDS",
        name="Bollinger Bands",
        description="Bollinger Bands",
        category=IndicatorCategory.VOLATILITY,
        type=IndicatorType.OVERLAY,
        talib_function="BBANDS",
        parameters={"timeperiod": 20, "nbdevup": 2, "nbdevdn": 2},
        outputs=["upper", "middle", "lower"],
        colors={"upper": "#ff6d00", "middle": "#2962ff", "lower": "#ff6d00"}
    ),
    
    "ATR": IndicatorConfig(
        id="ATR",
        name="Average True Range",
        description="Average True Range",
        category=IndicatorCategory.VOLATILITY,
        type=IndicatorType.OSCILLATOR,
        talib_function="ATR",
        parameters={"timeperiod": 14},
        outputs=["atr"],
        colors={"atr": "#ff5722"}
    ),
    
    "NATR": IndicatorConfig(
        id="NATR",
        name="Normalized Average True Range",
        description="Normalized Average True Range",
        category=IndicatorCategory.VOLATILITY,
        type=IndicatorType.OSCILLATOR,
        talib_function="NATR",
        parameters={"timeperiod": 14},
        outputs=["natr"],
        colors={"natr": "#ff5722"}
    ),
    
    "TRANGE": IndicatorConfig(
        id="TRANGE",
        name="True Range",
        description="True Range",
        category=IndicatorCategory.VOLATILITY,
        type=IndicatorType.OSCILLATOR,
        talib_function="TRANGE",
        parameters={},
        outputs=["trange"],
        colors={"trange": "#ff5722"}
    ),
    
    # Volume Indicators
    "AD": IndicatorConfig(
        id="AD",
        name="Accumulation/Distribution Line",
        description="Accumulation/Distribution Line",
        category=IndicatorCategory.VOLUME,
        type=IndicatorType.OSCILLATOR,
        talib_function="AD",
        parameters={},
        outputs=["ad"],
        colors={"ad": "#4caf50"}
    ),
    
    "ADOSC": IndicatorConfig(
        id="ADOSC",
        name="Accumulation/Distribution Oscillator",
        description="Accumulation/Distribution Oscillator",
        category=IndicatorCategory.VOLUME,
        type=IndicatorType.OSCILLATOR,
        talib_function="ADOSC",
        parameters={"fastperiod": 3, "slowperiod": 10},
        outputs=["adosc"],
        colors={"adosc": "#4caf50"}
    ),
    
    "OBV": IndicatorConfig(
        id="OBV",
        name="On Balance Volume",
        description="On Balance Volume",
        category=IndicatorCategory.VOLUME,
        type=IndicatorType.OSCILLATOR,
        talib_function="OBV",
        parameters={},
        outputs=["obv"],
        colors={"obv": "#4caf50"}
    ),
    
    "MFI": IndicatorConfig(
        id="MFI",
        name="Money Flow Index",
        description="Money Flow Index",
        category=IndicatorCategory.VOLUME,
        type=IndicatorType.OSCILLATOR,
        talib_function="MFI",
        parameters={"timeperiod": 14},
        outputs=["mfi"],
        colors={"mfi": "#4caf50"},
        level_lines={"overbought": 80, "oversold": 20}
    ),
    
    # Trend Detection
    "ADX": IndicatorConfig(
        id="ADX",
        name="Average Directional Index",
        description="Average Directional Index",
        category=IndicatorCategory.TREND,
        type=IndicatorType.OSCILLATOR,
        talib_function="ADX",
        parameters={"timeperiod": 14},
        outputs=["adx"],
        colors={"adx": "#ff5722"},
        level_lines={"strong_trend": 25, "very_strong": 50}
    ),
    
    "AROON": IndicatorConfig(
        id="AROON",
        name="Aroon",
        description="Aroon",
        category=IndicatorCategory.TREND,
        type=IndicatorType.OSCILLATOR,
        talib_function="AROON",
        parameters={"timeperiod": 14},
        outputs=["aroon_down", "aroon_up"],
        colors={"aroon_down": "#f44336", "aroon_up": "#4caf50"}
    ),
    
    "AROONOSC": IndicatorConfig(
        id="AROONOSC",
        name="Aroon Oscillator",
        description="Aroon Oscillator",
        category=IndicatorCategory.TREND,
        type=IndicatorType.OSCILLATOR,
        talib_function="AROONOSC",
        parameters={"timeperiod": 14},
        outputs=["aroonosc"],
        colors={"aroonosc": "#ff9800"}
    ),
    
    "CMO": IndicatorConfig(
        id="CMO",
        name="Chande Momentum Oscillator",
        description="Chande Momentum Oscillator",
        category=IndicatorCategory.MOMENTUM,
        type=IndicatorType.OSCILLATOR,
        talib_function="CMO",
        parameters={"timeperiod": 14},
        outputs=["cmo"],
        colors={"cmo": "#9c27b0"}
    ),
    
    "DX": IndicatorConfig(
        id="DX",
        name="Directional Movement Index",
        description="Directional Movement Index",
        category=IndicatorCategory.TREND,
        type=IndicatorType.OSCILLATOR,
        talib_function="DX",
        parameters={"timeperiod": 14},
        outputs=["dx"],
        colors={"dx": "#ff5722"}
    ),
    
    "MINUS_DI": IndicatorConfig(
        id="MINUS_DI",
        name="Minus Directional Indicator",
        description="Minus Directional Indicator",
        category=IndicatorCategory.TREND,
        type=IndicatorType.OSCILLATOR,
        talib_function="MINUS_DI",
        parameters={"timeperiod": 14},
        outputs=["minus_di"],
        colors={"minus_di": "#f44336"}
    ),
    
    "MINUS_DM": IndicatorConfig(
        id="MINUS_DM",
        name="Minus Directional Movement",
        description="Minus Directional Movement",
        category=IndicatorCategory.TREND,
        type=IndicatorType.OSCILLATOR,
        talib_function="MINUS_DM",
        parameters={"timeperiod": 14},
        outputs=["minus_dm"],
        colors={"minus_dm": "#f44336"}
    ),
    
    "PLUS_DI": IndicatorConfig(
        id="PLUS_DI",
        name="Plus Directional Indicator",
        description="Plus Directional Indicator",
        category=IndicatorCategory.TREND,
        type=IndicatorType.OSCILLATOR,
        talib_function="PLUS_DI",
        parameters={"timeperiod": 14},
        outputs=["plus_di"],
        colors={"plus_di": "#4caf50"}
    ),
    
    "PLUS_DM": IndicatorConfig(
        id="PLUS_DM",
        name="Plus Directional Movement",
        description="Plus Directional Movement",
        category=IndicatorCategory.TREND,
        type=IndicatorType.OSCILLATOR,
        talib_function="PLUS_DM",
        parameters={"timeperiod": 14},
        outputs=["plus_dm"],
        colors={"plus_dm": "#4caf50"}
    ),
}

def get_indicator_config(indicator_id: str) -> IndicatorConfig:
    """Get indicator configuration by ID."""
    return INDICATOR_REGISTRY.get(indicator_id)

def get_all_indicators() -> Dict[str, IndicatorConfig]:
    """Get all available indicators."""
    return INDICATOR_REGISTRY

def get_indicators_by_category(category: str) -> Dict[str, IndicatorConfig]:
    """Get indicators by category."""
    return {k: v for k, v in INDICATOR_REGISTRY.items() if v.category.value == category}

def get_overlay_indicators() -> Dict[str, IndicatorConfig]:
    """Get overlay indicators (plot on main chart)."""
    return {k: v for k, v in INDICATOR_REGISTRY.items() if v.type == IndicatorType.OVERLAY}

def get_oscillator_indicators() -> Dict[str, IndicatorConfig]:
    """Get oscillator indicators (plot in sub-pane)."""
    return {k: v for k, v in INDICATOR_REGISTRY.items() if v.type == IndicatorType.OSCILLATOR}


