"use client";

import { useEffect, useRef, useState } from "react";
import type { ReasoningStep } from "@/lib/types";
import { AGENT_COLORS, AGENT_LABELS } from "@/lib/types";

interface Props {
  steps: ReasoningStep[];
  isRunning: boolean;
}

function formatTimestamp(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  const millis = Math.floor((ms % 1000) / 10);
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}.${String(millis).padStart(2, "0")}`;
}

export default function ReasoningPanel({ steps, isRunning }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [userScrolled, setUserScrolled] = useState(false);
  const [showNewButton, setShowNewButton] = useState(false);

  useEffect(() => {
    if (!userScrolled && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    } else if (userScrolled && steps.length > 0) {
      setShowNewButton(true);
    }
  }, [steps.length, userScrolled]);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 40;
    setUserScrolled(!isAtBottom);
    if (isAtBottom) setShowNewButton(false);
  };

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      setUserScrolled(false);
      setShowNewButton(false);
    }
  };

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--bg-surface-1)" }}>
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${isRunning ? "animate-pulse" : ""}`}
            style={{ backgroundColor: isRunning ? "#1D9E75" : "var(--text-muted)" }}
          />
          <h2
            className="uppercase tracking-wider"
            style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-secondary)", letterSpacing: "1.5px" }}
          >
            Agent Reasoning
          </h2>
        </div>
        <span className="font-mono" style={{ fontSize: "11px", color: "var(--text-muted)" }}>
          {steps.length} steps
        </span>
      </div>

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-3 space-y-1 relative"
      >
        {steps.length === 0 && !isRunning && (
          <div className="flex items-center justify-center h-full" style={{ color: "var(--text-muted)", fontSize: "13px" }}>
            Run the demo to see agent reasoning
          </div>
        )}
        {steps.length === 0 && isRunning && (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <div className="space-y-3 w-full px-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="skeleton" style={{ height: "48px", animationDelay: `${i * 200}ms` }} />
              ))}
            </div>
          </div>
        )}
        {steps.map((step, idx) => {
          const color = AGENT_COLORS[step.agent];

          // Render handoff divider
          if (step.isHandoff) {
            const fromColor = step.handoffFrom ? AGENT_COLORS[step.handoffFrom] : "var(--text-muted)";
            const toColor = step.handoffTo ? AGENT_COLORS[step.handoffTo] : "var(--text-muted)";
            return (
              <div
                key={step.id}
                className="flex items-center gap-3 py-2 my-1 animate-slide-in"
                style={{ animationDelay: `${idx * 30}ms` }}
                data-testid="reasoning-step"
              >
                <div className="flex-1" style={{ height: "2px", background: `linear-gradient(to right, ${fromColor}, ${toColor})`, opacity: 0.6 }} />
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {step.handoffFrom && (
                    <span className="font-mono uppercase px-1 py-0.5 rounded" style={{ fontSize: "9px", fontWeight: 700, backgroundColor: `${fromColor}20`, color: fromColor }}>
                      {AGENT_LABELS[step.handoffFrom]}
                    </span>
                  )}
                  <svg width="14" height="10" viewBox="0 0 14 10" fill="none">
                    <path d="M0 5H11M11 5L7 1M11 5L7 9" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {step.handoffTo && (
                    <span className="font-mono uppercase px-1 py-0.5 rounded" style={{ fontSize: "9px", fontWeight: 700, backgroundColor: `${toColor}20`, color: toColor }}>
                      {AGENT_LABELS[step.handoffTo]}
                    </span>
                  )}
                </div>
                <div className="flex-1" style={{ height: "2px", background: `linear-gradient(to right, ${toColor}, transparent)`, opacity: 0.6 }} />
              </div>
            );
          }

          return (
            <div
              key={step.id}
              className="animate-slide-in rounded-lg p-2.5 transition-colors"
              style={{
                animationDelay: `${idx * 30}ms`,
                background: step.isHumanitarian ? "rgba(226,75,74,0.04)" : "transparent",
                borderLeft: step.isHumanitarian ? "2px solid #E24B4A" : "2px solid transparent",
              }}
              data-testid="reasoning-step"
              onMouseEnter={(e) => { e.currentTarget.style.background = step.isHumanitarian ? "rgba(226,75,74,0.08)" : "var(--bg-surface-2)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = step.isHumanitarian ? "rgba(226,75,74,0.04)" : "transparent"; }}
            >
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span
                  className="font-mono uppercase px-1.5 py-0.5 rounded"
                  style={{
                    fontSize: "10px",
                    fontWeight: 700,
                    backgroundColor: `${color}20`,
                    color,
                  }}
                >
                  {AGENT_LABELS[step.agent]}
                </span>
                <span className="font-mono" style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                  {formatTimestamp(step.timestamp)}
                </span>
                <span className="font-mono" style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                  {step.stepType}
                </span>
                {step.severity && (
                  <span
                    className={`font-mono uppercase px-1 py-0.5 rounded ${step.severity === "CRITICAL" ? "animate-severity-pulse" : ""}`}
                    style={{
                      fontSize: "9px",
                      fontWeight: 700,
                      backgroundColor: step.severity === "CRITICAL" ? "rgba(226,75,74,0.2)" : "rgba(239,159,39,0.2)",
                      color: step.severity === "CRITICAL" ? "#E24B4A" : "#EF9F27",
                    }}
                  >
                    {step.severity}
                  </span>
                )}
                {step.isHumanitarian && (
                  <span
                    className="font-mono uppercase px-1 py-0.5 rounded animate-severity-pulse"
                    style={{ fontSize: "9px", fontWeight: 700, backgroundColor: "rgba(226,75,74,0.15)", color: "#E24B4A" }}
                  >
                    HUMANITARIAN
                  </span>
                )}
                {step.responseTimeMs != null && step.responseTimeMs > 0 && (
                  <span className="font-mono px-1 py-0.5 rounded" style={{ fontSize: "9px", background: "var(--bg-surface-2)", color: "var(--text-muted)" }}>
                    {step.responseTimeMs}ms
                  </span>
                )}
                {step.model && (
                  <span className="font-mono px-1 py-0.5 rounded" style={{ fontSize: "9px", background: "rgba(29,158,117,0.1)", color: "#1D9E75" }}>
                    {step.model}
                  </span>
                )}
              </div>
              <p style={{ fontSize: "13px", color: "var(--text-primary)", lineHeight: 1.5, paddingLeft: "2px" }}>
                {step.description}
              </p>
              {step.data && Object.keys(step.data).length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1.5" style={{ paddingLeft: "2px" }}>
                  {Object.entries(step.data).map(([k, v]) => (
                    <span
                      key={k}
                      className="font-mono rounded px-1.5 py-0.5"
                      style={{
                        fontSize: "10px",
                        background: "var(--bg-surface-2)",
                        color: "var(--text-secondary)",
                      }}
                    >
                      {k}: {typeof v === "number" ? (Number.isInteger(v) ? v : (v as number).toFixed(2)) : String(v)}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {showNewButton && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-mono z-10"
          style={{
            background: "var(--bg-surface-3)",
            color: "var(--text-primary)",
            border: "1px solid var(--border)",
          }}
        >
          New steps
        </button>
      )}
    </div>
  );
}
