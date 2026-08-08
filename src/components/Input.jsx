import React from "react";

export default function Input({
  label,
  icon,
  error,
  type = "text",
  id,
  className = "",
  ...rest
}) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className="mb-4">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-xs font-body font-medium text-text-secondary mb-2"
        >
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {icon && (
          <span className="absolute left-3 w-4 h-4 text-text-tertiary pointer-events-none">
            {icon}
          </span>
        )}
        <input
          id={inputId}
          type={type}
          className={[
            "w-full bg-void border rounded-control py-3 text-sm text-text-primary",
            "placeholder:text-text-tertiary outline-none transition-colors",
            "focus:border-brand-blue",
            icon ? "pl-9 pr-3.5" : "px-3.5",
            error ? "border-status-red" : "border-hair",
            className,
          ].join(" ")}
          {...rest}
        />
      </div>
      {error && <p className="mt-1.5 text-xs text-status-red">{error}</p>}
    </div>
  );
}
