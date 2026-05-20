import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useUndo } from "./useUndo";
import type { Database } from "@/integrations/supabase/types";

export type TaskStatus = Database["public"]["Enums"]["task_status"];
export type TaskColor = "gray" | "yellow" | "red" | "blue" | "green";
export type TaskKind = "task" | "timebox";
type TaskRow = Database["public"]["Tables"]["tasks"]["Row"];
type TaskInsert = Database["public"]["Tables"]["tasks"]["Insert"];
type TaskUpdate = Database["public"]["Tables"]["tasks"]["Update"];
type PomodoroSessionInsert = Database["public"]["Tables"]["pomodoro_sessions"]["Insert"];

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

type CreateTaskInput = {
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
};

type UpdateTaskInput = Partial<Omit<Task, "id" | "project_id" | "user_id" | "created_at">>;

const normalizeTask = (row: TaskRow): Task => ({
  ...row,
  color: (["gray", "yellow", "red", "blue", "green"] as const).includes(row.color as TaskColor)
    ? row.color as TaskColor
    : "gray",
  kind: row.kind === "timebox" ? "timebox" : "task",
});

export const useTasks = (projectId: string | null) => {
  const { user } = useAuth();
  const { push } = useUndo();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = useCallback(async () => {
    if (!user || !projectId) { setTasks([]); setLoading(false); return; }
    const { data } = await supabase
      .from("tasks")
      .select("*")
      .eq("user_id", user.id)
      .eq("project_id", projectId)
      .is("deleted_at", null)
      .order("position", { ascending: true });
    setTasks((data || []).map(normalizeTask));
    setLoading(false);
  }, [projectId, user]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const createTask = async (task: CreateTaskInput) => {
    if (!user || !projectId) return null;
    const maxPos = tasks.reduce((m, t) => Math.max(m, t.position || 0), 0);
    const payload: TaskInsert = { ...task, project_id: projectId, user_id: user.id, position: maxPos + 1 };
    const { data, error } = await supabase
      .from("tasks")
      .insert(payload)
      .select()
      .single();
    if (!error && data) {
      const created = normalizeTask(data);
      setTasks((prev) => [...prev, created]);
      push({
        label: "Görev eklendi",
        undo: async () => {
          await supabase.from("tasks").update({ deleted_at: new Date().toISOString() }).eq("id", created.id).eq("user_id", user.id);
          setTasks((prev) => prev.filter((t) => t.id !== created.id));
        },
        redo: async () => {
          await supabase.from("tasks").update({ deleted_at: null }).eq("id", created.id).eq("user_id", user.id);
          fetchTasks();
        },
      });
    }
    return data ? normalizeTask(data) : null;
  };

  const updateTask = async (id: string, updates: UpdateTaskInput) => {
    if (!user) return null;
    const before = tasks.find((t) => t.id === id);
    const updatePayload: TaskUpdate = updates;
    const { data, error } = await supabase.from("tasks").update(updatePayload).eq("id", id).eq("user_id", user.id).select().single();
    if (!error && data) {
      setTasks((prev) => prev.map((t) => (t.id === id ? normalizeTask(data) : t)));

      // Sync auto-created pomodoro session with task completion state
      const task = normalizeTask(data);
      const becameDone = before && before.status !== "done" && task.status === "done";
      const becameUndone = before && before.status === "done" && task.status !== "done";
      if (becameDone || becameUndone) {
        try {
          // Only touch the auto-created "calendar block" session.
          // Do NOT delete user-created sessions tied to this task (that would erase history).
          if (task.start_date && task.end_date && task.start_date === task.end_date && task.start_time && task.end_time) {
            const startISO = new Date(`${task.start_date}T${task.start_time}`).toISOString();
            const endISO = new Date(`${task.end_date}T${task.end_time}`).toISOString();
            const dur = Math.max(0, Math.round((new Date(endISO).getTime() - new Date(startISO).getTime()) / 1000));

            // Remove any prior auto-created session for the same exact time range.
            // This keeps toggling done/undone idempotent without nuking unrelated sessions.
            if (dur > 0) {
              await supabase
                .from("pomodoro_sessions")
                .delete()
                .eq("user_id", user.id)
                .eq("task_id", task.id)
                .eq("kind", "work")
                .eq("started_at", startISO)
                .eq("ended_at", endISO)
                .eq("duration_seconds", dur)
                .eq("note", task.title);
            }

            if (becameDone && dur > 0) {
              const session: PomodoroSessionInsert = {
                user_id: user.id,
                started_at: startISO,
                ended_at: endISO,
                duration_seconds: dur,
                kind: "work",
                category_id: task.category_id || null,
                note: task.title,
                task_id: task.id,
              };
              await supabase.from("pomodoro_sessions").insert(session);
            }
          }
        } catch {
          // Session sync is best-effort; the task update itself should remain committed.
        }
      }

      if (before) {
        const beforeSnap = Object.fromEntries(
          (Object.keys(updates) as Array<keyof UpdateTaskInput>).map((key) => [key, before[key]])
        ) as TaskUpdate;
        push({
          label: "Görev düzenlendi",
          undo: async () => {
            const { data: r } = await supabase.from("tasks").update(beforeSnap).eq("id", id).eq("user_id", user.id).select().single();
            if (r) setTasks((prev) => prev.map((t) => (t.id === id ? normalizeTask(r) : t)));
          },
          redo: async () => {
            const { data: r } = await supabase.from("tasks").update(updatePayload).eq("id", id).eq("user_id", user.id).select().single();
            if (r) setTasks((prev) => prev.map((t) => (t.id === id ? normalizeTask(r) : t)));
          },
        });
      }
    }
    return data;
  };

  const deleteTask = async (id: string) => {
    if (!user) return;
    const before = tasks.find((t) => t.id === id);
    if (!before) return;
    await supabase.from("pomodoro_sessions").delete().eq("task_id", id).eq("user_id", user.id);
    await supabase.from("tasks").update({ deleted_at: new Date().toISOString() }).eq("id", id).eq("user_id", user.id);
    setTasks((prev) => prev.filter((t) => t.id !== id));
    push({
      label: "Görev silindi",
      undo: async () => {
        await supabase.from("tasks").update({ deleted_at: null }).eq("id", id).eq("user_id", user.id);
        setTasks((prev) => [...prev, { ...before, deleted_at: null }].sort((a, b) => a.position - b.position));
      },
      redo: async () => {
        await supabase.from("tasks").update({ deleted_at: new Date().toISOString() }).eq("id", id).eq("user_id", user.id);
        setTasks((prev) => prev.filter((t) => t.id !== id));
      },
    });
  };

  // Reorder by passing a new ordered array of task IDs
  const reorderTasks = async (orderedIds: string[]) => {
    if (!user) return;
    const idToPos = new Map(orderedIds.map((id, i) => [id, i + 1]));
    setTasks((prev) =>
      [...prev].map((t) => (idToPos.has(t.id) ? { ...t, position: idToPos.get(t.id)! } : t))
        .sort((a, b) => a.position - b.position)
    );
    await Promise.all(
      orderedIds.map((id, i) =>
        supabase.from("tasks").update({ position: i + 1 }).eq("id", id)
          .eq("user_id", user.id)
      )
    );
  };

  return { tasks, loading, createTask, updateTask, deleteTask, reorderTasks, refetch: fetchTasks };
};
