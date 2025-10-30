"""
PnL ledger for tracking virtual arbitrage trades.
"""

import csv
import json
import sqlite3
import time
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional


class Ledger:
    """Tracks PnL for virtual arbitrage trades with CSV and SQLite persistence."""
    
    def __init__(self, csv_file: Optional[str] = None, db_file: Optional[str] = None):
        """
        Initialize ledger.
        
        Args:
            csv_file: Optional CSV file path for trade logging
            db_file: Optional SQLite database file path
        """
        self.csv_file = csv_file
        self.db_file = db_file
        
        # In-memory running stats
        self.total_trades = 0
        self.wins = 0
        self.losses = 0
        self.cumulative_profit = 0.0
        self.max_profit = 0.0
        self.max_drawdown = 0.0
        self.min_equity = 0.0
        
        # Initialize storage
        self._init_csv()
        self._init_database()
    
    def _init_csv(self) -> None:
        """Initialize CSV file with headers."""
        if not self.csv_file:
            return
        
        csv_path = Path(self.csv_file)
        if not csv_path.exists():
            with open(csv_path, 'w', newline='', encoding='utf-8') as f:
                writer = csv.writer(f)
                writer.writerow([
                    'timestamp', 'datetime', 'loop_path', 'loop_pairs',
                    'start_usdt', 'final_usdt', 'net_profit', 'profit_pct',
                    'leg_count', 'vwap_legs', 'tob_legs', 'execution_time_ms'
                ])
    
    def _init_database(self) -> None:
        """Initialize SQLite database with trades table."""
        if not self.db_file:
            return
        
        db_path = Path(self.db_file)
        db_path.parent.mkdir(parents=True, exist_ok=True)
        
        with sqlite3.connect(db_path) as conn:
            conn.execute('''
                CREATE TABLE IF NOT EXISTS trades (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp INTEGER NOT NULL,
                    datetime TEXT NOT NULL,
                    loop_path TEXT NOT NULL,
                    loop_pairs TEXT NOT NULL,
                    start_usdt REAL NOT NULL,
                    final_usdt REAL NOT NULL,
                    net_profit REAL NOT NULL,
                    profit_pct REAL NOT NULL,
                    leg_count INTEGER NOT NULL,
                    vwap_legs INTEGER NOT NULL,
                    tob_legs INTEGER NOT NULL,
                    execution_time_ms INTEGER,
                    legs_json TEXT NOT NULL,
                    executor_config TEXT NOT NULL
                )
            ''')
            conn.commit()
    
    def record_trade(self, execution_result: Dict, execution_time_ms: Optional[int] = None) -> None:
        """
        Record a trade execution.
        
        Args:
            execution_result: Execution result from VirtualExecutor
            execution_time_ms: Optional execution time in milliseconds
        """
        if not execution_result or not execution_result.get('success'):
            return
        
        loop = execution_result['loop']
        legs = execution_result['legs']
        
        # Extract trade data
        timestamp = execution_result['timestamp']
        dt = datetime.fromtimestamp(timestamp / 1000).strftime('%Y-%m-%d %H:%M:%S.%f')[:-3]
        loop_path = " → ".join(loop['path'])
        loop_pairs = ", ".join(loop['pairs'])
        start_usdt = execution_result['start_usdt']
        final_usdt = execution_result['final_usdt']
        net_profit = execution_result['net_profit']
        profit_pct = execution_result['profit_pct']
        
        # Count leg methods
        vwap_legs = sum(1 for leg in legs if leg.get('method') == 'VWAP')
        tob_legs = sum(1 for leg in legs if leg.get('method') == 'TOB')
        leg_count = len(legs)
        
        # Update running stats
        self.total_trades += 1
        self.cumulative_profit += net_profit
        
        if net_profit > 0:
            self.wins += 1
            if net_profit > self.max_profit:
                self.max_profit = net_profit
        else:
            self.losses += 1
        
        # Update equity tracking
        current_equity = self.cumulative_profit
        if current_equity < self.min_equity:
            self.min_equity = current_equity
        
        # Calculate max drawdown
        if self.cumulative_profit > 0:
            drawdown = self.cumulative_profit - self.min_equity
            if drawdown > self.max_drawdown:
                self.max_drawdown = drawdown
        
        # Save to CSV
        if self.csv_file:
            self._save_to_csv(
                timestamp, dt, loop_path, loop_pairs, start_usdt, final_usdt,
                net_profit, profit_pct, leg_count, vwap_legs, tob_legs, execution_time_ms
            )
        
        # Save to database
        if self.db_file:
            self._save_to_database(
                timestamp, dt, loop_path, loop_pairs, start_usdt, final_usdt,
                net_profit, profit_pct, leg_count, vwap_legs, tob_legs, 
                execution_time_ms, legs, execution_result.get('executor_config', {})
            )
    
    def _save_to_csv(self, timestamp: int, dt: str, loop_path: str, loop_pairs: str,
                    start_usdt: float, final_usdt: float, net_profit: float, 
                    profit_pct: float, leg_count: int, vwap_legs: int, tob_legs: int,
                    execution_time_ms: Optional[int]) -> None:
        """Save trade to CSV file."""
        with open(self.csv_file, 'a', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow([
                timestamp, dt, loop_path, loop_pairs, start_usdt, final_usdt,
                net_profit, profit_pct, leg_count, vwap_legs, tob_legs, execution_time_ms
            ])
    
    def _save_to_database(self, timestamp: int, dt: str, loop_path: str, loop_pairs: str,
                         start_usdt: float, final_usdt: float, net_profit: float,
                         profit_pct: float, leg_count: int, vwap_legs: int, tob_legs: int,
                         execution_time_ms: Optional[int], legs: List[Dict], 
                         executor_config: Dict) -> None:
        """Save trade to SQLite database."""
        with sqlite3.connect(self.db_file) as conn:
            conn.execute('''
                INSERT INTO trades (
                    timestamp, datetime, loop_path, loop_pairs, start_usdt, final_usdt,
                    net_profit, profit_pct, leg_count, vwap_legs, tob_legs, execution_time_ms,
                    legs_json, executor_config
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                timestamp, dt, loop_path, loop_pairs, start_usdt, final_usdt,
                net_profit, profit_pct, leg_count, vwap_legs, tob_legs, execution_time_ms,
                json.dumps(legs), json.dumps(executor_config)
            ))
            conn.commit()
    
    def summary(self) -> Dict:
        """
        Get current ledger summary.
        
        Returns:
            Dictionary with current statistics
        """
        if self.total_trades == 0:
            return {
                "total_trades": 0,
                "wins": 0,
                "losses": 0,
                "win_rate": 0.0,
                "cumulative_profit": 0.0,
                "avg_profit": 0.0,
                "max_profit": 0.0,
                "max_drawdown": 0.0,
                "equity": 0.0
            }
        
        win_rate = (self.wins / self.total_trades) * 100
        avg_profit = self.cumulative_profit / self.total_trades
        
        return {
            "total_trades": self.total_trades,
            "wins": self.wins,
            "losses": self.losses,
            "win_rate": win_rate,
            "cumulative_profit": self.cumulative_profit,
            "avg_profit": avg_profit,
            "max_profit": self.max_profit,
            "max_drawdown": self.max_drawdown,
            "equity": self.cumulative_profit
        }
    
    def print_summary(self, title: str = "LEDGER SUMMARY") -> None:
        """Print formatted ledger summary."""
        stats = self.summary()
        
        print(f"\n📊 {title}")
        print("-" * 60)
        print(f"Trades: {stats['total_trades']} | "
              f"Wins: {stats['wins']} | "
              f"Losses: {stats['losses']} | "
              f"Win Rate: {stats['win_rate']:.1f}%")
        print(f"Net: {stats['cumulative_profit']:+.2f} USDT | "
              f"Avg: {stats['avg_profit']:+.2f} | "
              f"Max: {stats['max_profit']:+.2f}")
        print(f"Equity: {stats['equity']:+.2f} USDT | "
              f"Max Drawdown: {stats['max_drawdown']:.2f}")
        print("-" * 60)
    
    def get_recent_trades(self, limit: int = 10) -> List[Dict]:
        """
        Get recent trades from database.
        
        Args:
            limit: Number of recent trades to retrieve
            
        Returns:
            List of recent trade records
        """
        if not self.db_file or not Path(self.db_file).exists():
            return []
        
        with sqlite3.connect(self.db_file) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.execute('''
                SELECT * FROM trades 
                ORDER BY timestamp DESC 
                LIMIT ?
            ''', (limit,))
            
            trades = []
            for row in cursor.fetchall():
                trade = dict(row)
                trade['legs_json'] = json.loads(trade['legs_json'])
                trade['executor_config'] = json.loads(trade['executor_config'])
                trades.append(trade)
            
            return trades
    
    def export_to_csv(self, output_file: str, start_time: Optional[int] = None, 
                     end_time: Optional[int] = None) -> None:
        """
        Export trades to CSV file with optional time filtering.
        
        Args:
            output_file: Output CSV file path
            start_time: Optional start timestamp filter
            end_time: Optional end timestamp filter
        """
        if not self.db_file or not Path(self.db_file).exists():
            print("❌ No database available for export")
            return
        
        query = "SELECT * FROM trades"
        params = []
        
        if start_time or end_time:
            conditions = []
            if start_time:
                conditions.append("timestamp >= ?")
                params.append(start_time)
            if end_time:
                conditions.append("timestamp <= ?")
                params.append(end_time)
            
            if conditions:
                query += " WHERE " + " AND ".join(conditions)
        
        query += " ORDER BY timestamp ASC"
        
        with sqlite3.connect(self.db_file) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.execute(query, params)
            
            with open(output_file, 'w', newline='', encoding='utf-8') as f:
                writer = csv.writer(f)
                
                # Write headers
                writer.writerow([
                    'id', 'timestamp', 'datetime', 'loop_path', 'loop_pairs',
                    'start_usdt', 'final_usdt', 'net_profit', 'profit_pct',
                    'leg_count', 'vwap_legs', 'tob_legs', 'execution_time_ms'
                ])
                
                # Write data
                for row in cursor.fetchall():
                    writer.writerow([
                        row['id'], row['timestamp'], row['datetime'], row['loop_path'],
                        row['loop_pairs'], row['start_usdt'], row['final_usdt'],
                        row['net_profit'], row['profit_pct'], row['leg_count'],
                        row['vwap_legs'], row['tob_legs'], row['execution_time_ms']
                    ])
        
        print(f"✅ Exported trades to {output_file}")
    
    def clear_data(self) -> None:
        """Clear all ledger data (use with caution)."""
        self.total_trades = 0
        self.wins = 0
        self.losses = 0
        self.cumulative_profit = 0.0
        self.max_profit = 0.0
        self.max_drawdown = 0.0
        self.min_equity = 0.0
        
        # Clear CSV file
        if self.csv_file and Path(self.csv_file).exists():
            self._init_csv()
        
        # Clear database
        if self.db_file and Path(self.db_file).exists():
            with sqlite3.connect(self.db_file) as conn:
                conn.execute('DELETE FROM trades')
                conn.commit()
        
        print("🗑️  Ledger data cleared")
