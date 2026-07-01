import { useCallback, useEffect, useMemo, useState } from "react";
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

const getCategoryLabel = (session: WorkSessionRow, categories: Map<string, string>) => {
  if (!session.category_id) return "Kategorisiz";
  return categories.get(session.category_id) || "Kategorisiz";
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

  const load = useCallback(async (cancelledRef: { current: boolean }) => {
    if (!user) {
      setState({ status: "empty", data: emptyData });
      return;
    }

    setState((prev) => {
      const hasVisibleData =
        prev.data.todayCount > 0 ||
        prev.data.todayDurationSeconds > 0 ||
        prev.data.todaySessions.length > 0 ||
        prev.data.recentWork.length > 0;
      return hasVisibleData ? prev : { status: "loading", data: emptyData };
    });

    const { data: sessions, error } = await supabase
      .from("pomodoro_sessions")
      .select("id,started_at,ended_at,duration_seconds,note,category_id")
      .eq("user_id", user.id)
      .eq("kind", "work")
      .is("deleted_at", null)
      .gte("ended_at", ranges.sevenStart.toISOString())
      .lt("ended_at", ranges.today.end.toISOString())
      .order("ended_at", { ascending: false });

    if (cancelledRef.current) return;

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

      if (!cancelledRef.current) {
        (categoryRows || []).forEach((category) => categories.set(category.id, category.name));
      }
    }

    if (cancelledRef.current) return;

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
        categoryLabel: getCategoryLabel(row, categories),
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
  }, [ranges.sevenStart, ranges.today.end, ranges.today.start, user]);

  useEffect(() => {
    const cancelledRef = { current: false };
    load(cancelledRef);

    return () => {
      cancelledRef.current = true;
    };
  }, [load]);

  useEffect(() => {
    const onSaved = () => {
      const cancelledRef = { current: false };
      load(cancelledRef);
    };
    window.addEventListener("pomodoro:session-saved", onSaved);
    return () => window.removeEventListener("pomodoro:session-saved", onSaved);
  }, [load]);

  return state;
};
