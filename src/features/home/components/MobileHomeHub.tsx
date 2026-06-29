import { useEffect, useMemo, useState } from "react";
import { FileText, History, Leaf, Plus, SquarePen, type LucideIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAppShellProjects } from "@/components/AppShell";
import { useSidebar } from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/useAuth";
import { usePageState } from "@/hooks/usePageState";
import type { Project, ViewKey } from "@/hooks/useProjects";
import { supabase } from "@/integrations/supabase/client";
import { colorHex } from "@/hooks/useHabitCategories";
import { getHabitIcon } from "@/lib/habitIcons";
import { useKnowledgeNotes } from "@/features/knowledge/hooks/useNotebookNotes";
import { useNotebooks } from "@/features/knowledge/hooks/useNotebooks";
import type { NotebookNote } from "@/features/knowledge/types";
import { EMPTY_RICH_DOC } from "@/features/knowledge/lib/noteContent";
import { QUICK_NOTEBOOK_ICON } from "@/features/quick-notes/lib/localQuickNotesStore";

const truncateWithEllipsis = (value: string | null | undefined, maxChars: number) => {
  const text = (value || "").replace(/\s+/g, " ").trim();
  if (!text) return "";
  return text.length > maxChars ? `${text.slice(0, maxChars)}...` : text;
};

const stripHtml = (value: string) => value.replace(/<[^>]*>/g, " ");

const extractTextFromRichContent = (value: unknown): string => {
  if (typeof value === "string") return value;
  if (!value || typeof value !== "object") return "";
  if (Array.isArray(value)) return value.map(extractTextFromRichContent).join(" ");

  const record = value as Record<string, unknown>;
  if (typeof record.text === "string") return record.text;
  if (Array.isArray(record.content)) return record.content.map(extractTextFromRichContent).join(" ");
  if (typeof record.content === "string") return record.content;

  return "";
};

const notePlainText = (content: unknown) => {
  if (typeof content === "string") {
    const value = content.trim();
    if (!value) return "";

    try {
      return extractTextFromRichContent(JSON.parse(value)).replace(/\s+/g, " ").trim();
    } catch {
      const stripped = stripHtml(value).replace(/\s+/g, " ").trim();
      return /^[\s]*[{[]/.test(stripped) ? "" : stripped;
    }
  }

  return extractTextFromRichContent(content).replace(/\s+/g, " ").trim();
};

const projectSortKey = (project: Project) => new Date(project.created_at).getTime() || 0;
const noteSortKey = (note: NotebookNote) =>
  new Date(note.updated_at || note.created_at).getTime() || 0;

const MobileHomeHub = () => {
  const navigate = useNavigate();
  const { setOpenMobile } = useSidebar();
  const { user } = useAuth();
  const { projects, createProject } = useAppShellProjects();
  const { notes, createNote } = useKnowledgeNotes();
  const { notebooks, createNotebook } = useNotebooks();
  const {
    setSection,
    setSelectedProjectId,
    setView,
    setSelectedNotebookId,
    setSelectedKnowledgeNoteId,
  } = usePageState();
  const [activeTaskCounts, setActiveTaskCounts] = useState<Record<string, number>>({});

  const workspaceProjects = useMemo(
    () => projects
      .filter((project) => project.kind === "project" && !project.parent_id)
      .sort((a, b) => projectSortKey(b) - projectSortKey(a)),
    [projects]
  );

  const richNotes = useMemo(
    () => notes
      .filter((note) => note.type === "rich")
      .sort((a, b) => noteSortKey(b) - noteSortKey(a)),
    [notes]
  );
  const workspaceProjectIdsKey = useMemo(
    () => workspaceProjects.map((project) => project.id).join("|"),
    [workspaceProjects]
  );

  useEffect(() => {
    if (!user || !workspaceProjectIdsKey) {
      setActiveTaskCounts({});
      return;
    }

    let cancelled = false;

    const loadCounts = async () => {
      const { data } = await supabase
        .from("tasks")
        .select("project_id,status")
        .eq("user_id", user.id)
        .is("deleted_at", null)
        .is("parent_block_id", null)
        .in("status", ["todo", "in_progress"]);

      if (cancelled) return;

      const nextCounts: Record<string, number> = {};
      (data || []).forEach((task) => {
        if (!task.project_id) return;
        nextCounts[task.project_id] = (nextCounts[task.project_id] || 0) + 1;
      });
      setActiveTaskCounts(nextCounts);
    };

    void loadCounts();

    return () => {
      cancelled = true;
    };
  }, [user, workspaceProjectIdsKey]);

  const openProject = (project: Project) => {
    const views = (project.enabled_views?.length ? project.enabled_views : ["table", "notes"]) as ViewKey[];
    setSelectedProjectId(project.id);
    setSection("project");
    setView(views[0] || "table");
  };

  const createAndOpenProject = async () => {
    const created = await createProject(`Yeni Proje ${workspaceProjects.length + 1}`);
    if (created) openProject(created);
  };

  const ensureKnowledgeNotebook = async () => {
    const existing = notebooks.find((notebook) => !notebook.deleted_at && notebook.icon !== QUICK_NOTEBOOK_ICON);
    if (existing) return existing.id;

    const created = await createNotebook("Metin Belgeleri");
    return created?.id ?? null;
  };

  const openNote = (note: NotebookNote) => {
    setSelectedNotebookId(note.notebook_id);
    setSelectedKnowledgeNoteId(note.id);
    setSection("notebook");
  };

  const createAndOpenNote = async () => {
    const notebookId = await ensureKnowledgeNotebook();
    if (!notebookId) return;

    const siblings = notes.filter((note) => note.notebook_id === notebookId && note.type === "rich" && !note.parent_note_id);
    const created = await createNote(notebookId, {
      type: "rich",
      title: `Zengin Doküman ${siblings.length + 1}`,
      content: EMPTY_RICH_DOC,
    });

    if (created) openNote(created);
  };

  const openKnowledgeList = () => {
    setSelectedNotebookId(null);
    setSelectedKnowledgeNoteId(null);
    setSection("notebook");
    setOpenMobile(true);
  };

  return (
    <section className="space-y-6 md:hidden">
      <div className="space-y-3">
        <SectionHeader title="PROJELER" actionLabel="Tümü" onAction={() => setOpenMobile(true)} />
        <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-2">
          {workspaceProjects.map((project) => {
            const Icon = getHabitIcon(project.icon || "folder");
            const tint = project.icon_color ? colorHex(project.icon_color) : undefined;
            const activeCount = activeTaskCounts[project.id] || 0;

            return (
              <button
                key={project.id}
                type="button"
                onClick={() => openProject(project)}
                className="flex min-h-[128px] min-w-[150px] shrink-0 flex-col items-start rounded-lg border border-border/50 bg-card/70 p-4 text-left shadow-sm transition-colors hover:bg-accent/40"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted/50 text-muted-foreground">
                  <Icon className="h-5 w-5" strokeWidth={1.6} style={{ color: tint }} />
                </div>
                <div className="mt-4 truncate text-sm font-light tracking-wide text-foreground">{project.name}</div>
                <div className="mt-1 text-[11px] text-muted-foreground tabular-nums">
                  {activeCount} Aktif Görev
                </div>
              </button>
            );
          })}
          <AddCard title="Yeni Proje" onClick={() => void createAndOpenProject()} />
        </div>
      </div>

      <div className="space-y-3">
        <SectionHeader title="NOTLAR" actionLabel="Tümü" onAction={openKnowledgeList} />
        <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-2">
          {richNotes.map((note) => {
            const title = truncateWithEllipsis(note.title || "Başlıksız", 14) || "Başlıksız";
            const preview = truncateWithEllipsis(notePlainText(note.content), 55) || "Henüz İçerik Yazılmadı";

            return (
              <button
                key={note.id}
                type="button"
                onClick={() => openNote(note)}
                className="flex min-h-[132px] min-w-[160px] max-w-[160px] shrink-0 flex-col items-start rounded-lg border border-border/50 bg-card/70 p-4 text-left shadow-sm transition-colors hover:bg-accent/40"
              >
                <FileText className="h-5 w-5 shrink-0 text-muted-foreground" strokeWidth={1.6} />
                <div className="mt-4 text-sm font-light tracking-wide text-foreground">{title}</div>
                <p className="mt-2 line-clamp-3 text-[11px] leading-relaxed text-muted-foreground">{preview}</p>
              </button>
            );
          })}
          <AddCard title="Yeni Not" onClick={() => void createAndOpenNote()} />
        </div>
      </div>

      <div className="space-y-3">
        <SectionHeader title="HIZLI ERİŞİM" />
        <div className="grid grid-cols-3 gap-3">
          <QuickAccessButton label="İnziva" icon={Leaf} onClick={() => setSection("retreat")} />
          <QuickAccessButton label="Geçmiş" icon={History} onClick={() => navigate("/work-history")} />
          <QuickAccessButton label="Yeni Not" icon={SquarePen} primary onClick={() => void createAndOpenNote()} />
        </div>
      </div>
    </section>
  );
};

const SectionHeader = ({
  title,
  actionLabel,
  onAction,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}) => (
  <div className="flex items-center justify-between">
    <h2 className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">{title}</h2>
    {actionLabel && (
      <button
        type="button"
        onClick={onAction}
        className="text-[11px] font-light tracking-wide text-muted-foreground transition-colors hover:text-foreground"
      >
        {actionLabel}
      </button>
    )}
  </div>
);

const AddCard = ({
  title,
  onClick,
}: {
  title: string;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className="flex min-h-[128px] min-w-[132px] shrink-0 flex-col items-center justify-center rounded-lg border border-dashed border-border/70 bg-background/60 px-4 py-5 text-muted-foreground transition-colors hover:bg-accent/35 hover:text-foreground"
  >
    <span className="flex h-10 w-10 items-center justify-center rounded-md bg-muted/45">
      <Plus className="h-4 w-4" />
    </span>
    <span className="mt-3 text-xs font-light tracking-wide">{title}</span>
  </button>
);

const QuickAccessButton = ({
  label,
  icon: Icon,
  primary = false,
  onClick,
}: {
  label: string;
  icon: LucideIcon;
  primary?: boolean;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex min-h-[86px] flex-col items-center justify-center gap-2 rounded-lg border px-2.5 py-3 text-center transition-colors ${
      primary
        ? "border-foreground bg-foreground text-background hover:bg-foreground/90"
        : "border-border/50 bg-card/70 text-foreground hover:bg-accent/40"
    }`}
  >
    <Icon className={`h-5 w-5 shrink-0 ${primary ? "text-background" : "text-muted-foreground"}`} strokeWidth={1.6} />
    <span className="block text-center text-[11px] font-light leading-tight tracking-wide">{label}</span>
  </button>
);

export default MobileHomeHub;
