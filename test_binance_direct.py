#!/usr/bin/env python3
"""
Direct Binance API Connection Test
Tests connection without going through frontend or backend
"""

import hmac
import hashlib
import time
import requests
from urllib.parse import urlencode
from typing import Dict

# Test credentials (from user)
API_KEY = "aQxqn57sU9rgvkNumm12dD4NvIYpWlxGEguwfX4bN6AyY5bmTS29OWH2rEJA38sL"
API_SECRET = "0R7lGW9KIoIQ5JqiqATO5AqF6GJMFqQTXk3bA8sF0eQkR3pOpUEFlAFzXIRTp7ct"

BASE_URL = "https://api.binance.com"
FUTURES_BASE_URL = "https://fapi.binance.com"


def generate_signature(params: Dict) -> str:
    """Generate HMAC SHA256 signature for Binance API"""
    # Filter out None values and empty strings
    filtered_params = {k: v for k, v in params.items() if v is not None and v != ''}
    # Sort parameters alphabetically by key
    sorted_params = sorted(filtered_params.items())
    # Create query string from sorted parameters
    query_string = urlencode(sorted_params)
    print(f"  Query string for signature: {query_string[:100]}...")
    # Generate HMAC SHA256 signature
    signature = hmac.new(
        API_SECRET.encode('utf-8'),
        query_string.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()
    return signature


def test_spot_account():
    """Test SPOT account connection"""
    print("\n" + "="*60)
    print("Testing SPOT Account: GET /api/v3/account")
    print("="*60)
    
    # Prepare parameters
    params = {
        'timestamp': int(time.time() * 1000)
    }
    
    # Generate signature
    signature = generate_signature(params)
    params['signature'] = signature
    
    # Make request
    url = f"{BASE_URL}/api/v3/account"
    headers = {
        'X-MBX-APIKEY': API_KEY
    }
    
    print(f"  URL: {url}")
    print(f"  Params: timestamp={params['timestamp']}, signature={signature[:20]}...")
    print(f"  Headers: X-MBX-APIKEY={API_KEY[:20]}...")
    
    try:
        response = requests.get(url, params=params, headers=headers, timeout=10)
        print(f"\n  Response Status: {response.status_code}")
        print(f"  Response Headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"\n  [SUCCESS]")
            print(f"  Account Type: SPOT")
            print(f"  Maker Commission: {data.get('makerCommission', 'N/A')}")
            print(f"  Taker Commission: {data.get('takerCommission', 'N/A')}")
            print(f"  Can Trade: {data.get('canTrade', False)}")
            print(f"  Can Withdraw: {data.get('canWithdraw', False)}")
            print(f"  Can Deposit: {data.get('canDeposit', False)}")
            balances = [b for b in data.get('balances', []) if float(b.get('free', 0)) > 0 or float(b.get('locked', 0)) > 0]
            print(f"  Non-zero balances: {len(balances)}")
            if balances:
                print(f"  Sample balances:")
                for b in balances[:5]:
                    print(f"    - {b['asset']}: free={b['free']}, locked={b['locked']}")
            return True
        else:
            print(f"\n  [FAILED]")
            try:
                error_data = response.json()
                print(f"  Error Code: {error_data.get('code', 'N/A')}")
                print(f"  Error Message: {error_data.get('msg', error_data.get('message', 'Unknown error'))}")
                
                # Check for specific error codes
                error_code = error_data.get('code')
                if error_code == -2015:
                    print(f"\n  WARNING: Error -2015: Invalid API-key, IP, or permissions")
                    print(f"     Possible causes:")
                    print(f"     - IP address not whitelisted")
                    print(f"     - API key permissions missing")
                    print(f"     - API key/secret mismatch")
                elif error_code == -1022:
                    print(f"\n  WARNING: Error -1022: Invalid signature")
                    print(f"     Possible causes:")
                    print(f"     - Parameters not sorted correctly")
                    print(f"     - Timestamp format wrong")
                    print(f"     - Signature calculation error")
            except:
                print(f"  Response Text: {response.text[:200]}")
            return False
            
    except requests.exceptions.RequestException as e:
        print(f"\n  ❌ NETWORK ERROR: {e}")
        return False


def test_futures_account():
    """Test USDT-M Futures account connection"""
    print("\n" + "="*60)
    print("Testing USDT-M Futures Account: GET /fapi/v1/account")
    print("="*60)
    
    # Prepare parameters
    params = {
        'timestamp': int(time.time() * 1000)
    }
    
    # Generate signature
    signature = generate_signature(params)
    params['signature'] = signature
    
    # Make request
    url = f"{FUTURES_BASE_URL}/fapi/v1/account"
    headers = {
        'X-MBX-APIKEY': API_KEY
    }
    
    print(f"  URL: {url}")
    print(f"  Params: timestamp={params['timestamp']}, signature={signature[:20]}...")
    print(f"  Headers: X-MBX-APIKEY={API_KEY[:20]}...")
    
    try:
        response = requests.get(url, params=params, headers=headers, timeout=10)
        print(f"\n  Response Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"\n  [SUCCESS]")
            print(f"  Account Type: USDT-M Futures")
            print(f"  Total Wallet Balance: {data.get('totalWalletBalance', 'N/A')} USDT")
            print(f"  Total Unrealized PnL: {data.get('totalUnrealizedProfit', 'N/A')} USDT")
            print(f"  Available Balance: {data.get('availableBalance', 'N/A')} USDT")
            print(f"  Can Trade: {data.get('canTrade', False)}")
            print(f"  Can Deposit: {data.get('canDeposit', False)}")
            print(f"  Can Withdraw: {data.get('canWithdraw', False)}")
            return True
        else:
            print(f"\n  [FAILED]")
            try:
                error_data = response.json()
                print(f"  Error Code: {error_data.get('code', 'N/A')}")
                print(f"  Error Message: {error_data.get('msg', error_data.get('message', 'Unknown error'))}")
                
                error_code = error_data.get('code')
                if error_code == -2015:
                    print(f"\n  WARNING: Error -2015: Invalid API-key, IP, or permissions")
                elif error_code == -1022:
                    print(f"\n  WARNING: Error -1022: Invalid signature")
            except:
                print(f"  Response Text: {response.text[:200]}")
            return False
            
    except requests.exceptions.RequestException as e:
        print(f"\n  ❌ NETWORK ERROR: {e}")
        return False


def main():
    print("="*60)
    print("Binance API Direct Connection Test")
    print("="*60)
    print(f"API Key: {API_KEY[:20]}...{API_KEY[-10:]}")
    print(f"API Secret: {API_SECRET[:20]}...{API_SECRET[-10:]}")
    print(f"Testing from: Local machine")
    
    # Test SPOT account
    spot_success = test_spot_account()
    
    # Test Futures account
    futures_success = test_futures_account()
    
    # Summary
    print("\n" + "="*60)
    print("TEST SUMMARY")
    print("="*60)
    print(f"SPOT Account: {'[SUCCESS]' if spot_success else '[FAILED]'}")
    print(f"Futures Account: {'[SUCCESS]' if futures_success else '[FAILED]'}")
    
    if spot_success or futures_success:
        print("\n[SUCCESS] At least one account type is accessible!")
        print("   The API keys are valid and working.")
    else:
        print("\n[FAILED] Both account types failed!")
        print("   Check:")
        print("   1. IP whitelisting in Binance API Management")
        print("   2. API key permissions")
        print("   3. API key/secret correctness")


if __name__ == "__main__":
    main()

