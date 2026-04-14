"use client";

import type { AgentName, DemoState } from "@/lib/types";
import { AGENT_COLORS, AGENT_LABELS } from "@/lib/types";

interface Props {
  statuses: DemoState["agentStatuses"];
}

export default function AgentStatus({ statuses }: Props) {
  const agents: AgentName[] = ["sentinel", "analyst", "optimizer", "communicator"];

  return (
    <div className="flex items-center gap-2">
      {agents.map((agent) => {
        const status = statuses[agent];
        const color = AGENT_COLORS[agent];
        const isActive = status === "active";
        const isDone = status === "done";
        const isError = status === "error";

        return (
          <div
            key={agent}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all duration-300"
            style={{
              background: isActive ? `${color}14` : "transparent",
              border: `1px solid ${isActive ? `${color}40` : "var(--border)"}`,
            }}
          >
            {/* Status dot */}
            <div
              className={`w-1.5 h-1.5 rounded-full ${isActive ? "animate-pulse" : ""}`}
              style={{
                backgroundColor: isActive ? color : isDone ? "#1D9E75" : isError ? "#E24B4A" : "var(--text-muted)",
              }}
            />
            {/* Agent name */}
            <span
              className="text-xs hidden sm:inline"
              style={{
                fontFamily: "var(--font-inter)",
                fontWeight: 500,
                color: isActive ? color : "var(--text-secondary)",
              }}
            >
              {AGENT_LABELS[agent]}
            </span>
            {/* Status label */}
            <span
              className="text-[10px] font-mono uppercase tracking-wider hidden md:inline"
              style={{
                color: isActive ? color : isDone ? "#1D9E75" : isError ? "#E24B4A" : "var(--text-muted)",
              }}
            >
              {status}
            </span>
          </div>
        );
      })}
    </div>
  );
}
