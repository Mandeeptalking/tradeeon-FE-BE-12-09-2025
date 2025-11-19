#!/usr/bin/env python3
"""
Test script to verify bot creation flow.
This will help identify what's failing.
"""

import sys
import os

# Add paths
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'apps', 'api'))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'apps', 'bots'))

def test_imports():
    """Test all required imports."""
    print("=" * 60)
    print("TESTING IMPORTS")
    print("=" * 60)
    
    errors = []
    
    # Test 1: FastAPI
    try:
        from fastapi import APIRouter, Depends
        print("✅ FastAPI import successful")
    except ImportError as e:
        errors.append(f"❌ FastAPI: {e}")
        print(f"❌ FastAPI import failed: {e}")
    
    # Test 2: Supabase client
    try:
        from apps.api.clients.supabase_client import supabase
        print(f"✅ Supabase client import successful (enabled: {supabase is not None})")
    except ImportError as e:
        errors.append(f"❌ Supabase client: {e}")
        print(f"❌ Supabase client import failed: {e}")
    
    # Test 3: DB Service
    try:
        from db_service import db_service
        print(f"✅ DB Service import successful (enabled: {db_service.enabled if hasattr(db_service, 'enabled') else 'unknown'})")
    except ImportError as e:
        errors.append(f"❌ DB Service: {e}")
        print(f"❌ DB Service import failed: {e}")
    
    # Test 4: Alert Converter
    try:
        from alert_converter import convert_bot_entry_to_alert_conditions, convert_playbook_conditions_to_alert
        print("✅ Alert Converter import successful")
    except ImportError as e:
        errors.append(f"⚠️ Alert Converter: {e} (optional)")
        print(f"⚠️ Alert Converter import failed (optional): {e}")
    
    # Test 5: Bot Manager
    try:
        from bot_manager import bot_manager
        print("✅ Bot Manager import successful")
    except ImportError as e:
        errors.append(f"⚠️ Bot Manager: {e} (optional)")
        print(f"⚠️ Bot Manager import failed (optional): {e}")
    
    # Test 6: Auth
    try:
        from apps.api.deps.auth import get_current_user, AuthedUser
        print("✅ Auth imports successful")
    except ImportError as e:
        errors.append(f"❌ Auth: {e}")
        print(f"❌ Auth import failed: {e}")
    
    # Test 7: Errors
    try:
        from apps.api.utils.errors import TradeeonError, NotFoundError
        print("✅ Error classes import successful")
    except ImportError as e:
        errors.append(f"❌ Error classes: {e}")
        print(f"❌ Error classes import failed: {e}")
    
    print("\n" + "=" * 60)
    if errors:
        print(f"Found {len(errors)} import issues")
        for error in errors:
            print(f"  {error}")
    else:
        print("All critical imports successful!")
    print("=" * 60)
    
    return len([e for e in errors if not e.startswith("⚠️")]) == 0


def test_db_service():
    """Test database service."""
    print("\n" + "=" * 60)
    print("TESTING DATABASE SERVICE")
    print("=" * 60)
    
    try:
        from db_service import db_service
        
        if not db_service:
            print("❌ DB Service is None")
            return False
        
        if not db_service.enabled:
            print("⚠️ DB Service is disabled (Supabase not configured)")
            return False
        
        if not db_service.supabase:
            print("❌ DB Service Supabase client is None")
            return False
        
        print("✅ DB Service is properly configured")
        return True
        
    except Exception as e:
        print(f"❌ DB Service test failed: {e}")
        return False


def test_supabase_connection():
    """Test Supabase connection."""
    print("\n" + "=" * 60)
    print("TESTING SUPABASE CONNECTION")
    print("=" * 60)
    
    try:
        from apps.api.clients.supabase_client import supabase
        
        if not supabase:
            print("❌ Supabase client is None")
            return False
        
        # Try a simple query
        try:
            result = supabase.table("bots").select("bot_id").limit(1).execute()
            print("✅ Supabase connection successful")
            print(f"   Test query returned: {len(result.data) if result.data else 0} rows")
            return True
        except Exception as query_error:
            print(f"⚠️ Supabase connection test query failed: {query_error}")
            print("   This might be due to RLS policies or missing tables")
            return False
        
    except Exception as e:
        print(f"❌ Supabase connection test failed: {e}")
        return False


if __name__ == "__main__":
    print("\n" + "=" * 60)
    print("BOT CREATION DIAGNOSTIC TEST")
    print("=" * 60)
    
    imports_ok = test_imports()
    db_ok = test_db_service()
    supabase_ok = test_supabase_connection()
    
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    print(f"Imports: {'✅ OK' if imports_ok else '❌ FAILED'}")
    print(f"DB Service: {'✅ OK' if db_ok else '❌ FAILED'}")
    print(f"Supabase: {'✅ OK' if supabase_ok else '⚠️ ISSUES'}")
    
    if imports_ok and db_ok:
        print("\n✅ All critical components are working!")
        print("   Bot creation should work if backend server is running.")
    else:
        print("\n❌ Some critical components are not working.")
        print("   Please fix the issues above before creating bots.")

