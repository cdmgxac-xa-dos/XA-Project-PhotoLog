import React from "react";

const TONES = {
  green: "bg-status-green/15 text-status-green",
  amber: "bg-status-amber/15 text-status-amber",
  blue: "bg-brand-blue/15 text-brand-blue",
  red: "bg-status-red/15 text-status-red",
  neutral: "bg-panel-raised text-text-secondary",
};

export default function Badge({ children, tone = "neutral", className = "" }) {
  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full",
        "text-[11px] font-body font-medium",
        TONES[tone],
        className,
      ].join(" ")}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {children}
    </span>
  );
}
