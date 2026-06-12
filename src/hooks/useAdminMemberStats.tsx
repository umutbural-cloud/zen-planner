import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { AdminMember } from "@/hooks/useAdminMembers";

type AdminMemberStats = {
  totalCount: number;
  active24hCount: number;
  weeklyActiveCount: number;
  inactive7dCount: number;
  new30dCount: number;
  unknownLastSeenCount: number;
};

type AdminSearchMembersResponse = {
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

const PAGE_SIZE = 100;
const MAX_MEMBERS = 5000;

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

const parseResponse = (data: unknown): AdminSearchMembersResponse => {
  if (!isRecord(data)) {
    throw new Error("Admin member stats response is invalid");
  }

  const { items, total_count, limit, offset } = data;

  if (
    !Array.isArray(items) ||
    !items.every(isAdminMember) ||
    typeof total_count !== "number" ||
    typeof limit !== "number" ||
    typeof offset !== "number"
  ) {
    throw new Error("Admin member stats response shape is invalid");
  }

  return { items, total_count, limit, offset };
};

const parseDate = (value: string | null) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const countStats = (members: AdminMember[]): AdminMemberStats => {
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;
  const sevenDays = 7 * oneDay;
  const thirtyDays = 30 * oneDay;

  return members.reduce<AdminMemberStats>(
    (acc, member) => {
      const lastSeen = parseDate(member.last_seen_at);
      const createdAt = parseDate(member.created_at);

      if (!lastSeen) {
        acc.unknownLastSeenCount += 1;
      } else {
        const diff = now - lastSeen.getTime();
        if (diff <= oneDay) acc.active24hCount += 1;
        if (diff <= sevenDays) acc.weeklyActiveCount += 1;
        else acc.inactive7dCount += 1;
      }

      if (createdAt && now - createdAt.getTime() <= thirtyDays) {
        acc.new30dCount += 1;
      }

      return acc;
    },
    {
      totalCount: 0,
      active24hCount: 0,
      weeklyActiveCount: 0,
      inactive7dCount: 0,
      new30dCount: 0,
      unknownLastSeenCount: 0,
    },
  );
};

export const useAdminMemberStats = (enabled: boolean) => {
  const mountedRef = useRef(true);
  const requestIdRef = useRef(0);
  const [stats, setStats] = useState<AdminMemberStats>({
    totalCount: 0,
    active24hCount: 0,
    weeklyActiveCount: 0,
    inactive7dCount: 0,
    new30dCount: 0,
    unknownLastSeenCount: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isPartial, setIsPartial] = useState(false);
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
      setStats({
        totalCount: 0,
        active24hCount: 0,
        weeklyActiveCount: 0,
        inactive7dCount: 0,
        new30dCount: 0,
        unknownLastSeenCount: 0,
      });
      setLoading(false);
      setError(null);
      setIsPartial(false);
      return;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    const loadStats = async () => {
      setLoading(true);
      setError(null);

      const collectedMembers: AdminMember[] = [];
      let totalCount = 0;
      let offset = 0;
      let partial = false;

      while (offset < MAX_MEMBERS) {
        const { data, error: rpcError } = await (supabase as SupabaseRpcClient).rpc("admin_search_members", {
          query: null,
          membership: null,
          membership_status: null,
          account_status: null,
          limit_count: PAGE_SIZE,
          offset_count: offset,
        });

        if (!mountedRef.current || requestIdRef.current !== requestId) return;

        if (rpcError) {
          setLoading(false);
          setError(rpcError);
          return;
        }

        const parsed = parseResponse(data);
        totalCount = parsed.total_count;
        collectedMembers.push(...parsed.items);
        offset += parsed.items.length;

        if (parsed.total_count > MAX_MEMBERS) {
          partial = true;
        }

        if (collectedMembers.length >= MAX_MEMBERS) {
          partial = true;
          break;
        }

        if (parsed.items.length === 0 || parsed.items.length < PAGE_SIZE) {
          break;
        }
      }

      if (!mountedRef.current || requestIdRef.current !== requestId) return;

      const counts = countStats(collectedMembers.slice(0, MAX_MEMBERS));
      setStats({
        totalCount,
        active24hCount: counts.active24hCount,
        weeklyActiveCount: counts.weeklyActiveCount,
        inactive7dCount: counts.inactive7dCount,
        new30dCount: counts.new30dCount,
        unknownLastSeenCount: counts.unknownLastSeenCount,
      });
      setIsPartial(partial);
      setLoading(false);
    };

    void loadStats();
  }, [enabled, refreshTick]);

  return {
    ...stats,
    loading,
    error,
    isPartial,
    refresh,
  };
};
