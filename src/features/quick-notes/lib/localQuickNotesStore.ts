import type { NotebookNote } from "@/features/knowledge/types";

const STORAGE_KEY = "zen-planner:quick-note-notebooks:v1";
export const QUICK_NOTEBOOK_ICON = "sticky-note";
export const QUICK_NOTES_ROOT_ID = "quick-notes-root";

export type StoredQuickNotebook = {
  id: string;
  parentId: string | null;
  title: string;
  position: number;
  createdAt: string;
  updatedAt: string;
};

export type StoredQuickNotesState = {
  notebooks: StoredQuickNotebook[];
  notes: NotebookNote[];
};

const emptyState = (): StoredQuickNotesState => ({ notebooks: [], notes: [] });

export const readQuickNotesState = (): StoredQuickNotesState => {
  if (typeof window === "undefined") return emptyState();

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw) as StoredQuickNotesState;
    return {
      notebooks: Array.isArray(parsed.notebooks) ? parsed.notebooks : [],
      notes: Array.isArray(parsed.notes) ? parsed.notes : [],
    };
  } catch {
    return emptyState();
  }
};
