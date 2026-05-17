import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { NotebookNote, NoteType, QuickNoteColor } from "../types";

export const useNotebookNotes = (notebookId: string | null, type?: NoteType) => {
  const { user } = useAuth();
  const [notes, setNotes] = useState<NotebookNote[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotes = useCallback(async () => {
    if (!user || !notebookId) { setNotes([]); setLoading(false); return; }
    let q = supabase
      .from("notebook_notes" as any)
      .select("*")
      .eq("notebook_id", notebookId)
      .is("deleted_at", null);
    if (type) q = q.eq("type", type);
    const { data } = await q.order("pinned", { ascending: false }).order("updated_at", { ascending: false });
    setNotes(((data as any[]) || []) as NotebookNote[]);
    setLoading(false);
  }, [user, notebookId, type]);

  useEffect(() => { fetchNotes(); }, [fetchNotes]);

  const createNote = async (input: { type: NoteType; title?: string; content?: any; parent_note_id?: string | null; color?: QuickNoteColor }) => {
    if (!user || !notebookId) return null;
    const payload: any = {
      user_id: user.id,
      notebook_id: notebookId,
      type: input.type,
      title: input.title ?? "",
      content: input.content ?? {},
      color: input.color ?? "default",
      parent_note_id: input.parent_note_id ?? null,
    };
    const { data, error } = await supabase.from("notebook_notes" as any).insert(payload).select().single();
    if (!error && data) {
      setNotes((p) => [data as unknown as NotebookNote, ...p]);
      return data as unknown as NotebookNote;
    }
    return null;
  };

  const updateNote = async (id: string, updates: Partial<Pick<NotebookNote, "title" | "content" | "color" | "pinned" | "parent_note_id" | "position">>) => {
    setNotes((p) => p.map((n) => (n.id === id ? { ...n, ...updates } as NotebookNote : n)));
    await supabase.from("notebook_notes" as any).update(updates as any).eq("id", id);
  };

  const deleteNote = async (id: string) => {
    setNotes((p) => p.filter((n) => n.id !== id));
    await supabase.from("notebook_notes" as any).update({ deleted_at: new Date().toISOString() } as any).eq("id", id);
  };

  return { notes, loading, createNote, updateNote, deleteNote, refetch: fetchNotes };
};
