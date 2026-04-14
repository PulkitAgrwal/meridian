"""AISStream.io WebSocket client for real-time vessel tracking.

Connects to AISStream.io's free WebSocket API, subscribes to position
reports filtered by shipping corridor bounding boxes, and maintains
a live vessel state store. The Sentinel agent reads from this store.

Usage:
    # Start as a background task
    asyncio.create_task(start_ais_stream())
    
    # Query current state
    vessels = get_vessels_near_port("SGSIN", radius_km=50)
"""

import asyncio
import json
import math
from datetime import datetime, timedelta, timezone
from typing import Optional
from shared.config import Config
from shared.reasoning_log import log_step
from shared.logger import log as struct_log

# ── In-memory vessel state store ──
# In production, this would be Firestore with real-time listeners
_vessel_store: dict[str, dict] = {}
_last_update: Optional[datetime] = None


# Bounding boxes for monitored corridors
CORRIDOR_BOUNDS = {
    "asia-europe": [
        [[-10, 95], [15, 120]],   # Malacca Strait + Singapore
        [[-2, 75], [12, 85]],     # Sri Lanka / Colombo
        [[25, 30], [32, 35]],     # Suez Canal
    ],
    "intra-india": [
        [[5, 68], [25, 90]],      # Indian coast
    ],
}


def _haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Calculate distance between two coordinates in km."""
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlng/2)**2
    return R * 2 * math.asin(math.sqrt(a))


async def start_ais_stream():
    """Connect to AISStream.io and start receiving vessel positions.
    
    This runs as a long-lived async task. It automatically reconnects
    on disconnection with exponential backoff.
    """
    try:
        import websockets
    except ImportError:
        struct_log("ais_client", "WARN", "websockets not installed. Install with: pip install websockets")
        return

    api_key = Config.AISSTREAM_API_KEY
    if not api_key:
        struct_log("ais_client", "WARN", "AISSTREAM_API_KEY not set. Using demo mode with synthetic data.")
        await _run_demo_mode()
        return

    url = "wss://stream.aisstream.io/v0/stream"
    
    # Build bounding boxes from all corridors
    all_bounds = []
    for corridor_bounds in CORRIDOR_BOUNDS.values():
        all_bounds.extend(corridor_bounds)

    subscription = {
        "Apikey": api_key,
        "BoundingBoxes": all_bounds,
        "FilterMessageTypes": ["PositionReport"],
    }

    retry_delay = 1
    while True:
        try:
            async with websockets.connect(url) as ws:
                log_step("AIS_Client", "connected", f"Connected to AISStream.io, monitoring {len(all_bounds)} zones")
                retry_delay = 1  # Reset on successful connection
                
                await ws.send(json.dumps(subscription))
                
                async for message in ws:
                    try:
                        data = json.loads(message)
                        _process_ais_message(data)
                    except json.JSONDecodeError:
                        continue
                        
        except Exception as e:
            log_step("AIS_Client", "disconnected", f"Connection lost: {e}. Retrying in {retry_delay}s")
            await asyncio.sleep(retry_delay)
            retry_delay = min(retry_delay * 2, 60)


def _process_ais_message(data: dict):
    """Process a single AIS message and update the vessel store."""
    global _last_update
    
    msg = data.get("Message", {}).get("PositionReport", {})
    meta = data.get("MetaData", {})
    
    if not msg:
        return
    
    mmsi = str(meta.get("MMSI", ""))
    if not mmsi:
        return
    
    lat = msg.get("Latitude", 0)
    lng = msg.get("Longitude", 0)
    speed = msg.get("Sog", 0)  # Speed over ground in knots
    heading = msg.get("TrueHeading", 0)
    
    vessel = {
        "mmsi": mmsi,
        "vessel_name": meta.get("ShipName", "").strip(),
        "lat": lat,
        "lng": lng,
        "speed_knots": speed,
        "heading": heading,
        "is_stationary": speed < 0.5,
        "corridor_id": _identify_corridor(lat, lng),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    
    _vessel_store[mmsi] = vessel
    _last_update = datetime.now(timezone.utc)


def _identify_corridor(lat: float, lng: float) -> str:
    """Identify which corridor a vessel position belongs to."""
    for corridor_id, bounds_list in CORRIDOR_BOUNDS.items():
        for bounds in bounds_list:
            min_lat, min_lng = bounds[0]
            max_lat, max_lng = bounds[1]
            if min_lat <= lat <= max_lat and min_lng <= lng <= max_lng:
                return corridor_id
    return "unknown"


async def _run_demo_mode():
    """Generate synthetic vessel data for demo purposes.
    
    Simulates realistic vessel positions near key ports,
    including the elevated congestion at Singapore for the typhoon scenario.
    """
    import random
    
    log_step("AIS_Client", "demo_mode", "Running in demo mode with synthetic vessel data")
    
    # Key ports with their normal and demo vessel counts
    demo_ports = {
        "SGSIN": {"lat": 1.26, "lng": 103.82, "normal": 12, "demo": 47},  # Elevated for typhoon
        "LKCMB": {"lat": 6.93, "lng": 79.84, "normal": 6, "demo": 6},
        "INJNP": {"lat": 18.95, "lng": 72.95, "normal": 7, "demo": 7},
        "INCHE": {"lat": 13.10, "lng": 80.29, "normal": 5, "demo": 5},
        "CNSHA": {"lat": 31.23, "lng": 121.47, "normal": 20, "demo": 20},
    }
    
    while True:
        for port_id, port in demo_ports.items():
            count = port["demo"]
            for i in range(count):
                mmsi = f"demo_{port_id}_{i:03d}"
                # Scatter vessels within ~20km of port
                lat_offset = random.uniform(-0.15, 0.15)
                lng_offset = random.uniform(-0.15, 0.15)
                speed = random.uniform(0, 0.4) if port_id == "SGSIN" else random.uniform(0, 12)
                
                _vessel_store[mmsi] = {
                    "mmsi": mmsi,
                    "vessel_name": f"DEMO VESSEL {port_id}-{i}",
                    "lat": port["lat"] + lat_offset,
                    "lng": port["lng"] + lng_offset,
                    "speed_knots": round(speed, 1),
                    "heading": random.randint(0, 359),
                    "is_stationary": speed < 0.5,
                    "corridor_id": _identify_corridor(port["lat"], port["lng"]),
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                }
        
        global _last_update
        _last_update = datetime.now(timezone.utc)
        await asyncio.sleep(10)  # Update every 10 seconds


# ── Public Query Functions ──

def get_all_vessels() -> list[dict]:
    """Get all tracked vessels."""
    return list(_vessel_store.values())


def get_vessel_count() -> int:
    """Get total number of tracked vessels."""
    return len(_vessel_store)


def get_last_update():
    """Get the timestamp of the most recent AIS update."""
    return _last_update


def get_vessels_near_port(port_lat: float, port_lng: float, radius_km: float = 50) -> list[dict]:
    """Get all vessels within radius of a port."""
    nearby = []
    for vessel in _vessel_store.values():
        dist = _haversine_km(port_lat, port_lng, vessel["lat"], vessel["lng"])
        if dist <= radius_km:
            nearby.append({**vessel, "distance_km": round(dist, 1)})
    return nearby


def get_stationary_vessels_near_port(port_lat: float, port_lng: float, radius_km: float = 30) -> list[dict]:
    """Get stationary vessels (speed < 0.5 knots) near a port — congestion indicator."""
    nearby = get_vessels_near_port(port_lat, port_lng, radius_km)
    return [v for v in nearby if v.get("is_stationary", False)]


def get_congestion_metrics(port_lat: float, port_lng: float, port_name: str, baseline: int = 12) -> dict:
    """Calculate congestion metrics for a port based on live AIS data."""
    stationary = get_stationary_vessels_near_port(port_lat, port_lng)
    count = len(stationary)
    index = round(count / max(baseline, 1), 2)
    
    if index > 3:
        category = "LONG_TAIL"
    elif index > 2:
        category = "HIGH"
    elif index > 1.5:
        category = "MEDIUM"
    else:
        category = "LOW"
    
    return {
        "port_name": port_name,
        "vessels_at_anchorage": count,
        "baseline_vessels": baseline,
        "congestion_index": index,
        "category": category,
        "last_update": _last_update.isoformat() if _last_update else None,
    }
