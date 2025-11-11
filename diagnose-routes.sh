#!/bin/bash

echo "=== Diagnosing Route Registration Issue ==="

# 1. Check if routes exist in code
echo "1. Checking if routes exist in container code..."
if sudo docker exec tradeeon-backend grep -q "@router.post(\"/\")" apps/api/routers/connections.py 2>/dev/null; then
    echo "   ✅ POST / route found in code"
else
    echo "   ❌ POST / route NOT found in code!"
    echo "   This means the container doesn't have latest code"
    exit 1
fi

# 2. Check if router is included in main.py
echo ""
echo "2. Checking if router is included in main.py..."
if sudo docker exec tradeeon-backend grep -q "include_router.*connections" apps/api/main.py 2>/dev/null; then
    echo "   ✅ Router is included in main.py"
    sudo docker exec tradeeon-backend grep "include_router.*connections" apps/api/main.py
else
    echo "   ❌ Router NOT included in main.py!"
    exit 1
fi

# 3. Check what routes are actually registered
echo ""
echo "3. Checking registered routes..."
REGISTERED_ROUTES=$(sudo docker exec tradeeon-backend python -c "
from apps.api.main import app
routes = [r.path for r in app.routes if 'connections' in r.path]
print('\n'.join(routes))
" 2>&1)

if [ -n "$REGISTERED_ROUTES" ]; then
    echo "   ✅ Found registered connection routes:"
    echo "$REGISTERED_ROUTES" | sed 's/^/      /'
else
    echo "   ❌ No connection routes registered!"
    echo "   This means the router import failed"
    
    # Check for import errors
    echo ""
    echo "4. Checking for import errors..."
    IMPORT_ERROR=$(sudo docker exec tradeeon-backend python -c "
try:
    from apps.api.routers import connections
    print('✅ Router import successful')
    print(f'Router: {connections.router}')
    print(f'Routes: {[r.path for r in connections.router.routes]}')
except Exception as e:
    print(f'❌ Router import failed: {e}')
    import traceback
    traceback.print_exc()
" 2>&1)
    
    echo "$IMPORT_ERROR"
fi

# 4. Check backend logs for startup errors
echo ""
echo "5. Checking backend startup logs for errors..."
sudo docker logs tradeeon-backend 2>&1 | grep -i "error\|exception\|traceback\|import" | tail -20

# 5. Test if the app can start
echo ""
echo "6. Testing if app can be imported..."
APP_TEST=$(sudo docker exec tradeeon-backend python -c "
try:
    from apps.api.main import app
    print('✅ App imported successfully')
    print(f'Total routes: {len(app.routes)}')
    print(f'Connection routes: {[r.path for r in app.routes if \"connections\" in r.path]}')
except Exception as e:
    print(f'❌ App import failed: {e}')
    import traceback
    traceback.print_exc()
" 2>&1)

echo "$APP_TEST"

echo ""
echo "=== Diagnosis Complete ==="

