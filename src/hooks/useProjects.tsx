import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useUndo } from "./useUndo";
import type { Database, Json } from "@/integrations/supabase/types";

export type ViewKey = "notes" | "table" | "gantt" | "kanban" | "calendar";

export type ProjectKind = "project" | "knowledge";
type ProjectRow = Database["public"]["Tables"]["projects"]["Row"];
type ProjectInsert = Database["public"]["Tables"]["projects"]["Insert"];
type ProjectUpdate = Database["public"]["Tables"]["projects"]["Update"];

export type Project = {
  id: string;
  name: string;
  emoji: string;
  icon: string | null;
  icon_color: string | null;
  parent_id: string | null;
  user_id: string;
  created_at: string;
  enabled_views: ViewKey[];
  deleted_at: string | null;
  is_default?: boolean;
  kind: ProjectKind;
};

const DEFAULT_VIEWS: ViewKey[] = ["table", "notes"];
const KNOWLEDGE_VIEWS: ViewKey[] = ["notes"];
const VALID_VIEWS = new Set<ViewKey>(["notes", "table", "gantt", "kanban", "calendar"]);

const normalizeViews = (value: Json, fallback: ViewKey[] = DEFAULT_VIEWS): ViewKey[] => {
  if (!Array.isArray(value)) return fallback;
  const views = value.filter((view): view is ViewKey => typeof view === "string" && VALID_VIEWS.has(view as ViewKey));
  return views.length > 0 ? views : fallback;
};

const normalizeProject = (row: ProjectRow): Project => {
  const kind: ProjectKind = row.kind === "knowledge" ? "knowledge" : "project";
  return {
    ...row,
    enabled_views: normalizeViews(row.enabled_views, kind === "knowledge" ? KNOWLEDGE_VIEWS : DEFAULT_VIEWS),
    kind,
  };
};

export const useProjects = () => {
  const { user } = useAuth();
  const { push } = useUndo();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProjects = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("projects")
      .select("*")
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: true });
    const normalized = (data || []).map(normalizeProject);
    // Default proje en üstte
    normalized.sort((a, b) => Number(!!b.is_default) - Number(!!a.is_default));
    setProjects(normalized);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  const createProject = async (name: string, parentId?: string, kind: ProjectKind = "project") => {
    if (!user) return null;
    const views = kind === "knowledge" ? KNOWLEDGE_VIEWS : DEFAULT_VIEWS;
    const insertData: ProjectInsert = { name, user_id: user.id, enabled_views: views, kind };
    if (parentId) insertData.parent_id = parentId;
    const { data, error } = await supabase.from("projects").insert(insertData).select().single();
    if (!error && data) {
      const created = normalizeProject(data);
      setProjects((prev) => [...prev, created]);
      push({
        label: kind === "knowledge" ? "Defter eklendi" : "Proje eklendi",
        undo: async () => {
          await supabase.from("projects").update({ deleted_at: new Date().toISOString() }).eq("id", created.id).eq("user_id", user.id);
          setProjects((prev) => prev.filter((p) => p.id !== created.id));
        },
        redo: async () => {
          await supabase.from("projects").update({ deleted_at: null }).eq("id", created.id).eq("user_id", user.id);
          fetchProjects();
        },
      });
    }
    return data ? normalizeProject(data) : null;
  };

  const updateProject = async (id: string, updates: Partial<Pick<Project, "name" | "emoji" | "icon" | "icon_color" | "enabled_views">>) => {
    if (!user) return null;
    const before = projects.find((p) => p.id === id);
    const updatePayload: ProjectUpdate = updates;
    const { data, error } = await supabase.from("projects").update(updatePayload).eq("id", id).eq("user_id", user.id).select().single();
    if (!error && data) {
      const updated = normalizeProject(data);
      setProjects((prev) => prev.map((p) => (p.id === id ? updated : p)));
      if (before && (updates.name !== undefined || updates.emoji !== undefined)) {
        const beforeSnap = { name: before.name, emoji: before.emoji };
        push({
          label: "Proje düzenlendi",
          undo: async () => {
            await supabase.from("projects").update(beforeSnap).eq("id", id).eq("user_id", user.id);
            fetchProjects();
          },
          redo: async () => {
            await supabase.from("projects").update(updatePayload).eq("id", id).eq("user_id", user.id);
            fetchProjects();
          },
        });
      }
    }
    return data ? normalizeProject(data) : null;
  };

  const deleteProject = async (id: string) => {
    if (!user) return;
    const { error } = await supabase.from("projects").update({ deleted_at: new Date().toISOString() }).eq("id", id).eq("user_id", user.id);
    if (error) throw error;
    setProjects((prev) => prev.filter((p) => p.id !== id && p.parent_id !== id));
    push({
      label: "Proje silindi",
      undo: async () => {
        await supabase.from("projects").update({ deleted_at: null }).eq("id", id).eq("user_id", user.id);
        fetchProjects();
      },
      redo: async () => {
        await supabase.from("projects").update({ deleted_at: new Date().toISOString() }).eq("id", id).eq("user_id", user.id);
        setProjects((prev) => prev.filter((p) => p.id !== id && p.parent_id !== id));
      },
    });
  };

  return { projects, loading, createProject, updateProject, deleteProject, refetch: fetchProjects };
};
