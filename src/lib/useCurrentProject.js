import { useEffect, useState, useCallback } from "react";
import { listMyFieldProjects, listAllProjectsForOwner } from "./fieldProjects.js";

const STORAGE_KEY = "xa-photolog:project-id";

// Project is chosen once per device (remembered in localStorage), never
// re-asked per photo -- the whole point of this app existing separately
// from xadOS-app's menu-driven project navigation.
//
// isPhotologAdmin (from useAuth()) gets every project, not just
// team-assigned ones -- see listAllProjectsForOwner().
export function useCurrentProject(isPhotologAdmin) {
  const [projects, setProjects] = useState([]);
  const [projectId, setProjectId] = useState(() => localStorage.getItem(STORAGE_KEY) || "");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetcher = isPhotologAdmin ? listAllProjectsForOwner : listMyFieldProjects;
    fetcher()
      .then((rows) => setProjects(rows))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [isPhotologAdmin]);

  const selectProject = useCallback((id) => {
    localStorage.setItem(STORAGE_KEY, id);
    setProjectId(id);
  }, []);

  const clearProject = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setProjectId("");
  }, []);

  const project = projects.find((p) => p.id === projectId) || null;

  // Skip the picker entirely when there's only one project to choose from.
  useEffect(() => {
    if (!loading && !projectId && projects.length === 1) {
      selectProject(projects[0].id);
    }
  }, [loading, projectId, projects, selectProject]);

  return { projects, project, projectId, loading, error, selectProject, clearProject };
}
