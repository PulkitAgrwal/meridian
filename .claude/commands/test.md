Test ChainSight agents, tools, A2A communication, or demo flow.

## Quick Test Commands
```bash
# Test single agent with ADK web UI
adk web agents/sentinel          # Chat at http://localhost:8000

# Test A2A agent directly
curl http://localhost:8081/.well-known/agent.json   # Sentinel agent card

# Run all agents
python launch_all.py

# Test orchestrator (after all agents running)
adk web agents/orchestrator      # Routes to specialists via A2A
```

## Test Prompts per Agent
**Sentinel**: "Scan the Asia-Europe corridor for disruptions"
→ Should call check_vessel_congestion, check_weather_alerts, scan_disruption_news, create_disruption_signal

**Analyst**: "Correlate these signals and predict cascade: [paste signals JSON]"
→ Should call correlate_signals, predict_cascade_impacts, assess_overall_risk

**Optimizer**: "Generate route alternatives for asia-europe corridor, bypassing Singapore"
→ Should call generate_route_alternatives, compare_alternatives

**Communicator**: "Generate a CRITICAL alert for Typhoon Gaemi affecting Malacca Strait"
→ Should call generate_alert, generate_impact_report

**Orchestrator**: "A typhoon is approaching the Malacca Strait. What should we do?"
→ Should route through ALL 4 agents in sequence

## Common Issues
- Empty agent response → Tool function missing docstring (ADK needs Args/Returns)
- A2A connection refused → Start specialist agents BEFORE orchestrator
- "model not found" → Check GOOGLE_API_KEY in .env, or try model="gemini-2.0-flash"
- Rate limit → Add retry logic, or pre-cache Gemini responses for demo scenario
- Import error → Activate venv: `source .venv/bin/activate`

$ARGUMENTS
