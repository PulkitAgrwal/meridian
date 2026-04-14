"""Environment configuration loader for ChainSight."""

import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    # Google AI
    GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY", "")
    GOOGLE_MAPS_API_KEY = os.getenv("GOOGLE_MAPS_API_KEY", "")
    GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")

    # External APIs
    AISSTREAM_API_KEY = os.getenv("AISSTREAM_API_KEY", "")
    OPENWEATHER_API_KEY = os.getenv("OPENWEATHER_API_KEY", "")

    # Firebase
    FIREBASE_PROJECT_ID = os.getenv("FIREBASE_PROJECT_ID", "")

    # Agent Ports
    SENTINEL_PORT = int(os.getenv("SENTINEL_PORT", "8081"))
    ANALYST_PORT = int(os.getenv("ANALYST_PORT", "8082"))
    OPTIMIZER_PORT = int(os.getenv("OPTIMIZER_PORT", "8083"))
    COMMUNICATOR_PORT = int(os.getenv("COMMUNICATOR_PORT", "8084"))
    ORCHESTRATOR_PORT = int(os.getenv("ORCHESTRATOR_PORT", "8080"))

    # Agent URLs (for A2A discovery)
    # In Cloud Run, override these with the actual service URLs
    SENTINEL_URL = os.getenv("SENTINEL_URL", f"http://localhost:{SENTINEL_PORT}")
    ANALYST_URL = os.getenv("ANALYST_URL", f"http://localhost:{ANALYST_PORT}")
    OPTIMIZER_URL = os.getenv("OPTIMIZER_URL", f"http://localhost:{OPTIMIZER_PORT}")
    COMMUNICATOR_URL = os.getenv("COMMUNICATOR_URL", f"http://localhost:{COMMUNICATOR_PORT}")

    # Monitoring corridors
    CORRIDORS = {
        "asia-europe": {
            "name": "Asia → Europe (Malacca/Suez)",
            "waypoints": [
                {"name": "Singapore Strait", "lat": 1.26, "lng": 103.82},
                {"name": "Malacca Strait", "lat": 2.50, "lng": 101.80},
                {"name": "Colombo", "lat": 6.93, "lng": 79.84},
                {"name": "Suez Canal", "lat": 30.45, "lng": 32.35},
            ],
        },
        "us-india": {
            "name": "US → India (Cape/Suez)",
            "waypoints": [
                {"name": "New York", "lat": 40.68, "lng": -74.04},
                {"name": "Gibraltar", "lat": 36.14, "lng": -5.35},
                {"name": "Suez Canal", "lat": 30.45, "lng": 32.35},
                {"name": "JNPT Mumbai", "lat": 18.95, "lng": 72.95},
            ],
        },
        "intra-india": {
            "name": "Intra-India Coastal",
            "waypoints": [
                {"name": "JNPT Mumbai", "lat": 18.95, "lng": 72.95},
                {"name": "Chennai", "lat": 13.10, "lng": 80.29},
                {"name": "Mundra", "lat": 22.74, "lng": 69.72},
                {"name": "Vizag", "lat": 17.69, "lng": 83.22},
            ],
        },
    }
