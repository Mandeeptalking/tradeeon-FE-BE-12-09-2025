"""
Migration runner - outputs SQL for manual execution
Since Supabase doesn't support DDL via REST API, this provides the SQL to run
"""
import sys
from pathlib import Path

migration_file = Path(__file__).parent / "infra" / "supabase" / "migrations" / "05_connection_audit_events.sql"

if not migration_file.exists():
    print(f"ERROR: Migration file not found: {migration_file}")
    sys.exit(1)

with open(migration_file, 'r', encoding='utf-8') as f:
    sql = f.read()

print("=" * 80)
print("CONNECTION AUDIT EVENTS MIGRATION")
print("=" * 80)
print("\nTo run this migration:")
print("1. Go to: https://supabase.com/dashboard/project/mgjlnmlhwuqspctanaik/sql/new")
print("2. Copy the SQL below")
print("3. Paste into SQL Editor")
print("4. Click 'Run'")
print("\n" + "=" * 80)
print(sql)
print("=" * 80)
print("\nMigration SQL ready to execute!")



