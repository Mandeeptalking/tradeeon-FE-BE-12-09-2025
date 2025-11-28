"""
Test script to verify bot execution and order placement.
Run this to check if the bot is actually executing and placing orders.
"""
import asyncio
import sys
import os

# Add paths
bots_path = os.path.join(os.path.dirname(__file__), 'apps', 'bots')
if bots_path not in sys.path:
    sys.path.insert(0, bots_path)

from bot_execution_service import bot_execution_service
from db_service import db_service

async def test_bot_execution(bot_id: str):
    """Test if a bot is running and executing."""
    print(f"\n{'='*60}")
    print(f"Testing Bot Execution for: {bot_id}")
    print(f"{'='*60}\n")
    
    # Check if bot is running
    is_running = bot_execution_service.is_running(bot_id)
    print(f"✅ Bot running in memory: {is_running}")
    
    if not is_running:
        print("❌ Bot is not running in memory!")
        return
    
    # Get bot status
    status_info = bot_execution_service.get_bot_status_info(bot_id)
    if status_info:
        print(f"\n📊 Bot Status Info:")
        print(f"  - Running in memory: {status_info.get('running_in_memory')}")
        print(f"  - Executor status: {status_info.get('executor_status')}")
        print(f"  - Paused: {status_info.get('paused')}")
        print(f"  - Iteration count: {status_info.get('iteration_count', 0)}")
        print(f"  - Last execution: {status_info.get('last_execution_time')}")
        print(f"  - Next execution: {status_info.get('next_execution_time')}")
        print(f"  - Time until next: {status_info.get('time_until_next_seconds')}s")
        print(f"  - Health: {'✅ Healthy' if status_info.get('is_healthy') else '❌ Unhealthy'}")
    else:
        print("❌ Could not get bot status info")
    
    # Check recent events
    print(f"\n📝 Recent Events:")
    try:
        events = db_service.supabase.table("bot_events").select("*").eq("bot_id", bot_id).order("created_at", desc=True).limit(10).execute()
        if events.data:
            for event in events.data:
                print(f"  - [{event['created_at']}] {event['event_type']}: {event['message']}")
        else:
            print("  ⚠️ No events found")
    except Exception as e:
        print(f"  ❌ Error fetching events: {e}")
    
    # Check orders
    print(f"\n💰 Recent Orders:")
    try:
        orders = db_service.supabase.table("order_logs").select("*").eq("bot_id", bot_id).order("created_at", desc=True).limit(10).execute()
        if orders.data:
            for order in orders.data:
                print(f"  - [{order['created_at']}] {order['side'].upper()} {order['symbol']}: {order['filled_qty']} @ ${order['avg_price']}")
        else:
            print("  ⚠️ No orders found")
    except Exception as e:
        print(f"  ❌ Error fetching orders: {e}")
    
    print(f"\n{'='*60}\n")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python test_bot_execution.py <bot_id>")
        sys.exit(1)
    
    bot_id = sys.argv[1]
    asyncio.run(test_bot_execution(bot_id))

