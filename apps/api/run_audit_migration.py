"""
Run database migration for connection_audit_events table using Supabase REST API
"""
import os
import sys
import requests
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL", "").strip()
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip()

if not SUPABASE_URL or not SUPABASE_KEY:
    print("ERROR: Missing Supabase credentials")
    print("   Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables")
    sys.exit(1)

# Read migration file
migration_file = Path(__file__).parent.parent.parent / "infra" / "supabase" / "migrations" / "05_connection_audit_events.sql"
if not migration_file.exists():
    print(f"ERROR: Migration file not found: {migration_file}")
    sys.exit(1)

with open(migration_file, 'r', encoding='utf-8') as f:
    migration_sql = f.read()

print(f"Migration file: {migration_file}")
print("Executing migration via Supabase REST API...")

# Headers for Supabase API
headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json"
}

# Split SQL into individual statements
# Simple approach: split by semicolon and filter empty lines
statements = [s.strip() for s in migration_sql.split(';') if s.strip() and not s.strip().startswith('--')]

print(f"Found {len(statements)} SQL statements to execute")

try:
    for i, sql in enumerate(statements, 1):
        if not sql:
            continue
            
        print(f"Executing statement {i}/{len(statements)}...")
        
        # Execute SQL via Supabase REST API RPC
        response = requests.post(
            f"{SUPABASE_URL}/rest/v1/rpc/exec_sql",
            headers=headers,
            json={"sql": sql + ";"}
        )
        
        if response.status_code == 200:
            print(f"   SUCCESS: Statement {i} executed")
        elif response.status_code == 404:
            print(f"   WARNING: exec_sql RPC function not found")
            print("   This migration needs to be run manually in Supabase SQL Editor")
            print("\nSQL to execute:")
            print("=" * 80)
            print(migration_sql)
            print("=" * 80)
            sys.exit(1)
        else:
            print(f"   ERROR: Statement {i} failed: {response.status_code}")
            print(f"   Response: {response.text}")
            # Continue with other statements
    
    print("\nSUCCESS: Migration completed!")
    
except Exception as e:
    print(f"ERROR: {e}")
    import traceback
    traceback.print_exc()
    print("\nFalling back to manual execution...")
    print("\nSQL to execute in Supabase SQL Editor:")
    print("=" * 80)
    print(migration_sql)
    print("=" * 80)
    sys.exit(1)
