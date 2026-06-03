import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, ChevronRight, FileText, Trash2, GripVertical } from "lucide-react";
import {
  closestCenter,
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useNotebookNotes } from "../hooks/useNotebookNotes";
import type { NotebookNote } from "../types";
import RichNoteEditor from "./RichNoteEditor";
import { richDocFromJson } from "../lib/noteContent";

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
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: note.id });
  const [open, setOpen] = useState(true);
  const childOf = (id: string) => allNotes.filter((n) => n.parent_note_id === id);
  const active = selectedId === note.id;
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.55 : 1,
    paddingLeft: `${6 + depth * 12}px`,
  };
  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        className={`group flex items-center gap-1 px-1.5 py-1 rounded-sm cursor-pointer text-xs font-light ${active ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-accent/40 hover:text-foreground"}`}
        onClick={() => onSelect(note.id)}
      >
        <button
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
          className="shrink-0 cursor-grab active:cursor-grabbing opacity-40 hover:opacity-100"
          title="Sırala"
        >
          <GripVertical className="h-3 w-3" />
        </button>
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
      {open && (
        <SortableContext items={children.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          {children.map((c) => (
            <PageRow key={c.id} note={c} children={childOf(c.id)} allNotes={allNotes} depth={depth + 1}
              selectedId={selectedId} onSelect={onSelect} onAddChild={onAddChild} onDelete={onDelete} />
          ))}
        </SortableContext>
      )}
    </>
  );
};

const RichNotesPanel = ({ notebookId }: { notebookId: string }) => {
  const { notes, loading, createNote, updateNote, deleteNote, reorderNotes } = useNotebookNotes(notebookId, "rich");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

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

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeNote = notes.find((note) => note.id === active.id);
    const overNote = notes.find((note) => note.id === over.id);
    if (!activeNote || !overNote || activeNote.parent_note_id !== overNote.parent_note_id) return;

    const siblings = notes.filter((note) => note.parent_note_id === activeNote.parent_note_id);
    const oldIndex = siblings.findIndex((note) => note.id === active.id);
    const newIndex = siblings.findIndex((note) => note.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const ordered = arrayMove(siblings, oldIndex, newIndex);
    await reorderNotes(ordered.map((note) => note.id));
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

  if (loading) return <div className="text-center text-muted-foreground text-sm py-12">Yükleniyor...</div>;

  return (
    <div className="flex gap-0 -mx-3 sm:-mx-6 min-h-[70vh]">
      <aside className="w-56 shrink-0 border-r border-border/60 px-2 py-3 space-y-0.5 overflow-y-auto">
        <div className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground/70 font-light px-1.5 mb-2">Sayfalar</div>
        {roots.length === 0 && (
          <div className="text-[11px] text-muted-foreground/60 font-light px-1.5 py-2">Henüz sayfa yok</div>
        )}
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={roots.map((n) => n.id)} strategy={verticalListSortingStrategy}>
            {roots.map((n) => (
              <PageRow key={n.id} note={n} children={childOf(n.id)} allNotes={notes} depth={0}
                selectedId={selectedId} onSelect={setSelectedId} onAddChild={handleCreate} onDelete={deleteNote} />
            ))}
          </SortableContext>
        </DndContext>
        <button onClick={() => handleCreate()}
          className="w-full mt-2 flex items-center gap-1.5 px-2 py-1.5 rounded-sm text-xs text-muted-foreground/70 hover:bg-accent/40 hover:text-foreground font-light">
          <Plus className="h-3 w-3" /> Yeni sayfa
        </button>
      </aside>

      <section className="flex-1 min-w-0 overflow-y-auto">
        {selected ? (
          <RichNoteEditor
            key={selected.id}
            value={richDocFromJson(selected.content)}
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
