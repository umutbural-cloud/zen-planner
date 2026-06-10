import { createContext, useContext, useEffect, useRef, useState, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
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
  workDurationSec: number;
  breakDurationSec: number;
  setDuration: (sec: number) => void;
  start: () => void;
  pause: () => void;
  resume: () => void;
  complete: () => void;
  reset: () => void;
  skipBreak: () => void;
  isLoading: boolean;
  isSyncing: boolean;
  syncError: string | null;
  lastSyncedAt: Date | null;
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

type ActiveStateRow = Database["public"]["Tables"]["pomodoro_active_state"]["Row"];
type ActiveStateInsert = Database["public"]["Tables"]["pomodoro_active_state"]["Insert"];
type PomodoroSessionInsert = Database["public"]["Tables"]["pomodoro_sessions"]["Insert"];
type ApplyActiveStateOptions = {
  resetOnNull?: boolean;
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

const isExpectedAudioUnlockError = (error: unknown) => {
  if (!(error instanceof DOMException)) return false;
  return error.name === "NotAllowedError" || error.name === "InvalidStateError";
};

const canAttemptAudioUnlock = () => {
  if (typeof document === "undefined") return false;
  return document.visibilityState === "visible";
};

async function unlockChime() {
  try {
    if (!canAttemptAudioUnlock()) return;
    const ctx = getAudioContext();
    if (!ctx || ctx.state !== "suspended") return;
    await ctx.resume();
  } catch (error) {
    if (!isExpectedAudioUnlockError(error)) {
      console.warn("[pomodoro] Audio unlock failed", error);
    }
  }
}

function primeChimeFromUserGesture() {
  void unlockChime();
}

function playChime() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === "suspended") {
      void ctx.resume()
        .then(() => {
          if (ctx.state === "running") {
            playChime();
          }
        })
        .catch((error) => {
          if (!isExpectedAudioUnlockError(error)) {
            console.warn("[pomodoro] Audio resume failed", error);
          }
        });
      return;
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

const isDuplicateError = (error: { code?: string; message?: string }) =>
  error.code === "23505" || /duplicate|unique/i.test(error.message || "");

function createPomodoroSessionToken() {
  const cryptoApi = globalThis.crypto;

  if (cryptoApi?.randomUUID) {
    return cryptoApi.randomUUID();
  }

  if (cryptoApi?.getRandomValues) {
    const bytes = new Uint8Array(16);
    cryptoApi.getRandomValues(bytes);

    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;

    const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");

    return [
      hex.slice(0, 8),
      hex.slice(8, 12),
      hex.slice(12, 16),
      hex.slice(16, 20),
      hex.slice(20),
    ].join("-");
  }

  const timestamp = Date.now().toString(16).padStart(12, "0").slice(-12);
  const random = Math.floor(Math.random() * 0xffffffffffff).toString(16).padStart(12, "0").slice(-12);

  return `00000000-0000-4000-8000-${timestamp.slice(0, 6)}${random.slice(0, 6)}`;
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
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [pausedRemainingSec, setPausedRemainingSec] = useState<number | null>(null);
  const [accumulatedElapsedSec, setAccumulatedElapsedSec] = useState(0);
  const [activeSessionToken, setActiveSessionToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

  const intervalRef = useRef<number | null>(null);
  const finishTimeoutRef = useRef<number | null>(null);
  const finishingRef = useRef(false);
  const activeSessionIdRef = useRef(0);
  const completedSessionIdRef = useRef<number | null>(null);
  const clockOffsetMsRef = useRef(0);
  const hydratingRef = useRef(false);
  const wakeLockRef = useRef<WakeLockSentinelLike | null>(null);
  const wakeLockRequestRef = useRef<Promise<void> | null>(null);
  const wakeLockUnsupportedLoggedRef = useRef(false);
  const hydratedUserIdRef = useRef<string | null>(null);

  const phaseRef = useRef(phase);
  const kindRef = useRef(kind);
  const startedAtRef = useRef<Date | null>(startedAt);
  const durationRef = useRef(durationSec);
  const workDurRef = useRef(workDurationSec);
  const breakDurRef = useRef(breakDurationSec);
  const endsAtRef = useRef<number | null>(endsAt);
  const pausedRemainingRef = useRef<number | null>(pausedRemainingSec);
  const accumulatedElapsedRef = useRef(accumulatedElapsedSec);
  const activeTokenRef = useRef<string | null>(activeSessionToken);

  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { kindRef.current = kind; }, [kind]);
  useEffect(() => { startedAtRef.current = startedAt; }, [startedAt]);
  useEffect(() => { durationRef.current = durationSec; }, [durationSec]);
  useEffect(() => { workDurRef.current = workDurationSec; }, [workDurationSec]);
  useEffect(() => { breakDurRef.current = breakDurationSec; }, [breakDurationSec]);
  useEffect(() => { endsAtRef.current = endsAt; }, [endsAt]);
  useEffect(() => { pausedRemainingRef.current = pausedRemainingSec; }, [pausedRemainingSec]);
  useEffect(() => { accumulatedElapsedRef.current = accumulatedElapsedSec; }, [accumulatedElapsedSec]);
  useEffect(() => { activeTokenRef.current = activeSessionToken; }, [activeSessionToken]);

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

  const adjustedNow = useCallback(() => Date.now() + clockOffsetMsRef.current, []);

  const resetLocalState = useCallback(() => {
    clearTimer();
    clearFinishScheduler();
    activeSessionIdRef.current += 1;
    completedSessionIdRef.current = null;
    finishingRef.current = false;
    releaseWakeLock();
    setPhase("idle");
    setKind("work");
    setDurationSec(DEFAULT_WORK);
    setRemainingSec(DEFAULT_WORK);
    setWorkDurationSec(DEFAULT_WORK);
    setStartedAt(null);
    setEndsAt(null);
    endsAtRef.current = null;
    setPausedRemainingSec(null);
    setAccumulatedElapsedSec(0);
    setActiveSessionToken(null);
  }, [releaseWakeLock]);

  const syncServerClock = useCallback(async () => {
    const before = Date.now();
    const { data, error } = await supabase.rpc("get_server_time");
    if (error || !data) {
      clockOffsetMsRef.current = 0;
      console.warn("[pomodoro] Server time sync failed", error);
      return;
    }
    const after = Date.now();
    const serverMs = new Date(data).getTime();
    const midpoint = before + (after - before) / 2;
    clockOffsetMsRef.current = serverMs - midpoint;
  }, []);

  const currentRunElapsed = useCallback((row: ActiveStateRow, nowMs: number) => {
    if (row.phase !== "running" || !row.started_at) return 0;
    return Math.max(0, Math.round((nowMs - new Date(row.started_at).getTime()) / 1000));
  }, []);

  const applyActiveState = useCallback((row: ActiveStateRow | null, options?: ApplyActiveStateOptions) => {
    const resetOnNull = options?.resetOnNull ?? true;

    if (!row) {
      if (resetOnNull) {
        resetLocalState();
      }
      setLastSyncedAt(new Date());
      setIsLoading(false);
      return;
    }

    const nextEndsAt = row.ends_at ? new Date(row.ends_at).getTime() : null;
    const nowMs = adjustedNow();
    const nextRemaining = row.phase === "running" && nextEndsAt != null
      ? Math.max(0, Math.round((nextEndsAt - nowMs) / 1000))
      : row.phase === "paused"
        ? row.paused_remaining_seconds ?? Math.max(0, row.duration_seconds - row.accumulated_elapsed_seconds)
        : row.duration_seconds;

    setKind(row.kind);
    setPhase(row.phase as PomodoroPhase);
    setWorkDurationSec(row.work_duration_seconds);
    setDurationSec(row.duration_seconds);
    setRemainingSec(nextRemaining);
    setStartedAt(row.started_at ? new Date(row.started_at) : null);
    setEndsAt(nextEndsAt);
    endsAtRef.current = nextEndsAt;
    setPausedRemainingSec(row.paused_remaining_seconds);
    setAccumulatedElapsedSec(row.accumulated_elapsed_seconds);
    setActiveSessionToken(row.active_session_token);
    setLastSyncedAt(new Date());
    setIsLoading(false);
  }, [adjustedNow, resetLocalState]);

  const writeActiveState = useCallback(async (payload: ActiveStateInsert) => {
    const { data, error } = await supabase
      .from("pomodoro_active_state")
      .upsert(payload, { onConflict: "user_id" })
      .select()
      .single();
    if (error) throw error;
    applyActiveState(data);
    return data;
  }, [applyActiveState]);

  const persistSession = useCallback(async (
    k: PomodoroKind,
    started: Date,
    ended: Date,
    durationS: number,
    token: string | null,
  ) => {
    if (!user || durationS < 1) return;
    const payload: PomodoroSessionInsert = {
      user_id: user.id,
      started_at: started.toISOString(),
      ended_at: ended.toISOString(),
      duration_seconds: durationS,
      kind: k,
      active_session_token: token,
    };
    const { error } = await supabase.from("pomodoro_sessions").insert(payload);
    if (error) {
      if (!isDuplicateError(error)) throw error;
      console.info("[pomodoro] Session was already saved for this active token");
    }
    window.dispatchEvent(new CustomEvent("pomodoro:session-saved"));
  }, [user]);

  const nextIdlePayload = useCallback((
    userId: string,
    finishedKind: PomodoroKind,
    workDuration: number,
    breakDuration: number,
  ): ActiveStateInsert => {
    const nextKind: PomodoroKind = finishedKind === "work" ? "break" : "work";
    const nextDuration = nextKind === "break" ? breakDuration : workDuration;
    return {
      user_id: userId,
      phase: "idle",
      kind: nextKind,
      duration_seconds: nextDuration,
      work_duration_seconds: workDuration,
      break_duration_seconds: breakDuration,
      started_at: null,
      ends_at: null,
      paused_remaining_seconds: null,
      accumulated_elapsed_seconds: 0,
      active_session_token: null,
    };
  }, []);

  const finalizeRow = useCallback(async (row: ActiveStateRow, options: { notifyUser: boolean; endedAt?: Date }) => {
    if (!user || finishingRef.current) return;
    finishingRef.current = true;
    try {
      const nowMs = adjustedNow();
      const runElapsed = row.phase === "running" ? currentRunElapsed(row, nowMs) : 0;
      const elapsed = Math.min(Math.max(row.accumulated_elapsed_seconds + runElapsed, 0), row.duration_seconds);
      const ended = options.endedAt ?? new Date(row.phase === "running" && row.ends_at ? new Date(row.ends_at).getTime() : nowMs);
      const started = row.started_at
        ? new Date(row.started_at)
        : new Date(ended.getTime() - elapsed * 1000);

      if (elapsed >= 1) {
        await persistSession(row.kind, started, ended, elapsed, row.active_session_token);
      }

      await writeActiveState(nextIdlePayload(user.id, row.kind, row.work_duration_seconds, row.break_duration_seconds));

      if (options.notifyUser) {
        playChime();
        if (row.kind === "work") {
          toast.success("Pomodoro tamamlandı! Mola için başlat'a basın.");
          notify("Pomodoro tamamlandı 🍵", "Mola zamanı. Başlat'a basın.");
        } else {
          toast.success("Mola bitti! Çalışma için başlat'a basın.");
          notify("Mola bitti ⛩", "Çalışma zamanı. Başlat'a basın.");
        }
      }
    } catch (error) {
      console.warn("[pomodoro] Finish sync failed", error);
      setSyncError("Pomodoro tamamlanamadı. Bağlantınızı kontrol edin.");
      toast.error("Pomodoro tamamlanamadı. Bağlantınızı kontrol edin.");
    } finally {
      releaseWakeLock();
      setTimeout(() => { finishingRef.current = false; }, 50);
    }
  }, [adjustedNow, currentRunElapsed, nextIdlePayload, persistSession, releaseWakeLock, user, writeActiveState]);

  const fetchActiveState = useCallback(async (source: "load" | "revalidate" = "revalidate") => {
    if (!user || hydratingRef.current) return;
    hydratingRef.current = true;
    if (source === "load") setIsLoading(true);
    setSyncError(null);
    try {
      await syncServerClock();
      const { data, error } = await supabase
        .from("pomodoro_active_state")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      if (data?.phase === "running" && data.ends_at && new Date(data.ends_at).getTime() <= adjustedNow()) {
        await finalizeRow(data, { notifyUser: false });
      } else {
        applyActiveState(data, { resetOnNull: source === "load" });
      }
    } catch (error) {
      console.warn("[pomodoro] Active state sync failed", error);
      setSyncError("Pomodoro durumu senkronize edilemedi.");
      if (source === "load") setIsLoading(false);
    } finally {
      hydratingRef.current = false;
    }
  }, [adjustedNow, applyActiveState, finalizeRow, syncServerClock, user]);

  const finishIfDue = useCallback(() => {
    if (phaseRef.current !== "running") return false;
    const ends = endsAtRef.current;
    if (ends == null || adjustedNow() < ends) return false;
    setRemainingSec(0);
    clearTimer();
    clearFinishScheduler();
    const row: ActiveStateRow = {
      user_id: user?.id || "",
      phase: "running",
      kind: kindRef.current,
      duration_seconds: durationRef.current,
      work_duration_seconds: workDurRef.current,
      break_duration_seconds: breakDurRef.current,
      started_at: startedAtRef.current?.toISOString() || null,
      ends_at: new Date(ends).toISOString(),
      paused_remaining_seconds: null,
      accumulated_elapsed_seconds: accumulatedElapsedRef.current,
      active_session_token: activeTokenRef.current,
      updated_at: new Date().toISOString(),
    };
    void finalizeRow(row, { notifyUser: true });
    return true;
  }, [adjustedNow, finalizeRow, user]);

  const scheduleFinish = useCallback(() => {
    clearFinishScheduler();
    if (phaseRef.current !== "running") return;
    const ends = endsAtRef.current;
    if (ends == null) return;
    const delay = Math.max(0, ends - adjustedNow());
    finishTimeoutRef.current = window.setTimeout(() => {
      finishIfDue();
    }, delay);
  }, [adjustedNow, finishIfDue]);

  const tick = useCallback(() => {
    if (phaseRef.current !== "running") return;
    const ends = endsAtRef.current;
    if (ends == null) return;
    const remaining = Math.max(0, Math.round((ends - adjustedNow()) / 1000));
    setRemainingSec(remaining);
    if (remaining <= 0) {
      finishIfDue();
    }
  }, [adjustedNow, finishIfDue]);

  useEffect(() => {
    if (phase === "running") {
      clearTimer();
      tick();
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

  useEffect(() => {
    const syncVisibleState = () => {
      if (!finishIfDue()) tick();
      void fetchActiveState("revalidate");
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        syncVisibleState();
        if (phaseRef.current === "running") requestWakeLock();
      }
    };
    const onPageShow = () => {
      syncVisibleState();
      if (phaseRef.current === "running") requestWakeLock();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", syncVisibleState);
    window.addEventListener("pageshow", onPageShow);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", syncVisibleState);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, [fetchActiveState, finishIfDue, requestWakeLock, tick]);

  useEffect(() => {
    setSyncError(null);
    const userId = user?.id ?? null;

    if (!userId) {
      hydratedUserIdRef.current = null;
      resetLocalState();
      setIsLoading(false);
      return;
    }

    if (hydratedUserIdRef.current === userId) {
      void fetchActiveState("revalidate");
      return;
    }

    hydratedUserIdRef.current = userId;
    setIsLoading(true);
    resetLocalState();
    void fetchActiveState("load");
  }, [fetchActiveState, resetLocalState, user?.id]);

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
    const original = document.title;
    if (phase === "idle") return;
    const label = kind === "break" ? "Mola" : "Zen";
    const prefix = phase === "paused" ? "⏸ " : "";
    document.title = `${prefix}${label} ${formatMMSS(remainingSec)} — Zen Planner`;
    return () => {
      document.title = original;
    };
  }, [phase, kind, remainingSec]);

  const blockIfBusy = useCallback(() => {
    if (isLoading || isSyncing) {
      toast("Pomodoro senkronizasyonu bekleniyor.");
      return true;
    }
    if (!user) {
      toast.error("Pomodoro için oturum gerekli.");
      return true;
    }
    return false;
  }, [isLoading, isSyncing, user]);

  const withSync = useCallback(async (fn: () => Promise<void>) => {
    if (blockIfBusy()) return;
    setIsSyncing(true);
    setSyncError(null);
    try {
      await syncServerClock();
      await fn();
      setLastSyncedAt(new Date());
    } catch (error) {
      console.warn("[pomodoro] Active state write failed", error);
      setSyncError("Pomodoro durumu kaydedilemedi.");
      toast.error("Pomodoro durumu kaydedilemedi. Bağlantınızı kontrol edin.");
      await fetchActiveState("revalidate");
    } finally {
      setIsSyncing(false);
    }
  }, [blockIfBusy, fetchActiveState, syncServerClock]);

  const setDuration = (sec: number) => {
    if (phase === "running" || phase === "paused") return;
    const v = Math.max(10, Math.min(sec, 180 * 60));
    void withSync(async () => {
      if (!user) return;
      const nextWorkDuration = kind === "work" ? v : workDurationSec;
      await writeActiveState({
        user_id: user.id,
        phase: "idle",
        kind,
        duration_seconds: kind === "work" ? v : durationSec,
        work_duration_seconds: nextWorkDuration,
        break_duration_seconds: breakDurationSec,
        started_at: null,
        ends_at: null,
        paused_remaining_seconds: null,
        accumulated_elapsed_seconds: 0,
        active_session_token: null,
      });
    });
  };

  const start = () => {
    if (phase === "running") return;
    primeChimeFromUserGesture();
    void withSync(async () => {
      if (!user) return;
      const now = adjustedNow();
      const dur = kind === "break" ? breakDurationSec : workDurationSec;
      await writeActiveState({
        user_id: user.id,
        phase: "running",
        kind,
        duration_seconds: dur,
        work_duration_seconds: workDurationSec,
        break_duration_seconds: breakDurationSec,
        started_at: new Date(now).toISOString(),
        ends_at: new Date(now + dur * 1000).toISOString(),
        paused_remaining_seconds: null,
        accumulated_elapsed_seconds: 0,
        active_session_token: createPomodoroSessionToken(),
      });
      activeSessionIdRef.current += 1;
      completedSessionIdRef.current = null;
      requestWakeLock();
    });
  };

  const pause = () => {
    if (phase !== "running") return;
    void withSync(async () => {
      if (!user || !startedAt) return;
      const now = adjustedNow();
      const runElapsed = Math.max(0, Math.round((now - startedAt.getTime()) / 1000));
      const nextAccumulated = Math.min(durationSec, accumulatedElapsedSec + runElapsed);
      const pausedRemaining = Math.max(0, durationSec - nextAccumulated);
      await writeActiveState({
        user_id: user.id,
        phase: "paused",
        kind,
        duration_seconds: durationSec,
        work_duration_seconds: workDurationSec,
        break_duration_seconds: breakDurationSec,
        started_at: startedAt.toISOString(),
        ends_at: null,
        paused_remaining_seconds: pausedRemaining,
        accumulated_elapsed_seconds: nextAccumulated,
        active_session_token: activeSessionToken,
      });
      clearFinishScheduler();
      releaseWakeLock();
    });
  };

  const resume = () => {
    if (phase !== "paused" || pausedRemainingSec == null) return;
    primeChimeFromUserGesture();
    void withSync(async () => {
      if (!user) return;
      const now = adjustedNow();
      await writeActiveState({
        user_id: user.id,
        phase: "running",
        kind,
        duration_seconds: durationSec,
        work_duration_seconds: workDurationSec,
        break_duration_seconds: breakDurationSec,
        started_at: new Date(now).toISOString(),
        ends_at: new Date(now + pausedRemainingSec * 1000).toISOString(),
        paused_remaining_seconds: null,
        accumulated_elapsed_seconds: accumulatedElapsedSec,
        active_session_token: activeSessionToken,
      });
      requestWakeLock();
    });
  };

  const complete = () => {
    if (phase !== "running" && phase !== "paused") return;
    primeChimeFromUserGesture();
    void withSync(async () => {
      if (!user) return;
      const row: ActiveStateRow = {
        user_id: user.id,
        phase,
        kind,
        duration_seconds: durationSec,
        work_duration_seconds: workDurationSec,
        break_duration_seconds: breakDurationSec,
        started_at: startedAt?.toISOString() || null,
        ends_at: endsAt ? new Date(endsAt).toISOString() : null,
        paused_remaining_seconds: pausedRemainingSec,
        accumulated_elapsed_seconds: accumulatedElapsedSec,
        active_session_token: activeSessionToken,
        updated_at: new Date().toISOString(),
      };
      await finalizeRow(row, { notifyUser: false, endedAt: new Date(adjustedNow()) });
      clearTimer();
      clearFinishScheduler();
      completedSessionIdRef.current = activeSessionIdRef.current;
      releaseWakeLock();
      playChime();
      toast.success(kind === "work" ? "Çalışma kaydedildi. Mola için başlat'a basın." : "Mola bitti.");
    });
  };

  const reset = () => {
    void withSync(async () => {
      if (!user) return;
      await writeActiveState({
        user_id: user.id,
        phase: "idle",
        kind: "work",
        duration_seconds: workDurationSec,
        work_duration_seconds: workDurationSec,
        break_duration_seconds: breakDurationSec,
        started_at: null,
        ends_at: null,
        paused_remaining_seconds: null,
        accumulated_elapsed_seconds: 0,
        active_session_token: null,
      });
      clearTimer();
      clearFinishScheduler();
      activeSessionIdRef.current += 1;
      completedSessionIdRef.current = null;
      releaseWakeLock();
    });
  };

  const skipBreak = () => {
    if (kind !== "break") return;
    void withSync(async () => {
      if (!user) return;
      await writeActiveState({
        user_id: user.id,
        phase: "idle",
        kind: "work",
        duration_seconds: workDurationSec,
        work_duration_seconds: workDurationSec,
        break_duration_seconds: breakDurationSec,
        started_at: null,
        ends_at: null,
        paused_remaining_seconds: null,
        accumulated_elapsed_seconds: 0,
        active_session_token: null,
      });
      clearTimer();
      clearFinishScheduler();
      activeSessionIdRef.current += 1;
      completedSessionIdRef.current = null;
      releaseWakeLock();
      toast("Mola atlandı. Çalışma için başlat'a basın.");
    });
  };

  return (
    <PomodoroContext.Provider
      value={{
        durationSec, remainingSec, phase, kind, startedAt,
        workDurationSec, breakDurationSec,
        setDuration, start, pause, resume, complete, reset, skipBreak,
        isLoading, isSyncing, syncError, lastSyncedAt,
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
