# Exchange Connection - Quick Reference

## 🎯 What You Need - At a Glance

### ✅ Frontend (Already Implemented)
- Connections page
- Connect exchange drawer (4-step wizard)
- Rotate keys modal
- Revoke connection modal
- API integration

### ✅ Backend (Already Implemented)
- All CRUD endpoints
- Encryption/decryption
- Binance client
- Authentication & authorization

### ✅ Database (Already Configured)
- `users` table
- `exchange_keys` table
- RLS policies
- Encryption support

### ⚠️ AWS (Needs Setup)
- **NAT Gateway** - CRITICAL for IP whitelisting
- Static IP for backend
- Secrets Manager (recommended)

---

## 🔑 Critical AWS Setup

### NAT Gateway (REQUIRED)

**Why:** Exchange APIs require IP whitelisting. ECS tasks need static IP.

**Steps:**
1. Create Elastic IP
2. Create NAT Gateway in public subnet
3. Associate Elastic IP
4. Update route table (private subnet → NAT Gateway)
5. Get NAT Gateway IP
6. Whitelist IP on exchanges

**Cost:** ~$32/month

**Command:**
```bash
# Get NAT Gateway IP
aws ec2 describe-addresses \
  --region us-east-1 \
  --filters "Name=tag:Name,Values=tradeeon-nat-eip" \
  --query "Addresses[0].PublicIp" \
  --output text
```

---

## 📋 Environment Variables Checklist

### Backend (ECS Task Definition)
```bash
# Supabase
SUPABASE_URL=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx
SUPABASE_JWT_SECRET=xxx

# Encryption (CRITICAL)
ENCRYPTION_KEY=<fernet-key-base64>

# CORS
CORS_ORIGINS=https://your-domain.com

# Optional
BINANCE_BASE_URL=https://api.binance.com
```

### Frontend (Build-time)
```bash
VITE_SUPABASE_URL=xxx
VITE_SUPABASE_ANON_KEY=xxx
VITE_API_URL=https://api.your-domain.com
```

---

## 🔐 Security Checklist

- [x] API keys encrypted at rest (Fernet)
- [x] HTTPS/TLS in transit
- [x] JWT authentication
- [x] Row Level Security (RLS)
- [x] CORS configured
- [ ] NAT Gateway for static IP
- [ ] IP whitelisting on exchanges
- [ ] Audit logging (future)

---

## 🚀 User Flow Summary

1. User enters API credentials in UI
2. Frontend sends to `/connections` endpoint
3. Backend encrypts keys (Fernet)
4. Backend stores in `exchange_keys` table
5. User can test connection
6. Connection ready for trading
7. Backend decrypts keys when needed
8. Backend makes API calls via NAT Gateway (static IP)

---

## 📊 Database Schema

**exchange_keys table:**
- `id` (UUID, PK)
- `user_id` (UUID, FK to users)
- `exchange` (TEXT: binance, coinbase, kraken, zerodha)
- `api_key_encrypted` (TEXT, Fernet encrypted)
- `api_secret_encrypted` (TEXT, Fernet encrypted)
- `passphrase_encrypted` (TEXT, optional)
- `is_active` (BOOLEAN)
- `permissions` (JSONB)
- `created_at`, `updated_at` (TIMESTAMP)

**Unique constraint:** (user_id, exchange)

---

## 🌐 Network Flow

```
User Browser
    ↓ HTTPS
CloudFront (Frontend)
    ↓ HTTPS
ALB (Load Balancer)
    ↓ HTTP (internal)
ECS Fargate (Backend)
    ↓ HTTPS (via NAT Gateway)
Exchange APIs (Binance, etc.)
```

**Key Point:** All outbound traffic from ECS goes through NAT Gateway, which has a static IP that must be whitelisted on exchanges.

---

## ⚡ Quick Commands

### Get Backend IP (for whitelisting)
```bash
# If NAT Gateway exists
aws ec2 describe-addresses \
  --region us-east-1 \
  --filters "Name=tag:Name,Values=tradeeon-nat-eip" \
  --query "Addresses[0].PublicIp" \
  --output text
```

### Test Connection (from backend)
```bash
curl -X POST https://api.your-domain.com/connections/test \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "exchange": "BINANCE",
    "api_key": "test_key",
    "api_secret": "test_secret"
  }'
```

### Check Database Connections
```sql
-- In Supabase SQL Editor
SELECT 
  id,
  exchange,
  is_active,
  created_at,
  updated_at
FROM exchange_keys
WHERE user_id = '<user-id>'
ORDER BY created_at DESC;
```

---

## 🎯 Next Steps

1. **Setup NAT Gateway** (if not exists)
2. **Get NAT Gateway IP**
3. **Update user documentation** with IP whitelisting steps
4. **Test connection flow** end-to-end
5. **Monitor connection health**
6. **Implement audit logging** (future)

---

## 📞 Support

If users have connection issues:
1. Check if IP is whitelisted on exchange
2. Verify API key permissions
3. Check backend logs
4. Test connection manually
5. Verify encryption key is set

