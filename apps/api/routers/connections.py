from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Literal, Optional, Dict, Any
import uuid
from datetime import datetime, timedelta
import random

router = APIRouter()

# Types
Exchange = Literal['BINANCE', 'COINBASE', 'KRAKEN', 'ZERODHA']
Status = Literal['connected', 'degraded', 'error', 'not_connected']

class Features(BaseModel):
    trading: bool = False
    wallet: bool = False
    paper: bool = False

class Connection(BaseModel):
    id: str
    exchange: Exchange
    nickname: Optional[str] = None
    status: Status = 'not_connected'
    last_check_at: Optional[str] = None
    next_check_eta_sec: Optional[int] = None
    features: Features = Features()
    notes: Optional[str] = None

class UpsertBody(BaseModel):
    exchange: Exchange
    api_key: str
    api_secret: str
    passphrase: Optional[str] = None
    nickname: Optional[str] = None

class TestBody(BaseModel):
    exchange: Exchange
    api_key: str
    api_secret: str
    passphrase: Optional[str] = None

class RotateBody(BaseModel):
    api_key: str
    api_secret: str
    passphrase: Optional[str] = None

# In-memory store
connections_store: Dict[str, Connection] = {}

# Seed data
def seed_data():
    now = datetime.now()
    
    # Binance - Connected
    connections_store['1'] = Connection(
        id='1',
        exchange='BINANCE',
        nickname='Main Trading',
        status='connected',
        last_check_at=(now - timedelta(minutes=2)).isoformat(),
        next_check_eta_sec=58,
        features=Features(trading=True, wallet=True, paper=False),
    )
    
    # Kraken - Degraded
    connections_store['2'] = Connection(
        id='2',
        exchange='KRAKEN',
        nickname='Backup Account',
        status='degraded',
        last_check_at=(now - timedelta(minutes=5)).isoformat(),
        next_check_eta_sec=45,
        features=Features(trading=False, wallet=True, paper=True),
        notes='Trading scope missing'
    )
    
    # Coinbase - Not Connected
    connections_store['3'] = Connection(
        id='3',
        exchange='COINBASE',
        nickname='Coinbase Pro',
        status='not_connected',
        features=Features()
    )

# Initialize seed data
seed_data()

@router.get("/connections")
async def list_connections():
    """Get all connections"""
    return list(connections_store.values())

@router.post("/connections")
async def upsert_connection(body: UpsertBody):
    """Create or update a connection"""
    # Find existing connection by exchange
    existing = None
    for conn in connections_store.values():
        if conn.exchange == body.exchange:
            existing = conn
            break
    
    now = datetime.now()
    connection_id = existing.id if existing else str(uuid.uuid4())
    
    connection = Connection(
        id=connection_id,
        exchange=body.exchange,
        nickname=body.nickname,
        status='connected',
        last_check_at=now.isoformat(),
        next_check_eta_sec=60,
        features=Features(trading=True, wallet=True, paper=False),
    )
    
    connections_store[connection_id] = connection
    return connection

@router.post("/connections/test")
async def test_connection(body: TestBody):
    """Test a connection"""
    # Simulate test results
    success_rate = 0.8  # 80% success rate
    
    if random.random() < success_rate:
        return {
            "ok": True,
            "code": "ok",
            "latency_ms": random.randint(80, 200)
        }
    else:
        error_codes = [
            {"ok": False, "code": "invalid_credentials", "message": "Invalid API credentials"},
            {"ok": False, "code": "scope_missing", "message": "Trading scope required"},
            {"ok": False, "code": "rate_limited", "message": "Rate limit exceeded"},
            {"ok": False, "code": "network_error", "message": "Network connection failed"}
        ]
        return random.choice(error_codes)

@router.post("/connections/{connection_id}/rotate")
async def rotate_keys(connection_id: str, body: RotateBody):
    """Rotate API keys for a connection"""
    if connection_id not in connections_store:
        raise HTTPException(status_code=404, detail="Connection not found")
    
    connection = connections_store[connection_id]
    now = datetime.now()
    
    # Update connection with new key metadata
    connection.last_check_at = now.isoformat()
    connection.next_check_eta_sec = 60
    
    connections_store[connection_id] = connection
    return connection

@router.delete("/connections/{connection_id}")
async def revoke_connection(connection_id: str):
    """Revoke a connection"""
    if connection_id not in connections_store:
        raise HTTPException(status_code=404, detail="Connection not found")
    
    connection = connections_store[connection_id]
    connection.status = 'not_connected'
    connection.last_check_at = None
    connection.next_check_eta_sec = None
    connection.notes = 'Revoked by user'
    
    connections_store[connection_id] = connection
    return {"message": "Connection revoked successfully"}

@router.get("/connections/audit")
async def get_audit_events():
    """Get audit events"""
    now = datetime.now()
    return [
        {
            "id": "1",
            "connection_id": "1",
            "action": "tested",
            "timestamp": (now - timedelta(minutes=2)).isoformat(),
            "details": "Connection test successful"
        },
        {
            "id": "2", 
            "connection_id": "2",
            "action": "rotated",
            "timestamp": (now - timedelta(hours=1)).isoformat(),
            "details": "API keys rotated"
        },
        {
            "id": "3",
            "connection_id": "1", 
            "action": "connected",
            "timestamp": (now - timedelta(days=1)).isoformat(),
            "details": "Initial connection established"
        }
    ]


