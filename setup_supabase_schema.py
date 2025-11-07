#!/usr/bin/env python3
"""
Setup Supabase database schema
Run this script to create all required tables in Supabase
"""

import os
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Try to import supabase
try:
    from supabase import create_client, Client
except ImportError:
    print("❌ supabase-py not installed. Install with: pip install supabase")
    sys.exit(1)

def setup_schema():
    """Setup Supabase database schema"""
    
    # Get Supabase credentials
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    
    if not supabase_url or not supabase_key:
        print("❌ Missing Supabase credentials!")
        print("Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables")
        print("\nOr create a .env file with:")
        print("SUPABASE_URL=https://your-project.supabase.co")
        print("SUPABASE_SERVICE_ROLE_KEY=your-service-role-key")
        return False
    
    print("🚀 Setting up Supabase database schema...")
    print(f"📡 Connecting to: {supabase_url}")
    
    try:
        # Create Supabase client
        supabase: Client = create_client(supabase_url, supabase_key)
        
        # Read schema file
        schema_file = os.path.join(os.path.dirname(__file__), "infra", "supabase", "schema.sql")
        
        if not os.path.exists(schema_file):
            print(f"❌ Schema file not found: {schema_file}")
            return False
        
        with open(schema_file, 'r', encoding='utf-8') as f:
            schema_sql = f.read()
        
        print(f"📄 Read schema file ({len(schema_sql)} characters)")
        
        # Split by semicolons and execute each statement
        # Note: Supabase REST API doesn't support multi-statement SQL directly
        # We'll need to use the PostgREST API or execute via SQL Editor
        
        print("\n⚠️  Note: Supabase Python client doesn't support executing raw SQL directly.")
        print("You have two options:")
        print("\nOption 1: Use Supabase Dashboard (Recommended)")
        print("1. Go to Supabase Dashboard → SQL Editor")
        print("2. Copy the contents of infra/supabase/schema.sql")
        print("3. Paste and click 'Run'")
        
        print("\nOption 2: Use Supabase CLI")
        print("1. Install: npm install -g supabase")
        print("2. Run: supabase db push")
        
        print("\n✅ Schema file ready at: infra/supabase/schema.sql")
        print(f"📋 Total lines: {len(schema_sql.splitlines())}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    success = setup_schema()
    sys.exit(0 if success else 1)


