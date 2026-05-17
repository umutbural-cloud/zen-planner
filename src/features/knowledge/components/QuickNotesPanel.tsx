import { useEffect, useRef, useState } from "react";
import { Plus, Pin, PinOff, Trash2, Palette, Check } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useNotebookNotes } from "../hooks/useNotebookNotes";
import type { NotebookNote, QuickNoteColor } from "../types";

const COLOR_TOKENS: { key: QuickNoteColor; label: string; bg: string; ring: string }[] = [
  { key: "default", label: "Varsayılan", bg: "bg-card/60",                ring: "border-border/60" },
  { key: "yellow",  label: "Sarı",       bg: "bg-yellow-100/70 dark:bg-yellow-900/30", ring: "border-yellow-300/60" },
  { key: "green",   label: "Yeşil",      bg: "bg-emerald-100/70 dark:bg-emerald-900/30", ring: "border-emerald-300/60" },
  { key: "blue",    label: "Mavi",       bg: "bg-sky-100/70 dark:bg-sky-900/30",     ring: "border-sky-300/60" },
  { key: "pink",    label: "Pembe",      bg: "bg-pink-100/70 dark:bg-pink-900/30",   ring: "border-pink-300/60" },
  { key: "purple",  label: "Mor",        bg: "bg-violet-100/70 dark:bg-violet-900/30", ring: "border-violet-300/60" },
  { key: "stone",   label: "Taş",        bg: "bg-stone-200/60 dark:bg-stone-800/40", ring: "border-stone-300/60" },
];
const tokenFor = (c: QuickNoteColor) => COLOR_TOKENS.find((t) => t.key === c) || COLOR_TOKENS[0];

const QuickCard = ({
  note, onUpdate, onDelete,
}: {
  note: NotebookNote;
  onUpdate: (id: string, u: Partial<Pick<NotebookNote, "content" | "color" | "pinned" | "title">>) => void;
  onDelete: (id: string) => void;
}) => {
  const [text, setText] = useState<string>((note.content?.text as string) || "");
  const debounceRef = useRef<number | null>(null);
  const focused = useRef(false);
  const tone = tokenFor(note.color);

  useEffect(() => {
    if (!focused.current) setText((note.content?.text as string) || "");
  }, [note.content]);

  const flush = (val: string) => {
    if (val !== ((note.content?.text as string) || "")) onUpdate(note.id, { content: { text: val } });
  };

  const handleChange = (v: string) => {
    setText(v);
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => flush(v), 600);
  };

  return (
    <div className={`group relative break-inside-avoid mb-3 rounded-sm border ${tone.bg} ${tone.ring} p-3 transition-shadow hover:shadow-sm`}>
      <textarea
        value={text}
        onFocus={() => { focused.current = true; }}
        onBlur={() => {
          focused.current = false;
          if (debounceRef.current) { window.clearTimeout(debounceRef.current); debounceRef.current = null; }
          flush(text);
        }}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="Not..."
        rows={Math.max(2, Math.min(14, text.split("\n").length + 1))}
        className="w-full bg-transparent resize-none outline-none text-sm font-light leading-relaxed placeholder:text-muted-foreground/40"
      />
      <div className="flex items-center justify-end gap-0.5 -mb-1 -mr-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
        <button onClick={() => onUpdate(note.id, { pinned: !note.pinned })} className="p-1 rounded-sm text-muted-foreground hover:text-foreground hover:bg-accent/40" title={note.pinned ? "Sabitlemeyi kaldır" : "Sabitle"}>
          {note.pinned ? <PinOff className="h-3 w-3" /> : <Pin className="h-3 w-3" />}
        </button>
        <Popover>
          <PopoverTrigger asChild>
            <button className="p-1 rounded-sm text-muted-foreground hover:text-foreground hover:bg-accent/40" title="Renk"><Palette className="h-3 w-3" /></button>
          </PopoverTrigger>
          <PopoverContent className="w-44 p-1" align="end">
            <div className="grid grid-cols-7 gap-1">
              {COLOR_TOKENS.map((t) => (
                <button key={t.key} onClick={() => onUpdate(note.id, { color: t.key })} title={t.label}
                  className={`w-6 h-6 rounded-full border ${t.bg} ${t.ring} flex items-center justify-center hover:scale-110 transition-transform`}>
                  {note.color === t.key && <Check className="h-3 w-3" />}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
        <button onClick={() => onDelete(note.id)} className="p-1 rounded-sm text-muted-foreground hover:text-destructive hover:bg-accent/40" title="Sil"><Trash2 className="h-3 w-3" /></button>
      </div>
      {note.pinned && <Pin className="absolute top-2 right-2 h-3 w-3 text-muted-foreground/60 group-hover:opacity-0 transition-opacity" />}
    </div>
  );
};

const QuickNotesPanel = ({ notebookId }: { notebookId: string }) => {
  const { notes, loading, createNote, updateNote, deleteNote } = useNotebookNotes(notebookId, "quick");
  const [draft, setDraft] = useState("");
  const [adding, setAdding] = useState(false);

  const submit = async () => {
    const v = draft.trim();
    if (v) await createNote({ type: "quick", content: { text: v } });
    setDraft(""); setAdding(false);
  };

  const pinned = notes.filter((n) => n.pinned);
  const others = notes.filter((n) => !n.pinned);

  if (loading) return <div className="text-center text-muted-foreground text-sm py-12">読み込み中...</div>;

  return (
    <div className="space-y-6">
      <div className="max-w-xl">
        {adding ? (
          <div className="border border-border/60 rounded-sm p-3 bg-card/40">
            <textarea autoFocus value={draft} onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") { setDraft(""); setAdding(false); }
                if ((e.metaKey || e.ctrlKey) && e.key === "Enter") submit();
              }}
              placeholder="Bir not al..." rows={3}
              className="w-full bg-transparent resize-none outline-none text-sm font-light leading-relaxed placeholder:text-muted-foreground/40" />
            <div className="flex items-center justify-end gap-2 pt-1">
              <button onClick={() => { setDraft(""); setAdding(false); }} className="text-xs text-muted-foreground hover:text-foreground px-2 py-1">Kapat</button>
              <button onClick={submit} className="text-xs px-2 py-1 rounded-sm bg-accent hover:bg-accent/80">Ekle</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setAdding(true)}
            className="w-full flex items-center gap-2 border border-border/60 rounded-sm px-3 py-3 text-sm text-muted-foreground/70 font-light hover:bg-accent/30 transition-colors">
            <Plus className="h-3.5 w-3.5" /> Bir not al...
          </button>
        )}
      </div>

      {notes.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          <p className="mb-1">空 — Boş</p>
          <p className="text-xs">Henüz not yok</p>
        </div>
      ) : (
        <div className="space-y-6">
          {pinned.length > 0 && (
            <div>
              <div className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground/70 font-light mb-2">Sabitlenen</div>
              <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-3">
                {pinned.map((n) => <QuickCard key={n.id} note={n} onUpdate={updateNote} onDelete={deleteNote} />)}
              </div>
            </div>
          )}
          {others.length > 0 && (
            <div>
              {pinned.length > 0 && <div className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground/70 font-light mb-2">Diğer</div>}
              <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-3">
                {others.map((n) => <QuickCard key={n.id} note={n} onUpdate={updateNote} onDelete={deleteNote} />)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default QuickNotesPanel;
