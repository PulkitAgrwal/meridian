"use client";

import type { RouteAlternative } from "@/lib/types";

interface Props {
  alternatives: RouteAlternative[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onDownloadPDF: () => void;
  onExportJSON: () => void;
  onExportCSV: () => void;
  humanitarianActive?: boolean;
}

function riskColor(score: number): string {
  if (score <= 0.25) return "#1D9E75";
  if (score <= 0.4) return "#EF9F27";
  return "#E24B4A";
}

function riskLabel(score: number): string {
  if (score <= 0.25) return "LOW";
  if (score <= 0.4) return "MODERATE";
  return "HIGH";
}

export default function RouteAlternatives({ alternatives, selectedId, onSelect, onDownloadPDF, onExportJSON, onExportCSV, humanitarianActive }: Props) {
  if (alternatives.length === 0) return null;

  const effectiveSelected = selectedId ?? alternatives.find(a => a.recommended)?.id ?? null;

  return (
    <div className="animate-slide-up" style={{ background: "var(--bg-surface-1)", borderTop: "1px solid var(--border)" }}>
      <div className="px-4 py-3">
        {/* Humanitarian priority banner */}
        {humanitarianActive && (
          <div
            className="flex items-center gap-2 rounded-lg px-3 py-2 mb-3 animate-slide-in"
            style={{
              background: "rgba(226,75,74,0.08)",
              border: "1px solid rgba(226,75,74,0.2)",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#E24B4A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
            <div>
              <span className="font-mono uppercase" style={{ fontSize: "11px", fontWeight: 700, color: "#E24B4A" }}>
                Humanitarian Priority Active
              </span>
              <p style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "2px" }}>
                3 critical medical shipments detected — scoring weights shifted to 0.60*time + 0.10*cost + 0.30*risk (speed over cost)
              </p>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 mb-3">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1D9E75" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8L22 12L18 16" />
            <path d="M2 12H22" />
          </svg>
          <h3 className="uppercase tracking-wider" style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-secondary)", letterSpacing: "1.5px" }}>
            Route Alternatives
          </h3>
          {humanitarianActive && (
            <span
              className="font-mono uppercase px-1.5 py-0.5 rounded-full animate-severity-pulse"
              style={{ fontSize: "9px", fontWeight: 700, backgroundColor: "rgba(226,75,74,0.15)", color: "#E24B4A" }}
            >
              MEDICAL PRIORITY
            </span>
          )}
        </div>

        <div className="flex gap-3 overflow-x-auto pb-2">
          {alternatives.map((alt) => {
            const isSelected = alt.id === effectiveSelected;
            return (
              <div
                key={alt.id}
                onClick={() => onSelect(alt.id)}
                className="flex-shrink-0 w-44 sm:w-56 rounded-lg p-2.5 sm:p-3 cursor-pointer transition-all"
                style={{
                  background: isSelected ? "rgba(29,158,117,0.08)" : "var(--bg-surface-2)",
                  border: `1px solid ${isSelected ? "rgba(29,158,117,0.4)" : "var(--border)"}`,
                  borderLeft: isSelected ? "3px solid #1D9E75" : `1px solid var(--border)`,
                  boxShadow: isSelected ? "0 4px 12px rgba(29,158,117,0.15)" : "none",
                }}
                tabIndex={0}
                role="button"
                aria-label={`Select ${alt.name}`}
                aria-pressed={isSelected}
              >
                <div className="flex items-center justify-between mb-2">
                  <span style={{ fontSize: "13px", fontWeight: 500, color: "var(--text-primary)" }}>{alt.name}</span>
                  {alt.recommended && (
                    <span
                      className="font-mono uppercase px-1.5 py-0.5 rounded-full"
                      style={{ fontSize: "9px", fontWeight: 700, backgroundColor: "rgba(29,158,117,0.2)", color: "#1D9E75" }}
                    >
                      RECOMMENDED
                    </span>
                  )}
                  {isSelected && !alt.recommended && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1D9E75" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-center">
                    <div style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "2px" }}>Time</div>
                    <div className="font-mono" style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>+{alt.time_delta_hrs}h</div>
                  </div>
                  <div className="text-center">
                    <div style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "2px" }}>Cost</div>
                    <div className="font-mono" style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>
                      {alt.cost_delta_usd === 0 ? "$0" : `+$${(alt.cost_delta_usd / 1000).toFixed(0)}K`}
                    </div>
                  </div>
                  <div className="text-center">
                    <div style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "2px" }}>Risk</div>
                    <div className="font-mono" style={{ fontSize: "13px", fontWeight: 600, color: riskColor(alt.risk_score) }}>
                      {riskLabel(alt.risk_score)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 mt-3">
          <button onClick={onDownloadPDF} className="btn-primary text-xs px-3 py-1.5 rounded-lg">
            Download PDF Report
          </button>
          <button onClick={onExportJSON} className="btn-ghost text-xs px-3 py-1.5 rounded-lg">
            Export Log (JSON)
          </button>
          <button onClick={onExportCSV} className="btn-ghost text-xs px-3 py-1.5 rounded-lg">
            Export Log (CSV)
          </button>
        </div>
      </div>
    </div>
  );
}
