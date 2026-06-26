import { useEffect } from "react";
import { toast } from "@/components/ui/sonner";

const CHUNK_RELOAD_ATTEMPTED_AT_KEY = "zen:pwa-chunk-reload-attempted-at";
const CHUNK_RELOAD_GUARD_MS = 1000 * 60 * 10;
const CHUNK_ERROR_PATTERNS = [
  /ChunkLoadError/i,
  /Failed to fetch dynamically imported module/i,
  /Importing a module script failed/i,
  /Loading chunk/i,
];

const getErrorText = (reason: unknown) => {
  if (reason instanceof Error) return `${reason.name} ${reason.message}`;
  if (typeof reason === "string") return reason;
  return "";
};

const isChunkLoadFailure = (reason: unknown) => CHUNK_ERROR_PATTERNS.some((pattern) => pattern.test(getErrorText(reason)));

const canAttemptReload = () => {
  const lastAttempt = Number(window.sessionStorage.getItem(CHUNK_RELOAD_ATTEMPTED_AT_KEY) ?? 0);
  return !Number.isFinite(lastAttempt) || Date.now() - lastAttempt > CHUNK_RELOAD_GUARD_MS;
};

export const ChunkLoadHandler = () => {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleChunkFailure = (reason: unknown) => {
      if (!isChunkLoadFailure(reason)) return;

      if (canAttemptReload()) {
        window.sessionStorage.setItem(CHUNK_RELOAD_ATTEMPTED_AT_KEY, String(Date.now()));
        toast("Zen Planner güncellendi", {
          id: "pwa-chunk-reload",
          description: "Kırık parça referansını temizlemek için sayfa yenileniyor.",
          duration: 1800,
        });
        window.setTimeout(() => window.location.reload(), 1200);
        return;
      }

      toast("Zen Planner güncellendi", {
        id: "pwa-chunk-reload-manual",
        description: "Sayfa eski bir dosyaya bakıyor. Devam etmek için yenileyin.",
        duration: Infinity,
        action: {
          label: "Yenile",
          onClick: () => window.location.reload(),
        },
      });
    };

    const handleError = (event: ErrorEvent) => handleChunkFailure(event.error ?? event.message);
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => handleChunkFailure(event.reason);

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, []);

  return null;
};
