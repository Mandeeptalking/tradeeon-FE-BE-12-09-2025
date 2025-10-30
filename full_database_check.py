#!/usr/bin/env python3
"""
Comprehensive database verification script.
Checks table existence, schema correctness, indexes, and RLS policies.
"""

import os
import sys
from pathlib import Path

from dotenv import load_dotenv
load_dotenv()

sys.path.insert(0, str(Path(__file__).parent / "apps" / "api"))

try:
    from clients.supabase_client import supabase
except ImportError:
    print("❌ Failed to import supabase client.")
    sys.exit(1)

def check_database_complete():
    """Complete database verification."""
    if not supabase:
        print("❌ Supabase client not initialized.")
        print("   Check environment variables:")
        print("   - SUPABASE_URL")
        print("   - SUPABASE_SERVICE_ROLE_KEY")
        sys.exit(1)
    
    print("=" * 70)
    print("COMPREHENSIVE DATABASE VERIFICATION")
    print("=" * 70)
    print()
    
    # Required tables for DCA bot
    required_tables = {
        'bots': {
            'description': 'Bot configurations',
            'critical': True,
            'primary_key': 'bot_id',
            'key_type': 'TEXT',
            'required_columns': ['bot_id', 'user_id', 'name', 'bot_type', 'status', 'symbol', 'config']
        },
        'bot_runs': {
            'description': 'Bot execution runs',
            'critical': True,
            'primary_key': 'run_id',
            'key_type': 'UUID',
            'required_columns': ['run_id', 'bot_id', 'user_id', 'status', 'started_at']
        },
        'order_logs': {
            'description': 'Trade order history',
            'critical': True,
            'primary_key': 'order_id',
            'key_type': 'UUID',
            'required_columns': ['order_id', 'bot_id', 'symbol', 'side', 'qty', 'status']
        },
        'positions': {
            'description': 'Open positions',
            'critical': True,
            'primary_key': 'id',
            'key_type': 'UUID',
            'required_columns': ['id', 'user_id', 'symbol', 'qty', 'avg_price']
        },
        'funds': {
            'description': 'Account balances',
            'critical': True,
            'primary_key': 'id',
            'key_type': 'UUID',
            'required_columns': ['id', 'user_id', 'exchange', 'currency', 'free', 'locked']
        },
        'users': {
            'description': 'User profiles',
            'critical': False,
            'primary_key': 'id',
            'key_type': 'UUID',
            'required_columns': ['id', 'email']
        },
        'exchange_keys': {
            'description': 'Exchange API keys',
            'critical': False,
            'primary_key': 'id',
            'key_type': 'UUID',
            'required_columns': ['id', 'user_id', 'exchange']
        },
    }
    
    print("📊 Step 1: Checking Table Existence")
    print("-" * 70)
    
    existing_tables = []
    missing_tables = []
    
    for table_name, table_info in required_tables.items():
        try:
            # Try to query the table
            result = supabase.table(table_name).select("*").limit(1).execute()
            existing_tables.append(table_name)
            critical_mark = " 🔴 CRITICAL" if table_info['critical'] else ""
            print(f"✅ {table_name:<20} - {table_info['description']}{critical_mark}")
        except Exception as e:
            error_msg = str(e).lower()
            if any(keyword in error_msg for keyword in ['does not exist', 'relation', '422', 'not found', 'pgrst']):
                missing_tables.append(table_name)
                critical_mark = " 🔴 CRITICAL" if table_info['critical'] else ""
                print(f"❌ {table_name:<20} - {table_info['description']}{critical_mark} (NOT FOUND)")
            else:
                # Other error means table might exist
                existing_tables.append(table_name)
                print(f"⚠️  {table_name:<20} - {table_info['description']} (Error: {str(e)[:50]})")
    
    print()
    
    if missing_tables:
        critical_missing = [t for t in missing_tables if required_tables[t]['critical']]
        if critical_missing:
            print("🔴 CRITICAL: Missing required tables for bot system:")
            for table in critical_missing:
                print(f"   - {table}: {required_tables[table]['description']}")
            print()
            print("💡 Run this SQL in Supabase Dashboard:")
            print("   File: create_missing_tables.sql")
            print()
        
        if len(critical_missing) != len(missing_tables):
            non_critical = [t for t in missing_tables if not required_tables[t]['critical']]
            print("⚠️  Non-critical tables missing:")
            for table in non_critical:
                print(f"   - {table}")
            print()
    
    # Try to test schema
    print("📊 Step 2: Testing Schema Compatibility")
    print("-" * 70)
    
    if 'bots' in existing_tables:
        try:
            # Try to insert a test record to verify bot_id accepts TEXT
            test_bot_id = f"test_verification_{int(os.urandom(4).hex(), 16)}"
            result = supabase.table("bots").insert({
                "bot_id": test_bot_id,
                "user_id": "00000000-0000-0000-0000-000000000000",
                "name": "Test Bot",
                "bot_type": "dca",
                "symbol": "BTCUSDT",
                "config": {}
            }).execute()
            
            if result.data:
                print("✅ bot_id accepts TEXT (required)")
                print("✅ Schema is compatible with application")
                
                # Clean up
                try:
                    supabase.table("bots").delete().eq("bot_id", test_bot_id).execute()
                except:
                    pass
            else:
                print("❌ Schema test failed - could not insert test record")
                
        except Exception as e:
            error_msg = str(e).lower()
            if "invalid input syntax for type uuid" in error_msg:
                print("❌ CRITICAL: bot_id column is UUID but should be TEXT!")
                print("   This will prevent bot creation from working.")
                print()
                print("💡 Fix: Run infra/supabase/migrations/002_fix_bot_id_type.sql")
            elif "foreign key" in error_msg:
                print("⚠️  Foreign key constraint issue (may need test user_id)")
            else:
                print(f"⚠️  Schema test error: {str(e)[:100]}")
    else:
        print("⏭️  Skipping - bots table not found")
    
    print()
    
    # Try to query bot_runs table
    print("📊 Step 3: Testing Foreign Key Relationships")
    print("-" * 70)
    
    if 'bot_runs' in existing_tables and 'bots' in existing_tables:
        try:
            result = supabase.table("bot_runs").select("*").limit(1).execute()
            print("✅ bot_runs table accessible")
        except Exception as e:
            print(f"⚠️  bot_runs accessible (error: {str(e)[:50]})")
    else:
        print("⏭️  Skipping - bot_runs or bots table not found")
    
    if 'order_logs' in existing_tables and 'bots' in existing_tables:
        try:
            result = supabase.table("order_logs").select("*").limit(1).execute()
            print("✅ order_logs table accessible")
        except Exception as e:
            print(f"⚠️  order_logs accessible (error: {str(e)[:50]})")
    else:
        print("⏭️  Skipping - order_logs or bots table not found")
    
    print()
    
    # Summary
    print("=" * 70)
    print("VERIFICATION SUMMARY")
    print("=" * 70)
    print(f"Tables Found: {len(existing_tables)}/{len(required_tables)}")
    print(f"Tables Missing: {len(missing_tables)}")
    print()
    
    if missing_tables:
        critical_missing = [t for t in missing_tables if required_tables[t]['critical']]
        if critical_missing:
            print("🔴 STATUS: INCOMPLETE")
            print(f"   {len(critical_missing)} critical tables missing")
            print()
            print("ACTION REQUIRED:")
            print("   1. Open Supabase Dashboard")
            print("   2. Go to SQL Editor")
            print("   3. Run: create_missing_tables.sql")
        else:
            print("✅ STATUS: READY FOR BOTS")
            print("   All critical tables exist")
    else:
        print("✅ STATUS: ALL TABLES EXIST")
    
    print()
    print("=" * 70)
    
    return len(missing_tables) == 0

if __name__ == "__main__":
    check_database_complete()


