"use client";

import type { TimelineEvent } from "@/lib/types";

interface Props {
  events: TimelineEvent[];
}

const SEVERITY_COLORS: Record<string, string> = {
  LOW: "#3B8BD4",
  MODERATE: "#EF9F27",
  HIGH: "#E24B4A",
  CRITICAL: "#E24B4A",
};

function formatTime(ms: number): string {
  const s = Math.floor(ms / 1000);
  return `T+${s}s`;
}

export default function TimelinePanel({ events }: Props) {
  if (events.length === 0) {
    return (
      <div className="flex items-center justify-center h-full" style={{ color: "var(--text-muted)", fontSize: "13px" }}>
        Run the demo to see event timeline
      </div>
    );
  }

  return (
    <div className="p-4 overflow-y-auto h-full">
      <div className="relative pl-6">
        {/* Vertical line */}
        <div
          className="absolute left-2 top-2 bottom-2 w-px"
          style={{ background: "var(--border)" }}
        />

        {events.map((event, idx) => {
          const color = SEVERITY_COLORS[event.severity] || "var(--text-muted)";
          return (
            <div
              key={event.id}
              className="relative mb-5 animate-slide-in"
              style={{ animationDelay: `${idx * 50}ms` }}
            >
              {/* Dot */}
              <div
                className="absolute -left-4 top-1 w-3 h-3 rounded-full border-2"
                style={{
                  backgroundColor: color,
                  borderColor: "var(--bg-surface-1)",
                  boxShadow: `0 0 6px ${color}60`,
                }}
              />

              {/* Card */}
              <div
                className="rounded-lg p-3 transition-colors"
                style={{
                  background: "var(--bg-surface-2)",
                  border: `1px solid var(--border)`,
                }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span style={{ fontSize: "13px", fontWeight: 500, color: "var(--text-primary)" }}>
                    {event.title}
                  </span>
                  <span
                    className="font-mono uppercase px-1.5 py-0.5 rounded"
                    style={{
                      fontSize: "9px",
                      fontWeight: 700,
                      backgroundColor: `${color}20`,
                      color,
                    }}
                  >
                    {event.severity}
                  </span>
                </div>
                <p style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "6px" }}>
                  {event.description}
                </p>
                <div className="flex items-center gap-3">
                  <span className="font-mono" style={{ fontSize: "10px", color: "var(--text-muted)" }}>
                    {formatTime(event.timestamp)}
                  </span>
                  {event.portsAffected > 0 && (
                    <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>
                      {event.portsAffected} ports affected
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
