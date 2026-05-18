import { useMemo, useState } from "react";
import { Table as TableIcon, KanbanSquare, ListTodo } from "lucide-react";
import TableView from "./TableView";
import KanbanView from "./KanbanView";
import { useUserSettings } from "@/hooks/useUserSettings";
import type { Project } from "@/hooks/useProjects";

type ViewKind = "table" | "kanban";

type Props = {
  projects: Project[];
};

const PomodoroTaskBoard = ({ projects }: Props) => {
  const { settings } = useUserSettings();
  const [view, setView] = useState<ViewKind>(() => {
    const saved = typeof localStorage !== "undefined" ? localStorage.getItem("pomodoro:taskView") : null;
    return saved === "kanban" ? "kanban" : "table";
  });

  const project = useMemo(() => {
    const workspaceProjects = projects.filter((item) => item.kind === "project");
    return workspaceProjects.find((item) => item.id === settings.default_pomodoro_project_id) ??
      workspaceProjects.find((item) => item.is_default) ??
      workspaceProjects[0] ??
      null;
  }, [projects, settings.default_pomodoro_project_id]);

  const setAndPersist = (v: ViewKind) => {
    setView(v);
    try {
      localStorage.setItem("pomodoro:taskView", v);
    } catch {
      // Persistence is optional; keep the in-memory view change.
    }
  };

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-[10px] tracking-[0.3em] uppercase text-muted-foreground font-light">
          <ListTodo className="h-3 w-3" />
          {project?.name ?? "Yapılacaklar Listesi"}
        </div>
        <div className="flex items-center gap-0.5 border border-border/60 rounded-sm p-0.5">
          <button
            onClick={() => setAndPersist("table")}
            title="Tablo"
            className={`flex items-center gap-1.5 px-2 py-1 rounded-sm text-[11px] tracking-wide transition-colors ${
              view === "table" ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <TableIcon className="h-3 w-3" />
            <span className="hidden sm:inline">表 Tablo</span>
          </button>
          <button
            onClick={() => setAndPersist("kanban")}
            title="Kanban"
            className={`flex items-center gap-1.5 px-2 py-1 rounded-sm text-[11px] tracking-wide transition-colors ${
              view === "kanban" ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <KanbanSquare className="h-3 w-3" />
            <span className="hidden sm:inline">看板 Kanban</span>
          </button>
        </div>
      </div>

      {!project ? (
        <div className="text-center text-xs text-muted-foreground py-6 border border-border/60 rounded-sm">
          Pomodoro çalışma alanı bulunamadı
        </div>
      ) : view === "table" ? (
        <TableView projectId={project.id} />
      ) : (
        <KanbanView projectId={project.id} />
      )}
    </section>
  );
};

export default PomodoroTaskBoard;
