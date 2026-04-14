"use client";

interface Props {
  open: boolean;
  onClose: () => void;
}

const SHORTCUTS = [
  { key: "Space", action: "Run / Pause demo" },
  { key: "R", action: "Reset" },
  { key: "L", action: "Toggle reasoning log panel" },
  { key: "C", action: "Open chat" },
  { key: "T", action: "Toggle theme" },
  { key: "?", action: "Show keyboard shortcuts" },
  { key: "Esc", action: "Close modal / overlay" },
];

export default function KeyboardShortcutsModal({ open, onClose }: Props) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts"
    >
      <div
        className="rounded-xl p-6 w-full max-w-sm animate-slide-up"
        style={{
          background: "var(--bg-surface-1)",
          border: "1px solid var(--border)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-primary)" }}>
            Keyboard Shortcuts
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded"
            style={{ color: "var(--text-muted)" }}
            aria-label="Close"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="space-y-2">
          {SHORTCUTS.map((s) => (
            <div key={s.key} className="flex items-center justify-between py-1.5">
              <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>{s.action}</span>
              <kbd
                className="font-mono rounded px-2 py-0.5"
                style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  background: "var(--bg-surface-2)",
                  color: "var(--text-primary)",
                  border: "1px solid var(--border)",
                }}
              >
                {s.key}
              </kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
