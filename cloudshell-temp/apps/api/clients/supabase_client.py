import os
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

_SUPABASE_URL = os.getenv("SUPABASE_URL", "https://your-project.supabase.co")
_SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "your-service-role-key")  # server-side

# Only create client if we have valid credentials
if _SUPABASE_URL != "https://your-project.supabase.co" and _SUPABASE_KEY != "your-service-role-key":
    supabase: Client = create_client(_SUPABASE_URL, _SUPABASE_KEY)
else:
    # Mock client for development/testing
    supabase = None
