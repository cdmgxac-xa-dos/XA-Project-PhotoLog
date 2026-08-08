import React from "react";

export default function Card({ title, action, children, className = "" }) {
  return (
    <div
      className={[
        "bg-panel border border-hair-soft rounded-card p-5",
        className,
      ].join(" ")}
    >
      {(title || action) && (
        <div className="flex items-center justify-between mb-4">
          {title && (
            <h3 className="font-display font-bold text-[15px] text-text-primary">
              {title}
            </h3>
          )}
          {action}
        </div>
      )}
      {children}
    </div>
  );
}
