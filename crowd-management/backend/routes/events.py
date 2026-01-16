from fastapi import APIRouter, HTTPException
import storage
import uuid
from datetime import datetime, timedelta
from models import (
    EventCreate, EventUpdate, Event, EventUser, UserLocation,
    POICreate, POI, POI_TYPES,
    SOSAlert, AlertUpdate,
    UserJoinRequest, UserJoinResponse, UserLoginRequest, UserLoginResponse,
    HeatmapData, HeatmapPoint
)

router = APIRouter()

# ============= EVENT CRUD =============

@router.post("/admin/events")
def create_event(data: EventCreate):
    """Create a new event"""
    event_id = str(uuid.uuid4())[:8]
    now = datetime.now()
    new_event = {
        "id": event_id,
        "name": data.name,
        "description": data.description,
        "city": data.city,
        "start_date": data.start_date,
        "end_date": data.end_date,
        "max_capacity": data.max_capacity,
        "lat": data.lat,
        "lng": data.lng,
        "created_at": now,
        "active_users": 0
    }
    storage.storage.events[event_id] = new_event
    storage.storage.event_users[event_id] = {}
    storage.storage.event_locations[event_id] = {}
    storage.storage.event_pois[event_id] = {}
    storage.storage.event_alerts[event_id] = []
    return new_event

@router.get("/admin/events")
def get_events():
    """Get all events"""
    events = list(storage.storage.events.values())
    for event in events:
        event_id = event["id"]
        event["active_users"] = len(storage.storage.event_users.get(event_id, {}))
    return events

@router.get("/admin/events/{event_id}")
def get_event(event_id: str):
    """Get event details"""
    if event_id not in storage.storage.events:
        raise HTTPException(status_code=404, detail="Event not found")
    event = storage.storage.events[event_id]
    event["active_users"] = len(storage.storage.event_users.get(event_id, {}))
    return event

@router.put("/admin/events/{event_id}")
def update_event(event_id: str, data: EventUpdate):
    """Update event"""
    if event_id not in storage.storage.events:
        raise HTTPException(status_code=404, detail="Event not found")
    
    event = storage.storage.events[event_id]
    if data.name is not None:
        event["name"] = data.name
    if data.description is not None:
        event["description"] = data.description
    if data.city is not None:
        event["city"] = data.city
    if data.start_date is not None:
        event["start_date"] = data.start_date
    if data.end_date is not None:
        event["end_date"] = data.end_date
    if data.max_capacity is not None:
        event["max_capacity"] = data.max_capacity
    if data.lat is not None:
        event["lat"] = data.lat
    if data.lng is not None:
        event["lng"] = data.lng
    
    return event

@router.delete("/admin/events/{event_id}")
def delete_event(event_id: str):
    """Delete an event and all its data"""
    if event_id not in storage.storage.events:
        raise HTTPException(status_code=404, detail="Event not found")
    
    del storage.storage.events[event_id]
    if event_id in storage.storage.event_users:
        del storage.storage.event_users[event_id]
    if event_id in storage.storage.event_locations:
        del storage.storage.event_locations[event_id]
    if event_id in storage.storage.event_pois:
        del storage.storage.event_pois[event_id]
    if event_id in storage.storage.event_alerts:
        del storage.storage.event_alerts[event_id]
    
    return {"status": "ok", "message": "Event deleted"}

# ============= POI MANAGEMENT =============

@router.get("/admin/events/{event_id}/poi")
def get_pois(event_id: str):
    """Get all POIs for an event"""
    if event_id not in storage.storage.events:
        raise HTTPException(status_code=404, detail="Event not found")
    
    pois = list(storage.storage.event_pois.get(event_id, {}).values())
    return pois

@router.post("/admin/events/{event_id}/poi")
def create_poi(event_id: str, data: POICreate):
    """Create a new POI"""
    if event_id not in storage.storage.events:
        raise HTTPException(status_code=404, detail="Event not found")
    
    poi_id = str(uuid.uuid4())[:8]
    now = datetime.now()
    
    # Get default color/icon for type
    type_info = POI_TYPES.get(data.type, {"color": "#888888", "icon": "📍"})
    
    new_poi = {
        "id": poi_id,
        "event_id": event_id,
        "name": data.name,
        "type": data.type,
        "lat": data.lat,
        "lng": data.lng,
        "color": data.color or type_info["color"],
        "icon": data.icon or type_info["icon"],
        "created_at": now
    }
    
    if event_id not in storage.storage.event_pois:
        storage.storage.event_pois[event_id] = {}
    storage.storage.event_pois[event_id][poi_id] = new_poi
    
    return new_poi

@router.put("/admin/events/{event_id}/poi/{poi_id}")
def update_poi(event_id: str, poi_id: str, data: POICreate):
    """Update a POI"""
    if event_id not in storage.storage.events:
        raise HTTPException(status_code=404, detail="Event not found")
    if poi_id not in storage.storage.event_pois.get(event_id, {}):
        raise HTTPException(status_code=404, detail="POI not found")
    
    poi = storage.storage.event_pois[event_id][poi_id]
    poi["name"] = data.name
    poi["type"] = data.type
    poi["lat"] = data.lat
    poi["lng"] = data.lng
    
    type_info = POI_TYPES.get(data.type, {"color": "#888888", "icon": "📍"})
    poi["color"] = data.color or type_info["color"]
    poi["icon"] = data.icon or type_info["icon"]
    
    return poi

@router.delete("/admin/events/{event_id}/poi/{poi_id}")
def delete_poi(event_id: str, poi_id: str):
    """Delete a POI"""
    if event_id not in storage.storage.events:
        raise HTTPException(status_code=404, detail="Event not found")
    if poi_id not in storage.storage.event_pois.get(event_id, {}):
        raise HTTPException(status_code=404, detail="POI not found")
    
    del storage.storage.event_pois[event_id][poi_id]
    return {"status": "ok", "message": "POI deleted"}

# ============= PARTICIPANTS MANAGEMENT =============

@router.get("/admin/events/{event_id}/participants")
def get_participants(event_id: str):
    """Get all participants for an event"""
    if event_id not in storage.storage.events:
        raise HTTPException(status_code=404, detail="Event not found")
    
    users = list(storage.storage.event_users.get(event_id, {}).values())
    return users

@router.put("/admin/events/{event_id}/participants/{user_id}/checkin")
def checkin_participant(event_id: str, user_id: str):
    """Check in a participant"""
    if event_id not in storage.storage.events:
        raise HTTPException(status_code=404, detail="Event not found")
    
    user = storage.storage.event_users.get(event_id, {}).get(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user["status"] = "checked_in"
    user["check_in_time"] = datetime.now()
    return user

@router.put("/admin/events/{event_id}/participants/{user_id}/checkout")
def checkout_participant(event_id: str, user_id: str):
    """Check out a participant"""
    if event_id not in storage.storage.events:
        raise HTTPException(status_code=404, detail="Event not found")
    
    user = storage.storage.event_users.get(event_id, {}).get(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user["status"] = "checked_out"
    user["check_out_time"] = datetime.now()
    return user

# ============= ALERTS MANAGEMENT =============

@router.get("/admin/events/{event_id}/alerts")
def get_alerts(event_id: str):
    """Get all alerts for an event"""
    if event_id not in storage.storage.events:
        raise HTTPException(status_code=404, detail="Event not found")
    
    alerts = storage.storage.event_alerts.get(event_id, [])
    return alerts

@router.get("/admin/events/{event_id}/alerts/active")
def get_active_alerts(event_id: str):
    """Get active (unresolved) alerts"""
    if event_id not in storage.storage.events:
        raise HTTPException(status_code=404, detail="Event not found")
    
    alerts = [a for a in storage.storage.event_alerts.get(event_id, []) if a["status"] == "active"]
    return alerts

@router.put("/admin/alerts/{alert_id}/resolve")
def resolve_alert(alert_id: str, data: AlertUpdate = None):
    """Resolve an alert"""
    for event_id, alerts in storage.storage.event_alerts.items():
        for alert in alerts:
            if alert["id"] == alert_id:
                alert["status"] = data.status if data and data.status else "resolved"
                alert["resolved_at"] = datetime.now()
                return alert
    
    raise HTTPException(status_code=404, detail="Alert not found")

@router.delete("/admin/alerts/{alert_id}")
def delete_alert(alert_id: str):
    """Delete an alert"""
    for event_id, alerts in storage.storage.event_alerts.items():
        for i, alert in enumerate(alerts):
            if alert["id"] == alert_id:
                del alerts[i]
                return {"status": "ok", "message": "Alert deleted"}
    
    raise HTTPException(status_code=404, detail="Alert not found")

# ============= USER JOIN =============

@router.post("/users/join", response_model=UserJoinResponse)
def join_event(data: UserJoinRequest):
    """User joins an event (simplified registration)"""
    event_id = data.event_id if hasattr(data, 'event_id') and data.event_id else None
    
    # For backward compatibility, if no event_id provided, return user_id
    user_id = str(uuid.uuid4())[:8]
    
    return UserJoinResponse(
        user_id=user_id,
        user_name=data.name,
        phone=data.phone,
        email=data.email,
        event_id=event_id or "",
        event_name=""
    )

@router.post("/users/login", response_model=UserLoginResponse)
def user_login(data: UserLoginRequest):
    """User login by phone and name"""
    # Simple lookup - in real app would verify credentials
    event_id = ""
    event_name = ""
    
    # Find user by phone and name
    for eid, users in storage.storage.event_users.items():
        for uid, user in users.items():
            if user.get("phone") == data.phone and user.get("name") == data.name:
                event_id = eid
                event_name = storage.storage.events.get(eid, {}).get("name", "")
                break
    
    user_id = str(uuid.uuid4())[:8]
    
    return UserLoginResponse(
        user_id=user_id,
        user_name=data.name,
        event_id=event_id,
        event_name=event_name
    )

@router.post("/events/{event_id}/join", response_model=UserJoinResponse)
def join_event_with_id(event_id: str, data: dict):
    """User joins a specific event"""
    if event_id not in storage.storage.events:
        raise HTTPException(status_code=404, detail="Event not found")
    
    # Support both 'name' and 'user_name' fields
    user_name = data.get("name") or data.get("user_name", "Anonymous")
    
    user_id = str(uuid.uuid4())[:8]
    now = datetime.now()
    
    new_user = {
        "id": user_id,
        "name": user_name,
        "phone": data.get("phone"),
        "email": data.get("email"),
        "event_id": event_id,
        "status": "active",
        "check_in_time": now,
        "check_out_time": None,
        "lat": None,
        "lng": None,
        "last_seen": None
    }
    
    storage.storage.event_users[event_id][user_id] = new_user
    
    return UserJoinResponse(
        user_id=user_id,
        user_name=user_name,
        phone=data.get("phone"),
        email=data.get("email"),
        event_id=event_id,
        event_name=storage.storage.events[event_id]["name"]
    )

@router.post("/events/{event_id}/sos")
def trigger_sos(event_id: str, data: dict):
    """Trigger SOS alert"""
    if event_id not in storage.storage.events:
        raise HTTPException(status_code=404, detail="Event not found")
    
    user_id = data.get("user_id")
    user_name = data.get("user_name", "Unknown")
    lat = data.get("lat")
    lng = data.get("lng")
    
    if not lat or not lng:
        raise HTTPException(status_code=400, detail="Location required")
    
    alert_id = str(uuid.uuid4())[:8]
    now = datetime.now()
    
    sos_alert = {
        "id": alert_id,
        "event_id": event_id,
        "user_id": user_id,
        "user_name": user_name,
        "alert_type": "sos",
        "description": data.get("description", "Emergency SOS alert"),
        "lat": lat,
        "lng": lng,
        "status": "active",
        "created_at": now,
        "resolved_at": None
    }
    
    storage.storage.event_alerts[event_id].append(sos_alert)
    
    return {"status": "ok", "alert_id": alert_id, "message": "SOS alert triggered"}

# ============= LOCATION & HEATMAP =============

@router.post("/events/{event_id}/heartbeat")
def event_heartbeat(event_id: str, data: dict):
    """Store user location for an event"""
    if event_id not in storage.storage.events:
        raise HTTPException(status_code=404, detail="Event not found")
    
    user_id = data.get("user_id")
    if not user_id:
        raise HTTPException(status_code=400, detail="user_id required")
    
    if event_id not in storage.storage.event_locations:
        storage.storage.event_locations[event_id] = {}
    
    now = datetime.now()
    storage.storage.event_locations[event_id][user_id] = {
        "lat": data["lat"],
        "lng": data["lng"],
        "timestamp": now
    }
    
    # Update user's last known location
    if event_id in storage.storage.event_users and user_id in storage.storage.event_users[event_id]:
        storage.storage.event_users[event_id][user_id]["lat"] = data["lat"]
        storage.storage.event_users[event_id][user_id]["lng"] = data["lng"]
        storage.storage.event_users[event_id][user_id]["last_seen"] = now
    
    return {"status": "ok"}

@router.get("/events/{event_id}/locations", response_model=HeatmapData)
def get_event_locations(event_id: str):
    """Get all user locations for an event (for heatmap)"""
    if event_id not in storage.storage.events:
        raise HTTPException(status_code=404, detail="Event not found")
    
    # Cleanup stale locations (older than 30 seconds)
    now = datetime.now()
    cutoff = now - timedelta(seconds=30)
    
    locations = []
    event_locs = storage.storage.event_locations.get(event_id, {})
    
    for user_id, loc_data in event_locs.items():
        if loc_data.get("timestamp", datetime.min) > cutoff:
            locations.append({
                "user_id": user_id,
                "lat": loc_data["lat"],
                "lng": loc_data["lng"],
                "timestamp": loc_data["timestamp"]
            })
    
    # Calculate heatmap points with intensity
    heatmap_points = []
    for loc in locations:
        # Intensity based on proximity to others (simple calculation)
        intensity = 0.5
        for other in locations:
            if other["user_id"] != loc["user_id"]:
                dist = ((loc["lat"] - other["lat"])**2 + (loc["lng"] - other["lng"])**2)**0.5
                if dist < 0.001:  # Within ~100m
                    intensity = min(1.0, intensity + 0.1)
        
        heatmap_points.append(HeatmapPoint(
            lat=loc["lat"],
            lng=loc["lng"],
            intensity=intensity
        ))
    
    return HeatmapData(
        points=heatmap_points,
        total_users=len(locations),
        last_updated=now
    )

@router.get("/events")
def get_events_public():
    """Get all events (public endpoint)"""
    events = []
    for event in storage.storage.events.values():
        events.append({
            "id": event["id"],
            "name": event["name"],
            "city": event.get("city"),
            "date": event.get("start_date") or event.get("date"),
            "active_users": len(storage.storage.event_users.get(event["id"], {}))
        })
    return events

@router.get("/events/{event_id}/users")
def get_event_users(event_id: str):
    """Get all users in an event"""
    if event_id not in storage.storage.events:
        raise HTTPException(status_code=404, detail="Event not found")
    
    users = list(storage.storage.event_users.get(event_id, {}).values())
    return users
