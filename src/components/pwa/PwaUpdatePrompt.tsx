import { useEffect } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { toast } from "@/components/ui/sonner";

export const PwaUpdatePrompt = () => {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisterError(error) {
      console.error("[PWA] Service worker registration failed", error);
    },
  });

  useEffect(() => {
    if (!offlineReady) return;
    toast("Zen Planner hazır", {
      id: "pwa-offline-ready",
      description: "Uygulama kabuğu çevrimdışı açılabilir. Veriler için internet gerekebilir.",
      duration: 4500,
      onDismiss: () => setOfflineReady(false),
      onAutoClose: () => setOfflineReady(false),
    });
  }, [offlineReady, setOfflineReady]);

  useEffect(() => {
    if (!needRefresh) return;
    toast("Zen Planner güncellendi", {
      id: "pwa-update-ready",
      description: "Yeni sürümü kullanmak için sayfayı yenileyin.",
      duration: Infinity,
      action: {
        label: "Yenile",
        onClick: () => {
          void updateServiceWorker(true);
        },
      },
      cancel: {
        label: "Sonra",
        onClick: () => setNeedRefresh(false),
      },
    });
  }, [needRefresh, setNeedRefresh, updateServiceWorker]);

  return null;
};
