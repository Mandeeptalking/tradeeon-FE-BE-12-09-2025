# Tradeeon - Complete Architecture & Deployment Guide (A-Z)

## 📋 Table of Contents
1. [System Overview](#system-overview)
2. [Frontend Architecture](#frontend-architecture)
3. [Backend Architecture](#backend-architecture)
4. [Database & Authentication](#database--authentication)
5. [Deployment Architecture](#deployment-architecture)
6. [DNS Issue & Fix](#dns-issue--fix)
7. [How Everything Works Together](#how-everything-works-together)

---

## System Overview

**Tradeeon** is a comprehensive cryptocurrency trading automation platform with:
- **Frontend**: React/TypeScript SPA with advanced charting
- **Backend**: FastAPI REST API with real-time trading capabilities
- **Database**: Supabase (PostgreSQL) for data persistence
- **Authentication**: Supabase Auth (JWT-based)
- **Hosting**: AWS (S3 + CloudFront for FE, ECS Fargate for BE)

---

## Frontend Architecture

### Technology Stack
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite 7
- **Routing**: React Router v6
- **State Management**: Zustand + TanStack Query
- **UI Library**: Radix UI + Tailwind CSS
- **Charts**: Custom Canvas API + Lightweight Charts
- **Authentication**: Supabase JS Client

### Project Structure
```
apps/frontend/
├── src/
│   ├── pages/          # Route pages (Dashboard, SignIn, etc.)
│   ├── components/     # Reusable UI components
│   ├── lib/            # Utilities & API clients
│   │   ├── api/        # API client functions
│   │   ├── supabase.ts # Supabase client
│   │   └── auth.ts     # Authentication helpers
│   ├── store/          # Zustand state stores
│   ├── hooks/          # Custom React hooks
│   ├── canvas/         # Custom chart rendering
│   └── App.tsx         # Main app component
├── public/             # Static assets
├── dist/               # Build output (deployed to S3)
├── package.json
└── vite.config.ts
```

### Key Features
1. **Authentication Flow**:
   - User signs up/signs in via Supabase Auth
   - JWT token stored in Zustand store
   - Protected routes check authentication
   - Token sent in Authorization header to backend

2. **API Communication**:
   - All API calls go through `authenticatedFetch()` helper
   - Automatically includes JWT token in headers
   - Handles token refresh and errors
   - Base URL: `https://api.tradeeon.com` (production)

3. **Real-time Data**:
   - WebSocket connections to Binance for live prices
   - Canvas-based charting with custom indicators
   - Live portfolio updates

### Environment Variables
```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxxxx
VITE_API_URL=https://api.tradeeon.com
```

**Note**: These are embedded at build time (Vite requirement for static sites)

---

## Backend Architecture

### Technology Stack
- **Framework**: FastAPI (Python 3.11)
- **Server**: Uvicorn (ASGI)
- **Database Client**: Supabase Python Client
- **Authentication**: JWT validation with Supabase JWT secret
- **Container**: Docker (deployed to ECS Fargate)

### Project Structure
```
apps/api/
├── main.py              # FastAPI app entry point
├── routers/             # API route handlers
│   ├── dashboard.py     # Dashboard endpoints
│   ├── connections.py   # Exchange connections
│   ├── portfolio.py    # Portfolio management
│   ├── bots.py          # Bot management
│   └── ...
├── deps/
│   └── auth.py          # Authentication dependency
├── clients/
│   └── supabase_client.py  # Supabase client
├── modules/
│   ├── alerts/          # Alert system
│   └── bots/            # Bot execution
└── utils/
    └── encryption.py    # API key encryption
```

### Key Components

#### 1. FastAPI Application (`apps/api/main.py`)
```python
app = FastAPI(
    title="Tradeeon API",
    version="1.0.0"
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://www.tradeeon.com", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"]
)
```

#### 2. Authentication (`apps/api/deps/auth.py`)
- Validates JWT tokens from Supabase
- Extracts user ID from token
- Protects routes with `Depends(get_current_user)`

#### 3. Database Connection (`apps/api/clients/supabase_client.py`)
- Connects to Supabase using service role key
- Provides database access for all operations
- Handles connection errors gracefully

### API Endpoints
- `GET /health` - Health check
- `GET /dashboard/summary` - Dashboard data
- `POST /connections` - Add exchange connection
- `GET /portfolio/balance` - Get portfolio balance
- `POST /bots/dca-bots` - Create DCA bot
- And many more...

### Environment Variables
```env
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJxxxxx
SUPABASE_JWT_SECRET=your-jwt-secret
CORS_ORIGINS=https://www.tradeeon.com,http://localhost:5173
```

---

## Database & Authentication

### Supabase Setup
- **Database**: PostgreSQL (managed by Supabase)
- **Auth**: Supabase Auth (JWT-based)
- **Storage**: Optional file storage

### Authentication Flow

1. **User Registration/Login**:
   ```
   Frontend → Supabase Auth API → JWT Token → Stored in Zustand
   ```

2. **API Requests**:
   ```
   Frontend → Backend API (with JWT in header)
   Backend → Validates JWT with SUPABASE_JWT_SECRET
   Backend → Extracts user_id → Queries database
   ```

3. **Database Access**:
   - Backend uses `SUPABASE_SERVICE_ROLE_KEY` for database operations
   - Row Level Security (RLS) policies protect user data
   - Each user can only access their own data

### Database Schema
- `users` - User profiles (extends Supabase auth.users)
- `exchange_keys` - Encrypted API keys for exchanges
- `bots` - Bot configurations
- `alerts` - Trading alerts
- `orders` - Order history
- And more...

---

## Deployment Architecture

### Frontend Deployment (S3 + CloudFront)

#### Architecture Flow
```
User Request → CloudFront CDN → S3 Bucket → Static Files
```

#### Components

1. **S3 Bucket** (`tradeeon-frontend`)
   - Stores built frontend files (HTML, JS, CSS)
   - Static website hosting enabled
   - Public read access for CloudFront

2. **CloudFront Distribution** (`EMF4IMNT9637C`)
   - Global CDN for fast content delivery
   - SSL/TLS termination
   - Custom domain: `www.tradeeon.com`
   - SPA routing (404 → index.html)

3. **Route53 DNS**
   - `www.tradeeon.com` → CloudFront distribution
   - A record (Alias) pointing to CloudFront

#### Deployment Process
1. Build frontend: `npm run build` (creates `dist/` folder)
2. Upload to S3: `aws s3 sync dist/ s3://tradeeon-frontend/ --delete`
3. Invalidate CloudFront: `aws cloudfront create-invalidation --distribution-id EMF4IMNT9637C --paths "/*"`

#### GitHub Actions Workflow
- File: `.github/workflows/deploy-frontend.yml`
- Triggers on push to `main` branch
- Builds frontend with environment variables
- Deploys to S3
- Invalidates CloudFront cache

---

### Backend Deployment (ECS Fargate)

#### Architecture Flow
```
User Request → Application Load Balancer (ALB) → ECS Fargate Tasks → FastAPI
```

#### Components

1. **ECR (Elastic Container Registry)**
   - Stores Docker images
   - Image: `tradeeon-backend:latest`

2. **ECS Fargate Cluster**
   - Runs containerized FastAPI application
   - Auto-scaling based on CPU/memory
   - Always running (no cold starts)

3. **Application Load Balancer (ALB)**
   - Routes traffic to ECS tasks
   - Health checks
   - SSL/TLS termination (optional)
   - Domain: `api.tradeeon.com`

4. **VPC & Networking**
   - Private subnets for ECS tasks
   - Public subnets for ALB
   - Security groups for access control

#### Deployment Process
1. Build Docker image: `docker build -t tradeeon-backend .`
2. Push to ECR: `docker push <ECR_URI>/tradeeon-backend:latest`
3. Update ECS service: `aws ecs update-service --cluster tradeeon-cluster --service tradeeon-backend --force-new-deployment`

#### GitHub Actions Workflow
- File: `.github/workflows/deploy-backend.yml`
- Builds Docker image
- Pushes to ECR
- Updates ECS service

---

## DNS Issue & Fix

### 🔴 Current Issue: DNS_PROBE_FINISHED_NXDOMAIN

**Error**: `DNS_PROBE_FINISHED_NXDOMAIN` when accessing `www.tradeeon.com`

**Root Cause**: Missing or incorrect Route53 DNS record for `www.tradeeon.com`

### Diagnosis Steps

1. **Check DNS Resolution**:
   ```bash
   nslookup www.tradeeon.com
   # Should return CloudFront IPs, but currently returns NXDOMAIN
   ```

2. **Check Route53 Records**:
   ```bash
   # Get hosted zone ID
   HOSTED_ZONE_ID=$(aws route53 list-hosted-zones --query "HostedZones[?Name=='tradeeon.com.'].[Id]" --output text | cut -d'/' -f3)
   
   # Check for www record
   aws route53 list-resource-record-sets --hosted-zone-id $HOSTED_ZONE_ID --query "ResourceRecordSets[?Name=='www.tradeeon.com.']"
   ```

3. **Check CloudFront Distribution**:
   ```bash
   aws cloudfront get-distribution --id EMF4IMNT9637C --query "Distribution.{Status:Status,DomainName:DomainName}"
   ```

4. **Check S3 Bucket**:
   ```bash
   aws s3 ls s3://tradeeon-frontend/
   # Should show index.html and other files
   ```

### ✅ Fix Instructions

#### Option 1: AWS Console (Recommended)

1. **Go to Route53 Console**:
   - Navigate to: https://console.aws.amazon.com/route53/
   - Select hosted zone: `tradeeon.com`

2. **Create A Record**:
   - Click "Create record"
   - Name: `www`
   - Type: `A - Routes traffic to an IPv4 address and some AWS resources`
   - Alias: **Yes** (toggle on)
   - Route traffic to: `CloudFront distribution`
   - Select distribution: `EMF4IMNT9637C` (or find by domain name)
   - Routing policy: `Simple routing`
   - Click "Create records"

3. **Verify**:
   - Wait 5-15 minutes for DNS propagation
   - Check: `nslookup www.tradeeon.com`
   - Should return CloudFront IP addresses

#### Option 2: AWS CLI

```bash
# Get CloudFront domain name
CF_DOMAIN=$(aws cloudfront get-distribution --id EMF4IMNT9637C --query "Distribution.DomainName" --output text)

# Get hosted zone ID
HOSTED_ZONE_ID=$(aws route53 list-hosted-zones --query "HostedZones[?Name=='tradeeon.com.'].[Id]" --output text | cut -d'/' -f3)

# Create A record
aws route53 change-resource-record-sets \
  --hosted-zone-id $HOSTED_ZONE_ID \
  --change-batch '{
    "Changes": [{
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "www.tradeeon.com",
        "Type": "A",
        "AliasTarget": {
          "HostedZoneId": "Z2FDTNDATAQYW2",
          "DNSName": "'"$CF_DOMAIN"'",
          "EvaluateTargetHealth": false
        }
      }
    }]
  }'
```

#### Option 3: Using Existing Script

```bash
# Run the diagnostic script
./scripts/check_frontend_status.sh

# Or use the fix script (if available)
./scripts/fix-dns-www.sh
```

### Verification

After creating the DNS record:

1. **Check DNS Propagation**:
   - Use: https://dnschecker.org/#A/www.tradeeon.com
   - Should show CloudFront IPs globally within 15-60 minutes

2. **Test Website**:
   ```bash
   curl -I https://www.tradeeon.com
   # Should return 200 OK
   ```

3. **Check Browser**:
   - Visit: https://www.tradeeon.com
   - Should load the frontend application

### Common Issues

1. **DNS Not Propagating**:
   - Wait 15-60 minutes (normal propagation time)
   - Clear browser DNS cache
   - Try different DNS servers (8.8.8.8, 1.1.1.1)

2. **CloudFront Not Deployed**:
   - Check CloudFront status: Should be "Deployed"
   - Wait 15-20 minutes if status is "InProgress"

3. **S3 Bucket Empty**:
   - Trigger frontend deployment via GitHub Actions
   - Or manually deploy: `aws s3 sync apps/frontend/dist s3://tradeeon-frontend/ --delete`

4. **SSL Certificate Issues**:
   - Ensure ACM certificate is validated
   - Certificate must be in `us-east-1` region for CloudFront
   - Check CloudFront distribution has certificate attached

---

## How Everything Works Together

### Complete Request Flow

#### 1. User Visits Website
```
User → www.tradeeon.com
     → Route53 DNS lookup
     → CloudFront CDN (if DNS configured correctly)
     → S3 Bucket
     → Returns index.html
     → React app loads
```

#### 2. User Signs In
```
Frontend → Supabase Auth API
         → Returns JWT token
         → Stored in Zustand store
         → Token included in all API requests
```

#### 3. User Accesses Dashboard
```
Frontend → GET /dashboard/summary
         → Authorization: Bearer <JWT>
         → api.tradeeon.com (ALB)
         → ECS Fargate task
         → FastAPI validates JWT
         → Queries Supabase database
         → Returns dashboard data
         → Frontend displays data
```

#### 4. User Creates Bot
```
Frontend → POST /bots/dca-bots
         → Backend validates request
         → Stores bot config in Supabase
         → Bot runner service picks up bot
         → Connects to Binance API
         → Executes trades based on conditions
```

### Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Browser                             │
└──────────────┬──────────────────────────────┬───────────────────┘
               │                              │
               ▼                              ▼
    ┌──────────────────┐          ┌──────────────────────┐
    │  www.tradeeon.com│          │  api.tradeeon.com    │
    │  (CloudFront)    │          │  (ALB)               │
    └────────┬─────────┘          └──────────┬────────────┘
             │                               │
             ▼                               ▼
    ┌──────────────────┐          ┌──────────────────────┐
    │   S3 Bucket      │          │   ECS Fargate        │
    │  - Static files  │          │  - FastAPI           │
    │  - index.html    │          │  - Bot runner        │
    └──────────────────┘          └──────────┬───────────┘
                                             │
                        ┌────────────────────┼────────────────────┐
                        ▼                    ▼                    ▼
              ┌──────────────┐      ┌──────────────┐    ┌──────────────┐
              │  Supabase   │      │ Binance API  │    │  CloudWatch  │
              │  - Database │      │ - Market data│    │  - Logs      │
              │  - Auth     │      │ - Trading    │    │  - Metrics   │
              └──────────────┘      └──────────────┘    └──────────────┘
```

### Environment Configuration

#### Frontend (Build Time)
```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxxxx
VITE_API_URL=https://api.tradeeon.com
```

#### Backend (Runtime)
```env
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJxxxxx
SUPABASE_JWT_SECRET=your-jwt-secret
CORS_ORIGINS=https://www.tradeeon.com,http://localhost:5173
```

### Security Considerations

1. **API Keys**: Encrypted in database using `ENCRYPTION_KEY`
2. **JWT Tokens**: Validated on every API request
3. **CORS**: Only allows requests from configured origins
4. **HTTPS**: Enforced on all production endpoints
5. **Row Level Security**: Database policies protect user data

---

## Summary

### Frontend
- **Tech**: React + TypeScript + Vite
- **Hosting**: S3 + CloudFront
- **Domain**: `www.tradeeon.com`
- **Build**: Static files built at deploy time

### Backend
- **Tech**: FastAPI + Python 3.11
- **Hosting**: ECS Fargate
- **Domain**: `api.tradeeon.com`
- **Runtime**: Docker containers

### Database
- **Tech**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth (JWT)
- **Location**: Supabase cloud

### Current Issue
- **Problem**: `www.tradeeon.com` DNS record missing
- **Fix**: Create Route53 A record pointing to CloudFront
- **Status**: Needs immediate action

---

## Quick Reference

### Check Frontend Status
```bash
# DNS
nslookup www.tradeeon.com

# CloudFront
aws cloudfront get-distribution --id EMF4IMNT9637C

# S3
aws s3 ls s3://tradeeon-frontend/
```

### Check Backend Status
```bash
# Health check
curl https://api.tradeeon.com/health

# ECS
aws ecs describe-services --cluster tradeeon-cluster --services tradeeon-backend
```

### Deploy Frontend
```bash
cd apps/frontend
npm run build
aws s3 sync dist/ s3://tradeeon-frontend/ --delete
aws cloudfront create-invalidation --distribution-id EMF4IMNT9637C --paths "/*"
```

### Deploy Backend
```bash
docker build -t tradeeon-backend .
docker tag tradeeon-backend:latest <ECR_URI>/tradeeon-backend:latest
docker push <ECR_URI>/tradeeon-backend:latest
aws ecs update-service --cluster tradeeon-cluster --service tradeeon-backend --force-new-deployment
```

---

**Last Updated**: Based on current codebase analysis  
**Next Steps**: Fix DNS record for `www.tradeeon.com` → CloudFront

