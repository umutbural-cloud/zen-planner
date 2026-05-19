import { useState } from "react";
import { Calendar as CalendarIcon, CheckCircle2, Circle, Clock, ListTodo, Loader2, TrendingUp } from "lucide-react";
import type { HomePlanTask, HomeSectionState, HomeStudySession } from "@/features/home/types";

type Props = {
  plan: HomeSectionState<HomePlanTask[]>;
  study: HomeSectionState<HomeStudySession[]>;
};

const TABS = [
  { id: "tasks", label: "Görevler", icon: ListTodo },
  { id: "doing", label: "Yapılıyor", icon: Loader2 },
  { id: "calendar", label: "Takvim", icon: CalendarIcon },
] as const;

type TabId = (typeof TABS)[number]["id"];

const HomePlanPreview = ({ plan, study }: Props) => {
  const [tab, setTab] = useState<TabId>("tasks");
  const completedCount = plan.data.filter((task) => task.done).length;
  const totalMinutes = study.data.reduce((sum, row) => sum + row.minutes, 0);
  const goal = 180;
  const pct = Math.min(100, Math.round((totalMinutes / goal) * 100));

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm overflow-hidden">
        <header className="flex items-center gap-1 px-2 pt-2 border-b border-border/60">
          {TABS.map((item) => {
            const Icon = item.icon;
            const active = tab === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`relative flex items-center gap-1.5 px-3 py-2 text-xs tracking-wide transition-colors ${
                  active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {item.label}
                {active && <span className="absolute left-2 right-2 -bottom-px h-px bg-foreground" />}
              </button>
            );
          })}
          <div className="ml-auto pr-2 text-[10px] text-muted-foreground tracking-wide">
            {completedCount} / {plan.data.length} tamamlandı
          </div>
        </header>

        <div className="p-2">
          {plan.status === "loading" && <div className="h-52 rounded-xl bg-muted/40 animate-pulse" />}
          {plan.status === "error" && <div className="px-4 py-10 text-center text-xs text-destructive">{plan.error || "Plan yüklenemedi."}</div>}
          {(plan.status === "empty" || plan.data.length === 0) && <div className="px-4 py-10 text-center text-xs text-muted-foreground">Bugün için plan yok.</div>}
          {plan.status === "ready" && tab === "tasks" && (
            <ul className="divide-y divide-border/50">
              {plan.data.map((task) => (
                <li
                  key={task.id}
                  className="group flex items-start gap-3 px-3 py-2.5 rounded-md hover:bg-accent/30 transition-colors cursor-pointer"
                >
                  {task.done ? (
                    <CheckCircle2 className="h-4 w-4 mt-0.5 text-emerald-500/80 shrink-0" />
                  ) : (
                    <Circle className="h-4 w-4 mt-0.5 text-muted-foreground/60 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm tracking-wide ${task.done ? "line-through text-muted-foreground/70" : "text-foreground"}`}>
                      {task.title}
                    </div>
                    {task.tag && <div className="mt-0.5 text-[10px] uppercase tracking-[0.14em] text-muted-foreground/70">{task.tag}</div>}
                  </div>
                </li>
              ))}
            </ul>
          )}
          {plan.status === "ready" && tab === "doing" && <div className="px-4 py-10 text-center text-xs text-muted-foreground tracking-wide">Şu anda yapılan görev yok.</div>}
          {plan.status === "ready" && tab === "calendar" && <div className="px-4 py-10 text-center text-xs text-muted-foreground tracking-wide">Bugünün takvim görünümü burada.</div>}
        </div>
      </section>

      <section className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm overflow-hidden">
        <header className="flex items-center justify-between px-5 pt-5 pb-3">
          <div className="flex items-center gap-2">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            <h3 className="text-sm font-light tracking-wide">Çalışma Süresi</h3>
          </div>
          <span className="text-xs text-muted-foreground tabular-nums">
            {Math.floor(totalMinutes / 60)} sa {totalMinutes % 60} dk
          </span>
        </header>

        {study.status === "loading" ? (
          <div className="mx-5 mb-5 h-28 rounded-xl bg-muted/40 animate-pulse" />
        ) : study.status === "error" ? (
          <div className="px-5 pb-5 text-xs text-destructive">{study.error || "Çalışma süresi yüklenemedi."}</div>
        ) : study.status === "empty" || study.data.length === 0 ? (
          <div className="px-5 pb-5 text-xs text-muted-foreground">Bugün çalışma oturumu yok.</div>
        ) : (
          <>
            <div className="px-5">
              <div className="h-1.5 rounded-full bg-muted/60 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-orange-400/80 to-amber-300/70" style={{ width: `${pct}%` }} />
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground tracking-wide">
                Günlük hedefin %{pct}'i · Şu an: <span className="text-foreground">{study.data[study.data.length - 1]?.label}</span>
              </p>
            </div>
            <div className="mt-4 border-t border-border/60">
              <div className="px-2 py-1.5">
                <div className="flex items-center gap-2 px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70">
                  <TrendingUp className="h-3 w-3" />
                  Bugünkü oturumlar
                </div>
                <ul className="divide-y divide-border/40">
                  {study.data.map((row) => (
                    <li key={row.id} className="flex items-center justify-between px-3 py-2 rounded-md hover:bg-accent/30 transition-colors">
                      <span className="text-sm tracking-wide text-foreground/90">{row.label}</span>
                      <span className="text-xs tabular-nums text-muted-foreground">{row.minutes} dk</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
};

export default HomePlanPreview;
