export type Notebook = {
  id: string;
  user_id: string;
  name: string;
  icon: string | null;
  icon_color: string | null;
  parent_id: string | null;
  position: number;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type NoteType = "quick" | "rich";

export type QuickNoteColor = "default" | "yellow" | "green" | "blue" | "pink" | "purple" | "stone";

export type NotebookNote = {
  id: string;
  user_id: string;
  notebook_id: string;
  type: NoteType;
  title: string;
  content: any; // jsonb — quick: { text }, rich: Tiptap doc
  color: QuickNoteColor;
  pinned: boolean;
  parent_note_id: string | null;
  position: number;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};
