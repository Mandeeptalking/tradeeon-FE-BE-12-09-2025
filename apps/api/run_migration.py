"""
Run database migration for connection_audit_events table
"""
import os
import sys
from pathlib import Path
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL", "").strip()
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip()

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ Missing Supabase credentials")
    print("   Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables")
    sys.exit(1)

# Read migration file
migration_file = Path(__file__).parent.parent.parent / "infra" / "supabase" / "migrations" / "05_connection_audit_events.sql"
if not migration_file.exists():
    print(f"❌ Migration file not found: {migration_file}")
    sys.exit(1)

with open(migration_file, 'r') as f:
    migration_sql = f.read()

print(f"📄 Migration file: {migration_file}")
print(f"📝 Running migration...")

try:
    # Create Supabase client
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    # Split SQL into individual statements (simple approach)
    # Note: Supabase REST API doesn't support multi-statement SQL directly
    # We'll need to execute via RPC or use psql
    
    # For now, let's try using the REST API with a function call
    # But actually, Supabase Python client doesn't have direct SQL execution
    # We need to use the PostgREST RPC or execute via psql
    
    print("⚠️  Supabase Python client doesn't support direct SQL execution")
    print("   Please run this migration manually in Supabase SQL Editor:")
    print(f"\n   File: {migration_file}")
    print("\n   Or use psql:")
    print(f"   psql \"{SUPABASE_URL.replace('https://', 'postgresql://postgres:').replace('.supabase.co', '@db.')}.supabase.co:5432/postgres\" -f {migration_file}")
    
    # Alternative: Try to execute via Supabase REST API RPC
    # But we'd need a custom function for that
    
    print("\n✅ Migration SQL prepared. Please execute it in Supabase SQL Editor.")
    print("\nSQL to execute:")
    print("=" * 80)
    print(migration_sql)
    print("=" * 80)
    
except Exception as e:
    print(f"❌ Error: {e}")
    sys.exit(1)



