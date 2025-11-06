#!/usr/bin/env python3
"""
Execute Supabase schema - Main script
This will help you run the schema in your Supabase database
"""

import os
import sys
import requests
from dotenv import load_dotenv

load_dotenv()

def main():
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    
    if not supabase_url or not supabase_key:
        print("❌ Missing Supabase credentials in .env file!")
        print("   Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY")
        return False
    
    print(f"✅ Supabase URL: {supabase_url}")
    
    # Read schema
    schema_file = "infra/supabase/schema.sql"
    if not os.path.exists(schema_file):
        print(f"❌ Schema file not found: {schema_file}")
        return False
    
    with open(schema_file, 'r', encoding='utf-8') as f:
        schema_sql = f.read()
    
    print(f"📄 Schema file: {schema_file} ({len(schema_sql.splitlines())} lines)")
    
    # Since Supabase REST API doesn't support raw SQL execution,
    # we'll provide instructions and the SQL ready to copy
    
    print("\n" + "="*70)
    print("📋 TO EXECUTE THE SCHEMA:")
    print("="*70)
    print("\n✅ EASIEST METHOD - Supabase SQL Editor:")
    print("   1. Go to: https://app.supabase.com")
    print("   2. Select your project")
    print("   3. Click 'SQL Editor' (left sidebar)")
    print("   4. Click 'New query'")
    print("   5. Copy the entire contents of: infra/supabase/schema.sql")
    print("   6. Paste into the SQL Editor")
    print("   7. Click 'Run' (or press Ctrl+Enter)")
    print("\n✅ The schema file is ready at: infra/supabase/schema.sql")
    
    print("\n" + "="*70)
    print("📋 SCHEMA SUMMARY:")
    print("="*70)
    
    # Count tables, indexes, policies
    tables = schema_sql.count("CREATE TABLE")
    indexes = schema_sql.count("CREATE INDEX")
    policies = schema_sql.count("CREATE POLICY")
    triggers = schema_sql.count("CREATE TRIGGER")
    
    print(f"   Tables: {tables}")
    print(f"   Indexes: {indexes}")
    print(f"   RLS Policies: {policies}")
    print(f"   Triggers: {triggers}")
    
    print("\n✅ After running the schema, your database will be ready!")
    
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)

