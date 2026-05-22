import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AdminMember = {
  user_id: string;
  email: string | null;
  full_name: string | null;
  account_status: string | null;
  membership: string | null;
  membership_status: string | null;
  last_seen_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  can_use_app: boolean;
  can_export: boolean;
  block_reason: string | null;
};

type AdminMembersResponse = {
  items: AdminMember[];
  total_count: number;
  limit: number;
  offset: number;
};

type SupabaseRpcClient = typeof supabase & {
  rpc(
    fn: "admin_search_members",
    args: {
      query: string | null;
      membership: string | null;
      membership_status: string | null;
      account_status: string | null;
      limit_count: number;
      offset_count: number;
    },
  ): Promise<{ data: unknown; error: Error | null }>;
};

const DEFAULT_LIMIT = 20;
const QUERY_DEBOUNCE_MS = 350;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isAdminMember = (value: unknown): value is AdminMember => {
  if (!isRecord(value)) return false;

  return (
    typeof value.user_id === "string" &&
    (typeof value.email === "string" || value.email === null) &&
    (typeof value.full_name === "string" || value.full_name === null) &&
    (typeof value.account_status === "string" || value.account_status === null) &&
    (typeof value.membership === "string" || value.membership === null) &&
    (typeof value.membership_status === "string" || value.membership_status === null) &&
    (typeof value.last_seen_at === "string" || value.last_seen_at === null) &&
    (typeof value.created_at === "string" || value.created_at === null) &&
    (typeof value.updated_at === "string" || value.updated_at === null) &&
    typeof value.can_use_app === "boolean" &&
    typeof value.can_export === "boolean" &&
    (typeof value.block_reason === "string" || value.block_reason === null)
  );
};

const parseAdminMembersResponse = (data: unknown): AdminMembersResponse => {
  if (!isRecord(data)) {
    throw new Error("Admin member response is invalid");
  }

  const { items, total_count, limit, offset } = data;

  if (
    !Array.isArray(items) ||
    !items.every(isAdminMember) ||
    typeof total_count !== "number" ||
    typeof limit !== "number" ||
    typeof offset !== "number"
  ) {
    throw new Error("Admin member response shape is invalid");
  }

  return {
    items,
    total_count,
    limit,
    offset,
  };
};

export const useAdminMembers = (enabled: boolean) => {
  const mountedRef = useRef(true);
  const requestIdRef = useRef(0);
  const [items, setItems] = useState<AdminMember[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [limit, setLimit] = useState(DEFAULT_LIMIT);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [query, setQueryValue] = useState("");
  const [membership, setMembershipValue] = useState<string | null>(null);
  const [membershipStatus, setMembershipStatusValue] = useState<string | null>(null);
  const [accountStatus, setAccountStatusValue] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  const setQuery = useCallback((value: string) => {
    setQueryValue(value);
    setOffset(0);
  }, []);

  const setMembership = useCallback((value: string | null) => {
    setMembershipValue(value);
    setOffset(0);
  }, []);

  const setMembershipStatus = useCallback((value: string | null) => {
    setMembershipStatusValue(value);
    setOffset(0);
  }, []);

  const setAccountStatus = useCallback((value: string | null) => {
    setAccountStatusValue(value);
    setOffset(0);
  }, []);

  const refresh = useCallback(() => {
    setRefreshTick((current) => current + 1);
  }, []);

  const previousPage = useCallback(() => {
    setOffset((current) => Math.max(0, current - DEFAULT_LIMIT));
  }, []);

  const nextPage = useCallback(() => {
    setOffset((current) => current + DEFAULT_LIMIT);
  }, []);

  useEffect(() => {
    if (!enabled) {
      requestIdRef.current += 1;
      setItems([]);
      setTotalCount(0);
      setLimit(DEFAULT_LIMIT);
      setOffset(0);
      setLoading(false);
      setError(null);
      return;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError(null);

      const normalizedQuery = query.trim() || null;
      const { data, error: rpcError } = await (supabase as SupabaseRpcClient).rpc("admin_search_members", {
        query: normalizedQuery,
        membership,
        membership_status: membershipStatus,
        account_status: accountStatus,
        limit_count: DEFAULT_LIMIT,
        offset_count: offset,
      });

      if (!mountedRef.current || requestIdRef.current !== requestId) return;

      if (rpcError) {
        setItems([]);
        setTotalCount(0);
        setLimit(DEFAULT_LIMIT);
        setError(rpcError);
        setLoading(false);
        return;
      }

      try {
        const parsed = parseAdminMembersResponse(data);
        setItems(parsed.items);
        setTotalCount(parsed.total_count);
        setLimit(parsed.limit);
        setOffset(parsed.offset);
        setError(null);
      } catch (parseError) {
        setItems([]);
        setTotalCount(0);
        setLimit(DEFAULT_LIMIT);
        setError(parseError instanceof Error ? parseError : new Error("Admin member response could not be read"));
      } finally {
        setLoading(false);
      }
    }, QUERY_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [accountStatus, enabled, membership, membershipStatus, offset, query, refreshTick]);

  return {
    items,
    totalCount,
    limit,
    offset,
    loading,
    error,
    query,
    membership,
    membershipStatus,
    accountStatus,
    setQuery,
    setMembership,
    setMembershipStatus,
    setAccountStatus,
    refresh,
    nextPage,
    previousPage,
  };
};
