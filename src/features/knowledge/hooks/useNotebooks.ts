import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Notebook } from "../types";

export const useNotebooks = () => {
  const { user } = useAuth();
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotebooks = useCallback(async () => {
    if (!user) { setNotebooks([]); setLoading(false); return; }
    const { data } = await supabase
      .from("notebooks" as any)
      .select("*")
      .is("deleted_at", null)
      .order("created_at", { ascending: true });
    setNotebooks(((data as any[]) || []) as Notebook[]);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchNotebooks(); }, [fetchNotebooks]);

  const createNotebook = async (
    name: string,
    parentId?: string | null,
    options?: Partial<Pick<Notebook, "icon" | "icon_color" | "position">>
  ) => {
    if (!user) return null;
    const { data, error } = await supabase
      .from("notebooks" as any)
      .insert({
        name,
        parent_id: parentId ?? null,
        user_id: user.id,
        icon: options?.icon ?? "book-open",
        icon_color: options?.icon_color ?? null,
        position: options?.position ?? 0,
      } as any)
      .select()
      .single();
    if (!error && data) {
      setNotebooks((p) => [...p, data as unknown as Notebook]);
      return data as unknown as Notebook;
    }
    return null;
  };

  const updateNotebook = async (id: string, updates: Partial<Pick<Notebook, "name" | "icon" | "icon_color" | "parent_id" | "position">>) => {
    setNotebooks((p) => p.map((n) => (n.id === id ? { ...n, ...updates } as Notebook : n)));
    await supabase.from("notebooks" as any).update(updates as any).eq("id", id);
  };

  const deleteNotebook = async (id: string) => {
    await supabase.from("notebooks" as any).update({ deleted_at: new Date().toISOString() } as any).eq("id", id);
    setNotebooks((p) => p.filter((n) => n.id !== id && n.parent_id !== id));
  };

  return { notebooks, loading, createNotebook, updateNotebook, deleteNotebook, refetch: fetchNotebooks };
};
