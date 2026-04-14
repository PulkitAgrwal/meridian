"use client";

import { useCallback, useEffect, useState } from "react";
import type { ThemeMode } from "@/lib/types";

function getStoredTheme(): ThemeMode {
  if (typeof window === "undefined") return "dark";
  return (localStorage.getItem("meridian-theme") as ThemeMode) || "dark";
}

function applyTheme(mode: ThemeMode) {
  let effective = mode;
  if (mode === "system") {
    effective = window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  }
  document.documentElement.setAttribute("data-theme", effective);
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<ThemeMode>("dark");

  useEffect(() => {
    const stored = getStoredTheme();
    setTheme(stored);
    applyTheme(stored);
  }, []);

  const cycle = useCallback(() => {
    setTheme((prev) => {
      const order: ThemeMode[] = ["dark", "light", "system"];
      const next = order[(order.indexOf(prev) + 1) % order.length];
      localStorage.setItem("meridian-theme", next);
      applyTheme(next);
      return next;
    });
  }, []);

  const icon = theme === "light" ? (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  ) : theme === "dark" ? (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  ) : (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  );

  return (
    <button
      onClick={cycle}
      className="p-2 rounded-lg transition-colors"
      style={{ background: "transparent", color: "var(--text-secondary)", border: "none" }}
      aria-label={`Theme: ${theme}. Click to switch.`}
      data-testid="theme-toggle"
      title={`Theme: ${theme}`}
    >
      {icon}
    </button>
  );
}
