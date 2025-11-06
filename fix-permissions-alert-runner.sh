#!/bin/bash
# Fix permissions and nested directories for alert runner build

echo "========================================"
echo "  FIXING PERMISSIONS & NESTED DIRS"
echo "========================================"
echo ""

# Step 1: Remove nested directories
echo "Step 1: Removing nested directories..."
rm -rf apps/apps apps/backend backend/backend backend/apps 2>/dev/null || true
find apps/ -type d -name 'apps' -o -name 'backend' 2>/dev/null | xargs rm -rf 2>/dev/null || true
find backend/ -type d -name 'apps' -o -name 'backend' 2>/dev/null | xargs rm -rf 2>/dev/null || true
echo "[OK] Nested directories removed"

# Step 2: Fix permissions
echo ""
echo "Step 2: Fixing permissions..."
chmod -R 755 apps/ backend/ shared/ 2>/dev/null || true
chmod 644 requirements.txt Dockerfile.alert-runner 2>/dev/null || true
echo "[OK] Permissions fixed"

# Step 3: Verify structure
echo ""
echo "Step 3: Verifying structure..."
if [ -d "apps/apps" ] || [ -d "apps/backend" ]; then
    echo "[WARNING] Still found nested directories, trying more aggressive cleanup..."
    rm -rf apps/apps apps/backend
    find . -type d -name 'apps' -path '*/apps/*' -exec rm -rf {} + 2>/dev/null || true
fi

echo ""
echo "Verification:"
ls -la apps/ | head -10
echo ""
ls -la backend/ | head -10

echo ""
echo "========================================"
echo "  CLEANUP COMPLETE!"
echo "========================================"
echo ""
echo "Now try building:"
echo "  docker build -f Dockerfile.alert-runner -t tradeeon-alert-runner:latest ."
echo ""


