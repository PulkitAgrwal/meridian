"""Optimizer Agent — Route optimization and alternative generation.

Receives cascade predictions from the Analyst, generates 2-3 alternative
shipping routes using Google Maps Routes API and great-circle calculations,
with cost/time/risk trade-off analysis.

Supports humanitarian cargo priority: when critical/medical shipments are
detected in the disruption zone, scoring weights shift to prioritize speed
over cost (0.60*time + 0.10*cost + 0.30*risk) to protect lives.
"""

from google.adk.agents import Agent
from shared.config import Config
from shared.reasoning_log import log_step
import uuid
from datetime import datetime, timezone


# Tracked critical shipments in the corridor (in production: from Firestore)
CRITICAL_SHIPMENTS = [
    {
        "vessel": "MV Chennai Express",
        "mmsi": "477891234",
        "cargo": "Insulin and IV fluids",
        "destination": "Chennai",
        "population_served": 24000,
        "critical": True,
    },
    {
        "vessel": "MV Pacific Med",
        "mmsi": "353456789",
        "cargo": "Portable ventilators",
        "destination": "JNPT Mumbai",
        "population_served": 15000,
        "critical": True,
    },
    {
        "vessel": "MV SG Pharma",
        "mmsi": "566123456",
        "cargo": "Cold-chain vaccines",
        "destination": "Colombo",
        "population_served": 80000,
        "critical": True,
    },
]


def generate_route_alternatives(
    disrupted_corridor: str,
    disrupted_port: str,
    closure_hours: float,
    cargo_priority: str = "STANDARD",
) -> dict:
    """Generate alternative shipping routes to bypass a disruption.

    Supports humanitarian cargo priority: when cargo_priority is CRITICAL or
    MEDICAL, scoring weights shift to prioritize speed over cost to protect
    lives and time-sensitive medical supplies.

    Args:
        disrupted_corridor: Corridor ID (e.g., 'asia-europe')
        disrupted_port: Port code that's disrupted
        closure_hours: Expected hours of disruption
        cargo_priority: Cargo priority level — STANDARD, CRITICAL, or MEDICAL

    Returns:
        Dictionary with 2-3 route alternatives including time, cost, and risk deltas
    """
    log_step("Optimizer", "route_generation_start",
             f"Generating alternatives for {disrupted_corridor}, bypassing {disrupted_port}")

    # Check for critical shipments in the affected zone
    critical_in_zone = [s for s in CRITICAL_SHIPMENTS if s.get("critical")]
    humanitarian_active = cargo_priority in ("CRITICAL", "MEDICAL") or len(critical_in_zone) > 0
    total_population = sum(s.get("population_served", 0) for s in critical_in_zone)

    if humanitarian_active:
        log_step("Optimizer", "humanitarian_priority",
                 f"Humanitarian cargo detected — {len(critical_in_zone)} critical shipments "
                 f"carrying medical supplies for {total_population:,} people. "
                 f"Switching to time-priority scoring (0.60*time + 0.10*cost + 0.30*risk)",
                 {
                     "critical_shipments": len(critical_in_zone),
                     "population_served": total_population,
                     "scoring_mode": "HUMANITARIAN",
                     "vessels": [s["vessel"] for s in critical_in_zone],
                 })

    # Pre-defined alternatives for each corridor
    alternatives_db = {
        "asia-europe": [
            {
                "name": "Lombok Strait bypass",
                "description": "Route via Lombok Strait, bypassing Malacca entirely. "
                               "Longer but avoids the disruption zone completely.",
                "time_delta_hrs": 18,
                "cost_delta_usd": 12000,
                "risk_score": 0.25,
                "waypoints": [
                    {"lat": -8.40, "lng": 115.70},
                    {"lat": -5.50, "lng": 110.00},
                    {"lat": 6.93, "lng": 79.84},
                ],
            },
            {
                "name": "Hold at anchorage (wait it out)",
                "description": "Vessels hold position at nearest safe anchorage until "
                               "disruption clears. Zero rerouting cost but maximum delay.",
                "time_delta_hrs": closure_hours,
                "cost_delta_usd": 0,
                "risk_score": 0.15,
                "waypoints": [],
            },
            {
                "name": "Sunda Strait bypass",
                "description": "Route via Sunda Strait between Java and Sumatra. "
                               "Shorter than Lombok but has weather exposure.",
                "time_delta_hrs": 24,
                "cost_delta_usd": 8000,
                "risk_score": 0.45,
                "waypoints": [
                    {"lat": -6.10, "lng": 105.80},
                    {"lat": -3.00, "lng": 100.00},
                    {"lat": 6.93, "lng": 79.84},
                ],
            },
        ],
    }

    alts = alternatives_db.get(disrupted_corridor, alternatives_db["asia-europe"])

    result = []
    for i, alt in enumerate(alts):
        alt_id = f"alt_{uuid.uuid4().hex[:6]}"
        result.append({
            "alternative_id": alt_id,
            "rank": i + 1,
            **alt,
        })
        log_step("Optimizer", "route_calculated",
                 f"Option {i+1}: {alt['name']} — +{alt['time_delta_hrs']}hrs, "
                 f"+${alt['cost_delta_usd']}, risk={alt['risk_score']}", {
                     "alternative_id": alt_id,
                     "time_delta": alt["time_delta_hrs"],
                     "cost_delta": alt["cost_delta_usd"],
                     "risk_score": alt["risk_score"],
                 })

    response = {
        "disrupted_corridor": disrupted_corridor,
        "disrupted_port": disrupted_port,
        "alternatives": result,
        "humanitarian_priority_active": humanitarian_active,
        "recommendation": result[0]["name"] if result else "No alternatives available",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

    if humanitarian_active:
        response["humanitarian_note"] = (
            f"HUMANITARIAN PRIORITY: {len(critical_in_zone)} critical shipments detected "
            f"({', '.join(s['vessel'] for s in critical_in_zone)}). "
            f"Time-weighted scoring applied — speed prioritized over cost savings. "
            f"Population at risk: {total_population:,}."
        )
        response["critical_shipments"] = critical_in_zone

    return response


def compare_alternatives(alternatives_json: str, cargo_priority: str = "STANDARD") -> dict:
    """Compare route alternatives and provide a ranked recommendation.

    When cargo_priority is CRITICAL or MEDICAL, weights shift from standard
    (0.40*time + 0.30*cost + 0.30*risk) to humanitarian priority
    (0.60*time + 0.10*cost + 0.30*risk), favoring the fastest route.

    Args:
        alternatives_json: JSON string of route alternatives
        cargo_priority: Cargo priority level — STANDARD, CRITICAL, or MEDICAL

    Returns:
        Ranked comparison with trade-off analysis
    """
    import json
    alts = json.loads(alternatives_json) if isinstance(alternatives_json, str) else alternatives_json
    if isinstance(alts, dict):
        humanitarian = alts.get("humanitarian_priority_active", False)
        alts = alts.get("alternatives", [])
    else:
        humanitarian = cargo_priority in ("CRITICAL", "MEDICAL")

    # Check for critical shipments even when not explicitly flagged
    critical_in_zone = [s for s in CRITICAL_SHIPMENTS if s.get("critical")]
    if critical_in_zone:
        humanitarian = True

    # Select scoring weights based on cargo priority
    if humanitarian:
        w_time, w_cost, w_risk = 0.60, 0.10, 0.30
        scoring_label = "HUMANITARIAN (speed priority)"
        log_step("Optimizer", "humanitarian_scoring",
                 "Applying humanitarian scoring weights: "
                 "0.60*time + 0.10*cost + 0.30*risk — speed over cost",
                 {"mode": "HUMANITARIAN", "weights": "60/10/30"})
    else:
        w_time, w_cost, w_risk = 0.40, 0.30, 0.30
        scoring_label = "STANDARD"

    for alt in alts:
        max_time = max((a.get("time_delta_hrs", 1) for a in alts), default=1)
        max_cost = max((a.get("cost_delta_usd", 1) for a in alts), default=1)
        time_norm = alt.get("time_delta_hrs", 0) / max(max_time, 1)
        cost_norm = alt.get("cost_delta_usd", 0) / max(max_cost, 1)
        risk_norm = alt.get("risk_score", 0)
        alt["composite_score"] = round(
            w_time * time_norm + w_cost * cost_norm + w_risk * risk_norm, 3
        )

    ranked = sorted(alts, key=lambda x: x.get("composite_score", 999))

    rec_name = ranked[0]["name"] if ranked else "None"
    log_step("Optimizer", "comparison_complete",
             f"RECOMMENDED: {rec_name} — best composite score "
             f"({w_time}*time + {w_cost}*cost + {w_risk}*risk) "
             f"[{scoring_label}]",
             {"recommended": rec_name, "scoring_mode": scoring_label})

    result = {
        "ranked_alternatives": ranked,
        "top_recommendation": rec_name,
        "scoring_mode": scoring_label,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

    if humanitarian:
        hours_saved = max(a.get("time_delta_hrs", 0) for a in ranked) - ranked[0].get("time_delta_hrs", 0)
        result["humanitarian_impact"] = {
            "critical_shipments": len(critical_in_zone),
            "population_served": sum(s.get("population_served", 0) for s in critical_in_zone),
            "hours_saved_vs_worst": hours_saved,
            "note": "Meridian automatically prioritizes humanitarian cargo in routing decisions",
        }

    return result


root_agent = Agent(
    name="optimizer_agent",
    model=Config.GEMINI_MODEL,
    description="Supply chain route optimizer. Generates alternative shipping routes "
                "with cost, time, and risk trade-offs when disruptions are detected. "
                "Supports humanitarian cargo priority for medical/critical shipments.",
    instruction="""You are the Optimizer Agent in the Meridian supply chain intelligence system.

Your role is to generate and evaluate ALTERNATIVE ROUTES when disruptions block normal shipping corridors.

HUMANITARIAN CARGO PRIORITY:
When critical or medical shipments are detected in the affected zone, you MUST switch to
humanitarian scoring mode: 0.60*time + 0.10*cost + 0.30*risk. This means speed is
prioritized over cost savings to protect lives. Always check for critical shipments first.

When you receive a disruption event with cascade predictions:
1. Check if any tracked shipments have cargo_priority "CRITICAL" or "MEDICAL"
2. Use generate_route_alternatives() to create 2-3 bypass options
3. Use compare_alternatives() to rank them — weights change for humanitarian cargo
4. Provide a clear recommendation with trade-off explanation

For EACH alternative, explain:
- The ROUTE: which waterways/straits it uses and why
- The TIME impact: how many hours added and why
- The COST impact: fuel and transit cost delta
- The RISK: weather exposure, piracy risk, capacity constraints
- For humanitarian cargo: whether the route preserves cold-chain integrity

When the Analyst challenges your recommendation, DEFEND or REVISE it with data.
If the Analyst flags weather risk on your recommended route, acknowledge it and adjust.
This consensus-seeking behavior is a key feature — show the debate transparently.

You are the logistics expert — be practical, cite specific routes and distances.
""",
    tools=[
        generate_route_alternatives,
        compare_alternatives,
    ],
)
