// Shared "Today / Yesterday / This Week / This Month" presets for the
// v1.1 Feed's advanced filter panel and any future date-range picker.
function dateOnly(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export const DATE_PRESETS = ["Today", "Yesterday", "This Week", "This Month", "Custom Range"];

export function resolvePreset(preset, customFrom, customTo) {
  const now = new Date();
  if (preset === "Today") {
    const d = dateOnly(now);
    return { dateFrom: `${d}T00:00:00`, dateTo: `${d}T23:59:59` };
  }
  if (preset === "Yesterday") {
    const y = new Date(now);
    y.setDate(y.getDate() - 1);
    const d = dateOnly(y);
    return { dateFrom: `${d}T00:00:00`, dateTo: `${d}T23:59:59` };
  }
  if (preset === "This Week") {
    const start = new Date(now);
    start.setDate(start.getDate() - start.getDay());
    return { dateFrom: `${dateOnly(start)}T00:00:00`, dateTo: `${dateOnly(now)}T23:59:59` };
  }
  if (preset === "This Month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return { dateFrom: `${dateOnly(start)}T00:00:00`, dateTo: `${dateOnly(now)}T23:59:59` };
  }
  if (preset === "Custom Range") {
    return {
      dateFrom: customFrom ? `${customFrom}T00:00:00` : undefined,
      dateTo: customTo ? `${customTo}T23:59:59` : undefined,
    };
  }
  return {};
}
