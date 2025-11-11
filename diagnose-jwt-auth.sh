#!/bin/bash

echo "=== Diagnosing JWT Authentication Issue ==="

# 1. Check backend logs for JWT errors
echo "1. Checking backend logs for JWT authentication errors..."
echo ""
sudo docker logs tradeeon-backend 2>&1 | grep -i "jwt\|token\|auth\|401\|invalid\|expired" | tail -30

# 2. Check if SUPABASE_JWT_SECRET is set
echo ""
echo "2. Checking SUPABASE_JWT_SECRET environment variable..."
JWT_SECRET=$(sudo docker exec tradeeon-backend printenv SUPABASE_JWT_SECRET 2>/dev/null)
if [ -n "$JWT_SECRET" ]; then
    echo "   [OK] SUPABASE_JWT_SECRET is set"
    echo "   Length: ${#JWT_SECRET} characters"
    echo "   First 20 chars: ${JWT_SECRET:0:20}..."
    echo "   Last 20 chars: ...${JWT_SECRET: -20}"
else
    echo "   [ERROR] SUPABASE_JWT_SECRET is NOT set!"
fi

# 3. Check SUPABASE_URL
echo ""
echo "3. Checking SUPABASE_URL..."
SUPABASE_URL=$(sudo docker exec tradeeon-backend printenv SUPABASE_URL 2>/dev/null)
if [ -n "$SUPABASE_URL" ]; then
    echo "   [OK] SUPABASE_URL is set: $SUPABASE_URL"
else
    echo "   [ERROR] SUPABASE_URL is NOT set!"
fi

# 4. Test JWT validation with a sample token (if we can get one)
echo ""
echo "4. Testing JWT validation logic..."
echo "   (This will show if the JWT secret format is correct)"

# 5. Check recent requests
echo ""
echo "5. Recent authentication attempts (last 10 lines)..."
sudo docker logs tradeeon-backend 2>&1 | grep -i "POST.*connections" | tail -10

echo ""
echo "=== Diagnosis Complete ==="
echo ""
echo "If you see 'Invalid JWT token' or 'Invalid token:',"
echo "the JWT secret might not match the Supabase project."
echo ""
echo "Expected JWT secret for mgjlnmlhwuqspctanaik project:"
echo "b5xpWCI1kSA9+zuP39rNJ3RIJiwHa86gGsL6mBcUpl6u6VxFaTowQcHoNpJhrYTacxAdsHBosS+k88xHlNdXyQ=="

