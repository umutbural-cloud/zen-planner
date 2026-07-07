import { CheckCircle2, FileArchive, LockKeyhole, Trash2 } from "lucide-react";
import { DataPortabilityPanel } from "@/features/data-portability/components/DataPortabilityPanel";
import { SettingsSection } from "./SettingsSection";

const privacyPrinciples = [
  {
    title: "Veri kontrolü kullanıcıdadır",
    description: "Dışa aktarma ve içe aktarma işlemleri kullanıcı aksiyonuyla başlar.",
  },
  {
    title: "Kişisel içerik merkezli gizlilik",
    description: "Ayarlar sayfası kişisel içerikleri analiz etmek için kullanılmaz.",
  },
  {
    title: "Aşamalı güvenli silme",
    description: "Hard-delete davranışları ayrı güvenlik fazlarında ele alınır.",
  },
];

const futureItems = [
  "Gelişmiş çöp kutusu yönetimi",
  "Daha ayrıntılı import/export seçenekleri",
  "Silme davranışı denetimleri",
  "Gizlilik ve veri kullanım açıklamaları",
];

export const SettingsDataPrivacyPage = () => {
  return (
    <div className="space-y-6">
      <SettingsSection
        title="Veri aktarımı"
        description="Zen Planner verilerini yedekle veya daha önce aldığın yedeği içe aktar."
      >
        <div className="space-y-5">
          <div className="rounded-lg bg-muted/35 px-4 py-4">
            <DataPortabilityPanel />
          </div>
          <p className="text-sm leading-6 text-muted-foreground">
            İçe aktarma işleminden önce dosya içeriği doğrulanır.
          </p>
        </div>
      </SettingsSection>

      <SettingsSection
        title="Çöp kutusu ve silme davranışı"
        description="Silinen görevler, projeler ve desteklenen kayıtlar önce çöp kutusuna taşınır."
      >
        <div className="space-y-3">
          <div className="flex items-start gap-3 rounded-lg bg-muted/35 px-4 py-4">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-white text-muted-foreground">
              <Trash2 className="h-4 w-4" />
            </div>
            <div className="space-y-2">
              <p className="text-sm leading-6 text-muted-foreground">Bu sayfa yeni silme işlemi başlatmaz.</p>
              <ul className="space-y-2 text-sm leading-6 text-muted-foreground">
                <li>Geri yükleme ayrı bir işlemdir.</li>
                <li>Kalıcı silme ayrıca onay gerektirir.</li>
                <li>Bazı kayıt türleri için soft-delete desteği fazlara ayrılmıştır.</li>
                <li>Bu sayfa yeni silme işlemi başlatmaz.</li>
              </ul>
            </div>
          </div>
        </div>
      </SettingsSection>

      <SettingsSection
        title="Gizlilik yaklaşımı"
        description="Kişisel içeriklerin uygulamanın temel çalışma akışı dışında görüntülenmez veya analiz edilmez."
      >
        <div className="divide-y divide-muted/60">
          {privacyPrinciples.map((item) => (
            <div key={item.title} className="flex items-start gap-3 py-4 first:pt-0 last:pb-0">
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted/45 text-muted-foreground">
                <LockKeyhole className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-foreground">{item.title}</h3>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </SettingsSection>

      <SettingsSection
        title="Sonraki fazlarda"
        description="Veri taşınabilirliği ve gizlilik deneyiminde genişletilecek alanlar."
      >
        <div className="divide-y divide-muted/60">
          {futureItems.map((item) => (
            <div key={item} className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted/45 text-muted-foreground">
                  <FileArchive className="h-4 w-4" />
                </div>
                <p className="text-sm text-foreground">{item}</p>
              </div>
              <div className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-700">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Yakında
              </div>
            </div>
          ))}
        </div>
      </SettingsSection>
    </div>
  );
};
