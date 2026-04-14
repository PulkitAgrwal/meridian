"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ReasoningStep } from "@/lib/types";

interface Props {
  reasoningSteps: ReasoningStep[];
  eventId?: string;
}

export default function ExportMenu({ reasoningSteps, eventId }: Props) {
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const downloadJSON = useCallback(() => {
    const blob = new Blob([JSON.stringify(reasoningSteps, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "reasoning_log.json";
    a.click();
    URL.revokeObjectURL(url);
    setOpen(false);
  }, [reasoningSteps]);

  const downloadCSV = useCallback(() => {
    const header = "id,agent,stepType,description,timestamp,severity\n";
    const rows = reasoningSteps.map((s) =>
      `"${s.id}","${s.agent}","${s.stepType}","${s.description.replace(/"/g, '""')}",${s.timestamp},"${s.severity || ""}"`
    ).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "reasoning_log.csv";
    a.click();
    URL.revokeObjectURL(url);
    setOpen(false);
  }, [reasoningSteps]);

  const downloadPDF = useCallback(async () => {
    try {
      const { default: jsPDF } = await import("jspdf");
      const doc = new jsPDF();
      const m = 20;
      const pw = 170;
      let y = m;

      const addPage = () => { doc.addPage(); y = m; };
      const checkPage = (need: number) => { if (y + need > 275) addPage(); };
      const drawRect = (x: number, yy: number, w: number, h: number, color: string) => {
        doc.setFillColor(color);
        doc.rect(x, yy, w, h, "F");
      };

      // Title bar
      drawRect(0, 0, 210, 32, "#0F172A");
      doc.setTextColor("#FFFFFF");
      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");
      doc.text("Meridian Intelligence Platform", m, 15);
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.text("Disruption Impact Report", m, 23);
      doc.setFontSize(8);
      doc.text(new Date().toLocaleString(), 210 - m, 23, { align: "right" });
      y = 42;

      // Severity badge
      doc.setTextColor("#000000");
      drawRect(m, y, pw, 18, "#FEF2F2");
      drawRect(m, y, 4, 18, "#DC2626");
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor("#991B1B");
      doc.text("CRITICAL DISRUPTION", m + 10, y + 7);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text("Typhoon Gaemi \u2014 Malacca Strait | Severity: 0.92 | Confidence: 0.89", m + 10, y + 14);
      y += 26;

      // Executive Summary
      doc.setTextColor("#1E293B");
      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.text("Executive Summary", m, y); y += 8;
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor("#334155");
      const summaryLines = [
        "Typhoon Gaemi (Category 3) is approaching the Malacca Strait with sustained winds of",
        "185 km/h. Expected landfall in 48-72 hours. Singapore port showing 3.92x baseline",
        "congestion (47 vessels vs baseline 12). Cascade impacts predicted across 5 downstream",
        "ports with max delay of 5 days at Port Said.",
      ];
      for (const line of summaryLines) { doc.text(line, m, y); y += 5; }
      y += 6;

      // Cascade table
      doc.setTextColor("#1E293B");
      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.text("Cascade Impact Analysis", m, y); y += 8;

      drawRect(m, y, pw, 8, "#1E293B");
      doc.setTextColor("#FFFFFF");
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text("Port", m + 3, y + 5.5);
      doc.text("Delay", m + 55, y + 5.5);
      doc.text("Vessels", m + 85, y + 5.5);
      doc.text("Congestion", m + 115, y + 5.5);
      doc.text("Status", m + 148, y + 5.5);
      y += 8;

      const cascadeRows = [
        { port: "Singapore (SGSIN)", delay: "+2 days", vessels: "47", cong: "LONG_TAIL", status: "CRITICAL" },
        { port: "Colombo (LKCMB)", delay: "+3 days", vessels: "18", cong: "HIGH", status: "IMPACTED" },
        { port: "Chennai (INCHE)", delay: "+3.5 days", vessels: "12", cong: "MEDIUM", status: "ELEVATED" },
        { port: "JNPT Mumbai (INJNP)", delay: "+4 days", vessels: "21", cong: "HIGH", status: "IMPACTED" },
        { port: "Port Said (EGPSD)", delay: "+5 days", vessels: "15", cong: "MEDIUM", status: "ELEVATED" },
      ];

      doc.setFont("helvetica", "normal");
      for (let i = 0; i < cascadeRows.length; i++) {
        const row = cascadeRows[i];
        drawRect(m, y, pw, 7, i % 2 === 0 ? "#F8FAFC" : "#FFFFFF");
        doc.setTextColor("#334155");
        doc.setFontSize(8);
        doc.text(row.port, m + 3, y + 5);
        doc.text(row.delay, m + 55, y + 5);
        doc.text(row.vessels, m + 85, y + 5);
        doc.text(row.cong, m + 115, y + 5);
        const sc = row.status === "CRITICAL" ? "#DC2626" : row.status === "IMPACTED" ? "#F59E0B" : "#3B82F6";
        doc.setTextColor(sc);
        doc.setFont("helvetica", "bold");
        doc.text(row.status, m + 148, y + 5);
        doc.setFont("helvetica", "normal");
        y += 7;
      }
      y += 8;

      // Route alternatives table
      checkPage(50);
      doc.setTextColor("#1E293B");
      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.text("Route Alternatives", m, y); y += 8;

      drawRect(m, y, pw, 8, "#1E293B");
      doc.setTextColor("#FFFFFF");
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text("Route", m + 3, y + 5.5);
      doc.text("Time Delta", m + 60, y + 5.5);
      doc.text("Cost Delta", m + 95, y + 5.5);
      doc.text("Risk", m + 130, y + 5.5);
      doc.text("Rec.", m + 155, y + 5.5);
      y += 8;

      const routeRows = [
        { name: "Lombok Strait bypass", time: "+18 hrs", cost: "+$12,000", risk: "LOW (0.25)", rec: true },
        { name: "Hold at anchorage", time: "+72 hrs", cost: "$0", risk: "LOW (0.15)", rec: false },
        { name: "Sunda Strait bypass", time: "+24 hrs", cost: "+$8,000", risk: "HIGH (0.45)", rec: false },
      ];

      doc.setFont("helvetica", "normal");
      for (let i = 0; i < routeRows.length; i++) {
        const row = routeRows[i];
        drawRect(m, y, pw, 7, row.rec ? "#F0FDF4" : i % 2 === 0 ? "#F8FAFC" : "#FFFFFF");
        doc.setTextColor("#334155");
        doc.setFontSize(8);
        doc.setFont("helvetica", row.rec ? "bold" : "normal");
        doc.text(row.name, m + 3, y + 5);
        doc.setFont("helvetica", "normal");
        doc.text(row.time, m + 60, y + 5);
        doc.text(row.cost, m + 95, y + 5);
        doc.text(row.risk, m + 130, y + 5);
        if (row.rec) { doc.setTextColor("#16A34A"); doc.setFont("helvetica", "bold"); }
        doc.text(row.rec ? "YES" : "\u2014", m + 155, y + 5);
        doc.setFont("helvetica", "normal");
        y += 7;
      }
      y += 8;

      // Humanitarian Priority
      checkPage(40);
      drawRect(m, y, pw, 24, "#FFF7ED");
      drawRect(m, y, 4, 24, "#EA580C");
      doc.setTextColor("#9A3412");
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("Humanitarian Cargo Priority \u2014 ACTIVE", m + 10, y + 7);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text("3 critical medical shipments | Scoring: 0.60*time + 0.10*cost + 0.30*risk", m + 10, y + 14);
      doc.text("MV Chennai Express (Insulin/IV) | MV Pacific Med (Ventilators) | MV SG Pharma (Vaccines)", m + 10, y + 20);
      y += 32;

      // Reasoning trace
      checkPage(30);
      doc.setTextColor("#1E293B");
      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.text("Agent Reasoning Trace", m, y); y += 2;

      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      const agentColors: Record<string, string> = {
        sentinel: "#3B82F6", analyst: "#8B5CF6",
        optimizer: "#F59E0B", communicator: "#10B981",
      };

      for (const step of reasoningSteps.slice(0, 20)) {
        checkPage(8);
        y += 5;
        const ts = `${Math.floor(step.timestamp / 1000)}s`;
        const agent = step.agent.toUpperCase();
        const color = agentColors[step.agent] || "#64748B";

        doc.setTextColor(color);
        doc.setFont("helvetica", "bold");
        doc.text(`[${ts}] ${agent}`, m, y);
        doc.setTextColor("#334155");
        doc.setFont("helvetica", "normal");
        const descX = m + 35;
        const maxW = pw - 35;
        const lines = doc.splitTextToSize(step.description, maxW);
        doc.text(lines, descX, y);
        y += lines.length * 4;
      }

      // Footer
      y += 10;
      checkPage(15);
      doc.setDrawColor("#CBD5E1");
      doc.line(m, y, m + pw, y);
      y += 6;
      doc.setFontSize(8);
      doc.setTextColor("#94A3B8");
      doc.text("Generated by Meridian | Powered by Google ADK + A2A + Gemini", m, y);
      doc.text("chainsight-40326.web.app", 210 - m, y, { align: "right" });

      doc.save(`meridian-report-${eventId || "evt_7f3a"}.pdf`);
      setOpen(false);
    } catch {
      showToast("PDF generation unavailable");
      setOpen(false);
    }
  }, [reasoningSteps, eventId]);

  const copyLink = useCallback(() => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      showToast("Link copied");
    });
    setOpen(false);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="btn-ghost p-2 rounded-lg"
        aria-label="Export and share"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
          <polyline points="16 6 12 2 8 6" />
          <line x1="12" y1="2" x2="12" y2="15" />
        </svg>
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-1 w-56 rounded-lg py-1 z-50 animate-slide-up"
          style={{
            background: "var(--bg-surface-1)",
            border: "1px solid var(--border)",
            boxShadow: "0 8px 30px rgba(0,0,0,0.4)",
          }}
        >
          <button onClick={downloadPDF} className="w-full text-left px-3 py-2 text-xs flex items-center gap-2 transition-colors" style={{ color: "var(--text-secondary)" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-surface-2)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
            Download PDF Report
          </button>
          <button onClick={downloadJSON} className="w-full text-left px-3 py-2 text-xs flex items-center gap-2 transition-colors" style={{ color: "var(--text-secondary)" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-surface-2)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
            Export Reasoning (JSON)
          </button>
          <button onClick={downloadCSV} className="w-full text-left px-3 py-2 text-xs flex items-center gap-2 transition-colors" style={{ color: "var(--text-secondary)" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-surface-2)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
            Export Reasoning (CSV)
          </button>
          <div style={{ borderTop: "1px solid var(--border)", margin: "4px 0" }} />
          <button onClick={copyLink} className="w-full text-left px-3 py-2 text-xs flex items-center gap-2 transition-colors" style={{ color: "var(--text-secondary)" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-surface-2)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
            Copy Link
          </button>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
