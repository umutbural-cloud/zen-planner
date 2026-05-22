import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AdminMemberDetail = {
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

type SupabaseRpcClient = typeof supabase & {
  rpc(fn: "admin_get_member_detail", args: { target_user_id: string }): Promise<{ data: unknown; error: Error | null }>;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isAdminMemberDetail = (value: unknown): value is AdminMemberDetail => {
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

const parseAdminMemberDetail = (data: unknown): AdminMemberDetail => {
  if (!isAdminMemberDetail(data)) {
    throw new Error("Admin member detail response shape is invalid");
  }

  return data;
};

export const useAdminMemberDetail = (enabled: boolean, targetUserId: string | null) => {
  const mountedRef = useRef(true);
  const requestIdRef = useRef(0);
  const [member, setMember] = useState<AdminMemberDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  const clear = useCallback(() => {
    requestIdRef.current += 1;
    setMember(null);
    setLoading(false);
    setError(null);
  }, []);

  const refresh = useCallback(() => {
    setRefreshTick((current) => current + 1);
  }, []);

  useEffect(() => {
    if (!enabled || !targetUserId) {
      clear();
      return;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    const loadMemberDetail = async () => {
      setLoading(true);
      setError(null);

      const { data, error: rpcError } = await (supabase as SupabaseRpcClient).rpc("admin_get_member_detail", {
        target_user_id: targetUserId,
      });

      if (!mountedRef.current || requestIdRef.current !== requestId) return;

      if (rpcError) {
        setMember(null);
        setError(rpcError);
        setLoading(false);
        return;
      }

      try {
        setMember(parseAdminMemberDetail(data));
        setError(null);
      } catch (parseError) {
        setMember(null);
        setError(parseError instanceof Error ? parseError : new Error("Admin member detail could not be read"));
      } finally {
        setLoading(false);
      }
    };

    void loadMemberDetail();
  }, [clear, enabled, refreshTick, targetUserId]);

  return {
    member,
    loading,
    error,
    refresh,
    clear,
  };
};
