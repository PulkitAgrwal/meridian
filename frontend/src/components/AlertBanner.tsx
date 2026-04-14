"use client";

interface Props {
  visible: boolean;
  severity: string;
  title: string;
  onDismiss: () => void;
}

export default function AlertBanner({ visible, severity, title, onDismiss }: Props) {
  if (!visible) return null;

  const isCritical = severity === "CRITICAL";

  return (
    <div
      className="animate-slide-up flex items-center justify-between px-4 py-2.5"
      style={{
        background: isCritical
          ? "linear-gradient(90deg, rgba(226,75,74,0.12) 0%, rgba(226,75,74,0.06) 100%)"
          : "linear-gradient(90deg, rgba(239,159,39,0.12) 0%, rgba(239,159,39,0.06) 100%)",
        borderBottom: `1px solid ${isCritical ? "rgba(226,75,74,0.3)" : "rgba(239,159,39,0.3)"}`,
      }}
      role="alert"
      aria-live="assertive"
    >
      <div className="flex items-center gap-3">
        <div className={`flex items-center gap-1.5 ${isCritical ? "animate-severity-pulse" : ""}`}>
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: isCritical ? "#E24B4A" : "#EF9F27" }}
          />
          <span
            className="text-xs font-bold font-mono uppercase tracking-wider"
            style={{ color: isCritical ? "#E24B4A" : "#EF9F27" }}
          >
            {severity}
          </span>
        </div>
        <span style={{ color: "var(--text-primary)", fontSize: "13px" }}>{title}</span>
      </div>
      <button
        onClick={onDismiss}
        className="p-1 rounded transition-colors"
        style={{ color: "var(--text-muted)" }}
        aria-label="Dismiss alert"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}
