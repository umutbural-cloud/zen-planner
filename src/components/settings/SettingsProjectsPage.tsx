import { useEffect, useMemo, useState } from "react";
import { Edit3, FolderKanban, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ProjectIconPicker } from "@/components/AppSidebar";
import { useProjects, type Project, type ViewKey } from "@/hooks/useProjects";
import { colorHex } from "@/hooks/useHabitCategories";
import { getHabitIcon } from "@/lib/habitIcons";
import { cn } from "@/lib/utils";

const VIEW_OPTIONS: { key: ViewKey; label: string }[] = [
  { key: "table", label: "Tablo" },
  { key: "notes", label: "Notlar" },
  { key: "kanban", label: "Kanban" },
  { key: "calendar", label: "Takvim" },
  { key: "gantt", label: "Gantt" },
];

const VIEW_LABELS: Record<ViewKey, string> = {
  table: "Tablo",
  notes: "Notlar",
  kanban: "Kanban",
  calendar: "Takvim",
  gantt: "Gantt",
};

type ProjectDraft = {
  name: string;
  emoji: string;
  icon: string | null;
  iconColor: string | null;
  enabledViews: ViewKey[];
};

const makeDraft = (project: Project): ProjectDraft => ({
  name: project.name,
  emoji: project.emoji || "📁",
  icon: project.icon ?? null,
  iconColor: project.icon_color ?? null,
  enabledViews: project.enabled_views?.length ? project.enabled_views : ["table", "notes"],
});

const uniqueViews = (views: ViewKey[]) => Array.from(new Set(views)).filter((view): view is ViewKey =>
  VIEW_OPTIONS.some((option) => option.key === view),
);

const arraysEqual = (a: ViewKey[], b: ViewKey[]) => a.length === b.length && a.every((value, index) => value === b[index]);

const ProjectIcon = ({ project }: { project: Project }) => {
  const Icon = project.icon ? getHabitIcon(project.icon) : null;
  const tint = project.icon_color ? colorHex(project.icon_color) : undefined;

  return (
    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted/55 text-base text-muted-foreground">
      {Icon ? <Icon className="h-4 w-4" strokeWidth={1.8} style={tint ? { color: tint } : undefined} /> : project.emoji || "📁"}
    </span>
  );
};

export const SettingsProjectsPage = () => {
  const { projects, loading, updateProject, deleteProject } = useProjects();
  const workspaceProjects = useMemo(
    () => projects.filter((project) => project.kind === "project"),
    [projects],
  );
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ProjectDraft | null>(null);
  const [projectToTrash, setProjectToTrash] = useState<Project | null>(null);
  const [viewError, setViewError] = useState("");
  const [saving, setSaving] = useState(false);

  const selectedProject = workspaceProjects.find((project) => project.id === selectedProjectId) ?? null;

  useEffect(() => {
    if (!selectedProject) {
      setDraft(null);
      return;
    }
    setDraft(makeDraft(selectedProject));
    setViewError("");
  }, [selectedProject]);

  const hasChanges = Boolean(selectedProject && draft && (
    draft.name.trim() !== selectedProject.name ||
    draft.emoji.trim() !== (selectedProject.emoji || "") ||
    draft.icon !== (selectedProject.icon ?? null) ||
    draft.iconColor !== (selectedProject.icon_color ?? null) ||
    !arraysEqual(uniqueViews(draft.enabledViews), selectedProject.enabled_views)
  ));

  const selectProject = (project: Project) => {
    setSelectedProjectId(project.id);
  };

  const toggleView = (view: ViewKey, checked: boolean) => {
    if (!draft) return;
    const nextViews = checked
      ? uniqueViews([...draft.enabledViews, view])
      : draft.enabledViews.filter((item) => item !== view);
    if (nextViews.length === 0) {
      setViewError("En az bir görünüm aktif kalmalıdır.");
      return;
    }
    setViewError("");
    setDraft({ ...draft, enabledViews: nextViews });
  };

  const saveProject = async () => {
    if (!selectedProject || !draft) return;
    const nextName = draft.name.trim();
    const nextEmoji = draft.emoji.trim() || "📁";
    const nextViews = uniqueViews(draft.enabledViews);

    if (!nextName) {
      toast.error("Proje adı boş olamaz.");
      return;
    }
    if (nextViews.length === 0) {
      setViewError("En az bir görünüm aktif kalmalıdır.");
      return;
    }

    const updates: Partial<Pick<Project, "name" | "emoji" | "icon" | "icon_color" | "enabled_views">> = {};
    if (nextName !== selectedProject.name) updates.name = nextName;
    if (nextEmoji !== (selectedProject.emoji || "")) updates.emoji = nextEmoji;
    if (draft.icon !== (selectedProject.icon ?? null)) updates.icon = draft.icon;
    if (draft.iconColor !== (selectedProject.icon_color ?? null)) updates.icon_color = draft.iconColor;
    if (!arraysEqual(nextViews, selectedProject.enabled_views)) updates.enabled_views = nextViews;

    if (Object.keys(updates).length === 0) return;

    setSaving(true);
    try {
      const updated = await updateProject(selectedProject.id, updates);
      if (!updated) throw new Error("Project update failed");
      toast.success("Proje güncellendi.");
    } catch {
      toast.error("Proje güncellenemedi.");
    } finally {
      setSaving(false);
    }
  };

  const moveProjectToTrash = async () => {
    if (!projectToTrash || projectToTrash.is_default) return;
    const projectId = projectToTrash.id;
    try {
      await deleteProject(projectId);
      toast.success("Proje çöp kutusuna taşındı.");
      setSelectedProjectId((current) => current === projectId ? null : current);
    } catch {
      toast.error("Proje çöp kutusuna taşınamadı.");
    } finally {
      setProjectToTrash(null);
    }
  };

  return (
    <div className="space-y-5">
      <section className="rounded-lg bg-white px-6 py-5 dark:bg-card">
        <h2 className="text-base font-medium tracking-normal text-foreground">Proje silme güvenlidir</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Projeler kalıcı olarak silinmez; çöp kutusuna taşınır. Geri yükleme ayrı bir işlem olarak ele alınır.
        </p>
      </section>

      <section className="rounded-lg bg-white px-6 py-5 dark:bg-card">
        <div className="mb-5">
          <h2 className="text-base font-medium tracking-normal text-foreground">Proje Listesi</h2>
        </div>

        <div className="grid grid-cols-[minmax(0,1fr)_220px_90px_88px] gap-4 px-3 pb-2 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground/70">
          <span>Proje</span>
          <span>Görünümler</span>
          <span>Durum</span>
          <span>Aksiyonlar</span>
        </div>

        <div className="divide-y divide-muted/70">
          {loading ? (
            <div className="rounded-md bg-muted/35 px-4 py-5 text-center text-sm text-muted-foreground">
              Projeler yükleniyor...
            </div>
          ) : workspaceProjects.length === 0 ? (
            <div className="rounded-md bg-muted/35 px-4 py-5 text-center text-sm text-muted-foreground">
              Gösterilecek proje yok.
            </div>
          ) : (
            workspaceProjects.map((project) => {
              const selected = selectedProjectId === project.id;
              const views = project.enabled_views?.length ? project.enabled_views : ["table", "notes"];

              return (
                <div
                  key={project.id}
                  className={cn(
                    "grid grid-cols-[minmax(0,1fr)_220px_90px_88px] items-center gap-4 rounded-md px-3 py-4 transition-colors",
                    selected ? "bg-muted/45" : "hover:bg-muted/30",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => selectProject(project)}
                    className="flex min-w-0 items-start gap-3 text-left focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <ProjectIcon project={project} />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-foreground">{project.name}</span>
                      <span className="mt-1 block text-xs text-muted-foreground">{views.length} aktif görünüm</span>
                    </span>
                  </button>

                  <div className="flex flex-wrap gap-1.5">
                    {views.map((view) => (
                      <span key={view} className="rounded-md bg-muted/55 px-2 py-1 text-[11px] font-light text-muted-foreground">
                        {VIEW_LABELS[view]}
                      </span>
                    ))}
                  </div>

                  <span className="text-sm font-light text-muted-foreground">Aktif</span>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => selectProject(project)}
                      className="h-8 w-8 p-0 text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                      aria-label="Projeyi düzenle"
                      title="Projeyi düzenle"
                    >
                      <Edit3 className="h-3.5 w-3.5" strokeWidth={1.7} />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={project.is_default}
                      onClick={() => setProjectToTrash(project)}
                      title={project.is_default ? "Varsayılan proje çöp kutusuna taşınamaz." : "Çöp Kutusuna Taşı"}
                      aria-label={project.is_default ? "Varsayılan proje çöp kutusuna taşınamaz." : "Projeyi çöp kutusuna taşı"}
                      className="h-8 w-8 p-0 text-muted-foreground hover:bg-accent/50 hover:text-destructive disabled:hover:text-muted-foreground"
                    >
                      <Trash2 className="h-3.5 w-3.5" strokeWidth={1.7} />
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      <section className="rounded-lg bg-white px-6 py-5 dark:bg-card">
        <div className="mb-5">
          <h2 className="text-base font-medium tracking-normal text-foreground">Proje Düzenleme</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
            Seçili projenin temel ayarlarını ve görünür görünümlerini yapılandır.
          </p>
        </div>

        {!selectedProject || !draft ? (
          <div className="rounded-md bg-muted/35 px-4 py-5 text-center text-sm text-muted-foreground">
            Düzenlemek için listeden bir proje seç.
          </div>
        ) : (
          <div className="space-y-5">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
              <label className="block">
                <span className="mb-2 block text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground/70">Proje adı</span>
                <Input
                  value={draft.name}
                  onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                  placeholder="Proje adı"
                  className="h-10 rounded-md border-transparent bg-muted/55 text-sm font-light shadow-none dark:bg-muted/30"
                />
              </label>

              <div className="flex items-start justify-end pt-6">
                <ProjectIconPicker
                  icon={draft.icon}
                  iconColor={draft.iconColor}
                  onChange={(updates) =>
                    setDraft({
                      ...draft,
                      icon: updates.icon === undefined ? draft.icon : updates.icon,
                      iconColor: updates.icon_color === undefined ? draft.iconColor : updates.icon_color,
                    })
                  }
                />
                <span className="sr-only">Proje ikonunu değiştir</span>
              </div>
            </div>

            <div>
              <div className="mb-3 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground/70">Görünür görünümler</div>
              <div className="grid grid-cols-2 gap-2">
                {VIEW_OPTIONS.map((view) => (
                  <label
                    key={view.key}
                    className="flex cursor-pointer items-center gap-3 rounded-md bg-muted/35 px-3 py-3 text-sm text-foreground"
                  >
                    <Checkbox
                      checked={draft.enabledViews.includes(view.key)}
                      onCheckedChange={(checked) => toggleView(view.key, checked === true)}
                    />
                    <span>{view.label}</span>
                  </label>
                ))}
              </div>
              {viewError && <p className="mt-2 text-xs text-muted-foreground">{viewError}</p>}
            </div>

            <div className="flex items-center justify-between gap-4 pt-1">
              <p className="max-w-xl text-xs leading-5 text-muted-foreground">
                Ad, ikon ve görünüm değişiklikleri kalıcıdır. Proje silme işlemi soft-delete olarak yapılır.
              </p>
              <Button
                type="button"
                onClick={saveProject}
                disabled={!hasChanges || saving}
                className="h-9 shrink-0 px-3 text-xs"
              >
                Değişiklikleri Kaydet
              </Button>
            </div>
          </div>
        )}
      </section>

      <AlertDialog open={Boolean(projectToTrash)} onOpenChange={(open) => !open && setProjectToTrash(null)}>
        <AlertDialogContent className="border-0 bg-white shadow-lg dark:bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle>Projeyi çöp kutusuna taşı?</AlertDialogTitle>
            <AlertDialogDescription>
              Bu proje kalıcı olarak silinmez. Çöp kutusundan geri yüklenebilir.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-0 bg-muted/55 hover:bg-muted dark:bg-muted/30 dark:hover:bg-muted/40">
              Vazgeç
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void moveProjectToTrash();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Çöp Kutusuna Taşı
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
