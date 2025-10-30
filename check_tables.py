#!/usr/bin/env python3
"""
Check which tables exist in your Supabase database.
"""

import os
import sys
from pathlib import Path

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

# Add apps directory to path
sys.path.insert(0, str(Path(__file__).parent / "apps" / "api"))

try:
    from clients.supabase_client import supabase
except ImportError:
    print("❌ Failed to import supabase client.")
    sys.exit(1)

def check_tables():
    """Check which tables exist."""
    if not supabase:
        print("❌ Supabase client not initialized.")
        print("   Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.")
        sys.exit(1)
    
    print("🔍 Checking existing tables in database...")
    print()
    
    required_tables = {
        'bots': 'Bot configurations',
        'bot_runs': 'Bot execution runs',
        'order_logs': 'Trade order history',
        'positions': 'Open positions',
        'funds': 'Account balances',
        'users': 'User profiles',
        'exchange_keys': 'Exchange API keys',
        'holdings': 'Asset holdings',
        'signals': 'Trading signals',
        'market_data_cache': 'Market data cache'
    }
    
    existing = []
    missing = []
    
    for table, description in required_tables.items():
        try:
            # Try to query the table
            result = supabase.table(table).select("*").limit(1).execute()
            existing.append(table)
            print(f"✅ {table:<25} - {description}")
        except Exception as e:
            error_msg = str(e).lower()
            if 'does not exist' in error_msg or 'relation' in error_msg or '422' in error_msg or 'not found' in error_msg:
                missing.append(table)
                print(f"❌ {table:<25} - {description} (NOT FOUND)")
            else:
                # Table exists but might have RLS or other issues
                existing.append(table)
                print(f"✅ {table:<25} - {description}")
    
    print()
    print("=" * 70)
    print(f"Summary: {len(existing)}/{len(required_tables)} tables exist")
    print("=" * 70)
    
    if missing:
        print()
        print("⚠️  Missing tables:")
        for table in missing:
            print(f"   - {table}")
        print()
        print("📋 To create missing tables:")
        print("   1. Copy content from: infra/supabase/migrations/001_initial_schema.sql")
        print("   2. Remove CREATE TABLE statements for tables that already exist")
        print("   3. Run only the missing table creation statements")
    else:
        print()
        print("✅ All required tables exist!")
        print()
        print("💡 If you got an error about existing tables, skip those CREATE statements.")

if __name__ == "__main__":
    check_tables()


