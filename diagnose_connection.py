#!/usr/bin/env python3
"""
Diagnostic script to check Frontend-Backend connectivity
"""
import requests
import json
import sys
import os

def test_backend_health(base_url):
    """Test if backend is running and accessible"""
    print(f"\n{'='*60}")
    print(f"Testing Backend Health: {base_url}")
    print(f"{'='*60}")
    
    try:
        response = requests.get(f"{base_url}/health", timeout=5)
        print(f"[OK] Status Code: {response.status_code}")
        print(f"[OK] Response: {json.dumps(response.json(), indent=2)}")
        return True
    except requests.exceptions.ConnectionError:
        print(f"[ERROR] Connection Error: Backend is not reachable at {base_url}")
        print(f"   Make sure the backend server is running")
        return False
    except requests.exceptions.Timeout:
        print(f"[ERROR] Timeout: Backend took too long to respond")
        return False
    except Exception as e:
        print(f"[ERROR] Error: {type(e).__name__}: {e}")
        return False

def test_bot_endpoints(base_url, auth_token=None):
    """Test bot-related endpoints"""
    print(f"\n{'='*60}")
    print(f"Testing Bot Endpoints: {base_url}/bots")
    print(f"{'='*60}")
    
    headers = {}
    if auth_token:
        headers["Authorization"] = f"Bearer {auth_token}"
    
    # Test list bots endpoint
    try:
        response = requests.get(f"{base_url}/bots/", headers=headers, timeout=5)
        print(f"GET /bots/ - Status: {response.status_code}")
        if response.status_code == 401:
            print("   [WARN] Authentication required (this is expected)")
        elif response.status_code == 200:
            print(f"   [OK] Success: {len(response.json().get('bots', []))} bots found")
        else:
            print(f"   Response: {response.text[:200]}")
    except Exception as e:
        print(f"   ❌ Error: {e}")

def test_cors(base_url, frontend_origin="http://localhost:5173"):
    """Test CORS configuration"""
    print(f"\n{'='*60}")
    print(f"Testing CORS: {base_url}")
    print(f"{'='*60}")
    
    headers = {
        "Origin": frontend_origin,
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "Content-Type,Authorization"
    }
    
    try:
        response = requests.options(f"{base_url}/bots/", headers=headers, timeout=5)
        print(f"OPTIONS /bots/ - Status: {response.status_code}")
        cors_headers = {
            "Access-Control-Allow-Origin": response.headers.get("Access-Control-Allow-Origin"),
            "Access-Control-Allow-Methods": response.headers.get("Access-Control-Allow-Methods"),
            "Access-Control-Allow-Headers": response.headers.get("Access-Control-Allow-Headers"),
        }
        print(f"CORS Headers: {json.dumps(cors_headers, indent=2)}")
        
        if cors_headers["Access-Control-Allow-Origin"]:
            print("[OK] CORS is configured")
        else:
            print("[WARN] CORS headers not found")
    except Exception as e:
        print(f"❌ Error: {e}")

def check_environment():
    """Check environment configuration"""
    print(f"\n{'='*60}")
    print("Environment Check")
    print(f"{'='*60}")
    
    # Check for .env file
    env_files = [".env", "apps/api/.env", "apps/frontend/.env"]
    found_env = False
    for env_file in env_files:
        if os.path.exists(env_file):
            print(f"[OK] Found: {env_file}")
            found_env = True
    if not found_env:
        print("[WARN] No .env files found")
    
    # Check API URL from environment
    api_url = os.getenv("VITE_API_URL") or os.getenv("API_URL")
    if api_url:
        print(f"[OK] API_URL: {api_url}")
    else:
        print("[WARN] API_URL not set in environment")

def main():
    print("\n" + "="*60)
    print("FRONTEND-BACKEND CONNECTION DIAGNOSTIC")
    print("="*60)
    
    # Get API URL from environment or use default
    api_url = os.getenv("VITE_API_URL") or os.getenv("API_URL") or "http://localhost:8000"
    
    print(f"\nUsing API URL: {api_url}")
    
    # Run diagnostics
    check_environment()
    
    if not test_backend_health(api_url):
        print("\n[ERROR] Backend is not accessible. Please:")
        print("   1. Make sure the backend server is running")
        print("   2. Check if the port is correct (default: 8000)")
        print("   3. Check firewall/network settings")
        return
    
    test_cors(api_url)
    test_bot_endpoints(api_url)
    
    print(f"\n{'='*60}")
    print("DIAGNOSTIC COMPLETE")
    print(f"{'='*60}\n")

if __name__ == "__main__":
    main()

