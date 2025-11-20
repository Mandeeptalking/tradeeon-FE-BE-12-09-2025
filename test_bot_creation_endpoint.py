#!/usr/bin/env python3
"""
Test script to simulate bot creation and find the exact error.
"""

import sys
import os

# Add paths
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'apps', 'api'))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'apps', 'bots'))

print("=" * 60)
print("TESTING BOT CREATION ENDPOINT")
print("=" * 60)

# Test 1: Import the router
print("\n1. Testing router import...")
try:
    from apps.api.routers import bots
    print("   ✅ Router imported successfully")
except Exception as e:
    print(f"   ❌ Router import failed: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# Test 2: Check if create_dca_bot function exists
print("\n2. Testing create_dca_bot function...")
try:
    func = bots.create_dca_bot
    print("   ✅ Function exists")
except Exception as e:
    print(f"   ❌ Function not found: {e}")
    sys.exit(1)

# Test 3: Try to import all dependencies that might be used
print("\n3. Testing all imports that might be used...")

imports_to_test = [
    ("alert_converter", "from alert_converter import convert_bot_entry_to_alert_conditions"),
    ("db_service", "from db_service import db_service"),
    ("condition_registry", "from apps.api.routers.condition_registry import normalize_condition"),
    ("supabase", "from apps.api.clients.supabase_client import supabase"),
    ("bot_action_handler", "from bot_action_handler import execute_bot_action"),
]

for name, import_stmt in imports_to_test:
    try:
        # Add bots path for relative imports
        bots_path = os.path.join(os.path.dirname(__file__), 'apps', 'bots')
        if bots_path not in sys.path:
            sys.path.insert(0, bots_path)
        
        exec(import_stmt)
        print(f"   ✅ {name} imported successfully")
    except ImportError as e:
        print(f"   ⚠️  {name} import failed (might be optional): {e}")
    except Exception as e:
        print(f"   ❌ {name} import error: {e}")

# Test 4: Check if apps.api.modules.bots exists (this should NOT exist)
print("\n4. Testing if apps.api.modules.bots exists (should fail)...")
try:
    from apps.api.modules.bots import something
    print("   ❌ apps.api.modules.bots EXISTS - this is wrong!")
except ImportError as e:
    if "No module named 'apps.api.modules.bots'" in str(e):
        print("   ✅ apps.api.modules.bots does not exist (correct)")
    else:
        print(f"   ⚠️  Different import error: {e}")

# Test 5: Simulate what happens when extract_conditions_from_dca_config is called
print("\n5. Testing extract_conditions_from_dca_config...")
try:
    test_config = {
        "botName": "Test Bot",
        "selectedPairs": ["BTCUSDT"],
        "conditionConfig": {
            "mode": "simple",
            "condition": {
                "indicator": "RSI",
                "timeframe": "1h",
                "operator": "less_than",
                "value": 30
            }
        }
    }
    conditions = bots.extract_conditions_from_dca_config(test_config, "BTCUSDT")
    print(f"   ✅ extract_conditions_from_dca_config works: {len(conditions)} conditions")
except Exception as e:
    print(f"   ❌ extract_conditions_from_dca_config failed: {e}")
    import traceback
    traceback.print_exc()

# Test 6: Check if register_condition_via_api can be called
print("\n6. Testing register_condition_via_api...")
try:
    # This is async, so we can't call it directly, but we can check if it exists
    func = bots.register_condition_via_api
    print("   ✅ register_condition_via_api function exists")
except Exception as e:
    print(f"   ❌ register_condition_via_api not found: {e}")

# Test 7: Check dispatch.py import
print("\n7. Testing dispatch.py import...")
try:
    from apps.api.modules.alerts import dispatch
    print("   ✅ dispatch module imported")
    
    # Check if it has the fixed import
    import inspect
    source = inspect.getsource(dispatch.handle_alert_action)
    if "apps.api.modules.bots" in source:
        print("   ❌ dispatch.py still has old import path!")
    else:
        print("   ✅ dispatch.py has correct import path")
except Exception as e:
    print(f"   ❌ dispatch import failed: {e}")
    import traceback
    traceback.print_exc()

print("\n" + "=" * 60)
print("TEST COMPLETE")
print("=" * 60)

