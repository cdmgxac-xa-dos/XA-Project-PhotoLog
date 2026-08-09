import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./lib/useAuth.js";
import { useCurrentProject } from "./lib/useCurrentProject.js";
import Login from "./pages/Login.jsx";
import ChangePassword from "./pages/ChangePassword.jsx";
import ProjectPicker from "./pages/ProjectPicker.jsx";
import Home from "./pages/Home.jsx";
import Feed from "./pages/Feed.jsx";
import PhotoDetail from "./pages/PhotoDetail.jsx";
import Camera from "./pages/Camera.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Browser from "./pages/Browser.jsx";
import Report from "./pages/Report.jsx";
import Profile from "./pages/Profile.jsx";

function FullScreenMessage({ children }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-void text-text-secondary text-sm text-center p-6">
      {children}
    </div>
  );
}

// Gate: session -> must_change_password -> project selection -> routes.
// No route wraps Login/ChangePassword -- once auth state flips, this
// component just re-renders past them, no navigate() calls needed.
export default function App() {
  const { session, appUser, loading } = useAuth();

  if (loading) return <FullScreenMessage>Loading...</FullScreenMessage>;
  if (!session) return <Login />;
  if (appUser?.must_change_password) return <ChangePassword />;

  return (
    <BrowserRouter>
      <ProjectGate roleCode={appUser?.roles?.role_code} />
    </BrowserRouter>
  );
}

// v1.1: "/" is now Home (today's summary + Open Camera / View Feed),
// not an auto-launched camera -- see Home.jsx and BottomNav.jsx for why.
function ProjectGate({ roleCode }) {
  const { projects, project, loading, error, selectProject, clearProject } = useCurrentProject(roleCode);

  if (loading) return <FullScreenMessage>Loading your projects...</FullScreenMessage>;
  if (error) return <FullScreenMessage>{error}</FullScreenMessage>;
  if (projects.length === 0) {
    return <FullScreenMessage>You're not assigned to any projects yet. Check with your Project Manager.</FullScreenMessage>;
  }
  if (!project) {
    return <ProjectPicker projects={projects} onSelect={selectProject} />;
  }

  return (
    <Routes>
      <Route path="/" element={<Home project={project} projects={projects} onSwitchProject={clearProject} />} />
      <Route path="/feed" element={<Feed project={project} />} />
      <Route path="/photo/:id" element={<PhotoDetail project={project} />} />
      <Route path="/camera" element={<Camera project={project} />} />
      <Route path="/dashboard" element={<Dashboard project={project} />} />
      <Route path="/browse" element={<Browser project={project} />} />
      <Route path="/report" element={<Report project={project} />} />
      <Route path="/profile" element={<Profile project={project} projects={projects} onSwitchProject={clearProject} />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
