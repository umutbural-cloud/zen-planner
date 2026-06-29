import { useEffect, useRef, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useKnowledgeNotes } from "../hooks/useNotebookNotes";
import type { NotebookNote } from "../types";
import QuickNotesPanel from "@/features/quick-notes/components/QuickNotesPanel";
import RichNoteEditor from "./RichNoteEditor";
import { EMPTY_RICH_DOC, richDocFromJson } from "../lib/noteContent";

type Props = {
  noteId: string | null;
  selectedNotebookId: string | null;
  onClearSelection: () => void;
  onSelectNote: (id: string) => void;
};

type NoteUpdate = Partial<Pick<NotebookNote, "title" | "content" | "color" | "pinned" | "parent_note_id" | "position">>;

const RichDocumentEditor = ({
  note,
  onUpdate,
  onDelete,
  onAddChild,
}: {
  note: NotebookNote;
  onUpdate: (id: string, updates: NoteUpdate) => void;
  onDelete: (id: string) => void;
  onAddChild: (note: NotebookNote) => void;
}) => {
  const [titleDraft, setTitleDraft] = useState(note.title);
  const lastSyncedId = useRef<string | null>(null);
  const titleDebounce = useRef<number | null>(null);

  useEffect(() => {
    if (lastSyncedId.current !== note.id) {
      setTitleDraft(note.title);
      lastSyncedId.current = note.id;
    }
  }, [note.id, note.title]);

  useEffect(() => {
    return () => {
      if (titleDebounce.current) window.clearTimeout(titleDebounce.current);
    };
  }, []);

  const handleTitleChange = (value: string) => {
    setTitleDraft(value);
    if (titleDebounce.current) window.clearTimeout(titleDebounce.current);
    titleDebounce.current = window.setTimeout(() => {
      onUpdate(note.id, { title: value });
    }, 500);
  };

  return (
    <div className="relative min-h-[70vh]">
      <div className="pointer-events-none absolute left-1/2 top-2 z-20 w-full max-w-[760px] -translate-x-1/2 px-6 sm:px-12">
        <div className="pointer-events-auto ml-auto flex w-fit items-center gap-0.5">
          <button
            onClick={() => onAddChild(note)}
            className="p-1.5 rounded-sm text-muted-foreground hover:text-foreground hover:bg-accent/40 transition-colors"
            title="Alt sayfa ekle"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => onDelete(note.id)}
            className="hidden p-1.5 rounded-sm text-muted-foreground hover:text-destructive hover:bg-accent/40 transition-colors md:inline-flex"
            title="Sil"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <RichNoteEditor
        key={note.id}
        value={richDocFromJson(note.content)}
        onChange={(doc) => onUpdate(note.id, { content: doc })}
        titleValue={titleDraft}
        onTitleChange={handleTitleChange}
        placeholder="Yazmaya başla..."
      />
    </div>
  );
};

const NotebookView = ({ noteId, selectedNotebookId, onClearSelection, onSelectNote }: Props) => {
  const { notes, loading, createNote, updateNote, deleteNote } = useKnowledgeNotes();
  const selectedNote = notes.find((note) => note.id === noteId) || null;

  const handleDelete = async (id: string) => {
    const deletedIds = await deleteNote(id);
    if (noteId && deletedIds.includes(noteId)) onClearSelection();
  };

  const handleAddChild = async (note: NotebookNote) => {
    const siblings = notes.filter(
      (candidate) => candidate.notebook_id === note.notebook_id && candidate.type === note.type && candidate.parent_note_id === note.id
    );
    const base = note.type === "quick" ? "Anlık Not" : "Zengin Doküman";
    const created = await createNote(note.notebook_id, {
      type: note.type,
      title: `${base} ${siblings.length + 1}`,
      content: note.type === "quick" ? { text: "" } : EMPTY_RICH_DOC,
      parent_note_id: note.id,
    });
    if (created) onSelectNote(created.id);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        <p className="text-xs">Yükleniyor...</p>
      </div>
    );
  }

  if (!noteId) {
    if (selectedNotebookId) {
      return <QuickNotesPanel notebookId={selectedNotebookId} />;
    }

    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        <div className="text-center space-y-2">
          <p className="text-2xl tracking-widest">Bilgi</p>
          <p className="text-xs">Bilgi Merkezi'nden yeni bir kayıt ekleyin</p>
        </div>
      </div>
    );
  }

  if (!selectedNote) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        <div className="text-center space-y-2">
          <p className="text-2xl tracking-widest">Boş</p>
          <p className="text-xs">Kayıt bulunamadı veya silinmiş</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto w-full">
      <RichDocumentEditor note={selectedNote} onUpdate={updateNote} onDelete={handleDelete} onAddChild={handleAddChild} />
    </div>
  );
};

export default NotebookView;
