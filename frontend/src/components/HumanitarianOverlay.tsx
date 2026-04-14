"use client";

import { useEffect, useState } from "react";

interface Props {
  visible: boolean;
  onDismiss: () => void;
}

export default function HumanitarianOverlay({ visible, onDismiss }: Props) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (visible) {
      const timer = setTimeout(() => setShow(true), 100);
      const autoClose = setTimeout(onDismiss, 10000);
      return () => { clearTimeout(timer); clearTimeout(autoClose); };
    } else {
      setShow(false);
    }
  }, [visible, onDismiss]);

  if (!visible) return null;

  return (
    <div
      className="absolute inset-0 z-20 flex items-center justify-center cursor-pointer"
      onClick={onDismiss}
      style={{
        background: "rgba(0,0,0,0.75)",
        opacity: show ? 1 : 0,
        transition: "opacity 600ms ease",
      }}
      role="dialog"
      aria-label="Humanitarian impact message"
    >
      <div
        className="max-w-2xl px-8 py-6 text-center"
        style={{
          opacity: show ? 1 : 0,
          transform: show ? "translateY(0)" : "translateY(20px)",
          transition: "all 600ms ease 200ms",
        }}
      >
        <p
          style={{
            fontSize: "16px",
            lineHeight: 1.8,
            color: "#E8E6E1",
            fontWeight: 400,
            fontFamily: "var(--font-inter)",
          }}
        >
          During the 2024 Dana cyclone in Tamil Nadu, medical supplies were stranded at Chennai port for 6 days.{" "}
          <span style={{ color: "#1D9E75", fontWeight: 600 }}>
            Meridian&apos;s agents would have detected the disruption 48 hours before landfall and rerouted supplies through Vizag
          </span>{" "}
          — potentially saving lives.
        </p>
        <p
          className="mt-4"
          style={{ fontSize: "12px", color: "var(--text-muted)" }}
        >
          Click anywhere to dismiss
        </p>
      </div>
    </div>
  );
}
