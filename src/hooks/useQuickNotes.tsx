import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export type QuickNoteColor = "default" | "yellow" | "green" | "blue" | "pink" | "purple" | "stone";

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

  const fetchNotes = async () => {
    if (!user) { setNotes([]); setLoading(false); return; }
    const { data } = await supabase
      .from("quick_notes")
      .select("*")
      .order("pinned", { ascending: false })
      .order("updated_at", { ascending: false });
    setNotes((data as QuickNote[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchNotes(); }, [user]);

  const createNote = async (content: string = "") => {
    if (!user) return null;
    const { data, error } = await supabase
      .from("quick_notes")
      .insert({ content, user_id: user.id } as any)
      .select()
      .single();
    if (!error && data) setNotes((prev) => [data as QuickNote, ...prev]);
    return data as QuickNote | null;
  };

  const updateNote = async (id: string, updates: Partial<Pick<QuickNote, "content" | "color" | "pinned">>) => {
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, ...updates } : n)));
    const { data } = await supabase.from("quick_notes").update(updates as any).eq("id", id).select().single();
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
    setNotes((prev) => prev.filter((n) => n.id !== id));
    await supabase.from("quick_notes").delete().eq("id", id);
  };

  return { notes, loading, createNote, updateNote, deleteNote, refetch: fetchNotes };
};
