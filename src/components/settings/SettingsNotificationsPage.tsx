import { useMemo, useState } from "react";
import { Bell, BellRing, Clock3, LayoutList, MonitorSmartphone, Timer } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SettingsSection } from "./SettingsSection";

type NotificationPermissionState = NotificationPermission | "unsupported";

const upcomingItems = [
  {
    title: "Görev hatırlatmaları",
    description: "Zamanı yaklaşan görevler için yerel ve push tabanlı hatırlatma akışı.",
    icon: LayoutList,
  },
  {
    title: "Pomodoro bitiş bildirimi",
    description: "Odak ve mola oturumları tamamlandığında cihaz bildirimleri.",
    icon: Timer,
  },
  {
    title: "Alışkanlık hatırlatmaları",
    description: "Gün dilimlerine göre hatırlatma ve kaçırılan rutin özeti.",
    icon: BellRing,
  },
  {
    title: "Günlük plan bildirimi",
    description: "Günün planını ve öncelikli alanları öne çıkaran sabah özeti.",
    icon: Clock3,
  },
  {
    title: "Cihazlar arası bildirim ayarları",
    description: "Hangi cihazda hangi bildirimlerin görüneceğini yönetme alanı.",
    icon: MonitorSmartphone,
  },
];

const getPermissionState = (): NotificationPermissionState => (
  typeof Notification === "undefined" ? "unsupported" : Notification.permission
);

const permissionCopy: Record<NotificationPermissionState, { label: string; description: string }> = {
  unsupported: {
    label: "Desteklenmiyor",
    description: "Bu tarayıcı bildirimleri desteklemiyor.",
  },
  granted: {
    label: "İzin verilmiş",
    description: "Bu tarayıcı Zen Planner bildirimlerini gösterebilir.",
  },
  default: {
    label: "İzin bekliyor",
    description: "Bildirim göstermek için izin istenebilir.",
  },
  denied: {
    label: "Engellenmiş",
    description: "Bildirimler tarayıcı ayarlarından engellenmiş. İzni tarayıcı ayarlarından değiştirmen gerekir.",
  },
};

const statusBadgeClassName = (state: NotificationPermissionState) => cn(
  "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
  state === "granted" && "bg-emerald-50 text-emerald-700",
  state === "default" && "bg-stone-100 text-stone-700",
  state === "denied" && "bg-rose-50 text-rose-700",
  state === "unsupported" && "bg-stone-200 text-stone-700",
);

export const SettingsNotificationsPage = () => {
  const [permission, setPermission] = useState<NotificationPermissionState>(() => getPermissionState());
  const copy = useMemo(() => permissionCopy[permission], [permission]);

  const permissionButton = useMemo(() => {
    if (permission === "unsupported") {
      return { label: "Bildirim desteği yok", disabled: true };
    }
    if (permission === "granted") {
      return { label: "Bildirimler açık", disabled: true };
    }
    if (permission === "denied") {
      return { label: "Tarayıcı ayarlarından aç", disabled: false };
    }
    return { label: "Bildirim izni iste", disabled: false };
  }, [permission]);

  const requestPermission = async () => {
    if (typeof Notification === "undefined") {
      setPermission("unsupported");
      toast.error("Bu tarayıcı bildirimleri desteklemiyor.");
      return;
    }

    if (Notification.permission === "granted") {
      setPermission("granted");
      toast("Bildirimler zaten açık.");
      return;
    }

    if (Notification.permission === "denied") {
      setPermission("denied");
      toast.error("Bildirimler engellenmiş. Tarayıcı ayarlarından izin ver.");
      return;
    }

    const result = await Notification.requestPermission();
    setPermission(result);

    if (result === "granted") {
      toast.success("Bildirimler açıldı.");
      return;
    }

    toast.error("Bildirim izni verilmedi.");
  };

  return (
    <div className="space-y-6">
      <SettingsSection title="Bildirim merkezi hazırlanıyor" description="Görev hatırlatmaları, Pomodoro bitiş bildirimleri, alışkanlık hatırlatmaları ve günlük plan bildirimleri bu alanda toplanacak.">
        <div className="space-y-4">
          <div className="inline-flex items-center rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-700">
            Yakında
          </div>
          <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
            Bu özellik cihaz desteği, tarayıcı izinleri ve güvenli push altyapısı gerektirir. Bu nedenle ayrı bir fazda geliştirilecek.
          </p>
        </div>
      </SettingsSection>

      <SettingsSection title="Tarayıcı bildirim izni" description="Bu cihazda bildirimlerin açılıp açılamayacağını kontrol et.">
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div className="space-y-3">
            <div className={statusBadgeClassName(permission)} aria-live="polite">
              {copy.label}
            </div>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
              {copy.description}
            </p>
          </div>
          <div className="shrink-0">
            <Button
              type="button"
              variant="secondary"
              className="h-10 rounded-md border-transparent bg-muted/55 px-4 text-sm font-medium text-foreground shadow-none hover:bg-muted"
              onClick={() => void requestPermission()}
              disabled={permissionButton.disabled}
            >
              <Bell className="mr-2 h-4 w-4" />
              {permissionButton.label}
            </Button>
          </div>
        </div>
      </SettingsSection>

      <SettingsSection title="Sonraki fazda gelecekler" description="Bildirim deneyimi tamamlandığında bu alanlardan yönetilecek başlıklar.">
        <div className="divide-y divide-muted/60">
          {upcomingItems.map((item) => {
            const Icon = item.icon;

            return (
              <div key={item.title} className="flex items-start justify-between gap-4 py-4 first:pt-0 last:pb-0">
                <div className="flex min-w-0 gap-3">
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted/55 text-muted-foreground">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-medium text-foreground">{item.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.description}</p>
                  </div>
                </div>
                <div className="shrink-0 rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-700">
                  Yakında
                </div>
              </div>
            );
          })}
        </div>
      </SettingsSection>
    </div>
  );
};
