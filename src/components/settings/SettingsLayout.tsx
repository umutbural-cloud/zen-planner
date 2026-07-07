import type { ReactNode } from "react";
import MobileBottomNav from "@/components/mobile/MobileBottomNav";
import { SettingsMobileHeader } from "./SettingsMobileHeader";
import { SettingsSidebar } from "./SettingsSidebar";
import type { SettingsSectionKey } from "./settingsNavigation";
import { useProjects } from "@/hooks/useProjects";

type SettingsLayoutProps = {
  activeSection: SettingsSectionKey;
  onSelectSection: (section: SettingsSectionKey) => void;
  children: ReactNode;
};

export const SettingsLayout = ({ activeSection, onSelectSection, children }: SettingsLayoutProps) => {
  const { projects } = useProjects();

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f5f3f2] text-foreground dark:bg-background">
      <SettingsMobileHeader activeSection={activeSection} onSelect={onSelectSection} />
      <SettingsSidebar activeSection={activeSection} onSelect={onSelectSection} />
      <main className="min-h-screen px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-4 md:ml-64 md:px-10 md:py-10">
        <div className="mx-auto w-full max-w-4xl">{children}</div>
      </main>
      <div className="md:hidden">
        <MobileBottomNav projects={projects} />
      </div>
    </div>
  );
};
