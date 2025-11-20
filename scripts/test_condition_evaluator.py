#!/usr/bin/env python3
"""
Test Script for Phase 2.1 - Centralized Condition Evaluator

Tests the condition evaluator service to ensure it:
1. Can discover active conditions
2. Can fetch market data
3. Can evaluate conditions
4. Can publish triggers
"""

import sys
import os
import asyncio
import logging
from datetime import datetime

# Add paths - need root directory for 'apps' and 'backend' modules
root_path = os.path.join(os.path.dirname(__file__), '..')
bots_path = os.path.join(root_path, 'apps', 'bots')
api_path = os.path.join(root_path, 'apps', 'api')
backend_path = os.path.join(root_path, 'backend')

# Add root first (for 'apps' imports)
if root_path not in sys.path:
    sys.path.insert(0, root_path)
# Add backend path
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)
# Add bots path
if bots_path not in sys.path:
    sys.path.insert(0, bots_path)
# Add api path
if api_path not in sys.path:
    sys.path.insert(0, api_path)

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)

TEST_RESULTS = {
    "passed": [],
    "failed": [],
    "warnings": []
}

def log_result(test_name: str, passed: bool, message: str = "", warning: bool = False):
    """Log test result."""
    if warning:
        TEST_RESULTS["warnings"].append(f"{test_name}: {message}")
        print(f"[WARN] {test_name}: {message}")
    elif passed:
        TEST_RESULTS["passed"].append(f"{test_name}: {message}")
        print(f"[PASS] {test_name}: {message}")
    else:
        TEST_RESULTS["failed"].append(f"{test_name}: {message}")
        print(f"[FAIL] {test_name}: {message}")


async def test_supabase_connection():
    """Test 1: Verify Supabase connection."""
    print("\n" + "="*70)
    print("TEST 1: Supabase Connection")
    print("="*70)
    try:
        from apps.api.clients.supabase_client import supabase
        
        if not supabase:
            log_result("Supabase Connection", False, "Supabase client not initialized")
            return False
        
        # Test connection by querying a simple table
        result = supabase.table("condition_registry").select("condition_id").limit(1).execute()
        log_result("Supabase Connection", True, "Connected successfully")
        return True
    except Exception as e:
        log_result("Supabase Connection", False, f"Connection error: {str(e)}")
        return False


async def test_market_data_service():
    """Test 2: Verify Market Data Service."""
    print("\n" + "="*70)
    print("TEST 2: Market Data Service")
    print("="*70)
    try:
        from market_data import MarketDataService
        
        market_data = MarketDataService()
        await market_data.initialize()
        
        # Test fetching data for BTCUSDT
        df = await market_data.get_klines_as_dataframe("BTCUSDT", "1h", limit=10)
        
        if df.empty:
            log_result("Market Data Service", False, "No data returned")
            return False
        
        if len(df) < 5:
            log_result("Market Data Service", False, f"Only {len(df)} candles returned")
            return False
        
        log_result("Market Data Service", True, f"Fetched {len(df)} candles for BTCUSDT")
        await market_data.cleanup()
        # Give time for cleanup
        await asyncio.sleep(0.5)
        return True
    except Exception as e:
        log_result("Market Data Service", False, f"Error: {str(e)}")
        return False


async def test_condition_discovery():
    """Test 3: Verify condition discovery."""
    print("\n" + "="*70)
    print("TEST 3: Condition Discovery")
    print("="*70)
    try:
        from apps.api.clients.supabase_client import supabase
        
        if not supabase:
            log_result("Condition Discovery", False, "Supabase not available")
            return False
        
        # Get all conditions
        result = supabase.table("condition_registry").select("*").execute()
        
        if not result.data:
            log_result("Condition Discovery", True, "No conditions found (this is OK if none registered yet)")
            return True
        
        conditions = result.data
        symbols = list(set([c["symbol"] for c in conditions]))
        timeframes = list(set([c["timeframe"] for c in conditions]))
        
        log_result("Condition Discovery", True, 
            f"Found {len(conditions)} conditions across {len(symbols)} symbols and {len(timeframes)} timeframes")
        
        if symbols:
            print(f"  Symbols: {', '.join(symbols[:5])}{'...' if len(symbols) > 5 else ''}")
        if timeframes:
            print(f"  Timeframes: {', '.join(timeframes)}")
        
        return True
    except Exception as e:
        log_result("Condition Discovery", False, f"Error: {str(e)}")
        return False


async def test_evaluator_initialization():
    """Test 4: Verify evaluator initialization."""
    print("\n" + "="*70)
    print("TEST 4: Evaluator Initialization")
    print("="*70)
    try:
        from condition_evaluator import CentralizedConditionEvaluator
        from apps.api.clients.supabase_client import supabase
        
        evaluator = CentralizedConditionEvaluator(
            supabase_client=supabase,
            event_bus=None
        )
        
        await evaluator.initialize()
        
        if not evaluator.running:
            log_result("Evaluator Initialization", False, "Evaluator not running after initialization")
            return False
        
        log_result("Evaluator Initialization", True, "Evaluator initialized successfully")
        
        await evaluator.stop()
        return True
    except Exception as e:
        log_result("Evaluator Initialization", False, f"Error: {str(e)}")
        return False


async def test_active_symbols_discovery():
    """Test 5: Verify active symbols discovery."""
    print("\n" + "="*70)
    print("TEST 5: Active Symbols Discovery")
    print("="*70)
    try:
        from condition_evaluator import CentralizedConditionEvaluator
        from apps.api.clients.supabase_client import supabase
        
        evaluator = CentralizedConditionEvaluator(
            supabase_client=supabase,
            event_bus=None
        )
        
        await evaluator.initialize()
        
        symbols = await evaluator._get_active_symbols()
        
        if symbols is None:
            log_result("Active Symbols Discovery", False, "Returned None instead of list")
            return False
        
        log_result("Active Symbols Discovery", True, 
            f"Discovered {len(symbols)} active symbols: {', '.join(symbols[:5]) if symbols else 'none'}")
        
        await evaluator.stop()
        return True
    except Exception as e:
        log_result("Active Symbols Discovery", False, f"Error: {str(e)}")
        return False


async def test_condition_evaluation():
    """Test 6: Verify condition evaluation (if conditions exist)."""
    print("\n" + "="*70)
    print("TEST 6: Condition Evaluation")
    print("="*70)
    try:
        from condition_evaluator import CentralizedConditionEvaluator
        from apps.api.clients.supabase_client import supabase
        
        if not supabase:
            log_result("Condition Evaluation", False, "Supabase not available")
            return False
        
        # Check if we have any conditions
        result = supabase.table("condition_registry").select("*").limit(1).execute()
        if not result.data:
            log_result("Condition Evaluation", True, 
                "No conditions to evaluate (this is OK - create a bot with conditions first)", warning=True)
            return True
        
        evaluator = CentralizedConditionEvaluator(
            supabase_client=supabase,
            event_bus=None
        )
        
        await evaluator.initialize()
        
        # Try to evaluate a single symbol/timeframe
        symbols = await evaluator._get_active_symbols()
        if not symbols:
            log_result("Condition Evaluation", True, 
                "No active symbols found (this is OK)", warning=True)
            await evaluator.stop()
            return True
        
        # Evaluate first symbol with 1h timeframe
        test_symbol = symbols[0]
        await evaluator.evaluate_symbol_timeframe(test_symbol, "1h")
        
        log_result("Condition Evaluation", True, 
            f"Successfully evaluated conditions for {test_symbol} 1h")
        
        await evaluator.stop()
        return True
    except Exception as e:
        log_result("Condition Evaluation", False, f"Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


async def test_create_test_condition():
    """Test 7: Create a test condition for evaluation."""
    print("\n" + "="*70)
    print("TEST 7: Create Test Condition")
    print("="*70)
    try:
        import requests
        import os
        
        API_BASE_URL = os.getenv("API_BASE_URL", "https://api.tradeeon.com")
        
        # Register a test condition
        condition = {
            "type": "indicator",
            "symbol": "BTCUSDT",
            "timeframe": "1h",
            "indicator": "RSI",
            "operator": "crosses_below",
            "value": 30,
            "period": 14
        }
        
        response = requests.post(
            f"{API_BASE_URL}/conditions/register",
            json=condition,
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        if response.status_code == 200:
            result = response.json()
            condition_id = result.get("condition_id")
            log_result("Create Test Condition", True, 
                f"Created test condition: {condition_id}")
            return True, condition_id
        else:
            log_result("Create Test Condition", False, 
                f"HTTP {response.status_code}: {response.text}")
            return False, None
    except Exception as e:
        log_result("Create Test Condition", False, f"Error: {str(e)}")
        return False, None


def print_summary():
    """Print test summary."""
    print("\n" + "="*70)
    print("TEST SUMMARY")
    print("="*70)
    print(f"\nTotal Tests: {len(TEST_RESULTS['passed']) + len(TEST_RESULTS['failed']) + len(TEST_RESULTS['warnings'])}")
    print(f"[PASS] Passed: {len(TEST_RESULTS['passed'])}")
    print(f"[FAIL] Failed: {len(TEST_RESULTS['failed'])}")
    print(f"[WARN] Warnings: {len(TEST_RESULTS['warnings'])}")
    
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


async def main():
    """Run all tests."""
    print("="*70)
    print("PHASE 2.1 - CONDITION EVALUATOR TEST SUITE")
    print("="*70)
    print(f"Timestamp: {datetime.now().isoformat()}")
    print("="*70)
    
    # Run tests
    await test_supabase_connection()
    await test_market_data_service()
    await test_condition_discovery()
    await test_evaluator_initialization()
    await test_active_symbols_discovery()
    
    # Try to create a test condition
    success, condition_id = await test_create_test_condition()
    
    # Test evaluation (will work if conditions exist)
    await test_condition_evaluation()
    
    # Print summary
    success = print_summary()
    return success


if __name__ == "__main__":
    try:
        success = asyncio.run(main())
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n[INTERRUPTED] Tests interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n[ERROR] Fatal error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

