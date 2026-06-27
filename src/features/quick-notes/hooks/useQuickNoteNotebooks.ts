import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useAuth } from "@/hooks/useAuth";
import type { Notebook, NotebookNote, QuickNoteColor } from "@/features/knowledge/types";
import type { QuickNoteNotebook } from "../types";
import {
  QUICK_NOTEBOOK_ICON,
  QUICK_NOTES_ROOT_ID,
  readQuickNotesState,
} from "../lib/localQuickNotesStore";

type NotebookRow = Database["public"]["Tables"]["notebooks"]["Row"];
type NotebookInsert = Database["public"]["Tables"]["notebooks"]["Insert"];
type NotebookUpdate = Database["public"]["Tables"]["notebooks"]["Update"];
type NotebookNoteRow = Database["public"]["Tables"]["notebook_notes"]["Row"];
type NotebookNoteInsert = Database["public"]["Tables"]["notebook_notes"]["Insert"];
type NotebookNoteUpdate = Database["public"]["Tables"]["notebook_notes"]["Update"];

const QUICK_NOTES_IMPORT_STORAGE_KEY = "zen-planner:quick-note-notebooks:v1";
const quickNotesImportMarkerKey = (userId: string) => `zen-planner:quick-note-notebooks-imported:${userId}`;

const sortNotebooks = (items: Notebook[]) =>
  [...items].sort((a, b) => {
    if (a.position !== b.position) return a.position - b.position;
    return a.created_at.localeCompare(b.created_at);
  });

const sortNotes = (items: NotebookNote[]) =>
  [...items].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    if (a.position !== b.position) return a.position - b.position;
    return a.created_at.localeCompare(b.created_at);
  });

const toNotebook = (row: NotebookRow) => row as Notebook;
const toNotebookNote = (row: NotebookNoteRow) => row as unknown as NotebookNote;

const nextNotebookTitle = (notebooks: Notebook[]) => {
  const max = notebooks.reduce((value, notebook) => {
    const match = notebook.name.match(/^Anlık Not - (\d+)$/);
    return match ? Math.max(value, Number(match[1])) : value;
  }, 0);

  return `Anlık Not - ${max + 1}`;
};

const hash32 = (input: string, seed: number) => {
  let hash = seed >>> 0;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const deterministicUuid = (input: string) => {
  const hex = [
    hash32(input, 0x811c9dc5),
    hash32(input, 0x9e3779b9),
    hash32(input, 0x85ebca6b),
    hash32(input, 0xc2b2ae35),
  ].map((value) => value.toString(16).padStart(8, "0")).join("");

  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    `5${hex.slice(13, 16)}`,
    `${(Number.parseInt(hex[16], 16) & 0x3 | 0x8).toString(16)}${hex.slice(17, 20)}`,
    hex.slice(20, 32),
  ].join("-");
};

const toQuickNotebook = (notebook: Notebook, notes: NotebookNote[]): QuickNoteNotebook => ({
  id: notebook.id,
  title: notebook.name,
  createdAt: notebook.created_at,
  updatedAt: notebook.updated_at,
  parentId: notebook.parent_id,
  order: notebook.position,
  notes: notes.filter((note) => note.notebook_id === notebook.id),
});

export const useQuickNoteNotebooks = (notebookId: string | null) => {
  const { user } = useAuth();
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [quickNotes, setQuickNotes] = useState<NotebookNote[]>([]);
  const [selectedNotebookId, setSelectedNotebookId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const isRootCollection = notebookId === QUICK_NOTES_ROOT_ID;
  const parentId = isRootCollection ? null : notebookId;

  const importLegacyQuickNotes = useCallback(async () => {
    if (!user || typeof window === "undefined") return;
    const markerKey = quickNotesImportMarkerKey(user.id);

    try {
      if (window.localStorage.getItem(markerKey)) return;
      const raw = window.localStorage.getItem(QUICK_NOTES_IMPORT_STORAGE_KEY);
      if (!raw) {
        window.localStorage.setItem(markerKey, new Date().toISOString());
        return;
      }

      const state = readQuickNotesState();
      if (state.notebooks.length === 0 && state.notes.length === 0) {
        window.localStorage.setItem(markerKey, new Date().toISOString());
        return;
      }

      const notebookIdMap = new Map<string, string>();
      const sortedLocalNotebooks = [...state.notebooks].sort((a, b) => {
        if ((a.parentId ?? "") !== (b.parentId ?? "")) return (a.parentId ?? "").localeCompare(b.parentId ?? "");
        if (a.position !== b.position) return a.position - b.position;
        return a.createdAt.localeCompare(b.createdAt);
      });

      for (const notebook of sortedLocalNotebooks) {
        const payload: NotebookInsert = {
          user_id: user.id,
          name: notebook.title.trim() || "Anlık Not",
          icon: QUICK_NOTEBOOK_ICON,
          icon_color: null,
          parent_id: notebook.parentId ? notebookIdMap.get(notebook.parentId) ?? null : null,
          position: notebook.position,
          created_at: notebook.createdAt,
          updated_at: notebook.updatedAt,
          stable_export_id: deterministicUuid(`quick-notebook:${notebook.id}`),
        };

        const { data, error } = await supabase
          .from("notebooks")
          .upsert(payload, { onConflict: "user_id,stable_export_id" })
          .select("id")
          .single();

        if (error || !data) return;
        notebookIdMap.set(notebook.id, data.id);
      }

      const noteIdMap = new Map<string, string>();
      const sortedLocalNotes = [...state.notes].sort((a, b) => {
        if ((a.parent_note_id ?? "") !== (b.parent_note_id ?? "")) return (a.parent_note_id ?? "").localeCompare(b.parent_note_id ?? "");
        if (a.position !== b.position) return a.position - b.position;
        return a.created_at.localeCompare(b.created_at);
      });

      for (const note of sortedLocalNotes) {
        const serverNotebookId = notebookIdMap.get(note.notebook_id);
        if (!serverNotebookId) continue;

        const payload: NotebookNoteInsert = {
          user_id: user.id,
          notebook_id: serverNotebookId,
          type: "quick",
          title: note.title ?? "",
          content: note.content ?? {},
          color: note.color ?? "default",
          pinned: Boolean(note.pinned),
          parent_note_id: note.parent_note_id ? noteIdMap.get(note.parent_note_id) ?? null : null,
          position: note.position ?? 0,
          created_at: note.created_at,
          updated_at: note.updated_at,
          stable_export_id: deterministicUuid(`quick-note:${note.id}`),
        };

        const { data, error } = await supabase
          .from("notebook_notes")
          .upsert(payload, { onConflict: "user_id,stable_export_id" })
          .select("id")
          .single();

        if (error || !data) return;
        noteIdMap.set(note.id, data.id);
      }

      window.localStorage.setItem(markerKey, new Date().toISOString());
    } catch {
      // Keep import retryable. Supabase remains the only active source after load.
    }
  }, [user]);

  const fetchQuickData = useCallback(async () => {
    if (!user) {
      setNotebooks([]);
      setQuickNotes([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      await importLegacyQuickNotes();

      const { data: notebookRows, error: notebookError } = await supabase
        .from("notebooks")
        .select("*")
        .eq("user_id", user.id)
        .eq("icon", QUICK_NOTEBOOK_ICON)
        .is("deleted_at", null)
        .order("position", { ascending: true })
        .order("created_at", { ascending: true });

      if (notebookError) throw notebookError;

      const nextNotebooks = sortNotebooks(((notebookRows || []) as NotebookRow[]).map(toNotebook));
      const notebookIds = nextNotebooks.map((notebook) => notebook.id);

      if (notebookIds.length === 0) {
        setNotebooks([]);
        setQuickNotes([]);
        return;
      }

      const { data: noteRows, error: notesError } = await supabase
        .from("notebook_notes")
        .select("*")
        .eq("user_id", user.id)
        .eq("type", "quick")
        .is("deleted_at", null)
        .in("notebook_id", notebookIds)
        .order("pinned", { ascending: false })
        .order("position", { ascending: true })
        .order("created_at", { ascending: true });

      if (notesError) throw notesError;

      setNotebooks(nextNotebooks);
      setQuickNotes(sortNotes(((noteRows || []) as NotebookNoteRow[]).map(toNotebookNote)));
    } finally {
      setLoading(false);
    }
  }, [importLegacyQuickNotes, user]);

  useEffect(() => {
    void fetchQuickData();
  }, [fetchQuickData]);

  const visibleNotebooks = useMemo(() => {
    const source = isRootCollection ? notebooks : notebooks.filter((notebook) => notebook.parent_id === parentId);
    return source.map((notebook) => toQuickNotebook(notebook, quickNotes));
  }, [isRootCollection, notebooks, parentId, quickNotes]);

  useEffect(() => {
    if (loading) return;
    if (visibleNotebooks.length > 0) return;
    if (!user) return;

    const createInitialNotebook = async () => {
      const payload: NotebookInsert = {
        user_id: user.id,
        name: "Anlık Not - 1",
        icon: QUICK_NOTEBOOK_ICON,
        icon_color: null,
        parent_id: parentId,
        position: 1,
      };
      const { data, error } = await supabase.from("notebooks").insert(payload).select("*").single();
      if (!error && data) {
        const created = toNotebook(data as NotebookRow);
        setNotebooks((prev) => sortNotebooks([...prev, created]));
        setSelectedNotebookId(created.id);
      }
    };

    void createInitialNotebook();
  }, [loading, parentId, user, visibleNotebooks.length]);

  useEffect(() => {
    if (!visibleNotebooks.length) {
      setSelectedNotebookId(null);
      return;
    }

    setSelectedNotebookId((current) => {
      if (current && visibleNotebooks.some((notebook) => notebook.id === current)) return current;
      if (notebookId && visibleNotebooks.some((notebook) => notebook.id === notebookId)) return notebookId;
      return visibleNotebooks[0].id;
    });
  }, [notebookId, visibleNotebooks]);

  const activeNotebookId = selectedNotebookId || visibleNotebooks[0]?.id || null;
  const activeNotebook = visibleNotebooks.find((notebook) => notebook.id === activeNotebookId) || null;
  const notes = useMemo(() => {
    const source = isRootCollection ? visibleNotebooks.flatMap((notebook) => notebook.notes) : (activeNotebook?.notes || []);
    return sortNotes(source.filter((note) => !note.deleted_at));
  }, [activeNotebook, isRootCollection, visibleNotebooks]);

  const createNotebook = useCallback(async () => {
    if (!user) return null;
    const siblings = notebooks.filter((notebook) => notebook.parent_id === parentId);
    const maxPosition = siblings.reduce((max, notebook) => Math.max(max, notebook.position || 0), 0);
    const payload: NotebookInsert = {
      user_id: user.id,
      name: nextNotebookTitle(notebooks),
      icon: QUICK_NOTEBOOK_ICON,
      icon_color: null,
      parent_id: parentId,
      position: maxPosition + 1,
    };
    const { data, error } = await supabase.from("notebooks").insert(payload).select("*").single();
    if (error || !data) return null;

    const created = toNotebook(data as NotebookRow);
    setNotebooks((prev) => sortNotebooks([...prev, created]));
    setSelectedNotebookId(created.id);
    return toQuickNotebook(created, []);
  }, [notebooks, parentId, user]);

  const renameNotebook = useCallback(async (id: string, title: string) => {
    if (!user) return;
    const payload: NotebookUpdate = { name: title.trim() || "Anlık Not" };
    const { data, error } = await supabase
      .from("notebooks")
      .update(payload)
      .eq("id", id)
      .eq("user_id", user.id)
      .select("*")
      .single();
    if (error || !data) return;

    const updated = toNotebook(data as NotebookRow);
    setNotebooks((prev) => sortNotebooks(prev.map((notebook) => (notebook.id === id ? updated : notebook))));
  }, [user]);

  const removeNotebook = useCallback(async (id: string) => {
    if (!user) return;
    const deletedAt = new Date().toISOString();
    const notebookPayload: NotebookUpdate = { deleted_at: deletedAt };
    const notePayload: NotebookNoteUpdate = { deleted_at: deletedAt };
    const { error: notebookError } = await supabase
      .from("notebooks")
      .update(notebookPayload)
      .eq("id", id)
      .eq("user_id", user.id);
    if (notebookError) return;

    await supabase
      .from("notebook_notes")
      .update(notePayload)
      .eq("notebook_id", id)
      .eq("user_id", user.id);

    setNotebooks((prev) => prev.filter((notebook) => notebook.id !== id && notebook.parent_id !== id));
    setQuickNotes((prev) => prev.filter((note) => note.notebook_id !== id));
    if (selectedNotebookId === id) setSelectedNotebookId(null);
  }, [selectedNotebookId, user]);

  const createNote = useCallback(async (input?: { title?: string; content?: string; color?: QuickNoteColor }) => {
    if (!user) return null;
    let targetNotebookId = activeNotebookId;
    if (!targetNotebookId) {
      const created = await createNotebook();
      targetNotebookId = created?.id ?? null;
    }
    if (!targetNotebookId) return null;

    const siblings = quickNotes.filter((note) => note.notebook_id === targetNotebookId);
    const maxPosition = siblings.reduce((max, note) => Math.max(max, note.position || 0), 0);
    const payload: NotebookNoteInsert = {
      user_id: user.id,
      notebook_id: targetNotebookId,
      type: "quick",
      title: input?.title ?? "",
      content: { text: input?.content ?? "" },
      color: input?.color ?? "default",
      parent_note_id: null,
      position: maxPosition + 1,
    };

    const { data, error } = await supabase.from("notebook_notes").insert(payload).select("*").single();
    if (error || !data) return null;

    const created = toNotebookNote(data as NotebookNoteRow);
    setQuickNotes((prev) => sortNotes([...prev, created]));
    return created;
  }, [activeNotebookId, createNotebook, quickNotes, user]);

  const updateNote = useCallback(async (
    id: string,
    updates: Partial<Pick<NotebookNote, "title" | "content" | "color" | "pinned" | "position">>
  ) => {
    if (!user) return;
    const payload: NotebookNoteUpdate = updates as NotebookNoteUpdate;
    const { data, error } = await supabase
      .from("notebook_notes")
      .update(payload)
      .eq("id", id)
      .eq("user_id", user.id)
      .select("*")
      .single();
    if (error || !data) return;

    const updated = toNotebookNote(data as NotebookNoteRow);
    setQuickNotes((prev) => sortNotes(prev.map((note) => (note.id === id ? updated : note))));
  }, [user]);

  const deleteNote = useCallback(async (id: string) => {
    if (!user) return;
    const payload: NotebookNoteUpdate = { deleted_at: new Date().toISOString() };
    const { error } = await supabase
      .from("notebook_notes")
      .update(payload)
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) return;

    setQuickNotes((prev) => prev.filter((note) => note.id !== id));
  }, [user]);

  const reorderNotes = useCallback(async (orderedIds: string[]) => {
    if (!user) return;
    const updates = orderedIds.map((id, index) => {
      const payload: NotebookNoteUpdate = { position: index + 1 };
      return supabase.from("notebook_notes").update(payload).eq("id", id).eq("user_id", user.id);
    });
    const results = await Promise.all(updates);
    if (results.some((result) => result.error)) return;

    const positionMap = new Map(orderedIds.map((id, index) => [id, index + 1]));
    setQuickNotes((prev) => sortNotes(prev.map((note) => (
      positionMap.has(note.id) ? { ...note, position: positionMap.get(note.id)! } : note
    ))));
  }, [user]);

  return {
    notebooks: visibleNotebooks,
    isRootCollection,
    activeNotebook,
    activeNotebookId,
    notes,
    loading,
    createNotebook,
    renameNotebook,
    deleteNotebook: removeNotebook,
    selectNotebook: setSelectedNotebookId,
    createNote,
    updateNote,
    deleteNote,
    reorderNotes,
  };
};
