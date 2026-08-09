import { supabase } from "./supabaseClient.js";

// Reuses the get_my_field_projects() RPC already built for xadOS-app's
// field crew shell -- security definer, filtered to project team
// membership, excludes commercial data.
export async function listMyFieldProjects() {
  const { data, error } = await supabase.rpc("get_my_field_projects");
  if (error) throw error;
  return data;
}

// Owner role bypasses project_team_assignments entirely -- sees and can
// switch between every project, not just ones they're formally on the
// team for. See migration 08_owner_full_access.sql for the
// get_all_projects_for_owner() RPC (role-checked server-side too, not
// just hidden client-side) and the matching RLS widening on photos.
export async function listAllProjectsForOwner() {
  const { data, error } = await supabase.rpc("get_all_projects_for_owner");
  if (error) throw error;
  return data;
}
