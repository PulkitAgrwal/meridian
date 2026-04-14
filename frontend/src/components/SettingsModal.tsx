"use client";

import { useCallback, useEffect, useState } from "react";
import type { SettingsState } from "@/lib/types";

const DEFAULT_API_URL = process.env.NEXT_PUBLIC_ORCHESTRATOR_URL || "https://chainsight-orchestrator-rbfgggserq-el.a.run.app";

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (settings: SettingsState) => void;
}

const DEFAULT_SETTINGS: SettingsState = {
  model: "",
  apiUrl: "",
  demoSpeed: 1,
};

function loadSettings(): SettingsState {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const stored = localStorage.getItem("meridian-settings");
    return stored ? { ...DEFAULT_SETTINGS, ...JSON.parse(stored) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export default function SettingsModal({ open, onClose, onSave }: Props) {
  const [settings, setSettings] = useState<SettingsState>(DEFAULT_SETTINGS);
  const [healthStatus, setHealthStatus] = useState<"checking" | "ok" | "error">("checking");
  const [healthDetail, setHealthDetail] = useState<string>("");
  const [backendModel, setBackendModel] = useState<string | null>(null);

  useEffect(() => {
    setSettings(loadSettings());
  }, [open]);

  // Ping health endpoint when modal opens
  useEffect(() => {
    if (!open) return;
    const apiBase = settings.apiUrl || DEFAULT_API_URL;
    setHealthStatus("checking");
    fetch(`${apiBase}/health`, { signal: AbortSignal.timeout(15000) })
      .then(r => r.ok ? r.json() : Promise.reject("not ok"))
      .then(data => {
        setHealthStatus("ok");
        setHealthDetail(`${data.vessel_count ?? 0} vessels, ${data.ais_source ?? "unknown"} mode`);
        if (data.model) setBackendModel(data.model);
      })
      .catch(() => {
        setHealthStatus("error");
        setHealthDetail("API unreachable — Cloud Run cold start may take 15s");
      });
  }, [open, settings.apiUrl]);

  const handleSave = useCallback(() => {
    localStorage.setItem("meridian-settings", JSON.stringify(settings));
    onSave(settings);
    onClose();
  }, [settings, onSave, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label="Settings"
    >
      <div
        className="rounded-xl p-6 w-full max-w-md animate-slide-up"
        style={{
          background: "var(--bg-surface-1)",
          border: "1px solid var(--border)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
        }}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-primary)" }}>Settings</h2>
          <button
            onClick={onClose}
            className="p-1 rounded"
            style={{ color: "var(--text-muted)" }}
            aria-label="Close settings"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          {/* Model */}
          <div>
            <label className="block mb-1" style={{ fontSize: "12px", color: "var(--text-secondary)", fontWeight: 500 }}>
              Model
            </label>
            <select
              value={settings.model}
              onChange={(e) => setSettings({ ...settings, model: e.target.value })}
              className="w-full rounded-lg px-3 py-2 text-sm outline-none"
              style={{
                background: "var(--bg-surface-2)",
                color: "var(--text-primary)",
                border: "1px solid var(--border)",
              }}
            >
              <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
              <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
              <option value="gemini-2.5-flash-lite">Gemini 2.5 Flash Lite</option>
              <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
            </select>
            <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>
              Model change applies to the backend. Update GEMINI_MODEL in your .env and restart agents.
            </p>
          </div>

          {/* API URL */}
          <div>
            <label className="block mb-1" style={{ fontSize: "12px", color: "var(--text-secondary)", fontWeight: 500 }}>
              API URL
            </label>
            <input
              type="text"
              value={settings.apiUrl}
              onChange={(e) => setSettings({ ...settings, apiUrl: e.target.value })}
              placeholder={DEFAULT_API_URL}
              className="w-full rounded-lg px-3 py-2 text-sm font-mono outline-none"
              style={{
                background: "var(--bg-surface-2)",
                color: "var(--text-primary)",
                border: "1px solid var(--border)",
              }}
            />
          </div>

          {/* Demo Speed */}
          <div>
            <label className="block mb-1" style={{ fontSize: "12px", color: "var(--text-secondary)", fontWeight: 500 }}>
              Demo Speed: {settings.demoSpeed}x
            </label>
            <input
              type="range"
              min="0.5"
              max="2"
              step="0.5"
              value={settings.demoSpeed}
              onChange={(e) => setSettings({ ...settings, demoSpeed: parseFloat(e.target.value) })}
              className="w-full"
            />
            <div className="flex justify-between" style={{ fontSize: "10px", color: "var(--text-muted)" }}>
              <span>0.5x</span><span>1x</span><span>1.5x</span><span>2x</span>
            </div>
          </div>

          {/* System info */}
          <div
            className="rounded-lg p-3"
            style={{ background: "var(--bg-surface-2)", border: "1px solid var(--border)" }}
          >
            <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px" }}>
              System Info
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between" style={{ fontSize: "12px" }}>
                <span style={{ color: "var(--text-secondary)" }}>Model</span>
                <span className="font-mono" style={{ color: "var(--text-primary)" }}>
                  {backendModel || (healthStatus === "error" ? "Unknown (offline)" : "Checking...")}
                </span>
              </div>
              <div className="flex justify-between items-center" style={{ fontSize: "12px" }}>
                <span style={{ color: "var(--text-secondary)" }}>API</span>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full" style={{
                    backgroundColor: healthStatus === "ok" ? "#1D9E75" : healthStatus === "checking" ? "#EF9F27" : "#E24B4A"
                  }} />
                  <span className="font-mono" style={{ color: "var(--text-primary)" }}>
                    {healthStatus === "ok" ? "Connected" : healthStatus === "checking" ? "Checking..." : "Offline"}
                  </span>
                </div>
              </div>
              {healthDetail && (
                <div className="flex justify-between" style={{ fontSize: "12px" }}>
                  <span style={{ color: "var(--text-secondary)" }}>Status</span>
                  <span className="font-mono" style={{ color: "var(--text-primary)" }}>{healthDetail}</span>
                </div>
              )}
              <div className="flex justify-between" style={{ fontSize: "12px" }}>
                <span style={{ color: "var(--text-secondary)" }}>Platform</span>
                <span className="font-mono" style={{ color: "var(--text-primary)" }}>Google ADK + A2A</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} className="btn-ghost px-4 py-2 rounded-lg text-sm">
            Cancel
          </button>
          <button onClick={handleSave} className="btn-primary px-4 py-2 rounded-lg text-sm">
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
