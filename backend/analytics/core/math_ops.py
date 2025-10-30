"""Mathematical operations and statistical calculations."""

import numpy as np
import pandas as pd
from typing import Union, List, Dict, Any, Optional, Tuple, Literal
import logging

logger = logging.getLogger(__name__)


class MathOps:
    """Mathematical operations for financial analysis."""
    
    @staticmethod
    def sma(data: Union[pd.Series, np.ndarray], window: int) -> Union[pd.Series, np.ndarray]:
        """Simple Moving Average."""
        if isinstance(data, pd.Series):
            return data.rolling(window=window).mean()
        else:
            return pd.Series(data).rolling(window=window).mean().values
    
    @staticmethod
    def ema(data: Union[pd.Series, np.ndarray], window: int, alpha: Optional[float] = None) -> Union[pd.Series, np.ndarray]:
        """Exponential Moving Average."""
        if alpha is None:
            alpha = 2.0 / (window + 1)
        
        if isinstance(data, pd.Series):
            return data.ewm(alpha=alpha, adjust=False).mean()
        else:
            return pd.Series(data).ewm(alpha=alpha, adjust=False).mean().values
    
    @staticmethod
    def bollinger_bands(data: Union[pd.Series, np.ndarray], window: int = 20, num_std: float = 2) -> Dict[str, Union[pd.Series, np.ndarray]]:
        """Calculate Bollinger Bands."""
        if isinstance(data, np.ndarray):
            data = pd.Series(data)
        
        sma = data.rolling(window=window).mean()
        std = data.rolling(window=window).std()
        
        upper = sma + (std * num_std)
        lower = sma - (std * num_std)
        
        return {
            'middle': sma,
            'upper': upper,
            'lower': lower,
            'width': upper - lower,
            'position': (data - lower) / (upper - lower)
        }
    
    @staticmethod
    def rsi(data: Union[pd.Series, np.ndarray], window: int = 14) -> Union[pd.Series, np.ndarray]:
        """Relative Strength Index."""
        if isinstance(data, np.ndarray):
            data = pd.Series(data)
        
        delta = data.diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=window).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=window).mean()
        
        rs = gain / loss
        rsi = 100 - (100 / (1 + rs))
        
        return rsi
    
    @staticmethod
    def macd(data: Union[pd.Series, np.ndarray], fast: int = 12, slow: int = 26, signal: int = 9) -> Dict[str, Union[pd.Series, np.ndarray]]:
        """Moving Average Convergence Divergence."""
        if isinstance(data, np.ndarray):
            data = pd.Series(data)
        
        ema_fast = data.ewm(span=fast).mean()
        ema_slow = data.ewm(span=slow).mean()
        
        macd_line = ema_fast - ema_slow
        signal_line = macd_line.ewm(span=signal).mean()
        histogram = macd_line - signal_line
        
        return {
            'macd': macd_line,
            'signal': signal_line,
            'histogram': histogram
        }
    
    @staticmethod
    def volatility(data: Union[pd.Series, np.ndarray], window: int = 20, annualize: bool = True) -> Union[pd.Series, np.ndarray]:
        """Calculate rolling volatility."""
        if isinstance(data, np.ndarray):
            data = pd.Series(data)
        
        # Calculate returns if price data is provided
        if data.min() > 0:  # Assume price data if all values are positive
            returns = data.pct_change().dropna()
        else:
            returns = data
        
        vol = returns.rolling(window=window).std()
        
        if annualize:
            # Assume daily data, annualize by multiplying by sqrt(365)
            vol = vol * np.sqrt(365)
        
        return vol
    
    @staticmethod
    def sharpe_ratio(returns: Union[pd.Series, np.ndarray], risk_free_rate: float = 0.0) -> float:
        """Calculate Sharpe ratio."""
        if isinstance(returns, np.ndarray):
            returns = pd.Series(returns)
        
        excess_returns = returns - risk_free_rate
        return excess_returns.mean() / excess_returns.std() if excess_returns.std() != 0 else 0.0
    
    @staticmethod
    def max_drawdown(data: Union[pd.Series, np.ndarray]) -> Dict[str, float]:
        """Calculate maximum drawdown."""
        if isinstance(data, np.ndarray):
            data = pd.Series(data)
        
        # Calculate cumulative returns if returns are provided
        if data.abs().max() < 1:  # Assume returns if values are small
            cumulative = (1 + data).cumprod()
        else:
            cumulative = data
        
        running_max = cumulative.expanding().max()
        drawdown = (cumulative - running_max) / running_max
        
        max_dd = drawdown.min()
        max_dd_idx = drawdown.idxmin()
        
        return {
            'max_drawdown': max_dd,
            'max_drawdown_date': max_dd_idx,
            'drawdown_series': drawdown
        }
    
    @staticmethod
    def correlation_matrix(data: pd.DataFrame) -> pd.DataFrame:
        """Calculate correlation matrix."""
        return data.corr()
    
    @staticmethod
    def covariance_matrix(data: pd.DataFrame) -> pd.DataFrame:
        """Calculate covariance matrix."""
        return data.cov()
    
    @staticmethod
    def var(data: Union[pd.Series, np.ndarray], confidence_level: float = 0.05) -> float:
        """Value at Risk calculation."""
        if isinstance(data, np.ndarray):
            data = pd.Series(data)
        
        return data.quantile(confidence_level)
    
    @staticmethod
    def cvar(data: Union[pd.Series, np.ndarray], confidence_level: float = 0.05) -> float:
        """Conditional Value at Risk (Expected Shortfall)."""
        if isinstance(data, np.ndarray):
            data = pd.Series(data)
        
        var_threshold = MathOps.var(data, confidence_level)
        return data[data <= var_threshold].mean()
    
    @staticmethod
    def beta(asset_returns: Union[pd.Series, np.ndarray], market_returns: Union[pd.Series, np.ndarray]) -> float:
        """Calculate beta coefficient."""
        if isinstance(asset_returns, np.ndarray):
            asset_returns = pd.Series(asset_returns)
        if isinstance(market_returns, np.ndarray):
            market_returns = pd.Series(market_returns)
        
        covariance = np.cov(asset_returns.dropna(), market_returns.dropna())[0][1]
        market_variance = np.var(market_returns.dropna())
        
        return covariance / market_variance if market_variance != 0 else 0.0
    
    @staticmethod
    def information_ratio(returns: Union[pd.Series, np.ndarray], benchmark_returns: Union[pd.Series, np.ndarray]) -> float:
        """Calculate Information Ratio."""
        if isinstance(returns, np.ndarray):
            returns = pd.Series(returns)
        if isinstance(benchmark_returns, np.ndarray):
            benchmark_returns = pd.Series(benchmark_returns)
        
        excess_returns = returns - benchmark_returns
        tracking_error = excess_returns.std()
        
        return excess_returns.mean() / tracking_error if tracking_error != 0 else 0.0
    
    @staticmethod
    def calmar_ratio(returns: Union[pd.Series, np.ndarray]) -> float:
        """Calculate Calmar Ratio (Annual return / Max Drawdown)."""
        if isinstance(returns, np.ndarray):
            returns = pd.Series(returns)
        
        annual_return = returns.mean() * 252  # Assume daily returns
        max_dd = abs(MathOps.max_drawdown(returns)['max_drawdown'])
        
        return annual_return / max_dd if max_dd != 0 else 0.0
    
    # ========================
    # Correlation & Z-Score Utilities
    # ========================
    
    @staticmethod
    def log_returns(close: pd.Series) -> pd.Series:
        """
        Calculate log returns from a price series.
        
        Args:
            close: Price series (e.g., closing prices)
            
        Returns:
            Log returns series with NaN values dropped
            
        Raises:
            ValueError: If input series is empty
        """
        if close.empty:
            raise ValueError("Input series cannot be empty")
        
        if len(close) < 2:
            raise ValueError("Input series must have at least 2 values for log returns")
        
        return np.log(close).diff().dropna()
    
    @staticmethod
    def rolling_pearson_corr(
        a: pd.Series, 
        b: pd.Series, 
        window: int
    ) -> pd.Series:
        """
        Compute rolling Pearson correlation between two price series using log returns.
        
        Args:
            a: First price series
            b: Second price series
            window: Rolling window size
            
        Returns:
            Rolling correlation series
            
        Raises:
            ValueError: If input series are empty or window is invalid
        """
        if a.empty or b.empty:
            raise ValueError("Input series cannot be empty")
        
        if window <= 1:
            raise ValueError("Window must be greater than 1")
        
        # Calculate log returns and align indices
        ar, br = MathOps.log_returns(a).align(MathOps.log_returns(b), join="inner")
        
        if len(ar) < window:
            raise ValueError(f"Insufficient data points ({len(ar)}) for window size {window}")
        
        # Compute rolling correlation
        return ar.rolling(window).corr(br).dropna()
    
    @staticmethod
    def ratio_series(a: pd.Series, b: pd.Series) -> pd.Series:
        """
        Calculate simple price ratio A/B aligned on time.
        
        Args:
            a: Numerator price series
            b: Denominator price series
            
        Returns:
            Ratio series (a/b) with aligned indices
            
        Raises:
            ValueError: If input series are empty or contain zeros in denominator
        """
        if a.empty or b.empty:
            raise ValueError("Input series cannot be empty")
        
        # Align series on common time index
        aa, bb = a.align(b, join="inner")
        
        if aa.empty or bb.empty:
            raise ValueError("No overlapping time periods found between series")
        
        # Check for zeros in denominator
        if (bb == 0).any():
            logger.warning("Found zero values in denominator series, will result in inf values")
        
        return (aa / bb).dropna()
    
    @staticmethod
    def zscore(series: pd.Series, window: int) -> pd.Series:
        """
        Calculate rolling z-score of a series.
        
        Args:
            series: Input data series
            window: Rolling window size for mean and standard deviation
            
        Returns:
            Z-score series: (value - rolling_mean) / rolling_std
            
        Raises:
            ValueError: If input series is empty or window is invalid
        """
        if series.empty:
            raise ValueError("Input series cannot be empty")
        
        if window <= 1:
            raise ValueError("Window must be greater than 1")
        
        if len(series) < window:
            raise ValueError(f"Insufficient data points ({len(series)}) for window size {window}")
        
        # Calculate rolling statistics
        r = series.rolling(window)
        mu = r.mean()
        sigma = r.std(ddof=0)  # Population standard deviation
        
        # Calculate z-score, handling division by zero
        with np.errstate(divide='ignore', invalid='ignore'):
            z = (series - mu) / sigma
        
        return z
    
    @staticmethod
    def hedge_spread_ols(a: pd.Series, b: pd.Series) -> Tuple[pd.Series, float]:
        """
        Calculate OLS hedge ratio and spread between two price series.
        
        Uses OLS regression: log(a) = alpha + beta * log(b) + error
        Returns spread = log(a) - (alpha + beta * log(b))
        
        Args:
            a: First price series (dependent variable)
            b: Second price series (independent variable)
            
        Returns:
            Tuple of (spread_series, beta_coefficient)
            
        Raises:
            ValueError: If input series are empty or insufficient for regression
        """
        if a.empty or b.empty:
            raise ValueError("Input series cannot be empty")
        
        # Take log of prices and align on common time index
        try:
            aa, bb = np.log(a).align(np.log(b), join="inner")
        except ValueError as e:
            raise ValueError(f"Error taking log of prices: {e}")
        
        if aa.empty or bb.empty:
            raise ValueError("No overlapping time periods found between series")
        
        if len(aa) < 2:
            raise ValueError("Insufficient data points for OLS regression")
        
        # Check for NaN or inf values
        if aa.isna().any() or bb.isna().any():
            logger.warning("Found NaN values in log prices, dropping them")
            mask = ~(aa.isna() | bb.isna())
            aa, bb = aa[mask], bb[mask]
        
        if np.isinf(aa).any() or np.isinf(bb).any():
            raise ValueError("Found infinite values in log prices (likely zero or negative prices)")
        
        # Prepare design matrix for OLS: [bb, ones]
        X = np.vstack([bb.values, np.ones(len(bb))]).T
        
        try:
            # Solve OLS: aa = X * [beta, alpha]
            coeffs, residuals, rank, s = np.linalg.lstsq(X, aa.values, rcond=None)
            beta, alpha = coeffs
        except np.linalg.LinAlgError as e:
            raise ValueError(f"OLS regression failed: {e}")
        
        # Calculate spread: actual - predicted
        spread = aa - (beta * bb + alpha)
        
        return spread.dropna(), float(beta)
    
    @staticmethod
    def spread_zscore(
        a: pd.Series, 
        b: pd.Series, 
        window: int, 
        method: Literal["ratio", "ols"] = "ols"
    ) -> Tuple[pd.Series, Dict[str, Any]]:
        """
        Calculate z-score of spread between two price series.
        
        Args:
            a: First price series
            b: Second price series
            window: Rolling window for z-score calculation
            method: Spread calculation method ("ratio" or "ols")
            
        Returns:
            Tuple of (zscore_series, metadata_dict)
            
        Raises:
            ValueError: If input parameters are invalid
        """
        if a.empty or b.empty:
            raise ValueError("Input series cannot be empty")
        
        if method not in ["ratio", "ols"]:
            raise ValueError("Method must be 'ratio' or 'ols'")
        
        # Calculate spread based on method
        if method == "ratio":
            s = MathOps.ratio_series(a, b)
            meta = {"method": method}
        else:  # method == "ols"
            s, beta = MathOps.hedge_spread_ols(a, b)
            meta = {"method": method, "beta": beta}
        
        # Calculate z-score of spread
        zs = MathOps.zscore(s, window).dropna()
        
        return zs, meta
