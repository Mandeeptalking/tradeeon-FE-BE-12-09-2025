# Tradeeon Simplification Roadmap

## Quick Start: What to Fix First

### 🔴 Phase 1: Critical Cleanup (Week 1-2)

#### 1. Remove Code Bloat
```bash
# Files to delete/move:
- apps/frontend/src/pages/Test*.tsx → Move to /test route
- apps/frontend/src/pages/*Demo*.tsx → Delete or move
- apps/frontend/src/pages/Working*.tsx → Delete
- apps/frontend/src/pages/Simple*.tsx → Delete
- apps/frontend/src/pages/Minimal*.tsx → Delete
- apps/frontend/src/pages/Basic*.tsx → Delete
```

#### 2. Remove Unused Chart Libraries
```json
// Keep ONLY: lightweight-charts
// Remove from package.json:
- chart.js
- react-chartjs-2
- echarts
- klinecharts
- recharts
```

#### 3. Fix Security Issues
- [ ] Remove mock auth token (`apps/api/deps/auth.py:17`)
- [ ] Tighten CORS (`apps/api/main.py:32-33`)
- [ ] Add environment validation on startup
- [ ] Remove console.logs from production builds

#### 4. Standardize Error Handling
- [ ] Create `apps/api/utils/errors.py` with standard error classes
- [ ] Add global exception handler
- [ ] Standardize error response format

### 🟠 Phase 2: Architecture Cleanup (Month 1)

#### 1. Consolidate Backend Services
```
Current: apps/api/, apps/alerts/, apps/bots/, apps/streamer/
Target: apps/api/ with modules:
  - apps/api/modules/alerts/
  - apps/api/modules/bots/
  - apps/api/modules/streamer/
```

#### 2. Standardize State Management
- [ ] Use Zustand for client state
- [ ] Use React Query for server state
- [ ] Remove redundant state management
- [ ] Add state persistence

#### 3. Add Testing
- [ ] Set up Jest/Vitest
- [ ] Add unit tests for utilities
- [ ] Add API integration tests
- [ ] Add E2E tests for critical flows

### 🟡 Phase 3: Production Features (Quarter 1)

#### 1. Monitoring & Observability
- [ ] Add Sentry for error tracking
- [ ] Add APM (New Relic/Datadog)
- [ ] Set up log aggregation
- [ ] Create metrics dashboard

#### 2. Caching
- [ ] Add Redis
- [ ] Cache market data (TTL: 1-5s)
- [ ] Cache user data (TTL: 5-10min)
- [ ] Implement cache invalidation

#### 3. Complete TODOs
- [ ] Review all 339+ TODOs
- [ ] Create GitHub issues
- [ ] Prioritize and complete

---

## File-by-File Cleanup Checklist

### Frontend Files to Remove
- [ ] `apps/frontend/src/pages/TestPage.tsx`
- [ ] `apps/frontend/src/pages/TestHome.tsx`
- [ ] `apps/frontend/src/pages/SimpleTest.tsx`
- [ ] `apps/frontend/src/pages/MinimalTest.tsx`
- [ ] `apps/frontend/src/pages/BasicChartTest.tsx`
- [ ] `apps/frontend/src/pages/WorkingChart.tsx`
- [ ] `apps/frontend/src/pages/WorkingSimpleChart.tsx`
- [ ] `apps/frontend/src/pages/ValidationDemo.tsx`
- [ ] `apps/frontend/src/pages/ProperIndicatorDemo.tsx`
- [ ] `apps/frontend/src/pages/SimpleIndicatorTest.tsx`
- [ ] `apps/frontend/src/pages/SimpleIndicatorPane.tsx`
- [ ] `apps/frontend/src/pages/WorkingIndicatorPane.tsx`
- [ ] `apps/frontend/src/pages/StrategyManager.tsx` (keep only StrategyManager1.tsx)
- [ ] `apps/frontend/src/pages/ChartJSTest.tsx`

### Backend Files to Consolidate
- [ ] Merge `apps/alerts/` into `apps/api/modules/alerts/`
- [ ] Merge `apps/bots/` into `apps/api/modules/bots/`
- [ ] Merge `apps/streamer/` into `apps/api/modules/streamer/`
- [ ] Consolidate `backend/indicator_engine/` into `apps/api/modules/indicators/`

### Dependencies to Remove
```json
// Frontend - Remove:
{
  "chart.js": "^4.5.0",
  "react-chartjs-2": "^5.3.0",
  "echarts": "^6.0.0",
  "klinecharts": "^10.0.0-alpha5",
  "recharts": "^3.2.0"
}

// Keep only:
{
  "lightweight-charts": "^5.0.8"
}
```

---

## Code Patterns to Standardize

### 1. Error Handling Pattern
```python
# apps/api/utils/errors.py
class TradeeonError(Exception):
    def __init__(self, message: str, code: str, status_code: int = 500):
        self.message = message
        self.code = code
        self.status_code = status_code

# Usage:
raise TradeeonError("User not found", "USER_NOT_FOUND", 404)
```

### 2. API Response Pattern
```python
# Standard response format:
{
    "success": bool,
    "data": any,
    "error": {
        "code": str,
        "message": str
    } | null,
    "timestamp": int
}
```

### 3. State Management Pattern
```typescript
// Use Zustand for client state
const useStore = create<State>((set) => ({
  // state
}))

// Use React Query for server state
const { data } = useQuery(['key'], fetchFunction)
```

---

## Security Checklist

### Immediate Fixes
- [ ] Remove mock auth token
- [ ] Tighten CORS (methods, headers)
- [ ] Validate environment variables on startup
- [ ] Remove console.logs from production
- [ ] Add rate limiting per user
- [ ] Implement API key rotation

### Medium-term
- [ ] Use AWS KMS for encryption keys
- [ ] Add audit logging
- [ ] Implement key access monitoring
- [ ] Add request signing for webhooks
- [ ] Implement CSRF protection

---

## Testing Checklist

### Setup
- [ ] Configure Jest/Vitest
- [ ] Set up test database
- [ ] Add test utilities
- [ ] Configure CI/CD for tests

### Coverage Goals
- [ ] Utilities: 90%+
- [ ] API endpoints: 70%+
- [ ] Frontend components: 60%+
- [ ] Critical flows: 100%

---

## Monitoring Checklist

### Error Tracking
- [ ] Set up Sentry
- [ ] Add error boundaries (React)
- [ ] Add exception handlers (FastAPI)
- [ ] Configure alerts

### Performance
- [ ] Add APM tool
- [ ] Monitor API response times
- [ ] Track database query performance
- [ ] Monitor frontend bundle size

### Logging
- [ ] Set up log aggregation
- [ ] Add structured logging
- [ ] Configure log levels
- [ ] Set up log retention

---

## Quick Wins (Do First)

1. **Delete test pages** (30 min)
2. **Remove unused chart libraries** (1 hour)
3. **Remove console.logs** (2 hours)
4. **Fix CORS** (30 min)
5. **Remove mock auth** (15 min)

**Total time: ~4 hours for immediate improvements**

---

## Success Metrics

### Before
- Bundle size: ~3-5MB
- Test coverage: 0%
- TODOs: 339+
- Test pages: 15+
- Chart libraries: 5

### After (Target)
- Bundle size: <1MB
- Test coverage: 70%+
- TODOs: <50
- Test pages: 0 (moved to /test)
- Chart libraries: 1

---

## Next Steps

1. Review this roadmap
2. Prioritize based on business needs
3. Create GitHub issues
4. Start with Phase 1 (Week 1)
5. Track progress in project board

---

*Last Updated: 2025-01-XX*

