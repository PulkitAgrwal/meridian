# Meridian — Predictive Logistics Nerve Center

> Multi-agent AI system for real-time supply chain disruption prediction and route optimization.
> Built with Google ADK + A2A Protocol + MCP + Gemini + Firebase + Flutter

## Architecture

Meridian implements Google's A2A (Agent-to-Agent) protocol for autonomous supply chain intelligence. Four specialized agents discover each other, negotiate disruption responses, and stream decisions in real-time — grounded in live vessel data from 800+ ships.

```
┌──────────────────────────────────────────────────────────────────┐
│                     ORCHESTRATOR AGENT                           │
│              (Google ADK Root Agent — Port 8080)                 │
│         Discovers & coordinates all specialist agents            │
└──────┬───────────┬───────────────┬──────────────┬────────────────┘
       │ A2A       │ A2A           │ A2A          │ A2A
       ▼           ▼               ▼              ▼
┌────────────┐ ┌──────────┐ ┌───────────┐ ┌──────────────┐
│  SENTINEL  │ │ ANALYST  │ │ OPTIMIZER │ │ COMMUNICATOR │
│  :8081     │ │ :8082    │ │ :8083     │ │ :8084        │
│            │ │          │ │           │ │              │
│ MCP Tools: │ │ Tools:   │ │ Tools:    │ │ Tools:       │
│ • AIS Feed │ │ • Gemini │ │ • Maps    │ │ • FCM Push   │
│ • Weather  │ │ • Graph  │ │ • Routes  │ │ • Report Gen │
│ • News RSS │ │ • Risk   │ │ • Cost    │ │ • NL Chat    │
└────────────┘ └──────────┘ └───────────┘ └──────────────┘
```

## Agents (A2A Protocol)

| Agent | Port | Role | Agent Card |
|-------|------|------|------------|
| **Sentinel** | 8081 | Monitors AIS streams, weather, news. Detects anomalies and publishes disruption signals. | `/.well-known/agent.json` |
| **Analyst** | 8082 | Fuses multi-source signals, predicts cascade propagation via knowledge graph traversal. | `/.well-known/agent.json` |
| **Optimizer** | 8083 | Generates alternative routes with cost/time trade-offs using Google Maps Routes API. | `/.well-known/agent.json` |
| **Communicator** | 8084 | Generates human-readable alerts, PDF reports, push notifications, and handles NL queries. | `/.well-known/agent.json` |
| **Orchestrator** | 8080 | Root agent that discovers specialists via Agent Cards and coordinates the full disruption response pipeline. | N/A (root) |

## Tech Stack

- **Agent Framework**: Google ADK (Agent Development Kit) v1.30+
- **Agent Communication**: A2A Protocol v0.3 (Agent-to-Agent)
- **Tool Access**: MCP (Model Context Protocol) for data sources
- **AI Model**: Gemini 2.0 Flash (via Google AI Studio — free tier)
- **Database**: Firebase Firestore (real-time state + history)
- **Maps**: Google Maps JavaScript API + Routes API
- **Push Notifications**: Firebase Cloud Messaging
- **Frontend**: React + Next.js (web dashboard) + Flutter (mobile)
- **Deployment**: Google Cloud Run (scales to zero, free tier)
- **Vessel Data**: AISStream.io (free WebSocket API)
- **Weather**: Open-Meteo (free) + OpenWeatherMap (severe alerts)

## Quick Start

```bash
# 1. Clone and install
git clone https://github.com/YOUR_TEAM/meridian.git
cd meridian
pip install -e ".[dev]" --break-system-packages

# 2. Set environment variables
cp .env.example .env
# Edit .env with your API keys

# 3. Start all agents (each in a separate terminal or use the launcher)
python -m agents.sentinel.server    # Port 8081
python -m agents.analyst.server     # Port 8082
python -m agents.optimizer.server   # Port 8083
python -m agents.communicator.server # Port 8084
python -m agents.orchestrator.server # Port 8080

# 4. Or use the all-in-one launcher
python launch_all.py

# 5. Start the frontend
cd frontend && npm run dev
```

## Project Structure

```
meridian/
├── agents/
│   ├── sentinel/          # AIS + Weather + News monitoring agent
│   │   ├── agent.py       # Agent definition with tools
│   │   ├── server.py      # A2A server (uvicorn)
│   │   └── tools.py       # MCP tool wrappers (AIS, weather, news)
│   ├── analyst/           # Signal fusion + cascade prediction agent  
│   │   ├── agent.py
│   │   ├── server.py
│   │   └── tools.py       # Knowledge graph, risk scoring
│   ├── optimizer/         # Route optimization agent
│   │   ├── agent.py
│   │   ├── server.py
│   │   └── tools.py       # Google Maps Routes, cost calculator
│   ├── communicator/      # Alert generation + NL interface agent
│   │   ├── agent.py
│   │   ├── server.py
│   │   └── tools.py       # FCM push, PDF generation, Gemini chat
│   └── orchestrator/      # Root coordinator agent
│       ├── agent.py
│       └── server.py
├── shared/
│   ├── models.py          # Pydantic models (DisruptionSignal, Route, etc.)
│   ├── config.py          # Environment config loader
│   ├── knowledge_graph.py # Shipping network graph (ports + lanes)
│   └── reasoning_log.py   # Transparent reasoning logger with timestamps
├── tools/
│   ├── ais_stream.py      # AISStream.io WebSocket client
│   ├── weather.py         # Open-Meteo + OpenWeatherMap client  
│   ├── news_feed.py       # Google News RSS disruption scanner
│   ├── port_congestion.py # Self-derived congestion from AIS geofencing
│   └── maps_routes.py     # Google Maps Routes API wrapper
├── data/
│   ├── ports.json         # 25 key ports with geofences
│   ├── corridors.json     # 3 shipping corridors definition
│   └── demo_scenario.json # Pre-built typhoon demo scenario
├── frontend/              # React + Next.js web dashboard
├── config/
│   └── firebase.json      # Firebase project config
├── launch_all.py          # Start all agents concurrently
├── pyproject.toml
├── .env.example
└── README.md
```

## Demo Scenario

The pre-built demo simulates:
1. **T+0s**: Sentinel detects 47 vessels at Singapore anchorage (baseline: 12) + Typhoon Gaemi weather alert + news headline
2. **T+5s**: Analyst fuses 3 signals → DisruptionEvent (severity 0.92) → cascade prediction: Singapore +2d, Colombo +3d, JNPT +4d
3. **T+12s**: Optimizer generates 3 alternative routes with cost/time trade-offs
4. **T+18s**: Communicator pushes alert to Flutter app + generates PDF report
5. **T+20s**: User accepts Sunda Strait bypass → dashboard updates in real-time

## Research References

- Google A2A Protocol v0.3 (2025): [a2a-protocol.org](https://a2a-protocol.org)
- "Agentic LLMs in the supply chain: autonomous multi-agent consensus-seeking" (Taylor & Francis, 2025)
- "AI in the Supply Chain — A2A, MCP, and Graph-Enhanced Reasoning" (ARC Advisory, 2026)
- RiskWise: $20K winner at Microsoft AI Agents Hackathon (2025) — multi-agent supply chain risk analysis

## Team

Built for Google Solution Challenge 2026 India — Build with AI
