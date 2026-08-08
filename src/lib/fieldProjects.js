import { supabase } from "./supabaseClient.js";

// Reuses the get_my_field_projects() RPC already built for xadOS-app's
// field crew shell -- security definer, filtered to project team
// membership, excludes commercial data.
export async function listMyFieldProjects() {
  const { data, error } = await supabase.rpc("get_my_field_projects");
  if (error) throw error;
  return data;
}
