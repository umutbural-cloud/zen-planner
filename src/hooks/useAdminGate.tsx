import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type AdminContext = {
  user_id: string | null;
  is_admin: boolean;
  is_super_manager: boolean;
  roles: string[];
};

export type AdminGateStatus = "loading" | "signed_out" | "admin" | "not_admin" | "error";

type SupabaseRpcClient = typeof supabase & {
  rpc(fn: "get_current_admin_context"): Promise<{ data: AdminContext | null; error: Error | null }>;
};

const emptyAdminContext: AdminContext = {
  user_id: null,
  is_admin: false,
  is_super_manager: false,
  roles: [],
};

export const useAdminGate = () => {
  const { user, loading: authLoading } = useAuth();
  const mountedRef = useRef(true);
  const [adminContext, setAdminContext] = useState<AdminContext | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  const refreshAdminContext = useCallback(async () => {
    if (!user) {
      setAdminContext(null);
      setError(null);
      setLoading(false);
      return null;
    }

    setLoading(true);
    setError(null);

    const { data, error: rpcError } = await (supabase as SupabaseRpcClient).rpc("get_current_admin_context");

    if (!mountedRef.current) return null;

    if (rpcError) {
      setAdminContext(null);
      setError(rpcError);
      setLoading(false);
      return null;
    }

    const context = data ?? emptyAdminContext;
    setAdminContext(context);
    setLoading(false);
    return context;
  }, [user]);

  useEffect(() => {
    if (authLoading) return;

    void refreshAdminContext();
  }, [authLoading, refreshAdminContext]);

  const status: AdminGateStatus = authLoading || loading
    ? "loading"
    : !user
      ? "signed_out"
      : error
        ? "error"
        : adminContext?.is_admin
          ? "admin"
          : "not_admin";

  return {
    user,
    adminContext,
    error,
    loading: status === "loading",
    status,
    refreshAdminContext,
  };
};
