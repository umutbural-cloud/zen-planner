import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { SETTINGS_NAVIGATION, type SettingsSectionKey, type SettingsNavItem } from "./settingsNavigation";

type SettingsSidebarProps = {
  activeSection: SettingsSectionKey;
  onSelect: (section: SettingsSectionKey) => void;
};

const SettingsNavButton = ({
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
      className={cn(
        "relative flex h-10 w-full items-center gap-3 rounded-md px-3 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
        nested && "h-9 pl-9 text-[13px]",
        active
          ? "bg-accent/60 font-medium text-foreground"
          : "font-light text-muted-foreground hover:bg-accent/35 hover:text-foreground",
      )}
    >
      {active && <span className="absolute left-0 top-2 h-6 w-0.5 rounded-full bg-primary" />}
      <Icon className={cn("h-4 w-4 shrink-0", nested && "h-3.5 w-3.5")} strokeWidth={1.7} />
      <span className="truncate tracking-normal">{item.label}</span>
    </button>
  );
};

export const SettingsSidebar = ({ activeSection, onSelect }: SettingsSidebarProps) => {
  const navigate = useNavigate();

  return (
    <aside className="fixed left-0 top-0 z-30 flex h-screen w-64 flex-col bg-white px-4 py-6">
      <div className="mb-7">
        <p className="mb-4 px-1 text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground/70">
          ZEN PLANNER
        </p>
        <button
          type="button"
          onClick={() => navigate("/")}
          className="mb-5 inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent/45 hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          aria-label="Ana sayfaya dön"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.8} />
        </button>
        <h1 className="px-1 text-2xl font-medium tracking-normal text-foreground">Ayarlar</h1>
      </div>

      <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto">
        {SETTINGS_NAVIGATION.map((item) => (
          <div key={item.key} className="space-y-1">
            <SettingsNavButton item={item} activeSection={activeSection} onSelect={onSelect} />
            {item.children && (
              <div className="space-y-1">
                {item.children.map((child) => (
                  <SettingsNavButton
                    key={child.key}
                    item={child}
                    activeSection={activeSection}
                    onSelect={onSelect}
                    nested
                  />
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>
    </aside>
  );
};
