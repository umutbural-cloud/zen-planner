import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type EngagementSeriesItem = {
  snapshot_date: string;
  meaningful_active_7d_count: number | null;
  meaningful_active_7d_count_suppressed?: boolean;
  task_completion_activity_7d: number | null;
  task_completion_activity_7d_suppressed?: boolean;
  manual_pomodoro_sessions_7d: number | null;
  manual_pomodoro_sessions_7d_suppressed?: boolean;
  habit_completion_activity_7d: number | null;
  habit_completion_activity_7d_suppressed?: boolean;
  meaningful_streak_3d_count: number | null;
  meaningful_streak_3d_count_suppressed?: boolean;
  suppressed?: boolean;
};

type EngagementReleaseEvent = {
  id: string;
  release_name: string;
  release_type: string;
  deployed_at: string;
};

type EngagementLatest = {
  snapshot_date: string;
  metric_version: string;
  snapshot_kind: string;
  compute_mode: string;
  computed_lag_days: number;
  eligible_user_count: number;
  suppressed: boolean;
  presence_active_day_count: number | null;
  meaningful_active_day_count: number | null;
  meaningful_active_7d_count: number | null;
  meaningful_active_30d_count: number | null;
  task_completion_activity_7d: number | null;
  manual_pomodoro_sessions_7d: number | null;
  manual_pomodoro_minutes_7d: number | null;
  habit_completion_activity_7d: number | null;
  meaningful_streak_3d_count: number | null;
  settings_adoption_proxy_7d_count: number | null;
};

type EngagementDashboardResponse = {
  latest: EngagementLatest | null;
  series: EngagementSeriesItem[];
  release_events: EngagementReleaseEvent[];
};

type RpcClient = typeof supabase & {
  rpc(
    fn: "admin_get_engagement_dashboard",
    args: {
      days_back: number;
    },
  ): Promise<{ data: unknown; error: Error | null }>;
};

const FORBIDDEN_KEYS = new Set([
  "user_id",
  "email",
  "full_name",
  "task_id",
  "habit_id",
  "session_id",
  "notes",
  "content",
  "title",
]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const hasForbiddenKey = (value: unknown, seen = new WeakSet<object>()): boolean => {
  if (!isRecord(value)) return false;
  if (seen.has(value)) return false;
  seen.add(value);

  return Object.entries(value).some(([key, child]) => {
    if (FORBIDDEN_KEYS.has(key)) return true;
    if (Array.isArray(child)) return child.some((item) => hasForbiddenKey(item, seen));
    return hasForbiddenKey(child, seen);
  });
};

const isNumberOrNull = (value: unknown): value is number | null =>
  typeof value === "number" || value === null;

const isString = (value: unknown): value is string => typeof value === "string";

const parseLatest = (value: unknown): EngagementLatest | null => {
  if (!isRecord(value)) return null;

  const requiredStrings = ["snapshot_date", "metric_version", "snapshot_kind", "compute_mode"] as const;
  if (!requiredStrings.every((key) => isString(value[key]))) return null;
  if (
    typeof value.computed_lag_days !== "number" ||
    typeof value.eligible_user_count !== "number" ||
    typeof value.suppressed !== "boolean"
  ) {
    return null;
  }

  const optionalFields = [
    "presence_active_day_count",
    "meaningful_active_day_count",
    "meaningful_active_7d_count",
    "meaningful_active_30d_count",
    "task_completion_activity_7d",
    "manual_pomodoro_sessions_7d",
    "manual_pomodoro_minutes_7d",
    "habit_completion_activity_7d",
    "meaningful_streak_3d_count",
    "settings_adoption_proxy_7d_count",
  ] as const;

  if (!optionalFields.every((key) => isNumberOrNull(value[key]))) return null;

  return {
    snapshot_date: value.snapshot_date as string,
    metric_version: value.metric_version as string,
    snapshot_kind: value.snapshot_kind as string,
    compute_mode: value.compute_mode as string,
    computed_lag_days: value.computed_lag_days as number,
    eligible_user_count: value.eligible_user_count as number,
    suppressed: value.suppressed as boolean,
    presence_active_day_count: value.presence_active_day_count as number | null,
    meaningful_active_day_count: value.meaningful_active_day_count as number | null,
    meaningful_active_7d_count: value.meaningful_active_7d_count as number | null,
    meaningful_active_30d_count: value.meaningful_active_30d_count as number | null,
    task_completion_activity_7d: value.task_completion_activity_7d as number | null,
    manual_pomodoro_sessions_7d: value.manual_pomodoro_sessions_7d as number | null,
    manual_pomodoro_minutes_7d: value.manual_pomodoro_minutes_7d as number | null,
    habit_completion_activity_7d: value.habit_completion_activity_7d as number | null,
    meaningful_streak_3d_count: value.meaningful_streak_3d_count as number | null,
    settings_adoption_proxy_7d_count: value.settings_adoption_proxy_7d_count as number | null,
  };
};

const parseSeriesItem = (value: unknown): EngagementSeriesItem | null => {
  if (!isRecord(value)) return null;
  if (!isString(value.snapshot_date)) return null;
  if (typeof value.suppressed !== "boolean" && typeof value.suppressed !== "undefined") return null;

  const fields = [
    "meaningful_active_7d_count",
    "task_completion_activity_7d",
    "manual_pomodoro_sessions_7d",
    "habit_completion_activity_7d",
    "meaningful_streak_3d_count",
  ] as const;

  if (!fields.every((key) => isNumberOrNull(value[key]))) return null;

  const suppressionFields = [
    "meaningful_active_7d_count_suppressed",
    "task_completion_activity_7d_suppressed",
    "manual_pomodoro_sessions_7d_suppressed",
    "habit_completion_activity_7d_suppressed",
    "meaningful_streak_3d_count_suppressed",
  ] as const;

  if (
    suppressionFields.some(
      (key) => typeof value[key] !== "boolean" && typeof value[key] !== "undefined",
    )
  ) {
    return null;
  }

  return {
    snapshot_date: value.snapshot_date,
    meaningful_active_7d_count: value.meaningful_active_7d_count as number | null,
    meaningful_active_7d_count_suppressed:
      typeof value.meaningful_active_7d_count_suppressed === "boolean"
        ? value.meaningful_active_7d_count_suppressed
        : undefined,
    task_completion_activity_7d: value.task_completion_activity_7d as number | null,
    task_completion_activity_7d_suppressed:
      typeof value.task_completion_activity_7d_suppressed === "boolean"
        ? value.task_completion_activity_7d_suppressed
        : undefined,
    manual_pomodoro_sessions_7d: value.manual_pomodoro_sessions_7d as number | null,
    manual_pomodoro_sessions_7d_suppressed:
      typeof value.manual_pomodoro_sessions_7d_suppressed === "boolean"
        ? value.manual_pomodoro_sessions_7d_suppressed
        : undefined,
    habit_completion_activity_7d: value.habit_completion_activity_7d as number | null,
    habit_completion_activity_7d_suppressed:
      typeof value.habit_completion_activity_7d_suppressed === "boolean"
        ? value.habit_completion_activity_7d_suppressed
        : undefined,
    meaningful_streak_3d_count: value.meaningful_streak_3d_count as number | null,
    meaningful_streak_3d_count_suppressed:
      typeof value.meaningful_streak_3d_count_suppressed === "boolean"
        ? value.meaningful_streak_3d_count_suppressed
        : undefined,
    suppressed: typeof value.suppressed === "boolean" ? value.suppressed : undefined,
  };
};

const parseReleaseEvent = (value: unknown): EngagementReleaseEvent | null => {
  if (!isRecord(value)) return null;
  if (!isString(value.id) || !isString(value.release_name) || !isString(value.release_type) || !isString(value.deployed_at)) {
    return null;
  }

  return {
    id: value.id,
    release_name: value.release_name,
    release_type: value.release_type,
    deployed_at: value.deployed_at,
  };
};

const parseDashboardResponse = (data: unknown): EngagementDashboardResponse => {
  if (!isRecord(data)) {
    throw new Error("Engagement response is invalid.");
  }

  if (hasForbiddenKey(data)) {
    throw new Error("Engagement response contains forbidden fields.");
  }

  const latest = data.latest === null ? null : parseLatest(data.latest);
  const series = Array.isArray(data.series) ? data.series.map(parseSeriesItem) : null;
  const releaseEvents = Array.isArray(data.release_events) ? data.release_events.map(parseReleaseEvent) : null;

  if (!series || !releaseEvents) {
    throw new Error("Engagement response shape is invalid.");
  }

  if (series.some((item) => item === null)) {
    throw new Error("Engagement response shape is invalid.");
  }

  if (releaseEvents.some((item) => item === null)) {
    throw new Error("Engagement response shape is invalid.");
  }

  if (data.latest !== null && latest === null) {
    throw new Error("Engagement latest snapshot shape is invalid.");
  }

  return {
    latest,
    series: series as EngagementSeriesItem[],
    release_events: releaseEvents as EngagementReleaseEvent[],
  };
};

export const useAdminEngagementStats = (enabled: boolean, daysBack = 30) => {
  const mountedRef = useRef(true);
  const requestIdRef = useRef(0);
  const [data, setData] = useState<EngagementDashboardResponse>({
    latest: null,
    series: [],
    release_events: [],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  const normalizedDaysBack = useMemo(() => Math.max(7, Math.min(daysBack, 90)), [daysBack]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const refetch = useCallback(() => {
    setRefreshTick((current) => current + 1);
  }, []);

  useEffect(() => {
    if (!enabled) {
      requestIdRef.current += 1;
      setData({ latest: null, series: [], release_events: [] });
      setIsLoading(false);
      setError(null);
      return;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    const load = async () => {
      setIsLoading(true);
      setError(null);

      const { data: response, error: rpcError } = await (supabase as RpcClient).rpc("admin_get_engagement_dashboard", {
        days_back: normalizedDaysBack,
      });

      if (!mountedRef.current || requestIdRef.current !== requestId) return;

      if (rpcError) {
        setData({ latest: null, series: [], release_events: [] });
        setIsLoading(false);
        setError(new Error("Engagement metrikleri alınamadı."));
        return;
      }

      try {
        const parsed = parseDashboardResponse(response);
        setData(parsed);
      } catch (parseError) {
        setData({ latest: null, series: [], release_events: [] });
        setError(parseError instanceof Error ? parseError : new Error("Engagement response is invalid."));
      } finally {
        if (mountedRef.current && requestIdRef.current === requestId) {
          setIsLoading(false);
        }
      }
    };

    void load();
  }, [enabled, normalizedDaysBack, refreshTick]);

  return {
    data,
    latest: data.latest,
    series: data.series,
    releaseEvents: data.release_events,
    isLoading,
    error,
    refetch,
  };
};
