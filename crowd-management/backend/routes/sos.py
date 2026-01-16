from fastapi import APIRouter, HTTPException
import storage
import uuid
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

router = APIRouter()

# Pydantic models
class SOSRequest(BaseModel):
    event_id: str
    user_id: str
    user_name: str
    lat: float
    lng: float
    description: Optional[str] = None
    alert_type: str = "sos"

class AlertResponse(BaseModel):
    id: str
    event_id: str
    user_id: str
    user_name: str
    lat: float
    lng: float
    description: Optional[str]
    alert_type: str
    status: str
    created_at: datetime
    resolved_at: Optional[datetime]

class AlertResolveRequest(BaseModel):
    status: str = "resolved"
    response: Optional[str] = None

@router.post("/sos/trigger")
async def trigger_sos(data: SOSRequest):
    """Trigger an SOS alert from a user"""
    alert_id = str(uuid.uuid4())[:8]
    
    alert = {
        "id": alert_id,
        "event_id": data.event_id,
        "user_id": data.user_id,
        "user_name": data.user_name,
        "lat": data.lat,
        "lng": data.lng,
        "description": data.description or "",
        "alert_type": data.alert_type,
        "status": "active",
        "created_at": datetime.now(),
        "resolved_at": None,
        "response": None
    }
    
    # Store in event alerts
    if data.event_id not in storage.storage.event_alerts:
        storage.storage.event_alerts[data.event_id] = []
    storage.storage.event_alerts[data.event_id].insert(0, alert)
    
    # Also store in global SOS alerts for dashboard
    storage.storage.sos_alerts.insert(0, alert)
    
    return {
        "status": "ok",
        "alert_id": alert_id,
        "message": "SOS alert triggered successfully"
    }

@router.get("/sos/active")
async def get_active_sos():
    """Get all active SOS alerts across all events"""
    active_sos = []
    for event_id, alerts in storage.storage.event_alerts.items():
        for alert in alerts:
            if alert["status"] == "active":
                active_sos.append(alert)
    
    # Sort by creation time (newest first)
    active_sos.sort(key=lambda x: x["created_at"], reverse=True)
    
    return {"sos_alerts": active_sos}

@router.get("/admin/events/{eventId}/alerts")
def get_event_alerts(eventId: str):
    """Get all alerts for an event"""
    alerts = storage.storage.event_alerts.get(eventId, [])
    
    # Sort by creation time (newest first)
    alerts.sort(key=lambda x: x.get("created_at", datetime.now()), reverse=True)
    
    return alerts

@router.get("/admin/events/{eventId}/alerts/active")
def get_active_alerts(eventId: str):
    """Get only active alerts for an event"""
    alerts = storage.storage.event_alerts.get(eventId, [])
    active_alerts = [a for a in alerts if a["status"] == "active"]
    
    # Sort by creation time (newest first)
    active_alerts.sort(key=lambda x: x.get("created_at", datetime.now()), reverse=True)
    
    return active_alerts

@router.put("/admin/alerts/{alertId}/resolve")
def resolve_alert(alertId: str, data: AlertResolveRequest):
    """Resolve an alert"""
    # Find alert in any event
    found = False
    for event_id, alerts in storage.storage.event_alerts.items():
        for alert in alerts:
            if alert["id"] == alertId:
                alert["status"] = data.status
                alert["resolved_at"] = datetime.now()
                alert["response"] = data.response
                found = True
                break
        if found:
            break
    
    if not found:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    return {
        "status": "ok",
        "message": f"Alert {alertId} marked as {data.status}"
    }

@router.delete("/admin/alerts/{alertId}")
def delete_alert(alertId: str):
    """Delete an alert"""
    found = False
    for event_id, alerts in storage.storage.event_alerts.items():
        for i, alert in enumerate(alerts):
            if alert["id"] == alertId:
                alerts.pop(i)
                found = True
                break
        if found:
            break
    
    if not found:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    return {
        "status": "ok",
        "message": f"Alert {alertId} deleted"
    }

@router.get("/admin/alerts/stats/{eventId}")
def get_alert_stats(eventId: str):
    """Get alert statistics for an event"""
    alerts = storage.storage.event_alerts.get(eventId, [])
    
    total = len(alerts)
    active = len([a for a in alerts if a["status"] == "active"])
    resolved = total - active
    
    # Count by type
    by_type = {}
    for alert in alerts:
        alert_type = alert.get("alert_type", "unknown")
        by_type[alert_type] = by_type.get(alert_type, 0) + 1
    
    return {
        "event_id": eventId,
        "total_alerts": total,
        "active_alerts": active,
        "resolved_alerts": resolved,
        "by_type": by_type
    }

@router.post("/admin/alerts/{alertId}/assign")
def assign_alert(alertId: str, data: dict):
    """Assign an alert to an admin for handling"""
    admin_id = data.get("admin_id")
    admin_name = data.get("admin_name")
    
    found = False
    for event_id, alerts in storage.storage.event_alerts.items():
        for alert in alerts:
            if alert["id"] == alertId:
                alert["assigned_to"] = admin_id
                alert["assigned_name"] = admin_name
                alert["assigned_at"] = datetime.now()
                found = True
                break
        if found:
            break
    
    if not found:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    return {
        "status": "ok",
        "message": f"Alert {alertId} assigned to {admin_name}"
    }
