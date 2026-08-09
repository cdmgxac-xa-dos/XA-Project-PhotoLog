import React from "react";
import AppShell from "../components/AppShell.jsx";
import Card from "../components/Card.jsx";
import Button from "../components/Button.jsx";
import { useAuth } from "../lib/useAuth.js";

export default function Profile({ project, projects, onSwitchProject }) {
  const { appUser, signOut } = useAuth();

  return (
    <AppShell project={project} title="Profile">
      <div className="space-y-4">
        <Card>
          <p className="font-display font-bold text-lg text-text-primary">
            {appUser?.employee?.full_name || appUser?.employee_code}
          </p>
          <p className="text-sm text-text-tertiary mt-0.5">{appUser?.roles?.role_name}</p>
          <p className="text-xs text-text-tertiary mt-2">{appUser?.employee_code} · {appUser?.login_email}</p>
        </Card>

        <Card title="Current Project">
          <p className="text-sm text-text-primary">{project?.description || project?.project_code}</p>
          <p className="text-xs text-text-tertiary mt-0.5">{project?.project_code} {project?.site_location && `· ${project.site_location}`}</p>
          {projects.length > 1 && (
            <Button variant="secondary" size="sm" className="mt-3" onClick={onSwitchProject}>
              Switch Project
            </Button>
          )}
        </Card>

        <Button variant="danger" className="w-full" onClick={signOut}>Sign Out</Button>
      </div>
    </AppShell>
  );
}
