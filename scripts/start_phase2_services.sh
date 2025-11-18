#!/bin/bash
# Start Phase 2 services (Condition Evaluator and Bot Notifier)
# Supports both Docker Compose and direct Python processes

set -e

echo "========================================="
echo "Starting Phase 2 Services"
echo "========================================="

# Detect Docker Compose command (supports both docker-compose and docker compose)
DOCKER_COMPOSE_CMD=""
if command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker-compose"
elif docker compose version &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker compose"
fi

# Check if Docker Compose is available
if [ -n "$DOCKER_COMPOSE_CMD" ]; then
    echo ""
    echo "Using Docker Compose ($DOCKER_COMPOSE_CMD)..."
    
    # Navigate to project root
    cd "$(dirname "$0")/.."
    
    # Check if docker-compose.yml exists
    if [ -f "docker-compose.yml" ]; then
        echo "✅ Found docker-compose.yml"
        
        # Start Redis if not running
        echo "Starting Redis..."
        $DOCKER_COMPOSE_CMD up -d redis
        sleep 2
        
        # Start condition evaluator
        echo "Starting Condition Evaluator..."
        $DOCKER_COMPOSE_CMD up -d condition-evaluator
        
        # Start bot notifier
        echo "Starting Bot Notifier..."
        $DOCKER_COMPOSE_CMD up -d bot-notifier
        
        sleep 3
        
        # Check status
        echo ""
        echo "Service Status:"
        $DOCKER_COMPOSE_CMD ps condition-evaluator bot-notifier redis
        
        echo ""
        echo "✅ Services started via Docker Compose"
        echo ""
        echo "To view logs:"
        echo "  $DOCKER_COMPOSE_CMD logs -f condition-evaluator"
        echo "  $DOCKER_COMPOSE_CMD logs -f bot-notifier"
        
    else
        echo "❌ docker-compose.yml not found"
        echo "Falling back to Python processes..."
        USE_DOCKER=false
    fi
else
    echo "Docker not available, using Python processes..."
    USE_DOCKER=false
fi

# Fallback to Python processes
if [ "${USE_DOCKER:-true}" = "false" ] || [ ! -f "docker-compose.yml" ]; then
    echo ""
    echo "Using Python processes..."
    
    # Navigate to project root
    cd "$(dirname "$0")/.."
    
    # Check Redis is running
    if ! redis-cli ping &> /dev/null; then
        echo "❌ Redis is not running. Please start Redis first:"
        echo "   sudo systemctl start redis-server"
        exit 1
    fi
    echo "✅ Redis is running"
    
    # Check if services are already running
    if pgrep -f "run_condition_evaluator.py" > /dev/null; then
        echo "⚠️  Condition Evaluator is already running"
    else
        echo "Starting Condition Evaluator..."
        cd apps/bots
        nohup python3 run_condition_evaluator.py > condition_evaluator.log 2>&1 &
        echo "   PID: $!"
        cd ../..
    fi
    
    if pgrep -f "run_bot_notifier.py" > /dev/null; then
        echo "⚠️  Bot Notifier is already running"
    else
        echo "Starting Bot Notifier..."
        cd apps/bots
        nohup python3 run_bot_notifier.py > bot_notifier.log 2>&1 &
        echo "   PID: $!"
        cd ../..
    fi
    
    sleep 3
    
    # Check status
    echo ""
    echo "Service Status:"
    ps aux | grep -E "(condition_evaluator|bot_notifier)" | grep -v grep || echo "No processes found"
    
    echo ""
    echo "✅ Services started as Python processes"
    echo ""
    echo "To view logs:"
    echo "  tail -f apps/bots/condition_evaluator.log"
    echo "  tail -f apps/bots/bot_notifier.log"
fi

echo ""
echo "========================================="
echo "Verifying services..."
echo "========================================="
sleep 2
python3 scripts/verify_phase2_running.py

