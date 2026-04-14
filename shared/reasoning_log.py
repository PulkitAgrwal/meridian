"""Transparent reasoning logger for ChainSight agents.

Logs every step of every agent's reasoning with timestamps,
creating an auditable chain-of-thought that judges can inspect.
Inspired by RiskWise's winning "Transparent AI Reasoning" feature.
"""

from datetime import datetime, timezone
from shared.models import ReasoningStep
from shared.logger import log as _struct_log

# Global reasoning log (in production, this would be Firestore)
_reasoning_log: list[ReasoningStep] = []


def log_step(agent_name: str, step_type: str, description: str, data: dict | None = None) -> ReasoningStep:
    """Log a reasoning step with timestamp."""
    step = ReasoningStep(
        agent_name=agent_name,
        step_type=step_type,
        description=description,
        data=data or {},
        timestamp=datetime.now(timezone.utc),
    )
    _reasoning_log.append(step)
    _struct_log(agent_name, "INFO", f"{step_type}: {description}", data or {})
    return step


def get_log() -> list[ReasoningStep]:
    """Get the full reasoning log."""
    return _reasoning_log


def get_log_for_event(event_id: str) -> list[ReasoningStep]:
    """Get reasoning steps related to a specific event."""
    return [s for s in _reasoning_log if s.data.get("event_id") == event_id]


def clear_log():
    """Clear the reasoning log."""
    _reasoning_log.clear()


def format_log_as_text(steps: list[ReasoningStep] | None = None) -> str:
    """Format reasoning log as human-readable text for the transparency panel."""
    steps = steps or _reasoning_log
    lines = []
    for step in steps:
        ts = step.timestamp.strftime("%H:%M:%S.%f")[:-3]
        lines.append(f"[{ts}] {step.agent_name} → {step.step_type}")
        lines.append(f"  {step.description}")
        if step.data:
            for k, v in step.data.items():
                lines.append(f"    {k}: {v}")
        lines.append("")
    return "\n".join(lines)
