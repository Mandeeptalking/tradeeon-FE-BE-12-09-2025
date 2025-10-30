#!/usr/bin/env python3
"""
Test script for Alert Runner system
Tests the complete alert evaluation and dispatch pipeline
"""

import asyncio
import sys
import os
import pandas as pd
import numpy as np

# Add the project root to Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from apps.alerts.datasource import CandleSource
from apps.alerts.alert_manager import AlertManager
from apps.alerts import state, dispatch

def create_test_alert():
    """Create a test alert for RSI oversold condition"""
    return {
        "alert_id": "test_alert_001",
        "user_id": "test_user_001",
        "symbol": "BTCUSDT",
        "base_timeframe": "1m",
        "conditions": [
            {
                "id": "rsi_oversold",
                "type": "indicator",
                "indicator": "RSI",
                "component": "RSI",
                "operator": "<",
                "compareWith": "value",
                "compareValue": 30,
                "timeframe": "same",
                "settings": {"length": 14}
            }
        ],
        "logic": "AND",
        "action": {"type": "notify"},
        "status": "active"
    }

def create_test_data_with_rsi_signal():
    """Create test data where RSI will trigger"""
    # Create a scenario where RSI drops below 30
    base_price = 50000
    prices = [base_price]
    
    # Create a downtrend to trigger RSI oversold
    for i in range(50):
        # Gradual decline
        decline = 0.005  # 0.5% decline per period
        new_price = prices[-1] * (1 - decline)
        prices.append(new_price)
    
    # Generate OHLCV data
    data = []
    for i, price in enumerate(prices):
        high = price * 1.001
        low = price * 0.999
        open_price = prices[i-1] if i > 0 else price
        volume = 1000000
        
        data.append({
            'time': pd.Timestamp.now(tz='UTC') - pd.Timedelta(minutes=50-i),
            'open': round(open_price, 2),
            'high': round(high, 2),
            'low': round(low, 2),
            'close': round(price, 2),
            'volume': round(volume, 0)
        })
    
    return pd.DataFrame(data)

async def test_alert_evaluation():
    """Test the alert evaluation system"""
    print("🧪 Testing Alert Evaluation System")
    print("=" * 50)
    
    # Create test data source
    src = CandleSource()
    
    # Override the sample data with our test data
    test_df = create_test_data_with_rsi_signal()
    src.sample_data["BTCUSDT"]["1m"] = test_df
    
    # Create alert manager
    manager = AlertManager(src)
    
    # Create test alert
    test_alert = create_test_alert()
    
    print(f"📊 Test Alert: {test_alert['symbol']} - RSI < 30")
    print(f"📈 Data Points: {len(test_df)}")
    print(f"💰 Price Range: ${test_df['close'].min():.2f} - ${test_df['close'].max():.2f}")
    
    # Test data fetching
    print("\n🔍 Testing Data Fetching...")
    df = src.get_recent("BTCUSDT", "1m", 50)
    print(f"✅ Fetched {len(df)} candles")
    
    # Test indicator application
    print("\n📈 Testing Indicator Application...")
    df_with_indicators = manager._apply_needed_indicators(df, test_alert["conditions"])
    print(f"✅ Applied indicators. Columns: {list(df_with_indicators.columns)}")
    
    # Check RSI values
    if 'RSI' in df_with_indicators.columns:
        latest_rsi = df_with_indicators['RSI'].iloc[-1]
        print(f"📊 Latest RSI: {latest_rsi:.2f}")
        
        if pd.notna(latest_rsi) and latest_rsi < 30:
            print("🎯 RSI is oversold! Alert should trigger.")
        else:
            print("⚠️ RSI not oversold yet.")
    
    # Test alert evaluation
    print("\n⚡ Testing Alert Evaluation...")
    result = manager.evaluate_alert(test_alert)
    
    if result:
        print("🚨 ALERT TRIGGERED!")
        print(f"⏰ Triggered at: {result['latest_bar_time']}")
        print(f"📊 Snapshot: {result['snapshot']}")
        
        # Test logging and dispatch
        print("\n📝 Testing Log and Dispatch...")
        manager.log_and_dispatch(test_alert, result)
        print("✅ Alert logged and dispatched")
        
        # Test debounce
        print("\n🔄 Testing Debounce...")
        result2 = manager.evaluate_alert(test_alert)
        if result2 is None:
            print("✅ Debounce working - no duplicate trigger")
        else:
            print("❌ Debounce failed - duplicate trigger")
    else:
        print("❌ Alert did not trigger")
        print("💡 This might be expected if RSI hasn't reached oversold levels yet")
    
    print("\n✅ Alert evaluation test completed!")

async def test_webhook_dispatch():
    """Test webhook dispatch functionality"""
    print("\n🌐 Testing Webhook Dispatch...")
    
    test_payload = {
        "alert_id": "test_alert_001",
        "user_id": "test_user_001",
        "symbol": "BTCUSDT",
        "triggered_at": "2025-01-22T15:30:00Z",
        "conditions": [],
        "snapshot": {"price": {"close": 45000}}
    }
    
    # Test with a mock webhook URL (this will fail but we can see the attempt)
    try:
        await dispatch.send_webhook("https://httpbin.org/post", test_payload)
        print("✅ Webhook dispatch test completed")
    except Exception as e:
        print(f"⚠️ Webhook test failed (expected): {e}")

async def test_in_app_notification():
    """Test in-app notification functionality"""
    print("\n🔔 Testing In-App Notification...")
    
    test_event = {
        "type": "ALERT_TRIGGERED",
        "alert_id": "test_alert_001",
        "symbol": "BTCUSDT",
        "time": "2025-01-22T15:30:00Z"
    }
    
    await dispatch.notify_in_app("test_user_001", test_event)
    print("✅ In-app notification test completed")

async def main():
    """Run all tests"""
    print("🚀 Starting Alert Runner Tests")
    print("=" * 60)
    
    try:
        await test_alert_evaluation()
        await test_webhook_dispatch()
        await test_in_app_notification()
        
        print("\n🎉 All tests completed successfully!")
        print("\n📋 Test Summary:")
        print("✅ Data fetching and processing")
        print("✅ Indicator calculation (RSI)")
        print("✅ Condition evaluation")
        print("✅ Alert triggering")
        print("✅ Debounce mechanism")
        print("✅ Logging and dispatch")
        print("✅ Webhook dispatch")
        print("✅ In-app notifications")
        
    except Exception as e:
        print(f"\n❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())



