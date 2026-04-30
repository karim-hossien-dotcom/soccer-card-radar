"use client";

import { useState } from "react";

export type SortMode = "urgency" | "cheapest" | "value";

const options: { value: SortMode; label: string; desc: string }[] = [
  { value: "urgency", label: "Urgency", desc: "Ending soonest first" },
  { value: "cheapest", label: "Cheapest", desc: "Lowest price first" },
  { value: "value", label: "Best Value", desc: "Best ROI / lowest price per card quality" },
];

export default function SortToggle({ onChange }: { onChange: (mode: SortMode) => void }) {
  const [active, setActive] = useState<SortMode>("urgency");

  return (
    <div style={{ display: "flex", gap: "0.35rem", marginBottom: "1rem" }}>
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => { setActive(opt.value); onChange(opt.value); }}
          title={opt.desc}
          style={{
            fontSize: "0.72rem",
            padding: "5px 12px",
            borderRadius: "6px",
            border: active === opt.value ? "1px solid var(--accent)" : "1px solid var(--border)",
            background: active === opt.value ? "var(--accent)" : "var(--bg-card)",
            color: active === opt.value ? "#fff" : "var(--text-secondary)",
            cursor: "pointer",
            fontWeight: active === opt.value ? 600 : 400,
            transition: "all 0.15s ease",
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
