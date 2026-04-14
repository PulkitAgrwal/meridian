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
import random
from pathlib import Path
from datetime import datetime, timezone
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
        struct_log("ais_client", "WARN", "AISSTREAM_API_KEY not set. Using synthetic scenario mode.")
        await _run_synthetic_scenario()
        return

    url = "wss://stream.aisstream.io/v0/stream"

    # Build bounding boxes from all corridors
    all_bounds = []
    for corridor_bounds in CORRIDOR_BOUNDS.values():
        all_bounds.extend(corridor_bounds)

    subscription = {
        "APIKey": api_key,  # Capital K per AISStream docs
        "BoundingBoxes": all_bounds,
        "FilterMessageTypes": ["PositionReport"],
    }

    LIVE_TIMEOUT = 30  # seconds to wait for first message before falling back
    MAX_RETRIES = 3    # retry live connection this many times before demo fallback
    retries = 0
    retry_delay = 1

    while retries < MAX_RETRIES:
        try:
            async with websockets.connect(url, open_timeout=10) as ws:
                log_step("AIS_Client", "connected", f"Connected to AISStream.io, monitoring {len(all_bounds)} zones")
                retry_delay = 1

                await ws.send(json.dumps(subscription))

                # Wait for the first message with a timeout
                got_first = False
                try:
                    first_raw = await asyncio.wait_for(ws.recv(), timeout=LIVE_TIMEOUT)
                    data = json.loads(first_raw)
                    _process_ais_message(data)
                    got_first = True
                    log_step("AIS_Client", "live_data", f"Receiving live AIS data (first message received)")
                except asyncio.TimeoutError:
                    log_step("AIS_Client", "timeout", f"No data in {LIVE_TIMEOUT}s — AISStream may be down (attempt {retries + 1}/{MAX_RETRIES})")
                    retries += 1
                    continue

                if got_first:
                    retries = 0  # Reset on success
                    async for message in ws:
                        try:
                            data = json.loads(message)
                            _process_ais_message(data)
                        except json.JSONDecodeError:
                            continue

        except Exception as e:
            log_step("AIS_Client", "disconnected", f"Connection lost: {e}. Retrying in {retry_delay}s")
            await asyncio.sleep(retry_delay)
            retry_delay = min(retry_delay * 2, 30)
            retries += 1

    # Exhausted retries — fall back to synthetic scenario
    log_step("AIS_Client", "fallback", f"Live AIS unavailable after {MAX_RETRIES} attempts. Falling back to synthetic scenario mode.")
    struct_log("ais_client", "WARN", "AISStream.io not delivering data — using synthetic scenario mode")
    await _run_synthetic_scenario()


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


def _load_vessel_names() -> list[dict]:
    """Load realistic vessel names from data/vessel_names.json."""
    vessel_file = Path(__file__).parent.parent / "data" / "vessel_names.json"
    try:
        with open(vessel_file) as f:
            return json.load(f)
    except FileNotFoundError:
        struct_log("ais_client", "WARN", f"vessel_names.json not found at {vessel_file}, using fallback names")
        return [{"name": f"VESSEL {i:03d}", "type": "container", "flag": "PA"} for i in range(50)]


def _bearing_between(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Calculate initial bearing (degrees) from point 1 to point 2."""
    lat1_r, lat2_r = math.radians(lat1), math.radians(lat2)
    dlng_r = math.radians(lng2 - lng1)
    x = math.sin(dlng_r) * math.cos(lat2_r)
    y = math.cos(lat1_r) * math.sin(lat2_r) - math.sin(lat1_r) * math.cos(lat2_r) * math.cos(dlng_r)
    return (math.degrees(math.atan2(x, y)) + 360) % 360


def _advance_position(lat: float, lng: float, bearing_deg: float, speed_knots: float, seconds: float = 10) -> tuple[float, float]:
    """Advance a vessel position along a bearing at given speed.

    Args:
        lat: Current latitude
        lng: Current longitude
        bearing_deg: Course heading in degrees
        speed_knots: Speed in knots (nautical miles per hour)
        seconds: Time interval in seconds

    Returns:
        Tuple of (new_lat, new_lng)
    """
    # Distance in km: speed(knots) * 1.852 (km/nm) * seconds/3600
    dist_km = speed_knots * 1.852 * (seconds / 3600)
    R = 6371  # Earth radius km

    lat_r = math.radians(lat)
    lng_r = math.radians(lng)
    brng_r = math.radians(bearing_deg)
    d_over_R = dist_km / R

    new_lat_r = math.asin(
        math.sin(lat_r) * math.cos(d_over_R)
        + math.cos(lat_r) * math.sin(d_over_R) * math.cos(brng_r)
    )
    new_lng_r = lng_r + math.atan2(
        math.sin(brng_r) * math.sin(d_over_R) * math.cos(lat_r),
        math.cos(d_over_R) - math.sin(lat_r) * math.sin(new_lat_r),
    )

    return round(math.degrees(new_lat_r), 6), round(math.degrees(new_lng_r), 6)


# ── Transit corridors for moving vessels ──
# Each corridor is a list of waypoints (lat, lng) that vessels traverse
_TRANSIT_CORRIDORS = [
    # Shanghai → Singapore via Hong Kong
    {"id": "sha-sin", "corridor": "asia-europe", "waypoints": [
        (31.23, 121.47), (22.29, 114.15), (10.0, 109.0), (1.26, 103.82),
    ]},
    # Singapore → Colombo
    {"id": "sin-cmb", "corridor": "asia-europe", "waypoints": [
        (1.26, 103.82), (3.5, 97.0), (5.5, 85.0), (6.93, 79.84),
    ]},
    # Colombo → Jebel Ali
    {"id": "cmb-jea", "corridor": "asia-europe", "waypoints": [
        (6.93, 79.84), (10.0, 72.0), (18.0, 62.0), (25.01, 55.06),
    ]},
    # JNPT → Chennai (intra-India coastal)
    {"id": "jnp-che", "corridor": "intra-india", "waypoints": [
        (18.95, 72.95), (15.0, 74.5), (13.10, 80.29),
    ]},
    # Ningbo → Hong Kong
    {"id": "ngb-hkg", "corridor": "asia-europe", "waypoints": [
        (29.87, 121.55), (25.0, 118.0), (22.29, 114.15),
    ]},
]


async def _run_synthetic_scenario():
    """Generate synthetic maritime intelligence for scenario simulation.

    Produces realistic vessel positions and movement patterns using real
    vessel names, accurate course headings, and physically plausible speeds.
    Singapore anchorage is elevated (47 vessels) to model the typhoon
    congestion scenario. Transit vessels advance along corridor waypoints
    every update tick.
    """
    log_step("AIS_Client", "synthetic_scenario", "Running in synthetic scenario mode with realistic vessel data")

    vessel_names = _load_vessel_names()
    random.shuffle(vessel_names)
    name_idx = 0  # Pointer into vessel_names for assigning names

    def _next_vessel() -> dict:
        """Return the next vessel identity, cycling through the list."""
        nonlocal name_idx
        v = vessel_names[name_idx % len(vessel_names)]
        name_idx += 1
        return v

    # ── Port definitions with scenario vessel counts ──
    scenario_ports = {
        "SGSIN": {"lat": 1.26, "lng": 103.82, "count": 47},   # Elevated — typhoon congestion
        "LKCMB": {"lat": 6.93, "lng": 79.84, "count": 6},
        "INJNP": {"lat": 18.95, "lng": 72.95, "count": 7},
        "INCHE": {"lat": 13.10, "lng": 80.29, "count": 5},
        "CNSHA": {"lat": 31.23, "lng": 121.47, "count": 20},
    }

    # ── Internal state for persistent vessel tracking ──
    # Each entry: { "mmsi": str, "vessel_name": str, "vessel_type": str,
    #   "flag": str, "lat": float, "lng": float, "speed_knots": float,
    #   "heading": float, "role": "anchorage"|"transit",
    #   "corridor_route": list | None, "waypoint_idx": int | None }
    _synth_vessels: list[dict] = []

    # --- 1. Anchorage vessels (stationary or near-stationary at ports) ---
    for port_id, port in scenario_ports.items():
        for i in range(port["count"]):
            v = _next_vessel()
            # Scatter within ~10-15 km of port center (realistic anchorage spread)
            lat_offset = random.uniform(-0.10, 0.10)
            lng_offset = random.uniform(-0.10, 0.10)
            # Singapore anchorage: almost all stationary (typhoon hold)
            if port_id == "SGSIN":
                speed = round(random.uniform(0.0, 0.3), 1)
            else:
                # Normal anchorage: some waiting, some manoeuvring
                speed = round(random.uniform(0.0, 2.0), 1)

            _synth_vessels.append({
                "mmsi": f"synth_{port_id}_{i:03d}",
                "vessel_name": v["name"],
                "vessel_type": v["type"],
                "flag": v["flag"],
                "lat": round(port["lat"] + lat_offset, 6),
                "lng": round(port["lng"] + lng_offset, 6),
                "speed_knots": speed,
                "heading": round(random.uniform(0, 360), 1),
                "role": "anchorage",
                "port_id": port_id,
                "corridor_route": None,
                "waypoint_idx": None,
            })

    # --- 2. Transit vessels (moving along corridor waypoints) ---
    for route in _TRANSIT_CORRIDORS:
        num_transit = random.randint(2, 4)
        wps = route["waypoints"]
        for _ in range(num_transit):
            v = _next_vessel()
            # Place vessel at a random interpolation point along the route
            seg_idx = random.randint(0, len(wps) - 2)
            t = random.uniform(0, 1)  # interpolation factor
            wp_a, wp_b = wps[seg_idx], wps[seg_idx + 1]
            lat = round(wp_a[0] + t * (wp_b[0] - wp_a[0]), 6)
            lng = round(wp_a[1] + t * (wp_b[1] - wp_a[1]), 6)
            bearing = _bearing_between(lat, lng, wp_b[0], wp_b[1])
            speed = round(random.uniform(10.0, 14.0), 1)

            _synth_vessels.append({
                "mmsi": f"synth_transit_{route['id']}_{_:03d}",
                "vessel_name": v["name"],
                "vessel_type": v["type"],
                "flag": v["flag"],
                "lat": lat,
                "lng": lng,
                "speed_knots": speed,
                "heading": round(bearing, 1),
                "role": "transit",
                "port_id": None,
                "corridor_route": wps,
                "waypoint_idx": seg_idx + 1,  # next waypoint to aim for
            })

    log_step(
        "AIS_Client", "synthetic_init",
        f"Initialized {len(_synth_vessels)} synthetic vessels "
        f"({sum(1 for v in _synth_vessels if v['role'] == 'anchorage')} anchorage, "
        f"{sum(1 for v in _synth_vessels if v['role'] == 'transit')} transit)",
    )

    # ── Main simulation loop ──
    while True:
        for sv in _synth_vessels:
            if sv["role"] == "anchorage":
                # Slight random drift for anchored/waiting vessels
                sv["lat"] = round(sv["lat"] + random.uniform(-0.001, 0.001), 6)
                sv["lng"] = round(sv["lng"] + random.uniform(-0.001, 0.001), 6)
                # Tiny speed variation
                sv["speed_knots"] = round(max(0, sv["speed_knots"] + random.uniform(-0.1, 0.1)), 1)
                sv["heading"] = round((sv["heading"] + random.uniform(-5, 5)) % 360, 1)

            elif sv["role"] == "transit":
                wps = sv["corridor_route"]
                wp_idx = sv["waypoint_idx"]

                if wp_idx is not None and wp_idx < len(wps):
                    target = wps[wp_idx]
                    dist_to_wp = _haversine_km(sv["lat"], sv["lng"], target[0], target[1])

                    # If within 5 km of waypoint, advance to next
                    if dist_to_wp < 5.0:
                        sv["waypoint_idx"] = wp_idx + 1
                        if sv["waypoint_idx"] >= len(wps):
                            # Reached end of route — loop back to start
                            sv["waypoint_idx"] = 1
                            sv["lat"] = round(wps[0][0] + random.uniform(-0.05, 0.05), 6)
                            sv["lng"] = round(wps[0][1] + random.uniform(-0.05, 0.05), 6)
                        target = wps[sv["waypoint_idx"]]

                    bearing = _bearing_between(sv["lat"], sv["lng"], target[0], target[1])
                    sv["heading"] = round(bearing, 1)

                # Speed variation: ±0.5 knots, clamped to [8, 16]
                sv["speed_knots"] = round(
                    max(8.0, min(16.0, sv["speed_knots"] + random.uniform(-0.5, 0.5))), 1
                )

                # Advance position
                new_lat, new_lng = _advance_position(
                    sv["lat"], sv["lng"], sv["heading"], sv["speed_knots"], seconds=10
                )
                sv["lat"] = new_lat
                sv["lng"] = new_lng

            # ── Write to vessel store (public format) ──
            _vessel_store[sv["mmsi"]] = {
                "mmsi": sv["mmsi"],
                "vessel_name": sv["vessel_name"],
                "vessel_type": sv["vessel_type"],
                "lat": sv["lat"],
                "lng": sv["lng"],
                "speed_knots": sv["speed_knots"],
                "heading": sv["heading"],
                "is_stationary": sv["speed_knots"] < 0.5,
                "corridor_id": _identify_corridor(sv["lat"], sv["lng"]),
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
