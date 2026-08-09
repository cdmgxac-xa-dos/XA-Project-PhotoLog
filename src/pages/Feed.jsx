import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import AppShell from "../components/AppShell.jsx";
import Card from "../components/Card.jsx";
import Badge from "../components/Badge.jsx";
import Button from "../components/Button.jsx";
import Input from "../components/Input.jsx";
import CategoryChat from "../components/CategoryChat.jsx";
import { useAuth } from "../lib/useAuth.js";
import { PHOTO_CATEGORY_OPTIONS, SCOPE_OF_WORK_OPTIONS, listPhotoUpdates, getPhotoThumbUrls } from "../lib/projectPhotoLog.js";
import { DATE_PRESETS, resolvePreset } from "../lib/dateRanges.js";

const CATEGORY_TONE = {
  "Safety Concern": "red",
  Punchlist: "amber",
  "Photo Update": "blue",
  Others: "neutral",
};

// v1.1 Project Photo Feed -- "a professional construction progress feed
// replacing Messenger photo groups... NOT a chat system." Every project
// team member sees every photo (RLS widened in migration 05). Category
// quick-tabs are for everyone; the fuller filter panel (date/scope/
// floor/unit) is PIC-only per the spec's permission table.
export default function Feed({ project }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { appUser } = useAuth();
  const roleCode = appUser?.roles?.role_code;
  const isPic = roleCode === "field_pic";

  // ?chat=1&category=Safety%20Concern -- lets a mention push notification
  // (see CategoryChat.jsx) open straight into the right conversation
  // instead of just landing on the Feed's default Photos view.
  const deepLinkCategory = searchParams.get("category");
  const [mode, setMode] = useState(searchParams.get("chat") === "1" ? "chat" : "photos");
  const [activeCategory, setActiveCategory] = useState("All");
  const [chatCategory, setChatCategory] = useState(
    deepLinkCategory && PHOTO_CATEGORY_OPTIONS.includes(deepLinkCategory) ? deepLinkCategory : PHOTO_CATEGORY_OPTIONS[0]
  );
  const [showFilters, setShowFilters] = useState(false);
  const [preset, setPreset] = useState("Today");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [scopeOfWork, setScopeOfWork] = useState([]);
  const [floorLevel, setFloorLevel] = useState("");
  const [unitNumber, setUnitNumber] = useState("");
  const [appliedAdvanced, setAppliedAdvanced] = useState(null);

  const [photos, setPhotos] = useState([]);
  const [thumbUrls, setThumbUrls] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (mode !== "photos") return;
    setLoading(true);
    setError("");
    const filters = {
      photoCategory: activeCategory === "All" ? undefined : [activeCategory],
      limit: 150,
      ...(isPic && appliedAdvanced ? appliedAdvanced : {}),
    };
    listPhotoUpdates(project.id, filters)
      .then(async (rows) => {
        setPhotos(rows);
        setThumbUrls(await getPhotoThumbUrls(rows.map((r) => r.thumbnail_path).filter(Boolean)));
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [project.id, mode, activeCategory, appliedAdvanced, isPic]);

  function toggleScope(value) {
    setScopeOfWork((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));
  }

  function applyFilters() {
    setAppliedAdvanced({
      ...resolvePreset(preset, customFrom, customTo),
      scopeOfWork,
      floorLevel: floorLevel || undefined,
      unitNumber: unitNumber || undefined,
    });
    setShowFilters(false);
  }

  function resetFilters() {
    setPreset("Today");
    setCustomFrom("");
    setCustomTo("");
    setScopeOfWork([]);
    setFloorLevel("");
    setUnitNumber("");
    setAppliedAdvanced(null);
    setShowFilters(false);
  }

  const headerRight = mode === "photos" && isPic && (
    <button onClick={() => setShowFilters((v) => !v)} className="text-xs text-brand-blue">
      {appliedAdvanced ? "Filter •" : "Filter"}
    </button>
  );

  return (
    <AppShell project={project} title="Photo Feed" right={headerRight}>
      <div className="grid grid-cols-2 gap-2 mb-3">
        <button
          onClick={() => setMode("photos")}
          className={[
            "py-2 rounded-control text-sm font-body font-semibold border transition-colors",
            mode === "photos" ? "bg-brand-blue text-white border-transparent" : "bg-void text-text-secondary border-hair",
          ].join(" ")}
        >
          📷 Photos
        </button>
        <button
          onClick={() => setMode("chat")}
          className={[
            "py-2 rounded-control text-sm font-body font-semibold border transition-colors",
            mode === "chat" ? "bg-brand-blue text-white border-transparent" : "bg-void text-text-secondary border-hair",
          ].join(" ")}
        >
          💬 Chat
        </button>
      </div>

      {mode === "chat" && (
        <>
          <div className="flex gap-2 overflow-x-auto pb-3 -mx-1 px-1">
            {PHOTO_CATEGORY_OPTIONS.map((opt) => (
              <button
                key={opt}
                onClick={() => setChatCategory(opt)}
                className={[
                  "shrink-0 px-3 py-1.5 rounded-full text-xs font-body font-medium border transition-colors",
                  chatCategory === opt
                    ? "bg-brand-blue text-white border-transparent"
                    : "bg-void text-text-secondary border-hair",
                ].join(" ")}
              >
                {opt}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-text-tertiary mb-2">
            Live only — messages aren't saved and disappear once everyone leaves.
          </p>
          <CategoryChat project={project} category={chatCategory} />
        </>
      )}

      {mode === "photos" && (
      <>
      <div className="flex gap-2 overflow-x-auto pb-3 -mx-1 px-1">
        {["All", ...PHOTO_CATEGORY_OPTIONS].map((opt) => (
          <button
            key={opt}
            onClick={() => setActiveCategory(opt)}
            className={[
              "shrink-0 px-3 py-1.5 rounded-full text-xs font-body font-medium border transition-colors",
              activeCategory === opt
                ? "bg-brand-blue text-white border-transparent"
                : "bg-void text-text-secondary border-hair",
            ].join(" ")}
          >
            {opt}
          </button>
        ))}
      </div>

      {showFilters && isPic && (
        <Card className="mb-4">
          <p className="block text-xs font-body font-medium text-text-secondary mb-2">Date Range</p>
          <div className="flex flex-wrap gap-2 mb-3">
            {DATE_PRESETS.map((p) => (
              <button
                key={p}
                onClick={() => setPreset(p)}
                className={[
                  "px-3 py-1.5 rounded-control text-xs font-body font-medium border transition-colors",
                  preset === p ? "bg-brand-blue text-white border-transparent" : "bg-void text-text-secondary border-hair",
                ].join(" ")}
              >
                {p}
              </button>
            ))}
          </div>
          {preset === "Custom Range" && (
            <div className="grid grid-cols-2 gap-x-3">
              <Input label="From" type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
              <Input label="To" type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
            </div>
          )}

          <p className="block text-xs font-body font-medium text-text-secondary mb-2">Scope of Work</p>
          <div className="flex flex-wrap gap-2 mb-4">
            {SCOPE_OF_WORK_OPTIONS.map((opt) => (
              <button
                key={opt}
                onClick={() => toggleScope(opt)}
                className={[
                  "px-3 py-1.5 rounded-control text-xs font-body font-medium border transition-colors",
                  scopeOfWork.includes(opt) ? "bg-brand-blue text-white border-transparent" : "bg-void text-text-secondary border-hair",
                ].join(" ")}
              >
                {opt}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-x-3">
            <Input label="Floor Level" placeholder="e.g. 23F" value={floorLevel} onChange={(e) => setFloorLevel(e.target.value)} />
            <Input label="Unit Number" placeholder="e.g. 2305" value={unitNumber} onChange={(e) => setUnitNumber(e.target.value)} />
          </div>

          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={resetFilters}>Reset</Button>
            <Button className="flex-1" onClick={applyFilters}>Apply Filter</Button>
          </div>
        </Card>
      )}

      {loading && <p className="text-sm text-text-tertiary text-center py-10">Loading...</p>}
      {error && <p className="text-sm text-status-red text-center py-10">{error}</p>}

      {!loading && !error && (
        <>
          {photos.length === 0 ? (
            <p className="text-sm text-text-tertiary text-center py-10">No photos to show.</p>
          ) : (
            <div className="space-y-2.5">
              {photos.map((p) => (
                <button key={p.id} onClick={() => navigate(`/photo/${p.id}`)} className="w-full text-left">
                  <Card>
                    <div className="flex gap-3">
                      <div className="w-16 h-16 rounded-control overflow-hidden bg-void border border-hair-soft shrink-0">
                        {thumbUrls[p.thumbnail_path] && (
                          <img src={thumbUrls[p.thumbnail_path]} alt={p.photo_id} loading="lazy" className="w-full h-full object-cover" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-body font-semibold text-sm text-text-primary truncate">
                            {p.submitted_by?.employee?.full_name || p.submitted_by?.employee_code || "—"}
                          </span>
                          <span className="text-[10px] text-text-tertiary shrink-0">{new Date(p.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                        </div>
                        <p className="text-xs text-text-tertiary truncate">
                          {p.submitted_by?.roles?.role_name} · {p.floor_level || "—"} {p.unit_number ? `Unit ${p.unit_number}` : ""}
                        </p>
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {(p.photo_category || []).map((c) => (
                            <Badge key={c} tone={CATEGORY_TONE[c] || "neutral"}>{c}</Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </Card>
                </button>
              ))}
            </div>
          )}
        </>
      )}
      </>
      )}
    </AppShell>
  );
}
