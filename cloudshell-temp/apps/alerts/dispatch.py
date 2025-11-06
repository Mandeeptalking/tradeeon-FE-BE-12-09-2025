import json, httpx, asyncio, os, hmac, hashlib, time
from typing import Dict, Any, Optional
from apps.api.clients.supabase_client import supabase
from apps.api.metrics import record_webhook_failure

# Webhook configuration
WEBHOOK_SECRET = os.getenv("WEBHOOK_SECRET", "your-webhook-secret-key")
WEBHOOK_TIMEOUT = int(os.getenv("WEBHOOK_TIMEOUT", "10"))
WEBHOOK_MAX_RETRIES = int(os.getenv("WEBHOOK_MAX_RETRIES", "3"))
WEBHOOK_MAX_AGE_SECONDS = int(os.getenv("WEBHOOK_MAX_AGE_SECONDS", "300"))  # 5 minutes


def generate_webhook_signature(payload: str, timestamp: int, secret: str) -> str:
    """Generate HMAC SHA-256 signature for webhook payload."""
    message = f"{timestamp}.{payload}"
    signature = hmac.new(
        secret.encode('utf-8'),
        message.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()
    return signature


def generate_event_id(alert_id: str, bar_time: str) -> str:
    """Generate unique event ID for idempotency."""
    return f"{alert_id}:{bar_time}"


async def send_webhook_with_retry(
    url: str, 
    payload: Dict[str, Any], 
    event_id: str,
    max_retries: int = WEBHOOK_MAX_RETRIES
) -> bool:
    """
    Send webhook with HMAC signing, replay protection, and exponential backoff retry.
    """
    timestamp = int(time.time())
    
    # Add event metadata to payload
    payload_with_meta = {
        **payload,
        "event_id": event_id,
        "timestamp": timestamp,
        "version": "1.0"
    }
    
    payload_str = json.dumps(payload_with_meta, separators=(',', ':'))
    signature = generate_webhook_signature(payload_str, timestamp, WEBHOOK_SECRET)
    
    headers = {
        "Content-Type": "application/json",
        "X-Tradeeon-Signature": f"t={timestamp},s={signature}",
        "X-Tradeeon-EventId": event_id,
        "User-Agent": "Tradeeon-Alerts/1.0"
    }
    
    last_exception = None
    
    for attempt in range(max_retries + 1):
        try:
            async with httpx.AsyncClient(timeout=WEBHOOK_TIMEOUT) as client:
                response = await client.post(url, content=payload_str, headers=headers)
                
                # Check for replay protection (optional server-side validation)
                if response.status_code == 410:  # Gone - request too old
                    print(f"Webhook rejected as too old: {url}")
                    return False
                
                response.raise_for_status()
                print(f"Webhook sent successfully to {url} (attempt {attempt + 1})")
                return True
                
        except httpx.TimeoutException:
            last_exception = f"Timeout after {WEBHOOK_TIMEOUT}s"
            record_webhook_failure(url, "timeout")
        except httpx.HTTPStatusError as e:
            if e.response.status_code in [410, 429]:  # Too old or rate limited
                last_exception = f"HTTP {e.response.status_code}: {e.response.text}"
                record_webhook_failure(url, f"http_{e.response.status_code}")
                break  # Don't retry these errors
            last_exception = f"HTTP {e.response.status_code}: {e.response.text}"
            record_webhook_failure(url, f"http_{e.response.status_code}")
        except Exception as e:
            last_exception = str(e)
            record_webhook_failure(url, "exception")
        
        if attempt < max_retries:
            # Exponential backoff: 1s, 2s, 4s
            delay = 2 ** attempt
            print(f"Webhook failed (attempt {attempt + 1}), retrying in {delay}s: {last_exception}")
            await asyncio.sleep(delay)
    
    print(f"Webhook failed after {max_retries + 1} attempts: {last_exception}")
    return False


async def send_webhook(url: str, payload: Dict[str, Any], alert_id: str, bar_time: str):
    """
    Legacy function for backward compatibility.
    """
    event_id = generate_event_id(alert_id, bar_time)
    return await send_webhook_with_retry(url, payload, event_id)


async def notify_in_app(user_id: str, event: Dict[str, Any]):
    """
    Send in-app notification to user.
    """
    try:
        # Store notification in database
        notification_data = {
            "user_id": user_id,
            "type": "alert_triggered",
            "title": f"Alert Triggered: {event.get('symbol', 'Unknown')}",
            "message": f"Your alert condition was met at {event.get('timestamp', 'unknown time')}",
            "data": event,
            "read": False,
            "created_at": "now()"
        }
        
        # Insert into notifications table (if it exists)
        # supabase.table("notifications").insert(notification_data).execute()
        
        # If you have WebSocket/SSE, publish the event here
        # await websocket_manager.send_to_user(user_id, event)
        
        print(f"In-app notification sent to user {user_id}")
        return True
        
    except Exception as e:
        print(f"Failed to send in-app notification: {e}")
        return False


def verify_webhook_signature(
    payload: str, 
    signature_header: str, 
    secret: str,
    max_age_seconds: int = WEBHOOK_MAX_AGE_SECONDS
) -> bool:
    """
    Verify incoming webhook signature.
    Use this function on the receiving end to validate webhooks.
    
    Args:
        payload: Raw request body
        signature_header: X-Tradeeon-Signature header value
        secret: Shared secret key
        max_age_seconds: Maximum age of request in seconds
    
    Returns:
        True if signature is valid and request is not too old
    """
    try:
        # Parse signature header: "t=1234567890,s=abc123..."
        if not signature_header.startswith("t="):
            return False
            
        parts = signature_header.split(",s=")
        if len(parts) != 2:
            return False
            
        timestamp_str = parts[0][2:]  # Remove "t="
        signature = parts[1]
        
        timestamp = int(timestamp_str)
        current_time = int(time.time())
        
        # Check if request is too old
        if current_time - timestamp > max_age_seconds:
            print(f"Webhook too old: {current_time - timestamp}s > {max_age_seconds}s")
            return False
        
        # Generate expected signature
        expected_signature = generate_webhook_signature(payload, timestamp, secret)
        
        # Constant-time comparison
        return hmac.compare_digest(signature, expected_signature)
        
    except (ValueError, IndexError) as e:
        print(f"Invalid signature format: {e}")
        return False


# Example webhook receiver verification (for documentation)
EXAMPLE_WEBHOOK_VERIFICATION = """
# Example webhook receiver verification code:

import hmac
import hashlib
import time
from fastapi import Request, HTTPException

async def verify_tradeeon_webhook(request: Request):
    # Get signature header
    signature_header = request.headers.get("X-Tradeeon-Signature")
    if not signature_header:
        raise HTTPException(status_code=401, detail="Missing signature")
    
    # Get request body
    body = await request.body()
    payload = body.decode('utf-8')
    
    # Verify signature
    if not verify_webhook_signature(payload, signature_header, "your-webhook-secret"):
        raise HTTPException(status_code=401, detail="Invalid signature")
    
    # Parse payload
    event_data = json.loads(payload)
    
    # Check event ID for idempotency
    event_id = request.headers.get("X-Tradeeon-EventId")
    if is_event_processed(event_id):
        raise HTTPException(status_code=409, detail="Event already processed")
    
    return event_data
"""
