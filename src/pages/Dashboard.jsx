import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "../components/AppShell.jsx";
import Card from "../components/Card.jsx";
import Button from "../components/Button.jsx";
import Badge from "../components/Badge.jsx";
import { useAuth } from "../lib/useAuth.js";
import { listPhotoUpdates, getPhotoThumbUrls } from "../lib/projectPhotoLog.js";

function countBy(rows, field) {
  const counts = {};
  rows.forEach((r) => {
    (r[field] || []).forEach((v) => { counts[v] = (counts[v] || 0) + 1; });
  });
  return Object.entries(counts).sort((a, b) => b[1] - a[1]);
}

function isToday(iso) {
  const d = new Date(iso);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

export default function Dashboard({ project }) {
  const navigate = useNavigate();
  const { appUser } = useAuth();
  const roleCode = appUser?.roles?.role_code;

  const [photos, setPhotos] = useState([]);
  const [thumbUrls, setThumbUrls] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (roleCode !== "field_pic") { setLoading(false); return; }
    async function load() {
      setLoading(true);
      setError("");
      try {
        const rows = await listPhotoUpdates(project.id, { limit: 500 });
        setPhotos(rows);
        const paths = rows.slice(0, 8).map((r) => r.thumbnail_path).filter(Boolean);
        setThumbUrls(await getPhotoThumbUrls(paths));
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [project.id, roleCode]);

  if (roleCode !== "field_pic") {
    return (
      <AppShell project={project} title="Photo Log Dashboard" onBack={() => navigate("/")}>
        <p className="text-sm text-status-red text-center py-10">This dashboard is available to the Project PIC only.</p>
      </AppShell>
    );
  }

  const todayCount = photos.filter((p) => isToday(p.created_at)).length;
  const byScope = countBy(photos, "scope_of_work");
  const byFloor = photos.reduce((acc, r) => {
    const key = r.floor_level || "—";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const byFloorSorted = Object.entries(byFloor).sort((a, b) => b[1] - a[1]);
  const byCategory = countBy(photos, "photo_category");
  const recent = photos.slice(0, 8);

  return (
    <AppShell project={project} title="Photo Log Dashboard" onBack={() => navigate("/")}>
      {loading && <p className="text-sm text-text-tertiary text-center py-10">Loading...</p>}
      {error && <p className="text-sm text-status-red text-center py-10">{error}</p>}

      {!loading && !error && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <Card title="Total Photos">
              <p className="font-display font-bold text-2xl text-text-primary">{photos.length}</p>
            </Card>
            <Card title="Photos Today">
              <p className="font-display font-bold text-2xl text-brand-blue">{todayCount}</p>
            </Card>
          </div>

          <Card title="By Scope of Work">
            {byScope.length === 0 ? (
              <p className="text-sm text-text-tertiary text-center py-2">No photos yet.</p>
            ) : (
              <div className="space-y-2">
                {byScope.map(([label, count]) => (
                  <div key={label} className="flex items-center justify-between text-sm">
                    <span className="text-text-secondary truncate pr-2">{label}</span>
                    <Badge tone="blue">{count}</Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card title="By Floor">
            {byFloorSorted.length === 0 ? (
              <p className="text-sm text-text-tertiary text-center py-2">No photos yet.</p>
            ) : (
              <div className="space-y-2">
                {byFloorSorted.map(([label, count]) => (
                  <div key={label} className="flex items-center justify-between text-sm">
                    <span className="text-text-secondary truncate pr-2">{label}</span>
                    <Badge tone="neutral">{count}</Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card title="By Photo Category">
            {byCategory.length === 0 ? (
              <p className="text-sm text-text-tertiary text-center py-2">No photos yet.</p>
            ) : (
              <div className="space-y-2">
                {byCategory.map(([label, count]) => (
                  <div key={label} className="flex items-center justify-between text-sm">
                    <span className="text-text-secondary truncate pr-2">{label}</span>
                    <Badge tone={label === "Safety Concern" ? "red" : "green"}>{count}</Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card title="Recent Uploads">
            {recent.length === 0 ? (
              <p className="text-sm text-text-tertiary text-center py-2">No photos yet.</p>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {recent.map((p) => (
                  <div key={p.id} className="aspect-square rounded-control overflow-hidden bg-void border border-hair-soft">
                    {thumbUrls[p.thumbnail_path] && (
                      <img src={thumbUrls[p.thumbnail_path]} alt={p.photo_id} className="w-full h-full object-cover" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Button className="w-full" size="lg" onClick={() => navigate("/browse")}>
            Search &amp; Generate Report
          </Button>
        </div>
      )}
    </AppShell>
  );
}
