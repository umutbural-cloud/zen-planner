import { useEffect, useState } from "react";
import { ChevronDown, ChevronRight, CheckCircle2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { tr } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type DoneTask = {
  id: string;
  title: string;
  completed_at: string;
  project_id: string;
  projects?: { name: string; emoji: string } | null;
};

const JournalCompletedTasks = ({ date }: { date: string }) => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<DoneTask[]>([]);
  const [open, setOpen] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!user) return;
      setLoading(true);
      // Aralık: yerel günün başı ve sonu
      const start = new Date(`${date}T00:00:00`);
      const end = new Date(`${date}T23:59:59.999`);
      const { data } = await supabase
        .from("tasks")
        .select("id, title, completed_at, project_id, projects(name, emoji)")
        .eq("user_id", user.id)
        .eq("status", "done")
        .is("deleted_at", null)
        .not("completed_at", "is", null)
        .gte("completed_at", start.toISOString())
        .lte("completed_at", end.toISOString())
        .order("completed_at", { ascending: false });
      if (!active) return;
      setTasks((data as any) || []);
      setLoading(false);
    };
    load();
    return () => { active = false; };
  }, [user, date]);

  return (
    <div className="border border-border/60 rounded-sm overflow-hidden mt-8">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:bg-card/40 transition-colors"
      >
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        <CheckCircle2 className="h-3.5 w-3.5" />
        <span className="tracking-wide">Bugün tamamlananlar</span>
        <span className="text-muted-foreground/60">{tasks.length}</span>
      </button>
      {open && (
        <div className="divide-y divide-border/40">
          {loading ? (
            <div className="px-3 py-3 text-xs text-muted-foreground">読み込み中...</div>
          ) : tasks.length === 0 ? (
            <div className="px-3 py-4 text-xs text-muted-foreground text-center">
              <p>空 — Bu gün hiç görev tamamlanmadı</p>
            </div>
          ) : (
            tasks.map((t) => (
              <CompletedRow key={t.id} task={t} />
            ))
          )}
        </div>
      )}
    </div>
  );
};

const CompletedRow = ({ task }: { task: DoneTask }) => {
  const [expanded, setExpanded] = useState(false);
  return (
    <button
      onClick={() => setExpanded(!expanded)}
      className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-card/40 transition-colors"
    >
      <span className="text-sm font-light text-muted-foreground line-through flex-1 truncate">
        {task.title}
      </span>
      {expanded && task.projects && (
        <span className="text-[11px] text-muted-foreground/80 whitespace-nowrap">
          {task.projects.emoji} {task.projects.name}
        </span>
      )}
      {expanded && (
        <span className="text-[11px] text-muted-foreground/70 whitespace-nowrap font-light">
          {format(parseISO(task.completed_at), "HH:mm:ss", { locale: tr })}
        </span>
      )}
      {!expanded && (
        <span className="text-[11px] text-muted-foreground/50 whitespace-nowrap">
          {format(parseISO(task.completed_at), "HH:mm", { locale: tr })}
        </span>
      )}
    </button>
  );
};

export default JournalCompletedTasks;
