import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";

export type PwaUpdateStatus = "idle" | "checking" | "update-available" | "up-to-date" | "unsupported" | "error";

type PwaUpdateContextValue = {
  offlineReady: boolean;
  needRefresh: boolean;
  status: PwaUpdateStatus;
  lastCheckedAt: Date | null;
  checkForUpdate: () => Promise<void>;
  updateNow: () => Promise<void>;
  dismissOfflineReady: () => void;
  dismissUpdate: () => void;
};

const PwaUpdateContext = createContext<PwaUpdateContextValue | null>(null);

const waitForServiceWorkerEvents = () => new Promise((resolve) => window.setTimeout(resolve, 1000));

export const PwaUpdateProvider = ({ children }: { children: ReactNode }) => {
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);
  const needRefreshRef = useRef(false);
  const [status, setStatus] = useState<PwaUpdateStatus>("idle");
  const [lastCheckedAt, setLastCheckedAt] = useState<Date | null>(null);
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      registrationRef.current = registration ?? null;
    },
    onRegisterError(error) {
      console.error("[PWA] Service worker registration failed", error);
      setStatus("error");
    },
  });

  useEffect(() => {
    needRefreshRef.current = needRefresh;
    if (needRefresh) setStatus("update-available");
  }, [needRefresh]);

  const dismissOfflineReady = useCallback(() => {
    setOfflineReady(false);
  }, [setOfflineReady]);

  const dismissUpdate = useCallback(() => {
    setNeedRefresh(false);
    needRefreshRef.current = false;
    setStatus("idle");
  }, [setNeedRefresh]);

  const updateNow = useCallback(async () => {
    await updateServiceWorker(true);
  }, [updateServiceWorker]);

  const checkForUpdate = useCallback(async () => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
      setStatus("unsupported");
      setLastCheckedAt(new Date());
      return;
    }

    setStatus("checking");
    try {
      const registration = registrationRef.current ?? await navigator.serviceWorker.getRegistration();
      if (!registration) {
        setStatus("up-to-date");
        setLastCheckedAt(new Date());
        return;
      }

      registrationRef.current = registration;
      await registration.update();
      await waitForServiceWorkerEvents();
      setLastCheckedAt(new Date());
      setStatus(needRefreshRef.current ? "update-available" : "up-to-date");
    } catch (error) {
      console.error("[PWA] Update check failed", error);
      setStatus("error");
      setLastCheckedAt(new Date());
    }
  }, []);

  const value = useMemo<PwaUpdateContextValue>(() => ({
    offlineReady,
    needRefresh,
    status,
    lastCheckedAt,
    checkForUpdate,
    updateNow,
    dismissOfflineReady,
    dismissUpdate,
  }), [
    checkForUpdate,
    dismissOfflineReady,
    dismissUpdate,
    lastCheckedAt,
    needRefresh,
    offlineReady,
    status,
    updateNow,
  ]);

  return <PwaUpdateContext.Provider value={value}>{children}</PwaUpdateContext.Provider>;
};

export const usePwaUpdate = () => {
  const context = useContext(PwaUpdateContext);
  if (!context) throw new Error("usePwaUpdate must be used within PwaUpdateProvider");
  return context;
};
