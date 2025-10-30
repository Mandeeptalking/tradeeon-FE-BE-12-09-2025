#!/usr/bin/env python3
"""
Simple test script to verify simulator functionality.
"""

import asyncio
import sys
from pathlib import Path

# Add the parent directory to Python path
sys.path.insert(0, str(Path(__file__).parent))

from smartbots.arb.simulator import VirtualExecutor
from smartbots.arb.ledger import Ledger


def test_simulator():
    """Test simulator functionality."""
    print("🧪 Testing simulator...")
    
    # Create test executor
    executor = VirtualExecutor(
        trade_size=100.0,
        fee_rate=0.001,
        min_profit=1.0,
        safety=0.001
    )
    
    # Create test ledger
    ledger = Ledger(csv_file="test_trades.csv", db_file="test_trades.db")
    
    # Mock profitable opportunity
    mock_loop = {
        "path": ["USDT", "BTC", "ETH", "USDT"],
        "pairs": ["BTCUSDT", "BTCETH", "ETHUSDT"]
    }
    
    mock_quotes = {
        "BTCUSDT": {"bid": 65000.0, "ask": 65010.0},
        "BTCETH": {"bid": 0.065, "ask": 0.0655},
        "ETHUSDT": {"bid": 3200.0, "ask": 3205.0}
    }
    
    # Test profit calculation
    is_profitable = executor.is_profitable_opportunity(mock_loop, mock_quotes)
    print(f"✅ Profitability check: {is_profitable}")
    
    # Test execution (this will likely fail due to mock data, but tests the flow)
    execution_result = executor.execute(mock_loop, mock_quotes)
    print(f"✅ Execution test completed: {execution_result is not None}")
    
    # Test ledger
    if execution_result and execution_result.get('success'):
        ledger.record_trade(execution_result, 50)
        print("✅ Trade recorded in ledger")
        
        summary = ledger.summary()
        print(f"✅ Ledger summary: {summary}")
        
        ledger.print_summary("TEST SUMMARY")
    
    # Cleanup
    try:
        Path("test_trades.csv").unlink(missing_ok=True)
        Path("test_trades.db").unlink(missing_ok=True)
        print("✅ Test files cleaned up")
    except Exception as e:
        print(f"⚠️  Cleanup warning: {e}")
    
    print("🎉 Simulator test completed!")


if __name__ == "__main__":
    test_simulator()

