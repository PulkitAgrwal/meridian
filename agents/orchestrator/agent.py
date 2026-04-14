"""Orchestrator Agent — Root coordinator for the ChainSight multi-agent system.

The Orchestrator discovers and coordinates all specialist agents via A2A.
It routes disruption events through the pipeline:
  Sentinel → Analyst → Optimizer → Communicator

This is the entry point for both:
1. Proactive monitoring: Periodically triggers Sentinel scans
2. Reactive queries: Handles user questions by routing to the right specialist
"""

from google.adk.agents import Agent
from google.adk.agents.remote_a2a_agent import RemoteA2aAgent
from shared.config import Config


# ── Remote A2A Agent Connections ──
# Each specialist agent runs as an independent A2A server.
# The Orchestrator discovers them via their Agent Cards.

sentinel = RemoteA2aAgent(
    name="sentinel",
    agent_card=f"{Config.SENTINEL_URL}/.well-known/agent.json",
    description="Real-time monitoring agent. Monitors AIS vessel streams, weather alerts, and news feeds to detect supply chain disruptions.",
)

analyst = RemoteA2aAgent(
    name="analyst",
    agent_card=f"{Config.ANALYST_URL}/.well-known/agent.json",
    description="Disruption analyst. Correlates multi-source signals, predicts cascade impacts through the shipping network knowledge graph, and assesses risk.",
)

optimizer = RemoteA2aAgent(
    name="optimizer",
    agent_card=f"{Config.OPTIMIZER_URL}/.well-known/agent.json",
    description="Route optimizer. Generates alternative shipping routes with cost, time, and risk trade-offs when disruptions are detected.",
)

communicator = RemoteA2aAgent(
    name="communicator",
    agent_card=f"{Config.COMMUNICATOR_URL}/.well-known/agent.json",
    description="Communication agent. Generates human-readable alerts, impact reports, push notifications, and handles NL queries from logistics managers.",
)


# ── Orchestrator Agent Definition ──

root_agent = Agent(
    name="chainsight_orchestrator",
    model=Config.GEMINI_MODEL,
    description="ChainSight Orchestrator — coordinates supply chain intelligence agents to detect, analyze, and respond to shipping disruptions in real-time.",
    instruction="""You are the ChainSight Orchestrator — the central coordinator of a multi-agent supply chain intelligence system.

You have 4 specialist agents available via the A2A protocol:

1. **sentinel** — Monitors AIS vessel data, weather, and news. Ask it to scan corridors for disruptions.
2. **analyst** — Correlates signals, predicts cascade impacts. Send it disruption signals for analysis.
3. **optimizer** — Generates alternative routes. Ask it for bypass options when corridors are disrupted.
4. **communicator** — Creates alerts and reports. Ask it to notify stakeholders and generate impact reports.

## Full Disruption Response Pipeline

When asked to scan for disruptions or when a disruption is reported:
1. Ask **sentinel** to scan the affected corridor(s) for anomalies
2. Send sentinel's findings to **analyst** for signal correlation and cascade prediction
3. If severity >= 0.5, ask **optimizer** to generate route alternatives
4. Send ALL results to **communicator** to generate alerts and impact reports

## Handling User Queries

When a user asks a question:
- "Scan for disruptions" → Route to sentinel
- "What's the risk on [corridor]?" → Route to analyst (or sentinel if no recent data)
- "Show me alternatives for [corridor]" → Route to optimizer  
- "Generate a report" → Route to communicator
- General questions → Answer directly using your knowledge

## Key Principles
- Always route through the FULL pipeline for new disruption events (sentinel → analyst → optimizer → communicator)
- For follow-up questions, route to the specific relevant agent
- ALWAYS pass the full context between agents — each agent needs the output of the previous one
- Be transparent about which agent you're delegating to and why
""",
    sub_agents=[sentinel, analyst, optimizer, communicator],
)
