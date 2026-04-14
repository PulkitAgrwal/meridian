export type AgentName = "sentinel" | "analyst" | "optimizer" | "communicator";

export type AgentStatusValue = "idle" | "active" | "done" | "error";

export type DemoPhase = "idle" | "detection" | "analysis" | "optimization" | "communication" | "complete";

export type ThemeMode = "dark" | "light" | "system";

export type RightPanelTab = "reasoning" | "timeline" | "chat";

export interface ReasoningStep {
  id: string;
  agent: AgentName;
  stepType: string;
  description: string;
  data?: Record<string, unknown>;
  timestamp: number;
  severity?: string;
  isHandoff?: boolean;
  handoffFrom?: AgentName;
  handoffTo?: AgentName;
  handoffMessage?: string;
  isHumanitarian?: boolean;
  responseTimeMs?: number;
  model?: string;
}

export interface Port {
  id: string;
  name: string;
  lat: number;
  lng: number;
  capacity_teu: number;
  baseline_vessels: number;
  radius_km: number;
  country: string;
}

export interface Waypoint {
  id: string;
  name: string;
  lat: number;
  lng: number;
  type: string;
}

export interface Corridor {
  id: string;
  name: string;
  description: string;
  status: "NORMAL" | "ELEVATED" | "DISRUPTED";
  waypoints: Waypoint[];
}

export interface CascadeImpact {
  port_id: string;
  port_name: string;
  delay_days: number;
  congestion: string;
  vessels: number;
}

export interface RouteAlternative {
  id: string;
  name: string;
  time_delta_hrs: number;
  cost_delta_usd: number;
  risk_score: number;
  recommended: boolean;
  waypoints: { name: string; lat: number; lng: number }[];
}

export interface Vessel {
  id: string;
  lat: number;
  lng: number;
  portId: string;
}

export interface TimelineEvent {
  id: string;
  title: string;
  severity: string;
  timestamp: number;
  portsAffected: number;
  description: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

export interface DemoState {
  isRunning: boolean;
  currentPhase: DemoPhase;
  agentStatuses: Record<AgentName, AgentStatusValue>;
  reasoningSteps: ReasoningStep[];
  disruptionActive: boolean;
  cascadeImpacts: CascadeImpact[];
  alternatives: RouteAlternative[];
  alertVisible: boolean;
  alertSeverity: string;
  alertTitle: string;
  corridorStatuses: Record<string, "NORMAL" | "ELEVATED" | "DISRUPTED">;
  selectedRouteId: string | null;
  timelineEvents: TimelineEvent[];
  humanitarianPriorityActive: boolean;
  isLiveMode: boolean;
  agentTimings: Record<AgentName, number>;
}

export interface SettingsState {
  model: string;
  apiUrl: string;
  demoSpeed: number;
}

export const AGENT_COLORS: Record<AgentName, string> = {
  sentinel: "#3B8BD4",
  analyst: "#7F77DD",
  optimizer: "#1D9E75",
  communicator: "#D85A30",
};

export const AGENT_LABELS: Record<AgentName, string> = {
  sentinel: "Sentinel",
  analyst: "Analyst",
  optimizer: "Optimizer",
  communicator: "Communicator",
};
