import { useState } from "react";
import { ChevronRight, FileText, Plus, StickyNote, Trash2 } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { useKnowledgeNotes } from "../hooks/useNotebookNotes";
import { useNotebooks } from "../hooks/useNotebooks";
import type { NotebookNote, NoteType } from "../types";
import { QUICK_NOTEBOOK_ICON, QUICK_NOTES_ROOT_ID } from "@/features/quick-notes/lib/localQuickNotesStore";

type Props = {
  selectedNotebookId: string | null;
  selectedKnowledgeNoteId: string | null;
  onSelectNotebook: (id: string) => void;
  onSelectKnowledgeNote: (id: string | null) => void;
};

const EMPTY_RICH_DOC = { type: "doc", content: [{ type: "paragraph" }] };
const ROOT_ITEM_PADDING_LEFT = 8;
const CHILD_ITEM_INDENT = 16;

const noteLabel = (note: NotebookNote) => {
  return note.title?.trim() || "Başlıksız doküman";
};

const defaultTitle = (type: NoteType, siblings: NotebookNote[]) => {
  if (type === "quick") return "Anlık Not";
  return `Zengin Doküman ${siblings.length + 1}`;
};

const NotebookSidebarTree = ({
  selectedNotebookId,
  selectedKnowledgeNoteId,
  onSelectNotebook,
  onSelectKnowledgeNote,
}: Props) => {
  const { notebooks, loading: notebooksLoading, createNotebook } = useNotebooks();
  const { notes, loading: notesLoading, createNote, deleteNote } = useKnowledgeNotes();
  const [createOpen, setCreateOpen] = useState(false);
  const [creatingType, setCreatingType] = useState<NoteType | null>(null);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const rootNotebooks = notebooks.filter((notebook) => notebook.icon !== QUICK_NOTEBOOK_ICON);
  const visibleNotes = notes.filter((note) => note.type === "rich");
  const loading = notebooksLoading || notesLoading;

  const childrenOf = (notebookId: string, parentId: string | null) =>
    visibleNotes
      .filter((note) => note.notebook_id === notebookId && (note.parent_note_id ?? null) === parentId)
      .sort((a, b) => {
        if (a.type !== b.type) return a.type === "quick" ? -1 : 1;
        if (a.position !== b.position) return a.position - b.position;
        return a.created_at.localeCompare(b.created_at);
      });

  const ensureKnowledgeNotebook = async () => {
    const existingNotebook = notebooks.find((notebook) => !notebook.deleted_at && notebook.icon !== QUICK_NOTEBOOK_ICON);
    if (existingNotebook) return existingNotebook.id;

    const createdNotebook = await createNotebook("Metin Belgeleri");
    if (!createdNotebook) return null;
    return createdNotebook.id;
  };

  const handleCreate = async (type: NoteType, notebookId?: string, parentNote?: NotebookNote) => {
    setCreatingType(type);
    if (type === "quick") {
      onSelectNotebook(QUICK_NOTES_ROOT_ID);
      onSelectKnowledgeNote(null);
      setCreateOpen(false);
      setCreatingType(null);
      return;
    }

    const targetNotebookId = notebookId || parentNote?.notebook_id || (await ensureKnowledgeNotebook());
    if (!targetNotebookId) {
      setCreatingType(null);
      return;
    }

    const parentId = parentNote?.id ?? null;
    const siblings = childrenOf(targetNotebookId, parentId);
    const created = await createNote(targetNotebookId, {
      type,
      title: defaultTitle(type, siblings),
      content: EMPTY_RICH_DOC,
      parent_note_id: parentId,
    });

    if (created) {
      if (parentId) setCollapsed((prev) => ({ ...prev, [parentId]: false }));
      onSelectKnowledgeNote(created.id);
      setCreateOpen(false);
    }
    setCreatingType(null);
  };

  const handleDelete = async (note: NotebookNote) => {
    const deletedIds = await deleteNote(note.id);
    if (selectedKnowledgeNoteId && deletedIds.includes(selectedKnowledgeNoteId)) onSelectKnowledgeNote(null);
  };

  const renderNote = (note: NotebookNote, depth: number) => {
    const children = childrenOf(note.notebook_id, note.id);
    const active = selectedKnowledgeNoteId === note.id;
    const isCollapsed = collapsed[note.id] ?? false;

    return (
      <div key={note.id}>
        <SidebarMenuItem>
          <SidebarMenuButton
            asChild
            className={`group/note text-xs font-light ${active ? "bg-accent text-accent-foreground" : "text-muted-foreground"}`}
            style={{ paddingLeft: `${ROOT_ITEM_PADDING_LEFT + depth * CHILD_ITEM_INDENT}px` }}
          >
            <div
              role="button"
              tabIndex={0}
              onClick={() => onSelectKnowledgeNote(note.id)}
              onKeyDown={(event) => {
                if (event.target !== event.currentTarget) return;
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelectKnowledgeNote(note.id);
                }
              }}
            >
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  if (children.length > 0) setCollapsed((prev) => ({ ...prev, [note.id]: !isCollapsed }));
                }}
                className="shrink-0"
                title={children.length > 0 ? "Aç/kapat" : ""}
              >
                <ChevronRight className={`h-3 w-3 transition-transform ${!isCollapsed ? "rotate-90" : ""} ${children.length === 0 ? "opacity-20" : ""}`} />
              </button>
              <FileText className="h-3.5 w-3.5 shrink-0 opacity-80" />
              <span className="truncate flex-1">{noteLabel(note)}</span>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  handleCreate(note.type, note.notebook_id, note);
                }}
                className="shrink-0 text-muted-foreground hover:text-foreground opacity-0 group-hover/note:opacity-100 focus:opacity-100 transition-opacity"
                title="Alt sayfa ekle"
              >
                <Plus className="h-3 w-3" />
              </button>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  handleDelete(note);
                }}
                className="shrink-0 text-muted-foreground hover:text-destructive opacity-0 group-hover/note:opacity-100 focus:opacity-100 transition-opacity"
                title="Sil"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>

        {!isCollapsed && children.map((child) => renderNote(child, depth + 1))}
      </div>
    );
  };

  return (
    <SidebarMenu>
      {loading && (
        <SidebarMenuItem>
          <div className="px-2 py-2 text-[11px] text-muted-foreground/60 font-light">
            Yükleniyor...
          </div>
        </SidebarMenuItem>
      )}

      {!loading && (
        <SidebarMenuItem>
          <SidebarMenuButton
            onClick={() => {
              onSelectNotebook(QUICK_NOTES_ROOT_ID);
              onSelectKnowledgeNote(null);
            }}
            className={`text-xs font-light ${
              selectedNotebookId === QUICK_NOTES_ROOT_ID && !selectedKnowledgeNoteId
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground"
            }`}
          >
            <span className="h-3 w-3 shrink-0" aria-hidden="true" />
            <StickyNote className="h-3.5 w-3.5 shrink-0 opacity-80" />
            <span className="truncate flex-1">Anlık Notlar</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      )}

      {!loading && rootNotebooks.flatMap((notebook) => childrenOf(notebook.id, null)).map((note) => renderNote(note, 0))}

      {!loading && visibleNotes.length === 0 && rootNotebooks.length === 0 && (
        <SidebarMenuItem>
          <div className="px-2 py-2 text-[11px] text-muted-foreground/60 font-light leading-relaxed">
            Henüz kayıt yok
          </div>
        </SidebarMenuItem>
      )}

      <SidebarMenuItem>
        <Popover open={createOpen} onOpenChange={setCreateOpen}>
          <PopoverTrigger asChild>
            <SidebarMenuButton className="text-xs text-muted-foreground">
              <Plus className="h-3.5 w-3.5 mr-2" />
              Yeni ekle
            </SidebarMenuButton>
          </PopoverTrigger>
          <PopoverContent className="w-52 p-1" align="start">
            <button
              onClick={() => handleCreate("quick")}
              disabled={creatingType !== null}
              className="w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded-sm hover:bg-accent transition-colors text-left disabled:opacity-50"
            >
              <StickyNote className="h-3.5 w-3.5" />
              <span className="tracking-wide">Anlık notlar</span>
            </button>
            <button
              onClick={() => handleCreate("rich")}
              disabled={creatingType !== null}
              className="w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded-sm hover:bg-accent transition-colors text-left disabled:opacity-50"
            >
              <FileText className="h-3.5 w-3.5" />
              <span className="tracking-wide">Zengin doküman</span>
            </button>
          </PopoverContent>
        </Popover>
      </SidebarMenuItem>
    </SidebarMenu>
  );
};

export default NotebookSidebarTree;
