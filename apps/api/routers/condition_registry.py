"""Condition Registry API - Centralized condition management for all bots."""

from fastapi import APIRouter, HTTPException, Query, Path, Body, Depends
from typing import List, Optional, Dict, Any
import logging
import hashlib
import json
from datetime import datetime

from apps.api.deps.auth import get_current_user, AuthedUser
from apps.api.clients.supabase_client import supabase
from apps.api.utils.errors import TradeeonError, NotFoundError, DatabaseError

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/conditions", tags=["conditions"])


def normalize_condition(condition: Dict[str, Any]) -> Dict[str, Any]:
    """
    Normalize a condition to a standard format.
    
    Handles different bot types and condition formats:
    - DCA Bot conditions
    - Grid Bot conditions
    - Trend Following Bot conditions
    - Alert conditions
    """
    normalized = {
        "condition_type": condition.get("type", "indicator"),  # indicator, price, volume
        "symbol": condition.get("symbol", "").upper().replace("/", ""),  # BTCUSDT
        "timeframe": condition.get("timeframe", "1h"),
        "indicator": condition.get("indicator", ""),
        "component": condition.get("component", condition.get("indicator", "")),
        "operator": condition.get("operator", ">"),
        "compare_with": condition.get("compareWith", "value"),
        "compare_value": condition.get("compareValue") or condition.get("value"),
        "period": condition.get("period"),
        "lower_bound": condition.get("lowerBound"),
        "upper_bound": condition.get("upperBound"),
    }
    
    # Handle RHS for indicator comparisons
    if condition.get("rhs"):
        normalized["rhs_indicator"] = condition["rhs"].get("indicator")
        normalized["rhs_component"] = condition["rhs"].get("component")
    
    # Handle custom conditions
    if condition.get("conditionType"):
        normalized["condition_type"] = condition["conditionType"].lower()
    
    # Clean up None values
    normalized = {k: v for k, v in normalized.items() if v is not None}
    
    return normalized


def hash_condition(normalized_condition: Dict[str, Any]) -> str:
    """
    Generate a unique hash for a normalized condition.
    
    Same conditions = Same hash = Shared evaluation
    """
    # Create a deterministic string representation
    # Sort keys to ensure consistent hashing
    condition_str = json.dumps(normalized_condition, sort_keys=True, default=str)
    
    # Generate SHA256 hash
    condition_hash = hashlib.sha256(condition_str.encode()).hexdigest()
    
    return condition_hash[:16]  # Use first 16 chars for readability


@router.post("/register")
async def register_condition(
    condition: Dict[str, Any] = Body(..., description="Condition configuration"),
    user: AuthedUser = Depends(get_current_user)
):
    """
    Register a condition and get its unique ID.
    
    If condition already exists, returns existing condition_id.
    If new, creates entry in registry.
    """
    try:
        # Normalize condition
        normalized = normalize_condition(condition)
        
        # Generate condition hash
        condition_id = hash_condition(normalized)
        
        # Check if condition already exists
        if supabase:
            existing = supabase.table("condition_registry").select("*").eq("condition_id", condition_id).execute()
            
            if existing.data:
                logger.info(f"Condition {condition_id} already exists")
                return {
                    "success": True,
                    "condition_id": condition_id,
                    "status": "existing",
                    "condition": existing.data[0]
                }
        
        # Create new condition entry
        condition_entry = {
            "condition_id": condition_id,
            "condition_type": normalized.get("condition_type", "indicator"),
            "symbol": normalized.get("symbol"),
            "timeframe": normalized.get("timeframe"),
            "indicator_config": normalized,
            "created_at": datetime.now().isoformat(),
            "last_evaluated_at": None,
            "evaluation_count": 0,
            "last_triggered_at": None,
            "trigger_count": 0
        }
        
        if supabase:
            result = supabase.table("condition_registry").insert(condition_entry).execute()
            logger.info(f"Registered new condition {condition_id}")
        
        return {
            "success": True,
            "condition_id": condition_id,
            "status": "registered",
            "condition": condition_entry
        }
    
    except Exception as e:
        logger.error(f"Error registering condition: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/subscribe")
async def subscribe_bot_to_condition(
    bot_id: str = Body(..., description="User's bot ID"),
    condition_id: str = Body(..., description="Condition ID from register"),
    bot_type: str = Body(..., description="Bot type: dca, grid, trend, market_making, etc."),
    bot_config: Dict[str, Any] = Body(..., description="Bot-specific configuration"),
    user: AuthedUser = Depends(get_current_user)
):
    """
    Subscribe a bot to a condition.
    
    When condition is triggered, bot will receive notification.
    """
    try:
        # Verify condition exists
        if supabase:
            condition_check = supabase.table("condition_registry").select("*").eq("condition_id", condition_id).execute()
            if not condition_check.data:
                raise NotFoundError("Condition", f"Condition {condition_id} not found")
        
        # Check for existing subscription
        if supabase:
            existing = supabase.table("user_condition_subscriptions").select("*").eq(
                "user_id", user.user_id
            ).eq("bot_id", bot_id).eq("condition_id", condition_id).eq("active", True).execute()
            
            if existing.data:
                logger.info(f"Bot {bot_id} already subscribed to condition {condition_id}")
                return {
                    "success": True,
                    "subscription_id": existing.data[0]["id"],
                    "status": "already_subscribed"
                }
        
        # Create subscription
        subscription = {
            "user_id": user.user_id,
            "bot_id": bot_id,
            "condition_id": condition_id,
            "bot_type": bot_type,
            "bot_config": bot_config,
            "created_at": datetime.now().isoformat(),
            "active": True,
            "last_triggered_at": None
        }
        
        if supabase:
            result = supabase.table("user_condition_subscriptions").insert(subscription).execute()
            subscription_id = result.data[0]["id"] if result.data else None
            logger.info(f"Bot {bot_id} subscribed to condition {condition_id}")
        else:
            subscription_id = None
        
        return {
            "success": True,
            "subscription_id": subscription_id,
            "status": "subscribed",
            "subscription": subscription
        }
    
    except NotFoundError:
        raise
    except Exception as e:
        logger.error(f"Error subscribing bot to condition: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/subscribe/{subscription_id}")
async def unsubscribe_bot_from_condition(
    subscription_id: str = Path(..., description="Subscription ID"),
    user: AuthedUser = Depends(get_current_user)
):
    """Unsubscribe a bot from a condition."""
    try:
        if supabase:
            # Verify ownership
            subscription = supabase.table("user_condition_subscriptions").select("*").eq("id", subscription_id).execute()
            if not subscription.data:
                raise NotFoundError("Subscription", f"Subscription {subscription_id} not found")
            
            if subscription.data[0]["user_id"] != user.user_id:
                raise HTTPException(status_code=403, detail="Not authorized")
            
            # Deactivate subscription
            supabase.table("user_condition_subscriptions").update({
                "active": False,
                "updated_at": datetime.now().isoformat()
            }).eq("id", subscription_id).execute()
            
            logger.info(f"Unsubscribed subscription {subscription_id}")
        
        return {
            "success": True,
            "message": f"Unsubscribed from condition"
        }
    
    except NotFoundError:
        raise
    except Exception as e:
        logger.error(f"Error unsubscribing: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{condition_id}/status")
async def get_condition_status(
    condition_id: str = Path(..., description="Condition ID")
):
    """Get condition status and statistics."""
    try:
        if supabase:
            condition = supabase.table("condition_registry").select("*").eq("condition_id", condition_id).execute()
            if not condition.data:
                raise NotFoundError("Condition", f"Condition {condition_id} not found")
            
            # Get subscriber count
            subscribers = supabase.table("user_condition_subscriptions").select(
                "id", count="exact"
            ).eq("condition_id", condition_id).eq("active", True).execute()
            
            subscriber_count = subscribers.count if hasattr(subscribers, 'count') else len(subscribers.data) if subscribers.data else 0
            
            return {
                "success": True,
                "condition": condition.data[0],
                "subscriber_count": subscriber_count,
                "status": "active" if subscriber_count > 0 else "inactive"
            }
        
        raise HTTPException(status_code=503, detail="Database not available")
    
    except NotFoundError:
        raise
    except Exception as e:
        logger.error(f"Error getting condition status: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/user/subscriptions")
async def get_user_subscriptions(
    user: AuthedUser = Depends(get_current_user)
):
    """Get all active subscriptions for the current user."""
    try:
        if supabase:
            subscriptions = supabase.table("user_condition_subscriptions").select(
                "*, condition_registry(*)"
            ).eq("user_id", user.user_id).eq("active", True).execute()
            
            return {
                "success": True,
                "subscriptions": subscriptions.data if subscriptions.data else [],
                "count": len(subscriptions.data) if subscriptions.data else 0
            }
        
        raise HTTPException(status_code=503, detail="Database not available")
    
    except Exception as e:
        logger.error(f"Error getting user subscriptions: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats")
async def get_condition_stats():
    """Get overall statistics about the condition registry."""
    try:
        if supabase:
            # Total conditions
            total_conditions = supabase.table("condition_registry").select("condition_id", count="exact").execute()
            condition_count = total_conditions.count if hasattr(total_conditions, 'count') else len(total_conditions.data) if total_conditions.data else 0
            
            # Total subscriptions
            total_subs = supabase.table("user_condition_subscriptions").select("id", count="exact").eq("active", True).execute()
            sub_count = total_subs.count if hasattr(total_subs, 'count') else len(total_subs.data) if total_subs.data else 0
            
            # Most popular conditions
            popular = supabase.table("user_condition_subscriptions").select(
                "condition_id", count="exact"
            ).eq("active", True).execute()
            
            return {
                "success": True,
                "stats": {
                    "total_conditions": condition_count,
                    "total_subscriptions": sub_count,
                    "avg_subscribers_per_condition": sub_count / condition_count if condition_count > 0 else 0
                }
            }
        
        raise HTTPException(status_code=503, detail="Database not available")
    
    except Exception as e:
        logger.error(f"Error getting stats: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

