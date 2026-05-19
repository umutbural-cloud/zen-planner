import { createContext, useContext, useEffect, useRef, useState, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export type PomodoroPhase = "idle" | "running" | "paused";
export type PomodoroKind = "work" | "break";

type Ctx = {
  durationSec: number;
  remainingSec: number;
  phase: PomodoroPhase;
  kind: PomodoroKind;
  startedAt: Date | null;
  workDurationSec: number;     // user-configured work duration
  breakDurationSec: number;    // user-configured break duration
  setDuration: (sec: number) => void;
  start: () => void;
  pause: () => void;
  resume: () => void;
  complete: () => void;        // saves & moves to next phase
  reset: () => void;
  skipBreak: () => void;       // during a break, jump straight to work
};

type WakeLockSentinelLike = EventTarget & {
  released: boolean;
  release: () => Promise<void>;
};

type NavigatorWithWakeLock = Navigator & {
  wakeLock?: {
    request: (type: "screen") => Promise<WakeLockSentinelLike>;
  };
};

const PomodoroContext = createContext<Ctx | null>(null);

const DEFAULT_WORK = 25 * 60;
const DEFAULT_BREAK = 5 * 60;

function notify(title: string, body: string) {
  try {
    if (typeof Notification === "undefined") return;
    if (Notification.permission === "granted") {
      const n = new Notification(title, { body, icon: "/favicon.ico", tag: "keikaku-pomodoro" });
      n.onclick = () => { window.focus(); n.close(); };
    }
  } catch (error) {
    console.warn("[pomodoro] Notification failed", error);
  }
}

const getAudioContext = (() => {
  let ctx: AudioContext | null = null;
  return () => {
    const audioWindow = window as Window & { webkitAudioContext?: typeof AudioContext };
    const Ctor = globalThis.AudioContext || audioWindow.webkitAudioContext;
    if (!Ctor) return null;
    if (!ctx || ctx.state === "closed") {
      ctx = new Ctor();
    }
    return ctx;
  };
})();

async function unlockChime() {
  try {
    const ctx = getAudioContext();
    if (!ctx || ctx.state !== "suspended") return;
    await ctx.resume();
  } catch (error) {
    console.warn("[pomodoro] Audio unlock failed", error);
  }
}

function playChime() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === "suspended") {
      void ctx.resume().catch((error) => {
        console.warn("[pomodoro] Audio resume failed", error);
      });
    }
    const now = ctx.currentTime;
    const notes = [880, 1318.5, 1760];
    notes.forEach((freq, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = freq;
      const t = now + i * 0.18;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.25, t + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
      o.connect(g).connect(ctx.destination);
      o.start(t);
      o.stop(t + 0.65);
    });
  } catch (error) {
    console.warn("[pomodoro] Audio playback failed", error);
  }
}

export const PomodoroProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [workDurationSec, setWorkDurationSec] = useState(DEFAULT_WORK);
  const [breakDurationSec] = useState(DEFAULT_BREAK);
  const [durationSec, setDurationSec] = useState(DEFAULT_WORK);
  const [remainingSec, setRemainingSec] = useState(DEFAULT_WORK);
  const [phase, setPhase] = useState<PomodoroPhase>("idle");
  const [kind, setKind] = useState<PomodoroKind>("work");
  const [startedAt, setStartedAt] = useState<Date | null>(null);
  // Wall-clock based tracking — survives backgrounded tabs / OS throttling
  const [endsAt, setEndsAt] = useState<number | null>(null);   // ms epoch when current phase ends
  const intervalRef = useRef<number | null>(null);
  const finishTimeoutRef = useRef<number | null>(null);
  const finishingRef = useRef(false);
  const activeSessionIdRef = useRef(0);
  const completedSessionIdRef = useRef<number | null>(null);
  const wakeLockRef = useRef<WakeLockSentinelLike | null>(null);
  const wakeLockRequestRef = useRef<Promise<void> | null>(null);
  const wakeLockUnsupportedLoggedRef = useRef(false);

  // refs mirror state so timer callbacks see fresh values
  const phaseRef = useRef(phase);
  const kindRef = useRef(kind);
  const startedAtRef = useRef<Date | null>(null);
  const durationRef = useRef(durationSec);
  const workDurRef = useRef(workDurationSec);
  const breakDurRef = useRef(breakDurationSec);

  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { kindRef.current = kind; }, [kind]);
  useEffect(() => { startedAtRef.current = startedAt; }, [startedAt]);
  useEffect(() => { durationRef.current = durationSec; }, [durationSec]);
  useEffect(() => { workDurRef.current = workDurationSec; }, [workDurationSec]);
  useEffect(() => { breakDurRef.current = breakDurationSec; }, [breakDurationSec]);

  const clearTimer = () => {
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const clearFinishScheduler = () => {
    if (finishTimeoutRef.current) {
      window.clearTimeout(finishTimeoutRef.current);
      finishTimeoutRef.current = null;
    }
  };

  const releaseWakeLock = useCallback(() => {
    const wakeLock = wakeLockRef.current;
    wakeLockRef.current = null;
    wakeLockRequestRef.current = null;
    if (!wakeLock || wakeLock.released) return;
    void wakeLock.release().catch((error) => {
      console.warn("[pomodoro] Screen wake lock release failed", error);
    });
  }, []);

  const requestWakeLock = useCallback(() => {
    if (typeof navigator === "undefined") return;
    const wakeLockApi = (navigator as NavigatorWithWakeLock).wakeLock;
    if (!wakeLockApi) {
      if (!wakeLockUnsupportedLoggedRef.current) {
        console.info("[pomodoro] Screen Wake Lock API is not supported in this browser");
        wakeLockUnsupportedLoggedRef.current = true;
      }
      return;
    }
    if (wakeLockRef.current && !wakeLockRef.current.released) return;
    if (wakeLockRequestRef.current) return;

    wakeLockRequestRef.current = wakeLockApi.request("screen")
      .then((wakeLock) => {
        wakeLockRequestRef.current = null;
        if (phaseRef.current !== "running") {
          void wakeLock.release().catch((error) => {
            console.warn("[pomodoro] Screen wake lock release failed", error);
          });
          return;
        }
        wakeLockRef.current = wakeLock;
        wakeLock.addEventListener("release", () => {
          if (wakeLockRef.current === wakeLock) {
            wakeLockRef.current = null;
          }
          console.info("[pomodoro] Screen wake lock was released");
        }, { once: true });
      })
      .catch((error) => {
        wakeLockRequestRef.current = null;
        console.warn("[pomodoro] Screen wake lock request failed", error);
      });
  }, []);

  const persistSession = useCallback(async (k: PomodoroKind, started: Date, ended: Date, durationS: number) => {
    if (!user || durationS < 1) return;
    await supabase.from("pomodoro_sessions").insert({
      user_id: user.id,
      started_at: started.toISOString(),
      ended_at: ended.toISOString(),
      duration_seconds: durationS,
      kind: k,
    });
    window.dispatchEvent(new CustomEvent("pomodoro:session-saved"));
  }, [user]);

  // Phase finished naturally: save it, switch to the next phase but WAIT for user to start
  const handleAutoFinish = useCallback((sessionId: number) => {
    if (finishingRef.current) return;
    if (completedSessionIdRef.current === sessionId) return;
    if (activeSessionIdRef.current !== sessionId) return;
    finishingRef.current = true;
    completedSessionIdRef.current = sessionId;
    const finishedKind = kindRef.current;
    const dur = durationRef.current;
    const started = startedAtRef.current || new Date(Date.now() - dur * 1000);
    const ended = new Date(started.getTime() + dur * 1000);
    void persistSession(finishedKind, started, ended, dur).catch((error) => {
      console.warn("[pomodoro] Session persist failed", error);
    });
    playChime();

    if (finishedKind === "work") {
      toast.success("Pomodoro tamamlandı! Mola için başlat'a basın.");
      notify("Pomodoro tamamlandı 🍵", "Mola zamanı. Başlat'a basın.");
      setKind("break");
      setDurationSec(breakDurRef.current);
      setRemainingSec(breakDurRef.current);
    } else {
      toast.success("Mola bitti! Çalışma için başlat'a basın.");
      notify("Mola bitti ⛩", "Çalışma zamanı. Başlat'a basın.");
      setKind("work");
      setDurationSec(workDurRef.current);
      setRemainingSec(workDurRef.current);
    }
    setStartedAt(null);
    setEndsAt(null);
    endsAtRef.current = null;
    releaseWakeLock();
    setPhase("idle");
    setTimeout(() => { finishingRef.current = false; }, 50);
  }, [persistSession, releaseWakeLock]);

  // keep endsAt accessible to tick without re-binding interval
  const endsAtRef = useRef<number | null>(null);
  useEffect(() => { endsAtRef.current = endsAt; }, [endsAt]);

  const finishIfDue = useCallback(() => {
    if (phaseRef.current !== "running") return false;
    const ends = endsAtRef.current;
    if (ends == null || Date.now() < ends) return false;
    setRemainingSec(0);
    clearTimer();
    clearFinishScheduler();
    handleAutoFinish(activeSessionIdRef.current);
    return true;
  }, [handleAutoFinish]);

  const scheduleFinish = useCallback(() => {
    clearFinishScheduler();
    if (phaseRef.current !== "running") return;
    const ends = endsAtRef.current;
    if (ends == null) return;
    const delay = Math.max(0, ends - Date.now());
    finishTimeoutRef.current = window.setTimeout(() => {
      finishIfDue();
    }, delay);
  }, [finishIfDue]);

  // Tick: derive remaining from wall-clock difference (immune to setInterval throttling)
  const tick = useCallback(() => {
    if (phaseRef.current !== "running") return;
    const ends = endsAtRef.current;
    if (ends == null) return;
    const remaining = Math.max(0, Math.round((ends - Date.now()) / 1000));
    setRemainingSec(remaining);
    if (remaining <= 0) {
      finishIfDue();
    }
  }, [finishIfDue]);

  useEffect(() => {
    if (phase === "running") {
      clearTimer();
      tick(); // immediate sync (covers tab refocus)
      scheduleFinish();
      intervalRef.current = window.setInterval(tick, 500);
    } else {
      clearTimer();
      clearFinishScheduler();
    }
    return () => {
      clearTimer();
      clearFinishScheduler();
    };
  }, [phase, scheduleFinish, tick]);

  // Re-sync immediately when tab becomes visible again (handles background throttling/sleep)
  useEffect(() => {
    const syncIfActive = () => {
      if (phaseRef.current !== "running") return;
      if (!finishIfDue()) tick();
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        syncIfActive();
        if (phaseRef.current === "running") requestWakeLock();
      }
    };
    const onPageShow = () => {
      syncIfActive();
      if (phaseRef.current === "running") requestWakeLock();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", syncIfActive);
    window.addEventListener("pageshow", onPageShow);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", syncIfActive);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, [finishIfDue, requestWakeLock, tick]);

  useEffect(() => {
    if (phase === "running") {
      requestWakeLock();
    } else {
      releaseWakeLock();
    }
    return () => {
      releaseWakeLock();
    };
  }, [phase, releaseWakeLock, requestWakeLock]);

  useEffect(() => {
    const unlock = () => {
      void unlockChime();
    };
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  // Live tab title: "Zen 24:59 — Keikaku" while running, restore when idle
  useEffect(() => {
    const original = document.title;
    if (phase === "idle") return;
    const label = kind === "break" ? "Mola" : "Zen";
    const prefix = phase === "paused" ? "⏸ " : "";
    document.title = `${prefix}${label} ${formatMMSS(remainingSec)} — Keikaku`;
    return () => {
      document.title = original;
    };
  }, [phase, kind, remainingSec]);


  const setDuration = (sec: number) => {
    if (phase === "running" || phase === "paused") return;
    const v = Math.max(10, Math.min(sec, 180 * 60));
    if (kind === "work") setWorkDurationSec(v);
    setDurationSec(v);
    setRemainingSec(v);
  };

  const start = () => {
    if (phase === "running") return;
    const now = Date.now();
    const dur = kind === "break" ? breakDurationSec : workDurationSec;
    activeSessionIdRef.current += 1;
    completedSessionIdRef.current = null;
    setKind(kind === "break" ? "break" : "work");
    setDurationSec(dur);
    setRemainingSec(dur);
    setStartedAt(new Date(now));
    const nextEndsAt = now + dur * 1000;
    endsAtRef.current = nextEndsAt;
    setEndsAt(nextEndsAt);
    setPhase("running");
    void unlockChime();
    requestWakeLock();
  };

  const pause = () => {
    if (phase !== "running") return;
    // freeze remaining at current wall-clock value
    const ends = endsAtRef.current;
    if (ends != null) {
      const remaining = Math.max(0, Math.round((ends - Date.now()) / 1000));
      setRemainingSec(remaining);
    }
    clearFinishScheduler();
    releaseWakeLock();
    setPhase("paused");
  };

  const resume = () => {
    if (phase !== "paused") return;
    const now = Date.now();
    const nextEndsAt = now + remainingSec * 1000;
    endsAtRef.current = nextEndsAt;
    setEndsAt(nextEndsAt);
    setPhase("running");
    void unlockChime();
    requestWakeLock();
  };

  // Manual completion: save partial session, switch to next phase but DON'T auto-start
  const complete = () => {
    if (phase !== "running" && phase !== "paused") return;
    const ended = new Date();
    const started = startedAt || new Date(ended.getTime() - (durationSec - remainingSec) * 1000);
    const elapsedFromClock = Math.round((ended.getTime() - started.getTime()) / 1000);
    const elapsed = Math.min(Math.max(elapsedFromClock, 0), durationSec);
    if (elapsed >= 1) {
      void persistSession(kind, started, ended, elapsed).catch((error) => {
        console.warn("[pomodoro] Session persist failed", error);
      });
    }
    clearTimer();
    clearFinishScheduler();
    completedSessionIdRef.current = activeSessionIdRef.current;
    releaseWakeLock();
    playChime();

    if (kind === "work") {
      toast.success("Çalışma kaydedildi. Mola için başlat'a basın.");
      setKind("break");
      setDurationSec(breakDurationSec);
      setRemainingSec(breakDurationSec);
    } else {
      toast.success("Mola bitti.");
      setKind("work");
      setDurationSec(workDurationSec);
      setRemainingSec(workDurationSec);
    }
    setStartedAt(null);
    setEndsAt(null);
    endsAtRef.current = null;
    setPhase("idle");
  };

  const reset = () => {
    clearTimer();
    clearFinishScheduler();
    activeSessionIdRef.current += 1;
    completedSessionIdRef.current = null;
    releaseWakeLock();
    setPhase("idle");
    setStartedAt(null);
    setEndsAt(null);
    endsAtRef.current = null;
    setKind("work");
    setDurationSec(workDurationSec);
    setRemainingSec(workDurationSec);
  };

  const skipBreak = () => {
    if (kind !== "break") return;
    clearTimer();
    clearFinishScheduler();
    activeSessionIdRef.current += 1;
    completedSessionIdRef.current = null;
    releaseWakeLock();
    setKind("work");
    setDurationSec(workDurationSec);
    setRemainingSec(workDurationSec);
    setStartedAt(null);
    setEndsAt(null);
    endsAtRef.current = null;
    setPhase("idle");
    toast("Mola atlandı. Çalışma için başlat'a basın.");
  };

  return (
    <PomodoroContext.Provider
      value={{
        durationSec, remainingSec, phase, kind, startedAt,
        workDurationSec, breakDurationSec,
        setDuration, start, pause, resume, complete, reset, skipBreak,
      }}
    >
      {children}
    </PomodoroContext.Provider>
  );
};

export const usePomodoro = () => {
  const ctx = useContext(PomodoroContext);
  if (!ctx) throw new Error("usePomodoro must be used within PomodoroProvider");
  return ctx;
};

export const formatMMSS = (sec: number) => {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};
