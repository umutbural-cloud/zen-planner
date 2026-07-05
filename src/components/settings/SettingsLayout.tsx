import type { ReactNode } from "react";
import { SettingsSidebar } from "./SettingsSidebar";
import type { SettingsSectionKey } from "./settingsNavigation";

type SettingsLayoutProps = {
  activeSection: SettingsSectionKey;
  onSelectSection: (section: SettingsSectionKey) => void;
  children: ReactNode;
};

export const SettingsLayout = ({ activeSection, onSelectSection, children }: SettingsLayoutProps) => (
  <div className="min-h-screen bg-[#f5f3f2]">
    <SettingsSidebar activeSection={activeSection} onSelect={onSelectSection} />
    <main className="ml-64 min-h-screen px-10 py-10">
      <div className="mx-auto w-full max-w-4xl">{children}</div>
    </main>
  </div>
);
