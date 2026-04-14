Prepare ChainSight's demo scenario, video script, or demo infrastructure.

## Demo Scenario: Typhoon Gaemi (data/demo_scenario.json)
Timeline:
- T+0s: Sentinel detects 47 vessels at Singapore anchorage (baseline: 12)
- T+1.2s: Sentinel gets Tropical Storm Warning — Typhoon Gaemi, severity 0.88
- T+2s: Sentinel parses Reuters headline about typhoon
- T+2.8s: Sentinel creates DisruptionSignal (severity 0.92, confidence 0.89)
- T+4s: Analyst correlates 3 signals → DisruptionEvent evt_7f3a
- T+5.5s: Analyst traverses knowledge graph from SGSIN
- T+7s: Analyst predicts cascade: Singapore +2d, Colombo +3d, JNPT +4d, Chennai +3.5d
- T+8.5s: Analyst assesses CRITICAL risk
- T+10s: Optimizer generates 3 alternatives
- T+15s: Optimizer recommends Lombok Strait bypass (score 0.28)
- T+16.5s: Analyst debates — concurs with Lombok
- T+18s: Communicator pushes CRITICAL alert
- T+19.5s: Communicator generates PDF impact report

## 3-Minute Video Script
0:00-0:30 — Show war room with live vessel dots. "This is live AIS data from 800+ vessels."
0:30-1:00 — Inject typhoon. Watch 3 signals fuse in reasoning panel.
1:00-1:45 — Cascade animates: shock waves from Malacca, ports flash amber/red.
1:45-2:15 — Route alternatives panel. Select Lombok. Vessels reroute in blue.
2:15-2:45 — Mobile push notification + Gemini chat query.
2:45-3:00 — Zoom out. "ChainSight predicted this 48 hours before industry reports."

## Humanitarian Pitch
"During the 2024 Dana cyclone, medical supplies were stranded at Chennai port for 6 days. ChainSight's agents would have rerouted them through Vizag — potentially saving lives."

$ARGUMENTS
