import React from "react";
import { useAuth } from "../lib/useAuth.js";
import BottomNav from "./BottomNav.jsx";

// XA Project PhotoLog — lightweight shell (no sidebar, no module list).
// Same background treatment as xadOS-app's FieldLayout: project photo at
// 12% opacity + a separate 35% black scrim on top.
//
// v1.1: hosts the persistent bottom tab bar (Home/Feed/Camera/
// Dashboard/Profile). Sign out and the employee/role badge moved to the
// Profile tab, so this header stays just title + optional back + an
// optional page-specific action (e.g. Feed's Filter button).
export default function AppShell({ project, title, onBack, right, children, hideNav = false }) {
  const { appUser, isPhotologAdmin } = useAuth();
  const roleCode = appUser?.roles?.role_code;
  const accent = project?.accent_color || "#5C9BFF";

  return (
    <div className="min-h-screen bg-void text-text-primary relative">
      {project?.background_image && (
        <>
          <div
            className="fixed inset-0 pointer-events-none"
            style={{
              backgroundImage: `url(${project.background_image})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundAttachment: "fixed",
              opacity: 0.12,
            }}
          />
          <div
            className="fixed inset-0 pointer-events-none"
            style={{ backgroundColor: "#000000", opacity: 0.35 }}
          />
        </>
      )}

      <div className="relative z-10">
        <header
          className="sticky top-0 z-10 px-4 py-3.5 flex items-center justify-between backdrop-blur-sm"
          style={{ backgroundColor: "rgba(10,14,24,0.85)", borderBottom: `2px solid ${accent}` }}
        >
          <div className="flex items-center gap-2 min-w-0">
            {onBack && (
              <button onClick={onBack} className="text-lg leading-none px-1 text-text-secondary">‹</button>
            )}
            <div className="min-w-0">
              <div className="font-display font-bold text-base truncate">{title}</div>
              {project && <div className="text-xs text-text-tertiary truncate">{project.project_code}</div>}
            </div>
          </div>
          {right && <div className="flex items-center gap-3 shrink-0">{right}</div>}
        </header>
        <main className={hideNav ? "p-4 pb-10" : "p-4 pb-24"}>{children}</main>
        {!hideNav && <BottomNav roleCode={roleCode} isPhotologAdmin={isPhotologAdmin} />}
      </div>
    </div>
  );
}
