import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AppShell from "../components/AppShell.jsx";
import Card from "../components/Card.jsx";
import Badge from "../components/Badge.jsx";
import { getPhotoById, getPhotoUrl } from "../lib/projectPhotoLog.js";

const CATEGORY_TONE = {
  "Safety Concern": "red",
  Punchlist: "amber",
  "Photo Update": "blue",
  Others: "neutral",
};

// v1.1 build spec section 9 -- tap any feed photo to see the full record.
// View-only: "No deleting others' photos, no editing others' records."
export default function PhotoDetail({ project }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [photo, setPhoto] = useState(null);
  const [imageUrl, setImageUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    getPhotoById(id)
      .then(async (row) => {
        setPhoto(row);
        setImageUrl(await getPhotoUrl(row.image_path));
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <AppShell project={project} title="Photo Detail" onBack={() => navigate(-1)}>
      {loading && <p className="text-sm text-text-tertiary text-center py-10">Loading...</p>}
      {error && <p className="text-sm text-status-red text-center py-10">{error}</p>}

      {photo && !loading && !error && (
        <div className="space-y-4">
          <div className="rounded-card overflow-hidden border border-hair-soft">
            {imageUrl && <img src={imageUrl} alt={photo.photo_id} className="w-full max-h-96 object-cover" />}
          </div>

          <div className="flex flex-wrap gap-1.5">
            {(photo.photo_category || []).map((c) => (
              <Badge key={c} tone={CATEGORY_TONE[c] || "neutral"}>{c}</Badge>
            ))}
          </div>

          <Card>
            <dl className="space-y-2.5 text-sm">
              <Row label="Photo ID" value={photo.photo_id} />
              <Row label="Project" value={project.description || project.project_code} />
              <Row label="Submitted By" value={photo.submitted_by?.employee?.full_name || photo.submitted_by?.employee_code} />
              <Row label="Role" value={photo.submitted_by?.roles?.role_name} />
              <Row label="Date" value={new Date(photo.created_at).toLocaleDateString()} />
              <Row label="Time" value={new Date(photo.created_at).toLocaleTimeString()} />
              <Row label="Floor Level" value={photo.floor_level || "—"} />
              <Row label="Unit Number" value={photo.unit_number || "—"} />
              <Row label="Scope of Work" value={(photo.scope_of_work || []).join(", ") || "—"} />
              {photo.remarks && <Row label="Remarks" value={photo.remarks} />}
            </dl>
          </Card>
        </div>
      )}
    </AppShell>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-text-tertiary shrink-0">{label}</dt>
      <dd className="text-text-primary text-right">{value}</dd>
    </div>
  );
}
