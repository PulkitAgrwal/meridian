"""Launch all ChainSight agents concurrently.

Starts all 5 agents (4 specialists + 1 orchestrator) in separate processes.
The orchestrator waits 3 seconds for specialists to initialize before starting.
"""
import subprocess
import time
import sys
import signal
from shared.logger import log

AGENTS = [
    ("Sentinel",     "agents.sentinel.server",     8081),
    ("Analyst",      "agents.analyst.server",       8082),
    ("Optimizer",    "agents.optimizer.server",     8083),
    ("Communicator", "agents.communicator.server",  8084),
]

ORCHESTRATOR = ("Orchestrator", "agents.orchestrator.server", 8080)

processes = []

def cleanup(sig=None, _frame=None):
    log("launcher", "INFO", "Shutting down all agents...")
    for p in processes:
        p.terminate()
    for p in processes:
        p.wait()
    log("launcher", "INFO", "All agents stopped.")
    sys.exit(0)

signal.signal(signal.SIGINT, cleanup)
signal.signal(signal.SIGTERM, cleanup)

if __name__ == "__main__":
    log("launcher", "INFO", "ChainSight — Starting all agents...")

    # Start specialist agents first
    for name, module, port in AGENTS:
        log("launcher", "INFO", f"Starting {name} on port {port}")
        p = subprocess.Popen([sys.executable, "-m", module])
        processes.append(p)
        time.sleep(0.5)

    # Wait for specialists to be ready
    log("launcher", "INFO", "Waiting for specialist agents to initialize...")
    time.sleep(3)

    # Start orchestrator
    name, module, port = ORCHESTRATOR
    log("launcher", "INFO", f"Starting {name} on port {port}")
    p = subprocess.Popen([sys.executable, "-m", module])
    processes.append(p)

    log("launcher", "INFO", "All agents running", {
        "sentinel": "http://localhost:8081",
        "analyst": "http://localhost:8082",
        "optimizer": "http://localhost:8083",
        "communicator": "http://localhost:8084",
        "orchestrator": "http://localhost:8080",
        "adk_web_ui": "adk web agents/orchestrator",
        "agent_cards": "http://localhost:808X/.well-known/",
    })

    # Wait for all processes
    try:
        for p in processes:
            p.wait()
    except KeyboardInterrupt:
        cleanup()
