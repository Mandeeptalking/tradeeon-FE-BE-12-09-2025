"""
Execute migration directly using Supabase Python client with raw SQL
"""
import os
import sys
from pathlib import Path
from dotenv import load_dotenv
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL", "").strip()
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip()

if not SUPABASE_URL or not SUPABASE_KEY:
    print("ERROR: Missing Supabase credentials")
    sys.exit(1)

# Read migration file
migration_file = Path(__file__).parent.parent.parent / "infra" / "supabase" / "migrations" / "05_connection_audit_events.sql"
with open(migration_file, 'r', encoding='utf-8') as f:
    migration_sql = f.read()

# Extract project reference and construct PostgreSQL connection string
# Supabase URL format: https://<project-ref>.supabase.co
project_ref = SUPABASE_URL.replace("https://", "").replace(".supabase.co", "")

# We need the database password, not the service role key
# The service role key is for REST API, not for direct DB connection
# We'll need to get the DB password from environment or use Supabase CLI

print("Attempting to connect to Supabase database...")
print(f"Project: {project_ref}")

# Try to get DB password from environment
DB_PASSWORD = os.getenv("SUPABASE_DB_PASSWORD", "")
if not DB_PASSWORD:
    print("ERROR: SUPABASE_DB_PASSWORD not set")
    print("Please set SUPABASE_DB_PASSWORD environment variable")
    print("You can find it in Supabase Dashboard > Settings > Database")
    sys.exit(1)

# Construct connection string
# Format: postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
db_url = f"postgresql://postgres:{DB_PASSWORD}@db.{project_ref}.supabase.co:5432/postgres"

try:
    print("Connecting to database...")
    conn = psycopg2.connect(db_url)
    conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
    cursor = conn.cursor()
    
    print("Executing migration SQL...")
    cursor.execute(migration_sql)
    
    print("SUCCESS: Migration executed successfully!")
    cursor.close()
    conn.close()
    
except psycopg2.OperationalError as e:
    print(f"ERROR: Database connection failed: {e}")
    print("\nPlease ensure:")
    print("1. SUPABASE_DB_PASSWORD is set correctly")
    print("2. Database allows connections from your IP")
    print("3. Or run migration manually in Supabase SQL Editor")
    sys.exit(1)
except Exception as e:
    print(f"ERROR: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)



