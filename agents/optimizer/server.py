"""Optimizer Agent — A2A Server."""

import os

from agents.optimizer.agent import root_agent
from google.adk.a2a.utils.agent_to_a2a import to_a2a
from shared.config import Config

port = int(os.environ.get("PORT", Config.OPTIMIZER_PORT))
a2a_app = to_a2a(root_agent, port=port)
app = a2a_app

if __name__ == "__main__":
    import uvicorn

    from shared.logger import log
    log("optimizer", "INFO", f"Starting Optimizer Agent on port {port}")
    uvicorn.run(app, host="0.0.0.0", port=port)
