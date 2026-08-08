import React, { useState } from "react";
import { useAuth } from "../lib/useAuth.js";
import Input from "../components/Input.jsx";
import Button from "../components/Button.jsx";

// No navigate() on success -- useAuth's onAuthStateChange listener updates
// session state, which re-renders App.jsx past this screen automatically.
export default function Login() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    const { error: signInError } = await signIn(email, password);
    setSubmitting(false);
    if (signInError) setError("Incorrect email or password. Please try again.");
  }

  return (
    <div className="min-h-screen bg-void flex items-center justify-center p-6">
      <div className="w-full max-w-[380px]">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-full bg-brand-blue shadow-glow-blue flex items-center justify-center text-3xl mb-4">
            📷
          </div>
          <h1 className="font-display font-extrabold text-2xl text-text-primary text-center">XA Project PhotoLog</h1>
          <p className="text-xs text-text-tertiary tracking-[3px] mt-1">ONE LENS, ONE DATA</p>
        </div>

        <div className="bg-panel border border-hair rounded-card p-7 shadow-panel">
          <form onSubmit={handleSubmit}>
            <Input
              label="Email Address"
              type="email"
              placeholder="you@company.com"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              label="Password"
              type="password"
              placeholder="Enter your password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            {error && <p className="text-xs text-status-red mb-4 -mt-2">{error}</p>}
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Signing in..." : "Sign In"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
