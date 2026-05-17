import { useCallback, useEffect, useMemo, useState } from "react";
import { useNotebooks } from "@/features/knowledge/hooks/useNotebooks";
import type { NotebookNote, QuickNoteColor } from "@/features/knowledge/types";
import {
  createQuickNotebook,
  createQuickNote,
  deleteQuickNotebook,
  deleteQuickNote,
  getQuickNotebook,
  getQuickNotebooks,
  QUICK_NOTES_CHANGED_EVENT,
  renameQuickNotebook,
  reorderQuickNotes,
  updateQuickNote,
} from "../lib/localQuickNotesStore";

const getContainerNotebookId = (notebookId: string | null) => {
  const quickNotebook = getQuickNotebook(notebookId);
  return quickNotebook ? quickNotebook.parentId ?? null : notebookId;
};

export const useQuickNoteNotebooks = (notebookId: string | null) => {
  const { notebooks: knowledgeNotebooks } = useNotebooks();
  const [version, setVersion] = useState(0);
  const [selectedNotebookId, setSelectedNotebookId] = useState<string | null>(null);
  const containerNotebookId = useMemo(() => {
    void version;
    return getContainerNotebookId(notebookId);
  }, [notebookId, version]);
  const rootFallbackId = knowledgeNotebooks.find((notebook) => !notebook.deleted_at)?.id ?? null;
  const parentId = containerNotebookId ?? rootFallbackId;
  const notebooks = useMemo(() => {
    void version;
    return getQuickNotebooks(parentId);
  }, [parentId, version]);

  useEffect(() => {
    const refresh = () => setVersion((value) => value + 1);
    window.addEventListener(QUICK_NOTES_CHANGED_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(QUICK_NOTES_CHANGED_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  useEffect(() => {
    if (!parentId || notebooks.length > 0) return;
    const created = createQuickNotebook(parentId);
    setSelectedNotebookId(created.id);
  }, [notebooks.length, parentId]);

  useEffect(() => {
    if (!notebooks.length) {
      setSelectedNotebookId(null);
      return;
    }

    setSelectedNotebookId((current) => {
      if (current && notebooks.some((notebook) => notebook.id === current)) return current;
      if (notebookId && notebooks.some((notebook) => notebook.id === notebookId)) return notebookId;
      return notebooks[0].id;
    });
  }, [notebookId, notebooks]);

  const activeNotebookId = selectedNotebookId || notebooks[0]?.id || null;
  const activeNotebook = notebooks.find((notebook) => notebook.id === activeNotebookId) || null;
  const notes = useMemo(
    () =>
      (activeNotebook?.notes || [])
        .filter((note) => !note.deleted_at)
        .sort((a, b) => {
          if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
          if (a.position !== b.position) return a.position - b.position;
          return a.created_at.localeCompare(b.created_at);
        }),
    [activeNotebook]
  );

  const createNotebook = useCallback(async () => {
    if (!parentId) return null;
    const created = createQuickNotebook(parentId);
    setSelectedNotebookId(created.id);
    return created;
  }, [parentId]);

  const renameNotebook = useCallback(async (id: string, title: string) => {
    renameQuickNotebook(id, title);
  }, []);

  const removeNotebook = useCallback(async (id: string) => {
    deleteQuickNotebook(id);
    if (selectedNotebookId === id) setSelectedNotebookId(null);
  }, [selectedNotebookId]);

  const createNote = useCallback(async (input?: { title?: string; content?: string; color?: QuickNoteColor }) => {
    let targetNotebookId = activeNotebookId;
    if (!targetNotebookId) {
      const created = await createNotebook();
      targetNotebookId = created?.id ?? null;
    }
    if (!targetNotebookId) return null;

    return createQuickNote(targetNotebookId, input);
  }, [activeNotebookId, createNotebook]);

  const updateNote = useCallback(async (
    id: string,
    updates: Partial<Pick<NotebookNote, "title" | "content" | "color" | "pinned" | "position">>
  ) => {
    updateQuickNote(id, updates);
  }, []);

  const deleteNote = useCallback(async (id: string) => {
    deleteQuickNote(id);
  }, []);

  const reorderNotes = useCallback(async (orderedIds: string[]) => {
    if (!activeNotebookId) return;
    reorderQuickNotes(activeNotebookId, orderedIds);
  }, [activeNotebookId]);

  return {
    notebooks,
    activeNotebook,
    activeNotebookId,
    notes,
    loading: false,
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
