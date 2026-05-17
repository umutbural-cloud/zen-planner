import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export type PomodoroSession = {
  id: string;
  user_id: string;
  started_at: string;
  ended_at: string;
  duration_seconds: number;
  kind: "work" | "break";
  note: string | null;
};

export const usePomodoroSessions = (rangeStart: Date, rangeEnd: Date) => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<PomodoroSession[]>([]);
  const [loading, setLoading] = useState(true);

  const startIso = rangeStart.toISOString();
  const endIso = rangeEnd.toISOString();

  const fetchSessions = async () => {
    if (!user) { setSessions([]); setLoading(false); return; }
    const { data } = await supabase
      .from("pomodoro_sessions")
      .select("*")
      .eq("kind", "work")
      .gte("started_at", startIso)
      .lte("started_at", endIso)
      .order("started_at", { ascending: true });
    setSessions((data as PomodoroSession[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchSessions(); }, [user, startIso, endIso]);

  // Refresh when a new session is saved elsewhere
  useEffect(() => {
    const onSaved = () => fetchSessions();
    window.addEventListener("pomodoro:session-saved", onSaved);
    return () => window.removeEventListener("pomodoro:session-saved", onSaved);
  }, [user, startIso, endIso]);

  return { sessions, loading, refetch: fetchSessions };
};
