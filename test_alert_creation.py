#!/usr/bin/env python3
"""
Test script to verify alert creation API is working
"""

import requests
import json

def test_alert_creation():
    print("🚀 Testing Alert Creation API...")
    
    # Test data
    alert_data = {
        "symbol": "BTCUSDT",
        "base_timeframe": "1h",
        "conditions": [
            {
                "id": "rsi_oversold",
                "type": "indicator",
                "indicator": "RSI",
                "component": "RSI",
                "operator": "<",
                "compareWith": "value",
                "compareValue": 30,
                "timeframe": "same"
            }
        ],
        "logic": "AND",
        "action": {
            "type": "notify"
        },
        "status": "active",
        "fireMode": "per_bar"
    }
    
    # Headers with mock authentication
    headers = {
        "Content-Type": "application/json",
        "Authorization": "Bearer mock-jwt-token-for-testing"
    }
    
    try:
        # Test health endpoint first
        print("📡 Testing backend health...")
        health_response = requests.get("http://localhost:8000/health", timeout=5)
        print(f"   Health Status: {health_response.status_code}")
        
        if health_response.status_code != 200:
            print("❌ Backend is not running properly")
            return False
            
        # Test alert creation
        print("📊 Testing alert creation...")
        response = requests.post(
            "http://localhost:8000/alerts",
            headers=headers,
            json=alert_data,
            timeout=10
        )
        
        print(f"   Response Status: {response.status_code}")
        print(f"   Response Text: {response.text}")
        
        if response.status_code == 200:
            print("✅ Alert created successfully!")
            result = response.json()
            print(f"   Alert ID: {result.get('alert_id', 'N/A')}")
            return True
        else:
            print("❌ Alert creation failed")
            return False
            
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to backend server. Make sure it's running on localhost:8000")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    test_alert_creation()

