#!/usr/bin/env python3
"""Startup script for indicator engine."""

import uvicorn
import sys
import os

# Add current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

if __name__ == "__main__":
    print("🚀 Starting Indicator Engine with TA-Lib...")
    print("📊 Available indicators: RSI, MACD, SMA, EMA, BBANDS, STOCH, and many more!")
    print("🌐 API Documentation: http://localhost:8001/docs")
    print("🔌 WebSocket endpoint: ws://localhost:8001/ws/realtime")
    
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8001,
        reload=True,
        log_level="info"
    )


