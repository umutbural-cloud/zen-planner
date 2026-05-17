import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useUndo } from "./useUndo";

export type Priority = "low" | "medium" | "high";
export type Urgency = "someday" | "this_week" | "today";

export type BacklogTask = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  priority: Priority;
  urgency: Urgency;
  due_date: string | null;
  position: number;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

export const useBacklog = () => {
  const { user } = useAuth();
  const { push } = useUndo();
  const [items, setItems] = useState<BacklogTask[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchItems = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("backlog_tasks")
      .select("*")
      .is("deleted_at", null)
      .order("position", { ascending: true });
    setItems((data as BacklogTask[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchItems(); }, [user]);

  const createItem = async (input: { title: string; priority?: Priority; urgency?: Urgency; due_date?: string | null }) => {
    if (!user) return null;
    const maxPos = items.reduce((m, t) => Math.max(m, t.position || 0), 0);
    const { data, error } = await supabase
      .from("backlog_tasks")
      .insert({
        user_id: user.id,
        title: input.title,
        priority: input.priority || "medium",
        urgency: input.urgency || "someday",
        due_date: input.due_date || null,
        position: maxPos + 1,
      })
      .select()
      .single();
    if (!error && data) {
      const created = data as BacklogTask;
      setItems((prev) => [...prev, created]);
      push({
        label: "Heybe görevi eklendi",
        undo: async () => {
          await supabase.from("backlog_tasks").update({ deleted_at: new Date().toISOString() }).eq("id", created.id);
          setItems((prev) => prev.filter((t) => t.id !== created.id));
        },
        redo: async () => {
          await supabase.from("backlog_tasks").update({ deleted_at: null }).eq("id", created.id);
          fetchItems();
        },
      });
    }
    return data as BacklogTask | null;
  };

  const updateItem = async (id: string, updates: Partial<Omit<BacklogTask, "id" | "user_id" | "created_at" | "updated_at">>) => {
    const before = items.find((t) => t.id === id);
    if (!before) return;
    const { data, error } = await supabase.from("backlog_tasks").update(updates as any).eq("id", id).select().single();
    if (!error && data) {
      setItems((prev) => prev.map((t) => (t.id === id ? (data as BacklogTask) : t)));
      const beforeSnap = { ...before };
      push({
        label: "Heybe görevi düzenlendi",
        undo: async () => {
          const { data: r } = await supabase.from("backlog_tasks").update({
            title: beforeSnap.title, priority: beforeSnap.priority, urgency: beforeSnap.urgency,
            due_date: beforeSnap.due_date, description: beforeSnap.description,
          }).eq("id", id).select().single();
          if (r) setItems((prev) => prev.map((t) => (t.id === id ? (r as BacklogTask) : t)));
        },
        redo: async () => {
          const { data: r } = await supabase.from("backlog_tasks").update(updates as any).eq("id", id).select().single();
          if (r) setItems((prev) => prev.map((t) => (t.id === id ? (r as BacklogTask) : t)));
        },
      });
    }
  };

  const deleteItem = async (id: string) => {
    const before = items.find((t) => t.id === id);
    if (!before) return;
    await supabase.from("backlog_tasks").update({ deleted_at: new Date().toISOString() }).eq("id", id);
    setItems((prev) => prev.filter((t) => t.id !== id));
    push({
      label: "Heybe görevi silindi",
      undo: async () => {
        await supabase.from("backlog_tasks").update({ deleted_at: null }).eq("id", id);
        setItems((prev) => [...prev, { ...before, deleted_at: null }].sort((a, b) => a.position - b.position));
      },
      redo: async () => {
        await supabase.from("backlog_tasks").update({ deleted_at: new Date().toISOString() }).eq("id", id);
        setItems((prev) => prev.filter((t) => t.id !== id));
      },
    });
  };

  // Move backlog item to a project as a regular task
  const moveToProject = async (id: string, projectId: string) => {
    if (!user) return;
    const item = items.find((t) => t.id === id);
    if (!item) return;
    // Get max task position in project
    const { data: existing } = await supabase
      .from("tasks")
      .select("position")
      .eq("project_id", projectId)
      .order("position", { ascending: false })
      .limit(1);
    const maxPos = existing?.[0]?.position || 0;

    const { data: newTask } = await supabase
      .from("tasks")
      .insert({
        title: item.title,
        description: item.description,
        end_date: item.due_date,
        project_id: projectId,
        user_id: user.id,
        position: maxPos + 1,
      } as any)
      .select()
      .single();

    if (newTask) {
      await supabase.from("backlog_tasks").update({ deleted_at: new Date().toISOString() }).eq("id", id);
      setItems((prev) => prev.filter((t) => t.id !== id));
      push({
        label: "Görev projeye taşındı",
        undo: async () => {
          await supabase.from("tasks").delete().eq("id", (newTask as any).id);
          await supabase.from("backlog_tasks").update({ deleted_at: null }).eq("id", id);
          fetchItems();
        },
        redo: async () => {
          // Re-insert task and re-soft-delete backlog
          await supabase.from("tasks").insert(newTask as any);
          await supabase.from("backlog_tasks").update({ deleted_at: new Date().toISOString() }).eq("id", id);
          fetchItems();
        },
      });
    }
  };

  return { items, loading, createItem, updateItem, deleteItem, moveToProject, refetch: fetchItems };
};
