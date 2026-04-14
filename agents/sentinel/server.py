"""Sentinel Agent — A2A Server.

Exposes the Sentinel agent as an A2A-compliant server using Google ADK's to_a2a().
Other agents (especially the Orchestrator) can discover and communicate with it.
"""

import os

from agents.sentinel.agent import root_agent
from google.adk.a2a.utils.agent_to_a2a import to_a2a
from shared.config import Config

port = int(os.environ.get("PORT", Config.SENTINEL_PORT))
a2a_app = to_a2a(root_agent, port=port)
app = a2a_app

if __name__ == "__main__":
    import uvicorn

    from shared.logger import log
    log("sentinel", "INFO", f"Starting Sentinel Agent on port {port}")
    log("sentinel", "INFO", f"Agent Card: http://localhost:{port}/.well-known/agent.json")
    uvicorn.run(app, host="0.0.0.0", port=port)
