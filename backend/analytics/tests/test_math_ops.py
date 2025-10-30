"""Tests for mathematical operations."""

import pytest
import numpy as np
import pandas as pd
from unittest.mock import Mock

from ..core.math_ops import MathOps


class TestMathOps:
    """Test cases for MathOps class."""
    
    @pytest.fixture
    def sample_data(self):
        """Sample price data for testing."""
        np.random.seed(42)
        prices = 100 + np.cumsum(np.random.randn(100) * 0.01)
        return pd.Series(prices)
    
    @pytest.fixture
    def sample_returns(self):
        """Sample returns data for testing."""
        np.random.seed(42)
        return pd.Series(np.random.randn(100) * 0.02)
    
    def test_sma_pandas_series(self, sample_data):
        """Test Simple Moving Average with pandas Series."""
        result = MathOps.sma(sample_data, window=10)
        
        assert isinstance(result, pd.Series)
        assert len(result) == len(sample_data)
        assert pd.isna(result.iloc[0:9]).all()  # First 9 values should be NaN
        assert not pd.isna(result.iloc[9])  # 10th value should not be NaN
    
    def test_sma_numpy_array(self, sample_data):
        """Test Simple Moving Average with numpy array."""
        result = MathOps.sma(sample_data.values, window=10)
        
        assert isinstance(result, np.ndarray)
        assert len(result) == len(sample_data)
        assert np.isnan(result[0:9]).all()
        assert not np.isnan(result[9])
    
    def test_ema_pandas_series(self, sample_data):
        """Test Exponential Moving Average with pandas Series."""
        result = MathOps.ema(sample_data, window=10)
        
        assert isinstance(result, pd.Series)
        assert len(result) == len(sample_data)
        assert not pd.isna(result.iloc[-1])
    
    def test_ema_custom_alpha(self, sample_data):
        """Test EMA with custom alpha."""
        result = MathOps.ema(sample_data, window=10, alpha=0.5)
        
        assert isinstance(result, pd.Series)
        assert len(result) == len(sample_data)
    
    def test_bollinger_bands(self, sample_data):
        """Test Bollinger Bands calculation."""
        result = MathOps.bollinger_bands(sample_data, window=20, num_std=2)
        
        assert isinstance(result, dict)
        assert 'middle' in result
        assert 'upper' in result
        assert 'lower' in result
        assert 'width' in result
        assert 'position' in result
        
        # Upper band should be above middle, middle above lower
        valid_idx = ~pd.isna(result['middle'])
        assert (result['upper'][valid_idx] >= result['middle'][valid_idx]).all()
        assert (result['middle'][valid_idx] >= result['lower'][valid_idx]).all()
    
    def test_rsi(self, sample_data):
        """Test RSI calculation."""
        result = MathOps.rsi(sample_data, window=14)
        
        assert isinstance(result, pd.Series)
        assert len(result) == len(sample_data)
        
        # RSI should be between 0 and 100
        valid_values = result.dropna()
        assert (valid_values >= 0).all()
        assert (valid_values <= 100).all()
    
    def test_macd(self, sample_data):
        """Test MACD calculation."""
        result = MathOps.macd(sample_data, fast=12, slow=26, signal=9)
        
        assert isinstance(result, dict)
        assert 'macd' in result
        assert 'signal' in result
        assert 'histogram' in result
        
        assert isinstance(result['macd'], pd.Series)
        assert isinstance(result['signal'], pd.Series)
        assert isinstance(result['histogram'], pd.Series)
    
    def test_volatility(self, sample_returns):
        """Test volatility calculation."""
        result = MathOps.volatility(sample_returns, window=20, annualize=True)
        
        assert isinstance(result, pd.Series)
        assert len(result) == len(sample_returns)
        
        # Volatility should be positive
        valid_values = result.dropna()
        assert (valid_values >= 0).all()
    
    def test_sharpe_ratio(self, sample_returns):
        """Test Sharpe ratio calculation."""
        result = MathOps.sharpe_ratio(sample_returns, risk_free_rate=0.02)
        
        assert isinstance(result, float)
        assert not np.isnan(result)
    
    def test_max_drawdown(self, sample_data):
        """Test maximum drawdown calculation."""
        result = MathOps.max_drawdown(sample_data)
        
        assert isinstance(result, dict)
        assert 'max_drawdown' in result
        assert 'max_drawdown_date' in result
        assert 'drawdown_series' in result
        
        # Max drawdown should be negative or zero
        assert result['max_drawdown'] <= 0
    
    def test_correlation_matrix(self):
        """Test correlation matrix calculation."""
        np.random.seed(42)
        data = pd.DataFrame({
            'A': np.random.randn(100),
            'B': np.random.randn(100),
            'C': np.random.randn(100)
        })
        
        result = MathOps.correlation_matrix(data)
        
        assert isinstance(result, pd.DataFrame)
        assert result.shape == (3, 3)
        
        # Diagonal should be 1.0
        assert np.allclose(np.diag(result), 1.0)
        
        # Matrix should be symmetric
        assert np.allclose(result.values, result.values.T)
    
    def test_covariance_matrix(self):
        """Test covariance matrix calculation."""
        np.random.seed(42)
        data = pd.DataFrame({
            'A': np.random.randn(100),
            'B': np.random.randn(100)
        })
        
        result = MathOps.covariance_matrix(data)
        
        assert isinstance(result, pd.DataFrame)
        assert result.shape == (2, 2)
        
        # Matrix should be symmetric
        assert np.allclose(result.values, result.values.T)
    
    def test_var(self, sample_returns):
        """Test Value at Risk calculation."""
        result = MathOps.var(sample_returns, confidence_level=0.05)
        
        assert isinstance(result, float)
        assert not np.isnan(result)
    
    def test_cvar(self, sample_returns):
        """Test Conditional Value at Risk calculation."""
        result = MathOps.cvar(sample_returns, confidence_level=0.05)
        
        assert isinstance(result, float)
        assert not np.isnan(result)
    
    def test_beta(self):
        """Test beta calculation."""
        np.random.seed(42)
        asset_returns = pd.Series(np.random.randn(100) * 0.02)
        market_returns = pd.Series(np.random.randn(100) * 0.015)
        
        result = MathOps.beta(asset_returns, market_returns)
        
        assert isinstance(result, float)
        assert not np.isnan(result)
    
    def test_information_ratio(self):
        """Test Information Ratio calculation."""
        np.random.seed(42)
        returns = pd.Series(np.random.randn(100) * 0.02)
        benchmark_returns = pd.Series(np.random.randn(100) * 0.015)
        
        result = MathOps.information_ratio(returns, benchmark_returns)
        
        assert isinstance(result, float)
        assert not np.isnan(result)
    
    def test_calmar_ratio(self, sample_returns):
        """Test Calmar Ratio calculation."""
        result = MathOps.calmar_ratio(sample_returns)
        
        assert isinstance(result, float)
        assert not np.isnan(result)
    
    def test_empty_data_handling(self):
        """Test handling of empty data."""
        empty_series = pd.Series([])
        
        result = MathOps.sma(empty_series, window=10)
        assert len(result) == 0
        
        result = MathOps.ema(empty_series, window=10)
        assert len(result) == 0


class TestCorrelationZScoreUtils:
    """Test cases for correlation and z-score utility functions."""
    
    @pytest.fixture
    def price_series_a(self):
        """First sample price series."""
        np.random.seed(42)
        dates = pd.date_range('2023-01-01', periods=100, freq='D')
        prices = 100 + np.cumsum(np.random.randn(100) * 0.02)
        return pd.Series(prices, index=dates)
    
    @pytest.fixture
    def price_series_b(self):
        """Second sample price series (correlated with first)."""
        np.random.seed(43)
        dates = pd.date_range('2023-01-01', periods=100, freq='D')
        # Create correlated series
        base_returns = np.random.randn(100) * 0.02
        correlated_returns = 0.7 * base_returns + 0.3 * np.random.randn(100) * 0.02
        prices = 200 + np.cumsum(correlated_returns)
        return pd.Series(prices, index=dates)
    
    @pytest.fixture
    def misaligned_series(self):
        """Price series with different time index."""
        np.random.seed(44)
        dates = pd.date_range('2023-01-15', periods=50, freq='D')  # Different start date
        prices = 150 + np.cumsum(np.random.randn(50) * 0.015)
        return pd.Series(prices, index=dates)
    
    def test_log_returns(self, price_series_a):
        """Test log returns calculation."""
        result = MathOps.log_returns(price_series_a)
        
        assert isinstance(result, pd.Series)
        assert len(result) == len(price_series_a) - 1  # One less due to diff
        assert not result.isna().any()  # Should not contain NaN
        
        # Check calculation manually for first few values
        expected_first = np.log(price_series_a.iloc[1]) - np.log(price_series_a.iloc[0])
        assert np.isclose(result.iloc[0], expected_first)
    
    def test_log_returns_empty_series(self):
        """Test log returns with empty series."""
        empty_series = pd.Series([])
        
        with pytest.raises(ValueError, match="Input series cannot be empty"):
            MathOps.log_returns(empty_series)
    
    def test_log_returns_single_value(self):
        """Test log returns with single value."""
        single_value = pd.Series([100.0])
        
        with pytest.raises(ValueError, match="must have at least 2 values"):
            MathOps.log_returns(single_value)
    
    def test_rolling_pearson_corr(self, price_series_a, price_series_b):
        """Test rolling Pearson correlation."""
        window = 20
        result = MathOps.rolling_pearson_corr(price_series_a, price_series_b, window)
        
        assert isinstance(result, pd.Series)
        assert len(result) > 0
        assert not result.empty
        
        # Correlation should be between -1 and 1
        valid_corr = result.dropna()
        assert (valid_corr >= -1).all()
        assert (valid_corr <= 1).all()
    
    def test_rolling_pearson_corr_misaligned(self, price_series_a, misaligned_series):
        """Test rolling correlation with misaligned series."""
        window = 10
        result = MathOps.rolling_pearson_corr(price_series_a, misaligned_series, window)
        
        assert isinstance(result, pd.Series)
        # Should work with overlapping periods
        assert len(result) > 0
    
    def test_rolling_pearson_corr_invalid_window(self, price_series_a, price_series_b):
        """Test rolling correlation with invalid window."""
        with pytest.raises(ValueError, match="Window must be greater than 1"):
            MathOps.rolling_pearson_corr(price_series_a, price_series_b, 1)
    
    def test_rolling_pearson_corr_insufficient_data(self):
        """Test rolling correlation with insufficient data."""
        short_series_a = pd.Series([1, 2, 3])
        short_series_b = pd.Series([4, 5, 6])
        
        with pytest.raises(ValueError, match="Insufficient data points"):
            MathOps.rolling_pearson_corr(short_series_a, short_series_b, 10)
    
    def test_ratio_series(self, price_series_a, price_series_b):
        """Test ratio series calculation."""
        result = MathOps.ratio_series(price_series_a, price_series_b)
        
        assert isinstance(result, pd.Series)
        assert len(result) == len(price_series_a)  # Should be same length (aligned)
        assert not result.empty
        assert (result > 0).all()  # All ratios should be positive
    
    def test_ratio_series_misaligned(self, price_series_a, misaligned_series):
        """Test ratio series with misaligned indices."""
        result = MathOps.ratio_series(price_series_a, misaligned_series)
        
        assert isinstance(result, pd.Series)
        # Should only include overlapping periods
        assert len(result) < len(price_series_a)
        assert len(result) > 0
    
    def test_ratio_series_with_zeros(self):
        """Test ratio series with zeros in denominator."""
        series_a = pd.Series([1, 2, 3, 4])
        series_b = pd.Series([1, 0, 3, 4])  # Contains zero
        
        # Should not raise exception but will log warning
        result = MathOps.ratio_series(series_a, series_b)
        assert isinstance(result, pd.Series)
        assert np.isinf(result.iloc[1])  # Second value should be inf
    
    def test_ratio_series_empty(self):
        """Test ratio series with empty series."""
        empty_series = pd.Series([])
        series_a = pd.Series([1, 2, 3])
        
        with pytest.raises(ValueError, match="Input series cannot be empty"):
            MathOps.ratio_series(empty_series, series_a)
    
    def test_zscore(self):
        """Test z-score calculation."""
        # Create series with known statistics
        data = pd.Series([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
        window = 5
        
        result = MathOps.zscore(data, window)
        
        assert isinstance(result, pd.Series)
        assert len(result) == len(data)
        
        # Check that z-scores are calculated correctly
        # For window=5, the 5th element (index 4, value 5) should have z-score of 0
        # because it's the mean of [1,2,3,4,5]
        expected_mean = data.iloc[0:5].mean()  # Mean of first 5 values
        expected_std = data.iloc[0:5].std(ddof=0)  # Population std
        expected_zscore = (data.iloc[4] - expected_mean) / expected_std
        
        assert np.isclose(result.iloc[4], expected_zscore)
    
    def test_zscore_constant_series(self):
        """Test z-score with constant series (std=0)."""
        constant_series = pd.Series([5, 5, 5, 5, 5, 5])
        
        result = MathOps.zscore(constant_series, window=3)
        
        # Should result in NaN or inf values due to zero standard deviation
        assert isinstance(result, pd.Series)
        assert np.isinf(result.iloc[2:]).any() or result.iloc[2:].isna().any()
    
    def test_zscore_invalid_window(self):
        """Test z-score with invalid window."""
        series = pd.Series([1, 2, 3, 4, 5])
        
        with pytest.raises(ValueError, match="Window must be greater than 1"):
            MathOps.zscore(series, 1)
    
    def test_zscore_insufficient_data(self):
        """Test z-score with insufficient data."""
        short_series = pd.Series([1, 2])
        
        with pytest.raises(ValueError, match="Insufficient data points"):
            MathOps.zscore(short_series, 5)
    
    def test_hedge_spread_ols(self, price_series_a, price_series_b):
        """Test OLS hedge spread calculation."""
        spread, beta = MathOps.hedge_spread_ols(price_series_a, price_series_b)
        
        assert isinstance(spread, pd.Series)
        assert isinstance(beta, float)
        assert not spread.empty
        assert not np.isnan(beta)
        
        # Beta should be reasonable (not extreme values)
        assert -10 < beta < 10
    
    def test_hedge_spread_ols_perfect_correlation(self):
        """Test OLS hedge spread with perfectly correlated series."""
        # Create perfectly correlated series: b = 2 * a + noise
        a = pd.Series([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
        b = 2 * a + 0.1  # Almost perfect relationship
        
        spread, beta = MathOps.hedge_spread_ols(a, b)
        
        # Beta should be close to 2 (the true relationship in log space will be different)
        assert isinstance(beta, float)
        assert not np.isnan(beta)
        
        # Spread should be relatively small due to high correlation
        assert isinstance(spread, pd.Series)
        assert not spread.empty
    
    def test_hedge_spread_ols_with_zeros(self):
        """Test OLS hedge spread with zero values (should fail)."""
        series_a = pd.Series([0, 1, 2, 3])  # Contains zero
        series_b = pd.Series([1, 2, 3, 4])
        
        with pytest.raises(ValueError, match="infinite values in log prices"):
            MathOps.hedge_spread_ols(series_a, series_b)
    
    def test_hedge_spread_ols_empty_series(self):
        """Test OLS hedge spread with empty series."""
        empty_series = pd.Series([])
        series_a = pd.Series([1, 2, 3])
        
        with pytest.raises(ValueError, match="Input series cannot be empty"):
            MathOps.hedge_spread_ols(empty_series, series_a)
    
    def test_spread_zscore_ratio_method(self, price_series_a, price_series_b):
        """Test spread z-score with ratio method."""
        window = 20
        zscore, meta = MathOps.spread_zscore(price_series_a, price_series_b, window, method="ratio")
        
        assert isinstance(zscore, pd.Series)
        assert isinstance(meta, dict)
        assert meta["method"] == "ratio"
        assert "beta" not in meta  # Beta not included for ratio method
        assert not zscore.empty
    
    def test_spread_zscore_ols_method(self, price_series_a, price_series_b):
        """Test spread z-score with OLS method."""
        window = 20
        zscore, meta = MathOps.spread_zscore(price_series_a, price_series_b, window, method="ols")
        
        assert isinstance(zscore, pd.Series)
        assert isinstance(meta, dict)
        assert meta["method"] == "ols"
        assert "beta" in meta
        assert isinstance(meta["beta"], float)
        assert not np.isnan(meta["beta"])
        assert not zscore.empty
    
    def test_spread_zscore_invalid_method(self, price_series_a, price_series_b):
        """Test spread z-score with invalid method."""
        with pytest.raises(ValueError, match="Method must be 'ratio' or 'ols'"):
            MathOps.spread_zscore(price_series_a, price_series_b, 20, method="invalid")
    
    def test_spread_zscore_empty_series(self):
        """Test spread z-score with empty series."""
        empty_series = pd.Series([])
        series_a = pd.Series([1, 2, 3])
        
        with pytest.raises(ValueError, match="Input series cannot be empty"):
            MathOps.spread_zscore(empty_series, series_a, 10)
    
    def test_integration_full_workflow(self, price_series_a, price_series_b):
        """Test full workflow integration."""
        # Test that all functions work together
        window = 15
        
        # 1. Calculate log returns
        returns_a = MathOps.log_returns(price_series_a)
        returns_b = MathOps.log_returns(price_series_b)
        
        assert not returns_a.empty
        assert not returns_b.empty
        
        # 2. Calculate rolling correlation
        correlation = MathOps.rolling_pearson_corr(price_series_a, price_series_b, window)
        assert not correlation.empty
        
        # 3. Calculate ratio series
        ratio = MathOps.ratio_series(price_series_a, price_series_b)
        assert not ratio.empty
        
        # 4. Calculate z-score of ratio
        ratio_zscore = MathOps.zscore(ratio, window)
        assert not ratio_zscore.empty
        
        # 5. Calculate OLS hedge spread and z-score
        spread, beta = MathOps.hedge_spread_ols(price_series_a, price_series_b)
        spread_zscore = MathOps.zscore(spread, window)
        
        assert not spread.empty
        assert not spread_zscore.empty
        assert isinstance(beta, float)
        
        # 6. Use convenience function
        zscore_ratio, meta_ratio = MathOps.spread_zscore(price_series_a, price_series_b, window, "ratio")
        zscore_ols, meta_ols = MathOps.spread_zscore(price_series_a, price_series_b, window, "ols")
        
        assert not zscore_ratio.empty
        assert not zscore_ols.empty
        assert meta_ratio["method"] == "ratio"
        assert meta_ols["method"] == "ols"
        assert "beta" in meta_ols

    def test_synthetic_known_ratio_spread(self):
        """Test z-score with synthetic data where ratio spread is known."""
        # Create synthetic data with known ratio relationship
        # Series A oscillates around mean with known pattern
        dates = pd.date_range('2023-01-01', periods=200, freq='H')
        
        # Base price for series B
        base_price_b = 100.0
        series_b = pd.Series([base_price_b] * 200, index=dates)
        
        # Series A has a known ratio relationship: A = 2.0 * B + noise that averages to 0
        # This means the ratio A/B should have mean = 2.0
        np.random.seed(42)
        noise = np.random.normal(0, 0.1, 200)  # Small noise around the mean
        series_a = 2.0 * series_b + noise
        
        # Calculate ratio and its z-score
        ratio = MathOps.ratio_series(series_a, series_b)
        window = 50
        
        # The ratio should be close to 2.0 on average
        assert abs(ratio.mean() - 2.0) < 0.1
        
        # Calculate z-score of the ratio
        zscore_series = MathOps.zscore(ratio, window)
        
        # Near the mean (where ratio ≈ 2.0), z-score should be close to 0
        valid_zscores = zscore_series.dropna()
        
        # Find points where ratio is closest to its mean
        ratio_mean = ratio.mean()
        close_to_mean_mask = abs(ratio - ratio_mean) < 0.05
        close_to_mean_zscores = zscore_series[close_to_mean_mask].dropna()
        
        if not close_to_mean_zscores.empty:
            # Z-scores near the mean should be close to 0
            mean_zscore = close_to_mean_zscores.mean()
            assert abs(mean_zscore) < 0.5, f"Expected z-score near 0, got {mean_zscore}"

    def test_synthetic_known_ols_spread(self):
        """Test OLS hedge spread with synthetic data where relationship is known."""
        # Create synthetic data with perfect linear relationship in log space
        dates = pd.date_range('2023-01-01', periods=150, freq='H')
        
        # Create base series B
        np.random.seed(123)
        log_returns_b = np.random.normal(0, 0.01, 150)
        log_prices_b = np.cumsum(log_returns_b)
        series_b = pd.Series(np.exp(log_prices_b) * 100, index=dates)
        
        # Create series A with known relationship: log(A) = 0.5 + 1.5 * log(B) + small_noise
        # This means alpha = 0.5, beta = 1.5
        true_alpha = 0.5
        true_beta = 1.5
        noise = np.random.normal(0, 0.001, 150)  # Very small noise
        log_prices_a = true_alpha + true_beta * log_prices_b + noise
        series_a = pd.Series(np.exp(log_prices_a), index=dates)
        
        # Calculate OLS hedge spread
        spread, estimated_beta = MathOps.hedge_spread_ols(series_a, series_b)
        
        # The estimated beta should be close to the true beta
        assert abs(estimated_beta - true_beta) < 0.1, f"Expected beta ≈ {true_beta}, got {estimated_beta}"
        
        # The spread should be close to the noise (small values)
        spread_std = spread.std()
        assert spread_std < 0.01, f"Expected small spread std, got {spread_std}"
        
        # Calculate z-score of the spread
        window = 30
        zscore_series = MathOps.zscore(spread, window)
        
        # Since the spread is mostly noise around 0, z-scores should be mostly small
        valid_zscores = zscore_series.dropna()
        extreme_zscores = valid_zscores[abs(valid_zscores) > 2]  # More than 2 standard deviations
        
        # Most z-scores should not be extreme
        extreme_ratio = len(extreme_zscores) / len(valid_zscores)
        assert extreme_ratio < 0.1, f"Too many extreme z-scores: {extreme_ratio:.2%}"

    def test_rolling_correlation_identical_series(self):
        """Test rolling correlation between identical series should be ≈ 1."""
        # Create a series with some variation
        np.random.seed(456)
        dates = pd.date_range('2023-01-01', periods=100, freq='D')
        base_prices = 100 + np.cumsum(np.random.randn(100) * 0.02)
        series = pd.Series(base_prices, index=dates)
        
        # Calculate rolling correlation between the series and itself
        window = 20
        correlation = MathOps.rolling_pearson_corr(series, series, window)
        
        # All correlations should be very close to 1.0
        valid_correlations = correlation.dropna()
        assert not valid_correlations.empty
        
        # Check that all correlations are very close to 1
        assert (valid_correlations > 0.99).all(), f"Expected all correlations ≈ 1, got range {valid_correlations.min():.3f} to {valid_correlations.max():.3f}"
        
        # Mean should be very close to 1
        assert abs(valid_correlations.mean() - 1.0) < 0.01

    def test_rolling_correlation_perfectly_anticorrelated(self):
        """Test rolling correlation between perfectly anti-correlated series should be ≈ -1."""
        # Create a series
        np.random.seed(789)
        dates = pd.date_range('2023-01-01', periods=100, freq='D')
        series_a = pd.Series(100 + np.cumsum(np.random.randn(100) * 0.02), index=dates)
        
        # Create perfectly anti-correlated series (flip around the mean)
        mean_a = series_a.mean()
        series_b = 2 * mean_a - series_a  # Perfect negative correlation
        
        # Calculate rolling correlation
        window = 20
        correlation = MathOps.rolling_pearson_corr(series_a, series_b, window)
        
        # All correlations should be very close to -1.0
        valid_correlations = correlation.dropna()
        assert not valid_correlations.empty
        
        # Check that all correlations are very close to -1
        assert (valid_correlations < -0.99).all(), f"Expected all correlations ≈ -1, got range {valid_correlations.min():.3f} to {valid_correlations.max():.3f}"

    def test_spread_zscore_mean_reversion_property(self):
        """Test that spread z-scores exhibit mean reversion properties."""
        # Create two cointegrated series (they have a long-term relationship)
        np.random.seed(999)
        dates = pd.date_range('2023-01-01', periods=300, freq='H')
        
        # Create base series
        random_walk = np.cumsum(np.random.randn(300) * 0.01)
        series_b = pd.Series(100 * np.exp(random_walk), index=dates)
        
        # Create cointegrated series (long-term relationship with mean-reverting spread)
        spread_process = np.zeros(300)
        for i in range(1, 300):
            # Mean-reverting spread: next = 0.95 * current + noise
            spread_process[i] = 0.95 * spread_process[i-1] + np.random.randn() * 0.005
        
        series_a = series_b * np.exp(1.2 + spread_process)  # A = B * exp(alpha + spread)
        series_a = pd.Series(series_a, index=dates)
        
        # Calculate spread z-score using OLS method
        window = 50
        zscore_series, meta = MathOps.spread_zscore(series_a, series_b, window, "ols")
        
        valid_zscores = zscore_series.dropna()
        assert not valid_zscores.empty
        
        # Z-scores should have reasonable range (not all extreme)
        assert valid_zscores.std() > 0.1  # Should have some variation
        assert abs(valid_zscores.mean()) < 0.5  # Should be roughly centered around 0
        
        # Should have both positive and negative z-scores
        positive_zscores = (valid_zscores > 0).sum()
        negative_zscores = (valid_zscores < 0).sum()
        
        # Roughly balanced (allowing for some randomness)
        total_zscores = len(valid_zscores)
        positive_ratio = positive_zscores / total_zscores
        assert 0.2 < positive_ratio < 0.8, f"Expected balanced z-scores, got {positive_ratio:.2%} positive"
