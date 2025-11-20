#!/usr/bin/env python3
"""
Test Script for Phase 2.2 - Event Bus (Redis Pub/Sub)

Tests the event bus to ensure it:
1. Can connect to Redis
2. Can publish events
3. Can subscribe to events
4. Can receive events
"""

import sys
import os
import asyncio
import logging
from datetime import datetime

# Add paths
root_path = os.path.join(os.path.dirname(__file__), '..')
bots_path = os.path.join(root_path, 'apps', 'bots')
if root_path not in sys.path:
    sys.path.insert(0, root_path)
if bots_path not in sys.path:
    sys.path.insert(0, bots_path)

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


async def test_redis_available():
    """Test 1: Check if Redis library is available."""
    print("\n" + "="*70)
    print("TEST 1: Redis Library Availability")
    print("="*70)
    try:
        import redis.asyncio as redis
        log_result("Redis Library", True, "Redis library available")
        return True
    except ImportError:
        log_result("Redis Library", False, "Redis not installed. Install with: pip install redis")
        return False


async def test_event_bus_import():
    """Test 2: Check if event bus can be imported."""
    print("\n" + "="*70)
    print("TEST 2: Event Bus Import")
    print("="*70)
    try:
        from event_bus import EventBus, create_event_bus
        log_result("Event Bus Import", True, "Event bus module imported successfully")
        return True
    except Exception as e:
        log_result("Event Bus Import", False, f"Import error: {str(e)}")
        return False


async def test_redis_connection():
    """Test 3: Test Redis connection."""
    print("\n" + "="*70)
    print("TEST 3: Redis Connection")
    print("="*70)
    try:
        from event_bus import create_event_bus
        
        redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
        event_bus = await create_event_bus(redis_url)
        
        if event_bus and event_bus.connected:
            log_result("Redis Connection", True, f"Connected to Redis at {redis_url}")
            await event_bus.disconnect()
            return True
        else:
            log_result("Redis Connection", False, 
                "Could not connect to Redis. Make sure Redis is running: docker run -d -p 6379:6379 redis:alpine",
                warning=True)
            return False
    except Exception as e:
        log_result("Redis Connection", False, f"Connection error: {str(e)}")
        return False


async def test_publish_event():
    """Test 4: Test publishing events."""
    print("\n" + "="*70)
    print("TEST 4: Publish Event")
    print("="*70)
    try:
        from event_bus import create_event_bus
        
        event_bus = await create_event_bus()
        if not event_bus or not event_bus.connected:
            log_result("Publish Event", False, "Event bus not connected", warning=True)
            return False
        
        # Publish test event
        test_event = {
            "condition_id": "test123",
            "symbol": "BTCUSDT",
            "triggered_at": datetime.now().isoformat(),
            "test": True
        }
        
        success = await event_bus.publish("condition.test123", test_event)
        
        if success:
            log_result("Publish Event", True, "Event published successfully")
            await event_bus.disconnect()
            return True
        else:
            log_result("Publish Event", False, "Failed to publish event")
            await event_bus.disconnect()
            return False
    except Exception as e:
        log_result("Publish Event", False, f"Error: {str(e)}")
        return False


async def test_subscribe_and_receive():
    """Test 5: Test subscribing and receiving events."""
    print("\n" + "="*70)
    print("TEST 5: Subscribe and Receive Event")
    print("="*70)
    try:
        from event_bus import create_event_bus
        
        event_bus = await create_event_bus()
        if not event_bus or not event_bus.connected:
            log_result("Subscribe and Receive", False, "Event bus not connected", warning=True)
            return False
        
        received_event = None
        
        async def handle_event(event):
            nonlocal received_event
            received_event = event
        
        # Subscribe to test channel
        await event_bus.subscribe("condition.test456", handle_event)
        
        # Start listening in background
        listen_task = asyncio.create_task(event_bus.start_listening())
        
        # Wait a bit for subscription to be ready
        await asyncio.sleep(0.5)
        
        # Publish event
        test_event = {
            "condition_id": "test456",
            "symbol": "ETHUSDT",
            "triggered_at": datetime.now().isoformat(),
            "test": True
        }
        
        await event_bus.publish("condition.test456", test_event)
        
        # Wait for event to be received
        await asyncio.sleep(1)
        
        # Stop listening
        event_bus.stop_listening()
        await asyncio.sleep(0.5)
        
        # Cleanup
        await event_bus.unsubscribe("condition.test456")
        await event_bus.disconnect()
        
        if received_event and received_event.get("condition_id") == "test456":
            log_result("Subscribe and Receive", True, "Event received successfully")
            return True
        else:
            log_result("Subscribe and Receive", False, "Event not received")
            return False
    except Exception as e:
        log_result("Subscribe and Receive", False, f"Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


async def test_pattern_subscription():
    """Test 6: Test pattern-based subscription."""
    print("\n" + "="*70)
    print("TEST 6: Pattern Subscription")
    print("="*70)
    try:
        from event_bus import create_event_bus
        
        event_bus = await create_event_bus()
        if not event_bus or not event_bus.connected:
            log_result("Pattern Subscription", False, "Event bus not connected", warning=True)
            return False
        
        received_events = []
        
        async def handle_pattern_event(event):
            received_events.append(event)
        
        # Subscribe to pattern
        await event_bus.psubscribe("condition.*", handle_pattern_event)
        
        # Start listening in background
        listen_task = asyncio.create_task(event_bus.start_listening())
        
        # Wait for subscription
        await asyncio.sleep(0.5)
        
        # Publish events to different channels
        await event_bus.publish("condition.pattern1", {"test": "pattern1"})
        await event_bus.publish("condition.pattern2", {"test": "pattern2"})
        
        # Wait for events
        await asyncio.sleep(1)
        
        # Stop listening
        event_bus.stop_listening()
        await asyncio.sleep(0.5)
        
        # Cleanup
        await event_bus.unsubscribe("condition.*")
        await event_bus.disconnect()
        
        if len(received_events) >= 2:
            log_result("Pattern Subscription", True, f"Received {len(received_events)} events via pattern")
            return True
        else:
            log_result("Pattern Subscription", False, f"Only received {len(received_events)} events")
            return False
    except Exception as e:
        log_result("Pattern Subscription", False, f"Error: {str(e)}")
        return False


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
    print("PHASE 2.2 - EVENT BUS TEST SUITE")
    print("="*70)
    print(f"Timestamp: {datetime.now().isoformat()}")
    print("="*70)
    
    # Run tests
    await test_redis_available()
    await test_event_bus_import()
    await test_redis_connection()
    await test_publish_event()
    await test_subscribe_and_receive()
    await test_pattern_subscription()
    
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


