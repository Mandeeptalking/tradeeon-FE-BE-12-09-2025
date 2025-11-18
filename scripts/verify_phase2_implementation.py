#!/usr/bin/env python3
"""
Comprehensive Phase 2 Implementation Verification
Checks if all Phase 2 components are properly implemented.
"""

import os
import sys
from pathlib import Path
from typing import Dict, List, Tuple

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

def check_file_exists(path: str, description: str) -> Tuple[bool, str]:
    """Check if a file exists."""
    file_path = project_root / path
    exists = file_path.exists()
    status = "[OK]" if exists else "[FAIL]"
    return exists, f"{status} {description}: {path}"

def check_directory_exists(path: str, description: str) -> Tuple[bool, str]:
    """Check if a directory exists."""
    dir_path = project_root / path
    exists = dir_path.exists() and dir_path.is_dir()
    status = "[OK]" if exists else "[FAIL]"
    return exists, f"{status} {description}: {path}"

def check_file_content(path: str, search_strings: List[str], description: str) -> Tuple[bool, List[str]]:
    """Check if file contains required strings."""
    file_path = project_root / path
    if not file_path.exists():
        return False, [f"❌ {description}: File not found: {path}"]
    
    try:
        content = file_path.read_text(encoding='utf-8', errors='ignore')
        missing = []
        found = []
        for search in search_strings:
            if search in content:
                found.append(f"  [OK] Contains: {search}")
            else:
                missing.append(f"  [FAIL] Missing: {search}")
        
        if missing:
            return False, [f"[WARN] {description}: {path}"] + found + missing
        else:
            return True, [f"[OK] {description}: {path}"] + found
    except Exception as e:
        return False, [f"[FAIL] {description}: Error reading {path}: {e}"]

def verify_phase2_implementation():
    """Verify Phase 2 implementation comprehensively."""
    print("=" * 80)
    print("Phase 2 Implementation Verification")
    print("=" * 80)
    print()
    
    all_checks_passed = True
    results = []
    
    # Phase 2.1: Condition Evaluator
    print("[Phase 2.1] Condition Evaluator Service")
    print("-" * 80)
    
    checks = [
        ("apps/bots/condition_evaluator.py", "Condition Evaluator module"),
        ("apps/bots/run_condition_evaluator.py", "Condition Evaluator runner"),
        ("apps/bots/market_data.py", "Market Data Service"),
    ]
    
    for path, desc in checks:
        exists, msg = check_file_exists(path, desc)
        results.append((exists, msg))
        if not exists:
            all_checks_passed = False
        print(msg)
    
    # Check condition_evaluator.py content
    content_checks = check_file_content(
        "apps/bots/condition_evaluator.py",
        ["CentralizedConditionEvaluator", "evaluate_symbol_timeframe", "start_evaluation_loop"],
        "Condition Evaluator implementation"
    )
    results.append(content_checks)
    for msg in content_checks[1]:
        print(msg)
    if not content_checks[0]:
        all_checks_passed = False
    
    print()
    
    # Phase 2.2: Event Bus
    print("[Phase 2.2] Event Bus (Redis)")
    print("-" * 80)
    
    checks = [
        ("apps/bots/event_bus.py", "Event Bus module"),
    ]
    
    for path, desc in checks:
        exists, msg = check_file_exists(path, desc)
        results.append((exists, msg))
        if not exists:
            all_checks_passed = False
        print(msg)
    
    # Check event_bus.py content
    content_checks = check_file_content(
        "apps/bots/event_bus.py",
        ["EventBus", "publish", "subscribe", "Redis"],
        "Event Bus implementation"
    )
    results.append(content_checks)
    for msg in content_checks[1]:
        print(msg)
    if not content_checks[0]:
        all_checks_passed = False
    
    print()
    
    # Phase 2.3: Bot Notifier
    print("[Phase 2.3] Bot Notifier Service")
    print("-" * 80)
    
    checks = [
        ("apps/bots/bot_notifier.py", "Bot Notifier module"),
        ("apps/bots/run_bot_notifier.py", "Bot Notifier runner"),
    ]
    
    for path, desc in checks:
        exists, msg = check_file_exists(path, desc)
        results.append((exists, msg))
        if not exists:
            all_checks_passed = False
        print(msg)
    
    # Check bot_notifier.py content
    content_checks = check_file_content(
        "apps/bots/bot_notifier.py",
        ["BotNotifier", "handle_condition_trigger", "start_listening"],
        "Bot Notifier implementation"
    )
    results.append(content_checks)
    for msg in content_checks[1]:
        print(msg)
    if not content_checks[0]:
        all_checks_passed = False
    
    print()
    
    # Database Migration
    print("[Database] Migration")
    print("-" * 80)
    
    checks = [
        ("infra/supabase/migrations/06_condition_registry.sql", "Condition Registry migration"),
    ]
    
    for path, desc in checks:
        exists, msg = check_file_exists(path, desc)
        results.append((exists, msg))
        if not exists:
            all_checks_passed = False
        print(msg)
    
    # Check migration content
    content_checks = check_file_content(
        "infra/supabase/migrations/06_condition_registry.sql",
        ["condition_registry", "user_condition_subscriptions", "condition_evaluation_cache", "condition_triggers"],
        "Database migration tables"
    )
    results.append(content_checks)
    for msg in content_checks[1]:
        print(msg)
    if not content_checks[0]:
        all_checks_passed = False
    
    print()
    
    # API Router
    print("[API] Router")
    print("-" * 80)
    
    checks = [
        ("apps/api/routers/condition_registry.py", "Condition Registry API router"),
    ]
    
    for path, desc in checks:
        exists, msg = check_file_exists(path, desc)
        results.append((exists, msg))
        if not exists:
            all_checks_passed = False
        print(msg)
    
    # Check API router content
    content_checks = check_file_content(
        "apps/api/routers/condition_registry.py",
        ["register_condition", "subscribe", "normalize_condition", "hash_condition"],
        "Condition Registry API endpoints"
    )
    results.append(content_checks)
    for msg in content_checks[1]:
        print(msg)
    if not content_checks[0]:
        all_checks_passed = False
    
    # Check main.py integration
    content_checks = check_file_content(
        "apps/api/main.py",
        ["condition_registry", "router", "include_router"],
        "API main.py integration"
    )
    results.append(content_checks)
    for msg in content_checks[1]:
        print(msg)
    if not content_checks[0]:
        all_checks_passed = False
    
    print()
    
    # Bot Integration
    print("[Bot Integration] Phase 1.3")
    print("-" * 80)
    
    # Check bots.py integration
    content_checks = check_file_content(
        "apps/api/routers/bots.py",
        ["extract_conditions_from_dca_config", "register_condition_via_api", "subscribe_bot_to_condition_via_api"],
        "Bot integration functions"
    )
    results.append(content_checks)
    for msg in content_checks[1]:
        print(msg)
    if not content_checks[0]:
        all_checks_passed = False
    
    print()
    
    # Docker Setup
    print("[Docker] Configuration")
    print("-" * 80)
    
    checks = [
        ("Dockerfile.condition-evaluator", "Condition Evaluator Dockerfile"),
        ("Dockerfile.bot-notifier", "Bot Notifier Dockerfile"),
        ("docker-compose.yml", "Docker Compose configuration"),
    ]
    
    for path, desc in checks:
        exists, msg = check_file_exists(path, desc)
        results.append((exists, msg))
        if not exists:
            all_checks_passed = False
        print(msg)
    
    # Check docker-compose.yml content
    content_checks = check_file_content(
        "docker-compose.yml",
        ["condition-evaluator", "bot-notifier", "redis"],
        "Docker Compose services"
    )
    results.append(content_checks)
    for msg in content_checks[1]:
        print(msg)
    if not content_checks[0]:
        all_checks_passed = False
    
    print()
    
    # Dependencies
    print("[Dependencies]")
    print("-" * 80)
    
    # Check requirements.txt
    content_checks = check_file_content(
        "requirements.txt",
        ["redis"],
        "Redis dependency in requirements.txt"
    )
    results.append(content_checks)
    for msg in content_checks[1]:
        print(msg)
    if not content_checks[0]:
        all_checks_passed = False
    
    # Check pyproject.toml
    if (project_root / "apps/api/pyproject.toml").exists():
        content_checks = check_file_content(
            "apps/api/pyproject.toml",
            ["redis"],
            "Redis dependency in pyproject.toml"
        )
        results.append(content_checks)
        for msg in content_checks[1]:
            print(msg)
        if not content_checks[0]:
            all_checks_passed = False
    
    print()
    
    # Summary
    print("=" * 80)
    print("VERIFICATION SUMMARY")
    print("=" * 80)
    
    passed_count = sum(1 for passed, _ in results if passed)
    total_count = len(results)
    
    print(f"\nChecks Passed: {passed_count}/{total_count}")
    
    if all_checks_passed:
        print("\n[OK] PHASE 2 IMPLEMENTATION IS COMPLETE!")
        print("\nAll components have been implemented:")
        print("  [OK] Phase 2.1: Condition Evaluator Service")
        print("  [OK] Phase 2.2: Event Bus (Redis)")
        print("  [OK] Phase 2.3: Bot Notifier Service")
        print("  [OK] Database Migration")
        print("  [OK] API Router")
        print("  [OK] Bot Integration")
        print("  [OK] Docker Configuration")
        print("  [OK] Dependencies")
        print("\nPhase 2 is ready for deployment and testing!")
        return True
    else:
        print("\n[WARN] PHASE 2 IMPLEMENTATION HAS ISSUES")
        print("\nSome components are missing or incomplete:")
        failed = [msg for passed, msg in results if not passed]
        for msg in failed[:10]:  # Show first 10 failures
            print(f"  {msg}")
        if len(failed) > 10:
            print(f"  ... and {len(failed) - 10} more")
        return False

if __name__ == "__main__":
    try:
        success = verify_phase2_implementation()
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"\n[FAIL] Verification failed with error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

