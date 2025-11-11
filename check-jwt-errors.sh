#!/bin/bash

echo "=== Check Actual JWT Authentication Errors ==="

echo "1. Checking for JWT/token/authentication errors (excluding Binance signatures)..."
sudo docker logs tradeeon-backend 2>&1 | grep -iE '(invalid.*token|expired|authentication failed|401|jwt.*error|token.*error)' | grep -v 'binance\|signature=' | tail -30

echo ""
echo "2. Checking recent POST /connections requests..."
sudo docker logs tradeeon-backend 2>&1 | grep 'POST.*connections' | tail -20

echo ""
echo "3. Checking if Authorization header is being received..."
sudo docker logs tradeeon-backend 2>&1 | grep -i 'authorization\|bearer\|missing token' | tail -20

echo ""
echo "4. Checking JWT secret configuration..."
JWT_SECRET=$(sudo docker exec tradeeon-backend printenv SUPABASE_JWT_SECRET 2>/dev/null)
if [ -n "$JWT_SECRET" ]; then
    echo "   ✅ SUPABASE_JWT_SECRET is set"
    echo "   Length: ${#JWT_SECRET} characters"
else
    echo "   ❌ SUPABASE_JWT_SECRET is NOT set!"
fi

echo ""
echo "5. Full error context for recent 401 errors..."
sudo docker logs tradeeon-backend 2>&1 | grep -B 5 -A 5 '401\|Unauthorized' | tail -40

