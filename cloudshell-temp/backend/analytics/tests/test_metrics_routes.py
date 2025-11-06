"""Tests for metrics routes."""

import pytest
import pytest_asyncio
import respx
import httpx
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, patch, MagicMock
import pandas as pd
import numpy as np
import json
from datetime import datetime, timezone

from ..main import app


class TestMetricsRoutes:
    """Test cases for metrics routes."""
    
    @pytest.fixture
    def client(self):
        """Test client fixture."""
        return TestClient(app)
    
    @pytest.fixture
    def mock_ticker_data(self):
        """Mock 24hr ticker data."""
        return [{
            "symbol": "BTCUSDT",
            "lastPrice": "50000.00",
            "priceChange": "1000.00",
            "priceChangePercent": "2.04",
            "highPrice": "51000.00",
            "lowPrice": "48000.00",
            "volume": "1000.50",
            "quoteVolume": "50000000.00",
            "count": 50000,
            "openPrice": "49000.00",
            "weightedAvgPrice": "49500.00"
        }]
    
    @pytest.fixture
    def mock_ohlcv_data(self):
        """Mock OHLCV DataFrame."""
        np.random.seed(42)
        dates = pd.date_range('2023-01-01', periods=100, freq='1H')
        prices = 50000 + np.cumsum(np.random.randn(100) * 100)
        
        df = pd.DataFrame({
            'open': prices + np.random.randn(100) * 10,
            'high': prices + np.random.randn(100) * 20 + 50,
            'low': prices + np.random.randn(100) * 20 - 50,
            'close': prices,
            'volume': np.random.randn(100) * 1000 + 5000,
            'quote_asset_volume': np.random.randn(100) * 50000000 + 250000000,
            'number_of_trades': np.random.randint(1000, 10000, 100),
            'taker_buy_base_asset_volume': np.random.randn(100) * 500 + 2500,
            'taker_buy_quote_asset_volume': np.random.randn(100) * 25000000 + 125000000
        }, index=dates)
        
        return df
    
    def test_health_endpoint(self, client):
        """Test health check endpoint."""
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json() == {"status": "ok"}
    
    def test_root_endpoint(self, client):
        """Test root endpoint."""
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert "service" in data
        assert "version" in data
        assert "status" in data
        assert data["status"] == "running"
    
    @patch('backend.analytics.routers.metrics.BinanceClient')
    def test_get_price_metrics_success(self, mock_binance_client, client, mock_ticker_data):
        """Test successful price metrics retrieval."""
        # Mock the async context manager and client methods
        mock_client_instance = AsyncMock()
        mock_client_instance.get_24hr_ticker.return_value = mock_ticker_data
        mock_binance_client.return_value.__aenter__.return_value = mock_client_instance
        
        response = client.get("/metrics/price/BTCUSDT")
        assert response.status_code == 200
        
        data = response.json()
        assert data["symbol"] == "BTCUSDT"
        assert data["price"] == 50000.0
        assert data["price_change"] == 1000.0
        assert "high_24h" in data
        assert "low_24h" in data
        assert "volume_24h" in data
    
    @patch('backend.analytics.routers.metrics.BinanceClient')
    def test_get_price_metrics_not_found(self, mock_binance_client, client):
        """Test price metrics for non-existent symbol."""
        mock_client_instance = AsyncMock()
        mock_client_instance.get_24hr_ticker.return_value = []
        mock_binance_client.return_value.__aenter__.return_value = mock_client_instance
        
        response = client.get("/metrics/price/INVALID")
        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()
    
    @patch('backend.analytics.routers.metrics.OHLCVLoader')
    @patch('backend.analytics.routers.metrics.BinanceClient')
    def test_get_technical_indicators_success(self, mock_binance_client, mock_ohlcv_loader, client, mock_ohlcv_data):
        """Test successful technical indicators retrieval."""
        # Mock the loader
        mock_loader_instance = MagicMock()
        mock_loader_instance.load_ohlcv.return_value = mock_ohlcv_data
        mock_ohlcv_loader.return_value = mock_loader_instance
        
        # Mock the client
        mock_client_instance = AsyncMock()
        mock_binance_client.return_value.__aenter__.return_value = mock_client_instance
        
        response = client.get("/metrics/technical/BTCUSDT")
        assert response.status_code == 200
        
        data = response.json()
        assert data["symbol"] == "BTCUSDT"
        assert "timestamp" in data
        assert "price" in data
        assert "indicators" in data
        
        indicators = data["indicators"]
        assert "sma_20" in indicators
        assert "sma_50" in indicators
        assert "ema_12" in indicators
        assert "bollinger" in indicators
        assert "rsi" in indicators
        assert "macd" in indicators
    
    @patch('backend.analytics.routers.metrics.OHLCVLoader')
    @patch('backend.analytics.routers.metrics.BinanceClient')
    def test_get_technical_indicators_no_data(self, mock_binance_client, mock_ohlcv_loader, client):
        """Test technical indicators with no data."""
        mock_loader_instance = MagicMock()
        mock_loader_instance.load_ohlcv.return_value = pd.DataFrame()  # Empty DataFrame
        mock_ohlcv_loader.return_value = mock_loader_instance
        
        mock_client_instance = AsyncMock()
        mock_binance_client.return_value.__aenter__.return_value = mock_client_instance
        
        response = client.get("/metrics/technical/INVALID")
        assert response.status_code == 404
        assert "no data found" in response.json()["detail"].lower()
    
    @patch('backend.analytics.routers.metrics.OHLCVLoader')
    @patch('backend.analytics.routers.metrics.BinanceClient')
    def test_get_risk_metrics_success(self, mock_binance_client, mock_ohlcv_loader, client, mock_ohlcv_data):
        """Test successful risk metrics retrieval."""
        mock_loader_instance = MagicMock()
        mock_loader_instance.load_ohlcv.return_value = mock_ohlcv_data
        mock_loader_instance.calculate_returns.return_value = mock_ohlcv_data['close'].pct_change().dropna()
        mock_loader_instance.calculate_log_returns.return_value = np.log(mock_ohlcv_data['close'] / mock_ohlcv_data['close'].shift(1)).dropna()
        mock_ohlcv_loader.return_value = mock_loader_instance
        
        mock_client_instance = AsyncMock()
        mock_binance_client.return_value.__aenter__.return_value = mock_client_instance
        
        response = client.get("/metrics/risk/BTCUSDT")
        assert response.status_code == 200
        
        data = response.json()
        assert data["symbol"] == "BTCUSDT"
        assert "timestamp" in data
        assert "risk_metrics" in data
        
        risk_metrics = data["risk_metrics"]
        assert "volatility_annualized" in risk_metrics
        assert "sharpe_ratio" in risk_metrics
        assert "max_drawdown" in risk_metrics
        assert "var_5_percent" in risk_metrics
        assert "returns_stats" in risk_metrics
    
    @patch('backend.analytics.routers.metrics.OHLCVLoader')
    @patch('backend.analytics.routers.metrics.BinanceClient')
    def test_get_correlation_matrix_success(self, mock_binance_client, mock_ohlcv_loader, client, mock_ohlcv_data):
        """Test successful correlation matrix retrieval."""
        mock_loader_instance = MagicMock()
        
        # Create mock data for multiple symbols
        mock_data_dict = {
            "BTCUSDT": mock_ohlcv_data,
            "ETHUSDT": mock_ohlcv_data.copy()  # Use same data for simplicity
        }
        mock_loader_instance.load_multiple_symbols.return_value = mock_data_dict
        mock_loader_instance.calculate_returns.return_value = mock_ohlcv_data['close'].pct_change().dropna()
        mock_ohlcv_loader.return_value = mock_loader_instance
        
        mock_client_instance = AsyncMock()
        mock_binance_client.return_value.__aenter__.return_value = mock_client_instance
        
        response = client.get("/metrics/correlation?symbols=BTCUSDT&symbols=ETHUSDT")
        assert response.status_code == 200
        
        data = response.json()
        assert "symbols" in data
        assert "correlation_matrix" in data
        assert "covariance_matrix" in data
        assert "summary_stats" in data
        
        assert len(data["symbols"]) == 2
    
    def test_get_correlation_matrix_insufficient_symbols(self, client):
        """Test correlation matrix with insufficient symbols."""
        response = client.get("/metrics/correlation?symbols=BTCUSDT")
        assert response.status_code == 400
        assert "at least 2 symbols required" in response.json()["detail"].lower()
    
    def test_get_correlation_matrix_no_symbols(self, client):
        """Test correlation matrix with no symbols."""
        response = client.get("/metrics/correlation")
        assert response.status_code == 422  # FastAPI validation error
    
    def test_technical_indicators_with_custom_params(self, client):
        """Test technical indicators with custom parameters."""
        with patch('backend.analytics.routers.metrics.OHLCVLoader') as mock_ohlcv_loader, \
             patch('backend.analytics.routers.metrics.BinanceClient') as mock_binance_client:
            
            mock_loader_instance = MagicMock()
            mock_loader_instance.load_ohlcv.return_value = pd.DataFrame({
                'close': [100, 101, 102, 103, 104]
            })
            mock_ohlcv_loader.return_value = mock_loader_instance
            
            mock_client_instance = AsyncMock()
            mock_binance_client.return_value.__aenter__.return_value = mock_client_instance
            
            response = client.get("/metrics/technical/BTCUSDT?interval=1d&limit=100")
            
            # Should call load_ohlcv with custom parameters
            mock_loader_instance.load_ohlcv.assert_called_once()
            call_args = mock_loader_instance.load_ohlcv.call_args
            assert call_args[0][0] == "BTCUSDT"  # symbol
            assert call_args[0][1] == "1d"  # interval
            assert call_args[0][2] == 100  # limit


class TestAnalyticsRoutes:
    """Test cases for analytics correlation and spread z-score routes."""
    
    @pytest.fixture
    def client(self):
        """Test client fixture."""
        return TestClient(app)
    
    @pytest.fixture
    def mock_klines_data(self):
        """Mock klines data that resembles Binance API response."""
        # Generate realistic klines data
        base_time = 1640995200000  # 2022-01-01 00:00:00 UTC in milliseconds
        klines = []
        
        for i in range(100):
            timestamp = base_time + (i * 3600000)  # 1 hour intervals
            open_price = 50000 + i * 10 + np.random.normal(0, 100)
            high_price = open_price + abs(np.random.normal(200, 50))
            low_price = open_price - abs(np.random.normal(200, 50))
            close_price = open_price + np.random.normal(0, 150)
            volume = abs(np.random.normal(100, 20))
            
            kline = [
                timestamp,                    # Open time
                f"{open_price:.2f}",         # Open
                f"{high_price:.2f}",         # High  
                f"{low_price:.2f}",          # Low
                f"{close_price:.2f}",        # Close
                f"{volume:.2f}",             # Volume
                timestamp + 3599999,         # Close time
                f"{close_price * volume:.2f}",  # Quote asset volume
                1000 + i,                    # Number of trades
                f"{volume * 0.6:.2f}",       # Taker buy base asset volume
                f"{close_price * volume * 0.6:.2f}",  # Taker buy quote asset volume
                "0"                          # Ignore
            ]
            klines.append(kline)
        
        return klines
    
    @pytest.fixture
    def mock_correlated_klines(self):
        """Mock klines for two correlated symbols."""
        base_time = 1640995200000
        klines_a = []
        klines_b = []
        
        # Generate correlated price movements
        np.random.seed(42)
        base_returns = np.random.normal(0, 0.02, 100)
        
        price_a = 50000
        price_b = 3000
        
        for i in range(100):
            timestamp = base_time + (i * 3600000)
            
            # Correlated returns
            return_a = base_returns[i] + np.random.normal(0, 0.01)
            return_b = 0.8 * base_returns[i] + np.random.normal(0, 0.008)  # 80% correlation
            
            price_a *= (1 + return_a)
            price_b *= (1 + return_b)
            
            # Create klines for both symbols
            for price, klines_list in [(price_a, klines_a), (price_b, klines_b)]:
                open_price = price
                high_price = price * (1 + abs(np.random.normal(0, 0.005)))
                low_price = price * (1 - abs(np.random.normal(0, 0.005)))
                close_price = price
                volume = abs(np.random.normal(100, 20))
                
                kline = [
                    timestamp, f"{open_price:.2f}", f"{high_price:.2f}", f"{low_price:.2f}",
                    f"{close_price:.2f}", f"{volume:.2f}", timestamp + 3599999,
                    f"{close_price * volume:.2f}", 1000 + i, f"{volume * 0.6:.2f}",
                    f"{close_price * volume * 0.6:.2f}", "0"
                ]
                klines_list.append(kline)
        
        return klines_a, klines_b
    
    @respx.mock
    @pytest.mark.asyncio
    async def test_correlation_endpoint_success(self, mock_correlated_klines):
        """Test correlation endpoint with mocked Binance API."""
        klines_a, klines_b = mock_correlated_klines
        
        # Mock Binance API responses
        respx.get("https://api.binance.com/api/v3/klines").mock(
            side_effect=[
                httpx.Response(200, json=klines_a),  # First call for BTCUSDT
                httpx.Response(200, json=klines_b),  # Second call for ETHUSDT
            ]
        )
        
        async with httpx.AsyncClient(app=app, base_url="http://test") as client:
            response = await client.get(
                "/metrics/correlation",
                params={
                    "symbolA": "BTCUSDT",
                    "symbolB": "ETHUSDT",
                    "window": 20,
                    "limit": 100
                }
            )
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify response schema
        assert "symbolA" in data
        assert "symbolB" in data
        assert "interval" in data
        assert "window" in data
        assert "latest" in data
        assert "series" in data
        
        # Verify data types and values
        assert data["symbolA"] == "BTCUSDT"
        assert data["symbolB"] == "ETHUSDT"
        assert data["window"] == 20
        assert isinstance(data["latest"], (float, type(None)))
        assert isinstance(data["series"], list)
        
        # If we have correlation data, verify it's reasonable
        if data["latest"] is not None:
            assert -1 <= data["latest"] <= 1, f"Correlation should be between -1 and 1, got {data['latest']}"
        
        # Verify series format
        if data["series"]:
            for point in data["series"][:3]:  # Check first 3 points
                assert "t" in point
                assert "value" in point
                assert isinstance(point["value"], (float, int))
                assert -1 <= point["value"] <= 1
    
    @respx.mock
    @pytest.mark.asyncio
    async def test_spread_zscore_endpoint_ols_method(self, mock_correlated_klines):
        """Test spread z-score endpoint with OLS method."""
        klines_a, klines_b = mock_correlated_klines
        
        # Mock Binance API responses
        respx.get("https://api.binance.com/api/v3/klines").mock(
            side_effect=[
                httpx.Response(200, json=klines_a),
                httpx.Response(200, json=klines_b),
            ]
        )
        
        async with httpx.AsyncClient(app=app, base_url="http://test") as client:
            response = await client.get(
                "/metrics/spread-zscore",
                params={
                    "symbolA": "ETHUSDT",
                    "symbolB": "BTCUSDT",
                    "method": "ols",
                    "window": 30,
                    "limit": 100
                }
            )
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify response schema
        required_fields = ["symbolA", "symbolB", "interval", "window", "method", "latest", "meta", "series"]
        for field in required_fields:
            assert field in data, f"Missing field: {field}"
        
        # Verify data values
        assert data["symbolA"] == "ETHUSDT"
        assert data["symbolB"] == "BTCUSDT"
        assert data["method"] == "ols"
        assert data["window"] == 30
        
        # Verify meta contains beta for OLS method
        assert "beta" in data["meta"]
        assert isinstance(data["meta"]["beta"], (float, int))
        
        # Verify latest z-score is reasonable
        if data["latest"] is not None:
            assert isinstance(data["latest"], (float, int))
            # Z-scores should typically be between -5 and 5
            assert -10 <= data["latest"] <= 10, f"Z-score seems unreasonable: {data['latest']}"
    
    @respx.mock
    @pytest.mark.asyncio
    async def test_spread_zscore_endpoint_ratio_method(self, mock_correlated_klines):
        """Test spread z-score endpoint with ratio method."""
        klines_a, klines_b = mock_correlated_klines
        
        respx.get("https://api.binance.com/api/v3/klines").mock(
            side_effect=[
                httpx.Response(200, json=klines_a),
                httpx.Response(200, json=klines_b),
            ]
        )
        
        async with httpx.AsyncClient(app=app, base_url="http://test") as client:
            response = await client.get(
                "/metrics/spread-zscore",
                params={
                    "symbolA": "ETHUSDT",
                    "symbolB": "BTCUSDT", 
                    "method": "ratio",
                    "window": 25,
                    "limit": 80
                }
            )
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify method-specific response
        assert data["method"] == "ratio"
        assert data["window"] == 25
        
        # Ratio method should NOT have beta in meta
        assert "beta" not in data["meta"] or data["meta"]["beta"] is None
        assert data["meta"]["method"] == "ratio"
    
    @respx.mock
    @pytest.mark.asyncio
    async def test_correlation_endpoint_validation_errors(self):
        """Test correlation endpoint validation errors."""
        async with httpx.AsyncClient(app=app, base_url="http://test") as client:
            # Test same symbols
            response = await client.get(
                "/metrics/correlation",
                params={
                    "symbolA": "BTCUSDT",
                    "symbolB": "BTCUSDT",  # Same symbol
                    "window": 20
                }
            )
            assert response.status_code == 400
            assert "different" in response.json()["detail"].lower()
            
            # Test invalid window
            response = await client.get(
                "/metrics/correlation",
                params={
                    "symbolA": "BTCUSDT",
                    "symbolB": "ETHUSDT",
                    "window": 1000  # Too large
                }
            )
            assert response.status_code == 422  # FastAPI validation error
    
    @respx.mock
    @pytest.mark.asyncio
    async def test_endpoints_insufficient_data(self):
        """Test endpoints with insufficient data."""
        # Mock API to return very little data
        short_klines = [
            [1640995200000, "50000", "50100", "49900", "50050", "10", 1640998799999,
             "500500", 100, "6", "300300", "0"]
        ]
        
        respx.get("https://api.binance.com/api/v3/klines").mock(
            return_value=httpx.Response(200, json=short_klines)
        )
        
        async with httpx.AsyncClient(app=app, base_url="http://test") as client:
            response = await client.get(
                "/metrics/correlation",
                params={
                    "symbolA": "BTCUSDT",
                    "symbolB": "ETHUSDT",
                    "window": 50,  # Larger than available data
                    "limit": 10
                }
            )
            
            assert response.status_code == 422
            assert "insufficient data" in response.json()["detail"].lower()
    
    def test_synthetic_perfect_correlation_via_api(self):
        """Test API with synthetic perfectly correlated data."""
        with patch('analytics.core.BinanceClient') as mock_client:
            with patch('analytics.core.OHLCVLoader') as mock_loader:
                mock_client_instance = AsyncMock()
                mock_client.return_value.__aenter__.return_value = mock_client_instance
                
                # Create perfectly correlated synthetic data
                dates = pd.date_range('2023-01-01', periods=100, freq='H', tz='UTC')
                base_prices = 50000 + np.cumsum(np.random.randn(100) * 50)
                
                df_a = pd.DataFrame({
                    'close': base_prices,
                    'volume': np.random.rand(100) * 100
                }, index=dates)
                
                # Perfectly correlated (same series)
                df_b = df_a.copy()
                
                mock_loader_instance = MagicMock()
                mock_loader_instance.load_ohlcv.side_effect = [df_a, df_b]
                mock_loader.return_value = mock_loader_instance
                
                with TestClient(app) as client:
                    response = client.get(
                        "/metrics/correlation",
                        params={
                            "symbolA": "BTCUSDT",
                            "symbolB": "ETHUSDT",
                            "window": 20,
                            "limit": 100
                        }
                    )
                
                assert response.status_code == 200
                data = response.json()
                
                # Should have perfect correlation
                if data["latest"] is not None:
                    assert data["latest"] > 0.99, f"Expected perfect correlation ≈ 1, got {data['latest']}"
