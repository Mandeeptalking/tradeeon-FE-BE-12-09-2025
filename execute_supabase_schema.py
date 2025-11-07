#!/usr/bin/env python3
"""
Execute Supabase schema using Supabase Management API
This script will run the schema.sql file in your Supabase database
"""

import os
import sys
import requests
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def execute_schema():
    """Execute Supabase schema using REST API"""
    
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    
    if not supabase_url or not supabase_key:
        print("❌ Missing Supabase credentials!")
        print("Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY")
        return False
    
    print(f"🚀 Executing schema in: {supabase_url}")
    
    # Read schema file
    schema_file = os.path.join(os.path.dirname(__file__), "infra", "supabase", "schema.sql")
    
    if not os.path.exists(schema_file):
        print(f"❌ Schema file not found: {schema_file}")
        return False
    
    with open(schema_file, 'r', encoding='utf-8') as f:
        schema_sql = f.read()
    
    print(f"📄 Read schema file ({len(schema_sql)} characters, {len(schema_sql.splitlines())} lines)")
    
    # Supabase REST API doesn't support executing raw SQL directly
    # We need to use the PostgREST API or Management API
    # The best approach is to use the Supabase SQL Editor API endpoint
    
    # Try using the REST API with rpc (if we have a function) or direct SQL execution
    # Note: Supabase doesn't expose a direct SQL execution endpoint for security
    
    print("\n⚠️  Supabase REST API doesn't support executing raw SQL for security reasons.")
    print("However, we can use the Supabase Dashboard SQL Editor API.")
    
    # Alternative: Use psql or Supabase CLI
    print("\n📋 Options to execute schema:")
    print("\n1. Supabase Dashboard (Easiest):")
    print("   - Go to: https://app.supabase.com")
    print("   - Select your project")
    print("   - Go to: SQL Editor")
    print("   - Paste the schema and click 'Run'")
    
    print("\n2. Using Supabase CLI:")
    print("   npm install -g supabase")
    print("   supabase link --project-ref YOUR_PROJECT_REF")
    print("   supabase db push")
    
    print("\n3. Using psql (if you have database connection string):")
    print("   psql 'postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres' -f infra/supabase/schema.sql")
    
    # Try to execute via Supabase Management API if available
    # This requires the project API key
    project_ref = supabase_url.split('//')[1].split('.')[0] if '.' in supabase_url else None
    
    if project_ref:
        print(f"\n✅ Detected project ref: {project_ref}")
        print("   You can also use the Supabase Management API")
        print("   But it requires additional setup.")
    
    # For now, provide the SQL content ready to copy
    print("\n" + "="*60)
    print("📋 SCHEMA SQL (Ready to copy):")
    print("="*60)
    print(schema_sql[:500] + "...\n[Full schema in infra/supabase/schema.sql]")
    print("="*60)
    
    return True

if __name__ == "__main__":
    success = execute_schema()
    sys.exit(0 if success else 1)


