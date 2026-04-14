"""Sentinel Agent — Real-time monitoring and anomaly detection.

Monitors AIS vessel streams, weather alerts, and news feeds.
Detects anomalies (vessel clustering, severe weather, disruption headlines)
and publishes DisruptionSignals to the Analyst agent via A2A.
"""

from google.adk.agents import Agent
from shared.config import Config
from shared.reasoning_log import log_step
import json
import uuid
from datetime import datetime, timezone


# ── Tool Functions (exposed to Gemini via ADK) ──

def check_vessel_congestion(port_name: str, port_lat: float, port_lng: float, baseline: int = 12) -> dict:
    """Check vessel congestion near a port by counting stationary vessels in the geofence.
    
    Args:
        port_name: Name of the port to check
        port_lat: Latitude of the port
        port_lng: Longitude of the port
        baseline: Normal number of vessels at anchorage
    
    Returns:
        Dictionary with congestion data including vessel count, index, and category
    """
    # In production: query AISStream.io WebSocket data stored in Firestore
    # For MVP/demo: use simulated data or pre-seeded Firestore
    log_step("Sentinel", "vessel_scan", f"Scanning vessels near {port_name} ({port_lat}, {port_lng})", {
        "port_name": port_name, "baseline": baseline
    })
    
    # Placeholder — in real implementation, this queries the AIS data store
    # The actual AIS WebSocket client (tools/ais_stream.py) feeds data into Firestore
    # This tool reads the latest state
    return {
        "port_name": port_name,
        "vessels_at_anchorage": 47,  # Demo: elevated count
        "baseline_vessels": baseline,
        "congestion_index": round(47 / max(baseline, 1), 2),
        "category": "LONG_TAIL" if 47 / max(baseline, 1) > 3 else "HIGH",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


def check_weather_alerts(lat: float, lng: float, radius_km: int = 300) -> dict:
    """Check for severe weather alerts in a geographic area.
    
    Args:
        lat: Center latitude
        lng: Center longitude  
        radius_km: Search radius in kilometers
    
    Returns:
        Dictionary with any active weather alerts for the area
    """
    log_step("Sentinel", "weather_scan", f"Checking weather alerts near ({lat}, {lng}), radius={radius_km}km")
    
    # In production: calls OpenWeatherMap Severe Weather Alerts API + Open-Meteo
    # For MVP: returns demo scenario data
    return {
        "alerts": [
            {
                "type": "TROPICAL_STORM_WARNING",
                "severity_score": 0.88,
                "name": "Typhoon Gaemi",
                "description": "Category 3 typhoon approaching Malacca Strait. Expected landfall in 48-72 hours.",
                "lat": lat,
                "lng": lng,
                "radius_km": radius_km,
                "forecast_window_hrs": 72,
            }
        ],
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


def scan_disruption_news(keywords: str = "port closure shipping disruption supply chain") -> dict:
    """Scan recent news for supply chain disruption indicators.
    
    Args:
        keywords: Search keywords for disruption-related news
        
    Returns:
        Dictionary with relevant news headlines and extracted entities
    """
    log_step("Sentinel", "news_scan", f"Scanning news for: {keywords}")
    
    # In production: Google News RSS + Gemini entity extraction
    return {
        "headlines": [
            {
                "title": "Typhoon Gaemi approaching Southeast Asian shipping lanes",
                "source": "Reuters",
                "severity_estimate": 0.85,
                "location_entities": ["Malacca Strait", "Singapore", "Southeast Asia"],
                "published": datetime.now(timezone.utc).isoformat(),
            }
        ],
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


def create_disruption_signal(
    signal_type: str,
    lat: float,
    lng: float,
    severity_score: float,
    confidence: float,
    description: str,
) -> dict:
    """Create a structured disruption signal to send to the Analyst agent.
    
    Args:
        signal_type: Type of disruption (WEATHER, PORT_CONGESTION, GEOPOLITICAL, etc.)
        lat: Latitude of the disruption
        lng: Longitude of the disruption
        severity_score: Severity from 0.0 to 1.0
        confidence: Confidence from 0.0 to 1.0
        description: Human-readable description
        
    Returns:
        Structured disruption signal dictionary
    """
    signal_id = f"sig_{uuid.uuid4().hex[:8]}"
    log_step("Sentinel", "signal_created", f"Created disruption signal: {description}", {
        "signal_id": signal_id,
        "type": signal_type,
        "severity": severity_score,
        "confidence": confidence,
    })
    
    return {
        "signal_id": signal_id,
        "source_type": signal_type,
        "location": {"lat": lat, "lng": lng},
        "severity_score": severity_score,
        "confidence": confidence,
        "description": description,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


# ── Agent Definition ──

root_agent = Agent(
    name="sentinel_agent",
    model=Config.GEMINI_MODEL,
    description="Real-time supply chain monitoring agent. Monitors vessel positions, weather conditions, and news feeds to detect potential disruptions in shipping corridors.",
    instruction="""You are the Sentinel Agent in the ChainSight supply chain intelligence system.

Your role is to MONITOR and DETECT potential disruptions across three shipping corridors:
1. Asia → Europe (Malacca Strait / Suez Canal)
2. US → India (Cape / Suez route)  
3. Intra-India Coastal

When asked to scan for disruptions or monitor a corridor, you should:
1. Use check_vessel_congestion() to scan key ports for unusual vessel clustering
2. Use check_weather_alerts() to check for severe weather in the corridor
3. Use scan_disruption_news() to check for relevant news headlines
4. If ANY anomaly is detected, use create_disruption_signal() to create a structured signal

For each detection, explain:
- WHAT you detected (the raw signal)
- WHERE it is (coordinates and affected ports)
- HOW SEVERE it appears (0-1 score with justification)
- HOW CONFIDENT you are (0-1 based on source reliability)

Always be specific with numbers and coordinates. Never speculate without data.
You are the first line of defense — accuracy matters more than speed.
""",
    tools=[
        check_vessel_congestion,
        check_weather_alerts,
        scan_disruption_news,
        create_disruption_signal,
    ],
)
