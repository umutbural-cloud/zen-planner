import type { NotebookNote, QuickNoteColor } from "@/features/knowledge/types";
import type { QuickNoteNotebook } from "../types";

const STORAGE_KEY = "zen-planner:quick-note-notebooks:v1";
export const QUICK_NOTES_CHANGED_EVENT = "zen-planner:quick-notes-local-changed";
export const QUICK_NOTEBOOK_ICON = "sticky-note";
export const QUICK_NOTES_ROOT_ID = "quick-notes-root";

type StoredNotebook = {
  id: string;
  parentId: string | null;
  title: string;
  position: number;
  createdAt: string;
  updatedAt: string;
};

type StoredState = {
  notebooks: StoredNotebook[];
  notes: NotebookNote[];
};

const emptyState = (): StoredState => ({ notebooks: [], notes: [] });

const now = () => new Date().toISOString();

const createId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `local-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const emitChange = () => {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(QUICK_NOTES_CHANGED_EVENT));
};

export const readQuickNotesState = (): StoredState => {
  if (typeof window === "undefined") return emptyState();

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw) as StoredState;
    return {
      notebooks: Array.isArray(parsed.notebooks) ? parsed.notebooks : [],
      notes: Array.isArray(parsed.notes) ? parsed.notes : [],
    };
  } catch {
    return emptyState();
  }
};

export const writeQuickNotesState = (state: StoredState) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  emitChange();
};

export const getQuickNotebooks = (parentId?: string | null): QuickNoteNotebook[] => {
  const state = readQuickNotesState();
  return state.notebooks
    .filter((notebook) => parentId === undefined || notebook.parentId === parentId)
    .sort((a, b) => {
      if (a.position !== b.position) return a.position - b.position;
      return a.createdAt.localeCompare(b.createdAt);
    })
    .map((notebook) => ({
      id: notebook.id,
      title: notebook.title,
      createdAt: notebook.createdAt,
      updatedAt: notebook.updatedAt,
      notes: state.notes.filter((note) => note.notebook_id === notebook.id),
      parentId: notebook.parentId,
      order: notebook.position,
    }));
};

export const getQuickNotebook = (id: string | null) =>
  getQuickNotebooks().find((notebook) => notebook.id === id) || null;

const nextNotebookTitle = (notebooks: StoredNotebook[]) => {
  const max = notebooks.reduce((value, notebook) => {
    const match = notebook.title.match(/^Anlık Not - (\d+)$/);
    return match ? Math.max(value, Number(match[1])) : value;
  }, 0);

  return `Anlık Not - ${max + 1}`;
};

export const createQuickNotebook = (parentId: string | null) => {
  const state = readQuickNotesState();
  const siblings = state.notebooks.filter((notebook) => notebook.parentId === parentId);
  const timestamp = now();
  const notebook: StoredNotebook = {
    id: createId(),
    parentId,
    title: nextNotebookTitle(state.notebooks),
    position: siblings.length + 1,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  writeQuickNotesState({ ...state, notebooks: [...state.notebooks, notebook] });
  return notebook;
};

export const renameQuickNotebook = (id: string, title: string) => {
  const state = readQuickNotesState();
  const timestamp = now();
  writeQuickNotesState({
    ...state,
    notebooks: state.notebooks.map((notebook) => (
      notebook.id === id ? { ...notebook, title: title.trim() || "Anlık Not", updatedAt: timestamp } : notebook
    )),
  });
};

export const deleteQuickNotebook = (id: string) => {
  const state = readQuickNotesState();
  writeQuickNotesState({
    notebooks: state.notebooks.filter((notebook) => notebook.id !== id),
    notes: state.notes.filter((note) => note.notebook_id !== id),
  });
};

export const createQuickNote = (notebookId: string, input?: { title?: string; content?: string; color?: QuickNoteColor }) => {
  const state = readQuickNotesState();
  const siblings = state.notes.filter((note) => note.notebook_id === notebookId);
  const timestamp = now();
  const note: NotebookNote = {
    id: createId(),
    user_id: "local",
    notebook_id: notebookId,
    type: "quick",
    title: input?.title ?? "",
    content: { text: input?.content ?? "" },
    color: input?.color ?? "default",
    pinned: false,
    parent_note_id: null,
    position: siblings.length + 1,
    deleted_at: null,
    created_at: timestamp,
    updated_at: timestamp,
  };

  writeQuickNotesState({ ...state, notes: [...state.notes, note] });
  return note;
};

export const updateQuickNote = (id: string, updates: Partial<Pick<NotebookNote, "title" | "content" | "color" | "pinned" | "position">>) => {
  const state = readQuickNotesState();
  const timestamp = now();
  writeQuickNotesState({
    ...state,
    notes: state.notes.map((note) => (
      note.id === id ? { ...note, ...updates, updated_at: timestamp } : note
    )),
  });
};

export const deleteQuickNote = (id: string) => {
  const state = readQuickNotesState();
  writeQuickNotesState({ ...state, notes: state.notes.filter((note) => note.id !== id) });
};

export const reorderQuickNotes = (notebookId: string, orderedIds: string[]) => {
  const positionMap = new Map(orderedIds.map((id, index) => [id, index + 1]));
  const timestamp = now();
  const state = readQuickNotesState();
  writeQuickNotesState({
    ...state,
    notes: state.notes.map((note) => (
      note.notebook_id === notebookId && positionMap.has(note.id)
        ? { ...note, position: positionMap.get(note.id)!, updated_at: timestamp }
        : note
    )),
  });
};
