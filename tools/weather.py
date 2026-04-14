"""Weather monitoring tool — Open-Meteo forecasts + OpenWeatherMap severe alerts.

Provides two data streams:
1. Open-Meteo: High-resolution weather forecasts (free, no API key)
2. OpenWeatherMap: Government-issued severe weather alerts (free tier)
"""

import httpx
from datetime import datetime, timezone
from shared.config import Config
from shared.reasoning_log import log_step


async def get_weather_forecast(lat: float, lng: float) -> dict:
    """Get 7-day weather forecast from Open-Meteo (free, no API key needed).
    
    Returns hourly wind speed, precipitation, and wave height data
    relevant to maritime operations.
    """
    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": lat,
        "longitude": lng,
        "hourly": "wind_speed_10m,precipitation,weather_code",
        "forecast_days": 7,
        "timezone": "UTC",
    }
    
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(url, params=params)
            resp.raise_for_status()
            data = resp.json()
            
            hourly = data.get("hourly", {})
            wind_speeds = hourly.get("wind_speed_10m", [])
            precip = hourly.get("precipitation", [])
            
            max_wind = max(wind_speeds) if wind_speeds else 0
            max_precip = max(precip) if precip else 0
            
            # Maritime risk assessment based on wind speed
            if max_wind > 90:
                risk = "EXTREME"
            elif max_wind > 60:
                risk = "HIGH"
            elif max_wind > 40:
                risk = "MODERATE"
            else:
                risk = "LOW"
            
            log_step("Weather", "forecast_retrieved",
                     f"7-day forecast at ({lat},{lng}): max_wind={max_wind}km/h, risk={risk}")
            
            return {
                "location": {"lat": lat, "lng": lng},
                "max_wind_speed_kmh": max_wind,
                "max_precipitation_mm": max_precip,
                "maritime_risk": risk,
                "forecast_hours": len(wind_speeds),
                "source": "open-meteo",
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }
    except Exception as e:
        return {"error": str(e), "source": "open-meteo"}


async def get_severe_weather_alerts(lat: float, lng: float) -> dict:
    """Get severe weather alerts from OpenWeatherMap (free tier).
    
    Returns government-issued alerts (cyclones, typhoons, storms, etc.)
    for the specified location.
    """
    api_key = Config.OPENWEATHER_API_KEY
    if not api_key:
        # Return demo data if no API key
        return _demo_severe_alerts(lat, lng)
    
    url = "https://api.openweathermap.org/data/3.0/onecall"
    params = {
        "lat": lat,
        "lon": lng,
        "exclude": "minutely,hourly,daily",
        "appid": api_key,
    }
    
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(url, params=params)
            resp.raise_for_status()
            data = resp.json()
            
            alerts = data.get("alerts", [])
            
            parsed_alerts = []
            for alert in alerts:
                severity_score = _estimate_severity(alert.get("event", ""))
                parsed_alerts.append({
                    "event": alert.get("event", "Unknown"),
                    "sender": alert.get("sender_name", ""),
                    "description": alert.get("description", "")[:200],
                    "severity_score": severity_score,
                    "start": alert.get("start"),
                    "end": alert.get("end"),
                })
            
            log_step("Weather", "alerts_retrieved",
                     f"Found {len(parsed_alerts)} severe weather alerts at ({lat},{lng})")
            
            return {
                "location": {"lat": lat, "lng": lng},
                "alerts": parsed_alerts,
                "alert_count": len(parsed_alerts),
                "source": "openweathermap",
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }
    except Exception:
        return _demo_severe_alerts(lat, lng)


def _estimate_severity(event_name: str) -> float:
    """Estimate severity score from alert event name."""
    event_lower = event_name.lower()
    if any(w in event_lower for w in ["typhoon", "hurricane", "cyclone"]):
        return 0.9
    elif any(w in event_lower for w in ["tropical storm", "severe storm"]):
        return 0.75
    elif any(w in event_lower for w in ["gale", "storm warning"]):
        return 0.6
    elif any(w in event_lower for w in ["wind advisory", "flood"]):
        return 0.4
    return 0.3


def _demo_severe_alerts(lat: float, lng: float) -> dict:
    """Return demo severe weather alert for the typhoon scenario."""
    # Check if the location is near the Malacca Strait demo area
    if 0 < lat < 5 and 100 < lng < 110:
        return {
            "location": {"lat": lat, "lng": lng},
            "alerts": [{
                "event": "Tropical Storm Warning — Typhoon Gaemi",
                "sender": "Philippine Atmospheric, Geophysical and Astronomical Services",
                "description": "Category 3 typhoon with sustained winds of 185 km/h approaching Malacca Strait. Expected to impact shipping lanes within 48-72 hours.",
                "severity_score": 0.88,
                "start": datetime.now(timezone.utc).isoformat(),
                "end": None,
            }],
            "alert_count": 1,
            "source": "demo_mode",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
    return {
        "location": {"lat": lat, "lng": lng},
        "alerts": [],
        "alert_count": 0,
        "source": "demo_mode",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
