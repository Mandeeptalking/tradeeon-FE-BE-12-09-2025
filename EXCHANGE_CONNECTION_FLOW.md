# Complete Exchange Connection Flow Documentation

## Overview
This document explains the complete flow of how a user connects their exchange account (e.g., Binance) to the Tradeeon platform, from the frontend UI to backend storage and verification.

---

## 🎯 User Journey

### Step 1: User Initiates Connection
**Location:** `apps/frontend/src/components/connections/ConnectExchangeDrawer.tsx`

1. User clicks "Connect Exchange" button
2. A drawer/modal opens with a 4-step wizard:
   - **Step 1:** Select Exchange (Binance, Coinbase, Kraken, Zerodha)
   - **Step 2:** Enter API Credentials (API Key, API Secret, optional Passphrase)
   - **Step 3:** Test Connection (optional verification)
   - **Step 4:** Review & Save

### Step 2: Form Validation
**Location:** `ConnectExchangeDrawer.tsx` - `validateStep()` function

- Validates required fields (API Key, API Secret)
- Checks if passphrase is required for selected exchange
- Shows error messages for invalid inputs

### Step 3: Test Connection (Optional)
**Location:** `ConnectExchangeDrawer.tsx` - `handleTestConnection()` function

**Frontend Flow:**
```typescript
// User clicks "Test Connection" button
const testBody = {
  exchange: 'BINANCE',
  api_key: 'user_api_key',
  api_secret: 'user_api_secret',
  passphrase: undefined // Only for Coinbase/Kraken
};

// Calls API
const result = await connectionsApi.testConnection(testBody);
```

**API Call:** `POST /connections/test`
- **Endpoint:** `apps/api/routers/connections.py` - `test_connection()`
- **Authentication:** Requires JWT token in `Authorization: Bearer <token>` header
- **Process:**
  1. Validates API key and secret are provided
  2. Creates `BinanceAuthenticatedClient` instance
  3. Calls `test_connection()` method
  4. Tests both SPOT and Futures accounts
  5. Returns success/failure with detailed error messages

**Binance Test Process:**
- **Location:** `apps/api/binance_authenticated_client.py` - `test_connection()`
- Tests SPOT account: `GET /api/v3/account`
- Tests Futures account: `GET /fapi/v1/account`
- Generates HMAC SHA256 signature with:
  - Parameters sorted alphabetically
  - Timestamp added before signing
  - Signature added after signing
- Returns:
  ```json
  {
    "ok": true,
    "code": "ok",
    "message": "Connection successful",
    "latency_ms": 79,
    "account_type": "SPOT",
    "account_types": ["SPOT", "FUTURES"]
  }
  ```

### Step 4: Save Connection
**Location:** `ConnectExchangeDrawer.tsx` - `handleSave()` function

**Frontend Flow:**
```typescript
const connectionBody = {
  exchange: 'BINANCE',
  api_key: 'user_api_key',
  api_secret: 'user_api_secret',
  passphrase: undefined,
  nickname: 'Main Trading Account' // Optional
};

const connection = await connectionsApi.upsertConnection(connectionBody);
```

**API Call:** `POST /connections`
- **Endpoint:** `apps/api/routers/connections.py` - `upsert_connection()`
- **Authentication:** Requires JWT token

**Backend Process:**

1. **Authentication & User Profile**
   - Extracts JWT token from `Authorization` header
   - Validates token using `SUPABASE_JWT_SECRET`
   - Extracts `user_id` from token payload
   - Ensures user profile exists in `public.users` table
   - Creates profile if missing

2. **Encryption**
   - **Location:** `apps/api/utils/encryption.py`
   - Uses Fernet symmetric encryption (AES-128)
   - Encryption key from `ENCRYPTION_KEY` environment variable
   - Encrypts:
     - `api_key` → `api_key_encrypted`
     - `api_secret` → `api_secret_encrypted`
     - `passphrase` → `passphrase_encrypted` (if provided)

3. **Database Storage**
   - **Table:** `public.exchange_keys` (Supabase PostgreSQL)
   - **Schema:**
     ```sql
     CREATE TABLE public.exchange_keys (
       id UUID PRIMARY KEY,
       user_id UUID REFERENCES public.users(id),
       exchange TEXT NOT NULL, -- 'binance', 'coinbase', 'kraken', 'zerodha'
       api_key_encrypted TEXT NOT NULL,
       api_secret_encrypted TEXT NOT NULL,
       passphrase_encrypted TEXT,
       is_active BOOLEAN DEFAULT true,
       permissions JSONB DEFAULT '{}',
       created_at TIMESTAMP,
       updated_at TIMESTAMP,
       UNIQUE(user_id, exchange)
     );
     ```
   - **Logic:**
     - Checks if connection exists for user + exchange
     - If exists: Updates existing record
     - If new: Inserts new record
     - Sets `is_active = true`
     - Stores permissions: `{trading: true, wallet: true, paper: false}`

4. **Response**
   - Returns connection object:
     ```json
     {
       "id": "uuid",
       "exchange": "BINANCE",
       "nickname": "Main Trading Account",
       "status": "connected",
       "last_check_at": "2025-11-10T01:00:00Z",
       "next_check_eta_sec": 60,
       "features": {
         "trading": true,
         "wallet": true,
         "paper": false
       }
     }
     ```

---

## 🔐 Security Architecture

### Authentication Flow

1. **Frontend Authentication**
   - **Location:** `apps/frontend/src/lib/api/auth.ts` - `authenticatedFetch()`
   - Gets JWT token from Supabase session: `supabase.auth.getSession()`
   - Adds to request header: `Authorization: Bearer <token>`

2. **Backend Authentication**
   - **Location:** `apps/api/deps/auth.py` - `get_current_user()`
   - Validates JWT token using `SUPABASE_JWT_SECRET`
   - Extracts `user_id` from token payload (`sub` or `user_id` field)
   - Returns `AuthedUser` object with `user_id`

### Encryption Details

- **Algorithm:** Fernet (symmetric encryption, AES-128)
- **Key Storage:** Environment variable `ENCRYPTION_KEY`
- **Key Format:** Base64 URL-safe 32-byte key
- **Generation:** `python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"`
- **Process:**
  1. Plain text → UTF-8 bytes
  2. Encrypt with Fernet
  3. Base64 encode
  4. Store in database

### Database Security

- **Encryption at Rest:** Supabase PostgreSQL encryption
- **Encryption in Transit:** HTTPS/TLS for all API calls
- **Access Control:** Row-level security (RLS) via `user_id` foreign key
- **Soft Delete:** `is_active` flag instead of hard delete

---

## 📡 API Endpoints

### List Connections
- **Method:** `GET /connections`
- **Auth:** Required (JWT)
- **Response:** Array of user's connections
- **Logic:** Filters by `user_id` and `is_active = true`

### Test Connection
- **Method:** `POST /connections/test`
- **Auth:** Required (JWT)
- **Body:**
  ```json
  {
    "exchange": "BINANCE",
    "api_key": "user_key",
    "api_secret": "user_secret",
    "passphrase": null
  }
  ```
- **Response:**
  ```json
  {
    "ok": true,
    "code": "ok",
    "message": "Connection successful",
    "latency_ms": 79,
    "account_types": ["SPOT", "FUTURES"]
  }
  ```

### Create/Update Connection
- **Method:** `POST /connections`
- **Auth:** Required (JWT)
- **Body:**
  ```json
  {
    "exchange": "BINANCE",
    "api_key": "user_key",
    "api_secret": "user_secret",
    "passphrase": null,
    "nickname": "Main Account"
  }
  ```
- **Response:** Connection object

### Rotate Keys
- **Method:** `POST /connections/{connection_id}/rotate`
- **Auth:** Required (JWT)
- **Body:** Same as create (new keys)
- **Logic:** Updates encrypted keys for existing connection

### Revoke Connection
- **Method:** `DELETE /connections/{connection_id}`
- **Auth:** Required (JWT)
- **Logic:** Sets `is_active = false` (soft delete)

---

## 🔄 Binance API Integration

### Signature Generation
**Location:** `apps/api/binance_authenticated_client.py` - `_generate_signature()`

**Process:**
1. Filter out `None` and empty string values
2. Sort parameters alphabetically by key
3. URL encode sorted parameters
4. Generate HMAC SHA256 signature:
   ```python
   signature = hmac.new(
       api_secret.encode('utf-8'),
       query_string.encode('utf-8'),
       hashlib.sha256
   ).hexdigest()
   ```
5. Add `timestamp` before signing
6. Add `signature` after signing

### Request Format
```
GET https://api.binance.com/api/v3/account?timestamp=1234567890&signature=abc123...
Headers:
  X-MBX-APIKEY: <api_key>
```

### Account Type Detection
- **SPOT:** `/api/v3/account`
- **Futures (USDT-M):** `/fapi/v1/account`
- Tests both and returns available account types

---

## 🗄️ Database Schema

### `public.users`
```sql
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  timezone TEXT DEFAULT 'UTC',
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### `public.exchange_keys`
```sql
CREATE TABLE public.exchange_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  exchange TEXT NOT NULL CHECK (exchange IN ('binance', 'zerodha', 'coinbase', 'kraken')),
  api_key_encrypted TEXT NOT NULL,
  api_secret_encrypted TEXT NOT NULL,
  passphrase_encrypted TEXT,
  is_active BOOLEAN DEFAULT true,
  permissions JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, exchange)
);
```

---

## 🚨 Error Handling

### Frontend Errors
- **Validation Errors:** Shown inline in form fields
- **API Errors:** Displayed in error banner with detailed message
- **Network Errors:** Fallback to mock data (development)

### Backend Errors

**Authentication Errors:**
- `401 Unauthorized`: Missing or invalid JWT token
- `500 Internal Server Error`: `SUPABASE_JWT_SECRET` not configured

**Connection Test Errors:**
- `invalid_credentials`: Invalid API key/secret
- `ip_not_whitelisted`: IP address not whitelisted in Binance
- `scope_missing`: API key missing required permissions
- `no_account_access`: Cannot access any account type

**Database Errors:**
- `Database service is not available`: Supabase client not initialized
- `Failed to save connection`: Encryption or database error

---

## 🔧 Environment Variables

### Backend (ECS Task Definition)
- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key for database access
- `SUPABASE_JWT_SECRET`: JWT secret for token validation
- `ENCRYPTION_KEY`: Fernet encryption key (32-byte base64)
- `CORS_ORIGINS`: Allowed frontend origins (comma-separated)

### Frontend
- `VITE_API_URL`: Backend API URL (e.g., `https://api.tradeeon.com`)
- `VITE_SUPABASE_URL`: Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Supabase anonymous key

---

## 📝 Key Files

### Frontend
- `apps/frontend/src/components/connections/ConnectExchangeDrawer.tsx` - Main UI component
- `apps/frontend/src/lib/api/connections.ts` - API client functions
- `apps/frontend/src/lib/api/auth.ts` - Authentication helper
- `apps/frontend/src/types/connections.ts` - TypeScript types

### Backend
- `apps/api/routers/connections.py` - API endpoints
- `apps/api/binance_authenticated_client.py` - Binance API client
- `apps/api/utils/encryption.py` - Encryption utilities
- `apps/api/deps/auth.py` - Authentication dependency

### Database
- `infra/supabase/schema.sql` - Database schema

---

## 🎬 Complete Flow Diagram

```
User → Frontend UI
  ↓
Select Exchange (Step 1)
  ↓
Enter Credentials (Step 2)
  ↓
Test Connection (Step 3) [Optional]
  ├─→ POST /connections/test
  │   ├─→ Authenticate (JWT)
  │   ├─→ Create BinanceClient
  │   ├─→ Test SPOT account
  │   ├─→ Test Futures account
  │   └─→ Return result
  ↓
Review & Save (Step 4)
  ↓
POST /connections
  ├─→ Authenticate (JWT)
  ├─→ Extract user_id
  ├─→ Ensure user profile exists
  ├─→ Encrypt API keys
  ├─→ Check if connection exists
  ├─→ Insert/Update database
  └─→ Return connection object
  ↓
Success → Close drawer → Refresh connections list
```

---

## 🔍 Troubleshooting

### Common Issues

1. **"Authentication service not configured"**
   - **Cause:** `SUPABASE_JWT_SECRET` missing in ECS task definition
   - **Fix:** Add environment variable to task definition

2. **"Failed to save connection"**
   - **Cause:** `ENCRYPTION_KEY` missing or invalid
   - **Fix:** Generate key and add to task definition

3. **"Invalid API credentials"**
   - **Cause:** Wrong API key/secret or IP not whitelisted
   - **Fix:** Verify credentials and whitelist server IP in Binance

4. **"307 Temporary Redirect"**
   - **Cause:** FastAPI trailing slash redirect
   - **Fix:** Set `redirect_slashes=False` in FastAPI app

5. **"Connection test succeeds but save fails"**
   - **Cause:** Database connection issue or encryption error
   - **Fix:** Check Supabase connection and `ENCRYPTION_KEY`

---

## 📚 Additional Notes

- **One Connection Per Exchange:** Database constraint `UNIQUE(user_id, exchange)` ensures one connection per exchange per user
- **Soft Delete:** Connections are deactivated (`is_active = false`) not deleted
- **Account Types:** System detects both SPOT and Futures accounts automatically
- **Mock Data:** Frontend falls back to mock data if API is unavailable (development only)
- **Rate Limiting:** API requests are rate-limited via middleware
- **CORS:** Configured to allow requests from frontend origins only

