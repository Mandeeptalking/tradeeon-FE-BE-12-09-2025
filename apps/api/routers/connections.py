"""
Connections router - Manage exchange API key connections
Now with authentication, Supabase persistence, and encryption
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Literal, Optional, Dict, Any, List
import uuid
from datetime import datetime, timedelta
import logging

from apps.api.deps.auth import get_current_user, AuthedUser
from apps.api.clients.supabase_client import supabase
from apps.api.utils.encryption import encrypt_value, decrypt_value
from apps.api.binance_authenticated_client import BinanceAuthenticatedClient
from apps.api.utils.errors import DatabaseError, NotFoundError

logger = logging.getLogger(__name__)

router = APIRouter()

# Types
Exchange = Literal['BINANCE', 'COINBASE', 'KRAKEN', 'ZERODHA']
Status = Literal['connected', 'degraded', 'error', 'not_connected']

class Features(BaseModel):
    trading: bool = False
    wallet: bool = False
    paper: bool = False

class Connection(BaseModel):
    id: str
    exchange: Exchange
    nickname: Optional[str] = None
    status: Status = 'not_connected'
    last_check_at: Optional[str] = None
    next_check_eta_sec: Optional[int] = None
    features: Features = Features()
    notes: Optional[str] = None

class UpsertBody(BaseModel):
    exchange: Exchange
    api_key: str
    api_secret: str
    passphrase: Optional[str] = None
    nickname: Optional[str] = None

class TestBody(BaseModel):
    exchange: Exchange
    api_key: str
    api_secret: str
    passphrase: Optional[str] = None

class RotateBody(BaseModel):
    api_key: str
    api_secret: str
    passphrase: Optional[str] = None

def _ensure_user_profile(user_id: str):
    """
    Ensure user profile exists in public.users table.
    Note: Database trigger should auto-create profiles, but this is a fallback.
    """
    if not supabase:
        logger.warning("Supabase client not available")
        return
    
    try:
        # Check if user exists
        result = supabase.table("users").select("id").eq("id", user_id).execute()
        
        if not result.data:
            # User doesn't exist - this shouldn't happen if triggers are set up correctly
            # But we'll try to create it as a fallback
            logger.warning(f"User profile not found for {user_id}. Database trigger should have created it.")
            logger.info(f"Attempting to create user profile as fallback for {user_id}")
            
            try:
                # Try to get user info from auth.users via service role
                # Note: This requires service role key, which we have
                supabase.table("users").insert({
                    "id": user_id,
                    "email": f"{user_id}@placeholder.tradeeon.com",  # Placeholder
                    "first_name": "User",  # Required field - placeholder
                    "last_name": "",  # Required field
                    "created_at": datetime.now().isoformat(),
                    "updated_at": datetime.now().isoformat()
                }).execute()
                logger.info(f"✅ Created user profile fallback for {user_id}")
            except Exception as insert_error:
                error_msg = str(insert_error)
                logger.error(f"Failed to create user profile: {error_msg}")
                # If it's a foreign key constraint, the user might not exist in auth.users
                if "foreign key" in error_msg.lower() or "23503" in error_msg:
                    logger.error(f"User {user_id} does not exist in auth.users table. User needs to sign up first.")
                    raise HTTPException(
                        status_code=400,
                        detail=f"User profile not found. Please ensure you are signed in and try again."
                    )
                # If it's a NOT NULL constraint, provide better error
                elif "null value" in error_msg.lower() or "23502" in error_msg:
                    logger.error(f"User profile creation failed due to missing required fields: {error_msg}")
                    raise HTTPException(
                        status_code=500,
                        detail=f"Failed to create user profile. Please contact support or try signing out and signing in again."
                    )
                # Don't fail if profile already exists (trigger might have created it)
                elif "duplicate" in error_msg.lower() or "unique" in error_msg.lower():
                    logger.info(f"User profile already exists (trigger created it): {user_id}")
                else:
                    raise
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error ensuring user profile: {e}")
        # Don't fail silently - re-raise if it's a critical error
        if "foreign key" in str(e).lower() or "23503" in str(e):
            raise HTTPException(
                status_code=400,
                detail=f"User profile not found. Please sign out and sign in again, then try connecting your exchange."
            )
        elif "null value" in str(e).lower() or "23502" in str(e):
            raise HTTPException(
                status_code=500,
                detail=f"Failed to create user profile. Please contact support or try signing out and signing in again."
            )

class ConnectionGuidance(BaseModel):
    exchange: Exchange
    whitelist_ip: str
    required_permissions: List[str]
    recommendations: List[str]
    testing_notes: List[str]


BINANCE_WHITELIST_IP = "52.77.227.148"
_EXCHANGE_GUIDANCE: Dict[str, ConnectionGuidance] = {
    "BINANCE": ConnectionGuidance(
        exchange="BINANCE",
        whitelist_ip=BINANCE_WHITELIST_IP,
        required_permissions=[
            "Enable Reading (spot)",
            "Enable Spot & Margin trading",
            "Optional: Enable Futures trading (if you plan to trade Futures)",
            "Do NOT enable Withdrawals"
        ],
        recommendations=[
            "⚠️ CRITICAL: You MUST whitelist IP 52.77.227.148 before enabling trading permissions.",
            "Binance will revoke unrestricted API keys with trading permissions for security.",
            "In Binance API Management, select 'Restrict access to trusted IPs only' and add 52.77.227.148.",
            "Generate a fresh API key pair dedicated to Tradeeon.",
            "Label the API key clearly so you can rotate or revoke it later."
        ],
        testing_notes=[
            "Connection test calls Binance spot `/api/v3/account` and futures `/fapi/v1/account` endpoints.",
            "⚠️ IMPORTANT: Unrestricted IP access with trading permissions will be revoked by Binance.",
            "You MUST whitelist IP 52.77.227.148 before testing or Binance may revoke your key.",
            "If you receive IP whitelist error, confirm 52.77.227.148 is whitelisted for this key.",
            "Invalid credential errors typically mean key/secret mismatch or missing permissions."
        ]
    )
}


def _connection_to_dict(conn: Dict, include_keys: bool = False) -> Dict:
    """Convert database row to Connection model"""
    return {
        "id": str(conn["id"]),
        "exchange": conn["exchange"].upper(),
        "nickname": conn.get("nickname"),
        "status": "connected" if conn.get("is_active", True) else "not_connected",
        "last_check_at": conn.get("updated_at"),
        "next_check_eta_sec": 60,
        "features": Features(
            trading=conn.get("permissions", {}).get("trading", False),
            wallet=conn.get("permissions", {}).get("wallet", False),
            paper=conn.get("permissions", {}).get("paper", False)
        ).dict(),
        "notes": None
    }


@router.get("/info")
async def get_connection_guidance(exchange: Optional[Exchange] = None) -> Dict[str, Any]:
    """
    Provide connection guidance such as whitelist IPs and required permissions.
    If exchange is omitted, return all supported exchanges.
    """
    if exchange:
        guidance = _EXCHANGE_GUIDANCE.get(exchange.upper())
        if not guidance:
            raise HTTPException(status_code=404, detail=f"No guidance available for {exchange}")
        return {"exchanges": [guidance.dict()]}
    return {"exchanges": [item.dict() for item in _EXCHANGE_GUIDANCE.values()]}

@router.get("")
@router.get("/")  # Support both with and without trailing slash
async def list_connections(user: AuthedUser = Depends(get_current_user)):
    """Get all connections for the authenticated user"""
    try:
        _ensure_user_profile(user.user_id)
        
        if not supabase:
            # Fallback to empty list if Supabase not available
            return []
        
        # Fetch connections from Supabase (include both active and paused)
        result = supabase.table("exchange_keys").select("*").eq("user_id", user.user_id).execute()
        
        connections = []
        for row in result.data:
            connections.append(_connection_to_dict(row))
        
        return connections
    except Exception as e:
        logger.error(f"Error listing connections: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to list connections: {str(e)}")

@router.post("")
@router.post("/")  # Support both with and without trailing slash
async def upsert_connection(body: UpsertBody, user: AuthedUser = Depends(get_current_user)):
    """Create or update a connection"""
    try:
        _ensure_user_profile(user.user_id)
        
        if not supabase:
            raise DatabaseError("Database service is not available")
        
        # Encrypt API keys
        encrypted_api_key = encrypt_value(body.api_key)
        encrypted_api_secret = encrypt_value(body.api_secret)
        encrypted_passphrase = encrypt_value(body.passphrase) if body.passphrase else None
        
        # Check if connection exists
        exchange_lower = body.exchange.lower()
        existing = supabase.table("exchange_keys").select("*").eq("user_id", user.user_id).eq("exchange", exchange_lower).execute()
        
        connection_data = {
            "user_id": user.user_id,
            "exchange": exchange_lower,
            "api_key_encrypted": encrypted_api_key,
            "api_secret_encrypted": encrypted_api_secret,
            "passphrase_encrypted": encrypted_passphrase,
            "is_active": True,
            "permissions": {
                "trading": True,
                "wallet": True,
                "paper": False
            },
            "updated_at": datetime.now().isoformat()
        }
        
        if existing.data:
            # Update existing
            connection_id = existing.data[0]["id"]
            supabase.table("exchange_keys").update(connection_data).eq("id", connection_id).execute()
            result = supabase.table("exchange_keys").select("*").eq("id", connection_id).execute()
            return _connection_to_dict(result.data[0])
        else:
            # Create new
            connection_data["created_at"] = datetime.now().isoformat()
            result = supabase.table("exchange_keys").insert(connection_data).execute()
            return _connection_to_dict(result.data[0])
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error upserting connection: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to save connection: {str(e)}")

@router.post("/test")
async def test_connection(body: TestBody, user: AuthedUser = Depends(get_current_user)):
    """
    Test a connection with real exchange API.
    Returns detailed error information if connection fails.
    """
    try:
        # Validate input
        if not body.api_key or not body.api_secret:
            return {
                "ok": False,
                "code": "invalid_credentials",
                "message": "API key and secret are required"
            }
        
        # Validate exchange
        if body.exchange.upper() != 'BINANCE':
            return {
                "ok": False,
                "code": "not_implemented",
                "message": f"Connection testing for {body.exchange} is not yet implemented"
            }
        
        # Test with real Binance API
        logger.info(f"Testing Binance connection for user {user.user_id}")
        try:
            async with BinanceAuthenticatedClient(body.api_key, body.api_secret) as client:
                result = await client.test_connection()
                logger.info(f"Connection test result: ok={result.get('ok')}, code={result.get('code')}")
                return result
        except Exception as e:
            # Catch any unexpected errors from the client
            error_msg = str(e)
            logger.error(f"Unexpected error during connection test: {error_msg}", exc_info=True)
            return {
                "ok": False,
                "code": "connection_error",
                "message": f"Connection test failed: {error_msg}"
            }
            
    except Exception as e:
        # Catch any other unexpected errors
        logger.error(f"Error in test_connection endpoint: {e}", exc_info=True)
        return {
            "ok": False,
            "code": "error",
            "message": f"Test failed: {str(e)}"
        }

@router.post("/{connection_id}/rotate")
async def rotate_keys(connection_id: str, body: RotateBody, user: AuthedUser = Depends(get_current_user)):
    """Rotate API keys for a connection"""
    try:
        if not supabase:
            raise DatabaseError("Database service is not available")
        
        # Verify connection belongs to user
        result = supabase.table("exchange_keys").select("*").eq("id", connection_id).eq("user_id", user.user_id).execute()
        
        if not result.data:
            raise NotFoundError("Connection", connection_id)
        
        # Encrypt new keys
        encrypted_api_key = encrypt_value(body.api_key)
        encrypted_api_secret = encrypt_value(body.api_secret)
        encrypted_passphrase = encrypt_value(body.passphrase) if body.passphrase else None
        
        # Update connection
        update_data = {
            "api_key_encrypted": encrypted_api_key,
            "api_secret_encrypted": encrypted_api_secret,
            "passphrase_encrypted": encrypted_passphrase,
            "updated_at": datetime.now().isoformat()
        }
        
        supabase.table("exchange_keys").update(update_data).eq("id", connection_id).execute()
        
        # Return updated connection
        result = supabase.table("exchange_keys").select("*").eq("id", connection_id).execute()
        return _connection_to_dict(result.data[0])
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error rotating keys: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to rotate keys: {str(e)}")

@router.patch("/{connection_id}/pause")
async def pause_connection(connection_id: str, user: AuthedUser = Depends(get_current_user)):
    """Pause a connection (set is_active to False)"""
    try:
        if not supabase:
            raise HTTPException(status_code=503, detail="Database service is not available")
        
        # Validate UUID format
        import uuid
        try:
            uuid.UUID(connection_id)
        except ValueError:
            logger.error(f"Invalid UUID format for connection_id: {connection_id}")
            raise HTTPException(status_code=400, detail=f"Invalid connection ID format: '{connection_id}'")
        
        logger.info(f"Pausing connection {connection_id} for user {user.user_id}")
        
        # Verify connection belongs to user
        result = supabase.table("exchange_keys").select("*").eq("id", connection_id).eq("user_id", user.user_id).execute()
        
        if not result.data:
            logger.warning(f"Connection {connection_id} not found for user {user.user_id}")
            raise HTTPException(status_code=404, detail=f"Connection with id '{connection_id}' not found")
        
        # Pause connection (set is_active to False)
        supabase.table("exchange_keys").update({
            "is_active": False,
            "updated_at": datetime.now().isoformat()
        }).eq("id", connection_id).execute()
        
        return {"message": "Connection paused successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error pausing connection: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to pause connection: {str(e)}")

@router.patch("/{connection_id}/resume")
async def resume_connection(connection_id: str, user: AuthedUser = Depends(get_current_user)):
    """Resume a connection (set is_active to True)"""
    try:
        if not supabase:
            raise HTTPException(status_code=503, detail="Database service is not available")
        
        # Validate UUID format
        import uuid
        try:
            uuid.UUID(connection_id)
        except ValueError:
            logger.error(f"Invalid UUID format for connection_id: {connection_id}")
            raise HTTPException(status_code=400, detail=f"Invalid connection ID format: '{connection_id}'")
        
        logger.info(f"Resuming connection {connection_id} for user {user.user_id}")
        
        # Verify connection belongs to user
        result = supabase.table("exchange_keys").select("*").eq("id", connection_id).eq("user_id", user.user_id).execute()
        
        if not result.data:
            logger.warning(f"Connection {connection_id} not found for user {user.user_id}")
            raise HTTPException(status_code=404, detail=f"Connection with id '{connection_id}' not found")
        
        # Resume connection (set is_active to True)
        supabase.table("exchange_keys").update({
            "is_active": True,
            "updated_at": datetime.now().isoformat()
        }).eq("id", connection_id).execute()
        
        return {"message": "Connection resumed successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error resuming connection: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to resume connection: {str(e)}")

@router.delete("/{connection_id}")
async def revoke_connection(connection_id: str, user: AuthedUser = Depends(get_current_user)):
    """Delete a connection permanently (soft delete by setting is_active to False)"""
    try:
        if not supabase:
            raise HTTPException(status_code=503, detail="Database service is not available")
        
        # Validate UUID format
        import uuid
        try:
            uuid.UUID(connection_id)
        except ValueError:
            logger.error(f"Invalid UUID format for connection_id: {connection_id}")
            raise HTTPException(status_code=400, detail=f"Invalid connection ID format: '{connection_id}'")
        
        logger.info(f"Deleting connection {connection_id} for user {user.user_id}")
        
        # Verify connection belongs to user
        result = supabase.table("exchange_keys").select("*").eq("id", connection_id).eq("user_id", user.user_id).execute()
        
        if not result.data:
            logger.warning(f"Connection {connection_id} not found for user {user.user_id}")
            raise HTTPException(status_code=404, detail=f"Connection with id '{connection_id}' not found")
        
        # Deactivate connection (soft delete)
        supabase.table("exchange_keys").update({
            "is_active": False,
            "updated_at": datetime.now().isoformat()
        }).eq("id", connection_id).execute()
        
        return {"message": "Connection deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting connection: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete connection: {str(e)}")

@router.get("/audit")
async def get_audit_events(user: AuthedUser = Depends(get_current_user)):
    """Get audit events for user's connections"""
    try:
        # TODO: Implement audit log table
        # For now, return empty list
        return []
    except Exception as e:
        logger.error(f"Error getting audit events: {e}")
        return []
