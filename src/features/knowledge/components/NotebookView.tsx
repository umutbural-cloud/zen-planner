import { useEffect, useRef, useState } from "react";
import { Check, FileText, Palette, Pin, PinOff, StickyNote, Trash2 } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useKnowledgeNotes } from "../hooks/useNotebookNotes";
import type { NotebookNote, QuickNoteColor } from "../types";
import QuickNotesPanel from "@/features/quick-notes/components/QuickNotesPanel";
import RichNoteEditor from "./RichNoteEditor";

type Props = {
  noteId: string | null;
  selectedNotebookId: string | null;
  onClearSelection: () => void;
};

type NoteUpdate = Partial<Pick<NotebookNote, "title" | "content" | "color" | "pinned" | "position">>;

const COLOR_TOKENS: { key: QuickNoteColor; label: string; bg: string; ring: string }[] = [
  { key: "default", label: "Varsayılan", bg: "bg-card/60", ring: "border-border/60" },
  { key: "yellow", label: "Sarı", bg: "bg-yellow-100/70 dark:bg-yellow-900/30", ring: "border-yellow-300/60" },
  { key: "green", label: "Yeşil", bg: "bg-emerald-100/70 dark:bg-emerald-900/30", ring: "border-emerald-300/60" },
  { key: "blue", label: "Mavi", bg: "bg-sky-100/70 dark:bg-sky-900/30", ring: "border-sky-300/60" },
  { key: "pink", label: "Pembe", bg: "bg-pink-100/70 dark:bg-pink-900/30", ring: "border-pink-300/60" },
  { key: "purple", label: "Mor", bg: "bg-violet-100/70 dark:bg-violet-900/30", ring: "border-violet-300/60" },
  { key: "stone", label: "Taş", bg: "bg-stone-200/60 dark:bg-stone-800/40", ring: "border-stone-300/60" },
];

const tokenFor = (color: QuickNoteColor) =>
  COLOR_TOKENS.find((token) => token.key === color) || COLOR_TOKENS[0];

const QuickNoteEditor = ({
  note,
  onUpdate,
  onDelete,
}: {
  note: NotebookNote;
  onUpdate: (id: string, updates: NoteUpdate) => void;
  onDelete: (id: string) => void;
}) => {
  const [text, setText] = useState<string>((note.content?.text as string) || "");
  const debounceRef = useRef<number | null>(null);
  const focusedRef = useRef(false);
  const tone = tokenFor(note.color);

  useEffect(() => {
    if (!focusedRef.current) setText((note.content?.text as string) || "");
  }, [note.id, note.content]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, []);

  const flush = (value: string) => {
    if (value !== ((note.content?.text as string) || "")) {
      onUpdate(note.id, { content: { text: value } });
    }
  };

  const handleChange = (value: string) => {
    setText(value);
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => flush(value), 600);
  };

  return (
    <div className="max-w-2xl mx-auto w-full space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-light tracking-wide">
            <StickyNote className="h-4 w-4 text-muted-foreground" />
            Anlık not
          </div>
          <p className="text-[11px] text-muted-foreground/70 font-light mt-1">Tek odaklı hızlı kayıt</p>
        </div>
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => onUpdate(note.id, { pinned: !note.pinned })}
            className="p-1.5 rounded-sm text-muted-foreground hover:text-foreground hover:bg-accent/40 transition-colors"
            title={note.pinned ? "Sabitlemeyi kaldır" : "Sabitle"}
          >
            {note.pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
          </button>
          <Popover>
            <PopoverTrigger asChild>
              <button
                className="p-1.5 rounded-sm text-muted-foreground hover:text-foreground hover:bg-accent/40 transition-colors"
                title="Renk"
              >
                <Palette className="h-3.5 w-3.5" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-44 p-1" align="end">
              <div className="grid grid-cols-7 gap-1">
                {COLOR_TOKENS.map((token) => (
                  <button
                    key={token.key}
                    onClick={() => onUpdate(note.id, { color: token.key })}
                    title={token.label}
                    className={`w-6 h-6 rounded-full border ${token.bg} ${token.ring} flex items-center justify-center hover:scale-110 transition-transform`}
                  >
                    {note.color === token.key && <Check className="h-3 w-3" />}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
          <button
            onClick={() => onDelete(note.id)}
            className="p-1.5 rounded-sm text-muted-foreground hover:text-destructive hover:bg-accent/40 transition-colors"
            title="Sil"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className={`rounded-sm border ${tone.bg} ${tone.ring} p-4 sm:p-5`}>
        <textarea
          value={text}
          onFocus={() => { focusedRef.current = true; }}
          onBlur={() => {
            focusedRef.current = false;
            if (debounceRef.current) {
              window.clearTimeout(debounceRef.current);
              debounceRef.current = null;
            }
            flush(text);
          }}
          onChange={(event) => handleChange(event.target.value)}
          placeholder="Bir not al..."
          rows={12}
          className="w-full min-h-[42vh] bg-transparent resize-none outline-none text-sm sm:text-base font-light leading-relaxed placeholder:text-muted-foreground/40"
        />
      </div>
    </div>
  );
};

const RichDocumentEditor = ({
  note,
  onUpdate,
  onDelete,
}: {
  note: NotebookNote;
  onUpdate: (id: string, updates: NoteUpdate) => void;
  onDelete: (id: string) => void;
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
        <button
          onClick={() => onDelete(note.id)}
          className="pointer-events-auto ml-auto block p-1.5 rounded-sm text-muted-foreground hover:text-destructive hover:bg-accent/40 transition-colors"
          title="Sil"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      <RichNoteEditor
        key={note.id}
        value={note.content}
        onChange={(doc) => onUpdate(note.id, { content: doc })}
        titleValue={titleDraft}
        onTitleChange={handleTitleChange}
        placeholder="Yazmaya başla..."
      />
    </div>
  );
};

const NotebookView = ({ noteId, selectedNotebookId, onClearSelection }: Props) => {
  const { notes, loading, updateNote, deleteNote } = useKnowledgeNotes();
  const selectedNote = notes.find((note) => note.id === noteId) || null;

  const handleDelete = async (id: string) => {
    await deleteNote(id);
    onClearSelection();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        <p className="text-xs">読み込み中...</p>
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
          <p className="text-2xl tracking-widest">知</p>
          <p className="text-xs">Bilgi Merkezi'nden yeni bir kayıt ekleyin</p>
        </div>
      </div>
    );
  }

  if (!selectedNote) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        <div className="text-center space-y-2">
          <p className="text-2xl tracking-widest">空</p>
          <p className="text-xs">Kayıt bulunamadı veya silinmiş</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto w-full">
      {selectedNote.type === "quick" ? (
        <QuickNotesPanel notebookId={selectedNote.notebook_id} />
      ) : (
        <RichDocumentEditor note={selectedNote} onUpdate={updateNote} onDelete={handleDelete} />
      )}
    </div>
  );
};

export default NotebookView;
