"""Shared data models for ChainSight multi-agent system."""

from pydantic import BaseModel, Field
from datetime import datetime
from enum import Enum
from typing import Optional


class Severity(str, Enum):
    LOW = "LOW"
    MODERATE = "MODERATE"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class CongestionLevel(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    LONG_TAIL = "LONG_TAIL"


class DisruptionType(str, Enum):
    WEATHER = "WEATHER"
    PORT_CONGESTION = "PORT_CONGESTION"
    GEOPOLITICAL = "GEOPOLITICAL"
    INFRASTRUCTURE = "INFRASTRUCTURE"
    LABOR = "LABOR"


class Coordinate(BaseModel):
    lat: float
    lng: float


class VesselPosition(BaseModel):
    mmsi: str
    vessel_name: str = ""
    position: Coordinate
    speed_knots: float
    heading: float
    corridor_id: str = ""
    is_stationary: bool = False
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class WeatherAlert(BaseModel):
    alert_type: str
    severity_score: float = Field(ge=0, le=1)
    location: Coordinate
    radius_km: float = 100
    forecast_window_hrs: int = 72
    description: str = ""
    source: str = "openweathermap"
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class PortCongestion(BaseModel):
    port_id: str
    port_name: str
    location: Coordinate
    vessels_at_anchorage: int
    baseline_vessels: int
    congestion_index: float  # ratio vs baseline
    category: CongestionLevel
    computed_at: datetime = Field(default_factory=datetime.utcnow)


class DisruptionSignal(BaseModel):
    """Raw signal from any source before correlation."""
    signal_id: str
    source_type: DisruptionType
    location: Coordinate
    severity_score: float = Field(ge=0, le=1)
    confidence: float = Field(ge=0, le=1)
    description: str = ""
    raw_data: dict = {}
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class CascadeImpact(BaseModel):
    port_id: str
    port_name: str
    delay_days: float
    congestion_prediction: CongestionLevel
    affected_vessels: int = 0


class DisruptionEvent(BaseModel):
    """Correlated disruption event after multi-signal fusion."""
    event_id: str
    title: str
    disruption_type: DisruptionType
    severity: Severity
    severity_score: float = Field(ge=0, le=1)
    confidence: float = Field(ge=0, le=1)
    location: Coordinate
    affected_corridors: list[str] = []
    source_signals: list[str] = []  # signal_ids
    cascade_impacts: list[CascadeImpact] = []
    ai_summary: str = ""
    estimated_closure_hrs: float = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)


class RouteAlternative(BaseModel):
    alternative_id: str
    name: str
    description: str = ""
    time_delta_hrs: float
    cost_delta_usd: float
    risk_score: float = Field(ge=0, le=1)
    route_polyline: str = ""  # encoded polyline
    waypoints: list[Coordinate] = []
    ai_recommendation: str = ""


class ReasoningStep(BaseModel):
    """Transparent reasoning log entry for explainability."""
    agent_name: str
    step_type: str  # e.g., "detection", "correlation", "prediction", "recommendation"
    description: str
    data: dict = {}
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class AgentMessage(BaseModel):
    """Message passed between agents via A2A."""
    from_agent: str
    to_agent: str
    message_type: str  # "disruption_signal", "analysis_request", "route_request", "alert_request"
    payload: dict
    reasoning_steps: list[ReasoningStep] = []
    timestamp: datetime = Field(default_factory=datetime.utcnow)
