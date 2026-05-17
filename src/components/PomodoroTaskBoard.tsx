import { useEffect, useState } from "react";
import { Table as TableIcon, KanbanSquare, ListTodo } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import TableView from "./TableView";
import KanbanView from "./KanbanView";

type ViewKind = "table" | "kanban";

const PomodoroTaskBoard = () => {
  const { user } = useAuth();
  const [projectId, setProjectId] = useState<string | null>(null);
  const [view, setView] = useState<ViewKind>(() => {
    const saved = typeof localStorage !== "undefined" ? localStorage.getItem("pomodoro:taskView") : null;
    return saved === "kanban" ? "kanban" : "table";
  });

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("projects")
        .select("id")
        .eq("user_id", user.id)
        .eq("is_default", true)
        .is("deleted_at", null)
        .maybeSingle();
      if (data) setProjectId(data.id);
    })();
  }, [user]);

  const setAndPersist = (v: ViewKind) => {
    setView(v);
    try { localStorage.setItem("pomodoro:taskView", v); } catch {}
  };

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-[10px] tracking-[0.3em] uppercase text-muted-foreground font-light">
          <ListTodo className="h-3 w-3" />
          Yapılacaklar Listesi
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

      {!projectId ? (
        <div className="text-center text-xs text-muted-foreground py-6 border border-border/60 rounded-sm">
          Yapılacaklar Listesi bulunamadı
        </div>
      ) : view === "table" ? (
        <TableView projectId={projectId} />
      ) : (
        <KanbanView projectId={projectId} />
      )}
    </section>
  );
};

export default PomodoroTaskBoard;
