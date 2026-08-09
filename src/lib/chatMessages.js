import { supabase } from "./supabaseClient.js";

// Bounded chat history -- see migration 10_photolog_chat_persistence.sql.
// The table itself is capped to the most recent 50 rows per
// project+category by a database trigger, so "last 50" here is really
// just "everything that still exists."

function mapRow(row) {
  return {
    id: row.id,
    text: row.message_text,
    name: row.sender?.employee?.full_name || row.sender?.employee_code || "—",
    role: row.sender?.roles?.role_name || "",
    at: row.created_at,
    mentions: row.mentions || [],
  };
}

export async function listChatMessages(projectId, category) {
  const { data, error } = await supabase
    .from("photolog_chat_messages")
    .select("id, user_id, message_text, mentions, created_at, sender:user_id ( employee_code, roles ( role_name ), employee:employee_id ( full_name ) )")
    .eq("project_id", projectId)
    .eq("category", category)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return data.reverse().map(mapRow);
}

export async function sendChatMessage({ projectId, category, userId, text, mentions }) {
  const { error } = await supabase.from("photolog_chat_messages").insert({
    project_id: projectId,
    category,
    user_id: userId,
    message_text: text,
    mentions,
  });
  if (error) throw error;
}
