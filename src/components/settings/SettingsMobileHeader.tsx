import { useState } from "react";
import { ArrowLeft, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import {
  SETTINGS_NAVIGATION,
  SETTINGS_SECTION_COPY,
  type SettingsNavItem,
  type SettingsSectionKey,
} from "./settingsNavigation";

type SettingsMobileHeaderProps = {
  activeSection: SettingsSectionKey;
  onSelect: (section: SettingsSectionKey) => void;
};

const SettingsDrawerNavButton = ({
  item,
  activeSection,
  onSelect,
  nested = false,
}: {
  item: SettingsNavItem;
  activeSection: SettingsSectionKey;
  onSelect: (section: SettingsSectionKey) => void;
  nested?: boolean;
}) => {
  const Icon = item.icon;
  const active = activeSection === item.key || Boolean(item.children?.some((child) => child.key === activeSection));

  return (
    <button
      type="button"
      onClick={() => onSelect(item.key)}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
        nested && "min-h-10 pl-9 text-[13px]",
        active
          ? "bg-accent/65 font-medium text-foreground dark:bg-accent/35"
          : "font-light text-muted-foreground hover:bg-accent/35 hover:text-foreground dark:hover:bg-accent/30",
      )}
    >
      {active && <span className="absolute left-0 top-2.5 h-6 w-0.5 rounded-full bg-primary" />}
      <Icon className={cn("h-4 w-4 shrink-0", nested && "h-3.5 w-3.5")} strokeWidth={1.7} />
      <span className="min-w-0 truncate tracking-normal">{item.label}</span>
    </button>
  );
};

export const SettingsMobileHeader = ({ activeSection, onSelect }: SettingsMobileHeaderProps) => {
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const activeTitle = SETTINGS_SECTION_COPY[activeSection].title;

  const selectSection = (section: SettingsSectionKey) => {
    onSelect(section);
    setDrawerOpen(false);
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-[#f5f3f2]/95 px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] text-foreground backdrop-blur dark:bg-background/95 md:hidden">
        <div className="flex h-11 items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent/45 hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring dark:hover:bg-accent/30"
            aria-label="Uygulamaya dön"
            title="Uygulamaya dön"
          >
            <ArrowLeft className="h-4.5 w-4.5" strokeWidth={1.8} />
          </button>

          <div className="min-w-0 text-center">
            <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground/70">
              Ayarlar
            </p>
            <h1 className="truncate text-base font-medium tracking-normal text-foreground">{activeTitle}</h1>
          </div>

          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent/45 hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring dark:hover:bg-accent/30"
            aria-label="Ayarlar menüsünü aç"
            title="Ayarlar menüsünü aç"
          >
            <Settings className="h-4.5 w-4.5" strokeWidth={1.8} />
          </button>
        </div>
      </header>

      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent
          side="right"
          className="flex h-dvh w-[min(88vw,360px)] flex-col border-0 bg-white p-0 shadow-xl dark:bg-card md:hidden"
        >
          <SheetHeader className="space-y-1 px-5 pb-4 pt-[calc(1.25rem+env(safe-area-inset-top))] text-left">
            <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground/70">
              ZEN PLANNER
            </p>
            <SheetTitle className="text-xl font-medium tracking-normal">Ayarlar</SheetTitle>
            <SheetDescription>Yönetmek istediğin ayar bölümünü seç.</SheetDescription>
          </SheetHeader>

          <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 pb-[calc(1rem+env(safe-area-inset-bottom))]">
            {SETTINGS_NAVIGATION.map((item) => (
              <div key={item.key} className="space-y-1">
                <SettingsDrawerNavButton item={item} activeSection={activeSection} onSelect={selectSection} />
                {item.children && (
                  <div className="space-y-1">
                    {item.children.map((child) => (
                      <SettingsDrawerNavButton
                        key={child.key}
                        item={child}
                        activeSection={activeSection}
                        onSelect={selectSection}
                        nested
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>
        </SheetContent>
      </Sheet>
    </>
  );
};
