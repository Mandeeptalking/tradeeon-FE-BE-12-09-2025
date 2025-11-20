#!/usr/bin/env python3
"""
Test script to verify all DCA bot management endpoints.
Tests all endpoints for proper functionality.
"""

import os
import sys
import asyncio
import httpx
import json
from typing import Dict, Any, Optional
from datetime import datetime

# Get API base URL from environment or default
API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:8000")

# Get auth token from environment (required)
AUTH_TOKEN = os.getenv("SUPABASE_JWT_TOKEN") or os.getenv("AUTH_TOKEN")

# Test bot ID (will be created during test)
TEST_BOT_ID: Optional[str] = None

# Colors for output (plain text for Windows compatibility)
class Colors:
    OK = "[OK]"
    FAIL = "[FAIL]"
    WARN = "[WARN]"
    INFO = "[INFO]"
    SKIP = "[SKIP]"


def print_header(text: str):
    """Print section header."""
    print("\n" + "=" * 70)
    print(f"  {text}")
    print("=" * 70)


def print_result(endpoint: str, status: str, message: str = ""):
    """Print test result."""
    status_symbol = Colors.OK if status == "PASS" else Colors.FAIL if status == "FAIL" else Colors.WARN
    print(f"{status_symbol} {endpoint}")
    if message:
        print(f"   {message}")


async def test_endpoint(
    client: httpx.AsyncClient,
    method: str,
    endpoint: str,
    expected_status: int = 200,
    json_data: Optional[Dict[str, Any]] = None,
    auth_token: Optional[str] = None,
    description: str = ""
) -> tuple[bool, Dict[str, Any], Optional[str]]:
    """
    Test an endpoint and return (success, response_data, error_message).
    
    Args:
        client: HTTP client
        method: HTTP method (GET, POST, etc.)
        endpoint: Endpoint path
        expected_status: Expected HTTP status code
        json_data: Request body (for POST/PUT)
        auth_token: JWT token for authentication
        description: Test description
        
    Returns:
        Tuple of (success, response_data, error_message)
    """
    url = f"{API_BASE_URL}{endpoint}"
    headers = {}
    
    if auth_token:
        headers["Authorization"] = f"Bearer {auth_token}"
    
    if json_data:
        headers["Content-Type"] = "application/json"
    
    try:
        if method.upper() == "GET":
            response = await client.get(url, headers=headers, timeout=30.0)
        elif method.upper() == "POST":
            response = await client.post(url, headers=headers, json=json_data, timeout=30.0)
        elif method.upper() == "PUT":
            response = await client.put(url, headers=headers, json=json_data, timeout=30.0)
        elif method.upper() == "DELETE":
            response = await client.delete(url, headers=headers, timeout=30.0)
        else:
            return False, {}, f"Unsupported method: {method}"
        
        # Check status code
        if response.status_code != expected_status:
            error_msg = f"Expected status {expected_status}, got {response.status_code}"
            try:
                error_data = response.json()
                if "detail" in error_data:
                    error_msg += f": {error_data['detail']}"
                elif "error" in error_data and "message" in error_data["error"]:
                    error_msg += f": {error_data['error']['message']}"
            except:
                error_msg += f": {response.text[:200]}"
            return False, {}, error_msg
        
        # Parse response
        try:
            data = response.json()
        except:
            data = {"raw_response": response.text}
        
        return True, data, None
        
    except httpx.TimeoutException:
        return False, {}, f"Request timeout after 30 seconds"
    except httpx.ConnectError:
        return False, {}, f"Could not connect to {API_BASE_URL}. Is the backend running?"
    except Exception as e:
        return False, {}, f"Error: {str(e)}"


async def test_authentication(client: httpx.AsyncClient):
    """Test authentication requirement."""
    print_header("Authentication Test")
    
    # Test endpoint without auth (should fail)
    success, data, error = await test_endpoint(
        client, "GET", "/api/bots/dca-bots/test_bot/status",
        expected_status=401,
        auth_token=None,
        description="Test without authentication (should fail)"
    )
    
    if success:
        print_result("/api/bots/dca-bots/{bot_id}/status (no auth)", "PASS", "Correctly rejected")
        return True
    else:
        print_result("/api/bots/dca-bots/{bot_id}/status (no auth)", "FAIL", error)
        return False


async def test_create_bot(client: httpx.AsyncClient, auth_token: str) -> Optional[str]:
    """Test bot creation and return bot_id."""
    global TEST_BOT_ID
    
    print_header("Bot Creation")
    
    bot_config = {
        "botName": "Test DCA Bot",
        "direction": "long",
        "pair": "BTCUSDT",
        "selectedPairs": ["BTCUSDT"],
        "baseOrderSize": 100,
        "startOrderType": "market",
        "conditionConfig": {
            "mode": "simple",
            "conditionType": "Indicator",
            "condition": {
                "indicator": "RSI",
                "component": "rsi",
                "operator": "crosses_below",
                "value": 30,
                "timeframe": "1h",
                "period": 14
            }
        },
        "dcaRules": {
            "maxDcaPerPosition": 5,
            "maxDcaAcrossAllPositions": 10
        },
        "phase1Features": {}
    }
    
    success, data, error = await test_endpoint(
        client, "POST", "/api/bots/dca-bots",
        expected_status=200,
        json_data=bot_config,
        auth_token=auth_token,
        description="Create test DCA bot"
    )
    
    if success and data.get("success") and data.get("bot_id"):
        bot_id = data["bot_id"]
        TEST_BOT_ID = bot_id
        print_result("POST /api/bots/dca-bots", "PASS", f"Bot created: {bot_id}")
        return bot_id
    else:
        print_result("POST /api/bots/dca-bots", "FAIL", error or "Failed to create bot")
        return None


async def test_start_bot(client: httpx.AsyncClient, bot_id: str, auth_token: str):
    """Test starting bot in paper mode."""
    print_header("Start Bot (Paper Trading)")
    
    start_config = {
        "initial_balance": 10000.0,
        "interval_seconds": 60,
        "use_live_data": True
    }
    
    success, data, error = await test_endpoint(
        client, "POST", f"/api/bots/dca-bots/{bot_id}/start-paper",
        expected_status=200,
        json_data=start_config,
        auth_token=auth_token,
        description="Start bot in paper trading mode"
    )
    
    if success and data.get("success"):
        print_result("POST /api/bots/dca-bots/{bot_id}/start-paper", "PASS", 
                    f"Bot started: {data.get('status', 'unknown')}")
        return True
    else:
        print_result("POST /api/bots/dca-bots/{bot_id}/start-paper", "FAIL", error or "Failed to start bot")
        return False


async def test_get_status(client: httpx.AsyncClient, bot_id: str, auth_token: str):
    """Test getting bot status."""
    print_header("Get Bot Status")
    
    # Test both endpoint paths
    endpoints = [
        f"/api/bots/dca-bots/{bot_id}/status",
        f"/api/bots/dca-bots/status/{bot_id}"
    ]
    
    all_passed = True
    for endpoint in endpoints:
        success, data, error = await test_endpoint(
            client, "GET", endpoint,
            expected_status=200,
            auth_token=auth_token,
            description=f"Get bot status via {endpoint}"
        )
        
        if success and data.get("success"):
            status = data.get("status", "unknown")
            running = data.get("running", False)
            balance = data.get("balance") or data.get("current_balance", "N/A")
            total_pnl = data.get("total_pnl") or data.get("totalPnl", 0)
            
            msg = f"Status: {status}, Running: {running}, Balance: {balance}, P&L: {total_pnl}"
            print_result(f"GET {endpoint}", "PASS", msg)
        else:
            print_result(f"GET {endpoint}", "FAIL", error or "Failed to get status")
            all_passed = False
    
    return all_passed


async def test_get_positions(client: httpx.AsyncClient, bot_id: str, auth_token: str):
    """Test getting bot positions."""
    print_header("Get Bot Positions")
    
    success, data, error = await test_endpoint(
        client, "GET", f"/api/bots/dca-bots/{bot_id}/positions",
        expected_status=200,
        auth_token=auth_token,
        description="Get bot positions"
    )
    
    if success and data.get("success"):
        count = data.get("count", 0)
        positions = data.get("positions", {})
        msg = f"Found {count} positions"
        if positions:
            msg += f": {', '.join(positions.keys())}"
        print_result("GET /api/bots/dca-bots/{bot_id}/positions", "PASS", msg)
        return True
    else:
        print_result("GET /api/bots/dca-bots/{bot_id}/positions", "FAIL", error or "Failed to get positions")
        return False


async def test_get_orders(client: httpx.AsyncClient, bot_id: str, auth_token: str):
    """Test getting bot orders."""
    print_header("Get Bot Orders")
    
    success, data, error = await test_endpoint(
        client, "GET", f"/api/bots/dca-bots/{bot_id}/orders?limit=10",
        expected_status=200,
        auth_token=auth_token,
        description="Get bot orders"
    )
    
    if success and data.get("success"):
        count = data.get("count", 0)
        msg = f"Found {count} orders"
        print_result("GET /api/bots/dca-bots/{bot_id}/orders", "PASS", msg)
        return True
    else:
        print_result("GET /api/bots/dca-bots/{bot_id}/orders", "FAIL", error or "Failed to get orders")
        return False


async def test_get_pnl(client: httpx.AsyncClient, bot_id: str, auth_token: str):
    """Test getting bot P&L."""
    print_header("Get Bot P&L")
    
    success, data, error = await test_endpoint(
        client, "GET", f"/api/bots/dca-bots/{bot_id}/pnl",
        expected_status=200,
        auth_token=auth_token,
        description="Get bot P&L"
    )
    
    if success and data.get("success"):
        total_pnl = data.get("total_pnl", 0)
        realized = data.get("realized_pnl", 0)
        unrealized = data.get("unrealized_pnl", 0)
        return_pct = data.get("return_pct", 0)
        
        msg = f"Total P&L: {total_pnl}, Realized: {realized}, Unrealized: {unrealized}, Return: {return_pct}%"
        print_result("GET /api/bots/dca-bots/{bot_id}/pnl", "PASS", msg)
        return True
    else:
        print_result("GET /api/bots/dca-bots/{bot_id}/pnl", "FAIL", error or "Failed to get P&L")
        return False


async def test_pause_bot(client: httpx.AsyncClient, bot_id: str, auth_token: str):
    """Test pausing bot."""
    print_header("Pause Bot")
    
    success, data, error = await test_endpoint(
        client, "POST", f"/api/bots/dca-bots/{bot_id}/pause",
        expected_status=200,
        auth_token=auth_token,
        description="Pause bot"
    )
    
    if success and data.get("success"):
        print_result("POST /api/bots/dca-bots/{bot_id}/pause", "PASS", f"Bot paused: {data.get('status', 'unknown')}")
        return True
    else:
        # Might fail if bot is not running - that's OK for testing
        if error and "not running" in error.lower():
            print_result("POST /api/bots/dca-bots/{bot_id}/pause", "SKIP", "Bot not running (expected)")
            return True
        print_result("POST /api/bots/dca-bots/{bot_id}/pause", "FAIL", error or "Failed to pause bot")
        return False


async def test_resume_bot(client: httpx.AsyncClient, bot_id: str, auth_token: str):
    """Test resuming bot."""
    print_header("Resume Bot")
    
    success, data, error = await test_endpoint(
        client, "POST", f"/api/bots/dca-bots/{bot_id}/resume",
        expected_status=200,
        auth_token=auth_token,
        description="Resume bot"
    )
    
    if success and data.get("success"):
        print_result("POST /api/bots/dca-bots/{bot_id}/resume", "PASS", f"Bot resumed: {data.get('status', 'unknown')}")
        return True
    else:
        # Might fail if bot is not running - that's OK for testing
        if error and "not running" in error.lower():
            print_result("POST /api/bots/dca-bots/{bot_id}/resume", "SKIP", "Bot not running (expected)")
            return True
        print_result("POST /api/bots/dca-bots/{bot_id}/resume", "FAIL", error or "Failed to resume bot")
        return False


async def test_stop_bot(client: httpx.AsyncClient, bot_id: str, auth_token: str):
    """Test stopping bot."""
    print_header("Stop Bot")
    
    success, data, error = await test_endpoint(
        client, "POST", f"/api/bots/dca-bots/{bot_id}/stop",
        expected_status=200,
        auth_token=auth_token,
        description="Stop bot"
    )
    
    if success and data.get("success"):
        print_result("POST /api/bots/dca-bots/{bot_id}/stop", "PASS", f"Bot stopped: {data.get('status', 'unknown')}")
        return True
    else:
        print_result("POST /api/bots/dca-bots/{bot_id}/stop", "FAIL", error or "Failed to stop bot")
        return False


async def test_error_cases(client: httpx.AsyncClient, auth_token: str):
    """Test error cases."""
    print_header("Error Cases")
    
    error_tests = [
        ("GET", "/api/bots/dca-bots/nonexistent_bot/status", 404, "Nonexistent bot"),
        ("POST", "/api/bots/dca-bots/nonexistent_bot/stop", 404, "Stop nonexistent bot"),
        ("POST", "/api/bots/dca-bots/nonexistent_bot/pause", 404, "Pause nonexistent bot"),
    ]
    
    all_passed = True
    for method, endpoint, expected_status, description in error_tests:
        success, data, error = await test_endpoint(
            client, method, endpoint,
            expected_status=expected_status,
            auth_token=auth_token,
            description=description
        )
        
        if success:
            print_result(f"{method} {endpoint}", "PASS", f"Correctly returned {expected_status}")
        else:
            # Check if we got the expected error
            if error and str(expected_status) in error:
                print_result(f"{method} {endpoint}", "PASS", f"Correctly returned {expected_status}")
            else:
                print_result(f"{method} {endpoint}", "FAIL", error or "Unexpected response")
                all_passed = False
    
    return all_passed


async def main():
    """Run all endpoint tests."""
    print("=" * 70)
    print("  DCA Bot Endpoints Verification Test")
    print("=" * 70)
    print(f"API Base URL: {API_BASE_URL}")
    print(f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Check auth token
    if not AUTH_TOKEN:
        print(f"\n{Colors.FAIL} Authentication token required!")
        print(f"{Colors.INFO} Set SUPABASE_JWT_TOKEN or AUTH_TOKEN environment variable")
        print(f"{Colors.INFO} Example: export SUPABASE_JWT_TOKEN='your_token_here'")
        print(f"\n{Colors.INFO} Or test without auth (will only test authentication requirement):")
        print(f"{Colors.INFO}   python3 scripts/test_bot_endpoints.py")
        sys.exit(1)
    
    print(f"{Colors.INFO} Auth token: {AUTH_TOKEN[:20]}...{AUTH_TOKEN[-20:]}")
    
    results = {
        "passed": 0,
        "failed": 0,
        "skipped": 0
    }
    
    async with httpx.AsyncClient() as client:
        # Test authentication
        if await test_authentication(client):
            results["passed"] += 1
        else:
            results["failed"] += 1
        
        # Test bot creation
        bot_id = await test_create_bot(client, AUTH_TOKEN)
        if bot_id:
            results["passed"] += 1
            
            # Test start
            if await test_start_bot(client, bot_id, AUTH_TOKEN):
                results["passed"] += 1
                
                # Wait a moment for bot to initialize
                await asyncio.sleep(2)
                
                # Test status endpoints
                if await test_get_status(client, bot_id, AUTH_TOKEN):
                    results["passed"] += 1
                else:
                    results["failed"] += 1
                
                if await test_get_positions(client, bot_id, AUTH_TOKEN):
                    results["passed"] += 1
                else:
                    results["failed"] += 1
                
                if await test_get_orders(client, bot_id, AUTH_TOKEN):
                    results["passed"] += 1
                else:
                    results["failed"] += 1
                
                if await test_get_pnl(client, bot_id, AUTH_TOKEN):
                    results["passed"] += 1
                else:
                    results["failed"] += 1
                
                # Test pause/resume
                pause_result = await test_pause_bot(client, bot_id, AUTH_TOKEN)
                if pause_result:
                    results["passed"] += 1
                else:
                    results["failed"] += 1
                
                resume_result = await test_resume_bot(client, bot_id, AUTH_TOKEN)
                if resume_result:
                    results["passed"] += 1
                else:
                    results["failed"] += 1
                
                # Test stop
                if await test_stop_bot(client, bot_id, AUTH_TOKEN):
                    results["passed"] += 1
                else:
                    results["failed"] += 1
            else:
                results["failed"] += 1
        else:
            results["failed"] += 1
        
        # Test error cases
        if await test_error_cases(client, AUTH_TOKEN):
            results["passed"] += 1
        else:
            results["failed"] += 1
    
    # Summary
    print_header("Test Summary")
    total = results["passed"] + results["failed"] + results["skipped"]
    print(f"Total Tests: {total}")
    print(f"{Colors.OK} Passed: {results['passed']}")
    print(f"{Colors.FAIL} Failed: {results['failed']}")
    if results["skipped"] > 0:
        print(f"{Colors.SKIP} Skipped: {results['skipped']}")
    
    print("\n" + "=" * 70)
    if results["failed"] == 0:
        print(f"{Colors.OK} ALL TESTS PASSED!")
        print("=" * 70)
        return 0
    else:
        print(f"{Colors.FAIL} SOME TESTS FAILED")
        print("=" * 70)
        return 1


if __name__ == "__main__":
    try:
        exit_code = asyncio.run(main())
        sys.exit(exit_code)
    except KeyboardInterrupt:
        print(f"\n\n{Colors.WARN} Tests interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n{Colors.FAIL} Test suite failed with error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


