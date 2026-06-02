import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
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

type AccountGateContextValue = {
  gate: AccountGatePayload | null;
  status: AccountGateStatus;
  loading: boolean;
  error: Error | null;
  refreshGate: () => Promise<AccountGatePayload | null>;
  signOut: () => Promise<void>;
};

const AccountGateContext = createContext<AccountGateContextValue | null>(null);

type AccountGateProviderProps = {
  children: ReactNode;
};

export const AccountGateProvider = ({ children }: AccountGateProviderProps) => {
  const { user, initialAuthResolved, loading: authLoading, signOut: authSignOut } = useAuth();
  const [gate, setGate] = useState<AccountGatePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const mountedRef = useRef(false);
  const activeUserIdRef = useRef<string | null>(null);
  const confirmedAllowedUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  const loadGate = useCallback(async () => {
    const currentUserId = user?.id ?? null;

    if (!currentUserId) {
      activeUserIdRef.current = null;
      confirmedAllowedUserIdRef.current = null;
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
      confirmedAllowedUserIdRef.current = null;
      setGate(null);
      setError(rpcError);
      gateCache.set(currentUserId, { gate: null, status: "error" });
      setLoading(false);
      return null;
    }

    const nextStatus = deriveStatus(currentUserId, data);
    setGate(data);
    gateCache.set(currentUserId, { gate: data, status: nextStatus });
    confirmedAllowedUserIdRef.current = nextStatus === "allowed" ? currentUserId : null;
    setLoading(false);
    return data;
  }, [user]);

  useEffect(() => {
    if (authLoading || !initialAuthResolved) return;
    void loadGate();
  }, [authLoading, initialAuthResolved, loadGate]);

  useEffect(() => {
    const currentUserId = user?.id ?? null;

    if (!currentUserId) {
      activeUserIdRef.current = null;
      confirmedAllowedUserIdRef.current = null;
      gateCache.clear();
      setGate(null);
      setError(null);
      setLoading(false);
      return;
    }

    if (activeUserIdRef.current && activeUserIdRef.current !== currentUserId) {
      activeUserIdRef.current = currentUserId;
      confirmedAllowedUserIdRef.current = null;
      gateCache.clear();
      setGate(null);
      setError(null);
      setLoading(true);
      void loadGate();
      return;
    }

    const cached = gateCache.get(currentUserId);
    if (cached?.status === "allowed" && confirmedAllowedUserIdRef.current !== currentUserId && !loading) {
      confirmedAllowedUserIdRef.current = currentUserId;
      setGate(cached.gate);
      setError(null);
    }
  }, [loadGate, loading, user]);

  const currentUserId = user?.id ?? null;
  const cachedStatus = currentUserId ? gateCache.get(currentUserId)?.status : null;
  const status: AccountGateStatus = authLoading || !initialAuthResolved || loading
    ? "loading"
    : cachedStatus ?? deriveStatus(currentUserId, gate);

  const signOut = useCallback(async () => {
    activeUserIdRef.current = null;
    confirmedAllowedUserIdRef.current = null;
    gateCache.clear();
    setGate(null);
    setError(null);
    setLoading(false);
    await authSignOut();
  }, [authSignOut]);

  const value = useMemo<AccountGateContextValue>(() => ({
    gate,
    status,
    loading: status === "loading",
    error,
    refreshGate: loadGate,
    signOut,
  }), [error, gate, loadGate, signOut, status]);

  return <AccountGateContext.Provider value={value}>{children}</AccountGateContext.Provider>;
};

export const useAccountGate = () => {
  const context = useContext(AccountGateContext);

  if (!context) {
    throw new Error("useAccountGate must be used within AccountGateProvider");
  }

  return context;
};
