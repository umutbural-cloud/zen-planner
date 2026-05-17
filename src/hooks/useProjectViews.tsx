import { useMemo } from "react";
import { useProjects, ViewKey } from "./useProjects";

export type { ViewKey } from "./useProjects";

const ALL_VIEWS: ViewKey[] = ["notes", "table", "gantt", "kanban", "calendar"];
const DEFAULT_VIEWS: ViewKey[] = ["notes", "table"];

export const useProjectViews = (projectId: string | null) => {
  const { projects, updateProject } = useProjects();
  const project = useMemo(() => projects.find((p) => p.id === projectId), [projects, projectId]);
  const views: ViewKey[] = project?.enabled_views?.length ? project.enabled_views : DEFAULT_VIEWS;

  const setProjectViews = async (next: ViewKey[]) => {
    if (!projectId) return;
    await updateProject(projectId, { enabled_views: next });
  };

  const addView = (v: ViewKey) => {
    if (views.includes(v)) return;
    setProjectViews([...views, v]);
  };
  const removeView = (v: ViewKey) => {
    setProjectViews(views.filter((x) => x !== v));
  };

  return { views, addView, removeView, allViews: ALL_VIEWS };
};
