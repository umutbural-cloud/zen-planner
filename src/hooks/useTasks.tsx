import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useUndo } from "./useUndo";
import type { Database } from "@/integrations/supabase/types";

export type TaskStatus = Database["public"]["Enums"]["task_status"];
export type TaskColor = "gray" | "yellow" | "red" | "blue" | "green";
export type TaskKind = "task" | "timebox";

export type Task = {
  id: string;
  project_id: string;
  user_id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  start_date: string | null;
  end_date: string | null;
  start_time: string | null;
  end_time: string | null;
  position: number;
  hidden: boolean;
  deleted_at: string | null;
  created_at: string;
  completed_at: string | null;
  color: TaskColor;
  kind: TaskKind;
  parent_block_id: string | null;
  category_id: string | null;
};

export const useTasks = (projectId: string | null) => {
  const { user } = useAuth();
  const { push } = useUndo();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = async () => {
    if (!user || !projectId) { setTasks([]); setLoading(false); return; }
    const { data } = await supabase
      .from("tasks")
      .select("*")
      .eq("project_id", projectId)
      .is("deleted_at", null)
      .order("position", { ascending: true });
    setTasks((data as Task[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchTasks(); }, [user, projectId]);

  const createTask = async (task: {
    title: string;
    description?: string;
    status?: TaskStatus;
    start_date?: string;
    end_date?: string;
    start_time?: string;
    end_time?: string;
    color?: TaskColor;
    kind?: TaskKind;
    parent_block_id?: string | null;
    category_id?: string | null;
  }) => {
    if (!user || !projectId) return null;
    const maxPos = tasks.reduce((m, t) => Math.max(m, t.position || 0), 0);
    const { data, error } = await supabase
      .from("tasks")
      .insert({ ...task, project_id: projectId, user_id: user.id, position: maxPos + 1 } as any)
      .select()
      .single();
    if (!error && data) {
      const created = data as Task;
      setTasks((prev) => [...prev, created]);
      push({
        label: "Görev eklendi",
        undo: async () => {
          await supabase.from("tasks").update({ deleted_at: new Date().toISOString() }).eq("id", created.id);
          setTasks((prev) => prev.filter((t) => t.id !== created.id));
        },
        redo: async () => {
          await supabase.from("tasks").update({ deleted_at: null }).eq("id", created.id);
          fetchTasks();
        },
      });
    }
    return data as Task | null;
  };

  const updateTask = async (id: string, updates: Partial<Omit<Task, "id" | "project_id" | "user_id" | "created_at">>) => {
    const before = tasks.find((t) => t.id === id);
    const { data, error } = await supabase.from("tasks").update(updates as any).eq("id", id).select().single();
    if (!error && data) {
      setTasks((prev) => prev.map((t) => (t.id === id ? (data as Task) : t)));

      // Sync auto-created pomodoro session with task completion state
      const task = data as Task;
      const becameDone = before && before.status !== "done" && task.status === "done";
      const becameUndone = before && before.status === "done" && task.status !== "done";
      if (user && (becameDone || becameUndone)) {
        try {
          // Always remove any prior auto-created session for this task to keep stats accurate
          await supabase.from("pomodoro_sessions").delete().eq("task_id", task.id);
          if (becameDone && task.start_date && task.end_date && task.start_date === task.end_date && task.start_time && task.end_time) {
            const startISO = new Date(`${task.start_date}T${task.start_time}`).toISOString();
            const endISO = new Date(`${task.end_date}T${task.end_time}`).toISOString();
            const dur = Math.max(0, Math.round((new Date(endISO).getTime() - new Date(startISO).getTime()) / 1000));
            if (dur > 0) {
              await supabase.from("pomodoro_sessions").insert({
                user_id: user.id,
                started_at: startISO,
                ended_at: endISO,
                duration_seconds: dur,
                kind: "work",
                category_id: (task as any).category_id || null,
                note: task.title,
                task_id: task.id,
              } as any);
            }
          }
        } catch {}
      }

      if (before) {
        const beforeSnap: any = {};
        Object.keys(updates).forEach((k) => { beforeSnap[k] = (before as any)[k]; });
        push({
          label: "Görev düzenlendi",
          undo: async () => {
            const { data: r } = await supabase.from("tasks").update(beforeSnap).eq("id", id).select().single();
            if (r) setTasks((prev) => prev.map((t) => (t.id === id ? (r as Task) : t)));
          },
          redo: async () => {
            const { data: r } = await supabase.from("tasks").update(updates as any).eq("id", id).select().single();
            if (r) setTasks((prev) => prev.map((t) => (t.id === id ? (r as Task) : t)));
          },
        });
      }
    }
    return data;
  };

  const deleteTask = async (id: string) => {
    const before = tasks.find((t) => t.id === id);
    if (!before) return;
    await supabase.from("pomodoro_sessions").delete().eq("task_id", id);
    await supabase.from("tasks").update({ deleted_at: new Date().toISOString() }).eq("id", id);
    setTasks((prev) => prev.filter((t) => t.id !== id));
    push({
      label: "Görev silindi",
      undo: async () => {
        await supabase.from("tasks").update({ deleted_at: null }).eq("id", id);
        setTasks((prev) => [...prev, { ...before, deleted_at: null }].sort((a, b) => a.position - b.position));
      },
      redo: async () => {
        await supabase.from("tasks").update({ deleted_at: new Date().toISOString() }).eq("id", id);
        setTasks((prev) => prev.filter((t) => t.id !== id));
      },
    });
  };

  // Reorder by passing a new ordered array of task IDs
  const reorderTasks = async (orderedIds: string[]) => {
    const idToPos = new Map(orderedIds.map((id, i) => [id, i + 1]));
    setTasks((prev) =>
      [...prev].map((t) => (idToPos.has(t.id) ? { ...t, position: idToPos.get(t.id)! } : t))
        .sort((a, b) => a.position - b.position)
    );
    await Promise.all(
      orderedIds.map((id, i) =>
        supabase.from("tasks").update({ position: i + 1 } as any).eq("id", id)
      )
    );
  };

  return { tasks, loading, createTask, updateTask, deleteTask, reorderTasks, refetch: fetchTasks };
};
