#!/bin/bash
# Detailed Binance connectivity test

echo "=== Detailed Binance Connectivity Test ==="
echo ""

# Test 1: What IP does Binance see?
echo "1. Checking what IP Binance sees when we connect..."
echo "   Testing from backend container..."
BACKEND_IP=$(curl -s "https://api.ipify.org" --max-time 5)
echo "   Backend outbound IP: $BACKEND_IP"
echo "   Expected whitelist IP: 52.77.227.148"
if [ "$BACKEND_IP" == "52.77.227.148" ]; then
    echo "   ✅ IP matches whitelist"
else
    echo "   ❌ IP MISMATCH! Backend is using $BACKEND_IP, not 52.77.227.148"
    echo "   This is likely the problem!"
fi

# Test 2: Can we reach Binance at all?
echo ""
echo "2. Testing basic Binance API connectivity..."
PING_RESPONSE=$(curl -s "https://api.binance.com/api/v3/ping" --max-time 5)
if [ "$PING_RESPONSE" == "{}" ]; then
    echo "   ✅ Can reach Binance API (ping successful)"
else
    echo "   ❌ Cannot reach Binance API"
    echo "   Response: $PING_RESPONSE"
fi

# Test 3: Check recent backend logs for Binance requests
echo ""
echo "3. Checking backend logs for Binance API requests..."
echo "   Looking for recent connection test attempts..."
RECENT_LOGS=$(sudo docker logs tradeeon-backend 2>&1 | grep -i "binance\|spot\|futures\|-2015" | tail -20)
if [ -n "$RECENT_LOGS" ]; then
    echo "   Found recent logs:"
    echo "$RECENT_LOGS" | sed 's/^/      /'
else
    echo "   ⚠️  No recent Binance logs found"
fi

# Test 4: Check for specific error patterns
echo ""
echo "4. Analyzing error patterns..."
ERROR_2015_COUNT=$(sudo docker logs tradeeon-backend 2>&1 | grep -c "error -2015\|code.*-2015")
if [ "$ERROR_2015_COUNT" -gt 0 ]; then
    echo "   Found $ERROR_2015_COUNT instances of -2015 error"
    echo "   Latest -2015 error:"
    sudo docker logs tradeeon-backend 2>&1 | grep -i "error -2015\|code.*-2015" | tail -1 | sed 's/^/      /'
fi

# Test 5: Check if API key format is correct
echo ""
echo "5. Checking API key format in logs..."
API_KEY_IN_LOGS=$(sudo docker logs tradeeon-backend 2>&1 | grep -i "api.*key\|testing.*account" | tail -5)
if [ -n "$API_KEY_IN_LOGS" ]; then
    echo "   Found API key references:"
    echo "$API_KEY_IN_LOGS" | sed 's/^/      /'
fi

# Test 6: Test from inside Docker container
echo ""
echo "6. Testing from inside Docker container..."
CONTAINER_IP=$(sudo docker exec tradeeon-backend curl -s "https://api.ipify.org" 2>/dev/null || echo "Failed to get IP from container")
if [ "$CONTAINER_IP" != "Failed to get IP from container" ]; then
    echo "   Container outbound IP: $CONTAINER_IP"
    if [ "$CONTAINER_IP" == "52.77.227.148" ]; then
        echo "   ✅ Container IP matches whitelist"
    else
        echo "   ❌ Container IP ($CONTAINER_IP) does NOT match whitelist (52.77.227.148)"
    fi
else
    echo "   ⚠️  Could not test from inside container (curl might not be installed)"
fi

# Test 7: Check Lightsail instance IP
echo ""
echo "7. Checking Lightsail instance public IP..."
INSTANCE_IP=$(curl -s "http://169.254.169.254/latest/meta-data/public-ipv4" 2>/dev/null || echo "Not available")
if [ "$INSTANCE_IP" != "Not available" ]; then
    echo "   Lightsail instance public IP: $INSTANCE_IP"
    if [ "$INSTANCE_IP" == "52.77.227.148" ]; then
        echo "   ✅ Instance IP matches expected static IP"
    else
        echo "   ⚠️  Instance IP ($INSTANCE_IP) differs from static IP (52.77.227.148)"
        echo "   Note: Static IP should be used for outbound connections"
    fi
fi

echo ""
echo "=== Summary ==="
echo "If backend IP ($BACKEND_IP) does NOT match 52.77.227.148:"
echo "  1. Add $BACKEND_IP to Binance IP whitelist"
echo "  2. OR check why backend is not using static IP 52.77.227.148"
echo ""
echo "If IP matches but still getting -2015:"
echo "  1. API key might be revoked/restricted"
echo "  2. Wait a few minutes for IP whitelist to propagate"
echo "  3. Check API key permissions in Binance"
echo "  4. Try creating a new API key"

