#!/usr/bin/env python3
"""
Test script to verify all imports work correctly for bot notifier system.
Run this before deploying to Lightsail.
"""

import sys
import os

def test_imports():
    """Test all required imports."""
    errors = []
    
    print("=" * 70)
    print("Testing Bot Notifier System Imports")
    print("=" * 70)
    
    # Test 1: Event Bus
    print("\n[1/6] Testing EventBus import...")
    try:
        sys.path.insert(0, '.')
        from apps.bots.event_bus import EventBus, create_event_bus
        print("   ✅ EventBus import OK")
    except Exception as e:
        print(f"   ❌ EventBus import FAILED: {e}")
        errors.append(f"EventBus: {e}")
    
    # Test 2: Supabase Client
    print("\n[2/6] Testing Supabase client import...")
    try:
        from apps.api.clients.supabase_client import supabase
        print("   ✅ Supabase client import OK")
    except Exception as e:
        print(f"   ❌ Supabase client import FAILED: {e}")
        errors.append(f"Supabase: {e}")
    
    # Test 3: Bot Notifier (with path setup)
    print("\n[3/6] Testing BotNotifier import...")
    try:
        bots_path = os.path.join('apps', 'bots')
        api_path = os.path.join('apps', 'api')
        root_path = '.'
        
        if bots_path not in sys.path:
            sys.path.insert(0, bots_path)
        if api_path not in sys.path:
            sys.path.insert(0, api_path)
        if root_path not in sys.path:
            sys.path.insert(0, root_path)
        
        from bot_notifier import BotNotifier
        print("   ✅ BotNotifier import OK")
    except Exception as e:
        print(f"   ❌ BotNotifier import FAILED: {e}")
        errors.append(f"BotNotifier: {e}")
    
    # Test 4: DCA Executor
    print("\n[4/6] Testing DCABotExecutor import...")
    try:
        from apps.bots.dca_executor import DCABotExecutor
        print("   ✅ DCABotExecutor import OK")
    except Exception as e:
        print(f"   ❌ DCABotExecutor import FAILED: {e}")
        errors.append(f"DCABotExecutor: {e}")
    
    # Test 5: Condition Evaluator
    print("\n[5/6] Testing ConditionEvaluator import...")
    try:
        from apps.bots.condition_evaluator import CentralizedConditionEvaluator
        print("   ✅ ConditionEvaluator import OK")
    except Exception as e:
        print(f"   ❌ ConditionEvaluator import FAILED: {e}")
        errors.append(f"ConditionEvaluator: {e}")
    
    # Test 6: Run Bot Notifier (syntax check)
    print("\n[6/6] Testing run_bot_notifier.py syntax...")
    try:
        import ast
        with open('apps/bots/run_bot_notifier.py', 'r') as f:
            code = f.read()
        ast.parse(code)
        print("   ✅ run_bot_notifier.py syntax OK")
    except SyntaxError as e:
        print(f"   ❌ run_bot_notifier.py syntax FAILED: {e}")
        errors.append(f"run_bot_notifier syntax: {e}")
    except Exception as e:
        print(f"   ⚠️  Could not check syntax: {e}")
    
    # Summary
    print("\n" + "=" * 70)
    if errors:
        print(f"❌ FAILED: {len(errors)} error(s) found")
        for error in errors:
            print(f"   - {error}")
        return False
    else:
        print("✅ ALL IMPORTS PASSED")
        print("=" * 70)
        return True

if __name__ == "__main__":
    success = test_imports()
    sys.exit(0 if success else 1)


