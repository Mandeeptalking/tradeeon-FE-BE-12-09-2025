#!/usr/bin/env python3
"""
Simple script to run the database migration using the Supabase Python client.
This will execute the SQL migration file to create all required tables.
"""

import os
import sys
from pathlib import Path
from supabase import create_client

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

def run_migration():
    """Run the database migration."""
    print("=" * 70)
    print("Database Migration Script")
    print("=" * 70)
    print()
    
    # Get credentials
    supabase_url = os.getenv("SUPABASE_URL")
    service_role_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    
    if not supabase_url or not service_role_key:
        print("❌ Missing required environment variables!")
        print()
        print("Required:")
        print("  - SUPABASE_URL")
        print("  - SUPABASE_SERVICE_ROLE_KEY")
        print()
        print("These should be in your .env file in the root directory.")
        sys.exit(1)
    
    # Read migration file
    migration_file = Path(__file__).parent / "infra" / "supabase" / "migrations" / "001_initial_schema.sql"
    
    if not migration_file.exists():
        print(f"❌ Migration file not found: {migration_file}")
        sys.exit(1)
    
    print(f"📋 Reading migration file: {migration_file}")
    with open(migration_file, 'r') as f:
        sql = f.read()
    
    print()
    print("⚠️  This will create tables in your Supabase database.")
    print("   Existing tables with the same name will cause errors.")
    print()
    response = input("Continue? (yes/no): ").strip().lower()
    
    if response not in ['yes', 'y']:
        print("❌ Cancelled.")
        sys.exit(0)
    
    print()
    print("🚀 Executing migration...")
    print()
    
    try:
        # Create Supabase client
        supabase = create_client(supabase_url, service_role_key)
        
        # Note: The Supabase Python client doesn't have direct SQL execution
        # We need to use the REST API with requests library
        import requests
        
        headers = {
            "apikey": service_role_key,
            "Authorization": f"Bearer {service_role_key}",
            "Content-Type": "application/json"
        }
        
        # Try executing via REST API
        # Most Supabase instances have a custom RPC function for SQL execution
        # If not available, we'll provide manual instructions
        
        print("   Attempting to execute via Supabase REST API...")
        
        # Try different endpoints
        endpoints = [
            f"{supabase_url}/rest/v1/rpc/exec_sql",
            f"{supabase_url}/rest/v1/rpc/execute_sql",
            f"{supabase_url}/rest/v1/rpc/pg_execute",
        ]
        
        executed = False
        for endpoint in endpoints:
            try:
                print(f"   Trying {endpoint}...", end=' ')
                response = requests.post(
                    endpoint,
                    headers=headers,
                    json={"query": sql, "params": {}},
                    timeout=30
                )
                
                if response.status_code == 200:
                    print("✅ Success!")
                    executed = True
                    break
                else:
                    print(f"❌ Failed (status: {response.status_code})")
                    if response.status_code == 404:
                        continue
                    else:
                        print(f"   Error: {response.text[:200]}")
            except Exception as e:
                print(f"❌ Error: {str(e)[:100]}")
                continue
        
        if not executed:
            print()
            print("⚠️  Could not execute SQL automatically.")
            print()
            print("Please run the migration manually:")
            print()
            print("1. Open your Supabase Dashboard:")
            print(f"   https://supabase.com/dashboard/project/_/sql/new")
            print()
            print("2. Copy the SQL from this file:")
            print(f"   {migration_file}")
            print()
            print("3. Paste it in the SQL Editor and click 'Run'")
            print()
            sys.exit(1)
        
        print()
        print("✅ Migration completed!")
        print()
        print("📊 Verifying tables...")
        
        # Verify tables exist
        required_tables = ['bots', 'bot_runs', 'order_logs', 'positions', 'funds']
        verified = []
        
        for table in required_tables:
            try:
                # Try to query the table
                result = supabase.table(table).select("*").limit(1).execute()
                verified.append(table)
                print(f"   ✅ {table}")
            except Exception as e:
                if 'does not exist' in str(e) or 'relation' in str(e).lower():
                    print(f"   ❌ {table} - NOT FOUND")
                else:
                    # Other error (e.g., RLS) means table exists
                    verified.append(table)
                    print(f"   ✅ {table}")
        
        print()
        if len(verified) == len(required_tables):
            print(f"✅ All {len(verified)} tables are created!")
        else:
            print(f"⚠️  Only {len(verified)}/{len(required_tables)} tables found.")
            print("   Please verify manually in Supabase Dashboard.")
        
    except Exception as e:
        print()
        print(f"❌ Error: {e}")
        print()
        print("Please run the migration manually in Supabase Dashboard.")
        sys.exit(1)
    
    print()
    print("=" * 70)
    print("Done!")
    print("=" * 70)

if __name__ == "__main__":
    run_migration()


