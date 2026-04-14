"""Structured JSON logger for ChainSight agents.

Outputs one JSON object per line to stdout, which Cloud Run captures automatically.
Each log entry includes: timestamp (ISO), agent_name, level, message, optional data dict.
Includes request_id for tracing across agents.
"""

import json
import logging
import sys
import time
import traceback
import uuid
from contextvars import ContextVar
from datetime import datetime, timezone
from functools import wraps
from typing import Any

# Context variable for request tracing
_request_id: ContextVar[str] = ContextVar("request_id", default="")


class JSONFormatter(logging.Formatter):
    """Format log records as single-line JSON objects."""

    def format(self, record: logging.LogRecord) -> str:
        entry: dict[str, Any] = {
            "ts": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z",
            "agent": getattr(record, "agent", record.name),
            "level": record.levelname,
            "msg": record.getMessage(),
        }

        # Add optional data
        data = getattr(record, "data", None)
        if data:
            entry["data"] = data

        # Add request ID if set
        req_id = _request_id.get("")
        if req_id:
            entry["request_id"] = req_id

        # Add exception info if present
        if record.exc_info and record.exc_info[0] is not None:
            entry["error"] = {
                "type": record.exc_info[0].__name__,
                "message": str(record.exc_info[1]),
                "traceback": traceback.format_exception(*record.exc_info),
            }

        return json.dumps(entry, default=str)


def _create_logger(name: str) -> logging.Logger:
    """Create a JSON-formatted logger for an agent."""
    logger = logging.getLogger(f"chainsight.{name}")

    # Avoid duplicate handlers if called multiple times
    if not logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(JSONFormatter())
        logger.addHandler(handler)
        logger.setLevel(logging.DEBUG)
        logger.propagate = False

    return logger


# Pre-built loggers for each agent
_loggers: dict[str, logging.Logger] = {}


def get_logger(agent_name: str) -> logging.Logger:
    """Get or create a structured logger for an agent."""
    if agent_name not in _loggers:
        _loggers[agent_name] = _create_logger(agent_name)
    return _loggers[agent_name]


def log(agent: str, level: str, msg: str, data: dict | None = None) -> None:
    """Convenience function to emit a structured log line.

    Args:
        agent: Agent name (e.g., "sentinel", "orchestrator")
        level: Log level (INFO, WARN, ERROR, DEBUG)
        msg: Log message
        data: Optional dict of structured data
    """
    logger = get_logger(agent)
    extra: dict[str, Any] = {"agent": agent}
    if data:
        extra["data"] = data
    getattr(logger, level.lower(), logger.info)(msg, extra=extra)


def set_request_id(request_id: str | None = None) -> str:
    """Set the current request ID for tracing. Returns the ID."""
    rid = request_id or uuid.uuid4().hex[:12]
    _request_id.set(rid)
    return rid


def get_request_id() -> str:
    """Get the current request ID."""
    return _request_id.get("")


def request_timer(agent: str):
    """Decorator to log API request timing.

    Usage:
        @request_timer("orchestrator")
        async def api_query(request):
            ...
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            rid = set_request_id()
            req = args[0] if args else kwargs.get("request")
            method = getattr(req, "method", "UNKNOWN") if req else "UNKNOWN"
            path = ""
            if req and hasattr(req, "url") and req.url is not None:
                url = req.url
                path = url.path if hasattr(url, "path") else str(url)
            else:
                path = "unknown"

            log(agent, "INFO", "API request start", {"method": method, "path": path, "request_id": rid})
            start = time.monotonic()

            try:
                result = await func(*args, **kwargs)
                duration_ms = round((time.monotonic() - start) * 1000)
                status = getattr(result, "status_code", 200)
                log(agent, "INFO", "API request complete", {
                    "method": method,
                    "path": path,
                    "duration_ms": duration_ms,
                    "status": status,
                    "request_id": rid,
                })
                return result
            except Exception as e:
                duration_ms = round((time.monotonic() - start) * 1000)
                log(agent, "ERROR", f"API request failed: {e}", {
                    "method": method,
                    "path": path,
                    "duration_ms": duration_ms,
                    "error": str(e),
                    "request_id": rid,
                })
                raise
        return wrapper
    return decorator
