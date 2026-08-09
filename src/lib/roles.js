// Who gets PIC-level features (Dashboard, Search & Filter, Reports, the
// Feed's advanced filter panel): the project's own PIC, or anyone with
// owner-level PhotoLog access (company owner, or the photolog_admins
// allowlist -- see useAuth.js's isPhotologAdmin and migration
// 09_photolog_admins.sql).
export function canManage(roleCode, isPhotologAdmin) {
  return roleCode === "field_pic" || !!isPhotologAdmin;
}
