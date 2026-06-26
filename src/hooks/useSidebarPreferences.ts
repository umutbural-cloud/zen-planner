import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";

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

const NEW_USER_DEFAULT_PREFS: Record<SidebarItemKey, boolean> = {
  backlog: false,
  journal: false,
  habits: false,
  workHistory: false,
  pomodoro: false,
  retreat: false,
};

const LEGACY_DEFAULT_PREFS: Record<SidebarItemKey, boolean> = {
  backlog: false,
  journal: true,
  habits: true,
  workHistory: true,
  pomodoro: true,
  retreat: true,
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
const NEW_USER_DEFAULTS_CUTOFF_MS = Date.parse("2026-06-19T15:35:37.000Z");

const defaultPrefsForUser = (createdAt?: string) => {
  if (!createdAt) return LEGACY_DEFAULT_PREFS;
  const createdAtMs = Date.parse(createdAt);
  if (!Number.isFinite(createdAtMs)) return LEGACY_DEFAULT_PREFS;
  return createdAtMs >= NEW_USER_DEFAULTS_CUTOFF_MS ? NEW_USER_DEFAULT_PREFS : LEGACY_DEFAULT_PREFS;
};

const read = (createdAt?: string): Record<SidebarItemKey, boolean> => {
  if (typeof window === "undefined") return { ...defaultPrefsForUser(createdAt) };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...defaultPrefsForUser(createdAt) };
    const parsed = JSON.parse(raw);
    return { ...NEW_USER_DEFAULT_PREFS, ...parsed, backlog: false };
  } catch {
    return { ...defaultPrefsForUser(createdAt) };
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
  const { user } = useAuth();
  const userCreatedAt = user?.created_at;
  const [prefs, setPrefs] = useState<Record<SidebarItemKey, boolean>>(() => read(userCreatedAt));
  const [customModules, setCustomModules] = useState<CustomModule[]>(readCustom);

  useEffect(() => {
    const handler = () => {
      setPrefs(read(userCreatedAt));
      setCustomModules(readCustom());
    };
    setPrefs(read(userCreatedAt));
    window.addEventListener(EVENT, handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener(EVENT, handler);
      window.removeEventListener("storage", handler);
    };
  }, [userCreatedAt]);

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
