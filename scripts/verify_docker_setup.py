#!/usr/bin/env python3
"""
Verify Docker Compose setup is ready for deployment.
"""

import os
import sys
import subprocess
from pathlib import Path

def check_file_exists(filepath, description):
    """Check if file exists."""
    exists = os.path.exists(filepath)
    status = "✅" if exists else "❌"
    print(f"{status} {description}: {filepath}")
    return exists

def check_docker_available():
    """Check if Docker is installed."""
    try:
        result = subprocess.run(['docker', '--version'], capture_output=True, text=True)
        if result.returncode == 0:
            print(f"✅ Docker installed: {result.stdout.strip()}")
            return True
        else:
            print("❌ Docker not found")
            return False
    except FileNotFoundError:
        print("❌ Docker not installed")
        return False

def check_docker_compose_available():
    """Check if Docker Compose is available."""
    try:
        # Try docker compose (v2)
        result = subprocess.run(['docker', 'compose', '--version'], capture_output=True, text=True)
        if result.returncode == 0:
            print(f"✅ Docker Compose installed: {result.stdout.strip()}")
            return True
    except FileNotFoundError:
        pass
    
    try:
        # Try docker-compose (v1)
        result = subprocess.run(['docker-compose', '--version'], capture_output=True, text=True)
        if result.returncode == 0:
            print(f"✅ Docker Compose installed: {result.stdout.strip()}")
            return True
        else:
            print("❌ Docker Compose not found")
            return False
    except FileNotFoundError:
        print("❌ Docker Compose not installed")
        return False

def check_dockerfile_validity(dockerfile):
    """Check if Dockerfile is valid."""
    if not os.path.exists(dockerfile):
        print(f"❌ Dockerfile not found: {dockerfile}")
        return False
    
    try:
        # Try to build with --dry-run or just validate syntax
        with open(dockerfile, 'r') as f:
            content = f.read()
            # Basic checks
            if 'FROM' in content:
                print(f"✅ Dockerfile looks valid: {dockerfile}")
                return True
            else:
                print(f"❌ Dockerfile missing FROM: {dockerfile}")
                return False
    except Exception as e:
        print(f"❌ Error reading Dockerfile {dockerfile}: {e}")
        return False

def check_env_file():
    """Check if .env file exists and has required variables."""
    env_file = Path('.env')
    if not env_file.exists():
        print("⚠️  .env file not found (you'll need to create it)")
        return False
    
    try:
        with open(env_file, 'r') as f:
            content = f.read()
            required_vars = [
                'SUPABASE_URL',
                'SUPABASE_SERVICE_ROLE_KEY',
                'SUPABASE_JWT_SECRET'
            ]
            missing = []
            for var in required_vars:
                if var not in content:
                    missing.append(var)
            
            if missing:
                print(f"⚠️  .env file missing variables: {', '.join(missing)}")
                return False
            else:
                print("✅ .env file exists with required variables")
                return True
    except Exception as e:
        print(f"❌ Error reading .env file: {e}")
        return False

def main():
    """Verify Docker setup."""
    print("=" * 70)
    print("Docker Compose Setup Verification")
    print("=" * 70)
    
    all_checks = []
    
    # Check Docker is installed
    print("\n[Prerequisites]")
    all_checks.append(check_docker_available())
    all_checks.append(check_docker_compose_available())
    
    # Check Dockerfiles exist
    print("\n[Dockerfiles]")
    all_checks.append(check_file_exists("Dockerfile", "Backend Dockerfile"))
    all_checks.append(check_file_exists("Dockerfile.condition-evaluator", "Condition Evaluator Dockerfile"))
    all_checks.append(check_file_exists("Dockerfile.bot-notifier", "Bot Notifier Dockerfile"))
    all_checks.append(check_file_exists("Dockerfile.alert-runner", "Alert Runner Dockerfile"))
    
    # Check Docker Compose file
    print("\n[Docker Compose]")
    all_checks.append(check_file_exists("docker-compose.yml", "Docker Compose file"))
    
    # Check Dockerfile validity
    print("\n[Dockerfile Validation]")
    all_checks.append(check_dockerfile_validity("Dockerfile"))
    all_checks.append(check_dockerfile_validity("Dockerfile.condition-evaluator"))
    all_checks.append(check_dockerfile_validity("Dockerfile.bot-notifier"))
    
    # Check required files exist
    print("\n[Required Files]")
    all_checks.append(check_file_exists("requirements.txt", "Requirements file"))
    all_checks.append(check_file_exists("apps/bots/run_condition_evaluator.py", "Condition Evaluator Runner"))
    all_checks.append(check_file_exists("apps/bots/run_bot_notifier.py", "Bot Notifier Runner"))
    all_checks.append(check_file_exists("apps/bots/condition_evaluator.py", "Condition Evaluator"))
    all_checks.append(check_file_exists("apps/bots/event_bus.py", "Event Bus"))
    all_checks.append(check_file_exists("apps/bots/bot_notifier.py", "Bot Notifier"))
    
    # Check .env file
    print("\n[Environment Variables]")
    env_check = check_env_file()
    all_checks.append(env_check)
    
    # Summary
    print("\n" + "=" * 70)
    passed = sum(all_checks)
    total = len(all_checks)
    
    if passed == total:
        print(f"✅ ALL CHECKS PASSED ({passed}/{total})")
        print("\n🎉 Docker Compose setup is ready!")
        print("\nNext steps:")
        print("1. Create .env file with your environment variables")
        print("2. Run: docker-compose build")
        print("3. Run: docker-compose up -d")
        return True
    else:
        print(f"⚠️  SOME CHECKS FAILED ({passed}/{total})")
        print(f"   Passed: {passed}")
        print(f"   Failed: {total - passed}")
        
        if not env_check:
            print("\n⚠️  Create .env file with required environment variables")
            print("   See .env.example or DOCKER_DEPLOYMENT_GUIDE.md for details")
        
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)


