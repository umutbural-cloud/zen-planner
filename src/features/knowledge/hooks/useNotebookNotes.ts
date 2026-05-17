import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useAuth } from "@/hooks/useAuth";
import type { NotebookNote, NoteType, QuickNoteColor } from "../types";

type NotebookNoteRow = Database["public"]["Tables"]["notebook_notes"]["Row"];
type NotebookNoteInsert = Database["public"]["Tables"]["notebook_notes"]["Insert"];
type NotebookNoteUpdatePayload = Database["public"]["Tables"]["notebook_notes"]["Update"];

const KNOWLEDGE_NOTES_CHANGED_EVENT = "keikaku:knowledge-notes-changed";

const notifyKnowledgeNotesChanged = () => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(KNOWLEDGE_NOTES_CHANGED_EVENT));
  }
};

const sortNotes = (items: NotebookNote[]) =>
  [...items].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    if ((a.parent_note_id || "") !== (b.parent_note_id || "")) {
      return (a.parent_note_id || "").localeCompare(b.parent_note_id || "");
    }
    if (a.position !== b.position) return a.position - b.position;
    return a.created_at.localeCompare(b.created_at);
  });

const toNotebookNote = (row: NotebookNoteRow) => row as unknown as NotebookNote;

const collectDeletedNoteIds = (sourceNotes: NotebookNote[], rootId: string) => {
  const idsToDelete = new Set<string>([rootId]);
  let changed = true;

  while (changed) {
    changed = false;
    sourceNotes.forEach((note) => {
      if (note.parent_note_id && idsToDelete.has(note.parent_note_id) && !idsToDelete.has(note.id)) {
        idsToDelete.add(note.id);
        changed = true;
      }
    });
  }

  return Array.from(idsToDelete);
};

export const useNotebookNotes = (notebookId: string | null, type?: NoteType) => {
  const { user } = useAuth();
  const [notes, setNotes] = useState<NotebookNote[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotes = useCallback(async () => {
    if (!user || !notebookId) { setNotes([]); setLoading(false); return; }
    let q = supabase
      .from("notebook_notes")
      .select("*")
      .eq("notebook_id", notebookId)
      .is("deleted_at", null);
    if (type) q = q.eq("type", type);
    const { data } = await q
      .order("pinned", { ascending: false })
      .order("parent_note_id", { ascending: true, nullsFirst: true })
      .order("position", { ascending: true })
      .order("created_at", { ascending: true });
    setNotes(((data || []) as NotebookNoteRow[]).map(toNotebookNote));
    setLoading(false);
  }, [user, notebookId, type]);

  useEffect(() => { fetchNotes(); }, [fetchNotes]);

  const createNote = async (input: { type: NoteType; title?: string; content?: NotebookNote["content"]; parent_note_id?: string | null; color?: QuickNoteColor }) => {
    if (!user || !notebookId) return null;
    const siblingNotes = notes.filter(
      (n) => n.type === input.type && (n.parent_note_id ?? null) === (input.parent_note_id ?? null)
    );
    const maxPosition = siblingNotes.reduce((max, note) => Math.max(max, note.position || 0), 0);
    const payload: NotebookNoteInsert = {
      user_id: user.id,
      notebook_id: notebookId,
      type: input.type,
      title: input.title ?? "",
      content: input.content ?? {},
      color: input.color ?? "default",
      parent_note_id: input.parent_note_id ?? null,
      position: maxPosition + 1,
    };
    const { data, error } = await supabase.from("notebook_notes").insert(payload).select().single();
    if (!error && data) {
      const created = toNotebookNote(data);
      setNotes((p) => sortNotes([created, ...p]));
      return created;
    }
    return null;
  };

  const updateNote = async (id: string, updates: Partial<Pick<NotebookNote, "title" | "content" | "color" | "pinned" | "parent_note_id" | "position">>) => {
    setNotes((p) => p.map((n) => (n.id === id ? { ...n, ...updates } as NotebookNote : n)));
    await supabase.from("notebook_notes").update(updates as NotebookNoteUpdatePayload).eq("id", id);
  };

  const reorderNotes = async (orderedIds: string[]) => {
    const positionMap = new Map(orderedIds.map((id, index) => [id, index + 1]));
    setNotes((prev) =>
      sortNotes(prev.map((note) => (
        positionMap.has(note.id) ? { ...note, position: positionMap.get(note.id)! } : note
      )))
    );
    await Promise.all(
      orderedIds.map((id, index) => {
        const payload: NotebookNoteUpdatePayload = { position: index + 1 };
        return supabase.from("notebook_notes").update(payload).eq("id", id);
      })
    );
  };

  const deleteNote = async (id: string) => {
    const idsToDelete = collectDeletedNoteIds(notes, id);
    setNotes((p) => p.filter((n) => !idsToDelete.includes(n.id)));
    const payload: NotebookNoteUpdatePayload = { deleted_at: new Date().toISOString() };
    await supabase.from("notebook_notes").update(payload).in("id", idsToDelete);
    return idsToDelete;
  };

  return { notes, loading, createNote, updateNote, deleteNote, reorderNotes, refetch: fetchNotes };
};

export const useKnowledgeNotes = () => {
  const { user } = useAuth();
  const [notes, setNotes] = useState<NotebookNote[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotes = useCallback(async () => {
    if (!user) { setNotes([]); setLoading(false); return; }
    const { data } = await supabase
      .from("notebook_notes")
      .select("*")
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .order("pinned", { ascending: false })
      .order("position", { ascending: true })
      .order("created_at", { ascending: true });
    setNotes(sortNotes(((data || []) as NotebookNoteRow[]).map(toNotebookNote)));
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchNotes(); }, [fetchNotes]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.addEventListener(KNOWLEDGE_NOTES_CHANGED_EVENT, fetchNotes);
    return () => window.removeEventListener(KNOWLEDGE_NOTES_CHANGED_EVENT, fetchNotes);
  }, [fetchNotes]);

  const createNote = async (notebookId: string, input: { type: NoteType; title?: string; content?: NotebookNote["content"]; color?: QuickNoteColor; parent_note_id?: string | null }) => {
    if (!user) return null;
    const parentNoteId = input.parent_note_id ?? null;
    const siblingNotes = notes.filter(
      (n) => n.type === input.type && n.notebook_id === notebookId && (n.parent_note_id ?? null) === parentNoteId
    );
    const maxPosition = siblingNotes.reduce((max, note) => Math.max(max, note.position || 0), 0);
    const payload: NotebookNoteInsert = {
      user_id: user.id,
      notebook_id: notebookId,
      type: input.type,
      title: input.title ?? "",
      content: input.content ?? {},
      color: input.color ?? "default",
      parent_note_id: parentNoteId,
      position: maxPosition + 1,
    };
    const { data, error } = await supabase.from("notebook_notes").insert(payload).select().single();
    if (!error && data) {
      const created = toNotebookNote(data);
      setNotes((prev) => sortNotes([...prev, created]));
      notifyKnowledgeNotesChanged();
      return created;
    }
    return null;
  };

  const updateNote = async (id: string, updates: Partial<Pick<NotebookNote, "title" | "content" | "color" | "pinned" | "parent_note_id" | "position">>) => {
    setNotes((prev) => sortNotes(prev.map((note) => (note.id === id ? { ...note, ...updates } as NotebookNote : note))));
    await supabase.from("notebook_notes").update(updates as NotebookNoteUpdatePayload).eq("id", id);
    notifyKnowledgeNotesChanged();
  };

  const deleteNote = async (id: string) => {
    const idsToDelete = collectDeletedNoteIds(notes, id);
    setNotes((prev) => prev.filter((note) => !idsToDelete.includes(note.id)));
    const payload: NotebookNoteUpdatePayload = { deleted_at: new Date().toISOString() };
    await supabase.from("notebook_notes").update(payload).in("id", idsToDelete);
    notifyKnowledgeNotesChanged();
    return idsToDelete;
  };

  return { notes, loading, createNote, updateNote, deleteNote, refetch: fetchNotes };
};
