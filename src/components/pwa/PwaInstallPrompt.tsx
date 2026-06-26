import { useEffect, useState } from "react";
import { toast } from "@/components/ui/sonner";

type BeforeInstallPromptChoice = {
  outcome: "accepted" | "dismissed";
  platform: string;
};

type BeforeInstallPromptEvent = Event & {
  readonly platforms: string[];
  readonly userChoice: Promise<BeforeInstallPromptChoice>;
  prompt: () => Promise<void>;
};

const INSTALL_DISMISSED_AT_KEY = "zen:pwa-install-dismissed-at";
const INSTALL_PROMPT_COOLDOWN_MS = 1000 * 60 * 60 * 24 * 14;

const isStandalone = () => {
  if (typeof window === "undefined") return false;
  const navigatorWithStandalone = window.navigator as Navigator & { standalone?: boolean };
  return window.matchMedia("(display-mode: standalone)").matches || navigatorWithStandalone.standalone === true;
};

const isIosSafari = () => {
  if (typeof window === "undefined") return false;
  const userAgent = window.navigator.userAgent;
  const isIos = /iPad|iPhone|iPod/.test(userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isSafari = /Safari/.test(userAgent) && !/CriOS|FxiOS|EdgiOS/.test(userAgent);
  return isIos && isSafari;
};

const isCoolingDown = () => {
  const dismissedAt = Number(window.localStorage.getItem(INSTALL_DISMISSED_AT_KEY) ?? 0);
  return Number.isFinite(dismissedAt) && Date.now() - dismissedAt < INSTALL_PROMPT_COOLDOWN_MS;
};

const dismissInstallPrompt = () => {
  window.localStorage.setItem(INSTALL_DISMISSED_AT_KEY, String(Date.now()));
};

export const PwaInstallPrompt = () => {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || isStandalone()) return;

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      if (isCoolingDown()) return;
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setInstallPrompt(null);
      toast.dismiss("pwa-install");
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  useEffect(() => {
    if (!installPrompt || isStandalone()) return;

    toast("Zen Planner kurulabilir", {
      id: "pwa-install",
      description: "Ana ekrana ekleyerek ayrı pencere olarak açabilirsiniz.",
      duration: Infinity,
      action: {
        label: "Kur",
        onClick: () => {
          void installPrompt.prompt().then(() => installPrompt.userChoice).finally(() => {
            setInstallPrompt(null);
            dismissInstallPrompt();
          });
        },
      },
      cancel: {
        label: "Sonra",
        onClick: () => {
          setInstallPrompt(null);
          dismissInstallPrompt();
        },
      },
    });
  }, [installPrompt]);

  useEffect(() => {
    if (typeof window === "undefined" || isStandalone() || !isIosSafari() || isCoolingDown()) return;

    toast("Zen Planner ana ekrana eklenebilir", {
      id: "pwa-install-ios",
      description: "iOS Safari'de Paylaş > Ana Ekrana Ekle yolunu kullanın.",
      duration: 9000,
      cancel: {
        label: "Kapat",
        onClick: dismissInstallPrompt,
      },
      onDismiss: dismissInstallPrompt,
      onAutoClose: dismissInstallPrompt,
    });
  }, []);

  return null;
};
