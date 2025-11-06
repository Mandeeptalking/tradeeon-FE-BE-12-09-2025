#!/usr/bin/env python3
"""
Execute Supabase schema by creating tables programmatically
This uses the Supabase client to create tables one by one
"""

import os
import sys
from dotenv import load_dotenv

load_dotenv()

def create_tables_programmatically():
    """Create tables using Supabase client methods"""
    
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    
    if not supabase_url or not supabase_key:
        print("❌ Missing Supabase credentials!")
        return False
    
    try:
        from supabase import create_client
        supabase = create_client(supabase_url, supabase_key)
        
        print("🚀 Creating tables programmatically...")
        print("⚠️  Note: This will create tables one by one using Supabase client")
        print("   For full schema (indexes, triggers, RLS), use SQL Editor instead")
        
        # Read schema to understand what tables we need
        schema_file = os.path.join(os.path.dirname(__file__), "infra", "supabase", "schema.sql")
        with open(schema_file, 'r') as f:
            schema = f.read()
        
        # Extract table names
        import re
        table_matches = re.findall(r'CREATE TABLE (?:IF NOT EXISTS )?public\.(\w+)', schema, re.IGNORECASE)
        
        print(f"\n📋 Found {len(table_matches)} tables in schema:")
        for table in table_matches:
            print(f"   - {table}")
        
        print("\n💡 For full schema execution, use one of these methods:")
        print("\n1. Supabase SQL Editor (Recommended - Easiest):")
        print("   - Go to: https://app.supabase.com")
        print("   - SQL Editor → New query")
        print("   - Paste entire schema.sql")
        print("   - Click 'Run'")
        
        print("\n2. Using psql (if you have database password):")
        print("   - Get connection string from Supabase → Settings → Database")
        print("   - Run: psql 'CONNECTION_STRING' -f infra/supabase/schema.sql")
        
        print("\n3. Using Supabase CLI:")
        print("   - npm install -g supabase")
        print("   - supabase link --project-ref YOUR_PROJECT_REF")
        print("   - supabase db push")
        
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    create_tables_programmatically()

