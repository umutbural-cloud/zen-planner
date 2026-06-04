import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";

// Server-state queries must include user id in queryKey and stay disabled without auth.
const QueryCacheResetter = () => {
  const queryClient = useQueryClient();
  const { user, initialAuthResolved } = useAuth();
  const previousUserIdRef = useRef<string | null>(null);
  const hasResolvedOnceRef = useRef(false);
  const currentUserId = user?.id ?? null;

  useEffect(() => {
    if (!initialAuthResolved) return;

    if (!hasResolvedOnceRef.current) {
      previousUserIdRef.current = currentUserId;
      hasResolvedOnceRef.current = true;
      return;
    }

    const previousUserId = previousUserIdRef.current;
    const shouldClear =
      !!previousUserId &&
      (currentUserId === null || currentUserId !== previousUserId);

    if (shouldClear) {
      queryClient.clear();
    }

    previousUserIdRef.current = currentUserId;
  }, [currentUserId, initialAuthResolved, queryClient]);

  return null;
};

export default QueryCacheResetter;
