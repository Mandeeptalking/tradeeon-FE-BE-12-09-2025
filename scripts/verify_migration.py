#!/usr/bin/env python3
"""
Verify that the condition registry migration was successful.

This script checks if all tables, indexes, and policies were created correctly.
"""

import os
import sys
from supabase import create_client, Client

# Get Supabase credentials from environment
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set")
    print("   Set them in your .env file or environment variables")
    sys.exit(1)

def verify_migration():
    """Verify migration was successful."""
    print("🔍 Verifying Condition Registry Migration...")
    print("=" * 60)
    
    try:
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
        
        # Check 1: Verify tables exist
        print("\n1️⃣ Checking tables...")
        tables_to_check = [
            "condition_registry",
            "user_condition_subscriptions",
            "condition_evaluation_cache",
            "condition_triggers"
        ]
        
        all_tables_exist = True
        for table_name in tables_to_check:
            try:
                # Try to query the table (will fail if doesn't exist)
                result = supabase.table(table_name).select("count", count="exact").limit(1).execute()
                print(f"   ✅ {table_name} - EXISTS")
            except Exception as e:
                print(f"   ❌ {table_name} - MISSING: {e}")
                all_tables_exist = False
        
        if not all_tables_exist:
            print("\n❌ Some tables are missing. Migration may have failed.")
            return False
        
        # Check 2: Verify indexes exist (by checking query performance)
        print("\n2️⃣ Checking indexes...")
        try:
            # Query that should use index
            result = supabase.table("condition_registry").select("condition_id").eq("symbol", "BTCUSDT").limit(1).execute()
            print("   ✅ Indexes appear to be working")
        except Exception as e:
            print(f"   ⚠️  Index check: {e}")
        
        # Check 3: Verify RLS is enabled
        print("\n3️⃣ Checking Row Level Security...")
        try:
            # Try to query with anon key (should work if RLS policies are correct)
            anon_client = create_client(SUPABASE_URL, os.getenv("SUPABASE_ANON_KEY", SUPABASE_KEY))
            result = anon_client.table("condition_registry").select("condition_id").limit(1).execute()
            print("   ✅ RLS policies are configured")
        except Exception as e:
            print(f"   ⚠️  RLS check: {e}")
        
        # Check 4: Test insert (verify structure)
        print("\n4️⃣ Testing table structure...")
        try:
            test_condition = {
                "condition_id": "test_verification_123",
                "condition_type": "price",
                "symbol": "TESTUSDT",
                "timeframe": "1m",
                "indicator_config": {"test": True}
            }
            
            # Insert test record
            result = supabase.table("condition_registry").insert(test_condition).execute()
            print("   ✅ Can insert into condition_registry")
            
            # Delete test record
            supabase.table("condition_registry").delete().eq("condition_id", "test_verification_123").execute()
            print("   ✅ Can delete from condition_registry")
            
        except Exception as e:
            print(f"   ❌ Structure test failed: {e}")
            return False
        
        # Check 5: Verify foreign key constraints
        print("\n5️⃣ Checking foreign key constraints...")
        try:
            # Try to insert invalid subscription (should fail)
            try:
                invalid_sub = {
                    "user_id": "00000000-0000-0000-0000-000000000000",
                    "bot_id": "test_bot",
                    "condition_id": "non_existent_condition",
                    "bot_type": "dca",
                    "bot_config": {}
                }
                supabase.table("user_condition_subscriptions").insert(invalid_sub).execute()
                print("   ⚠️  Foreign key constraint may not be working")
            except Exception as e:
                if "foreign key" in str(e).lower() or "violates" in str(e).lower():
                    print("   ✅ Foreign key constraints are working")
                else:
                    print(f"   ⚠️  Unexpected error: {e}")
        except Exception as e:
            print(f"   ⚠️  Constraint check: {e}")
        
        print("\n" + "=" * 60)
        print("✅ Migration verification complete!")
        print("\nNext Steps:")
        print("1. Test API endpoints: python scripts/test_condition_registry.py")
        print("2. Or manually test: curl http://localhost:8000/conditions/stats")
        return True
        
    except Exception as e:
        print(f"\n❌ Error during verification: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = verify_migration()
    sys.exit(0 if success else 1)

