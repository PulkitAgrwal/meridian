# CLAUDE.md — ChainSight Project Context

## What is this project?

ChainSight is a **multi-agent AI supply chain disruption prediction system** built for the Google Solution Challenge 2026 India hackathon. It uses Google's Agent Development Kit (ADK) and Agent-to-Agent (A2A) protocol to coordinate 4 specialized AI agents that detect, analyze, and respond to shipping disruptions in real-time.

**Hackathon**: Google Solution Challenge 2026 India — Build with AI
**Challenge**: [Smart Supply Chains] Resilient Logistics and Dynamic Supply Chain Optimization
**Deadline**: April 24, 2026 11:59 PM IST
**Prize pool**: ₹10,00,000

## Architecture

```
Orchestrator (port 8080) — Root ADK agent, discovers specialists via A2A
  ├── Sentinel Agent (port 8081) — Monitors AIS vessels, weather, news
  ├── Analyst Agent (port 8082) — Correlates signals, predicts cascade via knowledge graph
  ├── Optimizer Agent (port 8083) — Generates alternative routes with cost/time/risk
  └── Communicator Agent (port 8084) — Generates alerts, reports, handles NL queries
```

Each agent is an independent A2A server exposed via `to_a2a()` from Google ADK. The Orchestrator connects to them via `RemoteA2aAgent` using their Agent Cards at `/.well-known/agent.json`.

## Tech stack

- **Agent framework**: Google ADK (`google-adk[a2a]>=1.30.0`)
- **AI model**: Gemini 2.5 Flash (via Google AI Studio for dev, Vertex AI for production)
- **Agent communication**: A2A Protocol v0.3
- **Tool access**: MCP-compatible tool functions
- **Database**: Firebase Firestore (real-time state)
- **Maps**: Google Maps JavaScript API + Routes API
- **Frontend**: React + Next.js + Tailwind CSS (in `frontend/`)
- **Mobile**: Flutter (separate repo or `mobile/` directory)
- **Deployment**: Google Cloud Run (each agent = 1 container)
- **Vessel data**: AISStream.io (free WebSocket)
- **Weather**: Open-Meteo (free) + OpenWeatherMap (free tier)

## Project structure

```
chainsight/
├── agents/                    # 5 ADK agents (each has agent.py, server.py, tools.py)
│   ├── sentinel/              # Real-time monitoring + anomaly detection
│   ├── analyst/               # Signal fusion + cascade prediction
│   ├── optimizer/             # Route alternatives + cost optimization
│   ├── communicator/          # Alerts, reports, NL interface
│   └── orchestrator/          # Root coordinator (uses RemoteA2aAgent)
├── shared/                    # Shared modules across agents
│   ├── models.py              # Pydantic data models (14 models)
│   ├── config.py              # Environment config loader
│   ├── knowledge_graph.py     # NetworkX shipping graph (20 ports, 23 lanes)
│   └── reasoning_log.py       # Transparent reasoning logger
├── tools/                     # Data source clients
│   ├── ais_stream.py          # AISStream.io WebSocket + vessel state store
│   ├── weather.py             # Open-Meteo + OpenWeatherMap
│   ├── news_feed.py           # Google News RSS scanner
│   ├── port_congestion.py     # Self-derived congestion from AIS geofencing
│   └── maps_routes.py         # Google Maps Routes + great-circle calculations
├── data/                      # Static data files
│   ├── ports.json             # 25 ports with geofences
│   ├── corridors.json         # 3 shipping corridors
│   └── demo_scenario.json     # Pre-built typhoon demo
├── frontend/                  # React + Next.js web dashboard
├── config/                    # Firebase + Firestore config
├── launch_all.py              # Start all agents concurrently
└── setup.sh                   # One-time local setup script
```

## Key conventions

### Agent code pattern
Every agent follows the same pattern:
```python
# agent.py — Define the agent with tools
from google.adk.agents import Agent
root_agent = Agent(
    name="agent_name",
    model="gemini-2.5-flash",
    description="...",
    instruction="...",
    tools=[tool_func_1, tool_func_2],
)

# server.py — Expose as A2A server
from google.adk.a2a.utils.agent_to_a2a import to_a2a
a2a_app = to_a2a(root_agent, port=PORT)
uvicorn.run(a2a_app, host="0.0.0.0", port=PORT)
```

### Tool function pattern
Tool functions MUST have Google-style docstrings with Args/Returns — ADK uses these to generate the function schema for Gemini:
```python
def my_tool(param1: str, param2: float) -> dict:
    """Brief description of what this tool does.
    
    Args:
        param1: Description of param1
        param2: Description of param2
        
    Returns:
        Dictionary with result data
    """
    log_step("AgentName", "step_type", "description")
    return {"key": "value"}
```

### Reasoning transparency
EVERY significant action must be logged via `shared/reasoning_log.py`:
```python
from shared.reasoning_log import log_step
log_step("Sentinel", "vessel_scan", "Scanning Singapore anchorage", {"port": "SGSIN"})
```
This creates the transparent reasoning trace that judges see in the UI.

### Data models
All data exchanged between agents uses Pydantic models from `shared/models.py`. Key models:
- `VesselPosition` — AIS vessel data
- `DisruptionSignal` — Raw signal from any source
- `DisruptionEvent` — Correlated event after fusion
- `CascadeImpact` — Downstream port impact prediction
- `RouteAlternative` — Alternative shipping route
- `ReasoningStep` — Transparent reasoning log entry

### Environment variables
All config comes from `.env` via `shared/config.py`. Never hardcode API keys.

## How to run locally

```bash
source .venv/bin/activate

# Test a single agent with ADK dev UI
adk web agents/sentinel         # Opens http://localhost:8000

# Start all agents
python launch_all.py            # Starts all 5 on ports 8080-8084

# Start frontend
cd frontend && npm run dev      # Opens http://localhost:3000
```

## Demo scenario

The pre-built demo (`data/demo_scenario.json`) simulates Typhoon Gaemi approaching Malacca Strait:
1. Sentinel detects 47 vessels at Singapore (baseline: 12) + weather alert + news
2. Analyst correlates 3 signals → cascade: Singapore +2d, Colombo +3d, JNPT +4d
3. Optimizer generates 3 alternatives (Lombok +18hrs/$12K, Hold +72hrs/$0, Sunda +24hrs/$8K)
4. Communicator pushes CRITICAL alert + generates impact report

**Humanitarian framing**: "During the 2024 Dana cyclone, medical supplies were stranded at Chennai port for 6 days. ChainSight would have rerouted them through Vizag 48 hours before landfall."

## Judging criteria (optimize for these)

| Criterion | Weight | What judges look for |
|-----------|--------|---------------------|
| **Technical Merit** | **40%** | AI integration depth, code quality, scalability, security |
| **Alignment with Cause** | **25%** | Real-world impact, clear problem-solution fit |
| **Innovation & Creativity** | **25%** | Novel approach, differentiation from obvious solutions |
| **User Experience** | **10%** | Polished UI, smooth demo, clear intent |

## Submission requirements

1. **Prototype deck** — PDF from mandatory PPTX template (14 slides)
2. **Live prototype link** — Web app URL (Firebase Hosting or Cloud Run)
3. **GitHub Repository** — Public repo with README + setup instructions
4. **Demo video** — 3-minute YouTube video (typhoon scenario walkthrough)
5. **Google Cloud deployment** — Must answer "Yes"
6. **Google AI model used** — List all Google tech (Gemini, ADK, A2A, Maps, Firebase, Cloud Run, etc.)

## What to build next (priority order)

1. Wire real API keys and test Sentinel agent in ADK web UI
2. Build the React frontend war room dashboard with Google Maps
3. Connect Firestore real-time listeners for live state
4. Deploy all agents to Cloud Run
5. Record 3-minute demo video
6. Fill PPTX template and submit

## Research references (cite in deck)

- Google A2A Protocol v0.3: https://a2a-protocol.org
- "Agentic LLMs in the supply chain: multi-agent consensus-seeking" (Taylor & Francis, 2025)
- "AI in the Supply Chain — A2A, MCP, and Graph-Enhanced Reasoning" (ARC Advisory, 2026)
- RiskWise: $20K winner at Microsoft AI Agents Hackathon 2025

## Common pitfalls to avoid

- Don't use `google.generativeai` (old SDK) — use `google.genai` (new SDK used by ADK)
- Don't hardcode port numbers — always use `shared/config.py`
- Don't skip `log_step()` calls — the reasoning trace IS the demo differentiator
- Don't build a mobile app as primary — the live prototype link must be a web URL
- Don't forget `fill="none"` on SVG path connectors in frontend visualizations
- Agent tool functions MUST return `dict` not Pydantic models (ADK serialization requirement)