import { useEffect, useState } from "react";
import { BookOpen, ChevronRight, FileText, Plus, StickyNote, Trash2 } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { useKnowledgeNotes } from "../hooks/useNotebookNotes";
import { useNotebooks } from "../hooks/useNotebooks";
import type { NotebookNote, NoteType } from "../types";
import {
  createQuickNotebook,
  deleteQuickNotebook,
  getQuickNotebooks,
  QUICK_NOTEBOOK_ICON,
  QUICK_NOTES_CHANGED_EVENT,
} from "@/features/quick-notes/lib/localQuickNotesStore";

type Props = {
  selectedNotebookId: string | null;
  selectedKnowledgeNoteId: string | null;
  onSelectNotebook: (id: string) => void;
  onSelectKnowledgeNote: (id: string | null) => void;
};

const EMPTY_RICH_DOC = { type: "doc", content: [{ type: "paragraph" }] };

const quickText = (note: NotebookNote) => {
  const text = note.content?.text;
  return typeof text === "string" ? text.trim() : "";
};

const noteLabel = (note: NotebookNote) => {
  if (note.type === "quick") return note.title?.trim() || quickText(note) || "Anlık not";
  return note.title?.trim() || "Başlıksız doküman";
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
  const [quickVersion, setQuickVersion] = useState(0);
  const [collapsedQuickGroups, setCollapsedQuickGroups] = useState<Record<string, boolean>>({});
  const quickNotebookIds = new Set(
    notebooks
      .filter((notebook) => notebook.icon === QUICK_NOTEBOOK_ICON)
      .map((notebook) => notebook.id)
  );
  const rootNotebooks = notebooks.filter((notebook) => notebook.icon !== QUICK_NOTEBOOK_ICON);
  const visibleNotes = notes.filter((note) => !(note.type === "quick" && quickNotebookIds.has(note.notebook_id)));

  useEffect(() => {
    const refresh = () => setQuickVersion((value) => value + 1);
    window.addEventListener(QUICK_NOTES_CHANGED_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(QUICK_NOTES_CHANGED_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const ensureKnowledgeNotebook = async () => {
    const existingNotebook = notebooks.find((notebook) => !notebook.deleted_at && notebook.icon !== QUICK_NOTEBOOK_ICON);
    if (existingNotebook) return existingNotebook.id;
    if (selectedNotebookId) return selectedNotebookId;

    const createdNotebook = await createNotebook("Defterim");
    if (!createdNotebook) return null;

    onSelectNotebook(createdNotebook.id);
    return createdNotebook.id;
  };

  const handleCreate = async (type: NoteType) => {
    setCreatingType(type);
    const notebookId = await ensureKnowledgeNotebook();
    if (!notebookId) {
      setCreatingType(null);
      return;
    }

    if (type === "quick") {
      const existing = getQuickNotebooks(notebookId)[0];
      const quickNotebook = existing || createQuickNotebook(notebookId);
      onSelectNotebook(quickNotebook.id);
      setCreateOpen(false);
      setCreatingType(null);
      return;
    }

    const created = await createNote(notebookId, {
      type,
      title: "Başlıksız",
      content: EMPTY_RICH_DOC,
    });

    if (created) {
      onSelectKnowledgeNote(created.id);
      setCreateOpen(false);
    }
    setCreatingType(null);
  };

  const handleDelete = async (note: NotebookNote) => {
    await deleteNote(note.id);
    if (selectedKnowledgeNoteId === note.id) onSelectKnowledgeNote(null);
  };

  const loading = notebooksLoading || notesLoading;

  return (
    <SidebarMenu>
      {loading && (
        <SidebarMenuItem>
          <div className="px-2 py-2 text-[11px] text-muted-foreground/60 font-light">
            読み込み中...
          </div>
        </SidebarMenuItem>
      )}

      {!loading && rootNotebooks.map((notebook) => {
        const active = selectedNotebookId === notebook.id && !selectedKnowledgeNoteId;
        void quickVersion;
        const quickChildren = getQuickNotebooks(notebook.id);
        const quickGroupCollapsed = collapsedQuickGroups[notebook.id] ?? false;

        return (
          <div key={notebook.id}>
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={() => onSelectNotebook(notebook.id)}
                className={`text-xs font-light ${active ? "bg-accent text-accent-foreground" : "text-muted-foreground"}`}
              >
                <BookOpen className="h-3.5 w-3.5 shrink-0 opacity-80" />
                <span className="truncate flex-1">{notebook.name}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>

            {quickChildren.length === 1 && (
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => onSelectNotebook(quickChildren[0].id)}
                  className={`group/quick text-xs font-light ${
                    selectedNotebookId === quickChildren[0].id && !selectedKnowledgeNoteId
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground"
                  }`}
                  style={{ paddingLeft: "24px" }}
                >
                  <StickyNote className="h-3.5 w-3.5 shrink-0 opacity-75" />
                  <span className="truncate flex-1">Anlık Not</span>
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      deleteQuickNotebook(quickChildren[0].id);
                      if (selectedNotebookId === quickChildren[0].id) onSelectNotebook(notebook.id);
                    }}
                    className="shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover/quick:opacity-100 focus:opacity-100"
                    title="Defteri sil"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}

            {quickChildren.length > 1 && (
              <>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => setCollapsedQuickGroups((prev) => ({ ...prev, [notebook.id]: !quickGroupCollapsed }))}
                    className="text-xs font-light text-muted-foreground"
                    style={{ paddingLeft: "24px" }}
                  >
                    <ChevronRight className={`h-3 w-3 shrink-0 transition-transform ${quickGroupCollapsed ? "" : "rotate-90"}`} />
                    <StickyNote className="h-3.5 w-3.5 shrink-0 opacity-75" />
                    <span className="truncate flex-1">Anlık Not</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                {!quickGroupCollapsed && quickChildren.map((quickNotebook) => {
                  const childActive = selectedNotebookId === quickNotebook.id && !selectedKnowledgeNoteId;

                  return (
                    <SidebarMenuItem key={quickNotebook.id}>
                      <SidebarMenuButton
                        onClick={() => onSelectNotebook(quickNotebook.id)}
                        className={`group/quick text-xs font-light ${childActive ? "bg-accent text-accent-foreground" : "text-muted-foreground"}`}
                        style={{ paddingLeft: "44px" }}
                      >
                        <StickyNote className="h-3.5 w-3.5 shrink-0 opacity-80" />
                        <span className="truncate flex-1">{quickNotebook.title}</span>
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            deleteQuickNotebook(quickNotebook.id);
                            if (selectedNotebookId === quickNotebook.id) onSelectNotebook(notebook.id);
                          }}
                          className="shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover/quick:opacity-100 focus:opacity-100"
                          title="Defteri sil"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </>
            )}
          </div>
        );
      })}

      {!loading && visibleNotes.length === 0 && rootNotebooks.length === 0 && (
        <SidebarMenuItem>
          <div className="px-2 py-2 text-[11px] text-muted-foreground/60 font-light leading-relaxed">
            Henüz kayıt yok
          </div>
        </SidebarMenuItem>
      )}

      {visibleNotes.map((note) => {
        const Icon = note.type === "quick" ? StickyNote : FileText;
        const active = selectedKnowledgeNoteId === note.id;

        return (
          <SidebarMenuItem key={note.id}>
            <SidebarMenuButton
              onClick={() => onSelectKnowledgeNote(note.id)}
              className={`group/note text-xs font-light ${active ? "bg-accent text-accent-foreground" : "text-muted-foreground"}`}
            >
              <Icon className="h-3.5 w-3.5 shrink-0 opacity-80" />
              <span className="truncate flex-1">{noteLabel(note)}</span>
              <button
                onClick={(event) => {
                  event.stopPropagation();
                  handleDelete(note);
                }}
                className="shrink-0 text-muted-foreground hover:text-destructive opacity-0 group-hover/note:opacity-100 focus:opacity-100 transition-opacity"
                title="Sil"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}

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
              <span className="tracking-wide">Anlık not</span>
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
