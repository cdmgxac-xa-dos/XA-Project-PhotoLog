import JSZip from "jszip";

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function csvCell(value) {
  const s = String(value ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// "Export Excel" -- a plain CSV, which Excel opens natively. No xlsx
// library needed for what's really just a flat table of the same fields
// already shown in the report.
export function exportPhotosAsCsv(photos, projectLabel) {
  const headers = ["Photo ID", "Date", "Time", "Floor Level", "Unit Number", "Scope of Work", "Photo Category", "Remarks", "Submitted By", "Role"];
  const rows = photos.map((p) => {
    const d = new Date(p.created_at);
    return [
      p.photo_id,
      d.toLocaleDateString(),
      d.toLocaleTimeString(),
      p.floor_level || "",
      p.unit_number || "",
      (p.scope_of_work || []).join("; "),
      (p.photo_category || []).join("; "),
      p.remarks || "",
      p.submitted_by?.employee?.full_name || p.submitted_by?.employee_code || "",
      p.submitted_by?.roles?.role_name || "",
    ];
  });
  const csv = [headers, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n");
  triggerDownload(new Blob([csv], { type: "text/csv;charset=utf-8;" }), `${projectLabel}-photolog-report.csv`);
}

// "Export Images (ZIP)" -- bundles the full-size image for each selected
// photo, fetched from its signed URL, into a single downloadable zip.
export async function exportPhotosAsZip(photos, imageUrls, projectLabel) {
  const zip = new JSZip();
  await Promise.all(
    photos.map(async (p) => {
      const url = imageUrls[p.image_path];
      if (!url) return;
      const response = await fetch(url);
      const blob = await response.blob();
      const location = [p.floor_level, p.unit_number].filter(Boolean).join("-");
      zip.file(`${p.photo_id}${location ? "_" + location : ""}.jpg`, blob);
    })
  );
  const zipBlob = await zip.generateAsync({ type: "blob" });
  triggerDownload(zipBlob, `${projectLabel}-photolog-images.zip`);
}
