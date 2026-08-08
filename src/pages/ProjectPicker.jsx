import React from "react";

// Shown once per device -- after picking, useCurrentProject remembers the
// choice in localStorage so the app opens straight to the camera next time.
export default function ProjectPicker({ projects, onSelect }) {
  return (
    <div className="min-h-screen bg-void p-6">
      <h1 className="font-display font-bold text-lg text-text-primary mb-1 text-center mt-4">Select Your Project</h1>
      <p className="text-xs text-text-tertiary text-center mb-6">You can switch later from the camera screen.</p>
      <div className="space-y-3 max-w-md mx-auto">
        {projects.map((p) => {
          const thumb = p.background_image;
          const accent = p.accent_color || "#5C9BFF";
          return (
            <button
              key={p.id}
              onClick={() => onSelect(p.id)}
              className="w-full text-left rounded-card overflow-hidden border border-hair-soft relative"
              style={{ minHeight: "88px" }}
            >
              {thumb ? (
                <div
                  className="absolute inset-0"
                  style={{
                    backgroundImage: `linear-gradient(rgba(4,6,12,0.35), rgba(4,6,12,0.75)), url(${thumb})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                />
              ) : (
                <div className="absolute inset-0 bg-panel" />
              )}
              <div className="relative p-4 flex flex-col justify-end" style={{ minHeight: "88px" }}>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: accent }} />
                  <span className="font-display font-bold text-base text-white truncate">
                    {p.description || p.project_code}
                  </span>
                </div>
                <div className="text-xs text-white/70 truncate">
                  {p.project_code} {p.site_location && `· ${p.site_location}`}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
