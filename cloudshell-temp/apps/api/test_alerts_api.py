#!/usr/bin/env python3
"""
Alerts API Test Script
Test all CRUD endpoints for the alerts API
"""

import requests
import json
import os
from typing import Dict, Any

BASE_URL = "http://localhost:8000"
TOKEN = os.getenv("SUPABASE_JWT_TOKEN", "YOUR_SUPABASE_JWT_TOKEN_HERE")

def test_create_alert() -> str:
    """Test creating a new alert"""
    print("📝 Testing Create Alert...")
    
    payload = {
        "symbol": "BTCUSDT",
        "base_timeframe": "1m",
        "conditions": [
            {
                "id": "c1",
                "type": "indicator",
                "indicator": "RSI",
                "component": "RSI",
                "operator": "crosses_below",
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
    
    response = requests.post(
        f"{BASE_URL}/alerts",
        headers={
            "Authorization": f"Bearer {TOKEN}",
            "Content-Type": "application/json"
        },
        json=payload
    )
    
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"Created Alert ID: {data['alert_id']}")
        return data['alert_id']
    else:
        print(f"Error: {response.text}")
        return None

def test_list_alerts():
    """Test listing all alerts"""
    print("\n📋 Testing List Alerts...")
    
    response = requests.get(
        f"{BASE_URL}/alerts",
        headers={"Authorization": f"Bearer {TOKEN}"}
    )
    
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"Found {len(data)} alerts")
        for alert in data:
            print(f"  - {alert['alert_id']}: {alert['symbol']} ({alert['status']})")
    else:
        print(f"Error: {response.text}")

def test_get_alert(alert_id: str):
    """Test getting a specific alert"""
    print(f"\n🔍 Testing Get Alert {alert_id}...")
    
    response = requests.get(
        f"{BASE_URL}/alerts/{alert_id}",
        headers={"Authorization": f"Bearer {TOKEN}"}
    )
    
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"Alert: {data['symbol']} - {data['status']}")
        print(f"Conditions: {len(data['conditions'])}")
    else:
        print(f"Error: {response.text}")

def test_update_alert(alert_id: str):
    """Test updating an alert"""
    print(f"\n✏️ Testing Update Alert {alert_id}...")
    
    payload = {"status": "paused"}
    
    response = requests.patch(
        f"{BASE_URL}/alerts/{alert_id}",
        headers={
            "Authorization": f"Bearer {TOKEN}",
            "Content-Type": "application/json"
        },
        json=payload
    )
    
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"Updated Alert Status: {data['status']}")
    else:
        print(f"Error: {response.text}")

def test_get_logs(alert_id: str):
    """Test getting alert logs"""
    print(f"\n📊 Testing Get Alert Logs {alert_id}...")
    
    response = requests.get(
        f"{BASE_URL}/alerts/{alert_id}/logs",
        headers={"Authorization": f"Bearer {TOKEN}"}
    )
    
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"Found {len(data)} log entries")
    else:
        print(f"Error: {response.text}")

def test_delete_alert(alert_id: str):
    """Test deleting an alert"""
    print(f"\n🗑️ Testing Delete Alert {alert_id}...")
    
    response = requests.delete(
        f"{BASE_URL}/alerts/{alert_id}",
        headers={"Authorization": f"Bearer {TOKEN}"}
    )
    
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"Delete Result: {data}")
    else:
        print(f"Error: {response.text}")

def test_health_check():
    """Test health check endpoint"""
    print("🏥 Testing Health Check...")
    
    response = requests.get(f"{BASE_URL}/health")
    
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"Health: {data}")
    else:
        print(f"Error: {response.text}")

def main():
    """Run all tests"""
    print("🚀 Starting Alerts API Tests")
    print("=" * 50)
    
    # Test health check first
    test_health_check()
    
    if TOKEN == "YOUR_SUPABASE_JWT_TOKEN_HERE":
        print("\n❌ Please set SUPABASE_JWT_TOKEN environment variable or update TOKEN in script")
        return
    
    # Test CRUD operations
    alert_id = test_create_alert()
    
    if alert_id:
        test_list_alerts()
        test_get_alert(alert_id)
        test_update_alert(alert_id)
        test_get_logs(alert_id)
        test_delete_alert(alert_id)
    
    print("\n✅ All tests completed!")

if __name__ == "__main__":
    main()



