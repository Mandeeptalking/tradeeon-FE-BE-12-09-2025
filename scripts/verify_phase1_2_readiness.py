#!/usr/bin/env python3
"""
Verification script for Phase 1.2 readiness.
Checks if everything is set up correctly before running tests.
"""

import os
import sys
import importlib.util
from pathlib import Path

def check_file_exists(filepath: str) -> tuple[bool, str]:
    """Check if a file exists."""
    path = Path(filepath)
    if path.exists():
        return True, f"[OK] {filepath}"
    return False, f"[FAIL] {filepath} (missing)"

def check_import(module_name: str) -> tuple[bool, str]:
    """Check if a module can be imported."""
    try:
        __import__(module_name)
        return True, f"[OK] {module_name}"
    except ImportError as e:
        return False, f"[FAIL] {module_name} - {str(e)}"

def check_api_router() -> tuple[bool, str]:
    """Check if condition_registry router exists and has required functions."""
    try:
        # Add project root to path
        project_root = Path(__file__).parent.parent
        api_path = project_root / "apps" / "api"
        if str(api_path) not in sys.path:
            sys.path.insert(0, str(api_path))
        if str(project_root) not in sys.path:
            sys.path.insert(0, str(project_root))
        
        # Try to import
        try:
            from apps.api.routers import condition_registry
        except ImportError:
            # Alternative: check file directly
            router_file = project_root / "apps" / "api" / "routers" / "condition_registry.py"
            if not router_file.exists():
                return False, "[FAIL] Router file not found"
            
            # Read file and check for functions
            content = router_file.read_text(encoding='utf-8', errors='ignore')
            required_functions = [
                "def normalize_condition",
                "def hash_condition",
                "def register_condition",
                "def subscribe_bot_to_condition",
                "def get_condition_status",
                "def get_user_subscriptions",
                "def get_condition_stats"
            ]
            
            missing = [f for f in required_functions if f not in content]
            if missing:
                return False, f"[FAIL] Missing functions in router file"
            
            if "router = APIRouter" not in content:
                return False, "[FAIL] Router not defined in file"
            
            return True, "[OK] Condition registry router file is complete"
        
        required_functions = [
            "normalize_condition",
            "hash_condition",
            "register_condition",
            "subscribe_bot_to_condition",
            "get_condition_status",
            "get_user_subscriptions",
            "get_condition_stats"
        ]
        
        missing = []
        for func_name in required_functions:
            if not hasattr(condition_registry, func_name):
                missing.append(func_name)
        
        if missing:
            return False, f"[FAIL] Missing functions: {', '.join(missing)}"
        
        # Check if router is defined
        if not hasattr(condition_registry, "router"):
            return False, "[FAIL] Router not defined"
        
        return True, "[OK] Condition registry router is complete"
    except Exception as e:
        return False, f"[FAIL] Error checking router: {str(e)}"

def check_main_integration() -> tuple[bool, str]:
    """Check if condition_registry is integrated into main.py."""
    main_path = Path(__file__).parent.parent / "apps" / "api" / "main.py"
    if not main_path.exists():
        return False, "[FAIL] main.py not found"
    
    try:
        content = main_path.read_text(encoding='utf-8')
    except UnicodeDecodeError:
        # Try with error handling
        content = main_path.read_text(encoding='utf-8', errors='ignore')
    
    checks = [
        ("condition_registry" in content, "condition_registry imported"),
        ("app.include_router(condition_registry.router" in content, "router included"),
    ]
    
    failed = [msg for passed, msg in checks if not passed]
    if failed:
        return False, f"[FAIL] Integration issues: {', '.join(failed)}"
    
    return True, "[OK] Condition registry integrated in main.py"

def check_migration_file() -> tuple[bool, str]:
    """Check if migration file exists and has required tables."""
    migration_path = Path(__file__).parent.parent / "infra" / "supabase" / "migrations" / "06_condition_registry.sql"
    if not migration_path.exists():
        return False, "[FAIL] Migration file not found"
    
    try:
        content = migration_path.read_text(encoding='utf-8')
    except UnicodeDecodeError:
        content = migration_path.read_text(encoding='utf-8', errors='ignore')
    
    required_tables = [
        "condition_registry",
        "user_condition_subscriptions",
        "condition_evaluation_cache",
        "condition_triggers"
    ]
    
    missing = [table for table in required_tables if f"CREATE TABLE" not in content or table not in content]
    if missing:
        return False, f"[FAIL] Missing tables in migration: {', '.join(missing)}"
    
    # Check for RLS policies
    if "ROW LEVEL SECURITY" not in content:
        return False, "[FAIL] RLS policies not defined"
    
    return True, "[OK] Migration file is complete"

def check_test_script() -> tuple[bool, str]:
    """Check if test script exists and has required functions."""
    test_path = Path(__file__).parent / "test_condition_registry.py"
    if not test_path.exists():
        return False, "[FAIL] Test script not found"
    
    try:
        content = test_path.read_text(encoding='utf-8')
    except UnicodeDecodeError:
        content = test_path.read_text(encoding='utf-8', errors='ignore')
    
    required_functions = [
        "test_register_condition",
        "test_register_price_condition",
        "test_subscribe_bot",
        "test_get_condition_status",
        "test_get_stats",
        "test_deduplication"
    ]
    
    missing = [func for func in required_functions if f"def {func}" not in content]
    if missing:
        return False, f"[FAIL] Missing test functions: {', '.join(missing)}"
    
    # Check for auth support
    if "get_auth_headers" not in content:
        return False, "[FAIL] Auth support missing in test script"
    
    return True, "[OK] Test script is complete"

def check_environment_variables() -> tuple[bool, str]:
    """Check if required environment variables are documented."""
    # We don't check if they're SET (that's runtime), just if they're documented
    test_path = Path(__file__).parent / "test_condition_registry.py"
    if test_path.exists():
        try:
            content = test_path.read_text(encoding='utf-8')
        except UnicodeDecodeError:
            content = test_path.read_text(encoding='utf-8', errors='ignore')
        if "SUPABASE_JWT_TOKEN" in content and "API_BASE_URL" in content:
            return True, "[OK] Environment variables documented"
    
    return False, "[WARN] Environment variables not documented"

def main():
    """Run all checks."""
    print("Phase 1.2 Readiness Check")
    print("=" * 60)
    print()
    
    checks = [
        ("Migration File", check_migration_file()),
        ("API Router", check_api_router()),
        ("Main Integration", check_main_integration()),
        ("Test Script", check_test_script()),
        ("Environment Variables", check_environment_variables()),
    ]
    
    all_passed = True
    for name, (passed, message) in checks:
        status = "[OK]" if passed else "[FAIL]"
        print(f"{status} {name}: {message}")
        if not passed:
            all_passed = False
    
    print()
    print("=" * 60)
    if all_passed:
        print("[SUCCESS] All checks passed! Ready for testing.")
        print()
        print("Next steps:")
        print("1. Start backend: cd apps/api && uvicorn main:app --reload --port 8000")
        print("2. (Optional) Set auth token: export SUPABASE_JWT_TOKEN='your-token'")
        print("3. Run tests: python scripts/test_condition_registry.py")
    else:
        print("[ERROR] Some checks failed. Please fix the issues above.")
        sys.exit(1)

if __name__ == "__main__":
    main()

