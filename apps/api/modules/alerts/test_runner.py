#!/usr/bin/env python3
"""
Simple test runner for the Alert Runner system
"""

import asyncio
import sys
import os

# Add the project root to Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from apps.api.modules.alerts.runner import main

async def test_runner():
    """Test the alert runner for a few iterations"""
    print("🚀 Testing Alert Runner")
    print("=" * 40)
    print("⏰ Running for 5 seconds...")
    print("Press Ctrl+C to stop")
    
    try:
        # Run the main loop for a short time
        await asyncio.wait_for(main(), timeout=5.0)
    except asyncio.TimeoutError:
        print("\n✅ Runner test completed (5 second timeout)")
    except KeyboardInterrupt:
        print("\n⏹️ Runner stopped by user")

if __name__ == "__main__":
    asyncio.run(test_runner())



