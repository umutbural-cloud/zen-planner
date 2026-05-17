import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, ChevronRight, FileText, Trash2 } from "lucide-react";
import { useNotebookNotes } from "../hooks/useNotebookNotes";
import type { NotebookNote } from "../types";
import RichNoteEditor from "./RichNoteEditor";

const PageRow = ({
  note, children, allNotes, depth, selectedId, onSelect, onAddChild, onDelete,
}: {
  note: NotebookNote;
  children: NotebookNote[];
  allNotes: NotebookNote[];
  depth: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAddChild: (parentId: string) => void;
  onDelete: (id: string) => void;
}) => {
  const [open, setOpen] = useState(true);
  const childOf = (id: string) => allNotes.filter((n) => n.parent_note_id === id);
  const active = selectedId === note.id;
  return (
    <>
      <div
        className={`group flex items-center gap-1 px-1.5 py-1 rounded-sm cursor-pointer text-xs font-light ${active ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-accent/40 hover:text-foreground"}`}
        style={{ paddingLeft: `${6 + depth * 12}px` }}
        onClick={() => onSelect(note.id)}
      >
        <button onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }} className="shrink-0">
          <ChevronRight className={`h-3 w-3 transition-transform ${open ? "rotate-90" : ""} ${children.length === 0 ? "opacity-20" : ""}`} />
        </button>
        <FileText className="h-3 w-3 shrink-0 opacity-70" />
        <span className="truncate flex-1">{note.title || "Başlıksız"}</span>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100">
          <button onClick={(e) => { e.stopPropagation(); onAddChild(note.id); }} className="hover:text-foreground" title="Alt sayfa"><Plus className="h-3 w-3" /></button>
          <button onClick={(e) => { e.stopPropagation(); onDelete(note.id); }} className="hover:text-destructive" title="Sil"><Trash2 className="h-3 w-3" /></button>
        </div>
      </div>
      {open && children.map((c) => (
        <PageRow key={c.id} note={c} children={childOf(c.id)} allNotes={allNotes} depth={depth + 1}
          selectedId={selectedId} onSelect={onSelect} onAddChild={onAddChild} onDelete={onDelete} />
      ))}
    </>
  );
};

const RichNotesPanel = ({ notebookId }: { notebookId: string }) => {
  const { notes, loading, createNote, updateNote, deleteNote } = useNotebookNotes(notebookId, "rich");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Auto-select first note
  useEffect(() => {
    if (!loading && !selectedId && notes.length > 0) setSelectedId(notes[0].id);
    if (selectedId && !notes.find((n) => n.id === selectedId)) setSelectedId(notes[0]?.id || null);
  }, [loading, notes, selectedId]);

  const roots = useMemo(() => notes.filter((n) => !n.parent_note_id), [notes]);
  const childOf = (id: string) => notes.filter((n) => n.parent_note_id === id);

  const selected = notes.find((n) => n.id === selectedId) || null;

  const handleCreate = async (parentId?: string) => {
    const created = await createNote({ type: "rich", title: "", content: { type: "doc", content: [{ type: "paragraph" }] }, parent_note_id: parentId ?? null });
    if (created) setSelectedId(created.id);
  };

  // local title state to avoid lag
  const [titleDraft, setTitleDraft] = useState("");
  const lastSyncedId = useRef<string | null>(null);
  useEffect(() => {
    if (selected && lastSyncedId.current !== selected.id) {
      setTitleDraft(selected.title);
      lastSyncedId.current = selected.id;
    }
  }, [selected]);

  const titleDebounce = useRef<number | null>(null);
  const handleTitleChange = (v: string) => {
    setTitleDraft(v);
    if (!selected) return;
    if (titleDebounce.current) window.clearTimeout(titleDebounce.current);
    titleDebounce.current = window.setTimeout(() => {
      updateNote(selected.id, { title: v });
    }, 500);
  };

  if (loading) return <div className="text-center text-muted-foreground text-sm py-12">読み込み中...</div>;

  return (
    <div className="flex gap-0 -mx-3 sm:-mx-6 min-h-[70vh]">
      <aside className="w-56 shrink-0 border-r border-border/60 px-2 py-3 space-y-0.5 overflow-y-auto">
        <div className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground/70 font-light px-1.5 mb-2">Sayfalar</div>
        {roots.length === 0 && (
          <div className="text-[11px] text-muted-foreground/60 font-light px-1.5 py-2">Henüz sayfa yok</div>
        )}
        {roots.map((n) => (
          <PageRow key={n.id} note={n} children={childOf(n.id)} allNotes={notes} depth={0}
            selectedId={selectedId} onSelect={setSelectedId} onAddChild={handleCreate} onDelete={deleteNote} />
        ))}
        <button onClick={() => handleCreate()}
          className="w-full mt-2 flex items-center gap-1.5 px-2 py-1.5 rounded-sm text-xs text-muted-foreground/70 hover:bg-accent/40 hover:text-foreground font-light">
          <Plus className="h-3 w-3" /> Yeni sayfa
        </button>
      </aside>

      <section className="flex-1 min-w-0 overflow-y-auto">
        {selected ? (
          <RichNoteEditor
            key={selected.id}
            value={selected.content}
            onChange={(doc) => updateNote(selected.id, { content: doc })}
            titleValue={titleDraft}
            onTitleChange={handleTitleChange}
            placeholder="Yazmaya başla..."
          />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            <div className="text-center space-y-3">
              <p className="text-xs">Sayfa seçin veya yeni bir sayfa oluşturun</p>
              <button onClick={() => handleCreate()} className="text-xs px-3 py-1.5 rounded-sm bg-accent hover:bg-accent/80 inline-flex items-center gap-1.5">
                <Plus className="h-3 w-3" /> Yeni sayfa
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

export default RichNotesPanel;
