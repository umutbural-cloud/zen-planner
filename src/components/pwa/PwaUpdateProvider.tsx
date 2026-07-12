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

const UPDATE_CHECK_TIMEOUT_MS = 15000;

const isServiceWorkerReadyForUpdate = (registration: ServiceWorkerRegistration) =>
  Boolean(registration.waiting);

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
        setStatus("error");
        setLastCheckedAt(new Date());
        return;
      }

      registrationRef.current = registration;
      if (needRefreshRef.current || isServiceWorkerReadyForUpdate(registration)) {
        setStatus("update-available");
        setLastCheckedAt(new Date());
        return;
      }

      let settled = false;
      let timeoutId: number | null = null;
      let updateFound = Boolean(registration.installing);
      const cleanup: Array<() => void> = [];
      const finish = (nextStatus: PwaUpdateStatus) => {
        if (settled) return;
        settled = true;
        while (cleanup.length > 0) {
          const fn = cleanup.pop();
          try {
            fn?.();
          } catch {
            // noop
          }
        }
        if (timeoutId !== null) window.clearTimeout(timeoutId);
        setLastCheckedAt(new Date());
        setStatus(nextStatus);
      };

      const evaluateAvailability = () => {
        if (needRefreshRef.current || isServiceWorkerReadyForUpdate(registration)) {
          finish("update-available");
          return true;
        }
        return false;
      };

      const watchWorker = (worker: ServiceWorker) => {
        updateFound = true;
        const onStateChange = () => {
          if (settled) return;
          if (worker.state === "installed") {
            if (evaluateAvailability()) return;
            if (registration.waiting || needRefreshRef.current) {
              finish("update-available");
              return;
            }
          } else if (worker.state === "redundant") {
            finish("error");
          }
        };
        worker.addEventListener("statechange", onStateChange);
        cleanup.push(() => worker.removeEventListener("statechange", onStateChange));
      };

      const onUpdateFound = () => {
        const worker = registration.installing;
        if (!worker) return;
        watchWorker(worker);
      };

      if (registration.installing) {
        watchWorker(registration.installing);
      }

      registration.addEventListener("updatefound", onUpdateFound);
      cleanup.push(() => registration.removeEventListener("updatefound", onUpdateFound));

      timeoutId = window.setTimeout(() => {
        if (settled) return;
        if (needRefreshRef.current || isServiceWorkerReadyForUpdate(registration)) {
          finish("update-available");
          return;
        }
        finish("error");
      }, UPDATE_CHECK_TIMEOUT_MS);

      try {
        await registration.update();
      } catch (error) {
        console.error("[PWA] Update check failed", error);
        finish("error");
        return;
      }

      if (evaluateAvailability()) return;
      if (settled) return;
      if (registration.installing || updateFound) return;
      if (needRefreshRef.current || isServiceWorkerReadyForUpdate(registration)) {
        finish("update-available");
        return;
      }
      finish("up-to-date");
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
