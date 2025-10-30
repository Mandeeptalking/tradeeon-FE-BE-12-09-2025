"""Configuration settings for the analytics service."""

import os
from typing import Optional

try:
    from pydantic_settings import BaseSettings
except ImportError:
    from pydantic import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # API Configuration
    app_name: str = "Analytics Service"
    app_version: str = "0.1.0"
    debug: bool = False
    
    # Binance Configuration
    binance_base_url: str = os.getenv("BINANCE_BASE_URL", "https://api.binance.com")
    
    # Data Configuration
    default_timeframe: str = os.getenv("DEFAULT_TIMEFRAME", "1h")
    default_lookback: int = int(os.getenv("DEFAULT_LOOKBACK", "500"))
    
    # Redis Configuration (optional)
    redis_url: Optional[str] = os.getenv("REDIS_URL")
    redis_enabled: bool = redis_url is not None
    
    # Cache Configuration
    cache_ttl: int = 300  # 5 minutes default
    
    class Config:
        """Pydantic configuration."""
        env_file = ".env"
        case_sensitive = False
        extra = "ignore"  # Ignore extra environment variables


# Global settings instance
settings = Settings()
