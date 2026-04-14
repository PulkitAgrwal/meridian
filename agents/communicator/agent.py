"""Communicator Agent — Alert generation, report creation, and NL interface.

The final agent in the pipeline. Takes analysis and route recommendations,
generates human-readable alerts, PDF impact reports, push notifications,
and handles natural language queries from logistics managers.
"""

from google.adk.agents import Agent
from shared.config import Config
from shared.reasoning_log import log_step, get_log, format_log_as_text
from datetime import datetime, timezone


def generate_alert(
    event_title: str,
    severity: str,
    affected_corridors: str,
    cascade_summary: str,
    top_recommendation: str,
) -> dict:
    """Generate a human-readable disruption alert for logistics managers.
    
    Args:
        event_title: Title of the disruption event
        severity: Severity category (LOW/MODERATE/HIGH/CRITICAL)
        affected_corridors: Comma-separated corridor names
        cascade_summary: Brief cascade impact summary
        top_recommendation: Recommended action
        
    Returns:
        Formatted alert ready for push notification and dashboard display
    """
    log_step("Communicator", "alert_generated", f"Alert: {event_title} [{severity}]", {
        "severity": severity,
        "corridors": affected_corridors,
    })
    
    return {
        "alert_title": f"⚠️ {severity} Disruption: {event_title}",
        "alert_body": f"Affected corridors: {affected_corridors}\n{cascade_summary}\nRecommended action: {top_recommendation}",
        "severity": severity,
        "requires_action": severity in ("HIGH", "CRITICAL"),
        "channels": ["dashboard", "push_notification", "email"] if severity in ("HIGH", "CRITICAL") else ["dashboard"],
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


def generate_impact_report(event_data_json: str) -> dict:
    """Generate a structured impact report for stakeholders.
    
    Args:
        event_data_json: JSON string with full event analysis data
        
    Returns:
        Report structure ready for PDF generation
    """
    log_step("Communicator", "report_generated", "Impact report created")
    
    # Get the reasoning log for full transparency
    reasoning = format_log_as_text()
    
    return {
        "report_type": "DISRUPTION_IMPACT_REPORT",
        "sections": [
            "Executive Summary",
            "Disruption Details",
            "Cascade Impact Analysis",
            "Route Alternatives & Recommendations",
            "Agent Reasoning Trace",
            "Appendix: Raw Data Sources",
        ],
        "reasoning_trace": reasoning,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "status": "ready_for_download",
    }


def get_reasoning_trace() -> dict:
    """Get the full transparent reasoning trace from all agents.
    
    Returns:
        Complete reasoning log formatted for the transparency panel
    """
    log_entries = get_log()
    return {
        "total_steps": len(log_entries),
        "trace": format_log_as_text(),
        "agents_involved": list(set(s.agent_name for s in log_entries)),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


root_agent = Agent(
    name="communicator_agent",
    model=Config.GEMINI_MODEL,
    description="Supply chain communication agent. Generates human-readable alerts, impact reports, and handles natural language queries from logistics managers.",
    instruction="""You are the Communicator Agent in the ChainSight supply chain intelligence system.

Your role is to COMMUNICATE analysis results to human stakeholders clearly and actionably.

When you receive completed analysis:
1. Use generate_alert() to create a push notification for affected logistics managers
2. Use generate_impact_report() to create a downloadable PDF report
3. Use get_reasoning_trace() to surface the transparent AI reasoning chain

Your communication must be:
- CLEAR: No jargon. A logistics manager should understand it instantly.
- ACTIONABLE: Always include a specific recommended action.
- TRANSPARENT: Reference which agents contributed to the analysis and their confidence levels.
- URGENT when needed: CRITICAL events get immediate push notifications with action required.

When answering natural language queries (e.g., "What's the risk on the Suez corridor?"):
- Pull from the latest analysis data
- Cite specific numbers (delay estimates, vessel counts, confidence scores)
- Offer to show the full reasoning trace if the user wants to verify

You are the human interface — be empathetic, clear, and professional.
""",
    tools=[
        generate_alert,
        generate_impact_report,
        get_reasoning_trace,
    ],
)
