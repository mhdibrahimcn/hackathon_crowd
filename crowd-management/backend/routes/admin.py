from fastapi import APIRouter, HTTPException
import storage
import uuid
from pydantic import BaseModel
from typing import Optional, List
import utils.geo as geo

router = APIRouter()

# Pydantic models for POI
class POIRequest(BaseModel):
    type: str  # exit, food, medical, parking
    lat: float
    lng: float
    name: Optional[str] = None
    description: Optional[str] = None

class POIUpdateRequest(BaseModel):
    type: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None

# POI type configuration
POI_TYPES = {
    "exit": {"color": "red", "icon": "🚪", "label": "Exit Point"},
    "food": {"color": "orange", "icon": "🍔", "label": "Food & Beverages"},
    "medical": {"color": "green", "icon": "🚑", "label": "Medical Station"},
    "parking": {"color": "blue", "icon": "🅿️", "label": "Parking Area"}
}

# Existing endpoints
@router.post("/admin/location")
def set_location(data: dict):
    """Store admin location (lat, lng)"""
    if data.get("lat") is None or data.get("lng") is None:
        raise HTTPException(status_code=400, detail="lat and lng required")
    storage.storage.admin_location = {"lat": data["lat"], "lng": data["lng"]}
    return {"status": "ok", "location": data}

@router.post("/admin/exit")
def add_exit(data: dict):
    """Add a single exit point"""
    if data.get("lat") is None or data.get("lng") is None:
        raise HTTPException(status_code=400, detail="lat and lng required")
    exit_id = str(uuid.uuid4())[:8]
    new_exit = {"id": exit_id, "lat": data["lat"], "lng": data["lng"]}
    storage.storage.exit_points.append(new_exit)
    return {"status": "ok", "exit": new_exit}

@router.post("/admin/exits/bulk")
def set_exits_bulk(data: dict):
    """Set all exit points at once (replaces existing)"""
    storage.storage.exit_points = []
    for exit_data in data.get("exits", []):
        exit_id = str(uuid.uuid4())[:8]
        storage.storage.exit_points.append({
            "id": exit_id,
            "lat": exit_data["lat"],
            "lng": exit_data["lng"]
        })
    return {"status": "ok", "exits": storage.storage.exit_points}

@router.get("/locations")
def get_locations():
    """Get admin location and all exit points"""
    return {"location": storage.storage.admin_location, "exits": storage.storage.exit_points}

# New POI Management Endpoints

@router.get("/admin/events/{eventId}/pois")
def get_event_pois(eventId: str):
    """
    Get all POIs for an event
    
    Returns list of POIs with their types, locations, and details
    """
    if eventId not in storage.storage.event_pois:
        return {"event_id": eventId, "pois": []}
    
    pois = list(storage.storage.event_pois[eventId].values())
    return {
        "event_id": eventId,
        "count": len(pois),
        "pois": pois
    }

@router.post("/admin/events/{eventId}/pois")
def add_event_poi(eventId: str, data: POIRequest):
    """
    Add a new POI to an event
    
    - Type: exit, food, medical, or parking
    - Lat/Lng: Coordinates on the map
    - Name: Optional display name
    - Description: Optional details about the POI
    """
    # Validate POI type
    if data.type not in POI_TYPES:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid POI type. Must be one of: {', '.join(POI_TYPES.keys())}"
        )
    
    # Validate coordinates
    is_valid, error_msg = geo.validate_coordinates(data.lat, data.lng)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error_msg)
    
    # Initialize event POIs if needed
    if eventId not in storage.storage.event_pois:
        storage.storage.event_pois[eventId] = {}
    
    # Create POI
    poi_id = str(uuid.uuid4())[:8]
    poi = {
        "id": poi_id,
        "type": data.type,
        "lat": data.lat,
        "lng": data.lng,
        "name": data.name or f"{POI_TYPES[data.type]['label']} {len(storage.storage.event_pois[eventId]) + 1}",
        "description": data.description or "",
        "created_at": str(datetime.now())
    }
    
    storage.storage.event_pois[eventId][poi_id] = poi
    
    return {
        "status": "ok",
        "poi": poi,
        "type_info": POI_TYPES[data.type]
    }

@router.put("/admin/events/{eventId}/pois/{poiId}")
def update_event_poi(eventId: str, poiId: str, data: POIUpdateRequest):
    """
    Update an existing POI's details
    
    - Can update type, name, and/or description
    - Cannot update coordinates (delete and recreate instead)
    """
    if eventId not in storage.storage.event_pois or poiId not in storage.storage.event_pois[eventId]:
        raise HTTPException(status_code=404, detail="POI not found")
    
    poi = storage.storage.event_pois[eventId][poiId]
    
    # Update fields if provided
    if data.type is not None:
        if data.type not in POI_TYPES:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid POI type. Must be one of: {', '.join(POI_TYPES.keys())}"
            )
        poi["type"] = data.type
    
    if data.name is not None:
        poi["name"] = data.name
    
    if data.description is not None:
        poi["description"] = data.description
    
    poi["updated_at"] = str(datetime.now())
    
    return {
        "status": "ok",
        "poi": poi,
        "type_info": POI_TYPES[poi["type"]]
    }

@router.delete("/admin/events/{eventId}/pois/{poiId}")
def delete_event_poi(eventId: str, poiId: str):
    """
    Delete a POI from an event
    """
    if eventId not in storage.storage.event_pois or poiId not in storage.storage.event_pois[eventId]:
        raise HTTPException(status_code=404, detail="POI not found")
    
    deleted_poi = storage.storage.event_pois[eventId].pop(poiId)
    
    # Clean up empty event
    if not storage.storage.event_pois[eventId]:
        del storage.storage.event_pois[eventId]
    
    return {
        "status": "ok",
        "deleted": deleted_poi
    }

@router.delete("/admin/events/{eventId}/pois")
def delete_all_event_pois(eventId: str):
    """
    Delete all POIs from an event
    """
    if eventId in storage.storage.event_pois:
        count = len(storage.storage.event_pois[eventId])
        del storage.storage.event_pois[eventId]
    else:
        count = 0
    
    return {
        "status": "ok",
        "deleted_count": count
    }

@router.get("/admin/events/{eventId}/pois/types")
def get_poi_types():
    """
    Get available POI types with their configuration
    """
    return {"types": POI_TYPES}

# Location management endpoints (keep existing ones)

@router.post("/admin/location/search")
async def search_locations(request: dict):
    """Search for locations by address or place name"""
    query = request.get("query", "").strip()
    limit = request.get("limit", 5)
    
    if len(query) < 3:
        raise HTTPException(status_code=400, detail="Search query must be at least 3 characters")
    
    results = await geo.search_locations(query, limit)
    
    return {
        "query": query,
        "count": len(results),
        "results": results
    }

@router.post("/admin/location/geocode")
async def geocode_address(request: dict):
    """Convert an address to latitude/longitude coordinates"""
    address = request.get("address", "").strip()
    
    if len(address) < 3:
        raise HTTPException(status_code=400, detail="Address must be at least 3 characters")
    
    result = await geo.geocode_address(address)
    
    if result:
        return {
            "success": True,
            "address": address,
            "location": {
                "lat": result["lat"],
                "lng": result["lng"]
            },
            "display_name": result.get("display_name", ""),
            "address_details": result.get("address", {})
        }
    else:
        raise HTTPException(status_code=404, detail="Could not geocode address")

@router.post("/admin/location/validate")
def validate_location(request: dict):
    """Validate latitude and longitude coordinates"""
    try:
        lat = float(request.get("lat"))
        lng = float(request.get("lng"))
    except (TypeError, ValueError):
        raise HTTPException(status_code=400, detail="Coordinates must be numeric")
    
    is_valid, error_msg = geo.validate_coordinates(lat, lng)
    
    if is_valid:
        return {
            "valid": True,
            "location": {
                "lat": lat,
                "lng": lng
            },
            "formatted": geo.format_coordinates(lat, lng)
        }
    else:
        return {
            "valid": False,
            "error": error_msg
        }

@router.post("/admin/location/distance")
def calculate_distance(request: dict):
    """Calculate the distance between two points"""
    try:
        lat1 = float(request.get("lat1"))
        lng1 = float(request.get("lng1"))
        lat2 = float(request.get("lat2"))
        lng2 = float(request.get("lng2"))
    except (TypeError, ValueError):
        raise HTTPException(status_code=400, detail="All coordinates must be numeric")
    
    distance_meters = geo.hversine(lat1, lng1, lat2, lng2)
    distance_km = distance_meters / 1000
    bearing = geo.calculate_bearing(lat1, lng1, lat2, lng2)
    
    return {
        "point_1": {"lat": lat1, "lng": lng1},
        "point_2": {"lat": lat2, "lng": lng2},
        "distance": {
            "meters": round(distance_meters, 2),
            "kilometers": round(distance_km, 3),
            "formatted": geo.format_distance(distance_meters)
        },
        "bearing": {
            "degrees": round(bearing, 2),
            "direction": get_bearing_direction(bearing)
        }
    }

@router.post("/admin/location/check-bounds")
def check_location_bounds(request: dict):
    """Check if a location is within a specified radius of a center point"""
    try:
        lat = float(request.get("lat"))
        lng = float(request.get("lng"))
        center_lat = float(request.get("center_lat"))
        center_lng = float(request.get("center_lng"))
        radius_meters = float(request.get("radius", 1000))
    except (TypeError, ValueError):
        raise HTTPException(status_code=400, detail="All coordinates and radius must be numeric")
    
    distance = geo.haversine(lat, lng, center_lat, center_lng)
    is_within = distance <= radius_meters
    
    return {
        "location": {"lat": lat, "lng": lng},
        "center": {"lat": center_lat, "lng": center_lng},
        "radius_meters": radius_meters,
        "distance_from_center": {
            "meters": round(distance, 2),
            "formatted": geo.format_distance(distance)
        },
        "is_within_bounds": is_within,
        "remaining_distance": max(0, radius_meters - distance)
    }

def get_bearing_direction(bearing: float) -> str:
    """Convert bearing in degrees to compass direction"""
    directions = [
        "N", "NNE", "NE", "ENE", 
        "E", "ESE", "SE", "SSE",
        "S", "SSW", "SW", "WSW",
        "W", "WNW", "NW", "NNW"
    ]
    index = round(bearing / 22.5) % 16
    return directions[index]

from datetime import datetime
import math
