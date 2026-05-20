import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getLocalDayRange } from "@/features/home/lib/dateRanges";
import type { HomeSectionState, HomeTasksData, HomePlanTask } from "@/features/home/types";
import { useAuth } from "@/hooks/useAuth";
import { useProjects } from "@/hooks/useProjects";
import { useUserSettings } from "@/hooks/useUserSettings";

const emptyData: HomeTasksData = {
  completedTodayCount: 0,
  todo: [],
  inProgress: [],
};

const orderKey = (status: HomePlanTask["status"], userId: string) => `home.taskOrder.${status}.${userId}`;

const readOrder = (status: HomePlanTask["status"], userId: string) => {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(orderKey(status, userId)) || "[]");
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
};

const writeOrder = (status: HomePlanTask["status"], userId: string, ids: string[]) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(orderKey(status, userId), JSON.stringify(ids));
};

const applyOrder = (tasks: HomePlanTask[], order: string[]) => {
  const orderIndex = new Map(order.map((id, index) => [id, index]));
  return [...tasks].sort((a, b) => {
    const ai = orderIndex.get(a.id);
    const bi = orderIndex.get(b.id);
    if (ai != null && bi != null) return ai - bi;
    if (ai != null) return -1;
    if (bi != null) return 1;
    return a.position - b.position || a.title.localeCompare(b.title, "tr");
  });
};

export const useHomeTasksData = (): HomeSectionState<HomeTasksData> & {
  reorderTasks: (status: HomePlanTask["status"], activeId: string, overId: string) => void;
} => {
  const { user } = useAuth();
  const { settings } = useUserSettings();
  const { projects } = useProjects();
  const [state, setState] = useState<HomeSectionState<HomeTasksData>>({ status: "loading", data: emptyData });
  const today = useMemo(() => getLocalDayRange(), []);
  const projectIds = useMemo(
    () => new Set(projects.filter((project) => project.kind === "project").map((project) => project.id)),
    [projects]
  );
  const selectedProjectIds = useMemo(
    () => (settings.home_task_project_ids ?? []).filter((id) => projectIds.has(id)),
    [projectIds, settings.home_task_project_ids]
  );
  const hasProjectFilter = selectedProjectIds.length > 0;

  useEffect(() => {
    if (!user) {
      setState({ status: "empty", data: emptyData });
      return;
    }

    let cancelled = false;

    (async () => {
      setState({ status: "loading", data: emptyData });

      let openQuery = supabase
          .from("tasks")
          .select("id,title,status,completed_at,position,project_id")
          .eq("user_id", user.id)
          .is("deleted_at", null)
          .is("parent_block_id", null)
          .in("status", ["todo", "in_progress"])
          .order("position", { ascending: true });
      let doneQuery = supabase
          .from("tasks")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("status", "done")
          .is("deleted_at", null)
          .gte("completed_at", today.start.toISOString())
          .lt("completed_at", today.end.toISOString());

      if (hasProjectFilter) {
        openQuery = openQuery.in("project_id", selectedProjectIds);
        doneQuery = doneQuery.in("project_id", selectedProjectIds);
      }

      const [openResult, doneResult] = await Promise.all([openQuery, doneQuery]);

      if (cancelled) return;

      if (openResult.error || doneResult.error) {
        setState({
          status: "error",
          data: emptyData,
          error: openResult.error?.message || doneResult.error?.message,
        });
        return;
      }

      const rows = (openResult.data || []) as HomePlanTask[];
      const todo = applyOrder(rows.filter((task) => task.status === "todo"), readOrder("todo", user.id));
      const inProgress = applyOrder(rows.filter((task) => task.status === "in_progress"), readOrder("in_progress", user.id));

      setState({
        status: "ready",
        data: {
          completedTodayCount: doneResult.count || 0,
          todo,
          inProgress,
        },
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [hasProjectFilter, selectedProjectIds, today.end, today.start, user]);

  const reorderTasks = useCallback((status: HomePlanTask["status"], activeId: string, overId: string) => {
    if (!user || activeId === overId) return;
    setState((prev) => {
      const source = status === "todo" ? prev.data.todo : prev.data.inProgress;
      const from = source.findIndex((task) => task.id === activeId);
      const to = source.findIndex((task) => task.id === overId);
      if (from < 0 || to < 0) return prev;

      const nextList = [...source];
      const [moved] = nextList.splice(from, 1);
      nextList.splice(to, 0, moved);
      writeOrder(status, user.id, nextList.map((task) => task.id));

      return {
        ...prev,
        data: {
          ...prev.data,
          todo: status === "todo" ? nextList : prev.data.todo,
          inProgress: status === "in_progress" ? nextList : prev.data.inProgress,
        },
      };
    });
  }, [user]);

  return { ...state, reorderTasks };
};
