#!/usr/bin/env python3
"""
Test script for the alert system
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from alerts.alert_manager import AlertManager
from alerts.datasource import CandleSource

def test_alert_system():
    print("🚀 Testing Alert System...")
    
    # Create alert manager
    manager = AlertManager(CandleSource())
    
    # Create a test alert for RSI oversold condition
    test_alert = {
        'alert_id': 'test_123',
        'symbol': 'BTCUSDT',
        'base_timeframe': '1h',
        'conditions': [
            {
                'id': 'rsi_oversold',
                'type': 'indicator',
                'indicator': 'RSI',
                'component': 'RSI',
                'operator': '<',
                'compareWith': 'value',
                'compareValue': 30,
                'timeframe': 'same'
            }
        ],
        'logic': 'AND',
        'fireMode': 'per_bar'
    }
    
    print(f"📊 Testing alert for {test_alert['symbol']} on {test_alert['base_timeframe']}")
    print(f"📈 Condition: RSI < 30 (oversold)")
    
    # Simulate the alert
    result = manager.simulate(test_alert)
    
    print("\n✅ Alert Simulation Result:")
    print(f"   Would Fire: {result['would_fire']}")
    print(f"   Reasons: {result['reasons']}")
    print(f"   Snapshot: {result['snapshot']}")
    
    return result

if __name__ == "__main__":
    test_alert_system()

