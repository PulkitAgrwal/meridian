"use client";

import { useEffect, useRef, useState } from "react";
import ChatPanel from "./ChatPanel";

interface Props {
  apiUrl?: string;
  demoComplete?: boolean;
}

export default function FloatingChat({ apiUrl, demoComplete }: Props) {
  const [open, setOpen] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [bounce, setBounce] = useState(false);
  const tooltipShown = useRef(false);
  const bounceTimer = useRef<ReturnType<typeof setInterval>>(undefined);

  // After demo completes, pulse once with tooltip
  useEffect(() => {
    if (demoComplete && !tooltipShown.current) {
      tooltipShown.current = true;
      setBounce(true);
      setShowTooltip(true);
      const t1 = setTimeout(() => setBounce(false), 600);
      const t2 = setTimeout(() => setShowTooltip(false), 5000);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
  }, [demoComplete]);

  // Subtle bounce every 30s to draw attention
  useEffect(() => {
    if (open) return;
    bounceTimer.current = setInterval(() => {
      setBounce(true);
      setTimeout(() => setBounce(false), 600);
    }, 30000);
    return () => clearInterval(bounceTimer.current);
  }, [open]);

  return (
    <>
      {/* Floating overlay */}
      {open && (
        <>
          {/* Mobile: full-screen backdrop */}
          <div
            className="fixed inset-0 z-40 md:hidden"
            style={{ background: "rgba(0,0,0,0.4)" }}
            onClick={() => setOpen(false)}
          />
          <div
            className="fixed z-50 md:absolute md:bottom-20 md:right-4 inset-0 md:inset-auto flex flex-col animate-slide-in"
            style={{
              width: "100%",
              height: "100%",
            }}
          >
            {/* Desktop: constrained size. Mobile: full screen */}
            <div
              className="flex flex-col md:rounded-xl overflow-hidden w-full h-full md:w-[360px] md:h-[500px] md:ml-auto"
              style={{
                background: "var(--bg-surface-1)",
                border: "1px solid var(--border)",
                boxShadow: "0 12px 40px rgba(0,0,0,0.3)",
              }}
            >
              {/* Header */}
              <div
                className="flex items-center justify-between px-4 py-3 flex-shrink-0"
                style={{ borderBottom: "1px solid var(--border)" }}
              >
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "#D85A30" }} />
                  <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>
                    Ask Meridian
                  </span>
                  <span className="font-mono" style={{ fontSize: "10px", color: "var(--text-muted)" }}>
                    Communicator Agent
                  </span>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="btn-ghost p-1.5 rounded-lg"
                  aria-label="Close chat"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
              {/* Chat content */}
              <div className="flex-1 overflow-hidden">
                <ChatPanel apiUrl={apiUrl} />
              </div>
            </div>
          </div>
        </>
      )}

      {/* Tooltip */}
      {showTooltip && !open && (
        <div
          className="absolute bottom-20 right-4 z-30 rounded-lg px-3 py-2 animate-slide-in pointer-events-none"
          style={{
            background: "var(--bg-surface-1)",
            border: "1px solid var(--border)",
            boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
            whiteSpace: "nowrap",
          }}
        >
          <span style={{ fontSize: "12px", color: "var(--text-primary)" }}>
            Ask Meridian about this disruption
          </span>
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => { setOpen((p) => !p); setShowTooltip(false); }}
        className={`absolute bottom-4 right-4 z-30 flex items-center justify-center rounded-full shadow-lg transition-transform ${bounce ? "animate-bounce" : ""}`}
        style={{
          width: "56px",
          height: "56px",
          backgroundColor: open ? "var(--bg-surface-3)" : "#D85A30",
          border: "none",
          cursor: "pointer",
          boxShadow: "0 4px 20px rgba(216,90,48,0.4)",
        }}
        aria-label={open ? "Close chat" : "Open chat"}
        data-testid="chat-fab"
      >
        {open ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        )}
      </button>
    </>
  );
}
