"use client";

import { useCallback, useRef, useState } from "react";
import type { AgentName, DemoState, ReasoningStep, TimelineEvent } from "./types";
import { DEMO_REASONING_STEPS, DEMO_CASCADE, DEMO_ALTERNATIVES, DEMO_TIMELINE_EVENTS } from "./demo-data";

const INITIAL_STATE: DemoState = {
  isRunning: false,
  currentPhase: "idle",
  agentStatuses: { sentinel: "idle", analyst: "idle", optimizer: "idle", communicator: "idle" },
  reasoningSteps: [],
  disruptionActive: false,
  cascadeImpacts: [],
  alternatives: [],
  alertVisible: false,
  alertSeverity: "",
  alertTitle: "",
  corridorStatuses: { "asia-europe": "NORMAL", "us-india": "NORMAL", "intra-india": "NORMAL" },
  selectedRouteId: null,
  timelineEvents: [],
  humanitarianPriorityActive: false,
  isLiveMode: false,
  agentTimings: { sentinel: 0, analyst: 0, optimizer: 0, communicator: 0 },
};

export function useDemo() {
  const [state, setState] = useState<DemoState>(INITIAL_STATE);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const speedRef = useRef(1);

  const reset = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setState(INITIAL_STATE);
  }, []);

  const setAgentStatus = useCallback((agent: AgentName, status: DemoState["agentStatuses"][AgentName]) => {
    setState((s) => ({
      ...s,
      agentStatuses: { ...s.agentStatuses, [agent]: status },
    }));
  }, []);

  const addStep = useCallback((step: ReasoningStep) => {
    setState((s) => ({
      ...s,
      reasoningSteps: [...s.reasoningSteps, step],
    }));
  }, []);

  const addTimelineEvent = useCallback((event: TimelineEvent) => {
    setState((s) => ({
      ...s,
      timelineEvents: [...s.timelineEvents, event],
    }));
  }, []);

  const selectRoute = useCallback((routeId: string) => {
    setState((s) => ({ ...s, selectedRouteId: routeId }));
  }, []);

  const runDemo = useCallback((speed: number = 1) => {
    speedRef.current = speed;
    reset();
    const t = (ms: number) => ms / speed;

    setState((s) => ({ ...s, isRunning: true, currentPhase: "detection" }));

    // Schedule reasoning steps
    for (const step of DEMO_REASONING_STEPS) {
      const timer = setTimeout(() => addStep(step), t(step.timestamp));
      timers.current.push(timer);
    }

    // Schedule timeline events
    for (const event of DEMO_TIMELINE_EVENTS) {
      const timer = setTimeout(() => addTimelineEvent(event), t(event.timestamp));
      timers.current.push(timer);
    }

    // Detection phase: 0-3.5s
    timers.current.push(setTimeout(() => setAgentStatus("sentinel", "active"), 0));
    timers.current.push(setTimeout(() => {
      setState((s) => ({ ...s, disruptionActive: true }));
    }, t(1800)));
    timers.current.push(setTimeout(() => {
      setState((s) => ({ ...s, corridorStatuses: { ...s.corridorStatuses, "asia-europe": "ELEVATED" } }));
    }, t(2500)));
    timers.current.push(setTimeout(() => {
      setAgentStatus("sentinel", "done");
      setState((s) => ({
        ...s,
        currentPhase: "analysis",
        agentTimings: { ...s.agentTimings, sentinel: 3500 / speed },
      }));
    }, t(3500)));

    // Analysis phase: 4-8.5s
    timers.current.push(setTimeout(() => setAgentStatus("analyst", "active"), t(4000)));
    timers.current.push(setTimeout(() => {
      setState((s) => ({
        ...s,
        cascadeImpacts: DEMO_CASCADE,
        corridorStatuses: { ...s.corridorStatuses, "asia-europe": "DISRUPTED" },
      }));
    }, t(6500)));
    timers.current.push(setTimeout(() => {
      setAgentStatus("analyst", "done");
      setState((s) => ({
        ...s,
        currentPhase: "optimization",
        agentTimings: { ...s.agentTimings, analyst: 4500 / speed },
      }));
    }, t(8500)));

    // Optimization phase: 9-13s
    timers.current.push(setTimeout(() => setAgentStatus("optimizer", "active"), t(9000)));
    timers.current.push(setTimeout(() => {
      setState((s) => ({
        ...s,
        alternatives: DEMO_ALTERNATIVES,
        humanitarianPriorityActive: true,
      }));
    }, t(12500)));
    timers.current.push(setTimeout(() => {
      setAgentStatus("optimizer", "done");
      setState((s) => ({
        ...s,
        currentPhase: "communication",
        agentTimings: { ...s.agentTimings, optimizer: 4000 / speed },
      }));
    }, t(13000)));

    // Communication phase: 13.5-16s
    timers.current.push(setTimeout(() => setAgentStatus("communicator", "active"), t(13500)));
    timers.current.push(setTimeout(() => {
      setState((s) => ({
        ...s,
        alertVisible: true,
        alertSeverity: "CRITICAL",
        alertTitle: "Typhoon Gaemi — Malacca Strait",
      }));
    }, t(13500)));
    timers.current.push(setTimeout(() => {
      setAgentStatus("communicator", "done");
      setState((s) => ({
        ...s,
        currentPhase: "complete",
        isRunning: false,
        agentTimings: { ...s.agentTimings, communicator: 2500 / speed },
      }));
    }, t(16000)));
  }, [reset, setAgentStatus, addStep, addTimelineEvent]);

  const setIsLiveMode = useCallback((live: boolean) => {
    setState((s) => ({ ...s, isLiveMode: live }));
  }, []);

  return { state, runDemo, reset, selectRoute, setIsLiveMode };
}
