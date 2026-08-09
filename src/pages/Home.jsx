import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "../components/AppShell.jsx";
import Card from "../components/Card.jsx";
import Button from "../components/Button.jsx";
import { listPhotoUpdates } from "../lib/projectPhotoLog.js";

function todayBounds() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return { from: `${y}-${m}-${d}T00:00:00`, to: `${y}-${m}-${d}T23:59:59` };
}

// v1.1 -- new app landing screen (Home tab). Everyone on the project
// team can see today's activity now (feed visibility widened), not just
// the PIC.
export default function Home({ project, projects, onSwitchProject }) {
  const navigate = useNavigate();
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const { from, to } = todayBounds();
    setLoading(true);
    setError("");
    listPhotoUpdates(project.id, { dateFrom: from, dateTo: to, limit: 500 })
      .then(setPhotos)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [project.id]);

  const safetyCount = photos.filter((p) => (p.photo_category || []).includes("Safety Concern")).length;
  const punchlistCount = photos.filter((p) => (p.photo_category || []).includes("Punchlist")).length;

  const byFloor = photos.reduce((acc, p) => {
    const key = p.floor_level || "—";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const byFloorSorted = Object.entries(byFloor).sort((a, b) => b[1] - a[1]);

  const headerRight = projects.length > 1 && (
    <button onClick={onSwitchProject} className="text-xs text-text-tertiary">Switch</button>
  );

  return (
    <AppShell project={project} title={project.description || project.project_code} right={headerRight}>
      {loading && <p className="text-sm text-text-tertiary text-center py-10">Loading...</p>}
      {error && <p className="text-sm text-status-red text-center py-10">{error}</p>}

      {!loading && !error && (
        <div className="space-y-5">
          <div>
            <h2 className="text-xs font-semibold text-text-tertiary uppercase tracking-wide mb-2">Today's Summary</h2>
            <div className="grid grid-cols-3 gap-3">
              <Card className="text-center">
                <p className="font-display font-bold text-2xl text-text-primary">{photos.length}</p>
                <p className="text-[11px] text-text-tertiary mt-0.5">Photos Today</p>
              </Card>
              <Card className="text-center">
                <p className="font-display font-bold text-2xl text-status-red">{safetyCount}</p>
                <p className="text-[11px] text-text-tertiary mt-0.5">Safety Issues</p>
              </Card>
              <Card className="text-center">
                <p className="font-display font-bold text-2xl text-status-amber">{punchlistCount}</p>
                <p className="text-[11px] text-text-tertiary mt-0.5">Punchlist</p>
              </Card>
            </div>
          </div>

          <div>
            <h2 className="text-xs font-semibold text-text-tertiary uppercase tracking-wide mb-2">By Floor (Today)</h2>
            <Card>
              {byFloorSorted.length === 0 ? (
                <p className="text-sm text-text-tertiary text-center py-2">No photos yet today.</p>
              ) : (
                <div className="space-y-2">
                  {byFloorSorted.map(([label, count]) => (
                    <div key={label} className="flex items-center justify-between text-sm">
                      <span className="text-text-secondary">{label}</span>
                      <span className="font-medium text-text-primary">{count} photos</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button size="lg" onClick={() => navigate("/camera")}>📷 Open Camera</Button>
            <Button variant="secondary" size="lg" onClick={() => navigate("/feed")}>🗂️ View Feed</Button>
          </div>
        </div>
      )}
    </AppShell>
  );
}
