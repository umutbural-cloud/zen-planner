import { Check, Pause, Play, SkipForward, Timer } from "lucide-react";
import { formatMMSS, usePomodoro } from "@/hooks/usePomodoro";
import type { HomePomodoroSummary, HomeSectionState } from "@/features/home/types";

type Props = {
  pomodoro: HomeSectionState<HomePomodoroSummary | null>;
};

const HomePomodoroPreview = ({ pomodoro }: Props) => {
  const {
    durationSec,
    remainingSec,
    phase,
    kind,
    start,
    pause,
    resume,
    complete,
    skipBreak,
    isLoading,
  } = usePomodoro();

  const progress = !isLoading && durationSec > 0 ? Math.max(0, Math.min(1, (durationSec - remainingSec) / durationSec)) : 0;
  const phaseLabel = isLoading ? "Yükleniyor" : kind === "break" ? "Mola" : "Çalışma";
  const stateLabel = isLoading ? "yükleniyor" : phase === "running" ? "aktif" : phase === "paused" ? "duraklatıldı" : "hazır";
  const primaryAction = phase === "paused" ? { label: "Devam Et", onClick: resume, icon: Play } : { label: "Başlat", onClick: start, icon: Play };
  const secondaryAction = kind === "break"
    ? { label: "Atla", onClick: skipBreak, icon: SkipForward }
    : { label: "Tamamla", onClick: complete, icon: Check };
  const PrimaryIcon = primaryAction.icon;
  const SecondaryIcon = secondaryAction.icon;
  const showPrimary = phase !== "running";
  const showPause = phase === "running";
  const showSecondary = kind === "break" || phase !== "idle";

  return (
    <section className="rounded-sm border border-border/60 bg-transparent overflow-hidden">
      <header className="flex items-center justify-between px-5 pt-5 pb-3">
        <div className="flex items-center gap-2">
          <Timer className="h-3.5 w-3.5 text-muted-foreground" />
          <h3 className="text-sm font-light tracking-wide">Pomodoro</h3>
        </div>
      </header>

      {pomodoro.status === "loading" && <div className="mx-5 mb-5 h-24 rounded-sm border border-border/60 bg-transparent animate-pulse" />}
      {pomodoro.status === "error" && <div className="px-5 pb-5 text-xs text-destructive">{pomodoro.error || "Pomodoro özeti yüklenemedi."}</div>}
      {(pomodoro.status === "empty" || !pomodoro.data) && <div className="px-5 pb-5 text-xs text-muted-foreground">Bugün pomodoro oturumu yok.</div>}
      {pomodoro.status === "ready" && pomodoro.data && (
        <div className="px-5 py-4 flex items-center gap-5">
          <div className="relative h-20 w-20 shrink-0">
            <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
              <circle cx="18" cy="18" r="15.5" fill="none" stroke="hsl(var(--muted))" strokeWidth="2" />
              <circle cx="18" cy="18" r="15.5" fill="none" stroke="url(#home-pomodoro-gradient)" strokeWidth="2" strokeLinecap="round" strokeDasharray={`${progress * 97.4} 97.4`} />
              <defs>
                <linearGradient id="home-pomodoro-gradient" x1="0" x2="1" y1="0" y2="1">
                  <stop offset="0%" stopColor="hsl(28 90% 60%)" />
                  <stop offset="100%" stopColor="hsl(42 90% 65%)" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-base font-light tabular-nums tracking-wider">{isLoading ? "--:--" : formatMMSS(remainingSec)}</span>
              <span className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground/70">{stateLabel}</span>
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-sm tracking-wide text-foreground">{phaseLabel}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {isLoading ? "Pomodoro durumu yükleniyor" : phase === "idle" ? `${phaseLabel} için hazır` : phase === "paused" ? `${phaseLabel} duraklatıldı` : `${phaseLabel} devam ediyor`}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              {isLoading ? (
                <button type="button" disabled className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm border border-border/70 text-xs text-muted-foreground/60 cursor-not-allowed">
                  Yükleniyor...
                </button>
              ) : showPrimary && (
                <button type="button" onClick={primaryAction.onClick} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm border border-border/70 text-xs text-foreground/90 hover:bg-accent/20 transition-colors">
                  <PrimaryIcon className="h-3 w-3" /> {primaryAction.label}
                </button>
              )}
              {!isLoading && showPause && (
                <button type="button" onClick={pause} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm border border-border/70 text-xs text-foreground/90 hover:bg-accent/20 transition-colors">
                  <Pause className="h-3 w-3" /> Duraklat
                </button>
              )}
              {!isLoading && showSecondary && (
                <button type="button" onClick={secondaryAction.onClick} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm border border-border/70 text-xs text-muted-foreground hover:bg-accent/20 hover:text-foreground transition-colors">
                  <SecondaryIcon className="h-3 w-3" /> {secondaryAction.label}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default HomePomodoroPreview;
