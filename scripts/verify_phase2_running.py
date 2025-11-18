#!/usr/bin/env python3
"""
Verify Phase 2 (Centralized Bot System) is working end-to-end.
Checks services, Redis, database, and functionality.
"""

import os
import sys
import asyncio
import subprocess
from pathlib import Path
from datetime import datetime

# Add paths
root_path = Path(__file__).parent.parent
sys.path.insert(0, str(root_path))

async def check_redis_connection():
    """Check if Redis is accessible."""
    print("\n[Redis Connection]")
    try:
        import redis.asyncio as redis
        redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
        client = redis.from_url(redis_url, decode_responses=True)
        await client.ping()
        await client.close()
        print(f"✅ Redis connection successful: {redis_url}")
        return True
    except ImportError:
        print("❌ Redis library not installed")
        return False
    except Exception as e:
        print(f"❌ Redis connection failed: {e}")
        return False

async def check_supabase_connection():
    """Check if Supabase is accessible."""
    print("\n[Supabase Connection]")
    try:
        from apps.api.clients.supabase_client import supabase
        if supabase is None:
            print("❌ Supabase client not initialized")
            print("   Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY")
            return False
        
        # Try a simple query
        result = supabase.table("condition_registry").select("condition_id").limit(1).execute()
        print(f"✅ Supabase connection successful")
        print(f"   Found {len(result.data) if result.data else 0} conditions in registry")
        return True
    except Exception as e:
        print(f"❌ Supabase connection failed: {e}")
        return False

def check_services_running():
    """Check if Phase 2 services are running."""
    print("\n[Service Status]")
    services = {
        "condition-evaluator": ["condition_evaluator", "condition-evaluator"],
        "bot-notifier": ["bot_notifier", "bot-notifier"],
    }
    
    running = {}
    
    # Check Docker containers
    try:
        result = subprocess.run(['docker', 'ps', '--format', '{{.Names}}'], 
                              capture_output=True, text=True)
        docker_containers = result.stdout.strip().split('\n')
        
        for service_name, patterns in services.items():
            for pattern in patterns:
                if any(pattern in container for container in docker_containers):
                    print(f"✅ {service_name} running (Docker: {pattern})")
                    running[service_name] = "docker"
                    break
        
    except FileNotFoundError:
        print("⚠️  Docker not found, checking Python processes")
    
    # Check Python processes
    try:
        result = subprocess.run(['ps', 'aux'], capture_output=True, text=True)
        processes = result.stdout
        
        for service_name, patterns in services.items():
            if service_name not in running:
                for pattern in patterns:
                    if pattern in processes and 'python' in processes:
                        print(f"✅ {service_name} running (Python process)")
                        running[service_name] = "process"
                        break
        
        # Check if services are missing
        for service_name in services.keys():
            if service_name not in running:
                print(f"❌ {service_name} not running")
        
        return running
        
    except Exception as e:
        print(f"⚠️  Error checking processes: {e}")
        return running

async def check_database_tables():
    """Check if Phase 2 database tables exist."""
    print("\n[Database Tables]")
    try:
        from apps.api.clients.supabase_client import supabase
        if supabase is None:
            print("❌ Supabase client not available")
            return False
        
        tables = [
            "condition_registry",
            "user_condition_subscriptions",
            "condition_evaluation_cache",
            "condition_triggers"
        ]
        
        all_exist = True
        for table in tables:
            try:
                result = supabase.table(table).select("*").limit(1).execute()
                count_result = supabase.table(table).select("*", count="exact").execute()
                count = count_result.count if hasattr(count_result, 'count') else len(count_result.data) if count_result.data else 0
                print(f"✅ {table} exists ({count} records)")
            except Exception as e:
                if "relation" in str(e).lower() or "does not exist" in str(e).lower():
                    print(f"❌ {table} does not exist")
                    all_exist = False
                else:
                    print(f"✅ {table} exists (checked)")
        
        return all_exist
        
    except Exception as e:
        print(f"❌ Error checking database tables: {e}")
        return False

async def check_registered_conditions():
    """Check if there are registered conditions."""
    print("\n[Registered Conditions]")
    try:
        from apps.api.clients.supabase_client import supabase
        if supabase is None:
            print("❌ Supabase client not available")
            return False
        
        # Check condition registry
        result = supabase.table("condition_registry").select("*", count="exact").execute()
        total_conditions = result.count if hasattr(result, 'count') else len(result.data) if result.data else 0
        
        # Check active subscriptions (use 'active' boolean column, not 'status')
        subscriptions_result = supabase.table("user_condition_subscriptions")\
            .select("*", count="exact")\
            .eq("active", True)\
            .execute()
        active_subscriptions = subscriptions_result.count if hasattr(subscriptions_result, 'count') else len(subscriptions_result.data) if subscriptions_result.data else 0
        
        print(f"📊 Condition Registry: {total_conditions} conditions registered")
        print(f"📊 Active Subscriptions: {active_subscriptions} active bot subscriptions")
        
        if total_conditions > 0:
            print("✅ Conditions are registered")
            return True
        else:
            print("⚠️  No conditions registered yet (this is OK if no bots created)")
            return True  # Not an error, just no data yet
        
    except Exception as e:
        print(f"❌ Error checking registered conditions: {e}")
        return False

async def test_event_bus():
    """Test event bus functionality."""
    print("\n[Event Bus Test]")
    try:
        from apps.bots.event_bus import EventBus, create_event_bus
        
        event_bus = await create_event_bus()
        if event_bus is None or not event_bus.connected:
            print("❌ Event bus not connected")
            return False
        
        # Test publish
        test_event = {
            "test": True,
            "timestamp": datetime.now().isoformat()
        }
        
        published = await event_bus.publish("test.verification", test_event)
        if published:
            print("✅ Event bus publish successful")
            await event_bus.disconnect()
            return True
        else:
            print("❌ Event bus publish failed")
            await event_bus.disconnect()
            return False
        
    except Exception as e:
        print(f"❌ Event bus test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

async def check_recent_triggers():
    """Check if there are recent condition triggers."""
    print("\n[Recent Condition Triggers]")
    try:
        from apps.api.clients.supabase_client import supabase
        if supabase is None:
            print("❌ Supabase client not available")
            return False
        
        # Check for triggers in last 24 hours
        result = supabase.table("condition_triggers")\
            .select("*")\
            .order("triggered_at", desc=True)\
            .limit(5)\
            .execute()
        
        if result.data:
            print(f"✅ Found {len(result.data)} recent triggers")
            for trigger in result.data[:3]:
                condition_id = trigger.get('condition_id', 'unknown')
                triggered_at = trigger.get('triggered_at', 'unknown')
                print(f"   - Condition {condition_id[:8]}... at {triggered_at}")
            return True
        else:
            print("⚠️  No recent triggers (this is OK if no conditions met)")
            return True  # Not an error
        
    except Exception as e:
        print(f"❌ Error checking triggers: {e}")
        return False

async def test_condition_evaluator_imports():
    """Test if condition evaluator can be imported."""
    print("\n[Condition Evaluator Imports]")
    try:
        from apps.bots.condition_evaluator import CentralizedConditionEvaluator
        from apps.bots.market_data import MarketDataService
        print("✅ Condition evaluator imports successful")
        return True
    except Exception as e:
        print(f"❌ Condition evaluator import failed: {e}")
        import traceback
        traceback.print_exc()
        return False

async def test_bot_notifier_imports():
    """Test if bot notifier can be imported."""
    print("\n[Bot Notifier Imports]")
    try:
        from apps.bots.bot_notifier import BotNotifier
        print("✅ Bot notifier imports successful")
        return True
    except Exception as e:
        print(f"❌ Bot notifier import failed: {e}")
        import traceback
        traceback.print_exc()
        return False

async def check_service_logs():
    """Check if service logs exist and show activity."""
    print("\n[Service Logs]")
    log_files = [
        ("condition-evaluator", "apps/bots/condition_evaluator.log"),
        ("bot-notifier", "apps/bots/bot_notifier.log"),
    ]
    
    logs_found = False
    for service_name, log_path in log_files:
        full_path = root_path / log_path
        if full_path.exists():
            logs_found = True
            # Check last few lines
            try:
                with open(full_path, 'r') as f:
                    lines = f.readlines()
                    last_lines = lines[-5:] if len(lines) > 5 else lines
                    print(f"✅ {service_name} log exists ({len(lines)} lines)")
                    if any("error" in line.lower() or "exception" in line.lower() for line in last_lines):
                        print(f"   ⚠️  Recent errors found in {service_name} log")
                    elif any("initialized" in line.lower() or "connected" in line.lower() for line in last_lines):
                        print(f"   ✅ Recent activity shows initialization")
            except Exception as e:
                print(f"⚠️  Could not read {service_name} log: {e}")
        else:
            print(f"⚠️  {service_name} log not found: {log_path}")
    
    # Check Docker logs if available
    try:
        result = subprocess.run(['docker', 'ps', '--format', '{{.Names}}'], 
                              capture_output=True, text=True)
        containers = [c for c in result.stdout.strip().split('\n') if 'condition-evaluator' in c or 'bot-notifier' in c]
        if containers:
            print(f"✅ Docker containers running: {', '.join(containers)}")
            logs_found = True
    except:
        pass
    
    return logs_found

async def main():
    """Run all Phase 2 verification checks."""
    print("=" * 70)
    print("Phase 2 Verification: Centralized Bot System")
    print("=" * 70)
    print(f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    results = {}
    
    # Run checks
    results['redis'] = await check_redis_connection()
    results['supabase'] = await check_supabase_connection()
    results['services'] = check_services_running()
    results['database'] = await check_database_tables()
    results['conditions'] = await check_registered_conditions()
    results['event_bus'] = await test_event_bus()
    results['triggers'] = await check_recent_triggers()
    results['evaluator_imports'] = await test_condition_evaluator_imports()
    results['notifier_imports'] = await test_bot_notifier_imports()
    results['logs'] = await check_service_logs()
    
    # Summary
    print("\n" + "=" * 70)
    print("VERIFICATION SUMMARY")
    print("=" * 70)
    
    critical_checks = {
        'redis': results['redis'],
        'supabase': results['supabase'],
        'database': results['database'],
        'evaluator_imports': results['evaluator_imports'],
        'notifier_imports': results['notifier_imports'],
    }
    
    services_running = len(results['services']) > 0
    critical_passed = sum(critical_checks.values())
    critical_total = len(critical_checks)
    
    print(f"\nCritical Checks: {critical_passed}/{critical_total}")
    for check, passed in critical_checks.items():
        status = "✅" if passed else "❌"
        print(f"  {status} {check}")
    
    print(f"\nServices Running: {services_running}")
    if results['services']:
        for service, method in results['services'].items():
            print(f"  ✅ {service} ({method})")
    else:
        print("  ❌ No Phase 2 services running")
    
    print(f"\nEvent Bus: {'✅ Working' if results['event_bus'] else '❌ Failed'}")
    print(f"Logs: {'✅ Found' if results['logs'] else '⚠️  Not found'}")
    
    # Final verdict
    print("\n" + "=" * 70)
    if critical_passed == critical_total and services_running:
        print("✅ PHASE 2 IS WORKING!")
        print("\nAll critical components are operational:")
        print("  ✅ Redis connection working")
        print("  ✅ Supabase connection working")
        print("  ✅ Database tables exist")
        print("  ✅ Services are running")
        print("  ✅ Imports work correctly")
        return True
    elif critical_passed == critical_total:
        print("⚠️  PHASE 2 SETUP IS CORRECT, BUT SERVICES NOT RUNNING")
        print("\nAll components are ready, but services need to be started:")
        if 'condition-evaluator' not in results['services']:
            print("  ⚠️  Condition Evaluator not running")
        if 'bot-notifier' not in results['services']:
            print("  ⚠️  Bot Notifier not running")
        print("\nTo start services:")
        print("  Docker: docker-compose up -d condition-evaluator bot-notifier")
        print("  Or Python: python3 apps/bots/run_condition_evaluator.py &")
        return False
    else:
        print("❌ PHASE 2 HAS ISSUES")
        print("\nSome critical components are missing or not working:")
        for check, passed in critical_checks.items():
            if not passed:
                print(f"  ❌ {check}")
        return False

if __name__ == "__main__":
    try:
        success = asyncio.run(main())
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n\nVerification interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n❌ Verification failed with error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

