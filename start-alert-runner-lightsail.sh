#!/bin/bash
# Start Alert Runner on Lightsail
# Run this script to start the alert runner as a background process

set -e

echo "========================================="
echo "Starting Alert Runner on Lightsail"
echo "========================================="
echo ""

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR" || exit 1

# Check if already running
if pgrep -f "apps.alerts.runner" > /dev/null; then
    echo "⚠️  Alert runner is already running!"
    echo "   PID: $(pgrep -f 'apps.alerts.runner')"
    echo ""
    echo "To stop it:"
    echo "   pkill -f 'apps.alerts.runner'"
    echo ""
    exit 0
fi

# Check environment variables
echo "Checking environment variables..."
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo "⚠️  Warning: Environment variables might not be set"
    echo "   Make sure .env file exists and is loaded"
    echo ""
fi

# Check if .env exists
if [ -f ".env" ]; then
    echo "✅ .env file found"
    # Load .env file
    set -a
    source .env
    set +a
else
    echo "⚠️  .env file not found in current directory"
    echo "   Make sure you're in the project root"
fi

# Create logs directory
mkdir -p logs

# Start alert runner
echo ""
echo "Starting alert runner..."
echo "   Logs will be written to: logs/alert-runner.log"
echo ""

# Start in background with nohup
nohup python3 -m apps.alerts.runner > logs/alert-runner.log 2>&1 &

# Get PID
ALERT_RUNNER_PID=$!

# Wait a moment to check if it started
sleep 2

# Check if process is still running
if ps -p $ALERT_RUNNER_PID > /dev/null; then
    echo "✅ Alert runner started successfully!"
    echo "   PID: $ALERT_RUNNER_PID"
    echo "   Logs: logs/alert-runner.log"
    echo ""
    echo "To check status:"
    echo "   ps aux | grep alert_runner"
    echo ""
    echo "To view logs:"
    echo "   tail -f logs/alert-runner.log"
    echo ""
    echo "To stop:"
    echo "   kill $ALERT_RUNNER_PID"
    echo "   or"
    echo "   pkill -f 'apps.alerts.runner'"
    echo ""
else
    echo "❌ Alert runner failed to start!"
    echo "   Check logs/alert-runner.log for errors"
    echo ""
    exit 1
fi

echo "========================================="

