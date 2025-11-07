#!/usr/bin/env python3
"""
Quick diagnostic script to test backend database connection
"""
import os
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

print("=" * 60)
print("🔍 BACKEND DATABASE CONNECTION DIAGNOSTIC")
print("=" * 60)
print()

# Check environment variables
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
supabase_anon = os.getenv("SUPABASE_ANON_KEY")  # Not used by backend but good to check

print("📋 Environment Variables:")
print(f"  SUPABASE_URL: {'✅ SET' if supabase_url else '❌ MISSING'}")
if supabase_url:
    print(f"    Value: {supabase_url[:50]}..." if len(supabase_url) > 50 else f"    Value: {supabase_url}")
    print(f"    Valid: {'✅' if supabase_url.startswith('https://') and 'supabase.co' in supabase_url else '❌ Invalid format'}")
else:
    print("    ⚠️  Backend needs SUPABASE_URL to connect to database")

print(f"  SUPABASE_SERVICE_ROLE_KEY: {'✅ SET' if supabase_key else '❌ MISSING'}")
if supabase_key:
    print(f"    Length: {len(supabase_key)} chars")
    print(f"    Valid: {'✅' if len(supabase_key) > 50 else '❌ Too short'}")
else:
    print("    ⚠️  Backend needs SUPABASE_SERVICE_ROLE_KEY (NOT anon key!)")

print(f"  SUPABASE_ANON_KEY: {'✅ SET' if supabase_anon else '❌ MISSING'} (frontend only)")
print()

# Try to import and test connection
print("🔌 Testing Connection:")
try:
    # Add parent directory to path for imports
    import sys
    from pathlib import Path
    root_dir = Path(__file__).parent.parent.parent
    if str(root_dir) not in sys.path:
        sys.path.insert(0, str(root_dir))
    
    from apps.api.clients.supabase_client import supabase
    
    if supabase is None:
        print("  ❌ Supabase client is None!")
        print("     This means SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY are missing/invalid")
        print()
        print("💡 Fix:")
        print("   1. Set SUPABASE_URL in your environment")
        print("   2. Set SUPABASE_SERVICE_ROLE_KEY (get from Supabase dashboard)")
        print("   3. Restart your backend server")
        sys.exit(1)
    
    print("  ✅ Supabase client initialized")
    
    # Test a simple query
    print("  🔄 Testing database query...")
    try:
        result = supabase.table("users").select("id").limit(1).execute()
        print(f"  ✅ Database connection successful!")
        print(f"     Query returned {len(result.data)} row(s)")
    except Exception as e:
        print(f"  ❌ Database query failed: {str(e)}")
        print()
        print("💡 Possible issues:")
        print("   - Wrong SUPABASE_URL")
        print("   - Wrong SUPABASE_SERVICE_ROLE_KEY")
        print("   - Network/firewall blocking connection")
        print("   - Supabase project paused or deleted")
        sys.exit(1)
        
except ImportError as e:
    print(f"  ❌ Failed to import supabase_client: {e}")
    print("     Make sure you're in the apps/api directory")
    sys.exit(1)
except Exception as e:
    print(f"  ❌ Unexpected error: {e}")
    sys.exit(1)

print()
print("=" * 60)
print("✅ ALL CHECKS PASSED - Backend can connect to database!")
print("=" * 60)

