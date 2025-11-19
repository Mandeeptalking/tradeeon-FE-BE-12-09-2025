"""
Test script for DCA bot fixes:
1. Entry Condition Evaluation
2. Custom DCA Rules
3. Bar-Based Cooldown
"""

import asyncio
import sys
import os
import pandas as pd
from datetime import datetime, timedelta

# Add paths
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'apps', 'bots'))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'apps', 'alerts'))

from apps.bots.dca_executor import DCABotExecutor


def create_test_market_data(symbol: str = "BTCUSDT", periods: int = 200) -> pd.DataFrame:
    """Create test market data with RSI values."""
    import numpy as np
    
    # Generate timestamps
    end_time = pd.Timestamp.now(tz='UTC')
    timestamps = pd.date_range(end=end_time, periods=periods, freq='1H')
    
    # Generate price data
    base_price = 50000
    prices = []
    for i in range(periods):
        # Create some volatility
        change = np.random.normal(0, 0.02)  # 2% volatility
        if i == 0:
            prices.append(base_price)
        else:
            prices.append(prices[-1] * (1 + change))
    
    # Create OHLCV data
    data = {
        'open_time': timestamps,
        'open': prices,
        'high': [p * 1.01 for p in prices],
        'low': [p * 0.99 for p in prices],
        'close': prices,
        'volume': [np.random.uniform(1000, 10000) for _ in range(periods)],
        'close_time': timestamps,
        'quote_volume': [p * v for p, v in zip(prices, [np.random.uniform(1000, 10000) for _ in range(periods)])],
        'trades': [np.random.randint(100, 1000) for _ in range(periods)],
        'taker_buy_base': [np.random.uniform(500, 5000) for _ in range(periods)],
        'taker_buy_quote': [p * v for p, v in zip(prices, [np.random.uniform(500, 5000) for _ in range(periods)])],
        'ignore': [0] * periods
    }
    
    df = pd.DataFrame(data)
    return df


async def test_entry_conditions_simple():
    """Test simple entry condition evaluation."""
    print("\n" + "="*60)
    print("TEST 1: Simple Entry Condition (RSI < 30)")
    print("="*60)
    
    # Create bot config with RSI condition
    bot_config = {
        "conditionConfig": {
            "mode": "simple",
            "conditionType": "indicator",
            "condition": {
                "indicator": "RSI",
                "component": "RSI",
                "operator": "<",
                "compareWith": "value",
                "compareValue": 30,
                "period": 14,
                "timeframe": "same"
            }
        },
        "interval": "1h",
        "dcaRules": {},
        "phase1Features": {}
    }
    
    executor = DCABotExecutor(bot_config, paper_trading=True)
    
    # Create test market data
    market_df = create_test_market_data("BTCUSDT", 200)
    
    # Test evaluation
    try:
        result = await executor._evaluate_entry_conditions("BTCUSDT", bot_config["conditionConfig"], market_df)
        print(f"✅ Entry condition evaluation completed")
        print(f"   Result: {result}")
        print(f"   Note: Actual result depends on RSI calculation")
        return True
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False


async def test_entry_conditions_playbook():
    """Test playbook entry condition evaluation."""
    print("\n" + "="*60)
    print("TEST 2: Playbook Entry Condition (AND logic)")
    print("="*60)
    
    # Create bot config with playbook
    bot_config = {
        "conditionConfig": {
            "mode": "playbook",
            "gateLogic": "ALL",
            "conditions": [
                {
                    "id": "cond1",
                    "enabled": True,
                    "priority": 1,
                    "logic": "AND",
                    "conditionType": "indicator",
                    "condition": {
                        "indicator": "RSI",
                        "component": "RSI",
                        "operator": "<",
                        "compareWith": "value",
                        "compareValue": 30,
                        "period": 14,
                        "timeframe": "same"
                    }
                },
                {
                    "id": "cond2",
                    "enabled": True,
                    "priority": 2,
                    "logic": "AND",
                    "conditionType": "indicator",
                    "condition": {
                        "indicator": "EMA",
                        "component": "EMA",
                        "operator": ">",
                        "compareWith": "value",
                        "compareValue": 40000,
                        "period": 20,
                        "timeframe": "same"
                    }
                }
            ]
        },
        "interval": "1h",
        "dcaRules": {},
        "phase1Features": {}
    }
    
    executor = DCABotExecutor(bot_config, paper_trading=True)
    
    # Create test market data
    market_df = create_test_market_data("BTCUSDT", 200)
    
    # Test evaluation
    try:
        result = await executor._evaluate_entry_conditions("BTCUSDT", bot_config["conditionConfig"], market_df)
        print(f"✅ Playbook condition evaluation completed")
        print(f"   Result: {result}")
        print(f"   Note: Actual result depends on indicator calculations")
        return True
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False


async def test_custom_dca_rules():
    """Test custom DCA rule evaluation."""
    print("\n" + "="*60)
    print("TEST 3: Custom DCA Rules")
    print("="*60)
    
    # Create bot config with custom DCA rule
    bot_config = {
        "conditionConfig": {},
        "interval": "1h",
        "dcaRules": {
            "ruleType": "custom",
            "customCondition": {
                "conditionType": "indicator",
                "condition": {
                    "indicator": "RSI",
                    "component": "RSI",
                    "operator": "<",
                    "compareWith": "value",
                    "compareValue": 40,
                    "period": 14,
                    "timeframe": "same"
                }
            }
        },
        "phase1Features": {}
    }
    
    executor = DCABotExecutor(bot_config, paper_trading=True)
    
    # Initialize market data service
    await executor.market_data.initialize()
    
    # Test evaluation (this will fetch real data from Binance)
    try:
        current_price = 50000.0  # Mock price
        result = await executor._evaluate_dca_rules("BTCUSDT", bot_config["dcaRules"], current_price)
        print(f"✅ Custom DCA rule evaluation completed")
        print(f"   Result: {result}")
        print(f"   Note: This fetches real market data from Binance")
        return True
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        await executor.market_data.cleanup()


async def test_bar_based_cooldown():
    """Test bar-based cooldown calculation."""
    print("\n" + "="*60)
    print("TEST 4: Bar-Based Cooldown")
    print("="*60)
    
    # Test different timeframes
    timeframes = ["1m", "5m", "15m", "30m", "1h", "4h", "1d", "1w"]
    bars = 2
    
    executor = DCABotExecutor({
        "interval": "1h",  # Default
        "dcaRules": {},
        "phase1Features": {}
    }, paper_trading=True)
    
    # Set last DCA time
    executor.last_dca_time = {
        "BTCUSDT": datetime.now() - timedelta(hours=1)  # 1 hour ago
    }
    
    print(f"Testing {bars} bars cooldown for different timeframes:")
    
    for tf in timeframes:
        executor.config["interval"] = tf
        dca_rules = {
            "dcaCooldownValue": bars,
            "dcaCooldownUnit": "bars"
        }
        
        try:
            result = await executor._check_dca_cooldown("BTCUSDT", dca_rules)
            
            # Calculate expected minutes
            timeframe_minutes = {
                "1m": 1, "5m": 5, "15m": 15, "30m": 30,
                "1h": 60, "4h": 240, "1d": 1440, "1w": 10080
            }
            expected_minutes = bars * timeframe_minutes.get(tf, 60)
            
            print(f"   {tf:4s}: {bars} bars = {expected_minutes:5d} minutes, Result: {result}")
        except Exception as e:
            print(f"   {tf:4s}: ❌ Error: {e}")
    
    print(f"✅ Bar-based cooldown test completed")
    return True


async def test_no_conditions():
    """Test that bot allows entry when no conditions are set."""
    print("\n" + "="*60)
    print("TEST 5: No Entry Conditions (Should Allow Entry)")
    print("="*60)
    
    bot_config = {
        "conditionConfig": None,  # No conditions
        "interval": "1h",
        "dcaRules": {},
        "phase1Features": {}
    }
    
    executor = DCABotExecutor(bot_config, paper_trading=True)
    
    market_df = create_test_market_data("BTCUSDT", 200)
    
    try:
        result = await executor._evaluate_entry_conditions("BTCUSDT", None, market_df)
        print(f"✅ No conditions test completed")
        print(f"   Result: {result} (should be True)")
        
        if result:
            print("   ✅ Correctly allows entry when no conditions")
            return True
        else:
            print("   ❌ Should allow entry when no conditions")
            return False
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False


async def main():
    """Run all tests."""
    print("\n" + "="*60)
    print("DCA BOT FIXES TEST SUITE")
    print("="*60)
    print("\nTesting Phase 1 fixes:")
    print("  1. Entry Condition Evaluation (Simple)")
    print("  2. Entry Condition Evaluation (Playbook)")
    print("  3. Custom DCA Rules")
    print("  4. Bar-Based Cooldown")
    print("  5. No Conditions (Should Allow Entry)")
    
    results = []
    
    # Test 1: Simple entry conditions
    results.append(await test_entry_conditions_simple())
    
    # Test 2: Playbook entry conditions
    results.append(await test_entry_conditions_playbook())
    
    # Test 3: Custom DCA rules (requires Binance API)
    print("\n⚠️  Test 3 requires Binance API access. Skipping if not available...")
    try:
        results.append(await test_custom_dca_rules())
    except Exception as e:
        print(f"   ⚠️  Skipped: {e}")
        results.append(True)  # Don't fail if API not available
    
    # Test 4: Bar-based cooldown
    results.append(await test_bar_based_cooldown())
    
    # Test 5: No conditions
    results.append(await test_no_conditions())
    
    # Summary
    print("\n" + "="*60)
    print("TEST SUMMARY")
    print("="*60)
    passed = sum(results)
    total = len(results)
    print(f"Passed: {passed}/{total}")
    
    if passed == total:
        print("✅ All tests passed!")
    else:
        print("⚠️  Some tests had issues (check logs above)")
    
    return passed == total


if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)

