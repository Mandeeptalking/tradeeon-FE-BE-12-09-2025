#!/bin/bash
# Setup Alert Runner as a systemd service on Lightsail
# This ensures it starts automatically on boot and restarts on failure

set -e

echo "========================================="
echo "Setting up Alert Runner as systemd service"
echo "========================================="
echo ""

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_DIR="$SCRIPT_DIR"
USER=$(whoami)

echo "Project directory: $PROJECT_DIR"
echo "User: $USER"
echo ""

# Check if running as root
if [ "$EUID" -eq 0 ]; then 
    echo "⚠️  Running as root. Service will run as root (not recommended)"
    echo "   Consider running as regular user and using sudo for systemctl commands"
fi

# Create systemd service file
SERVICE_FILE="/etc/systemd/system/alert-runner.service"

echo "Creating systemd service file..."
sudo tee $SERVICE_FILE > /dev/null <<EOF
[Unit]
Description=Tradeeon Alert Runner
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$PROJECT_DIR
Environment="PATH=/usr/bin:/usr/local/bin"
EnvironmentFile=$PROJECT_DIR/.env
ExecStart=/usr/bin/python3 -m apps.alerts.runner
Restart=always
RestartSec=10
StandardOutput=append:$PROJECT_DIR/logs/alert-runner.log
StandardError=append:$PROJECT_DIR/logs/alert-runner-error.log

[Install]
WantedBy=multi-user.target
EOF

echo "✅ Service file created: $SERVICE_FILE"
echo ""

# Reload systemd
echo "Reloading systemd..."
sudo systemctl daemon-reload

# Enable service (start on boot)
echo "Enabling service (start on boot)..."
sudo systemctl enable alert-runner.service

# Start service
echo "Starting service..."
sudo systemctl start alert-runner.service

# Wait a moment
sleep 2

# Check status
echo ""
echo "Checking service status..."
sudo systemctl status alert-runner.service --no-pager -l

echo ""
echo "========================================="
echo "Service Setup Complete!"
echo "========================================="
echo ""
echo "Service commands:"
echo "   Start:   sudo systemctl start alert-runner"
echo "   Stop:    sudo systemctl stop alert-runner"
echo "   Restart: sudo systemctl restart alert-runner"
echo "   Status:  sudo systemctl status alert-runner"
echo "   Logs:    sudo journalctl -u alert-runner -f"
echo ""
echo "View logs:"
echo "   tail -f logs/alert-runner.log"
echo ""

