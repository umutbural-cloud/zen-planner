import { useEffect } from "react";
import { toast } from "@/components/ui/sonner";
import { usePwaUpdate } from "./PwaUpdateProvider";

export const PwaUpdatePrompt = () => {
  const {
    offlineReady,
    needRefresh,
    updateNow,
    dismissOfflineReady,
    dismissUpdate,
  } = usePwaUpdate();

  useEffect(() => {
    if (!offlineReady) return;
    toast("Zen Planner hazır", {
      id: "pwa-offline-ready",
      description: "Uygulama kabuğu çevrimdışı açılabilir. Veriler için internet gerekebilir.",
      duration: 4500,
      onDismiss: dismissOfflineReady,
      onAutoClose: dismissOfflineReady,
    });
  }, [dismissOfflineReady, offlineReady]);

  useEffect(() => {
    if (!needRefresh) return;
    toast("Zen Planner güncellendi", {
      id: "pwa-update-ready",
      description: "Yeni sürümü kullanmak için sayfayı yenileyin.",
      duration: Infinity,
      action: {
        label: "Yenile",
        onClick: () => {
          void updateNow();
        },
      },
      cancel: {
        label: "Sonra",
        onClick: dismissUpdate,
      },
    });
  }, [dismissUpdate, needRefresh, updateNow]);

  return null;
};
