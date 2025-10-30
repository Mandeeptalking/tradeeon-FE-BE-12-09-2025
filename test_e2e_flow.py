#!/usr/bin/env python3
"""
Quick E2E Test Script for DCA Bot Flow
Tests critical endpoints without full UI interaction
"""

import requests
import json
import time
from typing import Dict, Any, Optional

API_BASE_URL = "http://localhost:8000"

def test_backend_health() -> bool:
    """Test if backend is running."""
    try:
        response = requests.get(f"{API_BASE_URL}/health", timeout=5)
        if response.status_code == 200:
            data = response.json()
            print("✅ Backend Health Check: PASS")
            print(f"   Status: {data.get('status')}")
            return True
        else:
            print(f"❌ Backend Health Check: FAIL (Status {response.status_code})")
            return False
    except requests.exceptions.ConnectionError:
        print("❌ Backend Health Check: FAIL (Cannot connect to backend)")
        print(f"   Make sure backend is running on {API_BASE_URL}")
        return False
    except Exception as e:
        print(f"❌ Backend Health Check: FAIL ({e})")
        return False


def test_binance_data() -> bool:
    """Test if Binance market data endpoint works."""
    try:
        response = requests.get(f"{API_BASE_URL}/api/symbols", timeout=10)
        if response.status_code == 200:
            data = response.json()
            symbol_count = data.get("count", 0)
            print("✅ Binance Market Data: PASS")
            print(f"   Symbols available: {symbol_count}")
            if symbol_count > 0:
                symbols = data.get("symbols", [])
                if symbols:
                    print(f"   Sample: {symbols[0].get('symbol', 'N/A')}")
            return True
        else:
            print(f"❌ Binance Market Data: FAIL (Status {response.status_code})")
            return False
    except Exception as e:
        print(f"❌ Binance Market Data: FAIL ({e})")
        return False


def test_exchange_connection() -> bool:
    """Test exchange connection endpoint."""
    try:
        test_body = {
            "exchange": "BINANCE",
            "api_key": "test_key",
            "api_secret": "test_secret"
        }
        response = requests.post(
            f"{API_BASE_URL}/connections/connections/test",
            json=test_body,
            timeout=5
        )
        if response.status_code == 200:
            data = response.json()
            print("✅ Exchange Connection Test: PASS")
            print(f"   Result: {data.get('message', 'N/A')}")
            return True
        else:
            print(f"❌ Exchange Connection Test: FAIL (Status {response.status_code})")
            print(f"   Response: {response.text[:200]}")
            return False
    except Exception as e:
        print(f"❌ Exchange Connection Test: FAIL ({e})")
        return False


def test_bot_creation() -> bool:
    """Test DCA bot creation endpoint."""
    try:
        bot_config = {
            "botName": "E2E Test Bot",
            "direction": "long",
            "pair": "BTC/USDT",
            "selectedPairs": ["BTC/USDT"],
            "exchange": "Binance",
            "botType": "single",
            "profitCurrency": "quote",
            "baseOrderSize": 100,
            "baseOrderCurrency": "USDT",
            "startOrderType": "market",
            "tradeStartCondition": True,
            "tradingMode": "test",
            "useLiveData": True,
            "conditionConfig": {
                "mode": "simple",
                "conditionType": "RSI Conditions",
                "condition": {
                    "type": "indicator",
                    "indicator": "RSI",
                    "component": "RSI",
                    "operator": "crosses_above",
                    "value": 30,
                    "period": 14
                }
            },
            "dcaRules": {
                "ruleType": "down_from_last_entry",
                "percentage": 5,
                "maxDcaPerPosition": 3,
                "maxDcaAcrossAllPositions": 10,
                "dcaCooldownValue": 60,
                "dcaCooldownUnit": "minutes",
                "waitForPreviousDca": True
            },
            "dcaAmount": {
                "amountType": "fixed",
                "fixedAmount": 100,
                "multiplier": 1.0
            },
            "phase1Features": {}
        }
        
        response = requests.post(
            f"{API_BASE_URL}/bots/dca-bots",
            json=bot_config,
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            bot_id = data.get("bot_id")
            print("✅ Bot Creation: PASS")
            print(f"   Bot ID: {bot_id}")
            return bot_id
        else:
            print(f"❌ Bot Creation: FAIL (Status {response.status_code})")
            print(f"   Response: {response.text[:500]}")
            return None
    except Exception as e:
        print(f"❌ Bot Creation: FAIL ({e})")
        return None


def test_bot_start(bot_id: str) -> bool:
    """Test bot start endpoint."""
    if not bot_id:
        print("⏭️  Bot Start: SKIP (no bot_id)")
        return False
        
    try:
        start_body = {
            "initial_balance": 10000,
            "interval_seconds": 60,
            "use_live_data": True
        }
        
        response = requests.post(
            f"{API_BASE_URL}/bots/dca-bots/{bot_id}/start-paper",
            json=start_body,
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Bot Start: PASS")
            print(f"   Message: {data.get('message', 'N/A')}")
            return True
        else:
            print(f"❌ Bot Start: FAIL (Status {response.status_code})")
            print(f"   Response: {response.text[:500]}")
            return False
    except Exception as e:
        print(f"❌ Bot Start: FAIL ({e})")
        return False


def test_bot_status(bot_id: str) -> bool:
    """Test bot status endpoint."""
    if not bot_id:
        print("⏭️  Bot Status: SKIP (no bot_id)")
        return False
        
    try:
        response = requests.get(
            f"{API_BASE_URL}/bots/dca-bots/status/{bot_id}",
            timeout=5
        )
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Bot Status: PASS")
            status = data.get("status", "unknown")
            balance = data.get("current_balance", 0)
            print(f"   Status: {status}")
            print(f"   Balance: ${balance:.2f}")
            return True
        else:
            print(f"❌ Bot Status: FAIL (Status {response.status_code})")
            print(f"   Response: {response.text[:500]}")
            return False
    except Exception as e:
        print(f"❌ Bot Status: FAIL ({e})")
        return False


def main():
    """Run all E2E tests."""
    print("=" * 60)
    print("DCA Bot E2E Test - Backend API Verification")
    print("=" * 60)
    print()
    
    results = {
        "backend_health": False,
        "binance_data": False,
        "exchange_connection": False,
        "bot_creation": False,
        "bot_start": False,
        "bot_status": False
    }
    
    # Test 1: Backend Health
    print("1. Testing Backend Health...")
    results["backend_health"] = test_backend_health()
    print()
    
    if not results["backend_health"]:
        print("⚠️  Backend is not running. Please start the backend first:")
        print("   cd apps/api")
        print("   uvicorn main:app --reload --host 0.0.0.0 --port 8000")
        print()
        return
    
    # Test 2: Binance Data
    print("2. Testing Binance Market Data...")
    results["binance_data"] = test_binance_data()
    print()
    
    # Test 3: Exchange Connection
    print("3. Testing Exchange Connection Endpoint...")
    results["exchange_connection"] = test_exchange_connection()
    print()
    
    # Test 4: Bot Creation
    print("4. Testing Bot Creation...")
    bot_id = test_bot_creation()
    results["bot_creation"] = bot_id is not None
    print()
    
    # Test 5: Bot Start
    if bot_id:
        print("5. Testing Bot Start...")
        results["bot_start"] = test_bot_start(bot_id)
        print()
        
        # Wait a moment for bot to initialize
        if results["bot_start"]:
            print("   Waiting 2 seconds for bot initialization...")
            time.sleep(2)
            print()
        
        # Test 6: Bot Status
        print("6. Testing Bot Status...")
        results["bot_status"] = test_bot_status(bot_id)
        print()
    
    # Summary
    print("=" * 60)
    print("TEST SUMMARY")
    print("=" * 60)
    
    passed = sum(1 for v in results.values() if v)
    total = len(results)
    
    for test_name, result in results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"  {test_name.replace('_', ' ').title()}: {status}")
    
    print()
    print(f"Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All backend API tests passed!")
        print("   Ready for full E2E testing with frontend")
    else:
        print("⚠️  Some tests failed. Please fix issues before full E2E testing")
        print()
        print("Next Steps:")
        print("  1. Fix any failed backend endpoints")
        print("  2. Ensure backend is running correctly")
        print("  3. Test frontend UI flow manually")


if __name__ == "__main__":
    main()


