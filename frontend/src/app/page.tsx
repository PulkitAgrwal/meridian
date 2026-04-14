"use client";

import { useCallback, useEffect, useState } from "react";
import { useDemo } from "@/lib/use-demo";
import type { RightPanelTab, SettingsState } from "@/lib/types";
import { CORRIDORS, CORRIDOR_COLORS } from "@/lib/demo-data";
import AgentStatus from "@/components/AgentStatus";
import ReasoningPanel from "@/components/ReasoningPanel";
import TimelinePanel from "@/components/TimelinePanel";
import ChatPanel from "@/components/ChatPanel";
import RouteAlternatives from "@/components/RouteAlternatives";
import AlertBanner from "@/components/AlertBanner";
import MapView from "@/components/MapView";
import ThemeToggle from "@/components/ThemeToggle";
import ExportMenu from "@/components/ExportMenu";
import SettingsModal from "@/components/SettingsModal";
import MobileNotification from "@/components/MobileNotification";
import HumanitarianOverlay from "@/components/HumanitarianOverlay";
import KeyboardShortcutsModal from "@/components/KeyboardShortcutsModal";
import HowItWorksModal from "@/components/HowItWorksModal";
import FloatingChat from "@/components/FloatingChat";

function formatRelativeTime(date: Date): string {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 5) return "just now";
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

export default function WarRoom() {
  const { state, runDemo, reset, selectRoute, setIsLiveMode } = useDemo();
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [leftSidebarOpen] = useState(true);
  const [rightTab, setRightTab] = useState<RightPanelTab>("reasoning");
  const [alertDismissed, setAlertDismissed] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [settings, setSettings] = useState<SettingsState>({ apiUrl: "", demoSpeed: 1 });
  const [toast, setToast] = useState<string | null>(null);
  const [showNotification, setShowNotification] = useState(false);
  const [showHumanitarian, setShowHumanitarian] = useState(false);
  const [howItWorksOpen, setHowItWorksOpen] = useState(false);
  const [isDark, setIsDark] = useState(true);
  const [liveToggling, setLiveToggling] = useState(false);
  const [lastScanTime, setLastScanTime] = useState<Date | null>(null);
  const [liveCorridorData, setLiveCorridorData] = useState<Record<string, { active_vessels: number; risk_score: number; status: string }> | null>(null);
  const [dataSource, setDataSource] = useState<"live" | "synthetic" | "offline">("offline");
  const [apiHealth, setApiHealth] = useState<{ status: string; vessel_count?: number; ais_source?: string; model?: string } | null>(null);

  // Load settings from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("meridian-settings");
      if (stored) setSettings(JSON.parse(stored));
      // Restore live mode preference
      const liveStored = localStorage.getItem("meridian-live-mode");
      if (liveStored === "true") {
        setIsLiveMode(true);
      }
    } catch { /* ignore */ }
  }, [setIsLiveMode]);

  // Fetch live corridor + vessel data on page load and after demo completes
  useEffect(() => {
    const apiBase = settings.apiUrl || process.env.NEXT_PUBLIC_ORCHESTRATOR_URL || "https://chainsight-orchestrator-rbfgggserq-el.a.run.app";
    const fetchLiveData = async () => {
      try {
        const [corridorsRes, healthRes] = await Promise.all([
          fetch(`${apiBase}/api/v1/corridors`, { signal: AbortSignal.timeout(15000) }).then(r => r.ok ? r.json() : null).catch(() => null),
          fetch(`${apiBase}/health`, { signal: AbortSignal.timeout(15000) }).then(r => r.ok ? r.json() : null).catch(() => null),
        ]);
        if (corridorsRes?.corridors) {
          setLiveCorridorData(corridorsRes.corridors);
          setDataSource(corridorsRes.source === "live" ? "live" : "synthetic");
        }
        if (healthRes) {
          setApiHealth(healthRes);
        }
        setLastScanTime(new Date());
      } catch {
        setDataSource("offline");
      }
    };
    fetchLiveData();
  }, [settings.apiUrl, state.currentPhase]);

  // Track theme state by observing data-theme attribute
  useEffect(() => {
    const check = () => {
      const theme = document.documentElement.getAttribute("data-theme");
      setIsDark(theme !== "light");
    };
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  // Mobile push notification simulation — ~15s into demo
  useEffect(() => {
    if (state.currentPhase === "communication" && state.alertVisible) {
      const timer = setTimeout(() => setShowNotification(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [state.currentPhase, state.alertVisible]);

  // Humanitarian overlay — after demo complete + route selected (or after 20s)
  useEffect(() => {
    if (state.currentPhase === "complete") {
      const timer = setTimeout(() => setShowHumanitarian(true), 4000);
      return () => clearTimeout(timer);
    }
  }, [state.currentPhase]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }, []);

  // LIVE/DEMO toggle handler
  const handleToggleLiveMode = useCallback(async () => {
    if (liveToggling) return;
    if (state.isLiveMode) {
      // Switch back to DEMO
      setIsLiveMode(false);
      localStorage.setItem("meridian-live-mode", "false");
      showToast("Switched to Scenario mode");
      return;
    }
    // Try to switch to LIVE — test API first
    setLiveToggling(true);
    const apiBase = settings.apiUrl || process.env.NEXT_PUBLIC_ORCHESTRATOR_URL || "https://chainsight-orchestrator-rbfgggserq-el.a.run.app";
    try {
      const res = await fetch(`${apiBase}/health`, {
        signal: AbortSignal.timeout(15000),
      });
      if (res.ok) {
        setIsLiveMode(true);
        localStorage.setItem("meridian-live-mode", "true");
        showToast("Switched to Live mode");
      } else {
        showToast("API unavailable, staying in scenario mode");
      }
    } catch {
      showToast("API unavailable, staying in scenario mode");
    } finally {
      setLiveToggling(false);
    }
  }, [liveToggling, state.isLiveMode, setIsLiveMode, settings.apiUrl, showToast]);

  const handleRunDemo = useCallback(() => {
    if (state.isRunning) {
      showToast("Demo already running");
      return;
    }
    setAlertDismissed(false);
    setShowNotification(false);
    setShowHumanitarian(false);
    runDemo(settings.demoSpeed);
  }, [runDemo, state.isRunning, settings.demoSpeed, showToast]);

  const handleReset = useCallback(() => {
    setAlertDismissed(false);
    setShowNotification(false);
    setShowHumanitarian(false);
    reset();
  }, [reset]);

  // PDF download helper
  const handleDownloadPDF = useCallback(async () => {
    try {
      const { default: jsPDF } = await import("jspdf");
      const doc = new jsPDF();
      const margin = 20;
      let y = margin;

      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text("Meridian Intelligence Platform", margin, y);
      y += 8;
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.text("Disruption Impact Report", margin, y);
      y += 12;
      doc.line(margin, y, 190, y);
      y += 10;

      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Executive Summary", margin, y);
      y += 8;
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text("Event: Typhoon Gaemi — Malacca Strait Disruption", margin, y); y += 6;
      doc.text("Severity: CRITICAL (0.92)", margin, y); y += 6;
      doc.text("Corridor: Asia-Europe (Malacca / Suez)", margin, y); y += 6;
      doc.text(`Generated: ${new Date().toISOString()}`, margin, y); y += 12;

      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Cascade Analysis", margin, y);
      y += 8;
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      for (const c of state.cascadeImpacts) {
        doc.text(`  - ${c.port_name}: +${c.delay_days} days delay, ${c.vessels} vessels (${c.congestion})`, margin, y);
        y += 6;
      }
      y += 6;

      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Route Alternatives", margin, y);
      y += 8;
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      for (const r of state.alternatives) {
        doc.text(`  - ${r.name}: +${r.time_delta_hrs}h, +$${r.cost_delta_usd}, risk=${r.risk_score}${r.recommended ? " (RECOMMENDED)" : ""}`, margin, y);
        y += 6;
      }
      y += 6;

      // Humanitarian impact section
      if (state.humanitarianPriorityActive) {
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(226, 75, 74);
        doc.text("Humanitarian Cargo Priority", margin, y);
        y += 8;
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(0, 0, 0);
        doc.text("  Status: ACTIVE — 3 critical medical shipments detected", margin, y); y += 6;
        doc.text("  Scoring: 0.60*time + 0.10*cost + 0.30*risk (speed over cost)", margin, y); y += 6;
        doc.text("  Vessels: MV Chennai Express (Insulin/IV), MV Pacific Med (Ventilators), MV SG Pharma (Vaccines)", margin, y); y += 6;
        doc.text("  Population at risk: 119,000", margin, y); y += 12;
      }

      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Agent Reasoning Trace", margin, y);
      y += 8;
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      for (const step of state.reasoningSteps.slice(0, 15)) {
        if (y > 270) { doc.addPage(); y = margin; }
        doc.text(`[${Math.floor(step.timestamp / 1000)}s] ${step.agent.toUpperCase()}: ${step.description}`, margin, y);
        y += 5;
      }
      y += 8;
      doc.line(margin, y, 190, y);
      y += 6;
      doc.setFontSize(8);
      doc.text("Generated by Meridian | Powered by Google ADK + Gemini", margin, y);

      doc.save("meridian-report-evt_7f3a.pdf");
    } catch {
      showToast("PDF generation failed");
    }
  }, [state.cascadeImpacts, state.alternatives, state.reasoningSteps, state.humanitarianPriorityActive, showToast]);

  const handleExportJSON = useCallback(() => {
    const blob = new Blob([JSON.stringify(state.reasoningSteps, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "reasoning_log.json";
    a.click();
    URL.revokeObjectURL(url);
  }, [state.reasoningSteps]);

  const handleExportCSV = useCallback(() => {
    const header = "id,agent,stepType,description,timestamp,severity\n";
    const rows = state.reasoningSteps.map((s) =>
      `"${s.id}","${s.agent}","${s.stepType}","${s.description.replace(/"/g, '""')}",${s.timestamp},"${s.severity || ""}"`
    ).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "reasoning_log.csv";
    a.click();
    URL.revokeObjectURL(url);
  }, [state.reasoningSteps]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't trigger in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;

      switch (e.key) {
        case " ":
          e.preventDefault();
          handleRunDemo();
          break;
        case "r":
        case "R":
          handleReset();
          break;
        case "l":
        case "L":
          setRightPanelOpen((p) => !p);
          break;
        case "c":
        case "C":
          setRightTab("chat");
          setRightPanelOpen(true);
          break;
        case "t":
        case "T": {
          const toggle = document.querySelector("[data-testid='theme-toggle']") as HTMLButtonElement;
          if (toggle) toggle.click();
          break;
        }
        case "?":
          setShortcutsOpen((p) => !p);
          break;
        case "h":
        case "H":
          setHowItWorksOpen((p) => !p);
          break;
        case "Escape":
          setSettingsOpen(false);
          setShortcutsOpen(false);
          setShowHumanitarian(false);
          setHowItWorksOpen(false);
          break;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleRunDemo, handleReset]);

  // Corridor status for sidebar
  const corridorStatuses = state.corridorStatuses;

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* ── Header (56px, sticky, blur backdrop) ── */}
      <header
        className="flex items-center justify-between flex-wrap gap-2 px-4 z-20"
        style={{
          height: "56px",
          background: "rgba(var(--bg-surface-1-rgb, 17, 21, 24), 0.85)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid var(--border)",
          backgroundColor: "var(--bg-surface-1)",
        }}
      >
        {/* LEFT: Meridian brand + LIVE/DEMO badge */}
        <div className="flex items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 style={{ fontSize: "18px", fontWeight: 600, color: "var(--text-primary)", fontFamily: "var(--font-inter)", lineHeight: 1.2 }}>
                Meridian
              </h1>
              <button
                onClick={handleToggleLiveMode}
                disabled={liveToggling}
                className="flex items-center gap-1.5 font-mono uppercase px-2 py-1 rounded-full cursor-pointer transition-all"
                style={{
                  fontSize: "9px",
                  fontWeight: 700,
                  backgroundColor: state.isLiveMode ? "rgba(29,158,117,0.15)" : "rgba(239,159,39,0.15)",
                  color: state.isLiveMode ? "#1D9E75" : "#EF9F27",
                  border: `1px solid ${state.isLiveMode ? "rgba(29,158,117,0.3)" : "rgba(239,159,39,0.3)"}`,
                  opacity: liveToggling ? 0.6 : 1,
                }}
                aria-label={`Switch to ${state.isLiveMode ? "demo" : "live"} mode`}
                data-testid="live-demo-toggle"
              >
                {state.isLiveMode && (
                  <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: "#1D9E75" }} />
                )}
                {liveToggling ? "..." : state.isLiveMode ? "LIVE" : "SCENARIO"}
              </button>
            </div>
            <p className="font-mono uppercase" style={{ fontSize: "10px", color: "var(--text-muted)", letterSpacing: "2px" }}>
              WAR ROOM
            </p>
          </div>
          {/* Agent timing badges — show after agents complete */}
          {state.currentPhase !== "idle" && (
            <div className="hidden xl:flex items-center gap-1.5 ml-2">
              {(["sentinel", "analyst", "optimizer", "communicator"] as const).map((agent) => {
                const ms = state.agentTimings[agent];
                if (!ms) return null;
                const color = agent === "sentinel" ? "#3B8BD4" : agent === "analyst" ? "#7F77DD" : agent === "optimizer" ? "#1D9E75" : "#D85A30";
                return (
                  <span
                    key={agent}
                    className="font-mono px-1.5 py-0.5 rounded"
                    style={{ fontSize: "9px", background: `${color}15`, color, border: `1px solid ${color}30` }}
                  >
                    {agent.charAt(0).toUpperCase()}: {(ms / 1000).toFixed(1)}s
                  </span>
                );
              })}
            </div>
          )}
        </div>

        {/* CENTER: Agent status pills */}
        <AgentStatus statuses={state.agentStatuses} />

        {/* RIGHT: Button cluster */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleRunDemo}
            disabled={state.isRunning}
            className={`btn text-xs font-semibold rounded-lg px-4 py-2 ${
              state.isRunning ? "" : "btn-primary"
            }`}
            style={state.isRunning ? {
              background: "var(--bg-surface-3)",
              color: "var(--text-muted)",
              cursor: "not-allowed",
            } : undefined}
          >
            {state.isRunning ? "Running..." : state.currentPhase === "complete" ? "Re-run Scenario" : "Run Typhoon Scenario"}
          </button>
          {(state.currentPhase === "complete" || state.currentPhase !== "idle") && (
            <button
              onClick={handleReset}
              className="btn-ghost text-xs px-3 py-2 rounded-lg"
            >
              Reset
            </button>
          )}
          {state.currentPhase === "complete" && (
            <button
              onClick={() => {
                setRightTab("chat");
                setRightPanelOpen(true);
              }}
              className="btn-ghost text-xs px-3 py-2 rounded-lg"
              style={{ color: "#1D9E75", border: "1px solid rgba(29,158,117,0.3)" }}
            >
              Try Live
            </button>
          )}
          <button
            onClick={() => setHowItWorksOpen(true)}
            className="btn-ghost text-xs px-3 py-2 rounded-lg hidden sm:inline-flex"
          >
            How It Works
          </button>
          <ThemeToggle />
          <button
            onClick={() => setSettingsOpen(true)}
            className="btn-ghost p-2 rounded-lg"
            aria-label="Settings"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
          <ExportMenu reasoningSteps={state.reasoningSteps} />
        </div>
      </header>

      {/* ── Alert Banner ── */}
      <AlertBanner
        visible={state.alertVisible && !alertDismissed}
        severity={state.alertSeverity}
        title={state.alertTitle}
        onDismiss={() => setAlertDismissed(true)}
      />

      {/* ── Main Content: 3-column layout ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar (280px) */}
        {leftSidebarOpen && (
          <aside
            className="flex-shrink-0 overflow-y-auto hidden lg:block"
            style={{
              width: "280px",
              background: "var(--bg-surface-1)",
              borderRight: "1px solid var(--border)",
            }}
          >
            {/* System Status */}
            <div className="p-4" style={{ borderBottom: "1px solid var(--border)" }}>
              <div className="uppercase tracking-wider mb-3" style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)", letterSpacing: "1.5px" }}>
                System Status
              </div>
              <div className="space-y-2.5">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full ${state.disruptionActive ? "animate-pulse" : ""}`}
                    style={{ backgroundColor: state.disruptionActive ? "#E24B4A" : "#1D9E75" }}
                  />
                  <span style={{ fontSize: "13px", color: "var(--text-primary)" }}>
                    {state.disruptionActive ? "Disruption Active" : "Monitoring"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Model</span>
                  <span className="font-mono" style={{ fontSize: "11px", color: "var(--text-primary)" }}>
                    {apiHealth?.model || (apiHealth ? "Unknown" : "Connecting...")}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>API</span>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: apiHealth?.status === "ok" ? "#1D9E75" : "#E24B4A" }} />
                    <span className="font-mono" style={{ fontSize: "11px", color: "var(--text-primary)" }}>
                      {apiHealth?.status === "ok" ? "Connected" : "Offline"}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>AIS</span>
                  <div className="flex items-center gap-1.5">
                    {apiHealth?.ais_source && (
                      <div
                        className={`w-1.5 h-1.5 rounded-full ${apiHealth.ais_source === "live" ? "animate-pulse" : ""}`}
                        style={{ backgroundColor: apiHealth.ais_source === "live" ? "#1D9E75" : "#3B82F6" }}
                        title={apiHealth.ais_source === "live"
                          ? "Receiving live AIS vessel data"
                          : "Running synthetic maritime scenario for demonstration. Connect AISStream.io API key for live vessel data."}
                      />
                    )}
                    <span className="font-mono" style={{ fontSize: "11px", color: "var(--text-primary)" }}>
                      {apiHealth?.ais_source === "live"
                        ? `Live (${apiHealth?.vessel_count ?? 0})`
                        : apiHealth?.ais_source
                          ? `Synthetic (${apiHealth?.vessel_count ?? 0})`
                          : "—"}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Last scan</span>
                  <span className="font-mono" style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                    {state.isRunning ? "now" : lastScanTime ? formatRelativeTime(lastScanTime) : "Awaiting..."}
                  </span>
                </div>
              </div>
            </div>

            {/* Corridors */}
            <div className="p-4" style={{ borderBottom: "1px solid var(--border)" }}>
              <div className="uppercase tracking-wider mb-3" style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)", letterSpacing: "1.5px" }}>
                Corridors
              </div>
              <div className="space-y-2">
                {CORRIDORS.map((corridor) => {
                  const cStatus = corridorStatuses[corridor.id] || "NORMAL";
                  const color = CORRIDOR_COLORS[corridor.id];
                  const liveC = liveCorridorData?.[corridor.id];
                  const vesselCount = liveC?.active_vessels ?? (corridor.id === "asia-europe" && state.disruptionActive ? 47 : corridor.waypoints.length * 3);
                  const riskScore = liveC?.risk_score ?? (cStatus === "DISRUPTED" ? 0.92 : cStatus === "ELEVATED" ? 0.6 : 0.15);
                  const statusColor = cStatus === "DISRUPTED" ? "#E24B4A" : cStatus === "ELEVATED" ? "#EF9F27" : "#1D9E75";

                  return (
                    <div
                      key={corridor.id}
                      className="rounded-lg p-3 cursor-pointer transition-all"
                      style={{
                        background: "var(--bg-surface-2)",
                        border: "1px solid var(--border)",
                      }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-0.5 rounded" style={{ backgroundColor: color }} />
                          <span style={{ fontSize: "13px", fontWeight: 500, color: "var(--text-primary)" }}>
                            {corridor.name}
                          </span>
                        </div>
                        <span
                          className="font-mono uppercase px-1.5 py-0.5 rounded"
                          style={{
                            fontSize: "9px",
                            fontWeight: 700,
                            backgroundColor: `${statusColor}20`,
                            color: statusColor,
                          }}
                        >
                          {cStatus}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>{vesselCount} vessels</span>
                        <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>Risk: {riskScore.toFixed(2)}</span>
                      </div>
                      {/* Risk progress bar */}
                      <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: "var(--bg-surface-3)" }}>
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.max(riskScore * 100, 8)}%`,
                            backgroundColor: statusColor,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Active Alerts */}
            <div className="p-4">
              <div className="uppercase tracking-wider mb-3" style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)", letterSpacing: "1.5px" }}>
                Active Alerts
              </div>
              {state.alertVisible ? (
                <div
                  className="rounded-lg p-3"
                  style={{
                    background: "rgba(226,75,74,0.08)",
                    border: "1px solid rgba(226,75,74,0.2)",
                  }}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <span
                      className="font-mono uppercase px-1.5 py-0.5 rounded animate-severity-pulse"
                      style={{ fontSize: "9px", fontWeight: 700, backgroundColor: "rgba(226,75,74,0.2)", color: "#E24B4A" }}
                    >
                      CRITICAL
                    </span>
                  </div>
                  <p style={{ fontSize: "12px", color: "var(--text-primary)", marginBottom: "4px" }}>
                    Typhoon Gaemi — Malacca Strait
                  </p>
                  <span className="font-mono" style={{ fontSize: "10px", color: "var(--text-muted)" }}>
                    {lastScanTime ? formatRelativeTime(lastScanTime) : "active"}
                  </span>
                </div>
              ) : (
                <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>No active alerts</p>
              )}
            </div>
          </aside>
        )}

        {/* Center: Map */}
        <div className="flex-1 relative flex flex-col">
          <div className="flex-1 relative">
            <MapView
              disruptionActive={state.disruptionActive}
              cascadeImpacts={state.cascadeImpacts}
              alternatives={state.alternatives}
              selectedRouteId={state.selectedRouteId}
              isDark={isDark}
            />

            {/* Humanitarian overlay */}
            <HumanitarianOverlay
              visible={showHumanitarian}
              onDismiss={() => setShowHumanitarian(false)}
            />

            {/* Map legend (bottom-left) */}
            <div
              className="absolute bottom-4 left-4 z-10 rounded-lg px-3 py-2.5"
              style={{
                background: "var(--bg-surface-1)",
                border: "1px solid var(--border)",
                boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
                backdropFilter: "blur(8px)",
                opacity: 0.95,
              }}
            >
              <div className="font-mono uppercase tracking-wider mb-1.5" style={{ fontSize: "10px", color: "var(--text-muted)" }}>
                Corridors
              </div>
              {CORRIDORS.map((c) => (
                <div key={c.id} className="flex items-center gap-2 py-0.5">
                  <div className="w-4 h-0.5 rounded" style={{ backgroundColor: CORRIDOR_COLORS[c.id] }} />
                  <span style={{ fontSize: "10px", color: "var(--text-secondary)" }}>{c.name}</span>
                </div>
              ))}

              <div style={{ borderTop: "1px solid var(--border)", margin: "6px 0" }} />

              <div className="font-mono uppercase tracking-wider mb-1.5" style={{ fontSize: "10px", color: "var(--text-muted)" }}>
                Markers
              </div>
              <div className="flex items-center gap-2 py-0.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "#E24B4A", opacity: 0.7 }} />
                <span style={{ fontSize: "10px", color: "var(--text-secondary)" }}>Disruption zone</span>
              </div>
              <div className="flex items-center gap-2 py-0.5">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "#E24B4A", border: "1px solid #E24B4A" }} />
                <span style={{ fontSize: "10px", color: "var(--text-secondary)" }}>Affected port</span>
              </div>
              <div className="flex items-center gap-2 py-0.5">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "#888" }} />
                <span style={{ fontSize: "10px", color: "var(--text-secondary)" }}>Normal port</span>
              </div>
              <div className="flex items-center gap-2 py-0.5">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "#4A90D9" }} />
                <span style={{ fontSize: "10px", color: "var(--text-secondary)" }}>Tracked vessel</span>
              </div>
              <div className="flex items-center gap-2 py-0.5">
                <div className="w-4 h-0.5 rounded" style={{ backgroundColor: "#EF9F27" }} />
                <span style={{ fontSize: "10px", color: "var(--text-secondary)" }}>Alt. route</span>
              </div>
            </div>

            {/* Floating chat FAB */}
            <FloatingChat
              apiUrl={settings.apiUrl || undefined}
              demoComplete={state.currentPhase === "complete"}
              isLiveMode={state.isLiveMode}
            />
          </div>

          {/* Bottom Panel: Route Alternatives */}
          {state.alternatives.length > 0 && (
            <RouteAlternatives
              alternatives={state.alternatives}
              selectedId={state.selectedRouteId}
              onSelect={selectRoute}
              onDownloadPDF={handleDownloadPDF}
              onExportJSON={handleExportJSON}
              onExportCSV={handleExportCSV}
              humanitarianActive={state.humanitarianPriorityActive}
            />
          )}
        </div>

        {/* Right Panel (360px) */}
        {rightPanelOpen && (
          <aside
            className="flex-shrink-0 flex flex-col hidden lg:flex"
            style={{
              width: "360px",
              background: "var(--bg-surface-1)",
              borderLeft: "1px solid var(--border)",
            }}
          >
            {/* Tab bar */}
            <div className="flex" style={{ borderBottom: "1px solid var(--border)" }}>
              {(["reasoning", "timeline", "chat"] as RightPanelTab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setRightTab(tab)}
                  className="flex-1 py-2.5 text-center capitalize transition-colors"
                  style={{
                    fontSize: "12px",
                    fontWeight: rightTab === tab ? 600 : 400,
                    color: rightTab === tab ? "var(--text-primary)" : "var(--text-muted)",
                    borderBottom: rightTab === tab ? "2px solid var(--accent-sentinel)" : "2px solid transparent",
                  }}
                  data-testid={`${tab}-tab`}
                >
                  {tab === "reasoning" ? "Reasoning" : tab === "timeline" ? "Timeline" : "Chat"}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-hidden">
              {rightTab === "reasoning" && (
                <ReasoningPanel steps={state.reasoningSteps} isRunning={state.isRunning} />
              )}
              {rightTab === "timeline" && (
                <TimelinePanel events={state.timelineEvents} />
              )}
              {rightTab === "chat" && (
                <ChatPanel apiUrl={settings.apiUrl || undefined} isLiveMode={state.isLiveMode} />
              )}
            </div>
          </aside>
        )}
      </div>

      {/* ── Modals ── */}
      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onSave={setSettings}
      />
      <KeyboardShortcutsModal
        open={shortcutsOpen}
        onClose={() => setShortcutsOpen(false)}
      />
      <HowItWorksModal
        open={howItWorksOpen}
        onClose={() => setHowItWorksOpen(false)}
      />

      {/* ── Mobile push notification ── */}
      <MobileNotification
        visible={showNotification}
        onDismiss={() => setShowNotification(false)}
      />

      {/* ── Toast ── */}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
