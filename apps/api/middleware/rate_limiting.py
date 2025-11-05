"""
Rate limiting middleware for FastAPI.
Implements token bucket algorithm for rate limiting.
"""

import time
import asyncio
from typing import Dict, Optional
from collections import defaultdict, deque
from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
import os
import time
from apps.api.metrics import record_api_request

# Configuration
MAX_REQUESTS_PER_MINUTE = int(os.getenv("RATE_LIMIT_PER_MINUTE", "60"))
MAX_WRITES_PER_MINUTE = int(os.getenv("RATE_LIMIT_WRITES_PER_MINUTE", "10"))
MAX_ACTIVE_ALERTS = int(os.getenv("MAX_ACTIVE_ALERTS", "50"))

# In-memory rate limiting (in production, use Redis)
request_buckets: Dict[str, deque] = defaultdict(lambda: deque())
write_buckets: Dict[str, deque] = defaultdict(lambda: deque())
active_alerts_count: Dict[str, int] = defaultdict(int)

class RateLimiter:
    """Token bucket rate limiter."""
    
    def __init__(self, max_requests: int, window_seconds: int = 60):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
    
    def is_allowed(self, key: str, buckets: Dict[str, deque]) -> bool:
        """Check if request is allowed based on token bucket algorithm."""
        now = time.time()
        bucket = buckets[key]
        
        # Remove old requests outside the window
        while bucket and bucket[0] <= now - self.window_seconds:
            bucket.popleft()
        
        # Check if we're within the limit
        if len(bucket) >= self.max_requests:
            return False
        
        # Add current request
        bucket.append(now)
        return True
    
    def get_reset_time(self, key: str, buckets: Dict[str, deque]) -> float:
        """Get when the rate limit will reset."""
        bucket = buckets[key]
        if not bucket:
            return time.time()
        
        oldest_request = bucket[0]
        return oldest_request + self.window_seconds

# Rate limiters
read_limiter = RateLimiter(MAX_REQUESTS_PER_MINUTE)
write_limiter = RateLimiter(MAX_WRITES_PER_MINUTE)

def get_client_ip(request: Request) -> str:
    """Extract client IP address."""
    # Check for forwarded headers (proxy/load balancer)
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    
    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip
    
    # Fallback to direct connection
    if hasattr(request.client, "host"):
        return request.client.host
    
    return "unknown"

def get_user_id(request: Request) -> Optional[str]:
    """Extract user ID from JWT token."""
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return None
    
    try:
        import jwt
        token = auth_header.split(" ", 1)[1]
        # Decode without verification to get user_id (for rate limiting purposes)
        payload = jwt.decode(token, options={"verify_signature": False})
        return payload.get("sub") or payload.get("user_id")
    except:
        return None

async def rate_limit_middleware(request: Request, call_next):
    """Rate limiting middleware."""
    start_time = time.time()
    client_ip = get_client_ip(request)
    user_id = get_user_id(request)
    
    # Determine if this is a write operation
    is_write = request.method in ["POST", "PUT", "PATCH", "DELETE"]
    
    # Apply rate limiting
    if is_write:
        # Write rate limiting (more restrictive)
        if user_id:
            # Per-user write rate limiting
            if not write_limiter.is_allowed(f"user:{user_id}", write_buckets):
                reset_time = write_limiter.get_reset_time(f"user:{user_id}", write_buckets)
                return JSONResponse(
                    status_code=429,
                    content={
                        "error": "Rate limit exceeded",
                        "message": f"Too many write requests. Limit: {MAX_WRITES_PER_MINUTE} per minute.",
                        "retry_after": int(reset_time - time.time())
                    },
                    headers={"Retry-After": str(int(reset_time - time.time()))}
                )
        else:
            # IP-based write rate limiting for unauthenticated requests
            if not write_limiter.is_allowed(f"ip:{client_ip}", write_buckets):
                reset_time = write_limiter.get_reset_time(f"ip:{client_ip}", write_buckets)
                return JSONResponse(
                    status_code=429,
                    content={
                        "error": "Rate limit exceeded",
                        "message": "Too many write requests from this IP.",
                        "retry_after": int(reset_time - time.time())
                    },
                    headers={"Retry-After": str(int(reset_time - time.time()))}
                )
    else:
        # Read rate limiting (less restrictive)
        rate_key = f"user:{user_id}" if user_id else f"ip:{client_ip}"
        if not read_limiter.is_allowed(rate_key, request_buckets):
            reset_time = read_limiter.get_reset_time(rate_key, request_buckets)
            return JSONResponse(
                status_code=429,
                content={
                    "error": "Rate limit exceeded",
                    "message": f"Too many requests. Limit: {MAX_REQUESTS_PER_MINUTE} per minute.",
                    "retry_after": int(reset_time - time.time())
                },
                headers={"Retry-After": str(int(reset_time - time.time()))}
            )
    
    # Process request
    response = await call_next(request)
    
    # Record API metrics
    duration = time.time() - start_time
    endpoint = f"{request.method} {request.url.path}"
    record_api_request(request.method, endpoint, response.status_code, duration)
    
    # Add rate limit headers to response
    if user_id:
        read_key = f"user:{user_id}"
        write_key = f"user:{user_id}"
    else:
        read_key = f"ip:{client_ip}"
        write_key = f"ip:{client_ip}"
    
    read_remaining = MAX_REQUESTS_PER_MINUTE - len(request_buckets[read_key])
    write_remaining = MAX_WRITES_PER_MINUTE - len(write_buckets[write_key])
    
    response.headers["X-RateLimit-Limit-Read"] = str(MAX_REQUESTS_PER_MINUTE)
    response.headers["X-RateLimit-Remaining-Read"] = str(max(0, read_remaining))
    response.headers["X-RateLimit-Limit-Write"] = str(MAX_WRITES_PER_MINUTE)
    response.headers["X-RateLimit-Remaining-Write"] = str(max(0, write_remaining))
    
    return response

def check_alert_quota(user_id: str) -> bool:
    """Check if user can create more alerts."""
    return active_alerts_count.get(user_id, 0) < MAX_ACTIVE_ALERTS

def increment_alert_count(user_id: str):
    """Increment user's alert count."""
    active_alerts_count[user_id] = active_alerts_count.get(user_id, 0) + 1

def decrement_alert_count(user_id: str):
    """Decrement user's alert count."""
    current_count = active_alerts_count.get(user_id, 0)
    if current_count > 0:
        active_alerts_count[user_id] = current_count - 1

def get_alert_quota_info(user_id: str) -> Dict[str, int]:
    """Get user's alert quota information."""
    current_count = active_alerts_count.get(user_id, 0)
    return {
        "current": current_count,
        "limit": MAX_ACTIVE_ALERTS,
        "remaining": MAX_ACTIVE_ALERTS - current_count
    }

# Cleanup old entries periodically
async def cleanup_rate_limits():
    """Clean up old rate limit entries."""
    while True:
        await asyncio.sleep(300)  # Run every 5 minutes
        
        now = time.time()
        
        # Clean up old request entries
        for key in list(request_buckets.keys()):
            bucket = request_buckets[key]
            while bucket and bucket[0] <= now - 60:  # 1 minute window
                bucket.popleft()
            if not bucket:
                del request_buckets[key]
        
        # Clean up old write entries
        for key in list(write_buckets.keys()):
            bucket = write_buckets[key]
            while bucket and bucket[0] <= now - 60:  # 1 minute window
                bucket.popleft()
            if not bucket:
                del write_buckets[key]
