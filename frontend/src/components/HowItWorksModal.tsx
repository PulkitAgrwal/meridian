"use client";

import { AGENT_COLORS, AGENT_LABELS } from "@/lib/types";

interface Props {
  open: boolean;
  onClose: () => void;
}

const AGENTS_INFO = [
  {
    key: "sentinel" as const,
    role: "Detection",
    description:
      "Monitors AIS vessel streams, weather APIs, and news feeds in real time. Detects anomalies like vessel clustering, storm trajectories, and port closures.",
    why: "Without a dedicated monitoring agent, signals from different data sources would be siloed and processed sequentially instead of in parallel.",
  },
  {
    key: "analyst" as const,
    role: "Analysis",
    description:
      "Correlates signals from Sentinel using a knowledge graph of 20 ports and 23 shipping lanes. Predicts cascade delays across downstream ports.",
    why: "Separating analysis from detection lets the system reason about multi-hop impacts using graph traversal, without blocking real-time monitoring.",
  },
  {
    key: "optimizer" as const,
    role: "Optimization",
    description:
      "Generates 2-3 alternative routes using Google Maps Routes API and great-circle calculations. Scores each route on time, cost, and risk tradeoffs.",
    why: "Route optimization requires different tools (Maps API, distance calculations) and a different scoring model. Humanitarian cargo shifts weights to prioritize speed over cost.",
  },
  {
    key: "communicator" as const,
    role: "Communication",
    description:
      "Generates natural-language alerts, PDF reports, and handles follow-up questions via chat. Translates technical data into actionable stakeholder briefings.",
    why: "Stakeholders need human-readable summaries, not raw data. A dedicated agent can tailor tone and detail level for different audiences.",
  },
];

export default function HowItWorksModal({ open, onClose }: Props) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="rounded-xl p-6 w-full max-w-2xl mx-4 animate-slide-in overflow-y-auto"
        style={{
          background: "var(--bg-surface-1)",
          border: "1px solid var(--border)",
          maxHeight: "85vh",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 style={{ fontSize: "18px", fontWeight: 600, color: "var(--text-primary)" }}>
              How Meridian Works
            </h2>
            <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginTop: "4px" }}>
              4 specialized AI agents coordinate via Google A2A Protocol
            </p>
          </div>
          <button
            onClick={onClose}
            className="btn-ghost p-2 rounded-lg"
            aria-label="Close"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Agent flow diagram */}
        <div className="flex items-center justify-center gap-2 mb-6 flex-wrap">
          {AGENTS_INFO.map((agent, i) => (
            <div key={agent.key} className="flex items-center gap-2">
              <div
                className="rounded-lg px-3 py-1.5 text-center"
                style={{
                  background: `${AGENT_COLORS[agent.key]}15`,
                  border: `1px solid ${AGENT_COLORS[agent.key]}40`,
                  minWidth: "90px",
                }}
              >
                <div className="font-mono uppercase" style={{ fontSize: "10px", fontWeight: 700, color: AGENT_COLORS[agent.key] }}>
                  {AGENT_LABELS[agent.key]}
                </div>
                <div style={{ fontSize: "10px", color: "var(--text-muted)" }}>{agent.role}</div>
              </div>
              {i < AGENTS_INFO.length - 1 && (
                <svg width="20" height="12" viewBox="0 0 20 12" fill="none">
                  <path d="M0 6H16M16 6L11 1M16 6L11 11" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
          ))}
        </div>

        {/* Agent details */}
        <div className="space-y-4">
          {AGENTS_INFO.map((agent) => (
            <div
              key={agent.key}
              className="rounded-lg p-4"
              style={{
                background: "var(--bg-surface-2)",
                borderLeft: `3px solid ${AGENT_COLORS[agent.key]}`,
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="font-mono uppercase px-1.5 py-0.5 rounded"
                  style={{
                    fontSize: "10px",
                    fontWeight: 700,
                    backgroundColor: `${AGENT_COLORS[agent.key]}20`,
                    color: AGENT_COLORS[agent.key],
                  }}
                >
                  {AGENT_LABELS[agent.key]}
                </span>
                <span style={{ fontSize: "13px", fontWeight: 500, color: "var(--text-primary)" }}>
                  {agent.role} Agent
                </span>
              </div>
              <p style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: "8px" }}>
                {agent.description}
              </p>
              <div
                className="rounded px-3 py-2"
                style={{ background: "var(--bg-surface-1)", fontSize: "12px", color: "var(--text-muted)" }}
              >
                <strong style={{ color: "var(--text-secondary)" }}>Why a separate agent?</strong>{" "}
                {agent.why}
              </div>
            </div>
          ))}
        </div>

        {/* Architecture note */}
        <div
          className="rounded-lg p-4 mt-4"
          style={{ background: "var(--bg-surface-2)", border: "1px solid var(--border)" }}
        >
          <p style={{ fontSize: "12px", color: "var(--text-secondary)", lineHeight: 1.6 }}>
            <strong style={{ color: "var(--text-primary)" }}>Multi-agent consensus:</strong>{" "}
            When the Optimizer recommends a route, the Analyst can challenge it with weather data — and the Optimizer
            must defend or revise its recommendation. This consensus-seeking behavior, inspired by{" "}
            <em>Agentic LLMs in the Supply Chain</em> (Taylor &amp; Francis, 2025), reduces single-agent hallucination
            risk and produces more reliable decisions.
          </p>
        </div>

        <div className="flex justify-end mt-5">
          <button onClick={onClose} className="btn-primary text-xs px-4 py-2 rounded-lg">
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
