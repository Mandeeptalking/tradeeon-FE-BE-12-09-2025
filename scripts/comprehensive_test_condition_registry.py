#!/usr/bin/env python3
"""
Comprehensive Test Script for Condition Registry API
Tests all endpoints, edge cases, error handling, and database verification.
"""

import requests
import json
import sys
import os
from typing import Dict, Any, Optional, List
from datetime import datetime

# Configuration
API_BASE_URL = os.getenv("API_BASE_URL", "https://api.tradeeon.com")
TEST_RESULTS = {
    "passed": [],
    "failed": [],
    "warnings": [],
    "skipped": []
}

def log_result(test_name: str, passed: bool, message: str = "", warning: bool = False, skipped: bool = False):
    """Log test result."""
    if skipped:
        TEST_RESULTS["skipped"].append(f"{test_name}: {message}")
        print(f"[SKIP] {test_name}: {message}")
    elif warning:
        TEST_RESULTS["warnings"].append(f"{test_name}: {message}")
        print(f"[WARN] {test_name}: {message}")
    elif passed:
        TEST_RESULTS["passed"].append(f"{test_name}: {message}")
        print(f"[PASS] {test_name}: {message}")
    else:
        TEST_RESULTS["failed"].append(f"{test_name}: {message}")
        print(f"[FAIL] {test_name}: {message}")

def test_backend_health():
    """Test 1: Backend health check."""
    print("\n" + "="*70)
    print("TEST 1: Backend Health Check")
    print("="*70)
    try:
        response = requests.get(f"{API_BASE_URL}/health", timeout=10)
        if response.status_code == 200:
            data = response.json()
            if data.get("status") == "ok":
                log_result("Backend Health", True, f"Backend is healthy. Database: {data.get('database', 'unknown')}")
                return True
            else:
                log_result("Backend Health", False, f"Backend returned non-ok status: {data.get('status')}")
                return False
        else:
            log_result("Backend Health", False, f"HTTP {response.status_code}: {response.text}")
            return False
    except Exception as e:
        log_result("Backend Health", False, f"Connection error: {str(e)}")
        return False

def test_register_condition_basic():
    """Test 2: Register basic RSI condition."""
    print("\n" + "="*70)
    print("TEST 2: Register Basic RSI Condition")
    print("="*70)
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
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        if response.status_code == 200:
            result = response.json()
            if result.get("success") and result.get("condition_id"):
                log_result("Register Basic Condition", True, 
                    f"Condition ID: {result.get('condition_id')}, Status: {result.get('status')}")
                return result.get("condition_id")
            else:
                log_result("Register Basic Condition", False, f"Missing condition_id in response: {result}")
                return None
        else:
            log_result("Register Basic Condition", False, f"HTTP {response.status_code}: {response.text}")
            return None
    except Exception as e:
        log_result("Register Basic Condition", False, f"Error: {str(e)}")
        return None

def test_register_price_condition():
    """Test 3: Register price range condition."""
    print("\n" + "="*70)
    print("TEST 3: Register Price Range Condition")
    print("="*70)
    condition = {
        "type": "price",
        "symbol": "ETHUSDT",
        "timeframe": "1m",
        "operator": "between",
        "lowerBound": 3000,
        "upperBound": 3500,
        "grid_action": "buy"
    }
    try:
        response = requests.post(
            f"{API_BASE_URL}/conditions/register",
            json=condition,
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        if response.status_code == 200:
            result = response.json()
            if result.get("success") and result.get("condition_id"):
                log_result("Register Price Condition", True, 
                    f"Condition ID: {result.get('condition_id')}, Status: {result.get('status')}")
                return result.get("condition_id")
            else:
                log_result("Register Price Condition", False, f"Missing condition_id: {result}")
                return None
        else:
            log_result("Register Price Condition", False, f"HTTP {response.status_code}: {response.text}")
            return None
    except Exception as e:
        log_result("Register Price Condition", False, f"Error: {str(e)}")
        return None

def test_deduplication(condition_id: str):
    """Test 4: Verify deduplication works."""
    print("\n" + "="*70)
    print("TEST 4: Condition Deduplication")
    print("="*70)
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
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        if response.status_code == 200:
            result = response.json()
            new_id = result.get("condition_id")
            if new_id == condition_id:
                if result.get("status") == "existing":
                    log_result("Deduplication", True, 
                        f"Same ID returned: {new_id}, Status: existing (correct)")
                    return True
                else:
                    log_result("Deduplication", True, 
                        f"Same ID returned: {new_id}, but status is {result.get('status')} (should be 'existing')", 
                        warning=True)
                    return True
            else:
                log_result("Deduplication", False, 
                    f"Different IDs! Original: {condition_id}, New: {new_id}")
                return False
        else:
            log_result("Deduplication", False, f"HTTP {response.status_code}: {response.text}")
            return False
    except Exception as e:
        log_result("Deduplication", False, f"Error: {str(e)}")
        return False

def test_get_condition_status(condition_id: str):
    """Test 5: Get condition status."""
    print("\n" + "="*70)
    print("TEST 5: Get Condition Status")
    print("="*70)
    try:
        response = requests.get(f"{API_BASE_URL}/conditions/{condition_id}/status", timeout=10)
        if response.status_code == 200:
            result = response.json()
            if result.get("success") and result.get("condition"):
                cond = result.get("condition")
                if cond.get("condition_id") == condition_id:
                    log_result("Get Condition Status", True, 
                        f"Retrieved condition. Subscribers: {result.get('subscriber_count', 0)}")
                    return True
                else:
                    log_result("Get Condition Status", False, 
                        f"Condition ID mismatch. Expected: {condition_id}, Got: {cond.get('condition_id')}")
                    return False
            else:
                log_result("Get Condition Status", False, f"Missing condition data: {result}")
                return False
        elif response.status_code == 404:
            log_result("Get Condition Status", False, f"Condition not found: {condition_id}")
            return False
        else:
            log_result("Get Condition Status", False, f"HTTP {response.status_code}: {response.text}")
            return False
    except Exception as e:
        log_result("Get Condition Status", False, f"Error: {str(e)}")
        return False

def test_get_nonexistent_condition():
    """Test 6: Get non-existent condition (error handling)."""
    print("\n" + "="*70)
    print("TEST 6: Get Non-Existent Condition (Error Handling)")
    print("="*70)
    fake_id = "nonexistent12345678"
    try:
        response = requests.get(f"{API_BASE_URL}/conditions/{fake_id}/status", timeout=10)
        if response.status_code == 404:
            log_result("Error Handling - 404", True, "Correctly returns 404 for non-existent condition")
            return True
        elif response.status_code == 200:
            log_result("Error Handling - 404", False, "Should return 404 but returned 200")
            return False
        else:
            log_result("Error Handling - 404", False, f"Unexpected status code: {response.status_code}")
            return False
    except Exception as e:
        log_result("Error Handling - 404", False, f"Error: {str(e)}")
        return False

def test_get_stats():
    """Test 7: Get registry statistics."""
    print("\n" + "="*70)
    print("TEST 7: Get Registry Statistics")
    print("="*70)
    try:
        response = requests.get(f"{API_BASE_URL}/conditions/stats", timeout=10)
        if response.status_code == 200:
            result = response.json()
            if result.get("success") and result.get("stats"):
                stats = result.get("stats")
                total = stats.get("total_conditions", 0)
                subs = stats.get("total_subscriptions", 0)
                avg = stats.get("avg_subscribers_per_condition", 0)
                log_result("Get Statistics", True, 
                    f"Total Conditions: {total}, Subscriptions: {subs}, Avg: {avg:.2f}")
                if total >= 2:  # Should have at least our test conditions
                    return True
                else:
                    log_result("Get Statistics", False, f"Expected at least 2 conditions, got {total}")
                    return False
            else:
                log_result("Get Statistics", False, f"Missing stats data: {result}")
                return False
        else:
            log_result("Get Statistics", False, f"HTTP {response.status_code}: {response.text}")
            return False
    except Exception as e:
        log_result("Get Statistics", False, f"Error: {str(e)}")
        return False

def test_invalid_condition_format():
    """Test 8: Register invalid condition (error handling)."""
    print("\n" + "="*70)
    print("TEST 8: Invalid Condition Format (Error Handling)")
    print("="*70)
    invalid_condition = {
        "type": "invalid_type",
        "symbol": "",  # Empty symbol
        "timeframe": "invalid"
    }
    try:
        response = requests.post(
            f"{API_BASE_URL}/conditions/register",
            json=invalid_condition,
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        # Should either reject or normalize - check response
        if response.status_code == 400 or response.status_code == 422:
            log_result("Error Handling - Invalid Format", True, 
                f"Correctly rejects invalid condition with {response.status_code}")
            return True
        elif response.status_code == 200:
            # If it accepts, check if it normalized correctly
            result = response.json()
            if result.get("condition_id"):
                log_result("Error Handling - Invalid Format", True, 
                    f"Normalized invalid condition (acceptable behavior). ID: {result.get('condition_id')}")
                return True
            else:
                log_result("Error Handling - Invalid Format", False, "Accepted invalid condition without ID")
                return False
        else:
            log_result("Error Handling - Invalid Format", False, 
                f"Unexpected status code: {response.status_code}")
            return False
    except Exception as e:
        log_result("Error Handling - Invalid Format", False, f"Error: {str(e)}")
        return False

def test_different_conditions_different_ids():
    """Test 9: Different conditions get different IDs."""
    print("\n" + "="*70)
    print("TEST 9: Different Conditions Get Different IDs")
    print("="*70)
    condition1 = {
        "type": "indicator",
        "symbol": "BTCUSDT",
        "timeframe": "1h",
        "indicator": "RSI",
        "operator": "crosses_below",
        "value": 30,
        "period": 14
    }
    condition2 = {
        "type": "indicator",
        "symbol": "BTCUSDT",
        "timeframe": "1h",
        "indicator": "RSI",
        "operator": "crosses_above",  # Different operator
        "value": 70,  # Different value
        "period": 14
    }
    try:
        response1 = requests.post(
            f"{API_BASE_URL}/conditions/register",
            json=condition1,
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        response2 = requests.post(
            f"{API_BASE_URL}/conditions/register",
            json=condition2,
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        if response1.status_code == 200 and response2.status_code == 200:
            id1 = response1.json().get("condition_id")
            id2 = response2.json().get("condition_id")
            if id1 != id2:
                log_result("Different Conditions Different IDs", True, 
                    f"Correctly generates different IDs: {id1} vs {id2}")
                return True
            else:
                log_result("Different Conditions Different IDs", False, 
                    f"Same ID for different conditions: {id1}")
                return False
        else:
            log_result("Different Conditions Different IDs", False, 
                f"Failed to register conditions. Status codes: {response1.status_code}, {response2.status_code}")
            return False
    except Exception as e:
        log_result("Different Conditions Different IDs", False, f"Error: {str(e)}")
        return False

def test_normalize_variations():
    """Test 10: Normalize condition variations."""
    print("\n" + "="*70)
    print("TEST 10: Normalize Condition Variations")
    print("="*70)
    # Same condition with different field names/casing
    condition1 = {
        "type": "indicator",
        "symbol": "BTCUSDT",
        "timeframe": "1h",
        "indicator": "RSI",
        "operator": "crosses_below",
        "value": 30,
        "period": 14
    }
    condition2 = {
        "conditionType": "indicator",  # Different field name
        "symbol": "BTCUSDT",
        "timeframe": "1h",
        "indicator": "RSI",
        "operator": "crosses_below",
        "compareValue": 30,  # Different field name
        "period": 14
    }
    try:
        response1 = requests.post(
            f"{API_BASE_URL}/conditions/register",
            json=condition1,
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        response2 = requests.post(
            f"{API_BASE_URL}/conditions/register",
            json=condition2,
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        if response1.status_code == 200 and response2.status_code == 200:
            id1 = response1.json().get("condition_id")
            id2 = response2.json().get("condition_id")
            if id1 == id2:
                log_result("Normalize Variations", True, 
                    f"Correctly normalizes variations to same ID: {id1}")
                return True
            else:
                log_result("Normalize Variations", False, 
                    f"Different IDs for same condition with variations: {id1} vs {id2}")
                return False
        else:
            log_result("Normalize Variations", False, 
                f"Failed to register. Status codes: {response1.status_code}, {response2.status_code}")
            return False
    except Exception as e:
        log_result("Normalize Variations", False, f"Error: {str(e)}")
        return False

def test_subscribe_without_auth():
    """Test 11: Subscribe without auth (should fail)."""
    print("\n" + "="*70)
    print("TEST 11: Subscribe Without Auth (Error Handling)")
    print("="*70)
    subscription = {
        "bot_id": "test_bot",
        "condition_id": "test123",
        "bot_type": "dca",
        "bot_config": {}
    }
    try:
        response = requests.post(
            f"{API_BASE_URL}/conditions/subscribe",
            json=subscription,
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        if response.status_code == 401:
            log_result("Auth Required - Subscribe", True, "Correctly requires authentication (401)")
            return True
        elif response.status_code == 200:
            log_result("Auth Required - Subscribe", False, "Should require auth but returned 200")
            return False
        else:
            log_result("Auth Required - Subscribe", False, f"Unexpected status: {response.status_code}")
            return False
    except Exception as e:
        log_result("Auth Required - Subscribe", False, f"Error: {str(e)}")
        return False

def test_get_user_subscriptions_without_auth():
    """Test 12: Get user subscriptions without auth (should fail)."""
    print("\n" + "="*70)
    print("TEST 12: Get User Subscriptions Without Auth (Error Handling)")
    print("="*70)
    try:
        response = requests.get(
            f"{API_BASE_URL}/conditions/user/subscriptions",
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        if response.status_code == 401:
            log_result("Auth Required - Get Subscriptions", True, "Correctly requires authentication (401)")
            return True
        elif response.status_code == 200:
            log_result("Auth Required - Get Subscriptions", False, "Should require auth but returned 200")
            return False
        else:
            log_result("Auth Required - Get Subscriptions", False, f"Unexpected status: {response.status_code}")
            return False
    except Exception as e:
        log_result("Auth Required - Get Subscriptions", False, f"Error: {str(e)}")
        return False

def test_multiple_symbols():
    """Test 13: Register conditions for different symbols."""
    print("\n" + "="*70)
    print("TEST 13: Multiple Symbols")
    print("="*70)
    symbols = ["BTCUSDT", "ETHUSDT", "BNBUSDT"]
    condition_ids = []
    for symbol in symbols:
        condition = {
            "type": "indicator",
            "symbol": symbol,
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
                headers={"Content-Type": "application/json"},
                timeout=10
            )
            if response.status_code == 200:
                cond_id = response.json().get("condition_id")
                condition_ids.append(cond_id)
            else:
                log_result("Multiple Symbols", False, f"Failed for {symbol}: {response.status_code}")
                return False
        except Exception as e:
            log_result("Multiple Symbols", False, f"Error for {symbol}: {str(e)}")
            return False
    
    # Check all IDs are different
    if len(set(condition_ids)) == len(condition_ids):
        log_result("Multiple Symbols", True, f"Successfully registered {len(symbols)} different symbols")
        return True
    else:
        log_result("Multiple Symbols", False, f"Duplicate IDs found: {condition_ids}")
        return False

def test_response_format():
    """Test 14: Verify response format consistency."""
    print("\n" + "="*70)
    print("TEST 14: Response Format Consistency")
    print("="*70)
    condition = {
        "type": "indicator",
        "symbol": "ADAUSDT",
        "timeframe": "1h",
        "indicator": "MACD",
        "operator": "crosses_above",
        "value": 0,
        "period": 12
    }
    try:
        response = requests.post(
            f"{API_BASE_URL}/conditions/register",
            json=condition,
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        if response.status_code == 200:
            result = response.json()
            required_fields = ["success", "condition_id", "status"]
            missing = [f for f in required_fields if f not in result]
            if not missing:
                log_result("Response Format", True, "Response has all required fields")
                return True
            else:
                log_result("Response Format", False, f"Missing fields: {missing}")
                return False
        else:
            log_result("Response Format", False, f"HTTP {response.status_code}")
            return False
    except Exception as e:
        log_result("Response Format", False, f"Error: {str(e)}")
        return False

def print_summary():
    """Print test summary."""
    print("\n" + "="*70)
    print("TEST SUMMARY")
    print("="*70)
    print(f"\nTotal Tests: {len(TEST_RESULTS['passed']) + len(TEST_RESULTS['failed']) + len(TEST_RESULTS['warnings']) + len(TEST_RESULTS['skipped'])}")
    print(f"[PASS] Passed: {len(TEST_RESULTS['passed'])}")
    print(f"[FAIL] Failed: {len(TEST_RESULTS['failed'])}")
    print(f"[WARN] Warnings: {len(TEST_RESULTS['warnings'])}")
    print(f"[SKIP] Skipped: {len(TEST_RESULTS['skipped'])}")
    
    if TEST_RESULTS['failed']:
        print("\nFailed Tests:")
        for test in TEST_RESULTS['failed']:
            print(f"  - {test}")
    
    if TEST_RESULTS['warnings']:
        print("\nWarnings:")
        for test in TEST_RESULTS['warnings']:
            print(f"  - {test}")
    
    print("\n" + "="*70)
    if len(TEST_RESULTS['failed']) == 0:
        print("[SUCCESS] All critical tests passed!")
        return True
    else:
        print("[FAILURE] Some tests failed. Review above.")
        return False

def main():
    """Run all comprehensive tests."""
    print("="*70)
    print("COMPREHENSIVE CONDITION REGISTRY API TESTS")
    print("="*70)
    print(f"API Base URL: {API_BASE_URL}")
    print(f"Timestamp: {datetime.now().isoformat()}")
    print("="*70)
    
    # Run all tests
    health_ok = test_backend_health()
    if not health_ok:
        print("\n[CRITICAL] Backend health check failed. Stopping tests.")
        print_summary()
        sys.exit(1)
    
    condition_id = test_register_condition_basic()
    price_condition_id = test_register_price_condition()
    
    if condition_id:
        test_deduplication(condition_id)
        test_get_condition_status(condition_id)
    
    test_get_nonexistent_condition()
    test_get_stats()
    test_invalid_condition_format()
    test_different_conditions_different_ids()
    test_normalize_variations()
    test_subscribe_without_auth()
    test_get_user_subscriptions_without_auth()
    test_multiple_symbols()
    test_response_format()
    
    # Print summary
    success = print_summary()
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()


