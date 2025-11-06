"""
Redis Cache System for Indicator Engine

High-performance caching for:
- Chart snapshots (klines + indicators)
- Precomputed indicator values
- Popular trading pairs and timeframes
- Cache hit/miss metrics
"""

import json
import time
import hashlib
import logging
from typing import Dict, List, Optional, Any, Tuple, Union
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta
import asyncio

try:
    import redis.asyncio as redis
    from redis.asyncio import Redis
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False
    Redis = None

logger = logging.getLogger(__name__)


@dataclass
class CacheMetrics:
    """Cache performance metrics"""
    hits: int = 0
    misses: int = 0
    sets: int = 0
    errors: int = 0
    total_requests: int = 0
    avg_hit_time_ms: float = 0.0
    avg_miss_time_ms: float = 0.0
    last_reset: float = 0.0
    
    @property
    def hit_ratio(self) -> float:
        """Calculate cache hit ratio"""
        if self.total_requests == 0:
            return 0.0
        return self.hits / self.total_requests
    
    @property
    def miss_ratio(self) -> float:
        """Calculate cache miss ratio"""
        return 1.0 - self.hit_ratio


@dataclass
class CacheConfig:
    """Cache configuration"""
    # Redis connection
    redis_url: str = "redis://localhost:6379/0"
    connection_pool_size: int = 10
    
    # TTL settings (seconds)
    snapshot_ttl: int = 30  # Chart snapshots
    indicator_ttl: int = 60  # Individual indicators
    popular_pairs_ttl: int = 300  # Popular pairs list
    
    # Cache keys
    key_prefix: str = "indicator_engine"
    snapshot_prefix: str = "snapshot"
    indicator_prefix: str = "indicator"
    metrics_prefix: str = "metrics"
    
    # Performance
    max_snapshot_size: int = 1024 * 1024  # 1MB max per snapshot
    compression: bool = True
    
    # Popular pairs for precomputation
    popular_symbols: List[str] = None
    popular_timeframes: List[str] = None
    core_indicators: List[str] = None
    
    def __post_init__(self):
        if self.popular_symbols is None:
            self.popular_symbols = ["BTCUSDT", "ETHUSDT", "BNBUSDT", "ADAUSDT", "SOLUSDT"]
        if self.popular_timeframes is None:
            self.popular_timeframes = ["1m", "5m", "15m", "1h", "4h", "1d"]
        if self.core_indicators is None:
            self.core_indicators = ["EMA_14", "EMA_50", "RSI_14", "MACD", "BB_20"]


class IndicatorCache:
    """
    Redis-based cache for indicator engine data
    
    Features:
    - Chart snapshot caching
    - Indicator value caching
    - Precomputation scheduling
    - Performance metrics
    - Cache warming strategies
    """
    
    def __init__(self, config: CacheConfig = None):
        self.config = config or CacheConfig()
        self.redis_client: Optional[Redis] = None
        self.metrics = CacheMetrics(last_reset=time.time())
        self.is_connected = False
        
        if not REDIS_AVAILABLE:
            logger.warning("Redis not available - caching disabled")
    
    async def connect(self) -> bool:
        """Connect to Redis"""
        if not REDIS_AVAILABLE:
            return False
        
        try:
            self.redis_client = redis.from_url(
                self.config.redis_url,
                max_connections=self.config.connection_pool_size,
                retry_on_timeout=True,
                decode_responses=True
            )
            
            # Test connection
            await self.redis_client.ping()
            self.is_connected = True
            logger.info(f"Connected to Redis: {self.config.redis_url}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to connect to Redis: {e}")
            self.is_connected = False
            return False
    
    async def disconnect(self):
        """Disconnect from Redis"""
        if self.redis_client:
            await self.redis_client.close()
            self.is_connected = False
            logger.info("Disconnected from Redis")
    
    def _make_snapshot_key(self, symbol: str, timeframe: str, indicators: List[str], max_bars: int) -> str:
        """Generate cache key for chart snapshot"""
        # Create deterministic key from parameters
        indicators_str = ",".join(sorted(indicators)) if indicators else ""
        params = f"{symbol}:{timeframe}:{indicators_str}:{max_bars}"
        
        # Hash for consistent key length
        params_hash = hashlib.md5(params.encode()).hexdigest()[:16]
        
        return f"{self.config.key_prefix}:{self.config.snapshot_prefix}:{params_hash}"
    
    def _make_indicator_key(self, symbol: str, timeframe: str, indicator_id: str) -> str:
        """Generate cache key for individual indicator"""
        return f"{self.config.key_prefix}:{self.config.indicator_prefix}:{symbol}:{timeframe}:{indicator_id}"
    
    def _make_metrics_key(self) -> str:
        """Generate cache key for metrics"""
        return f"{self.config.key_prefix}:{self.config.metrics_prefix}:stats"
    
    async def get_snapshot(
        self, 
        symbol: str, 
        timeframe: str, 
        indicators: List[str] = None,
        max_bars: int = 1000
    ) -> Optional[Dict[str, Any]]:
        """
        Get cached chart snapshot
        
        Returns None if not cached or Redis unavailable
        """
        if not self.is_connected:
            return None
        
        start_time = time.time()
        indicators = indicators or []
        
        try:
            key = self._make_snapshot_key(symbol, timeframe, indicators, max_bars)
            cached_data = await self.redis_client.get(key)
            
            if cached_data:
                # Cache hit
                data = json.loads(cached_data)
                hit_time = (time.time() - start_time) * 1000
                
                self.metrics.hits += 1
                self.metrics.total_requests += 1
                self.metrics.avg_hit_time_ms = (
                    (self.metrics.avg_hit_time_ms * (self.metrics.hits - 1) + hit_time) / self.metrics.hits
                )
                
                logger.debug(f"Cache HIT: {key} ({hit_time:.2f}ms)")
                return data
            else:
                # Cache miss
                miss_time = (time.time() - start_time) * 1000
                
                self.metrics.misses += 1
                self.metrics.total_requests += 1
                self.metrics.avg_miss_time_ms = (
                    (self.metrics.avg_miss_time_ms * (self.metrics.misses - 1) + miss_time) / self.metrics.misses
                )
                
                logger.debug(f"Cache MISS: {key} ({miss_time:.2f}ms)")
                return None
                
        except Exception as e:
            self.metrics.errors += 1
            logger.error(f"Cache GET error: {e}")
            return None
    
    async def set_snapshot(
        self, 
        symbol: str, 
        timeframe: str, 
        data: Dict[str, Any],
        indicators: List[str] = None,
        max_bars: int = 1000,
        ttl: Optional[int] = None
    ) -> bool:
        """Cache chart snapshot"""
        if not self.is_connected:
            return False
        
        indicators = indicators or []
        ttl = ttl or self.config.snapshot_ttl
        
        try:
            key = self._make_snapshot_key(symbol, timeframe, indicators, max_bars)
            
            # Add cache metadata
            cache_data = {
                **data,
                '_cache_meta': {
                    'cached_at': time.time(),
                    'ttl': ttl,
                    'key': key
                }
            }
            
            serialized = json.dumps(cache_data, separators=(',', ':'))
            
            # Check size limit
            if len(serialized) > self.config.max_snapshot_size:
                logger.warning(f"Snapshot too large for cache: {len(serialized)} bytes")
                return False
            
            # Set with TTL
            await self.redis_client.setex(key, ttl, serialized)
            
            self.metrics.sets += 1
            logger.debug(f"Cache SET: {key} (TTL: {ttl}s, Size: {len(serialized)} bytes)")
            return True
            
        except Exception as e:
            self.metrics.errors += 1
            logger.error(f"Cache SET error: {e}")
            return False
    
    async def get_indicator(self, symbol: str, timeframe: str, indicator_id: str) -> Optional[Dict[str, Any]]:
        """Get cached indicator values"""
        if not self.is_connected:
            return None
        
        try:
            key = self._make_indicator_key(symbol, timeframe, indicator_id)
            cached_data = await self.redis_client.get(key)
            
            if cached_data:
                return json.loads(cached_data)
            return None
            
        except Exception as e:
            logger.error(f"Indicator cache GET error: {e}")
            return None
    
    async def set_indicator(
        self, 
        symbol: str, 
        timeframe: str, 
        indicator_id: str, 
        data: Dict[str, Any],
        ttl: Optional[int] = None
    ) -> bool:
        """Cache indicator values"""
        if not self.is_connected:
            return False
        
        ttl = ttl or self.config.indicator_ttl
        
        try:
            key = self._make_indicator_key(symbol, timeframe, indicator_id)
            serialized = json.dumps(data, separators=(',', ':'))
            
            await self.redis_client.setex(key, ttl, serialized)
            return True
            
        except Exception as e:
            logger.error(f"Indicator cache SET error: {e}")
            return False
    
    async def warm_popular_pairs(self, engine) -> Dict[str, int]:
        """
        Warm cache for popular trading pairs
        
        Args:
            engine: IndicatorEngine instance for data computation
            
        Returns:
            Dict with warming statistics
        """
        if not self.is_connected:
            return {"error": "Redis not connected"}
        
        stats = {"warmed": 0, "errors": 0, "skipped": 0}
        
        for symbol in self.config.popular_symbols:
            for timeframe in self.config.popular_timeframes:
                try:
                    # Check if already cached
                    key = self._make_snapshot_key(symbol, timeframe, self.config.core_indicators, 1000)
                    if await self.redis_client.exists(key):
                        stats["skipped"] += 1
                        continue
                    
                    # Generate snapshot
                    snapshot = engine.get_chart_snapshot(
                        symbol=symbol,
                        timeframe=timeframe,
                        indicators=self.config.core_indicators,
                        max_bars=1000
                    )
                    
                    # Cache it
                    success = await self.set_snapshot(
                        symbol=symbol,
                        timeframe=timeframe,
                        data=snapshot,
                        indicators=self.config.core_indicators,
                        max_bars=1000,
                        ttl=self.config.snapshot_ttl
                    )
                    
                    if success:
                        stats["warmed"] += 1
                    else:
                        stats["errors"] += 1
                        
                except Exception as e:
                    logger.error(f"Error warming {symbol}_{timeframe}: {e}")
                    stats["errors"] += 1
        
        logger.info(f"Cache warming completed: {stats}")
        return stats
    
    async def get_metrics(self) -> Dict[str, Any]:
        """Get cache performance metrics"""
        metrics_dict = asdict(self.metrics)
        
        # Add Redis info if available
        if self.is_connected:
            try:
                info = await self.redis_client.info()
                metrics_dict.update({
                    'redis_connected': True,
                    'redis_used_memory': info.get('used_memory', 0),
                    'redis_connected_clients': info.get('connected_clients', 0),
                    'redis_keyspace_hits': info.get('keyspace_hits', 0),
                    'redis_keyspace_misses': info.get('keyspace_misses', 0),
                })
            except Exception as e:
                logger.error(f"Error getting Redis info: {e}")
                metrics_dict['redis_connected'] = False
        else:
            metrics_dict['redis_connected'] = False
        
        return metrics_dict
    
    async def reset_metrics(self):
        """Reset cache metrics"""
        self.metrics = CacheMetrics(last_reset=time.time())
    
    async def clear_cache(self, pattern: str = None) -> int:
        """Clear cache entries matching pattern"""
        if not self.is_connected:
            return 0
        
        try:
            if pattern:
                keys = await self.redis_client.keys(f"{self.config.key_prefix}:{pattern}*")
            else:
                keys = await self.redis_client.keys(f"{self.config.key_prefix}:*")
            
            if keys:
                deleted = await self.redis_client.delete(*keys)
                logger.info(f"Cleared {deleted} cache entries")
                return deleted
            return 0
            
        except Exception as e:
            logger.error(f"Error clearing cache: {e}")
            return 0
    
    def get_cache_status(self) -> Dict[str, Any]:
        """Get cache system status"""
        return {
            'redis_available': REDIS_AVAILABLE,
            'connected': self.is_connected,
            'config': asdict(self.config),
            'metrics': asdict(self.metrics)
        }

