import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "../components/AppShell.jsx";
import Card from "../components/Card.jsx";
import Button from "../components/Button.jsx";
import Input from "../components/Input.jsx";
import { useAuth } from "../lib/useAuth.js";
import {
  SCOPE_OF_WORK_OPTIONS,
  PHOTO_CATEGORY_OPTIONS,
  listPhotoUpdates,
  getPhotoThumbUrls,
} from "../lib/projectPhotoLog.js";

function Chip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "px-3 py-2 rounded-control text-xs font-body font-medium border transition-colors",
        active ? "bg-brand-blue text-white border-transparent" : "bg-void text-text-secondary border-hair",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

export default function Browser({ project }) {
  const navigate = useNavigate();
  const { appUser } = useAuth();
  const roleCode = appUser?.roles?.role_code;

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [floorLevel, setFloorLevel] = useState("");
  const [unitNumber, setUnitNumber] = useState("");
  const [scopeOfWork, setScopeOfWork] = useState([]);
  const [photoCategory, setPhotoCategory] = useState([]);

  const [photos, setPhotos] = useState([]);
  const [thumbUrls, setThumbUrls] = useState({});
  const [selected, setSelected] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState("");
  const [submittedBy, setSubmittedBy] = useState("");
  const [layout, setLayout] = useState("Detailed");

  function toggle(list, setList, value) {
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  }

  async function runSearch() {
    setLoading(true);
    setError("");
    try {
      const rows = await listPhotoUpdates(project.id, {
        dateFrom: dateFrom ? `${dateFrom}T00:00:00` : undefined,
        dateTo: dateTo ? `${dateTo}T23:59:59` : undefined,
        floorLevel: floorLevel || undefined,
        unitNumber: unitNumber || undefined,
        scopeOfWork,
        photoCategory,
      });
      setPhotos(rows);
      setSelected(new Set(rows.map((r) => r.id)));
      setThumbUrls(await getPhotoThumbUrls(rows.map((r) => r.thumbnail_path).filter(Boolean)));
      setSearched(true);
      setSubmittedBy("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function toggleSelected(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  // "User" filter narrows the already-fetched result set client-side --
  // there's no separate roster query, so options come from whoever's
  // actually in these results.
  const submitters = [...new Map(
    photos.map((p) => [p.user_id, p.submitted_by?.employee?.full_name || p.submitted_by?.employee_code || "—"])
  ).entries()];
  const visiblePhotos = submittedBy ? photos.filter((p) => p.user_id === submittedBy) : photos;

  function goToReport() {
    const chosen = visiblePhotos.filter((p) => selected.has(p.id));
    navigate("/report", { state: { photos: chosen, layout } });
  }

  if (roleCode !== "field_pic") {
    return (
      <AppShell project={project} title="Search Photos" onBack={() => navigate("/dashboard")}>
        <p className="text-sm text-status-red text-center py-10">Search &amp; reporting is available to the Project PIC only.</p>
      </AppShell>
    );
  }

  return (
    <AppShell project={project} title="Search &amp; Filter" onBack={() => navigate("/dashboard")}>
      <Card className="mb-4">
        <div className="grid grid-cols-2 gap-x-3">
          <Input label="From Date" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          <Input label="To Date" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          <Input label="Floor Level" placeholder="e.g. 23F" value={floorLevel} onChange={(e) => setFloorLevel(e.target.value)} />
          <Input label="Unit Number" placeholder="e.g. 2305" value={unitNumber} onChange={(e) => setUnitNumber(e.target.value)} />
        </div>

        <div className="mb-4">
          <p className="block text-xs font-body font-medium text-text-secondary mb-2">Scope of Work</p>
          <div className="flex flex-wrap gap-2">
            {SCOPE_OF_WORK_OPTIONS.map((opt) => (
              <Chip key={opt} active={scopeOfWork.includes(opt)} onClick={() => toggle(scopeOfWork, setScopeOfWork, opt)}>{opt}</Chip>
            ))}
          </div>
        </div>

        <div className="mb-1">
          <p className="block text-xs font-body font-medium text-text-secondary mb-2">Photo Category</p>
          <div className="flex flex-wrap gap-2">
            {PHOTO_CATEGORY_OPTIONS.map((opt) => (
              <Chip key={opt} active={photoCategory.includes(opt)} onClick={() => toggle(photoCategory, setPhotoCategory, opt)}>{opt}</Chip>
            ))}
          </div>
        </div>
      </Card>

      <Button className="w-full mb-4" onClick={runSearch} disabled={loading}>
        {loading ? "Searching..." : "Search"}
      </Button>

      {error && <p className="text-sm text-status-red mb-4">{error}</p>}

      {searched && !loading && (
        <>
          {photos.length === 0 ? (
            <p className="text-sm text-text-tertiary text-center py-10">No photos match these filters.</p>
          ) : (
            <>
              {submitters.length > 1 && (
                <div className="mb-3">
                  <p className="block text-xs font-body font-medium text-text-secondary mb-2">Submitted By</p>
                  <div className="flex flex-wrap gap-2">
                    <Chip active={submittedBy === ""} onClick={() => setSubmittedBy("")}>Anyone</Chip>
                    {submitters.map(([userId, name]) => (
                      <Chip key={userId} active={submittedBy === userId} onClick={() => setSubmittedBy(userId)}>{name}</Chip>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-text-tertiary">{visiblePhotos.length} photo{visiblePhotos.length === 1 ? "" : "s"} found · {selected.size} selected</p>
                <button
                  className="text-xs text-brand-blue"
                  onClick={() => setSelected(selected.size === visiblePhotos.length ? new Set() : new Set(visiblePhotos.map((p) => p.id)))}
                >
                  {selected.size === visiblePhotos.length ? "Clear all" : "Select all"}
                </button>
              </div>

              <div className="space-y-2 mb-4">
                {visiblePhotos.map((p) => (
                  <button key={p.id} onClick={() => toggleSelected(p.id)} className="w-full text-left">
                    <Card className={selected.has(p.id) ? "border-brand-blue" : ""}>
                      <div className="flex gap-3">
                        <div className="w-16 h-16 rounded-control overflow-hidden bg-void border border-hair-soft shrink-0">
                          {thumbUrls[p.thumbnail_path] && (
                            <img src={thumbUrls[p.thumbnail_path]} alt={p.photo_id} className="w-full h-full object-cover" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-body font-semibold text-sm text-text-primary truncate">
                              {p.floor_level || "—"} {p.unit_number ? `· ${p.unit_number}` : ""}
                            </span>
                            <span className="text-[10px] text-text-tertiary shrink-0 pl-2">
                              {selected.has(p.id) ? "✓ Selected" : ""}
                            </span>
                          </div>
                          <p className="text-xs text-text-tertiary truncate">{[...(p.photo_category || []), ...(p.scope_of_work || [])].join(" · ")}</p>
                          <p className="text-[11px] text-text-tertiary mt-0.5">{new Date(p.created_at).toLocaleString()}</p>
                        </div>
                      </div>
                    </Card>
                  </button>
                ))}
              </div>

              <div className="mb-24">
                <p className="block text-xs font-body font-medium text-text-secondary mb-2">Report Layout</p>
                <div className="grid grid-cols-4 gap-2">
                  {["Photo List", "Photo Grid", "Summary", "Detailed"].map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setLayout(opt)}
                      className={[
                        "px-2 py-2.5 rounded-control text-[11px] font-body font-medium border text-center transition-colors",
                        layout === opt ? "bg-brand-blue text-white border-transparent" : "bg-void text-text-secondary border-hair",
                      ].join(" ")}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              <div className="fixed bottom-0 left-0 right-0 p-4 bg-void/95 backdrop-blur border-t border-hair-soft">
                <Button className="w-full" size="lg" onClick={goToReport} disabled={selected.size === 0}>
                  Generate Report ({selected.size} selected)
                </Button>
              </div>
            </>
          )}
        </>
      )}
    </AppShell>
  );
}
