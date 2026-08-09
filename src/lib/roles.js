// Who gets PIC-level features (Dashboard, Search & Filter, Reports, the
// Feed's advanced filter panel): the project's PIC, or the company
// owner (full access everywhere, not just team-assigned projects --
// see migration 08_owner_full_access.sql).
export function canManage(roleCode) {
  return roleCode === "field_pic" || roleCode === "owner";
}
