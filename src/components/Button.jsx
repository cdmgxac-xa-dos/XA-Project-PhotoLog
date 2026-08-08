import React from "react";

const VARIANTS = {
  primary:
    "bg-brand-blue text-white shadow-glow-blue hover:brightness-110 border border-transparent",
  secondary:
    "bg-transparent text-text-primary border border-hair hover:bg-panel-raised",
  ghost:
    "bg-transparent text-brand-blue border border-transparent hover:bg-panel-raised",
  danger:
    "bg-status-red text-white border border-transparent hover:brightness-110",
};

const SIZES = {
  sm: "text-xs px-3 py-1.5",
  md: "text-sm px-4 py-2.5",
  lg: "text-sm px-5 py-3",
};

export default function Button({
  children,
  variant = "primary",
  size = "md",
  disabled = false,
  type = "button",
  onClick,
  className = "",
  ...rest
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={[
        "font-body font-semibold rounded-control tracking-wide transition-all",
        "disabled:opacity-40 disabled:cursor-not-allowed",
        VARIANTS[variant],
        SIZES[size],
        className,
      ].join(" ")}
      {...rest}
    >
      {children}
    </button>
  );
}
