import { FileClock, Info, Layers3, MessageSquareMore, MonitorSmartphone, NotebookPen, Target, Timer, Workflow } from "lucide-react";
import { SettingsSection } from "./SettingsSection";

const versionLabel = "Geliştirme sürümü";

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
            { label: "Sürüm", value: versionLabel, icon: Layers3 },
            { label: "Durum", value: "Kapalı test / geliştirme", icon: FileClock },
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
      </SettingsSection>

      <SettingsSection title="Geliştirme notları" description="Ayarlar yüzeyi ve ilgili özellikler için mevcut geliştirme çerçevesi.">
        <ul className="space-y-3 text-sm leading-6 text-muted-foreground">
          {developmentNotes.map((note) => (
            <li key={note} className="rounded-lg bg-muted/35 px-4 py-3">
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
            <li key={note} className="rounded-lg bg-muted/35 px-4 py-3">
              {note}
            </li>
          ))}
        </ul>
      </SettingsSection>
    </div>
  );
};
