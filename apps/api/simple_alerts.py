#!/usr/bin/env python3
"""
Simple alert system that works without complex dependencies
"""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import json
import os
from datetime import datetime

# Simple in-memory storage for alerts
alerts_storage = []

class SimpleAlert(BaseModel):
    id: str
    symbol: str
    condition: str
    value: float
    timeframe: str
    status: str = "active"
    created_at: str
    message: str

class AlertCreate(BaseModel):
    symbol: str
    condition: str
    value: float
    timeframe: str

# Create a simple FastAPI app for alerts
app = FastAPI(title="Simple Alerts API")

@app.get("/health")
async def health():
    return {"status": "ok", "message": "Simple alerts API is running"}

@app.post("/alerts", response_model=SimpleAlert)
async def create_alert(alert_data: AlertCreate):
    """Create a simple alert"""
    try:
        # Generate alert ID
        alert_id = f"alert_{len(alerts_storage) + 1}_{int(datetime.now().timestamp())}"
        
        # Create alert message
        condition_text = {
            "price_above": f"Price goes above ${alert_data.value}",
            "price_below": f"Price goes below ${alert_data.value}",
            "price_increases": f"Price increases by {alert_data.value}%",
            "price_decreases": f"Price decreases by {alert_data.value}%"
        }
        
        message = f"Alert for {alert_data.symbol}: {condition_text.get(alert_data.condition, 'Unknown condition')} on {alert_data.timeframe} timeframe"
        
        # Create alert object
        alert = SimpleAlert(
            id=alert_id,
            symbol=alert_data.symbol,
            condition=alert_data.condition,
            value=alert_data.value,
            timeframe=alert_data.timeframe,
            status="active",
            created_at=datetime.now().isoformat(),
            message=message
        )
        
        # Store alert
        alerts_storage.append(alert.dict())
        
        print(f"✅ Alert created: {alert.message}")
        return alert
        
    except Exception as e:
        print(f"❌ Error creating alert: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create alert: {str(e)}")

@app.get("/alerts", response_model=List[SimpleAlert])
async def list_alerts():
    """List all alerts"""
    return [SimpleAlert(**alert) for alert in alerts_storage]

@app.delete("/alerts/{alert_id}")
async def delete_alert(alert_id: str):
    """Delete an alert"""
    global alerts_storage
    alerts_storage = [alert for alert in alerts_storage if alert["id"] != alert_id]
    return {"message": "Alert deleted successfully"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)

