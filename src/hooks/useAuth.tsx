import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { cleanupCurrentUserPushBeforeSignOut } from "@/services/pushNotifications";

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  initialAuthResolved: boolean;
  hasHydrated: boolean;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<Session | null>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialAuthResolved, setInitialAuthResolved] = useState(false);

  useEffect(() => {
    let mounted = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return;
      setSession(nextSession ?? null);
      setLoading(false);
      setInitialAuthResolved(true);
    });

    void supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      if (!mounted) return;
      setSession(currentSession ?? null);
      setLoading(false);
      setInitialAuthResolved(true);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const refreshSession = async () => {
    const { data, error } = await supabase.auth.refreshSession();
    if (error) return null;
    setSession(data.session ?? null);
    setInitialAuthResolved(true);
    setLoading(false);
    return data.session ?? null;
  };

  const signOut = useCallback(async () => {
    const currentUserId = session?.user.id ?? null;
    try {
      await cleanupCurrentUserPushBeforeSignOut(currentUserId);
    } catch {
      // Push cleanup is best effort. Authentication logout must always continue.
    }
    await supabase.auth.signOut();
  }, [session?.user.id]);

  const value = useMemo<AuthContextValue>(() => ({
    user: session?.user ?? null,
    session,
    loading,
    initialAuthResolved,
    hasHydrated: initialAuthResolved,
    signOut,
    refreshSession,
  }), [initialAuthResolved, loading, session, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};
