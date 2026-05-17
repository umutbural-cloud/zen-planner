import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useUndo } from "./useUndo";

export type ViewKey = "notes" | "table" | "gantt" | "kanban" | "calendar";

export type ProjectKind = "project" | "knowledge";

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

export const useProjects = () => {
  const { user } = useAuth();
  const { push } = useUndo();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProjects = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("projects")
      .select("*")
      .is("deleted_at", null)
      .order("created_at", { ascending: true });
    const normalized = ((data as any[]) || []).map((p) => ({
      ...p,
      enabled_views: Array.isArray(p.enabled_views) ? p.enabled_views : DEFAULT_VIEWS,
      kind: p.kind || "project",
    })) as Project[];
    // Default proje en üstte
    normalized.sort((a, b) => Number(!!b.is_default) - Number(!!a.is_default));
    setProjects(normalized);
    setLoading(false);
  };

  useEffect(() => { fetchProjects(); }, [user]);

  const createProject = async (name: string, parentId?: string, kind: ProjectKind = "project") => {
    if (!user) return null;
    const views = kind === "knowledge" ? KNOWLEDGE_VIEWS : DEFAULT_VIEWS;
    const insertData: any = { name, user_id: user.id, enabled_views: views, kind };
    if (parentId) insertData.parent_id = parentId;
    const { data, error } = await supabase.from("projects").insert(insertData).select().single();
    if (!error && data) {
      const created = { ...data, enabled_views: (data as any).enabled_views || views, kind: (data as any).kind || "project" } as Project;
      setProjects((prev) => [...prev, created]);
      push({
        label: kind === "knowledge" ? "Defter eklendi" : "Proje eklendi",
        undo: async () => {
          await supabase.from("projects").update({ deleted_at: new Date().toISOString() }).eq("id", created.id);
          setProjects((prev) => prev.filter((p) => p.id !== created.id));
        },
        redo: async () => {
          await supabase.from("projects").update({ deleted_at: null }).eq("id", created.id);
          fetchProjects();
        },
      });
    }
    return data as Project | null;
  };

  const updateProject = async (id: string, updates: Partial<Pick<Project, "name" | "emoji" | "icon" | "icon_color" | "enabled_views">>) => {
    const before = projects.find((p) => p.id === id);
    const { data, error } = await supabase.from("projects").update(updates as any).eq("id", id).select().single();
    if (!error && data) {
      const updated = { ...data, enabled_views: (data as any).enabled_views || DEFAULT_VIEWS } as Project;
      setProjects((prev) => prev.map((p) => (p.id === id ? updated : p)));
      if (before && (updates.name !== undefined || updates.emoji !== undefined)) {
        const beforeSnap = { name: before.name, emoji: before.emoji };
        push({
          label: "Proje düzenlendi",
          undo: async () => {
            await supabase.from("projects").update(beforeSnap).eq("id", id);
            fetchProjects();
          },
          redo: async () => {
            await supabase.from("projects").update(updates as any).eq("id", id);
            fetchProjects();
          },
        });
      }
    }
    return data;
  };

  const deleteProject = async (id: string) => {
    const target = projects.find((p) => p.id === id);
    if (target?.is_default) return; // sabit proje silinemez
    await supabase.from("projects").update({ deleted_at: new Date().toISOString() }).eq("id", id);
    setProjects((prev) => prev.filter((p) => p.id !== id && p.parent_id !== id));
    push({
      label: "Proje silindi",
      undo: async () => {
        await supabase.from("projects").update({ deleted_at: null }).eq("id", id);
        fetchProjects();
      },
      redo: async () => {
        await supabase.from("projects").update({ deleted_at: new Date().toISOString() }).eq("id", id);
        setProjects((prev) => prev.filter((p) => p.id !== id && p.parent_id !== id));
      },
    });
  };

  return { projects, loading, createProject, updateProject, deleteProject, refetch: fetchProjects };
};
