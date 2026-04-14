"""Google Maps Routes API wrapper for maritime route optimization.

Combines Google Maps Routes API (for land/port segments) with
great-circle calculations (for open sea segments) to generate
complete shipping route alternatives with distance and time estimates.
"""

import math
import httpx
from shared.config import Config
from shared.reasoning_log import log_step


def great_circle_distance_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Calculate great-circle distance between two points in km."""
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlng/2)**2
    return R * 2 * math.asin(math.sqrt(a))


def estimate_sea_transit(distance_km: float, speed_knots: float = 14.0) -> dict:
    """Estimate transit time and fuel cost for a sea segment.
    
    Args:
        distance_km: Distance in kilometers
        speed_knots: Average vessel speed in knots (default: 14 for container ship)
        
    Returns:
        Transit estimate with time, fuel cost, and emissions
    """
    distance_nm = distance_km / 1.852  # Convert to nautical miles
    transit_hours = distance_nm / speed_knots
    
    # Fuel cost estimation (average container ship burns ~150 tons/day of fuel)
    # At ~$600/ton for marine fuel oil
    fuel_cost_per_hour = (150 / 24) * 600  # ~$3,750/hour
    fuel_cost = fuel_cost_per_hour * transit_hours
    
    return {
        "distance_km": round(distance_km, 1),
        "distance_nm": round(distance_nm, 1),
        "transit_hours": round(transit_hours, 1),
        "transit_days": round(transit_hours / 24, 1),
        "estimated_fuel_cost_usd": round(fuel_cost, 0),
        "speed_knots": speed_knots,
    }


def calculate_route_via_waypoints(waypoints: list[dict]) -> dict:
    """Calculate total distance and transit time through a series of waypoints.
    
    Args:
        waypoints: List of dicts with 'lat', 'lng', and optional 'name'
        
    Returns:
        Route summary with total distance, time, cost, and per-segment details
    """
    if len(waypoints) < 2:
        return {"error": "Need at least 2 waypoints"}
    
    segments = []
    total_km = 0
    
    for i in range(len(waypoints) - 1):
        start = waypoints[i]
        end = waypoints[i + 1]
        
        dist = great_circle_distance_km(
            start["lat"], start["lng"],
            end["lat"], end["lng"]
        )
        transit = estimate_sea_transit(dist)
        
        segment = {
            "from": start.get("name", f"Point {i}"),
            "to": end.get("name", f"Point {i+1}"),
            **transit,
        }
        segments.append(segment)
        total_km += dist
    
    total_transit = estimate_sea_transit(total_km)
    
    log_step("Routes", "route_calculated",
             f"Route with {len(waypoints)} waypoints: {total_km:.0f}km, {total_transit['transit_days']}d",
             {"total_km": total_km, "waypoints": len(waypoints)})
    
    return {
        "total_distance_km": round(total_km, 1),
        "total_transit_hours": total_transit["transit_hours"],
        "total_transit_days": total_transit["transit_days"],
        "total_fuel_cost_usd": total_transit["estimated_fuel_cost_usd"],
        "segments": segments,
        "waypoint_count": len(waypoints),
    }


async def get_google_maps_route(origin: str, destination: str) -> dict:
    """Get a route from Google Maps Routes API (for port-to-port land segments).
    
    Args:
        origin: Origin address or "lat,lng"
        destination: Destination address or "lat,lng"
        
    Returns:
        Route with distance, duration, and encoded polyline
    """
    api_key = Config.GOOGLE_MAPS_API_KEY
    if not api_key:
        return {"error": "GOOGLE_MAPS_API_KEY not set", "fallback": "Use great-circle calculation"}
    
    url = "https://routes.googleapis.com/directions/v2:computeRoutes"
    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": api_key,
        "X-Goog-FieldMask": "routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline",
    }
    body = {
        "origin": {"address": origin},
        "destination": {"address": destination},
        "travelMode": "DRIVE",  # For port access roads
    }
    
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(url, json=body, headers=headers)
            resp.raise_for_status()
            data = resp.json()
            
            route = data.get("routes", [{}])[0]
            return {
                "distance_meters": route.get("distanceMeters", 0),
                "duration": route.get("duration", "0s"),
                "polyline": route.get("polyline", {}).get("encodedPolyline", ""),
                "source": "google_maps_routes_api",
            }
    except Exception as e:
        return {"error": str(e)}


# ── Pre-built alternative routes for demo ──

ALTERNATIVE_ROUTES = {
    "lombok_bypass": {
        "name": "Lombok Strait Bypass",
        "waypoints": [
            {"name": "Shanghai", "lat": 31.23, "lng": 121.47},
            {"name": "South China Sea", "lat": 15.00, "lng": 115.00},
            {"name": "Lombok Strait", "lat": -8.40, "lng": 115.70},
            {"name": "Indian Ocean", "lat": -5.00, "lng": 90.00},
            {"name": "Colombo", "lat": 6.93, "lng": 79.84},
            {"name": "Suez Canal", "lat": 30.45, "lng": 32.35},
            {"name": "Rotterdam", "lat": 51.90, "lng": 4.50},
        ],
    },
    "sunda_bypass": {
        "name": "Sunda Strait Bypass",
        "waypoints": [
            {"name": "Shanghai", "lat": 31.23, "lng": 121.47},
            {"name": "South China Sea", "lat": 15.00, "lng": 115.00},
            {"name": "Sunda Strait", "lat": -6.10, "lng": 105.80},
            {"name": "Indian Ocean", "lat": -3.00, "lng": 85.00},
            {"name": "Colombo", "lat": 6.93, "lng": 79.84},
            {"name": "Suez Canal", "lat": 30.45, "lng": 32.35},
            {"name": "Rotterdam", "lat": 51.90, "lng": 4.50},
        ],
    },
    "normal_malacca": {
        "name": "Normal Route (via Malacca)",
        "waypoints": [
            {"name": "Shanghai", "lat": 31.23, "lng": 121.47},
            {"name": "South China Sea", "lat": 15.00, "lng": 115.00},
            {"name": "Singapore", "lat": 1.26, "lng": 103.82},
            {"name": "Malacca Strait", "lat": 2.50, "lng": 101.80},
            {"name": "Colombo", "lat": 6.93, "lng": 79.84},
            {"name": "Suez Canal", "lat": 30.45, "lng": 32.35},
            {"name": "Rotterdam", "lat": 51.90, "lng": 4.50},
        ],
    },
}


def compare_route_alternatives() -> dict:
    """Calculate and compare all pre-built alternative routes.
    
    Returns a comparison table with distance, time, and cost deltas
    relative to the normal Malacca route.
    """
    results = {}
    for route_id, route_data in ALTERNATIVE_ROUTES.items():
        calc = calculate_route_via_waypoints(route_data["waypoints"])
        results[route_id] = {
            "name": route_data["name"],
            **calc,
        }
    
    # Calculate deltas relative to normal route
    normal = results.get("normal_malacca", {})
    normal_km = normal.get("total_distance_km", 1)
    normal_hrs = normal.get("total_transit_hours", 1)
    normal_cost = normal.get("total_fuel_cost_usd", 1)
    
    for route_id, data in results.items():
        if route_id != "normal_malacca":
            data["distance_delta_km"] = round(data.get("total_distance_km", 0) - normal_km, 1)
            data["time_delta_hrs"] = round(data.get("total_transit_hours", 0) - normal_hrs, 1)
            data["cost_delta_usd"] = round(data.get("total_fuel_cost_usd", 0) - normal_cost, 0)
    
    return results
