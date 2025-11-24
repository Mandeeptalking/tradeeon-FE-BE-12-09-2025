from fastapi import Depends, Header, HTTPException, status
from typing import Optional
import jwt
import os
import logging

logger = logging.getLogger(__name__)

SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", "")  # service role secret for verify

class AuthedUser:
    def __init__(self, user_id: str):
        self.user_id = user_id

def get_current_user(authorization: Optional[str] = Header(None)) -> AuthedUser:
    """
    Extract and validate user from JWT token in Authorization header.
    
    This dependency MUST be used - do NOT use user_id as a query parameter.
    """
    if not authorization or not authorization.lower().startswith("bearer "):
        logger.warning("Missing Authorization header or invalid format. Header value: %s", authorization[:50] if authorization else "None")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing token")
    token = authorization.split(" ", 1)[1]
    
    # Validate JWT secret is configured
    if not SUPABASE_JWT_SECRET:
        logger.error("SUPABASE_JWT_SECRET is not configured")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Authentication service not configured"
        )
    
    # Log token info for debugging (first/last 20 chars only)
    token_preview = f"{token[:20]}...{token[-20:]}" if len(token) > 40 else token[:20]
    logger.debug(f"Validating JWT token: {token_preview}")
    logger.debug(f"JWT secret length: {len(SUPABASE_JWT_SECRET)}")
    
    try:
        payload = jwt.decode(token, SUPABASE_JWT_SECRET, algorithms=["HS256"], options={"verify_aud": False})
        user_id = payload.get("sub") or payload.get("user_id")
        if not user_id:
            logger.error("Token payload missing user_id (sub or user_id field)")
            raise ValueError("No user id in token")
        logger.debug(f"JWT validation successful for user_id: {user_id}")
        return AuthedUser(user_id=user_id)
    except jwt.ExpiredSignatureError:
        logger.error("JWT token expired")
        raise HTTPException(status_code=401, detail="Token expired. Please sign in again.")
    except jwt.InvalidSignatureError as e:
        logger.error(f"JWT signature verification failed: {e}")
        logger.error(f"This usually means SUPABASE_JWT_SECRET doesn't match the Supabase project")
        raise HTTPException(status_code=401, detail=f"Invalid token: Signature verification failed. Please sign in again.")
    except jwt.InvalidTokenError as e:
        logger.error(f"Invalid JWT token: {e}")
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")
    except Exception as e:
        logger.error(f"JWT validation error: {type(e).__name__}: {e}", exc_info=True)
        raise HTTPException(status_code=401, detail=f"Authentication failed: {str(e)}")


