import { useState, type ReactNode } from "react";
import { SettingsLayout } from "@/components/settings/SettingsLayout";
import { SettingsHomePage } from "@/components/settings/SettingsHomePage";
import { SettingsHabitsPage } from "@/components/settings/SettingsHabitsPage";
import { SettingsDataPrivacyPage } from "@/components/settings/SettingsDataPrivacyPage";
import { SettingsAccountSecurityPage } from "@/components/settings/SettingsAccountSecurityPage";
import { SettingsAboutPage } from "@/components/settings/SettingsAboutPage";
import { SettingsNotificationsPage } from "@/components/settings/SettingsNotificationsPage";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { SettingsModulesPage } from "@/components/settings/SettingsModulesPage";
import { SettingsPomodoroPage } from "@/components/settings/SettingsPomodoroPage";
import { SettingsProjectsPage } from "@/components/settings/SettingsProjectsPage";
import {
  SETTINGS_SECTION_COPY,
  type SettingsSectionKey,
} from "@/components/settings/settingsNavigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
    aria-pressed={active}
    className={cn(
      "inline-flex min-h-11 min-w-0 items-center justify-center rounded-lg px-3 text-center text-[1rem] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring md:h-10 md:min-h-10 md:rounded-md md:px-4 md:text-sm",
      active
        ? "bg-accent font-medium text-foreground dark:bg-accent/35"
        : "bg-muted/55 font-light text-muted-foreground hover:bg-accent/50 hover:text-foreground dark:bg-muted/30 dark:hover:bg-accent/30",
    )}
  >
    {children}
  </button>
);

const SettingRow = ({ label, description, children }: { label: string; description: string; children: ReactNode }) => (
  <div className="grid grid-cols-1 gap-4 rounded-lg bg-muted/25 px-3 py-4 md:grid-cols-[minmax(0,1fr)_240px] md:items-center md:gap-8 md:rounded-none md:bg-transparent md:px-0 md:py-5">
    <div className="min-w-0">
      <h3 className="text-sm font-medium text-foreground">{label}</h3>
      <p className="mt-1 text-[1rem] leading-7 text-muted-foreground md:text-sm md:leading-6">{description}</p>
    </div>
    <div className="min-w-0">{children}</div>
  </div>
);

const ExperienceContent = () => {
  const { startup, setStartup } = useStartupPage();
  const { theme, setTheme } = useTheme();
  const { scale, setScale } = useUiScale();

  const startupValue = startup.type === "module" ? startup.value : "home";

  return (
    <div className="space-y-3 md:divide-y md:divide-muted/70 md:space-y-0">
      <SettingRow
        label="Açılış Sayfası"
        description="Zen Planner'ı açtığında ilk olarak hangi modülün yükleneceğini seç."
      >
        <Select
          value={startupValue}
          onValueChange={(value) => setStartup({ type: "module", value: value as "home" | "pomodoro" | "workHistory" | "journal" | "habits" })}
        >
          <SelectTrigger className="h-11 w-full rounded-lg border-transparent bg-muted/55 text-[1rem] font-light shadow-none dark:bg-muted/30 md:h-10 md:rounded-md md:text-sm">
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
        <div className="grid grid-cols-1 gap-2 min-[390px]:grid-cols-3">
          {([
            ["normal", "Standart"],
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

const PlaceholderContent = ({ lines }: { lines: string[] }) => (
  <div className="space-y-3">
    {lines.map((line) => (
      <div key={line} className="rounded-lg bg-muted/45 px-4 py-3 text-[1rem] text-muted-foreground md:text-sm">
        {line}
      </div>
    ))}
  </div>
);

const renderSectionContent = (section: SettingsSectionKey, onSelectSection: (section: SettingsSectionKey) => void) => {
  if (section === "experience") return <ExperienceContent />;
  if (section === "modules") return <SettingsModulesPage onSelectSection={onSelectSection} />;
  if (section === "home") return <SettingsHomePage />;
  if (section === "habits") return <SettingsHabitsPage />;
  if (section === "tasks-projects") return <SettingsProjectsPage />;
  if (section === "pomodoro-focus") return <SettingsPomodoroPage />;
  if (section === "notifications") return <SettingsNotificationsPage />;
  if (section === "data-privacy") return <SettingsDataPrivacyPage />;
  if (section === "account-security") return <SettingsAccountSecurityPage />;
  if (section === "about") return <SettingsAboutPage />;
  return <PlaceholderContent lines={[shellNote]} />;
};

const SettingsPage = () => {
  const [activeSection, setActiveSection] = useState<SettingsSectionKey>("experience");
  const copy = SETTINGS_SECTION_COPY[activeSection];

  return (
    <SettingsLayout activeSection={activeSection} onSelectSection={setActiveSection}>
      <div className={cn("mb-8", activeSection === "home" && "hidden md:block")}>
        <h1 className="text-3xl font-medium tracking-normal text-foreground">{copy.title}</h1>
        <p className="mt-2 max-w-2xl text-[1rem] leading-7 text-muted-foreground md:text-sm md:leading-6">{copy.description}</p>
      </div>
      {activeSection === "experience" || activeSection === "modules" || activeSection === "home" || activeSection === "tasks-projects" || activeSection === "pomodoro-focus" || activeSection === "habits" || activeSection === "notifications" || activeSection === "data-privacy" || activeSection === "account-security" || activeSection === "about" ? (
        renderSectionContent(activeSection, setActiveSection)
      ) : (
        <SettingsSection title={copy.title} description={copy.description}>
          {renderSectionContent(activeSection, setActiveSection)}
        </SettingsSection>
      )}
    </SettingsLayout>
  );
};

export default SettingsPage;
