import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Notebook } from "../types";
import type { Database } from "@/integrations/supabase/types";

type NotebookInsert = Database["public"]["Tables"]["notebooks"]["Insert"];
type NotebookUpdate = Database["public"]["Tables"]["notebooks"]["Update"];

export const useNotebooks = () => {
  const { user } = useAuth();
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotebooks = useCallback(async () => {
    if (!user) { setNotebooks([]); setLoading(false); return; }
    const { data } = await supabase
      .from("notebooks")
      .select("*")
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: true });
    setNotebooks(data || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchNotebooks(); }, [fetchNotebooks]);

  const createNotebook = async (
    name: string,
    parentId?: string | null,
    options?: Partial<Pick<Notebook, "icon" | "icon_color" | "position">>
  ) => {
    if (!user) return null;
    const payload: NotebookInsert = {
      name,
      parent_id: parentId ?? null,
      user_id: user.id,
      icon: options?.icon ?? "book-open",
      icon_color: options?.icon_color ?? null,
      position: options?.position ?? 0,
    };
    const { data, error } = await supabase
      .from("notebooks")
      .insert(payload)
      .select()
      .single();
    if (!error && data) {
      setNotebooks((p) => [...p, data]);
      return data;
    }
    return null;
  };

  const updateNotebook = async (id: string, updates: Partial<Pick<Notebook, "name" | "icon" | "icon_color" | "parent_id" | "position">>) => {
    if (!user) return;
    setNotebooks((p) => p.map((n) => (n.id === id ? { ...n, ...updates } as Notebook : n)));
    const payload: NotebookUpdate = updates;
    await supabase.from("notebooks").update(payload).eq("id", id).eq("user_id", user.id);
  };

  const deleteNotebook = async (id: string) => {
    if (!user) return;
    await supabase.from("notebooks").update({ deleted_at: new Date().toISOString() }).eq("id", id).eq("user_id", user.id);
    setNotebooks((p) => p.filter((n) => n.id !== id && n.parent_id !== id));
  };

  return { notebooks, loading, createNotebook, updateNotebook, deleteNotebook, refetch: fetchNotebooks };
};
