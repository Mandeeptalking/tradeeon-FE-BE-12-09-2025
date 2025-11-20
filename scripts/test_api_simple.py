#!/usr/bin/env python3
"""
Simple API test script - No authentication required for basic endpoints.

Run this after:
1. Database migration is complete
2. Backend API is running on http://localhost:8000
"""

import requests
import json
import sys

API_BASE_URL = "http://localhost:8000"

def test_register_condition():
    """Test registering a condition."""
    print("\n🧪 Test 1: Register RSI Condition")
    print("-" * 50)
    
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
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Success!")
            print(f"   Condition ID: {result.get('condition_id')}")
            print(f"   Status: {result.get('status')}")
            return result.get('condition_id')
        else:
            print(f"❌ Failed")
            print(f"   Response: {response.text}")
            return None
    except requests.exceptions.ConnectionError:
        print(f"❌ Cannot connect to {API_BASE_URL}")
        print(f"   Make sure backend is running: uvicorn apps.api.main:app --reload --port 8000")
        return None
    except Exception as e:
        print(f"❌ Error: {e}")
        return None


def test_register_price_condition():
    """Test registering a price range condition."""
    print("\n🧪 Test 2: Register Price Range Condition")
    print("-" * 50)
    
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
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Success!")
            print(f"   Condition ID: {result.get('condition_id')}")
            return result.get('condition_id')
        else:
            print(f"❌ Failed")
            print(f"   Response: {response.text}")
            return None
    except Exception as e:
        print(f"❌ Error: {e}")
        return None


def test_get_condition_status(condition_id: str):
    """Test getting condition status."""
    print(f"\n🧪 Test 3: Get Condition Status ({condition_id})")
    print("-" * 50)
    
    try:
        response = requests.get(f"{API_BASE_URL}/conditions/{condition_id}/status")
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Success!")
            print(f"   Condition Type: {result.get('condition', {}).get('condition_type')}")
            print(f"   Symbol: {result.get('condition', {}).get('symbol')}")
            print(f"   Subscriber Count: {result.get('subscriber_count')}")
            return result
        else:
            print(f"❌ Failed")
            print(f"   Response: {response.text}")
            return None
    except Exception as e:
        print(f"❌ Error: {e}")
        return None


def test_get_stats():
    """Test getting registry statistics."""
    print("\n🧪 Test 4: Get Registry Statistics")
    print("-" * 50)
    
    try:
        response = requests.get(f"{API_BASE_URL}/conditions/stats")
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            stats = result.get('stats', {})
            print(f"✅ Success!")
            print(f"   Total Conditions: {stats.get('total_conditions')}")
            print(f"   Total Subscriptions: {stats.get('total_subscriptions')}")
            print(f"   Avg Subscribers/Condition: {stats.get('avg_subscribers_per_condition', 0):.2f}")
            return result
        else:
            print(f"❌ Failed")
            print(f"   Response: {response.text}")
            return None
    except Exception as e:
        print(f"❌ Error: {e}")
        return None


def test_deduplication():
    """Test that same condition returns same ID."""
    print("\n🧪 Test 5: Condition Deduplication")
    print("-" * 50)
    
    condition = {
        "type": "price",
        "symbol": "ETHUSDT",
        "timeframe": "1m",
        "operator": "between",
        "lowerBound": 3000,
        "upperBound": 3200
    }
    
    try:
        # Register first time
        response1 = requests.post(
            f"{API_BASE_URL}/conditions/register",
            json=condition
        )
        id1 = response1.json().get('condition_id')
        print(f"First registration: {id1}")
        
        # Register same condition again
        response2 = requests.post(
            f"{API_BASE_URL}/conditions/register",
            json=condition
        )
        id2 = response2.json().get('condition_id')
        print(f"Second registration: {id2}")
        
        if id1 == id2:
            print(f"✅ Deduplication works! Same condition = Same ID")
            return True
        else:
            print(f"❌ Deduplication failed! Got different IDs")
            return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False


def main():
    """Run all tests."""
    print("=" * 60)
    print("🚀 Condition Registry API Tests")
    print("=" * 60)
    print(f"API Base URL: {API_BASE_URL}")
    print("\nMake sure:")
    print("1. Backend is running: uvicorn apps.api.main:app --reload --port 8000")
    print("2. Database migration is complete")
    print("3. Supabase credentials are configured")
    print("=" * 60)
    
    # Test 1: Register RSI condition
    rsi_id = test_register_condition()
    
    # Test 2: Register price condition
    price_id = test_register_price_condition()
    
    # Test 3: Get condition status
    if rsi_id:
        test_get_condition_status(rsi_id)
    
    # Test 4: Get stats
    test_get_stats()
    
    # Test 5: Deduplication
    test_deduplication()
    
    print("\n" + "=" * 60)
    print("✅ Tests completed!")
    print("\nNext Steps:")
    print("1. If all tests passed, proceed to DCA Bot integration")
    print("2. If tests failed, check:")
    print("   - Backend is running")
    print("   - Database migration completed")
    print("   - Supabase credentials are correct")
    print("=" * 60)


if __name__ == "__main__":
    main()


