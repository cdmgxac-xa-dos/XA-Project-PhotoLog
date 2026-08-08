import React, { useState } from "react";
import { useAuth } from "../lib/useAuth.js";
import Input from "../components/Input.jsx";
import Button from "../components/Button.jsx";

// Shown instead of everything else while must_change_password is true
// (admin-created accounts get a temporary password). changePassword()
// clears the flag, which re-renders App.jsx past this screen automatically.
export default function ChangePassword() {
  const { changePassword } = useAuth();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setSubmitting(true);
    try {
      await changePassword(newPassword);
    } catch (err) {
      setError(err.message || "Could not update password.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-void p-6">
      <div className="w-full max-w-[380px] bg-panel border border-hair rounded-card p-7 shadow-panel">
        <h1 className="font-display font-extrabold text-xl text-center mb-2">Set a new password</h1>
        <p className="text-center text-sm text-text-secondary mb-6">
          For your security, set your own password before continuing.
        </p>
        <form onSubmit={handleSubmit}>
          <Input
            label="New Password"
            type="password"
            placeholder="At least 6 characters"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />
          <Input
            label="Confirm Password"
            type="password"
            placeholder="Re-enter your new password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
          {error && <p className="text-xs text-status-red mb-4 -mt-2">{error}</p>}
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Saving..." : "Set Password & Continue"}
          </Button>
        </form>
      </div>
    </div>
  );
}
