"""Redis caching utilities for the analytics service."""

import json
import hashlib
import logging
from typing import Optional, Any, Dict
from datetime import timedelta

from .config import settings

logger = logging.getLogger(__name__)

# Global Redis client instance
_redis_client = None


def get_redis_client():
    """Get Redis client instance (lazy initialization)."""
    global _redis_client
    
    if not settings.redis_enabled:
        return None
    
    if _redis_client is None:
        try:
            import redis
            _redis_client = redis.from_url(
                settings.redis_url,
                decode_responses=True,
                socket_connect_timeout=5,
                socket_timeout=5,
                retry_on_timeout=True
            )
            # Test connection
            _redis_client.ping()
            logger.info("Redis client initialized successfully")
        except ImportError:
            logger.warning("Redis not available: pip install redis")
            return None
        except Exception as e:
            logger.error(f"Failed to initialize Redis client: {e}")
            return None
    
    return _redis_client


def generate_cache_key(prefix: str, params: Dict[str, Any]) -> str:
    """Generate a cache key from parameters."""
    # Sort params for consistent key generation
    sorted_params = sorted(params.items())
    params_str = json.dumps(sorted_params, sort_keys=True)
    
    # Create hash of parameters
    params_hash = hashlib.md5(params_str.encode()).hexdigest()[:12]
    
    return f"analytics:{prefix}:{params_hash}"


async def get_cached_response(cache_key: str) -> Optional[Dict[str, Any]]:
    """Get cached response from Redis."""
    client = get_redis_client()
    if not client:
        return None
    
    try:
        cached_data = client.get(cache_key)
        if cached_data:
            logger.debug(f"Cache hit: {cache_key}")
            return json.loads(cached_data)
        else:
            logger.debug(f"Cache miss: {cache_key}")
            return None
    except Exception as e:
        logger.error(f"Error getting cached response: {e}")
        return None


async def cache_response(cache_key: str, response: Dict[str, Any], ttl_seconds: int = 30) -> bool:
    """Cache response in Redis with TTL."""
    client = get_redis_client()
    if not client:
        return False
    
    try:
        serialized = json.dumps(response, default=str)  # default=str handles datetime
        client.setex(cache_key, ttl_seconds, serialized)
        logger.debug(f"Cached response: {cache_key} (TTL: {ttl_seconds}s)")
        return True
    except Exception as e:
        logger.error(f"Error caching response: {e}")
        return False


def cache_enabled() -> bool:
    """Check if caching is enabled and available."""
    return settings.redis_enabled and get_redis_client() is not None

