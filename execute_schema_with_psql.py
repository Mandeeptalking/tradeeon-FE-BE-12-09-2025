#!/usr/bin/env python3
"""
Execute Supabase schema using psql (PostgreSQL client)
This requires the database connection string from Supabase
"""

import os
import sys
import subprocess
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def execute_schema_with_psql():
    """Execute schema using psql"""
    
    # Get database connection string
    # Format: postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres
    db_url = os.getenv("DATABASE_URL")
    
    if not db_url:
        # Try to construct from Supabase URL
        supabase_url = os.getenv("SUPABASE_URL")
        db_password = os.getenv("SUPABASE_DB_PASSWORD")
        
        if supabase_url and db_password:
            # Extract project ref from URL
            # https://mgjlnmlhwuqspctanaik.supabase.co
            project_ref = supabase_url.split('//')[1].split('.')[0]
            db_url = f"postgresql://postgres.{project_ref}:{db_password}@aws-0-us-east-1.pooler.supabase.com:6543/postgres"
        else:
            print("❌ Missing database connection information!")
            print("\nYou need either:")
            print("1. DATABASE_URL environment variable (full connection string)")
            print("2. Or SUPABASE_URL + SUPABASE_DB_PASSWORD")
            print("\nTo get the connection string:")
            print("1. Go to Supabase Dashboard → Settings → Database")
            print("2. Copy the 'Connection string' (URI format)")
            print("3. Add it as DATABASE_URL in .env file")
            return False
    
    schema_file = os.path.join(os.path.dirname(__file__), "infra", "supabase", "schema.sql")
    
    if not os.path.exists(schema_file):
        print(f"❌ Schema file not found: {schema_file}")
        return False
    
    print(f"🚀 Executing schema using psql...")
    print(f"📄 Schema file: {schema_file}")
    print(f"🔗 Database: {db_url.split('@')[1] if '@' in db_url else 'hidden'}")
    
    try:
        # Execute psql command
        result = subprocess.run(
            ['psql', db_url, '-f', schema_file],
            capture_output=True,
            text=True,
            check=False
        )
        
        if result.returncode == 0:
            print("✅ Schema executed successfully!")
            if result.stdout:
                print("\nOutput:")
                print(result.stdout)
            return True
        else:
            print("❌ Error executing schema:")
            print(result.stderr)
            return False
            
    except FileNotFoundError:
        print("❌ psql not found!")
        print("\npsql is the PostgreSQL command-line client.")
        print("Install it:")
        print("  Windows: Install PostgreSQL (includes psql)")
        print("  Or use: https://www.postgresql.org/download/windows/")
        print("\nAlternative: Use Supabase SQL Editor (no installation needed)")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    success = execute_schema_with_psql()
    sys.exit(0 if success else 1)

