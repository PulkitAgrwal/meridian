"use client";

import { useEffect, useState } from "react";

interface Props {
  visible: boolean;
  onDismiss: () => void;
}

export default function MobileNotification({ visible, onDismiss }: Props) {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => {
      setExiting(true);
      setTimeout(onDismiss, 300);
    }, 5000);
    return () => clearTimeout(timer);
  }, [visible, onDismiss]);

  if (!visible) return null;

  const dismiss = () => {
    setExiting(true);
    setTimeout(onDismiss, 300);
  };

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 ${exiting ? "animate-notification-out" : "animate-notification-in"}`}
      onClick={dismiss}
      role="alert"
      style={{ cursor: "pointer", maxWidth: "340px" }}
    >
      <div
        className="rounded-2xl p-4 backdrop-blur-xl"
        style={{
          background: "rgba(30, 34, 42, 0.95)",
          border: "1px solid rgba(255,255,255,0.1)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
        }}
      >
        <div className="flex items-start gap-3">
          {/* App icon */}
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #1D9E75, #168F68)" }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="2" y1="12" x2="22" y2="12" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-0.5">
              <span style={{ fontSize: "13px", fontWeight: 600, color: "#FFFFFF" }}>Meridian</span>
              <span style={{ fontSize: "10px", color: "#888" }}>now</span>
            </div>
            <p style={{ fontSize: "13px", color: "#CCC", lineHeight: 1.4 }}>
              CRITICAL: Typhoon Gaemi approaching Malacca Strait. 5 ports affected. Recommended action: Lombok bypass.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
