import {
  Bell,
  BellOff,
  BellRing,
  Clock3,
  Loader2,
  RefreshCcw,
  Send,
  Share2,
  Smartphone,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { usePushNotifications, type PushNotificationStatus } from "@/hooks/usePushNotifications";
import { cn } from "@/lib/utils";
import type { DisconnectPushResult, TestPushResult } from "@/services/pushNotifications";
import { SettingsSection } from "./SettingsSection";

const statusCopy: Record<PushNotificationStatus, { label: string; description: string }> = {
  loading: {
    label: "Kontrol ediliyor",
    description: "Bildirim durumu kontrol ediliyor.",
  },
  unsupported: {
    label: "Desteklenmiyor",
    description: "Bu cihazda Web Push desteklenmiyor. Güncel ve güvenli bir tarayıcı veya kurulu PWA kullanmayı deneyin.",
  },
  "ios-not-installed": {
    label: "Ana ekrana eklenmeli",
    description: "iPhone veya iPad'de bildirimleri kullanmak için Zen Planner'ı önce Ana Ekran'a ekleyin.",
  },
  "permission-default": {
    label: "Bildirimler kapalı",
    description: "Bu cihaz henüz bildirim izni vermedi ve hesabınıza bağlı değil.",
  },
  "permission-denied": {
    label: "İzin engellenmiş",
    description: "Bildirim izni tarayıcı veya cihaz ayarlarından engellenmiş. İzni ayarlardan açtıktan sonra durumu yeniden kontrol edin.",
  },
  "granted-not-subscribed": {
    label: "İzin var, cihaz bağlı değil",
    description: "Tarayıcı izni açık. Bildirim almak için bu cihazı hesabınıza bağlayın.",
  },
  subscribed: {
    label: "Bu cihaz bağlı",
    description: "Bildirimler bu tarayıcı veya kurulu PWA üzerinden gösterilebilir.",
  },
  error: {
    label: "Kontrol edilemedi",
    description: "Bildirim durumu şu anda doğrulanamadı. Bağlantınızı kontrol edip tekrar deneyin.",
  },
};

const statusBadgeClassName = (status: PushNotificationStatus) => cn(
  "inline-flex max-w-full items-center rounded-full px-2.5 py-1 text-xs font-medium",
  status === "subscribed" && "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  (status === "permission-default" || status === "granted-not-subscribed" || status === "loading") &&
    "bg-stone-100 text-stone-700 dark:bg-muted/40 dark:text-foreground",
  (status === "permission-denied" || status === "error") &&
    "bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
  (status === "unsupported" || status === "ios-not-installed") &&
    "bg-amber-50 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200",
);

const disconnectToast = (result: DisconnectPushResult | null) => {
  if (!result) return;
  if (result.browserUnsubscribed && result.serverRowDeleted) {
    toast.success("Bu cihazda bildirimler kapatıldı.");
  } else if (result.browserUnsubscribed) {
    toast.warning("Tarayıcı aboneliği kapatıldı ancak sunucu kaydı tamamen temizlenemedi.");
  } else if (result.serverRowDeleted) {
    toast.warning("Hesap bağlantısı kaldırıldı ancak tarayıcı aboneliği kapatılamadı.");
  } else {
    toast.error("Bu cihazdaki bildirimler kapatılamadı.");
  }
};

const testPushToast = (result: TestPushResult | null) => {
  if (!result) {
    toast.error("Test bildirimi gönderilemedi.");
    return;
  }
  if (result.subscriptions_found === 0) {
    toast.error("Hesabına bağlı aktif bildirim cihazı bulunamadı.");
  } else if (result.expired_removed > 0 && result.sent === 0) {
    toast.warning("Süresi dolan abonelik temizlendi. Bu cihazı yeniden bağla.");
  } else if (result.sent > 0 && result.failed === 0) {
    toast.success("Test bildirimi gönderildi.", {
      description: "Bildirim hesabına bağlı cihazlara gönderildi.",
    });
  } else if (result.sent > 0 && result.failed > 0) {
    toast.warning("Bildirim bazı cihazlara gönderildi, bazı cihazlarda başarısız oldu.");
  } else {
    toast.error("Test bildirimi gönderilemedi.");
  }
};

export const SettingsNotificationsPage = () => {
  const push = usePushNotifications();
  const copy = statusCopy[push.status];
  const busy = push.activeOperation !== null;

  const handleSubscribe = async () => {
    const success = await push.subscribe();
    if (success) toast.success("Bu cihaz bildirimlere bağlandı.");
    else toast.error("Bu cihaz bildirimlere bağlanamadı.");
  };

  const handleUnsubscribe = async () => {
    disconnectToast(await push.unsubscribe());
  };

  const handleTestPush = async () => {
    testPushToast(await push.testPush());
  };

  const action = (() => {
    if (push.status === "permission-default") {
      return <Button className="w-full sm:w-auto" disabled={busy} onClick={() => void handleSubscribe()}><Bell className="mr-2 h-4 w-4" />Bildirimleri aç</Button>;
    }
    if (push.status === "granted-not-subscribed") {
      return <Button className="w-full sm:w-auto" disabled={busy} onClick={() => void handleSubscribe()}><Smartphone className="mr-2 h-4 w-4" />Bu cihazı bağla</Button>;
    }
    if (["permission-denied", "unsupported", "error"].includes(push.status)) {
      return <Button variant="outline" className="w-full sm:w-auto" disabled={busy} onClick={() => void push.refresh()}><RefreshCcw className="mr-2 h-4 w-4" />{push.status === "permission-denied" ? "Durumu yeniden kontrol et" : "Tekrar dene"}</Button>;
    }
    return null;
  })();

  return (
    <div className="space-y-6 pb-24 md:pb-0">
      <SettingsSection title="Bu cihaz" description="Bu tarayıcı veya kurulu PWA'nın bildirim bağlantısını yönet.">
        <div className="flex min-w-0 flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1 space-y-3" aria-live="polite">
            <div className={statusBadgeClassName(push.status)}>
              {push.status === "loading" && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              <span className="min-w-0 break-words">{copy.label}</span>
            </div>
            <p className="max-w-2xl break-words text-[1rem] leading-7 text-muted-foreground md:text-sm md:leading-6">
              {copy.description}
            </p>
            {push.status === "ios-not-installed" && (
              <div className="rounded-lg bg-muted/45 p-4 text-sm leading-6 text-muted-foreground">
                <p className="flex min-w-0 items-start gap-2"><Share2 className="mt-1 h-4 w-4 shrink-0" /><span className="min-w-0">Safari'de Paylaş'a dokun, “Ana Ekrana Ekle”yi seç ve uygulamayı ana ekran ikonundan aç.</span></p>
              </div>
            )}
          </div>
          {action && <div className="min-w-0 shrink-0 sm:pt-0.5">{action}</div>}
        </div>

        {push.status === "subscribed" && (
          <div className="mt-5 flex min-w-0 flex-col gap-2 border-t border-muted/60 pt-5 sm:flex-row">
            <Button className="w-full sm:w-auto" disabled={busy} onClick={() => void handleTestPush()}>
              {push.isSendingTest ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              {push.isSendingTest ? "Gönderiliyor" : "Test bildirimi gönder"}
            </Button>
            <Button variant="outline" className="w-full sm:w-auto" disabled={busy} onClick={() => void handleUnsubscribe()}>
              {push.activeOperation === "unsubscribe" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BellOff className="mr-2 h-4 w-4" />}
              Bu cihazda kapat
            </Button>
          </div>
        )}
      </SettingsSection>

      <SettingsSection title="Test bildirimi" description="Bildirim teslimatını hesabına bağlı cihazlarda doğrula.">
        <div className="flex min-w-0 items-start gap-3 rounded-lg bg-muted/40 p-4">
          <BellRing className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">Tüm bağlı cihazlar etkilenebilir</p>
            <p className="mt-1 break-words text-sm leading-6 text-muted-foreground">Test bildirimi yalnız bu cihaza değil, hesabına bağlı bütün aktif bildirim cihazlarına gönderilir. Göndermek için önce bu cihazı bağla.</p>
          </div>
        </div>
      </SettingsSection>

      <SettingsSection title="Zamanlanmış bildirimler" description="Görev, alışkanlık ve odak hatırlatmaları sonraki fazda eklenecek.">
        <div className="flex min-w-0 items-start gap-3 rounded-lg border border-dashed border-border/70 p-4">
          <Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <div className="inline-flex rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-700 dark:bg-muted/40 dark:text-foreground">Yakında</div>
            <p className="mt-2 break-words text-sm leading-6 text-muted-foreground">Bu alanda henüz çalışan bir zamanlayıcı, anahtar veya kaydetme aksiyonu yok.</p>
          </div>
        </div>
      </SettingsSection>
    </div>
  );
};
