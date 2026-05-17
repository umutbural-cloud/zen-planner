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
  } catch {}
}

function playChime() {
  try {
    const Ctor = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!Ctor) return;
    const ctx = new Ctor();
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
    setTimeout(() => ctx.close(), 1500);
  } catch {}
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
  const finishingRef = useRef(false);

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
  const handleAutoFinish = useCallback(() => {
    if (finishingRef.current) return;
    finishingRef.current = true;
    const finishedKind = kindRef.current;
    const dur = durationRef.current;
    const started = startedAtRef.current || new Date(Date.now() - dur * 1000);
    const ended = new Date(started.getTime() + dur * 1000);
    persistSession(finishedKind, started, ended, dur);
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
    setPhase("idle");
    setTimeout(() => { finishingRef.current = false; }, 50);
  }, [persistSession]);

  // keep endsAt accessible to tick without re-binding interval
  const endsAtRef = useRef<number | null>(null);
  useEffect(() => { endsAtRef.current = endsAt; }, [endsAt]);

  // Tick: derive remaining from wall-clock difference (immune to setInterval throttling)
  const tick = useCallback(() => {
    if (phaseRef.current !== "running") return;
    const ends = endsAtRef.current;
    if (ends == null) return;
    const remaining = Math.max(0, Math.round((ends - Date.now()) / 1000));
    setRemainingSec(remaining);
    if (remaining <= 0) {
      clearTimer();
      handleAutoFinish();
    }
  }, [handleAutoFinish]);

  useEffect(() => {
    if (phase === "running") {
      clearTimer();
      tick(); // immediate sync (covers tab refocus)
      intervalRef.current = window.setInterval(tick, 500);
    } else {
      clearTimer();
    }
    return clearTimer;
  }, [phase, tick]);

  // Re-sync immediately when tab becomes visible again (handles background throttling/sleep)
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible" && phaseRef.current === "running") {
        tick();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [tick]);

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
    setKind(kind === "break" ? "break" : "work");
    setDurationSec(dur);
    setRemainingSec(dur);
    setStartedAt(new Date(now));
    setEndsAt(now + dur * 1000);
    setPhase("running");
  };

  const pause = () => {
    if (phase !== "running") return;
    // freeze remaining at current wall-clock value
    const ends = endsAtRef.current;
    if (ends != null) {
      const remaining = Math.max(0, Math.round((ends - Date.now()) / 1000));
      setRemainingSec(remaining);
    }
    setPhase("paused");
  };

  const resume = () => {
    if (phase !== "paused") return;
    const now = Date.now();
    setEndsAt(now + remainingSec * 1000);
    setPhase("running");
  };

  // Manual completion: save partial session, switch to next phase but DON'T auto-start
  const complete = () => {
    if (phase !== "running" && phase !== "paused") return;
    const ended = new Date();
    const started = startedAt || new Date(ended.getTime() - (durationSec - remainingSec) * 1000);
    const elapsedFromClock = Math.round((ended.getTime() - started.getTime()) / 1000);
    const elapsed = Math.min(Math.max(elapsedFromClock, 0), durationSec);
    if (elapsed >= 1) {
      persistSession(kind, started, ended, elapsed);
    }
    clearTimer();
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
    setPhase("idle");
  };

  const reset = () => {
    clearTimer();
    setPhase("idle");
    setStartedAt(null);
    setEndsAt(null);
    setKind("work");
    setDurationSec(workDurationSec);
    setRemainingSec(workDurationSec);
  };

  const skipBreak = () => {
    if (kind !== "break") return;
    clearTimer();
    setKind("work");
    setDurationSec(workDurationSec);
    setRemainingSec(workDurationSec);
    setStartedAt(null);
    setEndsAt(null);
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
