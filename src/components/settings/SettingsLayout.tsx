import type { ReactNode } from "react";
import { SettingsMobileHeader } from "./SettingsMobileHeader";
import { SettingsSidebar } from "./SettingsSidebar";
import type { SettingsSectionKey } from "./settingsNavigation";

type SettingsLayoutProps = {
  activeSection: SettingsSectionKey;
  onSelectSection: (section: SettingsSectionKey) => void;
  children: ReactNode;
};

export const SettingsLayout = ({ activeSection, onSelectSection, children }: SettingsLayoutProps) => (
  <div className="min-h-screen overflow-x-hidden bg-[#f5f3f2] text-foreground dark:bg-background">
    <SettingsMobileHeader activeSection={activeSection} onSelect={onSelectSection} />
    <SettingsSidebar activeSection={activeSection} onSelect={onSelectSection} />
    <main className="min-h-screen px-4 pb-[calc(5rem+env(safe-area-inset-bottom))] pt-4 md:ml-64 md:px-10 md:py-10">
      <div className="mx-auto w-full max-w-4xl">{children}</div>
    </main>
  </div>
);
