import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import type { Database } from "@/integrations/supabase/types";

export type QuickNoteColor = "default" | "yellow" | "green" | "blue" | "pink" | "purple" | "stone";
type QuickNoteInsert = Database["public"]["Tables"]["quick_notes"]["Insert"];
type QuickNoteUpdate = Database["public"]["Tables"]["quick_notes"]["Update"];

export type QuickNote = {
  id: string;
  user_id: string;
  content: string;
  color: QuickNoteColor;
  pinned: boolean;
  position: number;
  created_at: string;
  updated_at: string;
};

export const useQuickNotes = () => {
  const { user } = useAuth();
  const [notes, setNotes] = useState<QuickNote[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotes = useCallback(async () => {
    if (!user) { setNotes([]); setLoading(false); return; }
    const { data } = await supabase
      .from("quick_notes")
      .select("*")
      .eq("user_id", user.id)
      .order("pinned", { ascending: false })
      .order("updated_at", { ascending: false });
    setNotes((data as QuickNote[]) || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchNotes(); }, [fetchNotes]);

  const createNote = async (content: string = "") => {
    if (!user) return null;
    const payload: QuickNoteInsert = { content, user_id: user.id };
    const { data, error } = await supabase
      .from("quick_notes")
      .insert(payload)
      .select()
      .single();
    if (!error && data) setNotes((prev) => [data as QuickNote, ...prev]);
    return data as QuickNote | null;
  };

  const updateNote = async (id: string, updates: Partial<Pick<QuickNote, "content" | "color" | "pinned">>) => {
    if (!user) return null;
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, ...updates } : n)));
    const payload: QuickNoteUpdate = updates;
    const { data } = await supabase.from("quick_notes").update(payload).eq("id", id).eq("user_id", user.id).select().single();
    if (data) {
      setNotes((prev) =>
        [...prev.map((n) => (n.id === id ? (data as QuickNote) : n))]
          .sort((a, b) =>
            Number(b.pinned) - Number(a.pinned) ||
            (b.updated_at > a.updated_at ? 1 : b.updated_at < a.updated_at ? -1 : 0)
          )
      );
    }
    return data;
  };

  const deleteNote = async (id: string) => {
    if (!user) return;
    setNotes((prev) => prev.filter((n) => n.id !== id));
    await supabase.from("quick_notes").delete().eq("id", id).eq("user_id", user.id);
  };

  return { notes, loading, createNote, updateNote, deleteNote, refetch: fetchNotes };
};
