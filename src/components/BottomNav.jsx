import React from "react";
import { NavLink } from "react-router-dom";
import { canManage } from "../lib/roles.js";

const TABS = [
  { to: "/", label: "Home", icon: "🏠", end: true },
  { to: "/feed", label: "Feed", icon: "🗂️" },
  { to: "/camera", label: "Camera", icon: "📷", primary: true },
  { to: "/dashboard", label: "Dashboard", icon: "📊", picOnly: true },
  { to: "/profile", label: "Profile", icon: "👤" },
];

// Persistent tab bar, v1.1's "New Application Sections" -- Home / Feed /
// Camera / Dashboard(PIC) / Profile. Camera is a reachable tab now
// rather than the app's auto-launched landing screen (see Home.jsx).
export default function BottomNav({ roleCode, isPhotologAdmin }) {
  const tabs = TABS.filter((t) => !t.picOnly || canManage(roleCode, isPhotologAdmin));

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-20 bg-panel/95 backdrop-blur border-t border-hair-soft flex items-stretch">
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.end}
          className={({ isActive }) =>
            [
              "flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 text-[10px] font-body font-medium",
              isActive ? "text-brand-blue" : "text-text-tertiary",
            ].join(" ")
          }
        >
          {({ isActive }) => (
            <>
              <span
                className={
                  tab.primary
                    ? "w-10 h-10 -mt-5 rounded-full bg-brand-blue shadow-glow-blue flex items-center justify-center text-lg text-white"
                    : "text-lg"
                }
                style={tab.primary ? {} : { opacity: isActive ? 1 : 0.7 }}
              >
                {tab.icon}
              </span>
              {tab.label}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
