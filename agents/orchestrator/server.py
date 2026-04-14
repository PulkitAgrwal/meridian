"""Orchestrator Agent — A2A server with REST API endpoints.

Runs the orchestrator as a Starlette A2A server and adds custom
REST endpoints for the frontend dashboard:
  - POST /api/v1/query                       — NL query to orchestrator
  - GET  /api/v1/disruptions                 — Active disruption events
  - GET  /api/v1/disruptions/{id}/alternatives — Route alternatives
  - GET  /api/v1/reasoning                   — Transparent reasoning log
  - GET  /api/v1/corridors                   — Corridor status (enriched with live data)
  - GET  /api/v1/vessels/stats               — Live vessel statistics
"""

import asyncio
import json
import os
import uuid
from datetime import datetime, timezone

from starlette.requests import Request
from starlette.responses import JSONResponse
from starlette.routing import Route
from starlette.middleware.cors import CORSMiddleware

from google.adk.a2a.utils.agent_to_a2a import to_a2a
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types as genai_types
from google import genai

from agents.orchestrator.agent import root_agent
from shared.config import Config
from shared.reasoning_log import get_log, format_log_as_text, clear_log, log_step
from shared.logger import log as struct_log, request_timer
from tools.ais_stream import start_ais_stream, get_vessel_count, get_all_vessels, get_last_update
from tools.port_congestion import scan_all_ports, get_port_congestion, MONITORED_PORTS


# ── Gemini client for structured extraction ──
_genai_client = genai.Client(api_key=os.getenv("GOOGLE_API_KEY", Config.GOOGLE_API_KEY))

# ── Shared runner + session service for REST API calls ──
_session_service = InMemorySessionService()
_runner = Runner(
    app_name="chainsight_orchestrator",
    agent=root_agent,
    session_service=_session_service,
    auto_create_session=True,
)

# ── In-memory stores (populated by extraction after each query) ──
_disruption_events: dict[str, dict] = {}  # event_id → event data
_alternatives: dict[str, list[dict]] = {}  # event_id → list of alternatives
_latest_event_id: str | None = None


# ═══════════════════════════════════════════════════════════════════
#  Structured extraction schemas
# ═══════════════════════════════════════════════════════════════════

_DISRUPTION_SCHEMA = {
    "type": "object",
    "properties": {
        "event_id": {"type": "string", "description": "A short unique ID like evt_xxxx"},
        "title": {"type": "string", "description": "Short event title"},
        "severity_score": {"type": "number", "description": "0.0 to 1.0"},
        "confidence": {"type": "number", "description": "0.0 to 1.0"},
        "disrupted_port_id": {"type": "string", "description": "Primary port code e.g. SGSIN"},
        "disrupted_port_name": {"type": "string"},
        "estimated_closure_hrs": {"type": "number"},
        "affected_corridors": {"type": "array", "items": {"type": "string"}},
        "disruption_type": {"type": "string", "description": "WEATHER, PORT_CONGESTION, GEOPOLITICAL, etc."},
        "summary": {"type": "string", "description": "2-3 sentence summary"},
        "cascade_impacts": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "port_id": {"type": "string"},
                    "port_name": {"type": "string"},
                    "delay_days": {"type": "number"},
                    "congestion": {"type": "string", "description": "LOW, MEDIUM, HIGH, or LONG_TAIL"},
                    "vessels": {"type": "integer"},
                },
            },
        },
    },
}

_ALTERNATIVES_SCHEMA = {
    "type": "object",
    "properties": {
        "event_id": {"type": "string"},
        "alternatives": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "id": {"type": "string"},
                    "name": {"type": "string"},
                    "description": {"type": "string"},
                    "time_delta_hrs": {"type": "number"},
                    "cost_delta_usd": {"type": "number"},
                    "risk_score": {"type": "number", "description": "0.0 to 1.0"},
                    "recommended": {"type": "boolean"},
                    "waypoints": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "name": {"type": "string"},
                                "lat": {"type": "number"},
                                "lng": {"type": "number"},
                            },
                        },
                    },
                },
            },
        },
    },
}


async def _extract_structured_data(response_text: str, query_text: str) -> None:
    """Use Gemini to extract structured disruption + alternatives data."""
    global _latest_event_id

    if not response_text or len(response_text) < 30:
        return

    extraction_model = Config.GEMINI_MODEL

    # ── Extract disruption event ──
    disruption_prompt = (
        "Extract structured disruption event data from this agent response. "
        "If no disruption is described, set severity_score to 0. "
        "Use port codes like SGSIN, LKCMB, INJNP, INCHE, EGPSD, AEJEA. "
        "Generate a short event_id like evt_XXXX if none is mentioned.\n\n"
        f"User query: {query_text}\n\n"
        f"Agent response:\n{response_text}"
    )

    try:
        disruption_resp = _genai_client.models.generate_content(
            model=extraction_model,
            contents=disruption_prompt,
            config=genai_types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=_DISRUPTION_SCHEMA,
            ),
        )
        event_data = json.loads(disruption_resp.text)

        # Only store if there's actually a disruption
        if event_data.get("severity_score", 0) > 0.1:
            event_id = event_data.get("event_id", f"evt_{uuid.uuid4().hex[:6]}")
            event_data["event_id"] = event_id
            event_data["status"] = "active"
            event_data["detected_at"] = datetime.now(timezone.utc).isoformat()
            _disruption_events[event_id] = event_data
            _latest_event_id = event_id
            log_step("Orchestrator", "extraction", f"Extracted disruption: {event_id}, severity={event_data.get('severity_score')}")
    except Exception as e:
        log_step("Orchestrator", "extraction_error", f"Disruption extraction failed: {e}")

    # ── Extract route alternatives (if present) ──
    alt_keywords = ["alternative", "route", "bypass", "lombok", "sunda", "hold at anchorage", "reroute"]
    if any(kw in response_text.lower() for kw in alt_keywords):
        alt_prompt = (
            "Extract route alternatives from this agent response. "
            "Each alternative should have name, time_delta_hrs, cost_delta_usd, risk_score. "
            "Mark the recommended one. Use the event_id from the context. "
            "For waypoints use real coordinates: Lombok Strait (-8.4, 115.7), "
            "Sunda Strait (-6.1, 105.8), Java Sea (-5.5, 110.0), "
            "Indian Ocean (-3.0, 85.0).\n\n"
            f"Agent response:\n{response_text}"
        )
        try:
            alt_resp = _genai_client.models.generate_content(
                model=extraction_model,
                contents=alt_prompt,
                config=genai_types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=_ALTERNATIVES_SCHEMA,
                ),
            )
            alt_data = json.loads(alt_resp.text)
            alts = alt_data.get("alternatives", [])
            if alts:
                event_id = alt_data.get("event_id") or _latest_event_id or "unknown"
                _alternatives[event_id] = alts
                # Also attach to the disruption event
                if event_id in _disruption_events:
                    _disruption_events[event_id]["alternatives_available"] = True
                    _disruption_events[event_id]["alternatives_count"] = len(alts)
                log_step("Orchestrator", "extraction", f"Extracted {len(alts)} route alternatives for {event_id}")
        except Exception as e:
            log_step("Orchestrator", "extraction_error", f"Alternatives extraction failed: {e}")


# ═══════════════════════════════════════════════════════════════════
#  API Endpoints
# ═══════════════════════════════════════════════════════════════════

@request_timer("orchestrator")
async def api_query(request: Request) -> JSONResponse:
    """POST /api/v1/query — Send a natural language query to the orchestrator."""
    body = await request.json()
    query_text = body.get("query", "")
    if not query_text:
        return JSONResponse({"error": "Missing 'query' field"}, status_code=400)

    log_step("Orchestrator", "api_query", f"Received query: {query_text}")

    user_id = "api_user"
    session_id = f"session_{uuid.uuid4().hex[:8]}"

    user_message = genai_types.Content(
        parts=[genai_types.Part(text=query_text)],
        role="user",
    )

    # Run the orchestrator and collect response text
    response_parts: list[str] = []
    try:
        async for event in _runner.run_async(
            user_id=user_id,
            session_id=session_id,
            new_message=user_message,
        ):
            if event.content and event.content.parts:
                for part in event.content.parts:
                    if part.text:
                        response_parts.append(part.text)
    except Exception as e:
        error_msg = str(e)
        log_step("Orchestrator", "error", f"Pipeline error: {error_msg[:200]}")
        if "429" in error_msg or "RESOURCE_EXHAUSTED" in error_msg:
            return JSONResponse(
                {"error": "Rate limit exceeded. Please wait and retry.", "detail": error_msg[:300]},
                status_code=429,
            )
        return JSONResponse(
            {"error": "Agent pipeline failed", "detail": error_msg[:500]},
            status_code=500,
        )

    response_text = "\n".join(response_parts)
    log_step("Orchestrator", "api_response", f"Response generated ({len(response_text)} chars)")

    # Extract structured data from the response
    try:
        await _extract_structured_data(response_text, query_text)
    except Exception as e:
        log_step("Orchestrator", "extraction_error", f"Extraction failed: {e}")

    return JSONResponse({
        "query": query_text,
        "response": response_text,
        "session_id": session_id,
        "event_id": _latest_event_id,
        "reasoning_steps": len(get_log()),
    })


@request_timer("orchestrator")
async def api_disruptions(request: Request) -> JSONResponse:
    """GET /api/v1/disruptions — Return all active disruption events."""
    if not _disruption_events:
        return JSONResponse({
            "status": "no_active_disruptions",
            "events": [],
        })

    return JSONResponse({
        "status": "active",
        "latest_event_id": _latest_event_id,
        "events": list(_disruption_events.values()),
    })


@request_timer("orchestrator")
async def api_disruption_detail(request: Request) -> JSONResponse:
    """GET /api/v1/disruptions/{event_id} — Return a single disruption event."""
    event_id = request.path_params["event_id"]
    event = _disruption_events.get(event_id)
    if not event:
        return JSONResponse({"error": f"Event {event_id} not found"}, status_code=404)
    return JSONResponse(event)


@request_timer("orchestrator")
async def api_disruption_alternatives(request: Request) -> JSONResponse:
    """GET /api/v1/disruptions/{event_id}/alternatives — Return route alternatives."""
    event_id = request.path_params["event_id"]
    alts = _alternatives.get(event_id)
    if alts is None:
        return JSONResponse({
            "event_id": event_id,
            "alternatives": [],
            "message": "No alternatives generated yet. Query the optimizer first.",
        })
    return JSONResponse({
        "event_id": event_id,
        "alternatives": alts,
        "count": len(alts),
    })


@request_timer("orchestrator")
async def api_reasoning(request: Request) -> JSONResponse:
    """GET /api/v1/reasoning — Return the full transparent reasoning log."""
    log_entries = get_log()
    return JSONResponse({
        "total_steps": len(log_entries),
        "steps": [
            {
                "agent": step.agent_name,
                "step_type": step.step_type,
                "description": step.description,
                "data": step.data,
                "timestamp": step.timestamp.isoformat(),
            }
            for step in log_entries
        ],
        "formatted": format_log_as_text(),
    })


@request_timer("orchestrator")
async def api_reasoning_clear(request: Request) -> JSONResponse:
    """POST /api/v1/reasoning/clear — Clear the reasoning log and stored events."""
    clear_log()
    _disruption_events.clear()
    _alternatives.clear()
    global _latest_event_id
    _latest_event_id = None
    return JSONResponse({"status": "cleared"})


@request_timer("orchestrator")
async def api_corridors(request: Request) -> JSONResponse:
    """GET /api/v1/corridors — Return corridor data enriched with live congestion."""
    corridors_file = os.path.join(os.path.dirname(__file__), "..", "..", "data", "corridors.json")
    try:
        with open(corridors_file) as f:
            corridors_raw = json.load(f)
    except Exception:
        corridors_raw = {}

    enriched = {}
    for corridor_id, data in Config.CORRIDORS.items():
        total_vessels = 0
        max_risk = 0.15
        status = "NORMAL"

        for wp in data.get("waypoints", []):
            port_id = wp.get("id", "")
            if port_id in MONITORED_PORTS:
                congestion = get_port_congestion(port_id)
                total_vessels += congestion.get("vessels_at_anchorage", 0)
                ci = congestion.get("congestion_index", 0)
                if ci > 2.0:
                    max_risk = max(max_risk, 0.75)
                    status = "DISRUPTED"
                elif ci > 1.5:
                    max_risk = max(max_risk, 0.45)
                    if status != "DISRUPTED":
                        status = "ELEVATED"

        raw = corridors_raw.get(corridor_id, {})
        enriched[corridor_id] = {
            "name": data["name"],
            "waypoints": data["waypoints"],
            "active_vessels": total_vessels,
            "risk_score": round(max_risk, 2),
            "status": status,
            "annual_teu": raw.get("annual_teu", None),
            "bypass_routes": raw.get("bypass_routes", []),
        }

    return JSONResponse({
        "corridors": enriched,
        "source": "live" if (os.getenv("AISSTREAM_API_KEY") and get_vessel_count() > 0) else "synthetic",
    })


@request_timer("orchestrator")
async def api_vessel_stats(request: Request) -> JSONResponse:
    """GET /api/v1/vessels/stats — Return live vessel tracking statistics."""
    vessels = get_all_vessels()
    by_corridor: dict[str, int] = {}
    for v in vessels:
        cid = v.get("corridor_id", "unknown")
        by_corridor[cid] = by_corridor.get(cid, 0) + 1

    return JSONResponse({
        "total_tracked": len(vessels),
        "source": "aisstream_live" if (os.getenv("AISSTREAM_API_KEY") and get_vessel_count() > 0) else "synthetic",
        "last_update": get_last_update().isoformat() if get_last_update() else None,
        "by_corridor": {
            "asia-europe": by_corridor.get("asia-europe", 0),
            "us-india": by_corridor.get("us-india", 0),
            "intra-india": by_corridor.get("intra-india", 0),
        },
    })


@request_timer("orchestrator")
async def health(request: Request) -> JSONResponse:
    """GET /health — Health check."""
    return JSONResponse({
        "status": "ok",
        "agent": "chainsight_orchestrator",
        "port": Config.ORCHESTRATOR_PORT,
        "active_events": len(_disruption_events),
        "vessel_count": get_vessel_count(),
        "ais_source": "live" if (os.getenv("AISSTREAM_API_KEY") and get_vessel_count() > 0) else ("synthetic" if get_vessel_count() > 0 else "initializing"),
        "ais_last_update": get_last_update().isoformat() if get_last_update() else None,
        "model": Config.GEMINI_MODEL,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })


# ═══════════════════════════════════════════════════════════════════
#  App Assembly
# ═══════════════════════════════════════════════════════════════════

api_routes = [
    Route("/api/v1/query", api_query, methods=["POST"]),
    Route("/api/v1/disruptions", api_disruptions, methods=["GET"]),
    Route("/api/v1/disruptions/{event_id}", api_disruption_detail, methods=["GET"]),
    Route("/api/v1/disruptions/{event_id}/alternatives", api_disruption_alternatives, methods=["GET"]),
    Route("/api/v1/reasoning", api_reasoning, methods=["GET"]),
    Route("/api/v1/reasoning/clear", api_reasoning_clear, methods=["POST"]),
    Route("/api/v1/corridors", api_corridors, methods=["GET"]),
    Route("/api/v1/vessels/stats", api_vessel_stats, methods=["GET"]),
    Route("/health", health, methods=["GET"]),
]


def build_app():
    """Build the combined A2A + REST API Starlette app."""
    a2a_app = to_a2a(
        root_agent,
        port=Config.ORCHESTRATOR_PORT,
        runner=_runner,
    )

    # Insert REST routes at the front so they match before A2A catch-alls
    for route in reversed(api_routes):
        a2a_app.routes.insert(0, route)

    a2a_app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Start AIS stream on server startup
    @a2a_app.on_event("startup")
    async def _startup():
        struct_log("orchestrator", "INFO", "Starting AIS stream background task...")
        asyncio.create_task(start_ais_stream())

    return a2a_app


app = build_app()


_port = int(os.environ.get("PORT", Config.ORCHESTRATOR_PORT))


if __name__ == "__main__":
    import uvicorn

    struct_log("orchestrator", "INFO", f"Starting ChainSight Orchestrator on port {_port}", {
        "sentinel_url": Config.SENTINEL_URL,
        "analyst_url": Config.ANALYST_URL,
        "optimizer_url": Config.OPTIMIZER_URL,
        "communicator_url": Config.COMMUNICATOR_URL,
    })
    struct_log("orchestrator", "INFO", "REST API endpoints available", {
        "endpoints": [
            "POST /api/v1/query",
            "GET /api/v1/disruptions",
            "GET /api/v1/disruptions/{id}",
            "GET /api/v1/disruptions/{id}/alternatives",
            "GET /api/v1/reasoning",
            "GET /api/v1/corridors",
            "GET /health",
        ],
    })

    uvicorn.run(app, host="0.0.0.0", port=_port)
