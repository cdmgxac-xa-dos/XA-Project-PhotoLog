import { useEffect, useState, useCallback } from "react";
import { supabase } from "./supabaseClient.js";

// Same session + app_users join pattern as xadOS-app's useAuth.js — kept
// in sync manually since this is a separate small codebase, not a shared
// package.
export function useAuth() {
  const [session, setSession] = useState(null);
  const [appUser, setAppUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadAppUser = useCallback(async (userId) => {
    if (!userId) {
      setAppUser(null);
      return;
    }
    const { data, error } = await supabase
      .from("app_users")
      .select("id, employee_code, login_email, department_id, status, must_change_password, roles(role_code, role_name, access_level), employee:employee_id ( full_name )")
      .eq("id", userId)
      .single();

    if (error) {
      console.error("Failed to load app_users record:", error.message);
      setAppUser(null);
      return;
    }
    setAppUser(data);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      loadAppUser(data.session?.user?.id);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      loadAppUser(newSession?.user?.id);
    });

    return () => listener.subscription.unsubscribe();
  }, [loadAppUser]);

  const signIn = (email, password) =>
    supabase.auth.signInWithPassword({ email, password });

  const signOut = () => supabase.auth.signOut();

  const changePassword = async (newPassword) => {
    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
    if (updateError) throw updateError;
    const { error: rpcError } = await supabase.rpc("mark_password_changed");
    if (rpcError) throw rpcError;
    setAppUser((prev) => (prev ? { ...prev, must_change_password: false } : prev));
  };

  return { session, appUser, loading, signIn, signOut, changePassword };
}
