import { useEffect, useState } from "react";

export type SidebarItemKey = "backlog" | "journal" | "habits" | "workHistory" | "pomodoro" | "retreat";

export const SIDEBAR_ITEM_LABELS: Record<SidebarItemKey, string> = {
  backlog: "Backlog",
  journal: "Günlük",
  habits: "Alışkanlıklar",
  workHistory: "Çalışma Geçmişi",
  pomodoro: "Pomodoro",
  retreat: "İnziva",
};

export const SIDEBAR_ITEM_ORDER: SidebarItemKey[] = [
  "journal",
  "habits",
  "workHistory",
  "pomodoro",
  "retreat",
];

const DEFAULT_PREFS: Record<SidebarItemKey, boolean> = {
  backlog: false,
  journal: false,
  habits: false,
  workHistory: false,
  pomodoro: false,
  retreat: false,
};

export type CustomModuleTarget = "journal" | "habits" | "workHistory";

export const CUSTOM_MODULE_TARGET_LABELS: Record<CustomModuleTarget, string> = {
  journal: "Günlük",
  habits: "Alışkanlıklar",
  workHistory: "Çalışma Geçmişi",
};

export type CustomModule = {
  id: string;
  label: string;
  target: CustomModuleTarget;
};

const STORAGE_KEY = "keikaku.sidebarPreferences.v1";
const CUSTOM_KEY = "keikaku.sidebarCustomModules.v1";
const EVENT = "keikaku:sidebarPreferences";

const read = (): Record<SidebarItemKey, boolean> => {
  if (typeof window === "undefined") return { ...DEFAULT_PREFS };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PREFS };
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_PREFS, ...parsed, backlog: false };
  } catch {
    return { ...DEFAULT_PREFS };
  }
};

const readCustom = (): CustomModule[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CUSTOM_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((entry) => entry && typeof entry === "object" && (entry as { target?: string }).target !== "backlog")
      : [];
  } catch {
    return [];
  }
};

export const useSidebarPreferences = () => {
  const [prefs, setPrefs] = useState<Record<SidebarItemKey, boolean>>(read);
  const [customModules, setCustomModules] = useState<CustomModule[]>(readCustom);

  useEffect(() => {
    const handler = () => {
      setPrefs(read());
      setCustomModules(readCustom());
    };
    window.addEventListener(EVENT, handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener(EVENT, handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  const setItem = (key: SidebarItemKey, value: boolean) => {
    setPrefs((prev) => {
      const next = key === "backlog" ? { ...prev, backlog: false } : { ...prev, [key]: value };
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        window.dispatchEvent(new Event(EVENT));
      } catch {
        // Persistence is optional; keep the in-memory preference change.
      }
      return next;
    });
  };

  const persistCustom = (next: CustomModule[]) => {
    try {
      window.localStorage.setItem(CUSTOM_KEY, JSON.stringify(next));
      window.dispatchEvent(new Event(EVENT));
    } catch {
      // Persistence is optional; keep the in-memory custom modules.
    }
  };

  const addCustomModule = (label: string, target: CustomModuleTarget) => {
    const trimmed = label.trim();
    if (!trimmed) return;
    setCustomModules((prev) => {
      const next = [...prev, { id: `mod_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, label: trimmed, target }];
      persistCustom(next);
      return next;
    });
  };

  const removeCustomModule = (id: string) => {
    setCustomModules((prev) => {
      const next = prev.filter((m) => m.id !== id);
      persistCustom(next);
      return next;
    });
  };

  return { prefs, setItem, customModules, addCustomModule, removeCustomModule };
};
