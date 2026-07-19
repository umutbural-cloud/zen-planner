export type PwaUpdateActionDeps = {
  updateServiceWorker: () => Promise<void>;
  setStatus: (status: "idle" | "checking" | "update-available" | "up-to-date" | "unsupported" | "error") => void;
  setNeedRefresh: (value: boolean) => void;
  clearNeedRefreshRef: () => void;
  isUpdateInProgress: () => boolean;
  setUpdateInProgress: (value: boolean) => void;
  onReload: () => void;
};

const UPDATE_RELOAD_TIMEOUT_MS = 15000;

export const runPwaUpdateNow = async ({
  updateServiceWorker,
  setStatus,
  setNeedRefresh,
  clearNeedRefreshRef,
  isUpdateInProgress,
  setUpdateInProgress,
  onReload,
}: PwaUpdateActionDeps) => {
  if (typeof window === "undefined" || typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    setStatus("unsupported");
    return;
  }

  if (isUpdateInProgress()) return;

  setUpdateInProgress(true);
  setStatus("checking");

  const controllerChangeTarget = navigator.serviceWorker;
  let timeoutId: number | null = null;
  let reloaded = false;

  try {
    await new Promise<void>((resolve, reject) => {
      const cleanup = () => {
        controllerChangeTarget.removeEventListener("controllerchange", handleControllerChange);
        if (timeoutId !== null) {
          window.clearTimeout(timeoutId);
          timeoutId = null;
        }
      };

      const finish = (nextStatus: "idle" | "checking" | "update-available" | "up-to-date" | "unsupported" | "error") => {
        cleanup();
        setNeedRefresh(false);
        clearNeedRefreshRef();
        setStatus(nextStatus);
        setUpdateInProgress(false);
        resolve();
      };

      const fail = (error: unknown) => {
        cleanup();
        console.error("[PWA] Update activation failed", error);
        setStatus("error");
        setUpdateInProgress(false);
        reject(error instanceof Error ? error : new Error("Update activation failed"));
      };

      const handleControllerChange = () => {
        if (reloaded) return;
        reloaded = true;
        finish("up-to-date");
        try {
          onReload();
        } catch (error) {
          fail(error);
        }
      };

      controllerChangeTarget.addEventListener("controllerchange", handleControllerChange);
      timeoutId = window.setTimeout(() => fail(new Error("Service worker controller change timeout")), UPDATE_RELOAD_TIMEOUT_MS);

      void updateServiceWorker().catch((error) => {
        fail(error);
      });
    });
  } catch {
    // status already set in fail()
  } finally {
    setUpdateInProgress(false);
  }
};
