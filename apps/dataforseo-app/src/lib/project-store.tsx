import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { tauriApi, type Project } from "./tauri";

interface ProjectContextValue {
  projects: Project[];
  active: Project | null;
  loading: boolean;
  reload: () => Promise<void>;
  setActive: (id: number | null) => void;
  createProject: (name: string, target: string) => Promise<number>;
  renameProject: (id: number, name: string) => Promise<void>;
  deleteProject: (id: number) => Promise<void>;
}

const ProjectContext = createContext<ProjectContextValue | null>(null);

const ACTIVE_PROJECT_KEY = "dataforseo.activeProjectId";

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeId, setActiveId] = useState<number | null>(() => {
    const v = window.localStorage.getItem(ACTIVE_PROJECT_KEY);
    return v ? parseInt(v, 10) : null;
  });
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const list = await tauriApi.projectsList();
      setProjects(list);
      // Auto-select the first project if nothing is selected and any exist.
      if (activeId == null && list.length > 0) {
        setActiveId(list[0].id);
      }
      // Drop the active id if it no longer exists.
      if (activeId != null && !list.some((p) => p.id === activeId)) {
        setActiveId(list[0]?.id ?? null);
      }
    } catch {
      // Non-fatal — projects are optional.
    } finally {
      setLoading(false);
    }
  }, [activeId]);

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (activeId == null) {
      window.localStorage.removeItem(ACTIVE_PROJECT_KEY);
    } else {
      window.localStorage.setItem(ACTIVE_PROJECT_KEY, String(activeId));
    }
  }, [activeId]);

  const active = useMemo(
    () => projects.find((p) => p.id === activeId) ?? null,
    [projects, activeId],
  );

  const createProject = useCallback(
    async (name: string, target: string) => {
      const id = await tauriApi.projectsCreate({ name, target });
      await reload();
      setActiveId(id);
      return id;
    },
    [reload],
  );

  const renameProject = useCallback(
    async (id: number, name: string) => {
      await tauriApi.projectsRename({ id, name });
      await reload();
    },
    [reload],
  );

  const deleteProject = useCallback(
    async (id: number) => {
      await tauriApi.projectsDelete({ id });
      await reload();
    },
    [reload],
  );

  const value = useMemo<ProjectContextValue>(
    () => ({
      projects,
      active,
      loading,
      reload,
      setActive: setActiveId,
      createProject,
      renameProject,
      deleteProject,
    }),
    [projects, active, loading, reload, createProject, renameProject, deleteProject],
  );

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
}

export function useProject(): ProjectContextValue {
  const ctx = useContext(ProjectContext);
  if (!ctx) {
    throw new Error("useProject must be called inside <ProjectProvider>");
  }
  return ctx;
}
