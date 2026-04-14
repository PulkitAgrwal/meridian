Build or modify a React/Next.js component for ChainSight's war room dashboard.

## Stack
- Next.js 14+ App Router, TypeScript, Tailwind CSS
- `@react-google-maps/api` for maps
- `firebase` SDK for Firestore real-time listeners
- `recharts` for charts

## Design System
- Dark theme: `bg-gray-950` page, `bg-gray-900` cards, `bg-gray-800` hover
- Agent colors: Sentinel=#3B8BD4, Analyst=#7F77DD, Optimizer=#1D9E75, Communicator=#D85A30
- Risk: LOW=#3B8BD4, MODERATE=#EF9F27, HIGH=#E24B4A, CRITICAL=#E24B4A (pulsing animation)
- Font: JetBrains Mono for agent/technical data, system sans-serif for UI text
- All reasoning steps must show agent name + timestamp

## Key Components
- `MapView` — Google Maps with corridor polylines, vessel dots, disruption pulses, cascade shock waves
- `ReasoningPanel` — Live scrolling agent chain-of-thought with timestamps
- `AgentStatus` — 4 agent indicators (idle/active/error) in header
- `RouteAlternatives` — Cards comparing bypass routes with time/cost/risk scores
- `AlertBanner` — CRITICAL event notification banner

## API Endpoints (from orchestrator on port 8080)
- `GET /api/v1/corridors` — Corridor status
- `GET /api/v1/disruptions` — Active events with cascade
- `GET /api/v1/disruptions/:id/alternatives` — Route options
- `POST /api/v1/query` — Natural language query to Gemini

$ARGUMENTS
