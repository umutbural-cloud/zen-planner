import { useUserSettings } from "@/hooks/useUserSettings";
import { SIDEBAR_ITEM_LABELS, type SidebarItemKey } from "@/hooks/useSidebarPreferences";

export const useModuleLabels = () => {
  const { settings, update } = useUserSettings();
  const labels = settings.module_labels || {};

  const get = (key: SidebarItemKey): string => {
    const custom = labels[key];
    return custom && custom.trim() ? custom : SIDEBAR_ITEM_LABELS[key];
  };

  const rename = async (key: SidebarItemKey, value: string) => {
    const trimmed = value.trim();
    const next = { ...labels };
    if (!trimmed || trimmed === SIDEBAR_ITEM_LABELS[key]) {
      delete next[key];
    } else {
      next[key] = trimmed;
    }
    await update({ module_labels: next });
  };

  const reset = async (key: SidebarItemKey) => {
    const next = { ...labels };
    delete next[key];
    await update({ module_labels: next });
  };

  return { get, rename, reset, labels };
};
