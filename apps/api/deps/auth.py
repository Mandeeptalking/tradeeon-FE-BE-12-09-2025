from fastapi import Depends, Header, HTTPException, status
import jwt
import os
import logging

logger = logging.getLogger(__name__)

SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", "")  # service role secret for verify

class AuthedUser:
    def __init__(self, user_id: str):
        self.user_id = user_id

def get_current_user(authorization: str = Header(None)) -> AuthedUser:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing token")
    token = authorization.split(" ", 1)[1]
    
    # Validate JWT secret is configured
    if not SUPABASE_JWT_SECRET:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Authentication service not configured"
        )
    
    try:
        payload = jwt.decode(token, SUPABASE_JWT_SECRET, algorithms=["HS256"], options={"verify_aud": False})
        user_id = payload.get("sub") or payload.get("user_id")
        if not user_id:
            raise ValueError("No user id in token")
        return AuthedUser(user_id=user_id)
    except jwt.ExpiredSignatureError:
        logger.error("JWT token expired")
        raise HTTPException(status_code=401, detail="Token expired. Please sign in again.")
    except jwt.InvalidTokenError as e:
        logger.error(f"Invalid JWT token: {e}")
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")
    except Exception as e:
        logger.error(f"JWT validation error: {e}")
        raise HTTPException(status_code=401, detail=f"Authentication failed: {str(e)}")


