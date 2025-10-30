# Webhook Security Guide

## Overview

Tradeeon webhooks are signed with HMAC SHA-256 and include replay protection to ensure security and reliability.

## Security Features

### 1. HMAC Signature
- All webhooks are signed with HMAC SHA-256 using a shared secret
- Signature format: `X-Tradeeon-Signature: t=<timestamp>,s=<hmac_hex>`
- Timestamp prevents replay attacks (requests older than 5 minutes are rejected)

### 2. Idempotency
- Each webhook includes a unique event ID: `X-Tradeeon-EventId: <alert_id>:<bar_time>`
- Receivers should track processed event IDs to prevent duplicate processing

### 3. Retry Logic
- Failed webhooks are retried with exponential backoff (1s, 2s, 4s delays)
- Maximum 3 retry attempts
- Timeout after 10 seconds per attempt

## Webhook Payload Format

```json
{
  "alert_id": "uuid",
  "symbol": "BTCUSDT",
  "timeframe": "1h",
  "triggered_at": "2025-01-18T10:00:00Z",
  "conditions": [...],
  "market_data": {
    "price": 50000,
    "volume": 1000000,
    "indicators": {
      "RSI": 25.5
    }
  },
  "event_id": "alert_id:bar_time",
  "timestamp": 1642514400,
  "version": "1.0"
}
```

## Verification Example

### Python (FastAPI)

```python
import hmac
import hashlib
import time
import json
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

def verify_webhook_signature(payload: str, signature_header: str, secret: str) -> bool:
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
        
        # Check if request is too old (5 minutes)
        if current_time - timestamp > 300:
            return False
        
        # Generate expected signature
        message = f"{timestamp}.{payload}"
        expected_signature = hmac.new(
            secret.encode('utf-8'),
            message.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
        
        # Constant-time comparison
        return hmac.compare_digest(signature, expected_signature)
        
    except (ValueError, IndexError):
        return False
```

### Node.js (Express)

```javascript
const crypto = require('crypto');

function verifyWebhookSignature(payload, signatureHeader, secret) {
    try {
        // Parse signature header: "t=1234567890,s=abc123..."
        if (!signatureHeader.startsWith("t=")) {
            return false;
        }
        
        const parts = signatureHeader.split(",s=");
        if (parts.length !== 2) {
            return false;
        }
        
        const timestampStr = parts[0].substring(2); // Remove "t="
        const signature = parts[1];
        
        const timestamp = parseInt(timestampStr);
        const currentTime = Math.floor(Date.now() / 1000);
        
        // Check if request is too old (5 minutes)
        if (currentTime - timestamp > 300) {
            return false;
        }
        
        // Generate expected signature
        const message = `${timestamp}.${payload}`;
        const expectedSignature = crypto
            .createHmac('sha256', secret)
            .update(message)
            .digest('hex');
        
        // Constant-time comparison
        return crypto.timingSafeEqual(
            Buffer.from(signature, 'hex'),
            Buffer.from(expectedSignature, 'hex')
        );
        
    } catch (error) {
        return false;
    }
}

// Express middleware
app.post('/webhook', express.raw({type: 'application/json'}), (req, res) => {
    const signature = req.headers['x-tradeeon-signature'];
    const eventId = req.headers['x-tradeeon-eventid'];
    
    if (!verifyWebhookSignature(req.body.toString(), signature, process.env.WEBHOOK_SECRET)) {
        return res.status(401).json({error: 'Invalid signature'});
    }
    
    const event = JSON.parse(req.body.toString());
    
    // Process event...
    res.json({received: true});
});
```

## Environment Variables

```env
WEBHOOK_SECRET=your-secret-key-here
WEBHOOK_TIMEOUT=10
WEBHOOK_MAX_RETRIES=3
WEBHOOK_MAX_AGE_SECONDS=300
```

## Testing

Use webhook.site or ngrok to test webhook delivery:

```bash
# Test webhook endpoint
curl -X POST https://webhook.site/your-unique-url \
  -H "Content-Type: application/json" \
  -H "X-Tradeeon-Signature: t=1642514400,s=abc123..." \
  -H "X-Tradeeon-EventId: alert-123:2025-01-18T10:00:00Z" \
  -d '{"test": "payload"}'
```

## Security Best Practices

1. **Use HTTPS**: Always use HTTPS endpoints for webhooks
2. **Validate Timestamps**: Reject requests older than 5 minutes
3. **Store Event IDs**: Track processed event IDs to prevent duplicates
4. **Rate Limiting**: Implement rate limiting on your webhook endpoints
5. **Secret Rotation**: Regularly rotate your webhook secret
6. **Monitor Logs**: Monitor webhook delivery and failure logs



