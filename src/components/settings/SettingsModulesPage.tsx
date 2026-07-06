import { useState } from "react";
import { ChevronRight, RotateCcw, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  SIDEBAR_ITEM_LABELS,
  type SidebarItemKey,
} from "@/hooks/useSidebarPreferences";
import { useSidebarPreferences } from "@/hooks/useSidebarPreferences";
import { useModuleLabels } from "@/hooks/useModuleLabels";
import { cn } from "@/lib/utils";
import {
  MODULE_SETTINGS_LINKS,
  MODULE_VISIBILITY_ROWS,
  type ModuleVisibilityRow,
  type SettingsSectionKey,
} from "./settingsNavigation";

type SettingsModulesPageProps = {
  onSelectSection: (section: SettingsSectionKey) => void;
};

type ModuleLabelDrafts = Partial<Record<SidebarItemKey, string>>;

const isSidebarItemKey = (key: ModuleVisibilityRow["preferenceKey"]): key is SidebarItemKey => Boolean(key);

const ModuleName = ({ row }: { row: ModuleVisibilityRow }) => {
  const Icon = row.icon;

  return (
    <div className="flex min-w-0 items-start gap-3">
      <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted/55 text-muted-foreground">
        <Icon className="h-4 w-4" strokeWidth={1.7} />
      </span>
      <div className="min-w-0">
        <h3 className="text-sm font-medium tracking-normal text-foreground">{row.title}</h3>
        <p className="mt-1 max-w-xl text-xs leading-5 text-muted-foreground">{row.description}</p>
      </div>
    </div>
  );
};

const LabelInput = ({
  row,
  disabled,
  value,
  onChange,
  onCommit,
  onReset,
}: {
  row: ModuleVisibilityRow;
  disabled: boolean;
  value: string;
  onChange: (value: string) => void;
  onCommit: () => void;
  onReset: () => void;
}) => {
  if (!isSidebarItemKey(row.preferenceKey) || row.preferenceKey === "retreat") {
    return (
      <Input
        value={row.title}
        disabled
        className="h-10 rounded-md border-transparent bg-muted/45 text-sm font-light shadow-none"
      />
    );
  }

  const hasCustomLabel = value.trim() && value.trim() !== SIDEBAR_ITEM_LABELS[row.preferenceKey];

  return (
    <div className="flex items-center gap-2">
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onCommit}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur();
        }}
        disabled={disabled}
        placeholder={SIDEBAR_ITEM_LABELS[row.preferenceKey]}
        className="h-10 rounded-md border-transparent bg-muted/55 text-sm font-light shadow-none"
      />
      {hasCustomLabel && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onReset}
          disabled={disabled}
          className="h-9 w-9 shrink-0 text-muted-foreground hover:bg-accent/50 hover:text-foreground"
          title="Varsayılan ada dön"
        >
          <RotateCcw className="h-4 w-4" strokeWidth={1.7} />
        </Button>
      )}
    </div>
  );
};

const LinkedRow = ({
  icon: Icon,
  title,
  description,
  onClick,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className="flex w-full items-center gap-4 rounded-md px-3 py-3 text-left transition-colors hover:bg-muted/45 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
  >
    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted/55 text-muted-foreground">
      <Icon className="h-4 w-4" strokeWidth={1.7} />
    </span>
    <span className="min-w-0 flex-1">
      <span className="block text-sm font-medium text-foreground">{title}</span>
      <span className="mt-1 block text-xs leading-5 text-muted-foreground">{description}</span>
    </span>
    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.7} />
  </button>
);

export const SettingsModulesPage = ({ onSelectSection }: SettingsModulesPageProps) => {
  const { prefs, setItem } = useSidebarPreferences();
  const { get: moduleLabel, rename: renameModule, reset: resetModule } = useModuleLabels();
  const [drafts, setDrafts] = useState<ModuleLabelDrafts>({});

  const getVisible = (row: ModuleVisibilityRow) => {
    if (!isSidebarItemKey(row.preferenceKey)) return true;
    return prefs[row.preferenceKey];
  };

  const getLabel = (row: ModuleVisibilityRow) => {
    if (!isSidebarItemKey(row.preferenceKey) || row.preferenceKey === "retreat") return row.title;
    return drafts[row.preferenceKey] ?? moduleLabel(row.preferenceKey);
  };

  const commitLabel = (key: SidebarItemKey) => {
    const value = drafts[key] ?? "";
    void renameModule(key, value);
  };

  const resetLabel = (key: SidebarItemKey) => {
    setDrafts((prev) => ({ ...prev, [key]: SIDEBAR_ITEM_LABELS[key] }));
    void resetModule(key);
  };

  return (
    <div className="space-y-5">
      <section className="rounded-lg bg-white px-6 py-5">
        <h2 className="text-base font-medium tracking-normal text-foreground">Modül görünürlüğü</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Bir modülü kapattığında ana menüden gizlenir. Verilerin silinmez.
        </p>
        <p className="mt-3 text-xs text-muted-foreground/80">
          Bu ayar şimdilik menü görünürlüğünü etkiler.
        </p>
      </section>

      <section className="rounded-lg bg-white px-6 py-5">
        <div className="mb-5">
          <h2 className="text-base font-medium tracking-normal text-foreground">Aktif Modüller</h2>
        </div>

        <div className="grid grid-cols-[72px_minmax(0,1fr)_260px] gap-4 px-3 pb-2 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground/70">
          <span>Aktif</span>
          <span>Modül</span>
          <span>Tercih Edilen Ad</span>
        </div>

        <div className="divide-y divide-muted/70">
          {MODULE_VISIBILITY_ROWS.map((row) => {
            const isConfigurable = isSidebarItemKey(row.preferenceKey) && row.preferenceKey !== "retreat";
            const visible = getVisible(row);
            const label = getLabel(row);

            return (
              <div
                key={row.id}
                className={cn(
                  "grid grid-cols-[72px_minmax(0,1fr)_260px] items-center gap-4 px-3 py-4 transition-opacity",
                  !visible && "opacity-55",
                )}
              >
                <Switch
                  checked={visible}
                  disabled={!isConfigurable}
                  onCheckedChange={(checked) => {
                    if (isConfigurable && row.preferenceKey) setItem(row.preferenceKey, checked);
                  }}
                  aria-label={`${row.title} görünürlüğü`}
                />
                <ModuleName row={row} />
                <LabelInput
                  row={row}
                  disabled={!isConfigurable || !visible}
                  value={label}
                  onChange={(value) => {
                    if (!isConfigurable || !row.preferenceKey) return;
                    setDrafts((prev) => ({ ...prev, [row.preferenceKey]: value }));
                  }}
                  onCommit={() => {
                    if (isConfigurable && row.preferenceKey) commitLabel(row.preferenceKey);
                  }}
                  onReset={() => {
                    if (isConfigurable && row.preferenceKey) resetLabel(row.preferenceKey);
                  }}
                />
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-lg bg-white px-6 py-5">
        <div className="mb-4">
          <h2 className="text-base font-medium tracking-normal text-foreground">Modül Ayarları</h2>
        </div>
        <div className="space-y-1">
          {MODULE_SETTINGS_LINKS.map((item) => (
            <LinkedRow
              key={item.section}
              icon={item.icon}
              title={item.title}
              description={item.description}
              onClick={() => onSelectSection(item.section)}
            />
          ))}
        </div>
      </section>
    </div>
  );
};
