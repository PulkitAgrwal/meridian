Create or modify a Google ADK agent for ChainSight.

## Agent Pattern
```python
from google.adk.agents import Agent
from shared.config import Config
from shared.reasoning_log import log_step

root_agent = Agent(
    name="agent_name",
    model="gemini-2.5-flash",
    description="One-line description for A2A Agent Card",
    instruction="""Multi-line instructions...""",
    tools=[tool_func_1, tool_func_2],
)
```

## Rules
- Every tool function MUST have Google-style docstrings with `Args:` and `Returns:` sections — ADK parses these for Gemini's function calling schema
- Tool functions MUST return `dict` (not Pydantic models)
- Every significant action MUST call `log_step("AgentName", "step_type", "description", {"key": "value"})`
- Server uses `to_a2a(root_agent, port=PORT)` with uvicorn
- Import config from `shared/config.py`, never hardcode

## Files per agent
- `agents/<name>/agent.py` — Agent definition + tool functions
- `agents/<name>/server.py` — A2A server (uvicorn + to_a2a)
- `agents/<name>/tools.py` — Tool re-exports from `tools/`

## Existing agents
- sentinel (8081): AIS vessels, weather, news monitoring
- analyst (8082): Signal correlation, cascade prediction via knowledge graph
- optimizer (8083): Route alternatives with cost/time/risk
- communicator (8084): Alerts, reports, NL queries
- orchestrator (8080): Root coordinator using RemoteA2aAgent

Read CLAUDE.md for full project context.

$ARGUMENTS
