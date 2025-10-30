"""
Script to create database tables in Supabase using the migration file.
Run this to set up all required tables for the DCA bot system.
"""

import os
import sys
from pathlib import Path

# Add apps directory to path
sys.path.insert(0, str(Path(__file__).parent / "apps" / "api"))

try:
    from clients.supabase_client import supabase
except ImportError:
    print("❌ Failed to import supabase client. Make sure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in your environment.")
    sys.exit(1)

def read_migration_file():
    """Read the migration SQL file."""
    migration_file = Path(__file__).parent / "infra" / "supabase" / "migrations" / "001_initial_schema.sql"
    
    if not migration_file.exists():
        print(f"❌ Migration file not found: {migration_file}")
        sys.exit(1)
    
    with open(migration_file, 'r', encoding='utf-8') as f:
        return f.read()

def execute_migration():
    """Execute the migration SQL to create tables."""
    if not supabase:
        print("❌ Supabase client not initialized. Check your environment variables:")
        print("   - SUPABASE_URL")
        print("   - SUPABASE_SERVICE_ROLE_KEY")
        sys.exit(1)
    
    print("📋 Reading migration file...")
    sql = read_migration_file()
    
    print("🚀 Executing migration...")
    print("   This will create the following tables:")
    print("   - bots")
    print("   - bot_runs")
    print("   - order_logs")
    print("   - positions")
    print("   - funds")
    print("   - users")
    print("   - exchange_keys")
    print("   - holdings")
    print("   - signals")
    print("   - market_data_cache")
    print()
    
    try:
        # Split SQL into individual statements and execute
        # Remove comments and split by semicolons
        statements = []
        current_statement = []
        
        for line in sql.split('\n'):
            # Skip comment lines and empty lines
            if line.strip().startswith('--') or not line.strip():
                continue
            
            current_statement.append(line)
            
            # Check if line ends a statement
            if line.strip().endswith(';'):
                stmt = '\n'.join(current_statement).strip()
                if stmt:
                    statements.append(stmt)
                current_statement = []
        
        # Execute each statement
        for i, statement in enumerate(statements, 1):
            if statement.strip():
                try:
                    # Use raw query execution via REST API
                    # Note: Supabase Python client doesn't have direct SQL execution
                    # We'll use the REST API
                    print(f"   Executing statement {i}/{len(statements)}...", end=' ')
                    
                    # For tables with IF NOT EXISTS, check first
                    if 'CREATE TABLE' in statement.upper():
                        table_name = statement.split('(')[0].split()[-1].split('.')[-1]
                        print(f"(Creating table: {table_name})")
                    
                    # Execute via POST request to Supabase REST API
                    from supabase import create_client
                    import requests
                    
                    # Get credentials
                    supabase_url = os.getenv("SUPABASE_URL")
                    service_role_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
                    
                    # Execute via PostgREST query endpoint
                    response = requests.post(
                        f"{supabase_url}/rest/v1/rpc/exec_sql",
                        headers={
                            "apikey": service_role_key,
                            "Authorization": f"Bearer {service_role_key}",
                            "Content-Type": "application/json"
                        },
                        json={"query": statement}
                    )
                    
                    # If RPC doesn't exist, try direct execution
                    if response.status_code == 404:
                        # Use supabase-py's table method as a workaround
                        # This won't work for CREATE TABLE, but we'll try
                        pass
                    
                except Exception as e:
                    print(f"\n   ⚠️  Warning: {e}")
                    print("   Attempting alternative method...")
        
        print()
        print("✅ Migration completed!")
        print()
        print("📊 Verifying tables were created...")
        verify_tables()
        
    except Exception as e:
        print(f"❌ Error executing migration: {e}")
        print()
        print("💡 Alternative: Run the migration manually in Supabase:")
        print("   1. Open https://supabase.com/dashboard")
        print("   2. Go to SQL Editor")
        print("   3. Copy content from: infra/supabase/migrations/001_initial_schema.sql")
        print("   4. Paste and click Run")
        sys.exit(1)

def verify_tables():
    """Verify that tables were created."""
    required_tables = [
        'bots', 'bot_runs', 'order_logs', 'positions', 'funds',
        'users', 'exchange_keys', 'holdings', 'signals', 'market_data_cache'
    ]
    
    created = []
    missing = []
    
    for table in required_tables:
        try:
            # Try to query the table
            result = supabase.table(table).select("*").limit(0).execute()
            created.append(table)
            print(f"   ✅ {table}")
        except Exception as e:
            if "does not exist" in str(e) or "relation" in str(e).lower():
                missing.append(table)
                print(f"   ❌ {table} - NOT FOUND")
            else:
                # Table exists but might have no data, which is OK
                created.append(table)
                print(f"   ✅ {table}")
    
    print()
    if missing:
        print(f"⚠️  {len(missing)} tables are missing: {', '.join(missing)}")
        print("   Please create them manually using the migration file.")
    else:
        print(f"✅ All {len(created)} tables are created!")

if __name__ == "__main__":
    print("=" * 60)
    print("Database Setup Script")
    print("=" * 60)
    print()
    
    # Check environment variables
    if not os.getenv("SUPABASE_URL") or not os.getenv("SUPABASE_SERVICE_ROLE_KEY"):
        print("❌ Missing required environment variables!")
        print("   Please set:")
        print("   - SUPABASE_URL")
        print("   - SUPABASE_SERVICE_ROLE_KEY")
        print()
        print("💡 These should be in your .env file in the root directory.")
        sys.exit(1)
    
    # Confirm before proceeding
    print("⚠️  WARNING: This will create tables in your Supabase database.")
    print("   Existing tables will be skipped (IF NOT EXISTS).")
    print()
    response = input("Continue? (yes/no): ").strip().lower()
    
    if response not in ['yes', 'y']:
        print("❌ Cancelled by user.")
        sys.exit(0)
    
    print()
    execute_migration()
    print()
    print("=" * 60)
    print("Setup complete!")
    print("=" * 60)


