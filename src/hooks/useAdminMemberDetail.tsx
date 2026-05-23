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
  admin_manageable: boolean;
  admin_management_block_reason: "self_account" | "admin_account" | "unknown" | null;
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
    (typeof value.block_reason === "string" || value.block_reason === null) &&
    typeof value.admin_manageable === "boolean" &&
    (
      value.admin_management_block_reason === "self_account" ||
      value.admin_management_block_reason === "admin_account" ||
      value.admin_management_block_reason === "unknown" ||
      value.admin_management_block_reason === null
    )
  );
};

const parseAdminMemberDetail = (data: unknown): AdminMemberDetail => {
  if (!isAdminMemberDetail(data)) {
    if (!isRecord(data)) {
      throw new Error("Admin member detail response shape is invalid");
    }

    const missingManageability =
      (typeof data.admin_manageable !== "boolean" ||
        !(
          data.admin_management_block_reason === "self_account" ||
          data.admin_management_block_reason === "admin_account" ||
          data.admin_management_block_reason === "unknown" ||
          data.admin_management_block_reason === null
        )) &&
      typeof data.user_id === "string" &&
      (typeof data.email === "string" || data.email === null) &&
      (typeof data.full_name === "string" || data.full_name === null) &&
      (typeof data.account_status === "string" || data.account_status === null) &&
      (typeof data.membership === "string" || data.membership === null) &&
      (typeof data.membership_status === "string" || data.membership_status === null) &&
      (typeof data.last_seen_at === "string" || data.last_seen_at === null) &&
      (typeof data.created_at === "string" || data.created_at === null) &&
      (typeof data.updated_at === "string" || data.updated_at === null) &&
      typeof data.can_use_app === "boolean" &&
      typeof data.can_export === "boolean" &&
      (typeof data.block_reason === "string" || data.block_reason === null);

    if (missingManageability) {
      return {
        user_id: data.user_id,
        email: data.email,
        full_name: data.full_name,
        account_status: data.account_status,
        membership: data.membership,
        membership_status: data.membership_status,
        last_seen_at: data.last_seen_at,
        created_at: data.created_at,
        updated_at: data.updated_at,
        can_use_app: data.can_use_app,
        can_export: data.can_export,
        block_reason: data.block_reason,
        admin_manageable: false,
        admin_management_block_reason: null,
      };
    }

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
