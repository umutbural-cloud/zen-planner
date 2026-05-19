import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatDurationLabel } from "@/features/home/lib/formatDurationLabel";
import { formatSessionEndTime, getLocalDayRange } from "@/features/home/lib/dateRanges";
import type { HomeRecentWorkItem, HomeSectionState, HomeStudySession } from "@/features/home/types";
import { useAuth } from "@/hooks/useAuth";

type WorkSessionRow = {
  id: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number;
  note: string | null;
  category_id: string | null;
};

type WorkStatsData = {
  todayCount: number;
  todayDurationSeconds: number;
  last7AverageSeconds: number;
  todaySessions: HomeStudySession[];
  recentWork: HomeRecentWorkItem[];
};

const emptyData: WorkStatsData = {
  todayCount: 0,
  todayDurationSeconds: 0,
  last7AverageSeconds: 0,
  todaySessions: [],
  recentWork: [],
};

const getSessionEndDate = (session: WorkSessionRow) => {
  if (session.ended_at) return new Date(session.ended_at);
  const started = new Date(session.started_at);
  return new Date(started.getTime() + session.duration_seconds * 1000);
};

const getSessionName = (session: WorkSessionRow, categories: Map<string, string>) => {
  const note = session.note?.trim();
  if (note) return note;
  if (session.category_id) return categories.get(session.category_id) || "Odak çalışması";
  return "Odak çalışması";
};

export const useHomeWorkStats = (): HomeSectionState<WorkStatsData> => {
  const { user } = useAuth();
  const [state, setState] = useState<HomeSectionState<WorkStatsData>>({ status: "loading", data: emptyData });

  const ranges = useMemo(() => {
    const today = getLocalDayRange();
    const sevenStart = new Date(today.start);
    sevenStart.setDate(today.start.getDate() - 6);
    return { today, sevenStart };
  }, []);

  useEffect(() => {
    if (!user) {
      setState({ status: "empty", data: emptyData });
      return;
    }

    let cancelled = false;

    (async () => {
      setState({ status: "loading", data: emptyData });

      const { data: sessions, error } = await supabase
        .from("pomodoro_sessions")
        .select("id,started_at,ended_at,duration_seconds,note,category_id")
        .eq("user_id", user.id)
        .eq("kind", "work")
        .gte("ended_at", ranges.sevenStart.toISOString())
        .lt("ended_at", ranges.today.end.toISOString())
        .order("ended_at", { ascending: false });

      if (cancelled) return;

      if (error) {
        setState({ status: "error", data: emptyData, error: error.message });
        return;
      }

      const rows = (sessions || []) as WorkSessionRow[];
      const categoryIds = Array.from(new Set(rows.map((row) => row.category_id).filter(Boolean))) as string[];
      const categories = new Map<string, string>();

      if (categoryIds.length > 0) {
        const { data: categoryRows } = await supabase
          .from("pomodoro_categories")
          .select("id,name")
          .eq("user_id", user.id)
          .in("id", categoryIds);

        if (!cancelled) {
          (categoryRows || []).forEach((category) => categories.set(category.id, category.name));
        }
      }

      if (cancelled) return;

      const todayRows = rows.filter((row) => {
        const end = getSessionEndDate(row);
        return end >= ranges.today.start && end < ranges.today.end;
      });

      const todaySessions = todayRows.map((row) => {
        const end = getSessionEndDate(row);
        return {
          id: row.id,
          label: getSessionName(row, categories),
          minutes: Math.round(row.duration_seconds / 60),
          endedAtLabel: formatSessionEndTime(end),
        };
      });

      const recentWork = rows.slice(0, 3).map((row) => {
        const end = getSessionEndDate(row);
        return {
          id: row.id,
          name: getSessionName(row, categories),
          durationLabel: formatDurationLabel(row.duration_seconds / 60),
          endedAtLabel: formatSessionEndTime(end),
        };
      });

      const todayDurationSeconds = todayRows.reduce((sum, row) => sum + row.duration_seconds, 0);
      const last7DurationSeconds = rows.reduce((sum, row) => sum + row.duration_seconds, 0);
      const data: WorkStatsData = {
        todayCount: todayRows.length,
        todayDurationSeconds,
        last7AverageSeconds: Math.round(last7DurationSeconds / 7),
        todaySessions,
        recentWork,
      };

      setState({ status: rows.length > 0 ? "ready" : "empty", data });
    })();

    return () => {
      cancelled = true;
    };
  }, [ranges.sevenStart, ranges.today.end, ranges.today.start, user]);

  return state;
};
