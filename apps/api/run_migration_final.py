"""
Execute migration using Supabase Python client
"""
import os
import sys
from pathlib import Path
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL", "").strip()
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip()

if not SUPABASE_URL or not SUPABASE_KEY:
    print("ERROR: Missing Supabase credentials")
    sys.exit(1)

migration_file = Path(__file__).parent.parent.parent / "infra" / "supabase" / "migrations" / "05_connection_audit_events.sql"
with open(migration_file, 'r', encoding='utf-8') as f:
    migration_sql = f.read()

print("Creating Supabase client...")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# Split SQL into statements
statements = []
current_statement = []
for line in migration_sql.split('\n'):
    line = line.strip()
    if not line or line.startswith('--'):
        continue
    current_statement.append(line)
    if line.endswith(';'):
        stmt = ' '.join(current_statement)
        if stmt:
            statements.append(stmt)
        current_statement = []

print(f"Found {len(statements)} SQL statements")

# Try to execute via Supabase REST API using table operations
# Since we can't execute DDL directly, we'll create the table structure manually
try:
    print("\nAttempting to create table structure...")
    
    # Check if table already exists
    try:
        result = supabase.table("connection_audit_events").select("id").limit(1).execute()
        print("Table already exists!")
        sys.exit(0)
    except Exception:
        # Table doesn't exist, need to create it
        pass
    
    # Since Supabase Python client doesn't support DDL, we need to use psql or SQL Editor
    print("\nSupabase Python client doesn't support DDL operations directly.")
    print("Please run this migration in Supabase SQL Editor:")
    print(f"\n1. Go to: {SUPABASE_URL.replace('https://', 'https://app.supabase.com/project/').replace('.supabase.co', '/sql')}")
    print("2. Open SQL Editor")
    print("3. Copy and paste the SQL below:")
    print("\n" + "="*80)
    print(migration_sql)
    print("="*80)
    
    # Try alternative: Use requests to call Management API
    import requests
    project_ref = SUPABASE_URL.replace("https://", "").replace(".supabase.co", "")
    
    # Try Management API endpoint (requires different auth)
    print("\nTrying Management API...")
    mgmt_response = requests.post(
        f"https://api.supabase.com/v1/projects/{project_ref}/database/query",
        headers={
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "Content-Type": "application/json"
        },
        json={"query": migration_sql}
    )
    
    if mgmt_response.status_code == 200:
        print("SUCCESS: Migration executed via Management API!")
    else:
        print(f"Management API failed: {mgmt_response.status_code}")
        print("Please run migration manually in Supabase SQL Editor")
        sys.exit(1)
        
except Exception as e:
    print(f"ERROR: {e}")
    print("\nPlease run migration manually in Supabase SQL Editor")
    sys.exit(1)



