import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type AccountGatePayload = {
  user_id: string | null;
  email: string | null;
  full_name: string | null;
  account_status: string | null;
  last_seen_at: string | null;
  membership: string | null;
  membership_status: string | null;
  can_use_app: boolean;
  can_export: boolean;
  block_reason: string | null;
};

export type AccountGateStatus =
  | "loading"
  | "signed_out"
  | "allowed"
  | "suspended"
  | "membership_inactive"
  | "security_blocked"
  | "closed"
  | "error";

type SupabaseRpcClient = typeof supabase & {
  rpc(
    fn: "get_current_account_gate",
    args?: Record<string, never>,
  ): Promise<{ data: AccountGatePayload | null; error: Error | null }>;
};

const deriveStatus = (userId: string | undefined, gate: AccountGatePayload | null): AccountGateStatus => {
  if (!userId) return "signed_out";
  if (!gate) return "error";
  if (gate.can_use_app) return "allowed";
  if (gate.account_status === "suspended") return "suspended";
  if (gate.account_status === "security_blocked") return "security_blocked";
  if (gate.account_status === "deleted" || gate.account_status === "anonymized") return "closed";
  if (gate.membership_status === "cancelled" || gate.membership_status === "expired") {
    return "membership_inactive";
  }
  return "error";
};

type CachedGateState = {
  gate: AccountGatePayload | null;
  status: Exclude<AccountGateStatus, "loading">;
};

const gateCache = new Map<string, CachedGateState>();

export const useAccountGate = () => {
  const { user, initialAuthResolved, loading: authLoading, signOut } = useAuth();
  const [gate, setGate] = useState<AccountGatePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const mountedRef = useRef(false);
  const activeUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  const refreshGate = useCallback(async () => {
    const currentUserId = user?.id ?? null;
    if (!currentUserId) {
      activeUserIdRef.current = null;
      setGate(null);
      setError(null);
      setLoading(false);
      gateCache.clear();
      return null;
    }

    activeUserIdRef.current = currentUserId;
    setLoading(true);
    setError(null);

    const { data, error: rpcError } = await (supabase as SupabaseRpcClient).rpc("get_current_account_gate");

    if (!mountedRef.current) return null;
    if (activeUserIdRef.current !== currentUserId) return null;

    if (rpcError) {
      setGate(null);
      setError(rpcError);
      gateCache.set(currentUserId, { gate: null, status: "error" });
      setLoading(false);
      return null;
    }

    setGate(data);
    gateCache.set(currentUserId, { gate: data, status: deriveStatus(currentUserId, data) });
    setLoading(false);
    return data;
  }, [user]);

  useEffect(() => {
    if (authLoading || !initialAuthResolved) return;

    let cancelled = false;

    const loadGate = async () => {
      const currentUserId = user?.id ?? null;
      if (!currentUserId) {
        activeUserIdRef.current = null;
        setGate(null);
        setError(null);
        setLoading(false);
        gateCache.clear();
        return;
      }

      activeUserIdRef.current = currentUserId;
      setLoading(true);
      setError(null);

      const { data, error: rpcError } = await (supabase as SupabaseRpcClient).rpc("get_current_account_gate");

      if (cancelled) return;
      if (activeUserIdRef.current !== currentUserId) return;

      if (rpcError) {
        setGate(null);
        setError(rpcError);
        gateCache.set(currentUserId, { gate: null, status: "error" });
      } else {
        setGate(data);
        gateCache.set(currentUserId, { gate: data, status: deriveStatus(currentUserId, data) });
      }

      setLoading(false);
    };

    void loadGate();

    return () => {
      cancelled = true;
    };
  }, [authLoading, initialAuthResolved, user]);

  const currentUserId = user?.id ?? null;
  const cachedStatus = currentUserId ? gateCache.get(currentUserId)?.status : null;
  const status: AccountGateStatus = authLoading || !initialAuthResolved || loading
    ? "loading"
    : cachedStatus ?? deriveStatus(currentUserId, gate);

  useEffect(() => {
    if (!currentUserId) {
      activeUserIdRef.current = null;
      gateCache.clear();
      setGate(null);
      setError(null);
      setLoading(false);
      return;
    }

    if (activeUserIdRef.current && activeUserIdRef.current !== currentUserId) {
      gateCache.clear();
      setGate(null);
      setError(null);
      setLoading(true);
    }
  }, [currentUserId]);

  return {
    user,
    signOut,
    gate,
    status,
    loading: status === "loading",
    error,
    refreshGate,
  };
};
