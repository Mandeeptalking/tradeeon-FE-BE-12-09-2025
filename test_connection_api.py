#!/usr/bin/env python3
"""
Test the connections API endpoint directly
Helps diagnose "Failed to save connection" errors
"""

import requests
import sys
import os
from dotenv import load_dotenv

load_dotenv()

def test_connection_api():
    """Test the connections API"""
    
    # Get API URL
    api_url = os.getenv("API_URL", "https://api.tradeeon.com")
    
    print(f"🧪 Testing Connections API: {api_url}")
    print("=" * 60)
    
    # Test 1: Health check
    print("\n1️⃣ Testing health endpoint...")
    try:
        response = requests.get(f"{api_url}/health", timeout=5)
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            print(f"   ✅ Backend is reachable")
            print(f"   Response: {response.json()}")
        else:
            print(f"   ❌ Backend returned {response.status_code}")
    except Exception as e:
        print(f"   ❌ Cannot reach backend: {e}")
        return False
    
    # Test 2: Test connection endpoint (without auth - should fail)
    print("\n2️⃣ Testing /connections/test without auth (should fail)...")
    try:
        response = requests.post(
            f"{api_url}/connections/test",
            json={
                "exchange": "BINANCE",
                "api_key": "test",
                "api_secret": "test"
            },
            timeout=5
        )
        print(f"   Status: {response.status_code}")
        if response.status_code == 401:
            print(f"   ✅ Authentication required (expected)")
        else:
            print(f"   ⚠️  Unexpected status: {response.status_code}")
            print(f"   Response: {response.text}")
    except Exception as e:
        print(f"   ❌ Error: {e}")
    
    # Test 3: List connections without auth (should fail)
    print("\n3️⃣ Testing /connections without auth (should fail)...")
    try:
        response = requests.get(f"{api_url}/connections", timeout=5)
        print(f"   Status: {response.status_code}")
        if response.status_code == 401:
            print(f"   ✅ Authentication required (expected)")
        else:
            print(f"   ⚠️  Unexpected status: {response.status_code}")
    except Exception as e:
        print(f"   ❌ Error: {e}")
    
    print("\n" + "=" * 60)
    print("📋 Next Steps:")
    print("   1. If health check fails → Backend is down")
    print("   2. If auth fails → Backend is working, need JWT token")
    print("   3. To test with auth, get JWT token from browser:")
    print("      - Sign in to frontend")
    print("      - F12 → Application → Local Storage")
    print("      - Find supabase auth token")
    print("      - Use: curl -H 'Authorization: Bearer <token>' ...")
    
    return True

if __name__ == "__main__":
    test_connection_api()

