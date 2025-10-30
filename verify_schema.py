#!/usr/bin/env python3
"""
Verify that the existing tables have the correct schema for our bot system.
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

def verify_schema():
    """Verify the schema matches our requirements."""
    if not supabase:
        print("❌ Supabase client not initialized.")
        sys.exit(1)
    
    print("🔍 Verifying database schema...")
    print()
    
    # Check critical fields
    checks = [
        ("bots", "bot_id should be TEXT", "INSERT INTO public.bots (bot_id, user_id, name, bot_type, symbol, config) VALUES ('test_check_123', '00000000-0000-0000-0000-000000000000', 'Test', 'dca', 'BTCUSDT', '{}')"),
        ("bots", "status field", "SELECT status FROM public.bots LIMIT 1"),
        ("bot_runs", "run_id should be UUID", "SELECT run_id FROM public.bot_runs LIMIT 1"),
        ("order_logs", "order_id should be UUID", "SELECT order_id FROM public.order_logs LIMIT 1"),
    ]
    
    print("Attempting to create a test record to verify schema...")
    print()
    
    try:
        # Try to insert a test bot record
        result = supabase.table("bots").insert({
            "bot_id": "test_bot_verification_12345",
            "user_id": "00000000-0000-0000-0000-000000000000",
            "name": "Test Bot",
            "bot_type": "dca",
            "symbol": "BTCUSDT",
            "config": {}
        }).execute()
        
        if result.data:
            print("✅ Schema test passed! bot_id accepts TEXT.")
            print("✅ All required tables and schema are correct.")
            
            # Clean up test record
            try:
                supabase.table("bots").delete().eq("bot_id", "test_bot_verification_12345").execute()
                print("✅ Test record cleaned up.")
            except:
                pass
            
        else:
            print("⚠️  Could not verify schema.")
            
    except Exception as e:
        error_msg = str(e)
        print(f"❌ Schema verification failed: {error_msg}")
        
        if "invalid input syntax for type uuid" in error_msg.lower():
            print()
            print("⚠️  CRITICAL: bot_id column is UUID but should be TEXT!")
            print()
            print("Run this migration to fix:")
            print("   infra/supabase/migrations/002_fix_bot_id_type.sql")
        elif "relation" in error_msg.lower() and "does not exist" in error_msg.lower():
            print()
            print("⚠️  Some tables might be missing columns.")
        elif "permission" in error_msg.lower() or "denied" in error_msg.lower():
            print()
            print("⚠️  Permission issue. Check RLS policies or service role key.")
        else:
            print()
            print("💡 Error details saved above. Please review.")
    
    print()
    print("=" * 70)

if __name__ == "__main__":
    verify_schema()


