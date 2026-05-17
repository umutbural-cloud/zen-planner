import type { NotebookNote } from "@/features/knowledge/types";

export type QuickNoteNotebook = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  parentId?: string | null;
  order?: number;
  notes: NotebookNote[];
};
