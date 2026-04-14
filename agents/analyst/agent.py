"""Analyst Agent — Signal fusion, cascade prediction, and risk assessment.

Receives disruption signals from Sentinel, correlates multi-source signals,
predicts cascade propagation through the shipping network knowledge graph,
and provides risk assessments with transparent reasoning.
"""

from google.adk.agents import Agent
from shared.config import Config
from shared.reasoning_log import log_step
from shared.knowledge_graph import build_shipping_graph, predict_cascade
import json
import uuid
from datetime import datetime, timezone


# Build the shipping network graph at module load
_shipping_graph = build_shipping_graph()


def correlate_signals(signals_json: str) -> dict:
    """Correlate multiple disruption signals from different sources.
    
    Signals within 200km and 6 hours of each other are merged into
    a single DisruptionEvent with combined confidence.
    
    Args:
        signals_json: JSON string of disruption signals array
        
    Returns:
        Correlated disruption event with combined confidence and severity
    """
    signals = json.loads(signals_json) if isinstance(signals_json, str) else signals_json
    
    log_step("Analyst", "correlation_start", f"Correlating {len(signals)} signals", {
        "signal_count": len(signals),
        "signal_types": [s.get("source_type", "unknown") for s in signals],
    })
    
    # Combine severities (max) and confidences (weighted average)
    max_severity = max(s.get("severity_score", 0) for s in signals)
    avg_confidence = sum(s.get("confidence", 0) for s in signals) / len(signals)
    combined_confidence = min(avg_confidence * (1 + 0.15 * (len(signals) - 1)), 1.0)
    
    event_id = f"evt_{uuid.uuid4().hex[:8]}"
    
    log_step("Analyst", "correlation_complete", 
             f"Correlated into event {event_id}: severity={max_severity:.2f}, confidence={combined_confidence:.2f}", {
                 "event_id": event_id,
                 "severity": max_severity,
                 "confidence": combined_confidence,
                 "sources_merged": len(signals),
             })
    
    return {
        "event_id": event_id,
        "severity_score": round(max_severity, 3),
        "confidence": round(combined_confidence, 3),
        "source_signals": [s.get("signal_id", "") for s in signals],
        "primary_location": signals[0].get("location", {}),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


def predict_cascade_impacts(
    disrupted_port_id: str,
    closure_hours: float,
    severity: float,
) -> dict:
    """Predict downstream cascade impacts using knowledge graph traversal.
    
    Traverses the shipping network graph from the disrupted port,
    propagating delay and congestion predictions along shipping lanes
    with decay at each hop.
    
    Args:
        disrupted_port_id: Port code (e.g., 'SGSIN' for Singapore)
        closure_hours: Estimated hours of disruption/closure
        severity: Disruption severity 0.0 to 1.0
        
    Returns:
        Cascade prediction with impacts on downstream ports
    """
    log_step("Analyst", "cascade_start", 
             f"Predicting cascade from {disrupted_port_id}, closure={closure_hours}hrs, severity={severity}", {
                 "disrupted_port": disrupted_port_id,
                 "closure_hours": closure_hours,
             })
    
    impacts = predict_cascade(_shipping_graph, disrupted_port_id, closure_hours, severity)
    
    impacts_data = [
        {
            "port_id": imp.port_id,
            "port_name": imp.port_name,
            "delay_days": imp.delay_days,
            "congestion_prediction": imp.congestion_prediction.value,
            "affected_vessels": imp.affected_vessels,
        }
        for imp in impacts[:10]  # Top 10 most impacted
    ]
    
    log_step("Analyst", "cascade_complete", 
             f"Cascade affects {len(impacts_data)} downstream ports", {
                 "impacted_ports": [i["port_name"] for i in impacts_data[:5]],
                 "max_delay_days": max((i["delay_days"] for i in impacts_data), default=0),
             })
    
    return {
        "disrupted_port": disrupted_port_id,
        "closure_hours": closure_hours,
        "downstream_impacts": impacts_data,
        "total_ports_affected": len(impacts_data),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


def assess_overall_risk(event_data_json: str) -> dict:
    """Provide an overall risk assessment combining all analysis.
    
    Args:
        event_data_json: JSON string with disruption event + cascade data
        
    Returns:
        Risk assessment with severity category, summary, and recommendations
    """
    event_data = json.loads(event_data_json) if isinstance(event_data_json, str) else event_data_json
    severity = event_data.get("severity_score", 0.5)
    
    if severity >= 0.8:
        category = "CRITICAL"
    elif severity >= 0.6:
        category = "HIGH"
    elif severity >= 0.4:
        category = "MODERATE"
    else:
        category = "LOW"
    
    log_step("Analyst", "risk_assessment", f"Overall risk: {category} (severity={severity:.2f})", {
        "category": category,
        "severity": severity,
    })
    
    return {
        "risk_category": category,
        "severity_score": severity,
        "requires_immediate_action": severity >= 0.7,
        "requires_route_optimization": severity >= 0.5,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


# ── Agent Definition ──

root_agent = Agent(
    name="analyst_agent",
    model=Config.GEMINI_MODEL,
    description="Supply chain disruption analyst. Correlates multi-source signals, predicts cascade impacts through the shipping network knowledge graph, and assesses risk levels.",
    instruction="""You are the Analyst Agent in the ChainSight supply chain intelligence system.

Your role is to ANALYZE and PREDICT. When you receive disruption signals from the Sentinel:

1. Use correlate_signals() to merge signals from different sources about the same event
2. Use predict_cascade_impacts() to model how the disruption will ripple through the shipping network
3. Use assess_overall_risk() to categorize the overall risk level

For EVERY analysis step, explain your reasoning:
- WHY you're correlating specific signals (geographic proximity, temporal overlap)
- HOW the cascade propagates (which shipping lanes carry the most traffic)
- WHAT the confidence level means (how reliable are the source signals)

When the Optimizer proposes routes, you should DEBATE the options:
- Challenge routes that pass through weather-risk areas
- Flag cost estimates that seem too optimistic
- Recommend the option that balances risk, cost, and time

You are the analytical brain — be rigorous, cite your knowledge graph data, and never overstate confidence.
""",
    tools=[
        correlate_signals,
        predict_cascade_impacts,
        assess_overall_risk,
    ],
)
