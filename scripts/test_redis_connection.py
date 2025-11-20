#!/usr/bin/env python3
"""
Quick test to verify Redis connection from backend
"""

import sys
import os
import asyncio

# Add paths
root_path = os.path.join(os.path.dirname(__file__), '..')
bots_path = os.path.join(root_path, 'apps', 'bots')
if root_path not in sys.path:
    sys.path.insert(0, root_path)
if bots_path not in sys.path:
    sys.path.insert(0, bots_path)

async def test_redis():
    """Test Redis connection."""
    try:
        from event_bus import create_event_bus
        
        redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
        print(f"Connecting to Redis: {redis_url}")
        
        event_bus = await create_event_bus(redis_url)
        
        if event_bus and event_bus.connected:
            print("✅ Redis connection successful!")
            
            # Test publish
            test_event = {"test": "connection", "timestamp": "now"}
            success = await event_bus.publish("test.channel", test_event)
            
            if success:
                print("✅ Event publish test successful!")
            else:
                print("⚠️  Event publish failed (but connection works)")
            
            await event_bus.disconnect()
            return True
        else:
            print("❌ Redis connection failed")
            print("Check:")
            print("  1. Redis is running: redis-cli ping")
            print("  2. REDIS_URL is set correctly")
            print("  3. Redis is accessible from this machine")
            return False
    except ImportError as e:
        print(f"❌ Import error: {e}")
        print("Install Redis library: pip install redis")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    success = asyncio.run(test_redis())
    sys.exit(0 if success else 1)


