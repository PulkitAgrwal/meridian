"""Shipping network knowledge graph for cascade disruption prediction.

Models the global shipping network as a directed graph where:
- Nodes = Ports (with congestion state, capacity, baseline metrics)
- Edges = Shipping lanes (with transit time, volume, dependency weight)

When a disruption hits a node, the cascade engine traverses downstream
edges to predict ripple effects — delay propagation, congestion spikes,
and downstream port impacts.
"""

import networkx as nx
from shared.models import CascadeImpact, CongestionLevel


def build_shipping_graph() -> nx.DiGraph:
    """Build the shipping network knowledge graph with 25 key ports."""
    G = nx.DiGraph()

    # ── Ports (nodes) ──
    ports = {
        "SGSIN": {"name": "Singapore", "lat": 1.26, "lng": 103.82, "capacity": 3800, "baseline_vessels": 12},
        "MYKLA": {"name": "Port Klang", "lat": 3.00, "lng": 101.39, "capacity": 1400, "baseline_vessels": 8},
        "LKCMB": {"name": "Colombo", "lat": 6.93, "lng": 79.84, "capacity": 700, "baseline_vessels": 6},
        "INJNP": {"name": "JNPT Mumbai", "lat": 18.95, "lng": 72.95, "capacity": 550, "baseline_vessels": 7},
        "INCHE": {"name": "Chennai", "lat": 13.10, "lng": 80.29, "capacity": 450, "baseline_vessels": 5},
        "INMUN": {"name": "Mundra", "lat": 22.74, "lng": 69.72, "capacity": 600, "baseline_vessels": 6},
        "INVIZ": {"name": "Vizag", "lat": 17.69, "lng": 83.22, "capacity": 250, "baseline_vessels": 3},
        "AEJEA": {"name": "Jebel Ali", "lat": 25.01, "lng": 55.06, "capacity": 1900, "baseline_vessels": 10},
        "EGPSD": {"name": "Port Said (Suez)", "lat": 31.26, "lng": 32.30, "capacity": 800, "baseline_vessels": 9},
        "CNSHA": {"name": "Shanghai", "lat": 31.23, "lng": 121.47, "capacity": 4700, "baseline_vessels": 20},
        "CNNGB": {"name": "Ningbo", "lat": 29.87, "lng": 121.55, "capacity": 3300, "baseline_vessels": 15},
        "HKHKG": {"name": "Hong Kong", "lat": 22.29, "lng": 114.15, "capacity": 2000, "baseline_vessels": 11},
        "KRPUS": {"name": "Busan", "lat": 35.10, "lng": 129.04, "capacity": 2200, "baseline_vessels": 12},
        "JPYOK": {"name": "Yokohama", "lat": 35.44, "lng": 139.64, "capacity": 800, "baseline_vessels": 7},
        "NLRTM": {"name": "Rotterdam", "lat": 51.90, "lng": 4.50, "capacity": 1500, "baseline_vessels": 10},
        "DEHAM": {"name": "Hamburg", "lat": 53.55, "lng": 9.97, "capacity": 900, "baseline_vessels": 8},
        "USNYC": {"name": "New York", "lat": 40.68, "lng": -74.04, "capacity": 700, "baseline_vessels": 6},
        "USLAX": {"name": "Los Angeles", "lat": 33.74, "lng": -118.26, "capacity": 1000, "baseline_vessels": 9},
        "IDJKT": {"name": "Jakarta", "lat": -6.10, "lng": 106.87, "capacity": 800, "baseline_vessels": 7},
        "VNSGN": {"name": "Ho Chi Minh", "lat": 10.77, "lng": 106.70, "capacity": 750, "baseline_vessels": 6},
    }

    for port_id, data in ports.items():
        G.add_node(port_id, **data)

    # ── Shipping lanes (edges) ──
    # weight = dependency factor (0-1), transit_days = avg transit time
    lanes = [
        # Asia-Europe corridor
        ("CNSHA", "SGSIN", {"transit_days": 5, "weight": 0.9, "volume": "high"}),
        ("CNNGB", "SGSIN", {"transit_days": 5, "weight": 0.85, "volume": "high"}),
        ("HKHKG", "SGSIN", {"transit_days": 3, "weight": 0.8, "volume": "high"}),
        ("SGSIN", "LKCMB", {"transit_days": 4, "weight": 0.7, "volume": "medium"}),
        ("SGSIN", "AEJEA", {"transit_days": 7, "weight": 0.6, "volume": "medium"}),
        ("LKCMB", "INJNP", {"transit_days": 3, "weight": 0.75, "volume": "medium"}),
        ("LKCMB", "EGPSD", {"transit_days": 5, "weight": 0.65, "volume": "medium"}),
        ("AEJEA", "EGPSD", {"transit_days": 3, "weight": 0.5, "volume": "medium"}),
        ("EGPSD", "NLRTM", {"transit_days": 8, "weight": 0.7, "volume": "high"}),
        ("EGPSD", "DEHAM", {"transit_days": 9, "weight": 0.65, "volume": "medium"}),
        # Intra-India
        ("INJNP", "INCHE", {"transit_days": 3, "weight": 0.5, "volume": "low"}),
        ("INJNP", "INMUN", {"transit_days": 1, "weight": 0.4, "volume": "low"}),
        ("INCHE", "INVIZ", {"transit_days": 1, "weight": 0.3, "volume": "low"}),
        # US corridor
        ("USNYC", "NLRTM", {"transit_days": 9, "weight": 0.6, "volume": "medium"}),
        ("USNYC", "EGPSD", {"transit_days": 11, "weight": 0.5, "volume": "medium"}),
        ("USLAX", "CNSHA", {"transit_days": 14, "weight": 0.7, "volume": "high"}),
        # SE Asia feeders
        ("IDJKT", "SGSIN", {"transit_days": 2, "weight": 0.4, "volume": "medium"}),
        ("VNSGN", "SGSIN", {"transit_days": 2, "weight": 0.45, "volume": "medium"}),
        ("VNSGN", "HKHKG", {"transit_days": 2, "weight": 0.4, "volume": "medium"}),
        # Korea/Japan feeders
        ("KRPUS", "CNSHA", {"transit_days": 2, "weight": 0.5, "volume": "medium"}),
        ("JPYOK", "CNSHA", {"transit_days": 3, "weight": 0.45, "volume": "medium"}),
        # Bypass routes (alternatives)
        ("CNSHA", "LKCMB", {"transit_days": 8, "weight": 0.3, "volume": "low", "bypass": True}),  # Lombok Strait
        ("CNSHA", "IDJKT", {"transit_days": 6, "weight": 0.35, "volume": "low", "bypass": True}),  # Sunda Strait
    ]

    for src, dst, data in lanes:
        G.add_edge(src, dst, **data)

    return G


def predict_cascade(
    graph: nx.DiGraph,
    disrupted_port_id: str,
    closure_hours: float,
    severity: float = 0.9,
) -> list[CascadeImpact]:
    """Predict downstream cascade impacts from a disrupted port.

    Uses BFS traversal with decay — each hop reduces the impact by the
    edge dependency weight. Stops when impact drops below threshold.
    """
    impacts = []
    closure_days = closure_hours / 24

    # BFS from disrupted port
    visited = set()
    queue = [(disrupted_port_id, closure_days, severity)]

    while queue:
        port_id, delay, impact_strength = queue.pop(0)
        if port_id in visited or impact_strength < 0.1:
            continue
        visited.add(port_id)

        if port_id != disrupted_port_id:
            # Calculate congestion category based on impact
            if impact_strength > 0.7:
                congestion = CongestionLevel.LONG_TAIL
            elif impact_strength > 0.4:
                congestion = CongestionLevel.HIGH
            elif impact_strength > 0.2:
                congestion = CongestionLevel.MEDIUM
            else:
                congestion = CongestionLevel.LOW

            port_data = graph.nodes[port_id]
            impacts.append(CascadeImpact(
                port_id=port_id,
                port_name=port_data.get("name", port_id),
                delay_days=round(delay, 1),
                congestion_prediction=congestion,
                affected_vessels=int(port_data.get("baseline_vessels", 5) * impact_strength * 3),
            ))

        # Propagate to downstream ports
        for neighbor in graph.successors(port_id):
            edge = graph.edges[port_id, neighbor]
            transit = edge.get("transit_days", 3)
            dep_weight = edge.get("weight", 0.5)
            propagated_delay = delay + transit * dep_weight
            propagated_impact = impact_strength * dep_weight * 0.8  # 20% decay per hop
            queue.append((neighbor, propagated_delay, propagated_impact))

    # Sort by delay (most impacted first)
    impacts.sort(key=lambda x: x.delay_days)
    return impacts
