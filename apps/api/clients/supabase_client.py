import os
from supabase import create_client, Client
from dotenv import load_dotenv
import logging

logger = logging.getLogger(__name__)

# Load environment variables from .env file
load_dotenv()

_SUPABASE_URL = os.getenv("SUPABASE_URL", "").strip()
_SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip()

# Check if we're in production
_is_production = os.getenv("ENVIRONMENT", "").lower() == "production"

# Validate credentials
_has_valid_url = _SUPABASE_URL and _SUPABASE_URL.startswith("https://") and "supabase.co" in _SUPABASE_URL
_has_valid_key = _SUPABASE_KEY and len(_SUPABASE_KEY) > 50

# Create client only if we have valid credentials
if _has_valid_url and _has_valid_key:
    try:
        supabase: Client = create_client(_SUPABASE_URL, _SUPABASE_KEY)
        logger.info("✅ Supabase client initialized successfully")
    except Exception as e:
        logger.error(f"❌ Failed to initialize Supabase client: {e}")
        supabase = None
        if _is_production:
            raise RuntimeError(f"Cannot start in production without database connection: {e}")
else:
    # Missing or invalid credentials
    supabase = None
    if _is_production:
        error_msg = "Missing required Supabase credentials in production environment"
        if not _has_valid_url:
            error_msg += " (SUPABASE_URL is missing or invalid)"
        if not _has_valid_key:
            error_msg += " (SUPABASE_SERVICE_ROLE_KEY is missing or invalid)"
        logger.error(f"❌ {error_msg}")
        raise RuntimeError(error_msg)
    else:
        logger.warning("⚠️  Supabase client not initialized - missing or invalid credentials")
        logger.warning("   Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to enable database features")
