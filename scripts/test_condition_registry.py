#!/usr/bin/env python3
"""
Test script for Condition Registry API

Run this after:
1. Database migration is complete
2. Backend API is running

Environment Variables:
- SUPABASE_JWT_TOKEN: JWT token for authentication (required for auth endpoints)
- API_BASE_URL: Base URL for API (default: http://localhost:8000)
"""

import requests
import json
import sys
import os
from typing import Dict, Any, Optional

# Configuration
# Default to production API URL (AWS Lightsail)
# Override with API_BASE_URL environment variable for local testing
API_BASE_URL = os.getenv("API_BASE_URL", "https://api.tradeeon.com")
TEST_USER_ID = "test_user_123"  # Not used directly, auth comes from token


def get_auth_headers() -> Dict[str, str]:
    """Get authentication headers for API requests."""
    token = os.getenv("SUPABASE_JWT_TOKEN")
    if token:
        return {"Authorization": f"Bearer {token}"}
    return {}


def check_auth_available() -> bool:
    """Check if authentication token is available."""
    token = os.getenv("SUPABASE_JWT_TOKEN")
    if not token:
        print("[WARN] Warning: SUPABASE_JWT_TOKEN not set.")
        print("   Auth-required tests will be skipped.")
        print("   Set it with: export SUPABASE_JWT_TOKEN='your-token'")
        return False
    return True

def test_register_condition():
    """Test registering a condition."""
    print("\n[TEST 1] Register Condition")
    print("=" * 50)
    
    # Test RSI condition
    condition = {
        "type": "indicator",
        "symbol": "BTCUSDT",
        "timeframe": "1h",
        "indicator": "RSI",
        "operator": "crosses_below",
        "value": 30,
        "period": 14
    }
    
    try:
        response = requests.post(
            f"{API_BASE_URL}/conditions/register",
            json=condition,
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code == 200:
            result = response.json()
            print(f"[OK] Condition registered successfully!")
            print(f"   Condition ID: {result.get('condition_id')}")
            print(f"   Status: {result.get('status')}")
            return result.get('condition_id')
        else:
            print(f"[FAIL] Failed: {response.status_code}")
            print(f"   Response: {response.text}")
            return None
    except Exception as e:
        print(f"[ERROR] Error: {e}")
        return None


def test_register_price_condition():
    """Test registering a price range condition (for grid bots)."""
    print("\n[TEST 2] Register Price Range Condition")
    print("=" * 50)
    
    condition = {
        "type": "price",
        "symbol": "BTCUSDT",
        "timeframe": "1m",
        "operator": "between",
        "lowerBound": 90000,
        "upperBound": 100000,
        "grid_action": "buy"
    }
    
    try:
        response = requests.post(
            f"{API_BASE_URL}/conditions/register",
            json=condition,
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code == 200:
            result = response.json()
            print(f"[OK] Price condition registered successfully!")
            print(f"   Condition ID: {result.get('condition_id')}")
            return result.get('condition_id')
        else:
            print(f"[FAIL] Failed: {response.status_code}")
            print(f"   Response: {response.text}")
            return None
    except Exception as e:
        print(f"[ERROR] Error: {e}")
        return None


def test_subscribe_bot(condition_id: str, bot_id: str = "test_dca_bot_1"):
    """Test subscribing a bot to a condition."""
    print("\n[TEST 3] Subscribe Bot to Condition")
    print("=" * 50)
    
    if not check_auth_available():
        print("[SKIP] Skipping (auth token not available)")
        return None
    
    subscription = {
        "bot_id": bot_id,
        "condition_id": condition_id,
        "bot_type": "dca",
        "bot_config": {
            "baseOrderSize": 100,
            "dcaRules": {
                "maxDcaPerPosition": 5
            }
        }
    }
    
    headers = {
        "Content-Type": "application/json",
        **get_auth_headers()
    }
    
    try:
        response = requests.post(
            f"{API_BASE_URL}/conditions/subscribe",
            json=subscription,
            headers=headers
        )
        
        if response.status_code == 200:
            result = response.json()
            print(f"[OK] Bot subscribed successfully!")
            print(f"   Subscription ID: {result.get('subscription_id')}")
            return result.get('subscription_id')
        else:
            print(f"[FAIL] Failed: {response.status_code}")
            print(f"   Response: {response.text}")
            return None
    except Exception as e:
        print(f"[ERROR] Error: {e}")
        return None


def test_get_condition_status(condition_id: str):
    """Test getting condition status."""
    print("\n[TEST 4] Get Condition Status")
    print("=" * 50)
    
    try:
        response = requests.get(f"{API_BASE_URL}/conditions/{condition_id}/status")
        
        if response.status_code == 200:
            result = response.json()
            print(f"[OK] Condition status retrieved!")
            print(f"   Condition: {json.dumps(result.get('condition'), indent=2)}")
            print(f"   Subscriber Count: {result.get('subscriber_count')}")
            return result
        else:
            print(f"[FAIL] Failed: {response.status_code}")
            print(f"   Response: {response.text}")
            return None
    except Exception as e:
        print(f"[ERROR] Error: {e}")
        return None


def test_get_user_subscriptions():
    """Test getting user's subscriptions."""
    print("\n[TEST 5] Get User Subscriptions")
    print("=" * 50)
    
    if not check_auth_available():
        print("[SKIP] Skipping (auth token not available)")
        return None
    
    headers = {
        "Content-Type": "application/json",
        **get_auth_headers()
    }
    
    try:
        response = requests.get(
            f"{API_BASE_URL}/conditions/user/subscriptions",
            headers=headers
        )
        
        if response.status_code == 200:
            result = response.json()
            print(f"[OK] User subscriptions retrieved!")
            print(f"   Count: {result.get('count')}")
            print(f"   Subscriptions: {json.dumps(result.get('subscriptions'), indent=2)}")
            return result
        else:
            print(f"[FAIL] Failed: {response.status_code}")
            print(f"   Response: {response.text}")
            return None
    except Exception as e:
        print(f"[ERROR] Error: {e}")
        return None


def test_get_stats():
    """Test getting condition registry statistics."""
    print("\n[TEST 6] Get Registry Statistics")
    print("=" * 50)
    
    try:
        response = requests.get(f"{API_BASE_URL}/conditions/stats")
        
        if response.status_code == 200:
            result = response.json()
            print(f"[OK] Statistics retrieved!")
            stats = result.get('stats', {})
            print(f"   Total Conditions: {stats.get('total_conditions')}")
            print(f"   Total Subscriptions: {stats.get('total_subscriptions')}")
            print(f"   Avg Subscribers/Condition: {stats.get('avg_subscribers_per_condition', 0):.2f}")
            return result
        else:
            print(f"[FAIL] Failed: {response.status_code}")
            print(f"   Response: {response.text}")
            return None
    except Exception as e:
        print(f"[ERROR] Error: {e}")
        return None


def test_deduplication():
    """Test that registering the same condition twice returns same ID."""
    print("\n[TEST 7] Condition Deduplication")
    print("=" * 50)
    
    condition = {
        "type": "indicator",
        "symbol": "BTCUSDT",
        "timeframe": "1h",
        "indicator": "RSI",
        "operator": "crosses_below",
        "value": 30,
        "period": 14
    }
    
    try:
        # Register first time
        print("   Registering condition first time...")
        response1 = requests.post(
            f"{API_BASE_URL}/conditions/register",
            json=condition,
            headers={"Content-Type": "application/json"}
        )
        
        if response1.status_code != 200:
            print(f"[FAIL] First registration failed: {response1.status_code}")
            print(f"   Response: {response1.text}")
            return None
        
        result1 = response1.json()
        condition_id_1 = result1.get('condition_id')
        status_1 = result1.get('status')
        print(f"   First registration: ID={condition_id_1}, Status={status_1}")
        
        # Register second time (should return same ID)
        print("   Registering same condition second time...")
        response2 = requests.post(
            f"{API_BASE_URL}/conditions/register",
            json=condition,
            headers={"Content-Type": "application/json"}
        )
        
        if response2.status_code != 200:
            print(f"[FAIL] Second registration failed: {response2.status_code}")
            print(f"   Response: {response2.text}")
            return None
        
        result2 = response2.json()
        condition_id_2 = result2.get('condition_id')
        status_2 = result2.get('status')
        print(f"   Second registration: ID={condition_id_2}, Status={status_2}")
        
        if condition_id_1 == condition_id_2:
            print(f"[OK] Deduplication works! Same ID: {condition_id_1}")
            if status_2 == "existing":
                print(f"   [OK] Status correctly shows 'existing' on second registration")
            return condition_id_1
        else:
            print(f"[FAIL] Deduplication failed! IDs differ:")
            print(f"   First:  {condition_id_1}")
            print(f"   Second: {condition_id_2}")
            return None
            
    except Exception as e:
        print(f"[ERROR] Error: {e}")
        import traceback
        traceback.print_exc()
        return None


def main():
    """Run all tests."""
    print("Condition Registry API Tests")
    print("=" * 50)
    print(f"API Base URL: {API_BASE_URL}")
    print(f"Make sure backend is running on {API_BASE_URL}")
    print()
    
    # Check if auth is available
    auth_available = check_auth_available()
    if auth_available:
        print("[OK] Authentication token found")
    else:
        print("[WARN] Authentication token not found - some tests will be skipped")
    print()
    
    # Test 1: Register RSI condition
    rsi_condition_id = test_register_condition()
    
    # Test 2: Register price condition
    price_condition_id = test_register_price_condition()
    
    # Test 3: Subscribe bot to condition
    if rsi_condition_id:
        subscription_id = test_subscribe_bot(rsi_condition_id)
    
    # Test 4: Get condition status
    if rsi_condition_id:
        test_get_condition_status(rsi_condition_id)
    
    # Test 5: Get user subscriptions (requires auth)
    test_get_user_subscriptions()
    
    # Test 6: Get stats
    test_get_stats()
    
    # Test 7: Test deduplication
    test_deduplication()
    
    print("\n" + "=" * 50)
    print("[SUCCESS] Tests completed!")
    print("\nNext Steps:")
    print("1. Verify database tables are created")
    print("2. Check condition_registry table has entries")
    print("3. Check user_condition_subscriptions table (if auth tests passed)")
    print("4. Review test results above")
    print("5. Proceed to DCA Bot integration (Phase 1.3)")


if __name__ == "__main__":
    main()

