from datetime import datetime
from typing import Dict, List, Optional
from pydantic import BaseModel

# Pydantic models for data validation
class EventCreate(BaseModel):
    name: str
    description: Optional[str] = None
    city: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    max_capacity: Optional[int] = 1000
    lat: Optional[float] = None
    lng: Optional[float] = None

class EventUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    city: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    max_capacity: Optional[int] = None
    lat: Optional[float] = None
    lng: Optional[float] = None

class Event(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    city: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    max_capacity: int = 1000
    lat: Optional[float] = None
    lng: Optional[float] = None
    created_at: datetime
    active_users: int = 0

class EventUser(BaseModel):
    id: str
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    event_id: str
    status: str = "active"
    check_in_time: Optional[datetime] = None
    check_out_time: Optional[datetime] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    last_seen: Optional[datetime] = None

class UserLocation(BaseModel):
    user_id: str
    lat: float
    lng: float
    event_id: str
    timestamp: datetime

# POI Models
class POICreate(BaseModel):
    name: str
    type: str
    lat: float
    lng: float
    color: Optional[str] = None
    icon: Optional[str] = None

class POI(BaseModel):
    id: str
    event_id: str
    name: str
    type: str
    lat: float
    lng: float
    color: str
    icon: str
    created_at: datetime

# POI Types
POI_TYPES = {
    "entrance": {"color": "#00ff88", "icon": "🚪"},
    "exit": {"color": "#ff6b6b", "icon": "🚪"},
    "medical": {"color": "#ff0000", "icon": "🏥"},
    "security": {"color": "#ffa500", "icon": "👮"},
    "food": {"color": "#ffff00", "icon": "🍔"},
    "toilet": {"color": "#00d4ff", "icon": "🚽"},
    "info": {"color": "#7b2cbf", "icon": "ℹ️"},
    "parking": {"color": "#888888", "icon": "🅿️"},
    "stage": {"color": "#ff00ff", "icon": "🎤"},
    "first_aid": {"color": "#ff3333", "icon": "⛑️"}
}

# Alert Models
class SOSAlert(BaseModel):
    id: str
    event_id: str
    user_id: str
    user_name: str
    alert_type: str = "sos"
    description: Optional[str] = None
    lat: float
    lng: float
    status: str = "active"
    created_at: datetime
    resolved_at: Optional[datetime] = None

class AlertUpdate(BaseModel):
    status: Optional[str] = None

# User Join Models
class UserJoinRequest(BaseModel):
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None

class UserJoinResponse(BaseModel):
    user_id: str
    user_name: str
    phone: Optional[str]
    email: Optional[str]
    event_id: str
    event_name: str

class UserLoginRequest(BaseModel):
    phone: str
    name: str

class UserLoginResponse(BaseModel):
    user_id: str
    user_name: str
    event_id: str
    event_name: str

# Heatmap Data
class HeatmapPoint(BaseModel):
    lat: float
    lng: float
    intensity: float = 0.5

class HeatmapData(BaseModel):
    points: List[HeatmapPoint]
    total_users: int
    last_updated: datetime
