import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AdminAuditAction = "membership.changed" | "account.suspended" | "account.reactivated";

export type AdminAuditLogItem = {
  id: string;
  created_at: string;
  action: AdminAuditAction;
  actor_email: string | null;
  target_email: string | null;
  success: boolean;
  reason_code: string | null;
  old_value_summary: string | null;
  new_value_summary: string | null;
};

export type AdminAuditLogFilters = {
  actionFilter: AdminAuditAction | null;
  successFilter: boolean | null;
  targetQuery: string;
  actorQuery: string;
  createdFrom: string | null;
  createdTo: string | null;
  limit: number;
  offset: number;
};

type AdminAuditLogsResponse = {
  items: AdminAuditLogItem[];
  total_count: number;
  limit: number;
  offset: number;
};

type SupabaseRpcClient = typeof supabase & {
  rpc(
    fn: "admin_search_audit_logs",
    args: {
      action_filter: AdminAuditAction | null;
      success_filter: boolean | null;
      target_query: string | null;
      actor_query: string | null;
      created_from: string | null;
      created_to: string | null;
      limit_count: number;
      offset_count: number;
    },
  ): Promise<{ data: unknown; error: Error | null }>;
};

const allowedActions = new Set<AdminAuditAction>([
  "membership.changed",
  "account.suspended",
  "account.reactivated",
]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isAdminAuditAction = (value: unknown): value is AdminAuditAction =>
  typeof value === "string" && allowedActions.has(value as AdminAuditAction);

const parseAuditLogItem = (value: unknown): AdminAuditLogItem | null => {
  if (!isRecord(value) || !isAdminAuditAction(value.action)) {
    return null;
  }

  if (
    typeof value.id !== "string" ||
    typeof value.created_at !== "string" ||
    typeof value.success !== "boolean" ||
    !(typeof value.actor_email === "string" || value.actor_email === null) ||
    !(typeof value.target_email === "string" || value.target_email === null) ||
    !(typeof value.reason_code === "string" || value.reason_code === null) ||
    !(typeof value.old_value_summary === "string" || value.old_value_summary === null) ||
    !(typeof value.new_value_summary === "string" || value.new_value_summary === null)
  ) {
    return null;
  }

  return {
    id: value.id,
    created_at: value.created_at,
    action: value.action,
    actor_email: value.actor_email,
    target_email: value.target_email,
    success: value.success,
    reason_code: value.reason_code,
    old_value_summary: value.old_value_summary,
    new_value_summary: value.new_value_summary,
  };
};

const parseAuditLogsResponse = (data: unknown, filters: AdminAuditLogFilters): AdminAuditLogsResponse => {
  if (!isRecord(data)) {
    return {
      items: [],
      total_count: 0,
      limit: filters.limit,
      offset: filters.offset,
    };
  }

  const parsedItems = Array.isArray(data.items)
    ? data.items.flatMap((item) => {
        const parsed = parseAuditLogItem(item);
        return parsed ? [parsed] : [];
      })
    : [];

  return {
    items: parsedItems,
    total_count: typeof data.total_count === "number" ? data.total_count : 0,
    limit: typeof data.limit === "number" ? data.limit : filters.limit,
    offset: typeof data.offset === "number" ? data.offset : filters.offset,
  };
};

const normalizeQuery = (value: string) => {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export const useAdminAuditLogs = ({
  enabled,
  filters,
}: {
  enabled: boolean;
  filters: AdminAuditLogFilters;
}) => {
  const mountedRef = useRef(true);
  const requestIdRef = useRef(0);
  const [items, setItems] = useState<AdminAuditLogItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [limit, setLimit] = useState(filters.limit);
  const [offset, setOffset] = useState(filters.offset);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  const refresh = useCallback(() => {
    setRefreshTick((current) => current + 1);
  }, []);

  useEffect(() => {
    if (!enabled) {
      requestIdRef.current += 1;
      setItems([]);
      setTotalCount(0);
      setLimit(filters.limit);
      setOffset(filters.offset);
      setLoading(false);
      setError(null);
      setErrorMessage(null);
      return;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    const loadAuditLogs = async () => {
      setLoading(true);
      setError(null);
      setErrorMessage(null);

      const { data, error: rpcError } = await (supabase as SupabaseRpcClient).rpc("admin_search_audit_logs", {
        action_filter: filters.actionFilter,
        success_filter: filters.successFilter,
        target_query: normalizeQuery(filters.targetQuery),
        actor_query: normalizeQuery(filters.actorQuery),
        created_from: filters.createdFrom,
        created_to: filters.createdTo,
        limit_count: filters.limit,
        offset_count: Math.max(0, filters.offset),
      });

      if (!mountedRef.current || requestIdRef.current !== requestId) return;

      if (rpcError) {
        setItems([]);
        setTotalCount(0);
        setLimit(filters.limit);
        setOffset(Math.max(0, filters.offset));
        setError(rpcError);
        setErrorMessage("Audit log kayıtları alınamadı.");
        setLoading(false);
        return;
      }

      const parsed = parseAuditLogsResponse(data, filters);
      setItems(parsed.items);
      setTotalCount(parsed.total_count);
      setLimit(parsed.limit);
      setOffset(parsed.offset);
      setError(null);
      setErrorMessage(null);
      setLoading(false);
    };

    void loadAuditLogs();
  }, [enabled, filters, refreshTick]);

  return {
    items,
    totalCount,
    limit,
    offset,
    loading,
    error,
    errorMessage,
    refresh,
  };
};
