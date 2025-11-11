#!/bin/bash

echo "=== Testing Actual Route Access ==="

# Test POST /connections (without trailing slash)
echo "1. Testing POST /connections (no trailing slash)..."
RESPONSE1=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST \
    -H "Content-Type: application/json" \
    -d '{"exchange":"BINANCE","api_key":"test","api_secret":"test"}' \
    http://localhost:8000/connections)
STATUS1=$(echo "$RESPONSE1" | grep "HTTP_STATUS" | cut -d: -f2)
BODY1=$(echo "$RESPONSE1" | sed '/HTTP_STATUS/d')
echo "   Status: $STATUS1"
echo "   Response: $BODY1"

# Test POST /connections/ (with trailing slash)
echo ""
echo "2. Testing POST /connections/ (with trailing slash)..."
RESPONSE2=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST \
    -H "Content-Type: application/json" \
    -d '{"exchange":"BINANCE","api_key":"test","api_secret":"test"}' \
    http://localhost:8000/connections/)
STATUS2=$(echo "$RESPONSE2" | grep "HTTP_STATUS" | cut -d: -f2)
BODY2=$(echo "$RESPONSE2" | sed '/HTTP_STATUS/d')
echo "   Status: $STATUS2"
echo "   Response: $BODY2"

# Test via Nginx (HTTPS)
echo ""
echo "3. Testing POST /connections via Nginx (HTTPS)..."
RESPONSE3=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST \
    -H "Content-Type: application/json" \
    -d '{"exchange":"BINANCE","api_key":"test","api_secret":"test"}' \
    https://api.tradeeon.com/connections)
STATUS3=$(echo "$RESPONSE3" | grep "HTTP_STATUS" | cut -d: -f2)
BODY3=$(echo "$RESPONSE3" | sed '/HTTP_STATUS/d')
echo "   Status: $STATUS3"
echo "   Response: $BODY3"

# Test via Nginx with trailing slash
echo ""
echo "4. Testing POST /connections/ via Nginx (HTTPS)..."
RESPONSE4=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST \
    -H "Content-Type: application/json" \
    -d '{"exchange":"BINANCE","api_key":"test","api_secret":"test"}' \
    https://api.tradeeon.com/connections/)
STATUS4=$(echo "$RESPONSE4" | grep "HTTP_STATUS" | cut -d: -f2)
BODY4=$(echo "$RESPONSE4" | sed '/HTTP_STATUS/d')
echo "   Status: $STATUS4"
echo "   Response: $BODY4"

# Check Nginx config
echo ""
echo "5. Checking Nginx configuration..."
sudo cat /etc/nginx/sites-available/tradeeon-backend | grep -A 5 "location"

echo ""
echo "=== Summary ==="
if [ "$STATUS1" = "401" ] || [ "$STATUS2" = "401" ]; then
    echo "✅ Route works locally (returns 401 as expected)"
else
    echo "❌ Route doesn't work locally"
fi

if [ "$STATUS3" = "401" ] || [ "$STATUS4" = "401" ]; then
    echo "✅ Route works via Nginx (returns 401 as expected)"
else
    echo "❌ Route doesn't work via Nginx (returns $STATUS3 or $STATUS4)"
    echo "   This suggests an Nginx configuration issue"
fi

