import { Play, SkipForward, Timer } from "lucide-react";
import type { HomePomodoroSummary, HomeSectionState } from "@/features/home/types";

type Props = {
  pomodoro: HomeSectionState<HomePomodoroSummary | null>;
};

const HomePomodoroPreview = ({ pomodoro }: Props) => {
  return (
    <section className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm overflow-hidden">
      <header className="flex items-center justify-between px-5 pt-5 pb-3">
        <div className="flex items-center gap-2">
          <Timer className="h-3.5 w-3.5 text-muted-foreground" />
          <h3 className="text-sm font-light tracking-wide">Pomodoro</h3>
        </div>
        <span className="text-xs text-muted-foreground tabular-nums">
          {pomodoro.data ? `${pomodoro.data.completed} / ${pomodoro.data.goal} hedef` : "-"}
        </span>
      </header>

      {pomodoro.status === "loading" && <div className="mx-5 mb-5 h-24 rounded-xl bg-muted/40 animate-pulse" />}
      {pomodoro.status === "error" && <div className="px-5 pb-5 text-xs text-destructive">{pomodoro.error || "Pomodoro özeti yüklenemedi."}</div>}
      {(pomodoro.status === "empty" || !pomodoro.data) && <div className="px-5 pb-5 text-xs text-muted-foreground">Bugün pomodoro oturumu yok.</div>}
      {pomodoro.status === "ready" && pomodoro.data && (
        <div className="px-5 py-4 flex items-center gap-5">
          <div className="relative h-20 w-20 shrink-0">
            <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
              <circle cx="18" cy="18" r="15.5" fill="none" stroke="hsl(var(--muted))" strokeWidth="2" />
              <circle cx="18" cy="18" r="15.5" fill="none" stroke="url(#home-pomodoro-gradient)" strokeWidth="2" strokeLinecap="round" strokeDasharray={`${pomodoro.data.progress * 97.4} 97.4`} />
              <defs>
                <linearGradient id="home-pomodoro-gradient" x1="0" x2="1" y1="0" y2="1">
                  <stop offset="0%" stopColor="hsl(28 90% 60%)" />
                  <stop offset="100%" stopColor="hsl(42 90% 65%)" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-base font-light tabular-nums tracking-wider">{pomodoro.data.timerLabel}</span>
              <span className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground/70">aktif</span>
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-sm tracking-wide text-foreground truncate">{pomodoro.data.activeTaskTitle}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {pomodoro.data.completed} tamamlandı · {pomodoro.data.remainingLabel}
            </p>
            <div className="mt-3 flex items-center gap-1.5">
              <button type="button" className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-border/70 text-xs text-foreground/90 hover:bg-accent/40 transition-colors">
                <Play className="h-3 w-3" /> Durdur
              </button>
              <button type="button" className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-border/70 text-xs text-muted-foreground hover:bg-accent/40 hover:text-foreground transition-colors">
                <SkipForward className="h-3 w-3" /> Atla
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default HomePomodoroPreview;
