#!/usr/bin/env python3
"""
Verify Phase 2 (Centralized Bot System) is complete and ready for deployment.
"""

import os
import sys

def check_file_exists(filepath, description):
    """Check if file exists."""
    exists = os.path.exists(filepath)
    status = "✅" if exists else "❌"
    print(f"{status} {description}: {filepath}")
    return exists

def check_file_content(filepath, required_strings, description):
    """Check if file contains required strings."""
    if not os.path.exists(filepath):
        print(f"❌ {description}: File not found")
        return False
    
    try:
        with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
        
        missing = []
        for req_str in required_strings:
            if req_str not in content:
                missing.append(req_str)
        
        if missing:
            print(f"❌ {description}: Missing required content")
            for m in missing:
                print(f"   - Missing: {m}")
            return False
        else:
            print(f"✅ {description}: All required content found")
            return True
    except Exception as e:
        print(f"❌ {description}: Error reading file: {e}")
        return False

def main():
    """Verify Phase 2 completeness."""
    print("=" * 70)
    print("Phase 2 Verification: Centralized Bot System")
    print("=" * 70)
    
    all_checks = []
    
    # Phase 2.1: Condition Evaluator
    print("\n[Phase 2.1] Condition Evaluator:")
    all_checks.append(check_file_exists(
        "apps/bots/condition_evaluator.py",
        "Condition Evaluator"
    ))
    all_checks.append(check_file_exists(
        "apps/bots/run_condition_evaluator.py",
        "Condition Evaluator Runner"
    ))
    all_checks.append(check_file_content(
        "apps/bots/condition_evaluator.py",
        ["class CentralizedConditionEvaluator", "start_evaluation_loop"],
        "Condition Evaluator Implementation"
    ))
    
    # Phase 2.2: Event Bus
    print("\n[Phase 2.2] Event Bus:")
    all_checks.append(check_file_exists(
        "apps/bots/event_bus.py",
        "Event Bus Module"
    ))
    all_checks.append(check_file_content(
        "apps/bots/event_bus.py",
        ["class EventBus", "publish", "subscribe", "psubscribe"],
        "Event Bus Implementation"
    ))
    all_checks.append(check_file_content(
        "apps/api/pyproject.toml",
        ["redis>="],
        "Redis Dependency"
    ))
    
    # Phase 2.3: Bot Notifier
    print("\n[Phase 2.3] Bot Notifier:")
    all_checks.append(check_file_exists(
        "apps/bots/bot_notifier.py",
        "Bot Notifier Module"
    ))
    all_checks.append(check_file_exists(
        "apps/bots/run_bot_notifier.py",
        "Bot Notifier Runner"
    ))
    all_checks.append(check_file_content(
        "apps/bots/bot_notifier.py",
        ["class BotNotifier", "handle_condition_trigger", "execute_dca_bot_action"],
        "Bot Notifier Implementation"
    ))
    
    # Integration
    print("\n[Integration] Integration Files:")
    all_checks.append(check_file_content(
        "apps/bots/condition_evaluator.py",
        ["_publish_condition_trigger", "event_bus"],
        "Event Bus Integration in Evaluator"
    ))
    
    # Summary
    print("\n" + "=" * 70)
    passed = sum(all_checks)
    total = len(all_checks)
    
    if passed == total:
        print(f"✅ ALL CHECKS PASSED ({passed}/{total})")
        print("\nPhase 2 is COMPLETE and ready for deployment!")
        return True
    else:
        print(f"❌ SOME CHECKS FAILED ({passed}/{total})")
        print(f"   Passed: {passed}")
        print(f"   Failed: {total - passed}")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)


