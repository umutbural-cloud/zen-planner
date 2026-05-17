import { useEffect, useState } from "react";
import { Clock, Play, Pause, Check, RotateCcw, SkipForward } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { usePomodoro, formatMMSS } from "@/hooks/usePomodoro";

const PomodoroSidebarWidget = () => {
  const navigate = useNavigate();
  const { remainingSec, phase, kind, setDuration, start, pause, resume, complete, reset, skipBreak } = usePomodoro();

  const isRunning = phase === "running";
  const isPaused = phase === "paused";
  const isIdle = phase === "idle";
  const isBreak = kind === "break";

  const [editing, setEditing] = useState(false);
  const [editVal, setEditVal] = useState(formatMMSS(remainingSec));

  useEffect(() => {
    if (!editing) setEditVal(formatMMSS(remainingSec));
  }, [remainingSec, editing]);

  const commit = () => {
    const m = editVal.match(/^(\d{1,3}):?(\d{0,2})$/);
    if (m) {
      const mins = parseInt(m[1] || "0", 10);
      const secs = parseInt(m[2] || "0", 10);
      const total = mins * 60 + secs;
      if (total > 0) setDuration(total);
    }
    setEditing(false);
  };

  return (
    <>
      <div className="px-2 py-1.5">
        <div
          onClick={() => navigate("/pomodoro")}
          className="cursor-pointer rounded-sm hover:bg-accent/40 transition-colors px-2 py-2"
        >
          <div className="flex items-center gap-2 mb-1.5">
            <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="text-sm font-light tracking-wide">Pomodoro</span>
            {isBreak && phase !== "idle" && (
              <span className="text-[9px] text-muted-foreground uppercase tracking-wider">mola</span>
            )}
          </div>

          <div className="flex items-center justify-between gap-2">
            {editing && isIdle ? (
              <input
                value={editVal}
                onChange={(e) => setEditVal(e.target.value)}
                onBlur={commit}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commit();
                  if (e.key === "Escape") { setEditVal(formatMMSS(remainingSec)); setEditing(false); }
                }}
                onClick={(e) => e.stopPropagation()}
                autoFocus
                className="w-20 bg-transparent border border-border/60 rounded-sm px-1.5 py-0.5 text-xl font-extralight tabular-nums tracking-wider text-foreground outline-none focus:border-foreground/40"
              />
            ) : (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (isIdle) { setEditVal(formatMMSS(remainingSec)); setEditing(true); }
                }}
                title={isIdle ? "Süreyi düzenle" : ""}
                className={`text-xl font-extralight tabular-nums tracking-wider ${isIdle ? "hover:text-foreground/80 cursor-text" : "cursor-default"}`}
              >
                {formatMMSS(remainingSec)}
              </button>
            )}

            <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
              {isRunning ? (
                <>
                  <button onClick={pause} title="Duraklat" className="p-1 rounded-sm hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
                    <Pause className="h-3.5 w-3.5" />
                  </button>
                  {isBreak ? (
                    <button onClick={skipBreak} title="Molayı atla" className="p-1 rounded-sm hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
                      <SkipForward className="h-3.5 w-3.5" />
                    </button>
                  ) : (
                    <button onClick={complete} title="Tamamla" className="p-1 rounded-sm hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
                      <Check className="h-3.5 w-3.5" />
                    </button>
                  )}
                </>
              ) : isPaused ? (
                <>
                  <button onClick={resume} title="Devam" className="p-1 rounded-sm hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
                    <Play className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={complete} title="Tamamla" className="p-1 rounded-sm hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
                    <Check className="h-3.5 w-3.5" />
                  </button>
                </>
              ) : (
                <>
                  <button onClick={start} title="Başlat" className="p-1 rounded-sm hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
                    <Play className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={reset} title="Sıfırla" className="p-1 rounded-sm hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
                    <RotateCcw className="h-3.5 w-3.5" />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="mx-3 border-t border-border/60" />
    </>
  );
};

export default PomodoroSidebarWidget;
