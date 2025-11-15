#!/usr/bin/env python3
"""
Test script for Condition Registry API

Run this after:
1. Database migration is complete
2. Backend API is running
"""

import requests
import json
import sys
from typing import Dict, Any

# Configuration
API_BASE_URL = "http://localhost:8000"
TEST_USER_ID = "test_user_123"  # Replace with actual user ID from auth

def test_register_condition():
    """Test registering a condition."""
    print("\n🧪 Test 1: Register Condition")
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
            print(f"✅ Condition registered successfully!")
            print(f"   Condition ID: {result.get('condition_id')}")
            print(f"   Status: {result.get('status')}")
            return result.get('condition_id')
        else:
            print(f"❌ Failed: {response.status_code}")
            print(f"   Response: {response.text}")
            return None
    except Exception as e:
        print(f"❌ Error: {e}")
        return None


def test_register_price_condition():
    """Test registering a price range condition (for grid bots)."""
    print("\n🧪 Test 2: Register Price Range Condition")
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
            print(f"✅ Price condition registered successfully!")
            print(f"   Condition ID: {result.get('condition_id')}")
            return result.get('condition_id')
        else:
            print(f"❌ Failed: {response.status_code}")
            print(f"   Response: {response.text}")
            return None
    except Exception as e:
        print(f"❌ Error: {e}")
        return None


def test_subscribe_bot(condition_id: str, bot_id: str = "test_dca_bot_1"):
    """Test subscribing a bot to a condition."""
    print("\n🧪 Test 3: Subscribe Bot to Condition")
    print("=" * 50)
    
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
    
    try:
        # Note: This requires authentication in production
        # For testing, you may need to add auth headers
        response = requests.post(
            f"{API_BASE_URL}/conditions/subscribe",
            json=subscription,
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Bot subscribed successfully!")
            print(f"   Subscription ID: {result.get('subscription_id')}")
            return result.get('subscription_id')
        else:
            print(f"❌ Failed: {response.status_code}")
            print(f"   Response: {response.text}")
            return None
    except Exception as e:
        print(f"❌ Error: {e}")
        return None


def test_get_condition_status(condition_id: str):
    """Test getting condition status."""
    print("\n🧪 Test 4: Get Condition Status")
    print("=" * 50)
    
    try:
        response = requests.get(f"{API_BASE_URL}/conditions/{condition_id}/status")
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Condition status retrieved!")
            print(f"   Condition: {json.dumps(result.get('condition'), indent=2)}")
            print(f"   Subscriber Count: {result.get('subscriber_count')}")
            return result
        else:
            print(f"❌ Failed: {response.status_code}")
            print(f"   Response: {response.text}")
            return None
    except Exception as e:
        print(f"❌ Error: {e}")
        return None


def test_get_user_subscriptions():
    """Test getting user's subscriptions."""
    print("\n🧪 Test 5: Get User Subscriptions")
    print("=" * 50)
    
    try:
        # Note: This requires authentication
        response = requests.get(
            f"{API_BASE_URL}/conditions/user/subscriptions",
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ User subscriptions retrieved!")
            print(f"   Count: {result.get('count')}")
            print(f"   Subscriptions: {json.dumps(result.get('subscriptions'), indent=2)}")
            return result
        else:
            print(f"❌ Failed: {response.status_code}")
            print(f"   Response: {response.text}")
            return None
    except Exception as e:
        print(f"❌ Error: {e}")
        return None


def test_get_stats():
    """Test getting condition registry statistics."""
    print("\n🧪 Test 6: Get Registry Statistics")
    print("=" * 50)
    
    try:
        response = requests.get(f"{API_BASE_URL}/conditions/stats")
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Statistics retrieved!")
            stats = result.get('stats', {})
            print(f"   Total Conditions: {stats.get('total_conditions')}")
            print(f"   Total Subscriptions: {stats.get('total_subscriptions')}")
            print(f"   Avg Subscribers/Condition: {stats.get('avg_subscribers_per_condition', 0):.2f}")
            return result
        else:
            print(f"❌ Failed: {response.status_code}")
            print(f"   Response: {response.text}")
            return None
    except Exception as e:
        print(f"❌ Error: {e}")
        return None


def main():
    """Run all tests."""
    print("🚀 Condition Registry API Tests")
    print("=" * 50)
    print(f"API Base URL: {API_BASE_URL}")
    print(f"Make sure backend is running on {API_BASE_URL}")
    
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
    # test_get_user_subscriptions()
    
    # Test 6: Get stats
    test_get_stats()
    
    print("\n" + "=" * 50)
    print("✅ Tests completed!")
    print("\nNext Steps:")
    print("1. Verify database tables are created")
    print("2. Check condition_registry table has entries")
    print("3. Check user_condition_subscriptions table")
    print("4. Proceed to DCA Bot integration")


if __name__ == "__main__":
    main()

