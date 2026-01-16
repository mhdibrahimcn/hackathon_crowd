import math
import httpx
from typing import Optional, Dict, Any, List, Tuple
from fastapi import HTTPException

# Earth radius in meters and kilometers
EARTH_RADIUS_METERS = 6371000
EARTH_RADIUS_KM = 6371

def haversine(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Calculate distance between two points in meters using Haversine formula"""
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lng2 - lng1)
    
    a = math.sin(delta_phi/2)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    
    return EARTH_RADIUS_METERS * c

def haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Calculate distance between two points in kilometers"""
    return haversine(lat1, lng1, lat2, lng2) / 1000

def calculate_bearing(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Calculate bearing from point 1 to point 2 (in degrees)"""
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_lambda = math.radians(lng2 - lng1)
    
    x = math.sin(delta_lambda) * math.cos(phi2)
    y = math.cos(phi1) * math.sin(phi2) - math.sin(phi1) * math.cos(phi2) * math.cos(delta_lambda)
    
    theta = math.atan2(x, y)
    return (math.degrees(theta) + 360) % 360

def get_destination_point(lat: float, lng: float, distance_meters: float, bearing: float) -> Tuple[float, float]:
    """Calculate destination point from given point with distance and bearing"""
    R = EARTH_RADIUS_METERS
    
    delta = distance_meters / R
    theta = math.radians(bearing)
    
    phi1 = math.radians(lat)
    lambda1 = math.radians(lng)
    
    sin_phi1 = math.sin(phi1)
    cos_phi1 = math.cos(phi1)
    sin_delta = math.sin(delta)
    cos_delta = math.cos(delta)
    sin_theta = math.sin(theta)
    cos_theta = math.cos(theta)
    
    sin_phi2 = sin_phi1 * cos_delta + cos_phi1 * sin_delta * cos_theta
    phi2 = math.asin(sin_phi2)
    
    y = sin_theta * sin_delta * cos_phi1
    x = cos_delta - sin_phi1 * sin_phi2
    lambda2 = lambda1 + math.atan2(y, x)
    
    return (math.degrees(phi2), (math.degrees(lambda2) + 540) % 360 - 180)

def is_within_bounds(lat: float, lng: float, center_lat: float, center_lng: float, radius_meters: float) -> bool:
    """Check if a point is within a circular radius of another point"""
    distance = haversine(lat, lng, center_lat, center_lng)
    return distance <= radius_meters

def format_distance(meters: float) -> str:
    """Format distance in human-readable format"""
    if meters < 1000:
        return f"{int(meters)}m"
    elif meters < 10000:
        return f"{meters/1000:.1f}km"
    else:
        return f"{meters/1000:.0f}km"

def format_coordinates(lat: float, lng: float, precision: int = 6) -> str:
    """Format coordinates as a readable string"""
    lat_dir = "N" if lat >= 0 else "S"
    lng_dir = "E" if lng >= 0 else "W"
    return f"{abs(lat):.{precision}f}°{lat_dir}, {abs(lng):.{precision}f}°{lng_dir}"

async def geocode_address(address: str) -> Optional[Dict[str, float]]:
    """
    Convert an address to coordinates using Nominatim (free geocoding service)
    
    Args:
        address: The address to geocode
        
    Returns:
        Dictionary with lat and lng, or None if not found
    """
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                "https://nominatim.openstreetmap.org/search",
                params={
                    "q": address,
                    "format": "json",
                    "limit": 1,
                    "addressdetails": 1
                },
                headers={"User-Agent": "CrowdManagementApp/1.0"}
            )
            
            if response.status_code == 200:
                data = response.json()
                if data:
                    return {
                        "lat": float(data[0]["lat"]),
                        "lng": float(data[0]["lon"]),
                        "display_name": data[0].get("display_name", ""),
                        "address": data[0].get("address", {})
                    }
            return None
    except Exception as e:
        print(f"Geocoding error: {e}")
        return None

async def reverse_geocode(lat: float, lng: float) -> Optional[Dict[str, Any]]:
    """
    Convert coordinates to an address using Nominatim (reverse geocoding)
    
    Args:
        lat: Latitude
        lng: Longitude
        
    Returns:
        Dictionary with address details, or None if not found
    """
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                "https://nominatim.openstreetmap.org/reverse",
                params={
                    "lat": lat,
                    "lon": lng,
                    "format": "json",
                    "addressdetails": 1
                },
                headers={"User-Agent": "CrowdManagementApp/1.0"}
            )
            
            if response.status_code == 200:
                data = response.json()
                if data:
                    return {
                        "display_name": data.get("display_name", ""),
                        "address": data.get("address", {}),
                        "lat": lat,
                        "lng": lng
                    }
            return None
    except Exception as e:
        print(f"Reverse geocoding error: {e}")
        return None

async def search_locations(query: str, limit: int = 5) -> List[Dict[str, Any]]:
    """
    Search for locations matching a query (like Google Maps autocomplete)
    
    Args:
        query: Search query
        limit: Maximum number of results
        
    Returns:
        List of location matches with coordinates
    """
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                "https://nominatim.openstreetmap.org/search",
                params={
                    "q": query,
                    "format": "json",
                    "limit": min(limit, 10),
                    "addressdetails": 1
                },
                headers={"User-Agent": "CrowdManagementApp/1.0"}
            )
            
            if response.status_code == 200:
                results = []
                for item in response.json():
                    results.append({
                        "id": item.get("osm_id"),
                        "lat": float(item["lat"]),
                        "lng": float(item["lon"]),
                        "display_name": item.get("display_name", ""),
                        "address": item.get("address", {}),
                        "type": item.get("type", ""),
                        "class": item.get("class", "")
                    })
                return results
            return []
    except Exception as e:
        print(f"Location search error: {e}")
        return []

def validate_coordinates(lat: float, lng: float) -> Tuple[bool, str]:
    """
    Validate latitude and longitude values
    
    Args:
        lat: Latitude
        lng: Longitude
        
    Returns:
        Tuple of (is_valid, error_message)
    """
    if lat is None or lng is None:
        return False, "Coordinates cannot be null"
    
    try:
        lat = float(lat)
        lng = float(lng)
    except (TypeError, ValueError):
        return False, "Coordinates must be numeric"
    
    if not -90 <= lat <= 90:
        return False, f"Latitude must be between -90 and 90 (got {lat})"
    
    if not -180 <= lng <= 180:
        return False, f"Longitude must be between -180 and 180 (got {lng})"
    
    return True, ""

def calculate_area_center(points: List[Dict[str, float]]) -> Optional[Dict[str, float]]:
    """
    Calculate the center point of multiple location points
    
    Args:
        points: List of dictionaries with lat and lng
        
    Returns:
        Dictionary with center lat and lng, or None if list is empty
    """
    if not points:
        return None
    
    total_lat = sum(p["lat"] for p in points)
    total_lng = sum(p["lng"] for p in points)
    count = len(points)
    
    return {
        "lat": total_lat / count,
        "lng": total_lng / count
    }

def calculate_bounding_box(lat: float, lng: float, radius_meters: float) -> Dict[str, float]:
    """
    Calculate the bounding box (min/max lat/lng) for a circular area
    
    Args:
        lat: Center latitude
        lng: Center longitude
        radius_meters: Radius in meters
        
    Returns:
        Dictionary with min_lat, max_lat, min_lng, max_lng
    """
    # Approximate degrees per meter at the equator
    lat_delta = radius_meters / 111320
    lng_delta = radius_meters / (111320 * math.cos(math.radians(lat)))
    
    return {
        "min_lat": lat - lat_delta,
        "max_lat": lat + lat_delta,
        "min_lng": lng - lng_delta,
        "max_lng": lng + lng_delta
    }

def is_point_in_polygon(lat: float, lng: float, polygon: List[Dict[str, float]]) -> bool:
    """
    Check if a point is inside a polygon using ray casting algorithm
    
    Args:
        lat: Point latitude
        lng: Point longitude
        polygon: List of points forming the polygon
        
    Returns:
        True if point is inside polygon
    """
    if not polygon or len(polygon) < 3:
        return False
    
    inside = False
    n = len(polygon)
    j = n - 1
    
    for i in range(n):
        pi = polygon[i]
        pj = polygon[j]
        
        if ((pi["lat"] > lat) != (pj["lat"] > lat) and
            (lng < (pj["lng"] - pi["lng"]) * (lat - pi["lat"]) / (pj["lat"] - pi["lat"]) + pi["lng"])):
            inside = not inside
        
        j = i
    
    return inside
