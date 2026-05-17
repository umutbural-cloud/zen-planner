import { useEffect, useState } from "react";
import { Check, ListTodo } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type Task = {
  id: string;
  title: string;
  status: string;
  position: number;
};

const PomodoroTaskList = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projectId, setProjectId] = useState<string | null>(null);

  const load = async () => {
    if (!user) return;
    const { data: proj } = await supabase
      .from("projects")
      .select("id")
      .eq("user_id", user.id)
      .eq("is_default", true)
      .is("deleted_at", null)
      .maybeSingle();
    if (!proj) return;
    setProjectId(proj.id);
    const { data } = await supabase
      .from("tasks")
      .select("id,title,status,position")
      .eq("project_id", proj.id)
      .is("deleted_at", null)
      .order("position", { ascending: true });
    setTasks((data as Task[]) || []);
  };

  useEffect(() => { load(); }, [user]);

  const toggle = async (t: Task) => {
    const next = t.status === "done" ? "todo" : "done";
    setTasks((prev) => prev.map((x) => (x.id === t.id ? { ...x, status: next } : x)));
    await supabase.from("tasks").update({ status: next as any }).eq("id", t.id);
  };

  const active = tasks.filter((t) => t.status !== "done");
  const done = tasks.filter((t) => t.status === "done");

  return (
    <section>
      <div className="flex items-center gap-2 text-[10px] tracking-[0.3em] uppercase text-muted-foreground font-light mb-4">
        <ListTodo className="h-3 w-3" />
        Yapılacaklar
      </div>
      {tasks.length === 0 ? (
        <div className="text-center text-xs text-muted-foreground py-6 border border-border/60 rounded-sm">
          Yapılacaklar Listesi'nde görev yok
        </div>
      ) : (
        <div className="border border-border/60 rounded-sm overflow-hidden divide-y divide-border/40">
          {active.map((t) => (
            <button
              key={t.id}
              onClick={() => toggle(t)}
              className="w-full flex items-center gap-3 px-3 py-2 text-left text-sm font-light hover:bg-accent/40 transition-colors group"
            >
              <span className="h-4 w-4 rounded-sm border border-border/80 flex items-center justify-center flex-shrink-0 group-hover:border-foreground/60" />
              <span className="break-words">{t.title}</span>
            </button>
          ))}
          {done.map((t) => (
            <button
              key={t.id}
              onClick={() => toggle(t)}
              className="w-full flex items-center gap-3 px-3 py-2 text-left text-sm font-light hover:bg-accent/40 transition-colors text-muted-foreground"
            >
              <span className="h-4 w-4 rounded-sm border border-border/80 bg-foreground/10 flex items-center justify-center flex-shrink-0">
                <Check className="h-3 w-3" />
              </span>
              <span className="line-through break-words">{t.title}</span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
};

export default PomodoroTaskList;
