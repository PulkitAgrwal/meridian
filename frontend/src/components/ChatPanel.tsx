"use client";

import { useCallback, useRef, useState } from "react";
import type { ChatMessage } from "@/lib/types";
import { CHAT_FALLBACK_ANSWERS } from "@/lib/demo-data";

/** Minimal markdown → HTML for chat: **bold**, \n, and lists */
function renderMarkdown(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\n/g, "<br/>");
}

interface Props {
  apiUrl?: string;
}

const QUICK_CHIPS = [
  { label: "What's the cascade impact?", key: "cascade" },
  { label: "Compare route costs", key: "route" },
  { label: "Medicine shipments at risk?", key: "medicine" },
  { label: "ETA for Lombok bypass?", key: "eta" },
];

function matchFallback(query: string): string {
  const lower = query.toLowerCase();
  if (lower.includes("cascade") || lower.includes("impact") || lower.includes("downstream")) return CHAT_FALLBACK_ANSWERS["cascade"];
  if (lower.includes("route") || lower.includes("cost") || lower.includes("compare") || lower.includes("alternative")) return CHAT_FALLBACK_ANSWERS["route"];
  if (lower.includes("medicine") || lower.includes("pharma") || lower.includes("medical")) return CHAT_FALLBACK_ANSWERS["medicine"];
  if (lower.includes("eta") || lower.includes("lombok") || lower.includes("arrival") || lower.includes("time")) return CHAT_FALLBACK_ANSWERS["eta"];
  return CHAT_FALLBACK_ANSWERS["default"];
}

export default function ChatPanel({ apiUrl }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const idCounter = useRef(0);

  const scrollToBottom = () => {
    setTimeout(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, 50);
  };

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim()) return;

    const userMsg: ChatMessage = {
      id: `msg-${idCounter.current++}`,
      role: "user",
      content: text.trim(),
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);
    scrollToBottom();

    // Try API first, fallback to pre-computed
    let response: string;
    try {
      if (apiUrl) {
        const res = await fetch(`${apiUrl}/api/v1/query`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: text.trim() }),
          signal: AbortSignal.timeout(8000),
        });
        if (res.ok) {
          const data = await res.json();
          response = data.response || data.answer || JSON.stringify(data);
        } else {
          response = matchFallback(text);
        }
      } else {
        // Simulate delay
        await new Promise((r) => setTimeout(r, 1200));
        response = matchFallback(text);
      }
    } catch {
      await new Promise((r) => setTimeout(r, 800));
      response = matchFallback(text);
    }

    setIsTyping(false);
    const assistantMsg: ChatMessage = {
      id: `msg-${idCounter.current++}`,
      role: "assistant",
      content: response,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, assistantMsg]);
    scrollToBottom();
  }, [apiUrl]);

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--bg-surface-1)" }}>
      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <p style={{ fontSize: "13px", color: "var(--text-muted)", textAlign: "center" }}>
              Ask about this disruption...
            </p>
          </div>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className="rounded-lg px-3 py-2 max-w-[85%]"
              style={{
                background: msg.role === "user" ? "var(--accent-sentinel)" : "var(--bg-surface-2)",
                color: msg.role === "user" ? "#FFFFFF" : "var(--text-primary)",
                fontSize: "13px",
                lineHeight: 1.6,
              }}
            >
              {msg.role === "assistant" ? (
                <div dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }} />
              ) : (
                msg.content
              )}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div
              className="rounded-lg px-4 py-3 flex gap-1"
              style={{ background: "var(--bg-surface-2)" }}
            >
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span className="typing-dot" />
            </div>
          </div>
        )}
      </div>

      {/* Quick chips */}
      {messages.length === 0 && (
        <div className="px-3 pb-2 flex flex-wrap gap-1.5">
          {QUICK_CHIPS.map((chip) => (
            <button
              key={chip.key}
              onClick={() => sendMessage(chip.label)}
              className="rounded-full px-2.5 py-1 text-xs transition-colors"
              style={{
                background: "var(--bg-surface-2)",
                color: "var(--text-secondary)",
                border: "1px solid var(--border)",
              }}
            >
              {chip.label}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="p-3" style={{ borderTop: "1px solid var(--border)" }}>
        {!apiUrl && (
          <div className="mb-1.5 text-center">
            <span className="font-mono" style={{ fontSize: "10px", color: "var(--text-muted)" }}>Demo mode — responses are pre-computed</span>
          </div>
        )}
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage(input);
              }
            }}
            placeholder="Ask about this disruption..."
            className="flex-1 rounded-lg px-3 py-2 text-sm outline-none"
            style={{
              background: "var(--bg-surface-2)",
              color: "var(--text-primary)",
              border: "1px solid var(--border)",
              fontFamily: "var(--font-inter)",
            }}
            aria-label="Chat input"
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim()}
            className="btn-primary px-3 py-2 rounded-lg disabled:opacity-40"
            aria-label="Send message"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
