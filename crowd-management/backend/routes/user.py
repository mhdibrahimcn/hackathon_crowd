from fastapi import APIRouter
import storage
from utils.geo import haversine
from utils.cleanup import cleanup_stale_users
from datetime import datetime
import uuid

router = APIRouter()

@router.post("/user/heartbeat")
def heartbeat(data: dict):
    """Store user location for heatmap"""
    user_id = data.get("user_id", str(uuid.uuid4()))
    storage.storage.active_users[user_id] = {
        "lat": data["lat"],
        "lng": data["lng"],
        "timestamp": datetime.now()
    }
    cleanup_stale_users()
    return {"status": "ok", "user_id": user_id}

@router.get("/debug/exit-points")
def debug_exit_points():
    """Debug endpoint to check exit points"""
    return {
        "admin_exit_points": storage.storage.exit_points,
        "length": len(storage.storage.exit_points)
    }

@router.post("/test/add-exit")
def test_add_exit(data: dict):
    """Test endpoint to add exit through user.py"""
    exit_id = str(uuid.uuid4())[:8]
    new_exit = {"id": exit_id, "lat": data["lat"], "lng": data["lng"]}
    storage.storage.exit_points.append(new_exit)
    return {"status": "ok", "exit": new_exit, "all_exits": storage.storage.exit_points}

@router.post("/nearest-exit")
def nearest_exit(data: dict):
    """Find nearest exit from user location"""
    if len(storage.storage.exit_points) == 0:
        return {"nearest_exit": None, "distance": None}
    
    user_lat = data["lat"]
    user_lng = data["lng"]
    
    nearest = None
    min_dist = float('inf')
    
    for exit_point in storage.storage.exit_points:
        dist = haversine(user_lat, user_lng, exit_point["lat"], exit_point["lng"])
        if dist < min_dist:
            min_dist = dist
            nearest = exit_point
    
    return {
        "nearest_exit": nearest,
        "distance": round(min_dist, 2)
    }
