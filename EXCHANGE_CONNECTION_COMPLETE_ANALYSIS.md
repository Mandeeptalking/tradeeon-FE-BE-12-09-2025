# Exchange Connection System - Complete Analysis

## 📋 Executive Summary

This document provides a comprehensive analysis of how users connect their exchanges through the Tradeeon portal, covering Frontend, Backend, Database, and AWS infrastructure requirements.

---

## 🔄 User Connection Flow

### Step-by-Step User Journey

```
1. User Signs In
   ↓
2. Navigates to Connections Page
   ↓
3. Clicks "Connect Exchange"
   ↓
4. Selects Exchange (Binance, Coinbase, Kraken, Zerodha)
   ↓
5. Enters API Credentials (API Key, Secret, Passphrase if needed)
   ↓
6. Tests Connection (Optional but Recommended)
   ↓
7. Reviews & Confirms
   ↓
8. Connection Saved (Encrypted & Stored in Database)
   ↓
9. Connection Active & Ready for Trading
```

---

## 🎨 Frontend Requirements

### Components Needed

#### 1. **Connections Page** (`apps/frontend/src/pages/app/ConnectionsTest.tsx`)
- ✅ **Status:** Implemented
- **Features:**
  - List all user connections
  - Show connection status (connected, degraded, error)
  - Display last check time
  - Show features enabled (trading, wallet, paper)
  - Actions: Edit, Rotate Keys, Revoke

#### 2. **Connect Exchange Drawer** (`apps/frontend/src/components/connections/ConnectExchangeDrawer.tsx`)
- ✅ **Status:** Implemented
- **Features:**
  - Multi-step wizard (4 steps)
  - Exchange selection
  - API credentials input (with show/hide)
  - Connection testing
  - Review & confirm
  - Validation & error handling

#### 3. **Rotate Keys Modal** (`apps/frontend/src/components/connections/RotateKeysModal.tsx`)
- ✅ **Status:** Implemented
- **Features:**
  - Update API keys without deleting connection
  - Test new keys before saving
  - Validation

#### 4. **Revoke Connection Modal** (`apps/frontend/src/components/connections/RevokeModal.tsx`)
- ✅ **Status:** Implemented
- **Features:**
  - Confirm before revoking
  - Soft delete (sets is_active = false)

#### 5. **Security Panel** (`apps/frontend/src/components/connections/SecurityPanel.tsx`)
- ✅ **Status:** Implemented
- **Features:**
  - Show security best practices
  - Display connection audit logs
  - Security recommendations

#### 6. **Exchange Card** (`apps/frontend/src/components/connections/ExchangeCard.tsx`)
- ✅ **Status:** Implemented
- **Features:**
  - Visual representation of exchange
  - Status indicators
  - Quick actions

### API Integration (`apps/frontend/src/lib/api/connections.ts`)

**Endpoints Used:**
- `GET /connections` - List all connections
- `POST /connections` - Create/update connection
- `POST /connections/test` - Test connection
- `POST /connections/{id}/rotate` - Rotate keys
- `DELETE /connections/{id}` - Revoke connection
- `GET /connections/audit` - Get audit logs

**Authentication:**
- Uses `authenticatedFetch` from `apps/frontend/src/lib/api/auth.ts`
- Automatically includes JWT token from Supabase session
- Handles token refresh

**Error Handling:**
- Graceful fallback to mock data if API unavailable
- User-friendly error messages
- Retry logic for failed requests

### State Management

**No Global State Needed:**
- Each component manages its own state
- Uses React hooks (useState, useEffect)
- API calls are made directly from components

**Optional Enhancement:**
- Could add Zustand store for connection state
- Would enable real-time updates across components
- Currently not implemented (works fine without it)

---

## 🔧 Backend Requirements

### API Endpoints (`apps/api/routers/connections.py`)

#### 1. **GET /connections**
- **Purpose:** List all user's connections
- **Auth:** Required (JWT token)
- **Response:** Array of Connection objects
- **Database:** Reads from `exchange_keys` table
- **Security:** Row Level Security (RLS) ensures user only sees their own connections

#### 2. **POST /connections**
- **Purpose:** Create or update connection
- **Auth:** Required (JWT token)
- **Request Body:**
  ```json
  {
    "exchange": "BINANCE",
    "api_key": "user_api_key",
    "api_secret": "user_api_secret",
    "passphrase": "optional_passphrase",
    "nickname": "optional_nickname"
  }
  ```
- **Process:**
  1. Validate user authentication
  2. Ensure user profile exists in `users` table
  3. Encrypt API keys using Fernet encryption
  4. Check if connection exists (by user_id + exchange)
  5. Insert or update in `exchange_keys` table
  6. Return connection object (without decrypted keys)

#### 3. **POST /connections/test**
- **Purpose:** Test connection with exchange API
- **Auth:** Required (JWT token)
- **Request Body:** Same as POST /connections
- **Process:**
  1. Create temporary authenticated client
  2. Make test API call to exchange
  3. Return test result (ok, code, message, latency_ms)
- **Supported Exchanges:**
  - ✅ Binance (fully implemented)
  - ⚠️ Coinbase, Kraken, Zerodha (not yet implemented)

#### 4. **POST /connections/{connection_id}/rotate**
- **Purpose:** Update API keys for existing connection
- **Auth:** Required (JWT token)
- **Request Body:**
  ```json
  {
    "api_key": "new_api_key",
    "api_secret": "new_api_secret",
    "passphrase": "optional_new_passphrase"
  }
  ```
- **Process:**
  1. Verify connection belongs to user
  2. Encrypt new keys
  3. Update in database
  4. Return updated connection

#### 5. **DELETE /connections/{connection_id}**
- **Purpose:** Revoke/delete connection
- **Auth:** Required (JWT token)
- **Process:**
  1. Verify connection belongs to user
  2. Soft delete (set `is_active = false`)
  3. Return success message

#### 6. **GET /connections/audit**
- **Purpose:** Get audit log for connections
- **Auth:** Required (JWT token)
- **Status:** ⚠️ Not fully implemented (returns empty array)
- **Future:** Should create `connection_audit_log` table

### Encryption (`apps/api/utils/encryption.py`)

**Algorithm:** Fernet (symmetric encryption)
- Uses AES-128 in CBC mode
- HMAC for authentication
- Base64 URL-safe encoding

**Key Management:**
- Key stored in environment variable: `ENCRYPTION_KEY`
- Must be valid Fernet key (32-byte base64 URL-safe)
- Generated using: `Fernet.generate_key()`
- **Critical:** Key must be kept secret and backed up

**Encryption Process:**
1. Get encryption key from environment
2. Create Fernet cipher with key
3. Encrypt value (API key, secret, passphrase)
4. Base64 encode encrypted bytes
5. Store in database as TEXT

**Decryption Process:**
1. Get encryption key from environment
2. Base64 decode encrypted value
3. Decrypt using Fernet
4. Return plaintext

**Security Notes:**
- Keys are NEVER returned to frontend
- Decryption only happens server-side
- Keys are decrypted only when needed (for API calls)
- Keys are never logged

### Exchange Client (`apps/api/binance_authenticated_client.py`)

**BinanceAuthenticatedClient:**
- Handles authenticated requests to Binance API
- Generates HMAC SHA256 signatures
- Adds timestamp to requests
- Handles rate limiting
- Supports testnet mode

**Methods:**
- `test_connection()` - Test API credentials
- `get_account_info()` - Get account details
- `get_balance()` - Get account balance
- `place_order()` - Place trading order
- `get_order_status()` - Check order status

**Other Exchanges:**
- ⚠️ Coinbase client: Not implemented
- ⚠️ Kraken client: Not implemented
- ⚠️ Zerodha client: Not implemented (OAuth flow needed)

---

## 🗄️ Database Requirements

### Tables

#### 1. **users** (`public.users`)
```sql
CREATE TABLE public.users (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    timezone TEXT DEFAULT 'UTC',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Purpose:**
- Extends Supabase auth.users
- Stores user profile information
- Referenced by exchange_keys

**RLS Policy:**
- Users can only view/update their own profile

#### 2. **exchange_keys** (`public.exchange_keys`)
```sql
CREATE TABLE public.exchange_keys (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    exchange TEXT NOT NULL CHECK (exchange IN ('binance', 'zerodha', 'coinbase', 'kraken')),
    api_key_encrypted TEXT NOT NULL,
    api_secret_encrypted TEXT NOT NULL,
    passphrase_encrypted TEXT,
    is_active BOOLEAN DEFAULT true,
    permissions JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, exchange)
);
```

**Purpose:**
- Stores encrypted exchange API credentials
- One connection per user per exchange
- Soft delete support (is_active flag)

**Fields:**
- `api_key_encrypted`: Encrypted API key (Fernet)
- `api_secret_encrypted`: Encrypted API secret (Fernet)
- `passphrase_encrypted`: Encrypted passphrase (for Coinbase/Kraken)
- `permissions`: JSON object with trading/wallet/paper flags
- `is_active`: Soft delete flag

**RLS Policy:**
- Users can only access their own connections
- Enforced by Supabase Row Level Security

**Indexes:**
- Primary key on `id`
- Unique constraint on `(user_id, exchange)`
- Foreign key on `user_id`

### Future Tables (Recommended)

#### 3. **connection_audit_log** (Not Yet Implemented)
```sql
CREATE TABLE public.connection_audit_log (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    connection_id UUID REFERENCES public.exchange_keys(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    action TEXT NOT NULL, -- 'connected', 'tested', 'rotated', 'revoked'
    ip_address INET,
    user_agent TEXT,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Purpose:**
- Track all connection-related actions
- Security audit trail
- Compliance logging

---

## ☁️ AWS Infrastructure Requirements

### Current Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    User Browser                             │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        │ HTTPS
                        ▼
┌─────────────────────────────────────────────────────────────┐
│              CloudFront CDN (Frontend)                      │
│  • S3 bucket origin                                          │
│  • SPA routing support                                       │
│  • SSL/TLS termination                                      │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        │ API Calls
                        ▼
┌─────────────────────────────────────────────────────────────┐
│         Application Load Balancer (ALB)                      │
│  • Health checks                                             │
│  • SSL/TLS termination                                       │
│  • Request routing                                           │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│              ECS Fargate (Backend API)                       │
│  • FastAPI application                                        │
│  • Containerized service                                     │
│  • Auto-scaling                                              │
└───────────────────────┬─────────────────────────────────────┘
                        │
        ┌───────────────┴───────────────┐
        │                               │
        ▼                               ▼
┌───────────────────┐          ┌───────────────────┐
│   Supabase        │          │  Exchange APIs     │
│  • Database       │          │  • Binance         │
│  • Auth           │          │  • Coinbase        │
│  • RLS            │          │  • Kraken          │
└───────────────────┘          └───────────────────┘
```

### Required AWS Services

#### 1. **ECS (Elastic Container Service)**
- **Purpose:** Run FastAPI backend
- **Type:** Fargate (serverless containers)
- **Requirements:**
  - Container image with FastAPI app
  - Task definition with environment variables
  - Service definition for auto-scaling
  - Health check endpoint (`/health`)

**Environment Variables Needed:**
```bash
# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxx
SUPABASE_JWT_SECRET=xxx

# Encryption
ENCRYPTION_KEY=<fernet-key-base64>

# API Configuration
CORS_ORIGINS=https://your-domain.com
API_HOST=0.0.0.0
API_PORT=8000

# Exchange APIs (optional)
BINANCE_BASE_URL=https://api.binance.com
```

#### 2. **Application Load Balancer (ALB)**
- **Purpose:** Route traffic to ECS tasks
- **Requirements:**
  - HTTPS listener (port 443)
  - HTTP to HTTPS redirect
  - SSL certificate (ACM)
  - Health check path: `/health`
  - Target group pointing to ECS service

**Security Groups:**
- Inbound: 443 (HTTPS) from CloudFront/Internet
- Outbound: All traffic

#### 3. **CloudFront (CDN)**
- **Purpose:** Serve frontend static files
- **Requirements:**
  - S3 bucket as origin
  - SPA routing support (404 → index.html)
  - SSL certificate
  - Custom domain support
  - Cache invalidation on deploy

#### 4. **S3 Bucket**
- **Purpose:** Store frontend static files
- **Requirements:**
  - Static website hosting enabled
  - Public read access
  - CORS configuration
  - Versioning (optional)

#### 5. **VPC (Virtual Private Cloud)**
- **Purpose:** Network isolation
- **Requirements:**
  - Public subnets (for ALB)
  - Private subnets (for ECS tasks)
  - Internet Gateway (for public subnets)
  - NAT Gateway (for private subnet outbound) ⚠️ **CRITICAL FOR IP WHITELISTING**

#### 6. **NAT Gateway** ⚠️ **CRITICAL**
- **Purpose:** Provide static IP for outbound connections
- **Why Needed:**
  - Exchange APIs require IP whitelisting
  - ECS tasks in private subnet need outbound internet
  - NAT Gateway provides static Elastic IP
  - All outbound traffic appears from this IP

**Setup:**
1. Create Elastic IP
2. Create NAT Gateway in public subnet
3. Associate Elastic IP with NAT Gateway
4. Update route table (private subnet → NAT Gateway)
5. **Whitelist NAT Gateway IP on exchanges**

**Cost:** ~$32/month + data transfer

#### 7. **Secrets Manager / Parameter Store** (Recommended)
- **Purpose:** Store sensitive environment variables
- **Why:**
  - Encryption key should not be in code
  - JWT secrets should be secure
  - API keys should be encrypted at rest
- **Alternative:** Use ECS task definition secrets (encrypted)

#### 8. **CloudWatch**
- **Purpose:** Monitoring and logging
- **Requirements:**
  - Log groups for ECS tasks
  - Metrics for API requests
  - Alarms for errors
  - Dashboard for monitoring

### Network Security

#### Security Groups

**ALB Security Group:**
```
Inbound:
  - Port 443 (HTTPS) from CloudFront/Internet
  - Port 80 (HTTP) from CloudFront/Internet (redirect to 443)

Outbound:
  - All traffic to ECS tasks (port 8000)
```

**ECS Security Group:**
```
Inbound:
  - Port 8000 from ALB security group only

Outbound:
  - Port 443 (HTTPS) to Supabase
  - Port 443 (HTTPS) to Exchange APIs (Binance, Coinbase, etc.)
  - Port 443 (HTTPS) to Internet (via NAT Gateway)
```

#### IP Whitelisting Requirements

**Problem:**
- Exchanges require IP whitelisting for API keys
- ECS tasks get dynamic IPs (change on restart)
- Need static IP for whitelisting

**Solution:**
1. **Setup NAT Gateway** (recommended)
   - Provides static Elastic IP
   - All ECS outbound traffic uses this IP
   - Whitelist this IP on exchanges
   - Cost: ~$32/month

2. **Alternative: Use ALB IPs** (not recommended)
   - ALB IPs can change
   - Less reliable
   - Multiple IPs to whitelist

**Exchange IP Whitelist Setup:**
1. Get NAT Gateway Elastic IP
2. Go to exchange API settings
3. Enable "Restrict access to trusted IPs only"
4. Add NAT Gateway IP address
5. Save and test

---

## 🔐 Security Requirements

### Encryption

**At Rest (Database):**
- API keys encrypted using Fernet before storage
- Encryption key stored in environment variable
- Never stored in plaintext

**In Transit:**
- HTTPS/TLS for all API calls
- Frontend → Backend: HTTPS
- Backend → Supabase: HTTPS
- Backend → Exchange APIs: HTTPS

**Key Management:**
- `ENCRYPTION_KEY` must be:
  - Valid Fernet key (32-byte base64 URL-safe)
  - Stored in AWS Secrets Manager or ECS secrets
  - Never committed to code
  - Backed up securely
  - Rotated periodically

### Authentication

**User Authentication:**
- Supabase Auth (JWT tokens)
- Tokens in Authorization header
- Token validation on every request
- Automatic token refresh

**API Key Security:**
- Keys never returned to frontend
- Keys decrypted only when needed
- Keys never logged
- Keys encrypted in database

### Access Control

**Row Level Security (RLS):**
- Supabase enforces RLS policies
- Users can only access their own connections
- Database-level security (not just application-level)

**API Authorization:**
- JWT token required for all endpoints
- User ID extracted from token
- Connections filtered by user_id

### Audit Logging

**Current:**
- ⚠️ Basic logging in application
- ⚠️ No structured audit log table

**Recommended:**
- Create `connection_audit_log` table
- Log all connection actions:
  - Connection created
  - Connection tested
  - Keys rotated
  - Connection revoked
  - Failed login attempts
- Include IP address, user agent, timestamp

---

## 📊 Data Flow Diagrams

### Connection Creation Flow

```
User Browser
    │
    │ 1. POST /connections (with API keys)
    ▼
CloudFront → ALB → ECS Backend
    │
    │ 2. Validate JWT token
    │ 3. Extract user_id
    │ 4. Encrypt API keys (Fernet)
    │ 5. Insert into exchange_keys table
    ▼
Supabase Database
    │
    │ 6. RLS policy checks user_id
    │ 7. Store encrypted keys
    │
    ▼
Response: Connection object (no keys)
    │
    ▼
User Browser (connection saved)
```

### Connection Usage Flow (Trading)

```
User Browser
    │
    │ 1. POST /orders (place trade)
    ▼
ECS Backend
    │
    │ 2. Validate JWT token
    │ 3. Get user_id
    │ 4. Query exchange_keys table
    │ 5. Decrypt API keys
    │ 6. Create BinanceAuthenticatedClient
    │ 7. Make authenticated request to Binance
    │
    ▼
NAT Gateway (static IP)
    │
    │ 8. Outbound HTTPS request
    │ 9. IP whitelist check (on Binance side)
    ▼
Binance API
    │
    │ 10. Validate API key + signature
    │ 11. Execute trade
    │
    ▼
Response: Order result
    │
    ▼
ECS Backend → User Browser
```

---

## ✅ Implementation Checklist

### Frontend
- [x] Connections page component
- [x] Connect exchange drawer (multi-step)
- [x] Rotate keys modal
- [x] Revoke connection modal
- [x] Security panel
- [x] Exchange cards
- [x] API integration
- [x] Error handling
- [x] Loading states
- [ ] Real-time connection status updates (WebSocket)

### Backend
- [x] List connections endpoint
- [x] Create/update connection endpoint
- [x] Test connection endpoint
- [x] Rotate keys endpoint
- [x] Revoke connection endpoint
- [x] Encryption/decryption utilities
- [x] Binance client implementation
- [ ] Coinbase client implementation
- [ ] Kraken client implementation
- [ ] Zerodha OAuth flow
- [ ] Audit log endpoint
- [ ] Connection health monitoring

### Database
- [x] users table
- [x] exchange_keys table
- [x] RLS policies
- [x] Indexes
- [ ] connection_audit_log table
- [ ] Connection health status tracking

### AWS Infrastructure
- [x] ECS Fargate service
- [x] Application Load Balancer
- [x] CloudFront CDN
- [x] S3 bucket
- [x] VPC with subnets
- [ ] NAT Gateway (for static IP) ⚠️ **CRITICAL**
- [ ] Secrets Manager integration
- [ ] CloudWatch monitoring
- [ ] Auto-scaling configuration

### Security
- [x] Encryption at rest (Fernet)
- [x] HTTPS/TLS in transit
- [x] JWT authentication
- [x] Row Level Security
- [x] CORS configuration
- [ ] IP whitelisting guide for users
- [ ] Audit logging
- [ ] Key rotation policy
- [ ] Security monitoring

---

## 🚨 Critical Requirements

### 1. **NAT Gateway (MUST HAVE)**
- **Why:** Exchange IP whitelisting requires static IP
- **Cost:** ~$32/month
- **Setup:** See EXCHANGE_IP_WHITELIST_GUIDE.md
- **Impact:** Without this, users cannot whitelist backend IP

### 2. **Encryption Key Management (MUST HAVE)**
- **Why:** API keys must be encrypted
- **Storage:** AWS Secrets Manager or ECS secrets
- **Backup:** Must be backed up securely
- **Rotation:** Should be rotated periodically

### 3. **Database RLS (MUST HAVE)**
- **Why:** Prevents users from accessing other users' keys
- **Status:** ✅ Already configured
- **Verification:** Test with different user tokens

### 4. **HTTPS Everywhere (MUST HAVE)**
- **Why:** API keys transmitted over network
- **Status:** ✅ Configured (CloudFront + ALB)
- **Verification:** Check SSL certificates

---

## 📝 User Documentation Needed

### For End Users

1. **How to Create Exchange API Keys**
   - Step-by-step guide for each exchange
   - Screenshots
   - Permission recommendations

2. **IP Whitelisting Guide**
   - Why it's needed
   - How to find AWS backend IP
   - How to add to exchange
   - Troubleshooting

3. **Security Best Practices**
   - Use minimal permissions
   - Rotate keys regularly
   - Monitor API usage
   - Report suspicious activity

4. **Troubleshooting**
   - "Connection failed" errors
   - "IP not whitelisted" errors
   - "Invalid credentials" errors

---

## 🔮 Future Enhancements

### Short Term
1. Implement Coinbase/Kraken clients
2. Add connection health monitoring
3. Create audit log table
4. Add connection status dashboard

### Medium Term
1. WebSocket for real-time status updates
2. Connection usage analytics
3. Automated key rotation reminders
4. Multi-account support (multiple Binance accounts)

### Long Term
1. OAuth flows for exchanges that support it
2. Connection templates/presets
3. Automated connection testing
4. Connection performance metrics

---

## 📊 Cost Estimation

### AWS Monthly Costs

**Minimum Setup:**
- ECS Fargate: ~$15-30/month (0.25 vCPU, 0.5GB RAM)
- ALB: ~$16/month
- NAT Gateway: ~$32/month ⚠️ **Required for IP whitelisting**
- CloudFront: ~$1-5/month (data transfer)
- S3: ~$1/month (storage)
- **Total: ~$65-85/month**

**Production Setup:**
- ECS Fargate: ~$50-100/month (scaling)
- ALB: ~$16/month
- NAT Gateway: ~$32/month
- CloudFront: ~$10-50/month
- S3: ~$5/month
- CloudWatch: ~$5/month
- **Total: ~$118-213/month**

---

## 🎯 Summary

### What Works Now ✅
- User can connect exchanges through UI
- API keys encrypted and stored securely
- Binance connection fully functional
- Connection testing works
- Key rotation works
- Connection revocation works

### What's Missing ⚠️
- NAT Gateway setup (critical for IP whitelisting)
- Coinbase/Kraken client implementations
- Audit logging
- Connection health monitoring
- User documentation

### What Needs Attention 🔴
- **NAT Gateway:** Must be setup for production
- **IP Whitelisting:** Users need guidance
- **Other Exchanges:** Only Binance works
- **Security:** Audit logging needed

---

## 📚 Related Documents

- `EXCHANGE_IP_WHITELIST_GUIDE.md` - IP whitelisting guide
- `AWS_COMPLETE_DEPLOYMENT_GUIDE.md` - AWS setup
- `SECURITY_FIXES_COMPLETE.md` - Security improvements
- `COMPREHENSIVE_CODEBASE_ANALYSIS.md` - Full codebase analysis

