from fastapi import APIRouter, Depends, HTTPException
from typing import List
from apps.api.deps.auth import AuthedUser, get_current_user
from apps.api.schemas.alerts import AlertCreate, AlertRow, AlertUpdate, AlertLogRow
from apps.api.services import alerts_service as svc
from apps.api.middleware.rate_limiting import get_alert_quota_info

router = APIRouter(prefix="/alerts", tags=["alerts"])

@router.post("", response_model=AlertRow)
def create_alert(body: AlertCreate, user: AuthedUser = Depends(get_current_user)):
    try:
        return svc.create_alert(user.user_id, body)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

@router.get("", response_model=List[AlertRow])
def list_alerts(user: AuthedUser = Depends(get_current_user)):
    return svc.list_alerts(user.user_id)

@router.get("/{alert_id}", response_model=AlertRow)
def get_alert(alert_id: str, user: AuthedUser = Depends(get_current_user)):
    row = svc.get_alert(user.user_id, alert_id)
    if not row:
        raise HTTPException(404, "Alert not found")
    return row

@router.patch("/{alert_id}", response_model=AlertRow)
def update_alert(alert_id: str, body: AlertUpdate, user: AuthedUser = Depends(get_current_user)):
    row = svc.update_alert(user.user_id, alert_id, body)
    if not row:
        raise HTTPException(404, "Alert not found")
    return row

@router.delete("/{alert_id}")
def delete_alert(alert_id: str, user: AuthedUser = Depends(get_current_user)):
    ok = svc.delete_alert(user.user_id, alert_id)
    if not ok:
        raise HTTPException(404, "Alert not found")
    return {"ok": True}

@router.get("/{alert_id}/logs", response_model=List[AlertLogRow])
def get_logs(alert_id: str, user: AuthedUser = Depends(get_current_user), limit: int = 50, offset: int = 0):
    # 404 if the alert doesn't belong to user
    if not svc.get_alert(user.user_id, alert_id):
        raise HTTPException(404, "Alert not found")
    return svc.list_logs(user.user_id, alert_id, limit, offset)

@router.get("/quota")
def get_quota(user: AuthedUser = Depends(get_current_user)):
    """Get user's alert quota information."""
    return get_alert_quota_info(user.user_id)

@router.post("/{alert_id}/simulate")
def simulate_alert(alert_id: str, user: AuthedUser = Depends(get_current_user)):
    """Simulate alert evaluation without side effects."""
    alert = svc.get_alert(user.user_id, alert_id)
    if not alert:
        raise HTTPException(404, "Alert not found")
    return svc.simulate_alert(alert.model_dump())
