import type { Port, Corridor, CascadeImpact, RouteAlternative, ReasoningStep, Vessel, TimelineEvent } from "./types";

export const PORTS: Record<string, Port> = {
  SGSIN: { id: "SGSIN", name: "Singapore", lat: 1.26, lng: 103.82, capacity_teu: 3800, baseline_vessels: 12, radius_km: 30, country: "SG" },
  MYKLA: { id: "MYKLA", name: "Port Klang", lat: 3.0, lng: 101.39, capacity_teu: 1400, baseline_vessels: 8, radius_km: 20, country: "MY" },
  LKCMB: { id: "LKCMB", name: "Colombo", lat: 6.93, lng: 79.84, capacity_teu: 700, baseline_vessels: 6, radius_km: 20, country: "LK" },
  INJNP: { id: "INJNP", name: "JNPT Mumbai", lat: 18.95, lng: 72.95, capacity_teu: 550, baseline_vessels: 7, radius_km: 20, country: "IN" },
  INCHE: { id: "INCHE", name: "Chennai", lat: 13.1, lng: 80.29, capacity_teu: 450, baseline_vessels: 5, radius_km: 20, country: "IN" },
  INMUN: { id: "INMUN", name: "Mundra", lat: 22.74, lng: 69.72, capacity_teu: 600, baseline_vessels: 6, radius_km: 20, country: "IN" },
  INVIZ: { id: "INVIZ", name: "Vizag", lat: 17.69, lng: 83.22, capacity_teu: 250, baseline_vessels: 3, radius_km: 15, country: "IN" },
  AEJEA: { id: "AEJEA", name: "Jebel Ali", lat: 25.01, lng: 55.06, capacity_teu: 1900, baseline_vessels: 10, radius_km: 25, country: "AE" },
  EGPSD: { id: "EGPSD", name: "Port Said", lat: 31.26, lng: 32.3, capacity_teu: 800, baseline_vessels: 9, radius_km: 20, country: "EG" },
  CNSHA: { id: "CNSHA", name: "Shanghai", lat: 31.23, lng: 121.47, capacity_teu: 4700, baseline_vessels: 20, radius_km: 40, country: "CN" },
  CNNGB: { id: "CNNGB", name: "Ningbo", lat: 29.87, lng: 121.55, capacity_teu: 3300, baseline_vessels: 15, radius_km: 35, country: "CN" },
  HKHKG: { id: "HKHKG", name: "Hong Kong", lat: 22.29, lng: 114.15, capacity_teu: 2000, baseline_vessels: 11, radius_km: 25, country: "HK" },
  KRPUS: { id: "KRPUS", name: "Busan", lat: 35.1, lng: 129.04, capacity_teu: 2200, baseline_vessels: 12, radius_km: 25, country: "KR" },
  JPYOK: { id: "JPYOK", name: "Yokohama", lat: 35.44, lng: 139.64, capacity_teu: 800, baseline_vessels: 7, radius_km: 20, country: "JP" },
  NLRTM: { id: "NLRTM", name: "Rotterdam", lat: 51.9, lng: 4.5, capacity_teu: 1500, baseline_vessels: 10, radius_km: 30, country: "NL" },
  DEHAM: { id: "DEHAM", name: "Hamburg", lat: 53.55, lng: 9.97, capacity_teu: 900, baseline_vessels: 8, radius_km: 25, country: "DE" },
  USNYC: { id: "USNYC", name: "New York", lat: 40.68, lng: -74.04, capacity_teu: 700, baseline_vessels: 6, radius_km: 25, country: "US" },
  USLAX: { id: "USLAX", name: "Los Angeles", lat: 33.74, lng: -118.26, capacity_teu: 1000, baseline_vessels: 9, radius_km: 30, country: "US" },
  IDJKT: { id: "IDJKT", name: "Jakarta", lat: -6.1, lng: 106.87, capacity_teu: 800, baseline_vessels: 7, radius_km: 20, country: "ID" },
  VNSGN: { id: "VNSGN", name: "Ho Chi Minh", lat: 10.77, lng: 106.7, capacity_teu: 750, baseline_vessels: 6, radius_km: 20, country: "VN" },
};

export const CORRIDORS: Corridor[] = [
  {
    id: "asia-europe",
    name: "Asia-Europe",
    description: "Main artery for Asia-Europe container trade via Malacca / Suez",
    status: "NORMAL",
    waypoints: [
      { id: "CNSHA", name: "Shanghai", lat: 31.23, lng: 121.47, type: "origin" },
      { id: "CNNGB", name: "Ningbo", lat: 29.87, lng: 121.55, type: "origin" },
      { id: "HKHKG", name: "Hong Kong", lat: 22.29, lng: 114.15, type: "hub" },
      { id: "wp-scs", name: "South China Sea", lat: 10.0, lng: 109.0, type: "waypoint" },
      { id: "SGSIN", name: "Singapore", lat: 1.26, lng: 103.82, type: "critical_chokepoint" },
      { id: "wp-andaman", name: "Andaman Sea", lat: 4.0, lng: 95.0, type: "waypoint" },
      { id: "LKCMB", name: "Colombo", lat: 6.93, lng: 79.84, type: "transshipment" },
      { id: "wp-arabian", name: "Arabian Sea", lat: 14.0, lng: 65.0, type: "waypoint" },
      { id: "AEJEA", name: "Jebel Ali", lat: 25.01, lng: 55.06, type: "hub" },
      { id: "wp-gulf-oman", name: "Gulf of Oman", lat: 24.0, lng: 58.5, type: "waypoint" },
      { id: "wp-arabian-s", name: "Arabian Sea South", lat: 15.0, lng: 54.0, type: "waypoint" },
      { id: "wp-gulf-aden", name: "Gulf of Aden", lat: 12.5, lng: 45.0, type: "waypoint" },
      { id: "wp-red-sea-s", name: "Red Sea South", lat: 13.5, lng: 42.5, type: "waypoint" },
      { id: "wp-red-sea-n", name: "Red Sea North", lat: 27.0, lng: 34.5, type: "waypoint" },
      { id: "EGPSD", name: "Port Said", lat: 31.26, lng: 32.3, type: "critical_chokepoint" },
      { id: "wp-med", name: "Mediterranean", lat: 35.0, lng: 18.0, type: "waypoint" },
      { id: "wp-gibraltar", name: "Gibraltar", lat: 36.0, lng: -5.5, type: "waypoint" },
      { id: "wp-biscay", name: "Bay of Biscay", lat: 45.0, lng: -5.0, type: "waypoint" },
      { id: "wp-english", name: "English Channel", lat: 50.0, lng: 1.0, type: "waypoint" },
      { id: "NLRTM", name: "Rotterdam", lat: 51.9, lng: 4.5, type: "destination" },
      { id: "DEHAM", name: "Hamburg", lat: 53.55, lng: 9.97, type: "destination" },
    ],
  },
  {
    id: "us-india",
    name: "US-India",
    description: "US East Coast to Indian subcontinent via Atlantic and Suez Canal",
    status: "NORMAL",
    waypoints: [
      { id: "USNYC", name: "New York", lat: 40.68, lng: -74.04, type: "origin" },
      { id: "wp-mid-atlantic", name: "Mid-Atlantic", lat: 37.0, lng: -30.0, type: "waypoint" },
      { id: "wp-azores", name: "Azores", lat: 37.0, lng: -15.0, type: "waypoint" },
      { id: "wp-strait-gibraltar", name: "Strait of Gibraltar", lat: 36.0, lng: -5.5, type: "waypoint" },
      { id: "wp-med-w", name: "West Mediterranean", lat: 37.0, lng: 5.0, type: "waypoint" },
      { id: "wp-med-e", name: "East Mediterranean", lat: 33.0, lng: 28.0, type: "waypoint" },
      { id: "EGPSD", name: "Port Said", lat: 31.26, lng: 32.3, type: "critical_chokepoint" },
      { id: "wp-red-sea-n2", name: "Red Sea North", lat: 27.0, lng: 34.5, type: "waypoint" },
      { id: "wp-red-sea-s2", name: "Red Sea South", lat: 13.5, lng: 42.5, type: "waypoint" },
      { id: "wp-gulf-aden2", name: "Gulf of Aden", lat: 12.5, lng: 45.0, type: "waypoint" },
      { id: "wp-arabian-w", name: "Arabian Sea West", lat: 15.0, lng: 54.0, type: "waypoint" },
      { id: "AEJEA", name: "Jebel Ali", lat: 25.01, lng: 55.06, type: "hub" },
      { id: "wp-arabian2", name: "Arabian Sea", lat: 18.0, lng: 66.0, type: "waypoint" },
      { id: "INJNP", name: "JNPT Mumbai", lat: 18.95, lng: 72.95, type: "destination" },
      { id: "wp-indian-coast", name: "Indian Coast", lat: 13.0, lng: 74.0, type: "waypoint" },
      { id: "wp-south-india", name: "South India", lat: 8.5, lng: 77.5, type: "waypoint" },
      { id: "INCHE", name: "Chennai", lat: 13.1, lng: 80.29, type: "destination" },
    ],
  },
  {
    id: "intra-india",
    name: "Intra-India",
    description: "Domestic coastal shipping between major Indian ports",
    status: "NORMAL",
    waypoints: [
      { id: "INMUN", name: "Mundra", lat: 22.74, lng: 69.72, type: "hub" },
      { id: "wp-gujarat-coast", name: "Gujarat Coast", lat: 21.0, lng: 69.5, type: "waypoint" },
      { id: "INJNP", name: "JNPT Mumbai", lat: 18.95, lng: 72.95, type: "hub" },
      { id: "wp-konkan", name: "Konkan Coast", lat: 15.5, lng: 73.5, type: "waypoint" },
      { id: "wp-karnataka", name: "Karnataka Coast", lat: 12.5, lng: 74.5, type: "waypoint" },
      { id: "wp-cape-comorin", name: "Cape Comorin", lat: 8.0, lng: 77.5, type: "waypoint" },
      { id: "INCHE", name: "Chennai", lat: 13.1, lng: 80.29, type: "hub" },
      { id: "INVIZ", name: "Vizag", lat: 17.69, lng: 83.22, type: "secondary" },
    ],
  },
];

export const CORRIDOR_COLORS: Record<string, string> = {
  "asia-europe": "#3B8BD4",
  "us-india": "#7F77DD",
  "intra-india": "#1D9E75",
};

function generateVessels(): Vessel[] {
  const vessels: Vessel[] = [];
  let id = 0;
  const spread = (portId: string, count: number, lat: number, lng: number) => {
    for (let i = 0; i < count; i++) {
      vessels.push({
        id: `v${id++}`,
        lat: lat + (Math.random() - 0.5) * 0.4,
        lng: lng + (Math.random() - 0.5) * 0.4,
        portId,
      });
    }
  };
  spread("SGSIN", 47, 1.26, 103.82);
  spread("CNSHA", 8, 31.23, 121.47);
  spread("HKHKG", 5, 22.29, 114.15);
  spread("LKCMB", 4, 6.93, 79.84);
  spread("INJNP", 4, 18.95, 72.95);
  spread("NLRTM", 5, 51.9, 4.5);
  spread("AEJEA", 4, 25.01, 55.06);
  spread("EGPSD", 4, 31.26, 32.3);
  spread("INCHE", 3, 13.1, 80.29);
  spread("USNYC", 3, 40.68, -74.04);
  return vessels;
}

export const DEMO_VESSELS = generateVessels();

export const DEMO_CASCADE: CascadeImpact[] = [
  { port_id: "SGSIN", port_name: "Singapore", delay_days: 2, congestion: "LONG_TAIL", vessels: 47 },
  { port_id: "LKCMB", port_name: "Colombo", delay_days: 3, congestion: "HIGH", vessels: 18 },
  { port_id: "INCHE", port_name: "Chennai", delay_days: 3.5, congestion: "MEDIUM", vessels: 12 },
  { port_id: "INJNP", port_name: "JNPT Mumbai", delay_days: 4, congestion: "HIGH", vessels: 21 },
  { port_id: "EGPSD", port_name: "Port Said", delay_days: 5, congestion: "MEDIUM", vessels: 15 },
];

export const DEMO_ALTERNATIVES: RouteAlternative[] = [
  {
    id: "lombok",
    name: "Lombok Strait bypass",
    time_delta_hrs: 18,
    cost_delta_usd: 12000,
    risk_score: 0.25,
    recommended: true,
    waypoints: [
      { name: "Lombok Strait", lat: -8.4, lng: 115.7 },
      { name: "Java Sea", lat: -5.5, lng: 110.0 },
      { name: "Indian Ocean", lat: -3.0, lng: 85.0 },
    ],
  },
  {
    id: "hold",
    name: "Hold at anchorage",
    time_delta_hrs: 72,
    cost_delta_usd: 0,
    risk_score: 0.15,
    recommended: false,
    waypoints: [],
  },
  {
    id: "sunda",
    name: "Sunda Strait bypass",
    time_delta_hrs: 24,
    cost_delta_usd: 8000,
    risk_score: 0.45,
    recommended: false,
    waypoints: [
      { name: "Sunda Strait", lat: -6.1, lng: 105.8 },
      { name: "Indian Ocean", lat: -3.0, lng: 100.0 },
    ],
  },
];

export const DEMO_TIMELINE_EVENTS: TimelineEvent[] = [
  { id: "t1", title: "Vessel Congestion Detected", severity: "MODERATE", timestamp: 800, portsAffected: 1, description: "47 vessels at Singapore anchorage (baseline: 12)" },
  { id: "t2", title: "Typhoon Gaemi Alert", severity: "HIGH", timestamp: 1800, portsAffected: 3, description: "Category 3 typhoon approaching Malacca Strait" },
  { id: "t3", title: "Disruption Event Created", severity: "CRITICAL", timestamp: 5000, portsAffected: 5, description: "3 signals correlated — severity 0.92" },
  { id: "t4", title: "Cascade Propagation", severity: "CRITICAL", timestamp: 7500, portsAffected: 5, description: "5 downstream ports affected, max delay 5 days" },
  { id: "t5", title: "Routes Generated", severity: "MODERATE", timestamp: 12500, portsAffected: 0, description: "3 alternative routes calculated" },
  { id: "t6", title: "CRITICAL Alert Broadcast", severity: "CRITICAL", timestamp: 13500, portsAffected: 5, description: "Dashboard, push, and email alerts dispatched" },
];

export const DEMO_REASONING_STEPS: ReasoningStep[] = [
  // Phase 1: Sentinel detection (0-3.5s)
  { id: "r1", agent: "sentinel", stepType: "vessel_scan", description: "Scanning Singapore anchorage — 47 vessels detected (baseline: 12)", data: { port: "SGSIN", vessels: 47 }, timestamp: 0, responseTimeMs: 1240, model: "gemini-2.5-flash" },
  { id: "r2", agent: "sentinel", stepType: "congestion_alert", description: "ANOMALY: Congestion index 3.92x at Singapore — LONG_TAIL category", data: { index: 3.92, category: "LONG_TAIL" }, timestamp: 800, severity: "HIGH", responseTimeMs: 890 },
  { id: "r3", agent: "sentinel", stepType: "weather_scan", description: "Checking weather alerts near Malacca Strait (2.10, 104.50)", timestamp: 1200, responseTimeMs: 2100 },
  { id: "r4", agent: "sentinel", stepType: "weather_alert", description: "TROPICAL STORM WARNING: Typhoon Gaemi — Cat 3, sustained winds 185 km/h, landfall in 48-72hrs", data: { severity: 0.88, name: "Typhoon Gaemi" }, timestamp: 1800, severity: "CRITICAL", responseTimeMs: 1560 },
  { id: "r5", agent: "sentinel", stepType: "news_scan", description: "Scanning news: 'Typhoon Gaemi approaching Southeast Asian shipping lanes' (Reuters)", data: { severity: 0.85 }, timestamp: 2500, responseTimeMs: 3200 },
  { id: "r6", agent: "sentinel", stepType: "signal_created", description: "3 disruption signals created — forwarding to Analyst for correlation", data: { signal_count: 3 }, timestamp: 3200, responseTimeMs: 450 },

  // HANDOFF: Sentinel → Analyst
  { id: "h1", agent: "sentinel", stepType: "handoff", description: "", timestamp: 3800, isHandoff: true, handoffFrom: "sentinel", handoffTo: "analyst", handoffMessage: "3 signals detected, requesting cascade analysis" },

  // Phase 2: Analyst analysis (4-8.5s)
  { id: "r7", agent: "analyst", stepType: "correlation_start", description: "Correlating 3 signals: [CONGESTION, WEATHER, NEWS] within 200km radius", data: { signal_count: 3 }, timestamp: 4000, responseTimeMs: 2340, model: "gemini-2.5-flash" },
  { id: "r8", agent: "analyst", stepType: "correlation_complete", description: "Event evt_7f3a: severity=0.92, confidence=0.89 — signals reinforce each other", data: { event_id: "evt_7f3a", severity: 0.92 }, timestamp: 5000, severity: "CRITICAL", responseTimeMs: 1870 },
  { id: "r9", agent: "analyst", stepType: "cascade_start", description: "Predicting cascade from SGSIN — 72hr closure, severity 0.92", data: { port: "SGSIN" }, timestamp: 5800, responseTimeMs: 3100 },
  { id: "r10", agent: "analyst", stepType: "cascade_hop", description: "Singapore to Colombo: +3d delay, HIGH congestion (18 vessels affected)", data: { from: "SGSIN", to: "LKCMB" }, timestamp: 6500, responseTimeMs: 980 },
  { id: "r11", agent: "analyst", stepType: "cascade_hop", description: "Colombo to JNPT Mumbai: +4d delay, HIGH congestion (21 vessels)", data: { from: "LKCMB", to: "INJNP" }, timestamp: 7000, responseTimeMs: 760 },
  { id: "r12", agent: "analyst", stepType: "cascade_complete", description: "Cascade affects 5 downstream ports. Max delay: 5 days at Port Said", data: { ports_affected: 5 }, timestamp: 7500, responseTimeMs: 540 },
  { id: "r13", agent: "analyst", stepType: "risk_assessment", description: "CRITICAL risk — immediate action required, route optimization recommended", data: { category: "CRITICAL" }, timestamp: 8200, severity: "CRITICAL", responseTimeMs: 1200 },

  // HANDOFF: Analyst → Optimizer
  { id: "h2", agent: "analyst", stepType: "handoff", description: "", timestamp: 8700, isHandoff: true, handoffFrom: "analyst", handoffTo: "optimizer", handoffMessage: "CRITICAL disruption confirmed, 5 ports affected — requesting route alternatives" },

  // Phase 3: Optimizer routes (9-13s) — with humanitarian priority
  { id: "r14", agent: "optimizer", stepType: "route_generation_start", description: "Generating alternatives for asia-europe corridor, bypassing Singapore", timestamp: 9000, responseTimeMs: 1800, model: "gemini-2.5-flash" },
  { id: "r14b", agent: "optimizer", stepType: "humanitarian_priority", description: "Humanitarian cargo detected — 3 critical shipments carrying medical supplies for 119,000 people. Switching to time-priority scoring (0.60*time + 0.10*cost + 0.30*risk)", data: { critical_shipments: 3, population_served: 119000, scoring_mode: "HUMANITARIAN" }, timestamp: 9400, isHumanitarian: true, responseTimeMs: 650 },
  { id: "r15", agent: "optimizer", stepType: "route_calculated", description: "Option 1: Lombok Strait bypass — +18hrs, +$12,000, risk=0.25", data: { route: "Lombok", hours: 18, cost: 12000 }, timestamp: 10000, responseTimeMs: 2100 },
  { id: "r16", agent: "optimizer", stepType: "route_calculated", description: "Option 2: Hold at anchorage — +72hrs, +$0, risk=0.15", data: { route: "Hold", hours: 72, cost: 0 }, timestamp: 10800, responseTimeMs: 1400 },
  { id: "r17", agent: "optimizer", stepType: "route_calculated", description: "Option 3: Sunda Strait bypass — +24hrs, +$8,000, risk=0.45", data: { route: "Sunda", hours: 24, cost: 8000 }, timestamp: 11500, responseTimeMs: 1600 },
  { id: "r18", agent: "optimizer", stepType: "comparison_complete", description: "RECOMMENDED: Lombok Strait bypass — best composite score under humanitarian scoring (0.60*time + 0.10*cost + 0.30*risk). Speed prioritized for medical cargo.", data: { recommended: "Lombok Strait bypass", scoring: "HUMANITARIAN" }, timestamp: 12500, responseTimeMs: 1100 },

  // HANDOFF: Optimizer → Communicator
  { id: "h3", agent: "optimizer", stepType: "handoff", description: "", timestamp: 12900, isHandoff: true, handoffFrom: "optimizer", handoffTo: "communicator", handoffMessage: "Routes ranked with humanitarian priority — broadcasting CRITICAL alert" },

  // Phase 4: Communicator alerts (13-16s)
  { id: "r19", agent: "communicator", stepType: "alert_generated", description: "CRITICAL Alert: Typhoon Gaemi — Malacca Strait. Channels: dashboard, push, email", data: { severity: "CRITICAL" }, timestamp: 13500, severity: "CRITICAL", responseTimeMs: 1900, model: "gemini-2.5-flash" },
  { id: "r20", agent: "communicator", stepType: "report_generated", description: "Impact report generated — 7 sections including humanitarian impact analysis", timestamp: 14500, responseTimeMs: 2400 },
  { id: "r21", agent: "communicator", stepType: "reasoning_trace", description: "Transparent reasoning: 24 steps across 4 agents. Full audit trail available.", data: { total_steps: 24, agents: 4 }, timestamp: 15500, responseTimeMs: 380 },
];

export const CHAT_FALLBACK_ANSWERS: Record<string, string> = {
  "cascade": "The cascade analysis shows 5 ports will be affected by Typhoon Gaemi:\n\n1. **Singapore** (+2 days) — 47 vessels currently at anchorage (3.92x baseline)\n2. **Colombo** (+3 days) — 18 vessels will be delayed\n3. **Chennai** (+3.5 days) — 12 vessels affected\n4. **JNPT Mumbai** (+4 days) — 21 vessels impacted, HIGH congestion expected\n5. **Port Said** (+5 days) — 15 vessels will face delays\n\nTotal estimated economic impact: $4.2M in delayed cargo across the Asia-Europe corridor.",
  "route": "Comparing the 3 alternative routes:\n\n| Route | Time | Cost | Risk |\n|-------|------|------|------|\n| **Lombok Strait** (Recommended) | +18h | +$12K | LOW (0.25) |\n| Hold at anchorage | +72h | $0 | LOW (0.15) |\n| Sunda Strait | +24h | +$8K | HIGH (0.45) |\n\nThe Lombok Strait bypass offers the best composite score, balancing time, cost, and risk. It adds 18 hours but avoids the typhoon zone entirely.",
  "medicine": "Based on current vessel tracking, there are **3 pharmaceutical shipments** currently in the affected zone:\n\n1. MV Horizon Care (MMSI: 477891234) — carrying insulin supplies bound for Chennai\n2. MV Pacific Med (MMSI: 353456789) — medical equipment for JNPT Mumbai\n3. MV SG Pharma (MMSI: 566123456) — vaccines in cold chain for Colombo\n\nRerouting via Lombok Strait would add 18 hours but ensure cold chain integrity is maintained. The hold option risks 72-hour delays which could compromise temperature-sensitive cargo.",
  "eta": "With the Lombok Strait bypass:\n\n- **Current position to Lombok Strait entry**: ~8 hours\n- **Lombok Strait transit**: ~6 hours\n- **Lombok to Colombo**: ~48 hours\n- **Total additional time vs. original Malacca route**: +18 hours\n\nEstimated arrival at Colombo: 72 hours from now (vs. 54 hours on original route).",
  "default": "Based on the current disruption analysis, Typhoon Gaemi is causing CRITICAL-level disruption across the Asia-Europe corridor. The system has identified 5 affected ports with delays ranging from 2-5 days. The recommended action is the Lombok Strait bypass route, which adds 18 hours but reduces risk significantly.\n\nWhat specific aspect would you like to explore? I can provide details on cascade impacts, route comparisons, affected shipments, or estimated arrival times.",
};
