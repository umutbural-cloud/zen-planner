import { Plus } from "lucide-react";
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
  rectSortingStrategy,
  SortableContext,
} from "@dnd-kit/sortable";
import { useQuickNoteNotebooks } from "../hooks/useQuickNoteNotebooks";
import type { NotebookNote } from "@/features/knowledge/types";
import { QuickNotebookTabs } from "./QuickNotebookTabs";
import { QuickNoteCard } from "./QuickNoteCard";

const NewNoteCard = ({ onCreate }: { onCreate: () => void }) => (
  <button
    onClick={onCreate}
    className="mx-auto flex min-h-44 w-full max-w-xs flex-col items-center justify-center gap-4 rounded-sm border border-dashed border-border/80 bg-background/80 p-8 text-muted-foreground transition hover:border-foreground/20 hover:bg-card hover:text-foreground"
  >
    <span className="flex h-12 w-12 items-center justify-center rounded-sm border border-border/70 bg-card">
      <Plus className="h-7 w-7" />
    </span>
    <span className="text-sm font-light tracking-wide">Yeni Not</span>
  </button>
);

const NoteGrid = ({
  notes,
  onUpdate,
  onDelete,
  onReorder,
}: {
  notes: NotebookNote[];
  onUpdate: (id: string, updates: Partial<Pick<NotebookNote, "title" | "content" | "color" | "pinned" | "position">>) => void;
  onDelete: (id: string) => void;
  onReorder: (ids: string[]) => void;
}) => {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = notes.findIndex((note) => note.id === active.id);
    const newIndex = notes.findIndex((note) => note.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    onReorder(arrayMove(notes, oldIndex, newIndex).map((note) => note.id));
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={notes.map((note) => note.id)} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 2xl:grid-cols-4">
          {notes.map((note) => (
            <QuickNoteCard key={note.id} note={note} onUpdate={onUpdate} onDelete={onDelete} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
};

const QuickNotesPanel = ({ notebookId }: { notebookId: string | null }) => {
  const {
    notebooks,
    isRootCollection,
    activeNotebookId,
    notes,
    loading,
    createNotebook,
    renameNotebook,
    deleteNotebook,
    selectNotebook,
    createNote,
    updateNote,
    deleteNote,
    reorderNotes,
  } = useQuickNoteNotebooks(notebookId);

  const pinned = notes.filter((note) => note.pinned);
  const others = notes.filter((note) => !note.pinned);

  if (loading) {
    return (
      <div className="flex min-h-[45vh] items-center justify-center text-xs text-muted-foreground">
        Yükleniyor...
      </div>
    );
  }

  const handleCreateNote = async () => {
    await createNote();
  };

  return (
    <section className="mx-auto w-full max-w-6xl px-1 py-1 sm:px-4">
      <div className="space-y-4">
        {isRootCollection ? (
          <div className="space-y-1">
            <h2 className="text-xl font-light tracking-wide">Anlık Notlar</h2>
            <p className="text-xs text-muted-foreground">
              Tüm anlık not kartları bu panoda birlikte görünür.
            </p>
          </div>
        ) : (
          <QuickNotebookTabs
            notebooks={notebooks}
            activeNotebookId={activeNotebookId}
            onSelect={selectNotebook}
            onCreate={() => { void createNotebook(); }}
            onRename={(id, title) => { void renameNotebook(id, title); }}
            onDelete={(id) => { void deleteNotebook(id); }}
          />
        )}

        {notes.length === 0 ? (
          <div className="flex min-h-[46vh] items-center justify-center">
            <NewNoteCard onCreate={() => { void handleCreateNote(); }} />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button
                onClick={() => { void handleCreateNote(); }}
                className="inline-flex h-8 items-center gap-2 rounded-sm border border-border/70 bg-background/80 px-2.5 text-xs font-light text-muted-foreground transition hover:border-foreground/15 hover:text-foreground"
              >
                <Plus className="h-3.5 w-3.5" />
                Yeni Not
              </button>
            </div>

            {pinned.length > 0 && (
              <div className="space-y-3">
                <div className="text-[10px] font-light uppercase tracking-[0.22em] text-muted-foreground/70">
                  Sabitlenen
                </div>
                <NoteGrid notes={pinned} onUpdate={updateNote} onDelete={deleteNote} onReorder={(ids) => { void reorderNotes(ids); }} />
              </div>
            )}

            {others.length > 0 && (
              <div className="space-y-3">
                {pinned.length > 0 && (
                  <div className="text-[10px] font-light uppercase tracking-[0.22em] text-muted-foreground/70">
                    Diğer
                  </div>
                )}
                <NoteGrid notes={others} onUpdate={updateNote} onDelete={deleteNote} onReorder={(ids) => { void reorderNotes(ids); }} />
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
};

export default QuickNotesPanel;
