import { FileClock, Info, Layers3, Loader2, MessageSquareMore, MonitorSmartphone, NotebookPen, RefreshCcw, Target, Timer, Workflow } from "lucide-react";
import { SettingsSection } from "./SettingsSection";
import { Button } from "@/components/ui/button";
import { usePwaUpdate } from "@/components/pwa/PwaUpdateProvider";
import { APP_VERSION, VERSION_HISTORY } from "@/lib/appVersion";

const productAreas = [
  { title: "Odak", description: "Günlük planlama ve yapılacak işler", icon: Target },
  { title: "Rutin", description: "Alışkanlık takibi ve gün dilimleri", icon: NotebookPen },
  { title: "Çalışma", description: "Pomodoro ve çalışma geçmişi", icon: Timer },
  { title: "Düzen", description: "Projeler, notlar ve görev görünümleri", icon: Workflow },
];

const developmentNotes = [
  "Ayarlar sayfası masaüstü web deneyimi için yeniden düzenleniyor.",
  "Mobil ayarlar görünümü ayrı polish fazında ele alınacak.",
  "DB gerektiren ayarlar ayrı migration fazlarında geliştirilecek.",
  "Push bildirimler ve gelişmiş güvenlik özellikleri sonraki fazlarda eklenecek.",
];

const feedbackNotes = [
  { title: "Hata bildirimi", description: "Ekran, işlem adımı ve beklenen davranışı paylaş." },
  { title: "Tasarım önerisi", description: "Hangi sayfada neyin zorlaştığını belirt." },
  { title: "Veri güvenliği", description: "Kişisel içeriklerini paylaşmadan sorunu tarif etmeye çalış." },
];

const licenseNotes = [
  "Erişim kişisel ve devredilemezdir.",
  "Test özellikleri zaman içinde değişebilir.",
  "Production davranışları merge ve deploy sonrası ayrıca doğrulanır.",
];

export const SettingsAboutPage = () => {
  const { needRefresh, status, lastCheckedAt, checkForUpdate, updateNow } = usePwaUpdate();
  const checking = status === "checking";
  const updateAvailable = needRefresh || status === "update-available";
  const updateButtonLabel = updateAvailable
    ? "Güncelle"
    : status === "checking"
      ? "Kontrol ediliyor"
      : status === "unsupported"
        ? "PWA desteklenmiyor"
        : status === "error"
          ? "Kontrol edilemedi"
          : status === "idle"
            ? "Kontrol edilmedi"
            : "Sürümünüz güncel";

  return (
    <div className="space-y-6">
      <SettingsSection
        title="Zen Planner"
        description="Zen Planner; görevler, projeler, alışkanlıklar ve odak oturumlarını sakin bir çalışma akışında bir araya getiren kişisel planlama uygulamasıdır."
      >
        <div className="divide-y divide-muted/60">
          {productAreas.map((item) => {
            const Icon = item.icon;

            return (
              <div key={item.title} className="flex items-start gap-3 py-4 first:pt-0 last:pb-0">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted/45 text-muted-foreground">
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-foreground">{item.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </SettingsSection>

      <SettingsSection title="Sürüm bilgisi" description="Zen Planner'ın mevcut sürüm ve platform durumu.">
        <div className="divide-y divide-muted/60">
          {[
            { label: "Uygulama", value: "Zen Planner", icon: Info },
            { label: "Sürüm", value: APP_VERSION, icon: Layers3 },
            { label: "Durum", value: "Kapalı test / 1.0.0 yayına hazırlık", icon: FileClock },
            { label: "Platform", value: "Web / PWA", icon: MonitorSmartphone },
          ].map((item) => {
            const Icon = item.icon;

            return (
              <div key={item.label} className="grid grid-cols-[180px_minmax(0,1fr)] gap-4 py-4 first:pt-0 last:pb-0">
                <div className="flex items-center gap-3 text-sm font-medium text-foreground">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted/45 text-muted-foreground">
                    <Icon className="h-4 w-4" />
                  </div>
                  <span>{item.label}</span>
                </div>
                <p className="text-sm leading-6 text-muted-foreground">{item.value}</p>
              </div>
            );
          })}
        </div>

        <div className="mt-5 rounded-lg bg-muted/35 px-4 py-4 dark:bg-muted/30">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-medium text-foreground">PWA güncellemesi</h3>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Yeni bir PWA sürümü yayınlandıysa güncelleme burada görünür.
              </p>
              {lastCheckedAt && (
                <p className="mt-1 text-xs text-muted-foreground/80">
                  Son kontrol: {lastCheckedAt.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
                </p>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={checking}
                onClick={() => void checkForUpdate()}
                className="h-9 px-3 text-xs text-muted-foreground hover:bg-accent/50 hover:text-foreground"
              >
                {checking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCcw className="h-3.5 w-3.5" strokeWidth={1.7} />}
                Sürüm bilgisini kontrol et
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={!updateAvailable}
                onClick={() => void updateNow()}
                className="h-9 px-3 text-xs"
              >
                {updateButtonLabel}
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-5 space-y-2">
          {VERSION_HISTORY.map((item) => (
            <div key={item.version} className="rounded-lg bg-muted/35 px-4 py-3 dark:bg-muted/30">
              <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-foreground">
                <span>{item.version}</span>
                <span className="text-muted-foreground">—</span>
                <span>{item.label}</span>
              </div>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.description}</p>
            </div>
          ))}
        </div>
      </SettingsSection>

      <SettingsSection title="Geliştirme notları" description="Ayarlar yüzeyi ve ilgili özellikler için mevcut geliştirme çerçevesi.">
        <ul className="space-y-3 text-sm leading-6 text-muted-foreground">
          {developmentNotes.map((note) => (
            <li key={note} className="rounded-lg bg-muted/35 px-4 py-3 dark:bg-muted/30">
              {note}
            </li>
          ))}
        </ul>
      </SettingsSection>

      <SettingsSection title="Geri bildirim" description="Kapalı test sürecinde karşılaştığın sorunları ve önerilerini uygulama yöneticisine iletebilirsin.">
        <div className="divide-y divide-muted/60">
          {feedbackNotes.map((item) => (
            <div key={item.title} className="flex items-start gap-3 py-4 first:pt-0 last:pb-0">
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted/45 text-muted-foreground">
                <MessageSquareMore className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-foreground">{item.title}</h3>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </SettingsSection>

      <SettingsSection title="Lisans ve notlar" description="Bu uygulama kapalı test ve geliştirme süreci kapsamında kullanılmaktadır.">
        <ul className="space-y-3 text-sm leading-6 text-muted-foreground">
          {licenseNotes.map((note) => (
            <li key={note} className="rounded-lg bg-muted/35 px-4 py-3 dark:bg-muted/30">
              {note}
            </li>
          ))}
        </ul>
      </SettingsSection>
    </div>
  );
};
