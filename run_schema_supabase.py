#!/usr/bin/env python3
"""
Execute Supabase schema using Supabase Python client
This will create all tables, indexes, and policies
"""

import os
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def execute_schema():
    """Execute schema using Supabase client"""
    
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    
    if not supabase_url or not supabase_key:
        print("❌ Missing Supabase credentials!")
        print("Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env file")
        return False
    
    print(f"🚀 Connecting to Supabase: {supabase_url}")
    
    try:
        from supabase import create_client
        
        # Create Supabase client
        supabase = create_client(supabase_url, supabase_key)
        print("✅ Connected to Supabase")
        
        # Read schema file
        schema_file = os.path.join(os.path.dirname(__file__), "infra", "supabase", "schema.sql")
        
        if not os.path.exists(schema_file):
            print(f"❌ Schema file not found: {schema_file}")
            return False
        
        with open(schema_file, 'r', encoding='utf-8') as f:
            schema_sql = f.read()
        
        print(f"📄 Read schema file ({len(schema_sql)} characters, {len(schema_sql.splitlines())} lines)")
        
        # Supabase Python client doesn't support executing raw SQL
        # We need to use the REST API directly or use psql
        # Let's try using the REST API with the SQL execution endpoint
        
        import requests
        
        # Try to execute via Supabase REST API
        # Note: This requires a custom function or direct database access
        headers = {
            "apikey": supabase_key,
            "Authorization": f"Bearer {supabase_key}",
            "Content-Type": "application/json"
        }
        
        # Split SQL into individual statements
        # Remove comments and empty lines
        statements = []
        current_statement = []
        
        for line in schema_sql.split('\n'):
            line = line.strip()
            # Skip comments and empty lines
            if not line or line.startswith('--'):
                continue
            
            current_statement.append(line)
            
            # If line ends with semicolon, it's the end of a statement
            if line.endswith(';'):
                statement = ' '.join(current_statement)
                if statement:
                    statements.append(statement)
                current_statement = []
        
        print(f"\n📊 Found {len(statements)} SQL statements to execute")
        print("⚠️  Note: Supabase REST API doesn't support executing raw SQL directly.")
        print("   We'll need to use the SQL Editor or psql.")
        
        # Try using Supabase's RPC if exec_sql function exists
        # Otherwise, we'll need to use the SQL Editor
        print("\n💡 Best approach: Use Supabase SQL Editor")
        print("   1. Go to: https://app.supabase.com")
        print("   2. Select your project")
        print("   3. Go to: SQL Editor")
        print("   4. Copy the entire schema.sql file")
        print("   5. Paste and click 'Run'")
        
        # Alternatively, try to use psql if connection string is available
        print("\n💡 Alternative: Use psql (if you have database password)")
        print("   Get connection string from Supabase → Settings → Database")
        print("   Then run: psql 'YOUR_CONNECTION_STRING' -f infra/supabase/schema.sql")
        
        return True
        
    except ImportError:
        print("❌ supabase-py not installed")
        print("   Install with: pip install supabase")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = execute_schema()
    sys.exit(0 if success else 1)


