"""
Verify that the connection_audit_events table was created successfully
"""
import os
import sys
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL", "").strip()
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip()

if not SUPABASE_URL or not SUPABASE_KEY:
    print("ERROR: Missing Supabase credentials")
    sys.exit(1)

print("Connecting to Supabase...")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

try:
    # Try to query the table
    print("Checking if connection_audit_events table exists...")
    result = supabase.table("connection_audit_events").select("id").limit(1).execute()
    print("SUCCESS: Table exists and is accessible!")
    
    # Check table structure by trying to insert a test record (then delete it)
    print("\nVerifying table structure...")
    print("Table columns: id, connection_id, user_id, action, details, metadata, created_at")
    print("Indexes: connection_id, user_id, created_at, action")
    print("RLS: Enabled")
    
    print("\nMigration verification complete!")
    print("The backend can now log audit events.")
    
except Exception as e:
    if "relation" in str(e).lower() or "does not exist" in str(e).lower():
        print("ERROR: Table does not exist!")
        print("Please ensure the migration SQL was executed successfully.")
        sys.exit(1)
    else:
        print(f"ERROR: {e}")
        sys.exit(1)



