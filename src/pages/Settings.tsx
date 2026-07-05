import { useState, type ReactNode } from "react";
import { Check, ChevronRight } from "lucide-react";
import { SettingsLayout } from "@/components/settings/SettingsLayout";
import { SettingsSection } from "@/components/settings/SettingsSection";
import {
  MODULE_SETTING_ROWS,
  SETTINGS_SECTION_COPY,
  type SettingsSectionKey,
} from "@/components/settings/settingsNavigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useModuleLabels } from "@/hooks/useModuleLabels";
import { useSidebarPreferences } from "@/hooks/useSidebarPreferences";
import { useStartupPage } from "@/hooks/useStartupPage";
import { useTheme, type Theme } from "@/hooks/useTheme";
import { useUiScale, type UiScale } from "@/hooks/useUiScale";
import { cn } from "@/lib/utils";

const shellNote = "Bu bölüm sonraki fazda mevcut ayarlarla bağlanacak.";

const ChoiceButton = ({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      "inline-flex h-10 items-center justify-center rounded-md px-4 text-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
      active ? "bg-accent font-medium text-foreground" : "bg-muted/55 font-light text-muted-foreground hover:bg-accent/50 hover:text-foreground",
    )}
  >
    {children}
  </button>
);

const SettingRow = ({ label, description, children }: { label: string; description: string; children: ReactNode }) => (
  <div className="grid grid-cols-[minmax(0,1fr)_240px] items-center gap-8 py-5">
    <div>
      <h3 className="text-sm font-medium text-foreground">{label}</h3>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
    </div>
    <div>{children}</div>
  </div>
);

const ExperienceContent = () => {
  const { startup, setStartup } = useStartupPage();
  const { theme, setTheme } = useTheme();
  const { scale, setScale } = useUiScale();

  const startupValue = startup.type === "module" ? startup.value : "home";

  return (
    <div className="divide-y divide-muted/70">
      <SettingRow
        label="Açılış Sayfası"
        description="Zen Planner'ı açtığında ilk olarak hangi modülün yükleneceğini seç."
      >
        <Select
          value={startupValue}
          onValueChange={(value) => setStartup({ type: "module", value: value as "home" | "pomodoro" | "workHistory" | "journal" | "habits" })}
        >
          <SelectTrigger className="h-10 rounded-md border-transparent bg-muted/55 text-sm font-light shadow-none">
            <SelectValue placeholder="Ana Sayfa" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="home">Ana Sayfa</SelectItem>
            <SelectItem value="pomodoro">Pomodoro</SelectItem>
            <SelectItem value="workHistory">Çalışma Geçmişi</SelectItem>
            <SelectItem value="journal">Günlük</SelectItem>
            <SelectItem value="habits">Alışkanlıklar</SelectItem>
          </SelectContent>
        </Select>
      </SettingRow>

      <SettingRow label="Tema" description="Uygulamanın genel görünümünü aydınlık veya karanlık olarak seç.">
        <div className="grid grid-cols-2 gap-2">
          {(["light", "dark"] as Theme[]).map((item) => (
            <ChoiceButton key={item} active={theme === item} onClick={() => setTheme(item)}>
              {item === "light" ? "Aydınlık" : "Karanlık"}
            </ChoiceButton>
          ))}
        </div>
      </SettingRow>

      <SettingRow label="Arayüz Boyutu" description="Metin ve arayüz ölçeğini okuma rahatlığına göre ayarla.">
        <div className="grid grid-cols-3 gap-2">
          {([
            ["normal", "Normal"],
            ["large", "Büyük"],
            ["xlarge", "Çok Büyük"],
          ] as [UiScale, string][]).map(([value, label]) => (
            <ChoiceButton key={value} active={scale === value} onClick={() => setScale(value)}>
              {label}
            </ChoiceButton>
          ))}
        </div>
      </SettingRow>
    </div>
  );
};

const ModulesContent = () => {
  const { prefs } = useSidebarPreferences();
  const { get: moduleLabel } = useModuleLabels();
  const moduleStatus = new Map<string, boolean>([
    ["Günlük", prefs.journal],
    ["Alışkanlıklar", prefs.habits],
    ["Pomodoro ve Odak", prefs.pomodoro],
    ["Çalışma Geçmişi", prefs.workHistory],
  ]);

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-muted/45 px-4 py-3 text-sm leading-6 text-muted-foreground">
        Modül görünürlüğü ve isimlendirme ayarları mevcut yapıya bağlı kalacak şekilde sonraki fazda genişletilecek.
      </div>
      <div className="divide-y divide-muted/70">
        {MODULE_SETTING_ROWS.map((row) => {
          const visible = moduleStatus.get(row);
          const label = row === "Günlük"
            ? moduleLabel("journal")
            : row === "Alışkanlıklar"
              ? moduleLabel("habits")
              : row === "Çalışma Geçmişi"
                ? moduleLabel("workHistory")
                : row;
          return (
            <div key={row} className="flex items-center justify-between gap-4 py-4">
              <div>
                <h3 className="text-sm font-medium text-foreground">{label}</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  {visible === undefined ? "Çekirdek alan" : visible ? "Aktif modül" : "Sidebar'da gizli"}
                </p>
              </div>
              <span className="inline-flex items-center gap-2 rounded-md bg-muted/55 px-3 py-1.5 text-xs font-light text-muted-foreground">
                {visible === undefined || visible ? <Check className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                {visible === undefined || visible ? "Görünür" : "Pasif"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const PlaceholderContent = ({ lines }: { lines: string[] }) => (
  <div className="space-y-3">
    {lines.map((line) => (
      <div key={line} className="rounded-lg bg-muted/45 px-4 py-3 text-sm text-muted-foreground">
        {line}
      </div>
    ))}
  </div>
);

const renderSectionContent = (section: SettingsSectionKey) => {
  if (section === "experience") return <ExperienceContent />;
  if (section === "modules") return <ModulesContent />;
  if (section === "notifications") {
    return <PlaceholderContent lines={["Bildirim merkezi hazırlanıyor", "Tarayıcı bildirim izni bu panelde bilgi satırı olarak yönetilecek."]} />;
  }
  if (section === "data-privacy") {
    return <PlaceholderContent lines={["Veri dışa aktarma ve içe aktarma alanı sonraki fazda taşınacak.", shellNote]} />;
  }
  if (section === "account-security") {
    return <PlaceholderContent lines={["Profil, giriş e-postası ve şifre yönetimi sonraki fazda taşınacak.", shellNote]} />;
  }
  if (section === "about") {
    return <PlaceholderContent lines={["Sürüm durumu placeholder", "PWA durumu placeholder", "Güncelleme durumu placeholder"]} />;
  }
  return <PlaceholderContent lines={[shellNote]} />;
};

const SettingsPage = () => {
  const [activeSection, setActiveSection] = useState<SettingsSectionKey>("experience");
  const copy = SETTINGS_SECTION_COPY[activeSection];

  return (
    <SettingsLayout activeSection={activeSection} onSelectSection={setActiveSection}>
      <div className="mb-8">
        <h1 className="text-3xl font-medium tracking-normal text-foreground">{copy.title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{copy.description}</p>
      </div>
      <SettingsSection title={copy.title} description={copy.description}>
        {renderSectionContent(activeSection)}
      </SettingsSection>
    </SettingsLayout>
  );
};

export default SettingsPage;
