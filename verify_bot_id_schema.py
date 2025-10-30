#!/usr/bin/env python3
"""
Verify the bot_id column accepts TEXT values (not UUID only).
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

def verify_bot_id_schema():
    """Verify bot_id accepts TEXT."""
    if not supabase:
        print("❌ Supabase client not initialized.")
        sys.exit(1)
    
    print("🔍 Verifying bot_id schema...")
    print()
    
    # Try to insert with a text ID (what our app generates)
    test_bot_id = f"dca_bot_test_{int(os.urandom(4).hex(), 16)}"
    
    print(f"Attempting to insert bot with ID: {test_bot_id}")
    print("(This should work if bot_id is TEXT)")
    print()
    
    try:
        result = supabase.table("bots").insert({
            "bot_id": test_bot_id,
            "user_id": "00000000-0000-0000-0000-000000000000",
            "name": "Test Bot Verification",
            "bot_type": "dca",
            "symbol": "BTCUSDT",
            "config": {
                "test": True
            }
        }).execute()
        
        if result.data:
            print("✅ SUCCESS! bot_id accepts TEXT values")
            print("✅ Schema is correct for application")
            print()
            
            # Verify we can query it back
            retrieved = supabase.table("bots").select("*").eq("bot_id", test_bot_id).execute()
            if retrieved.data:
                print("✅ Can retrieve bot by text ID")
            
            # Clean up
            try:
                supabase.table("bots").delete().eq("bot_id", test_bot_id).execute()
                print("✅ Test record cleaned up")
            except Exception as cleanup_error:
                print(f"⚠️  Cleanup warning: {cleanup_error}")
            
            print()
            print("=" * 70)
            print("✅ DATABASE IS FULLY READY FOR BOT OPERATIONS")
            print("=" * 70)
            
            return True
        else:
            print("❌ Insert returned no data")
            return False
            
    except Exception as e:
        error_msg = str(e)
        print(f"❌ Schema verification failed:")
        print(f"   {error_msg}")
        print()
        
        if "invalid input syntax for type uuid" in error_msg.lower():
            print("=" * 70)
            print("🔴 CRITICAL ISSUE FOUND")
            print("=" * 70)
            print()
            print("The bot_id column is UUID but should be TEXT!")
            print()
            print("Your application generates bot_id like:")
            print('  "dca_bot_1234567890"')
            print()
            print("But the database expects UUID like:")
            print('  "550e8400-e29b-41d4-a716-446655440000"')
            print()
            print("=" * 70)
            print("FIX REQUIRED")
            print("=" * 70)
            print()
            print("Run this SQL in Supabase Dashboard:")
            print("  File: infra/supabase/migrations/002_fix_bot_id_type.sql")
            print()
            return False
        else:
            print("💡 Other error - please review above")
            return False

if __name__ == "__main__":
    success = verify_bot_id_schema()
    sys.exit(0 if success else 1)


