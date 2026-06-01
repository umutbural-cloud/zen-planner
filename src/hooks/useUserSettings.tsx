import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Database } from "@/integrations/supabase/types";
import { DEFAULT_HOME_FOCUS_OPTIONS, type DailyFocusOption } from "@/features/home/types";

export type StartupPageSetting =
  | { type: "module"; value: "backlog" | "journal" | "habits" | "workHistory" | "pomodoro" }
  | { type: "project"; value: string }
  | { type: "default" };

export type UserSettings = {
  auto_prayer_times: boolean;
  location_permission: boolean;
  country: string;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  calculation_method: number;
  module_labels: Record<string, string>;
  startup_page: StartupPageSetting;
  default_pomodoro_project_id: string | null;
  home_focus_options: DailyFocusOption[];
  home_task_project_ids: string[] | null;
};

const DEFAULTS: UserSettings = {
  auto_prayer_times: false,
  location_permission: false,
  country: "Turkey",
  city: null,
  latitude: null,
  longitude: null,
  calculation_method: 13,
  module_labels: {},
  startup_page: { type: "default" },
  default_pomodoro_project_id: null,
  home_focus_options: DEFAULT_HOME_FOCUS_OPTIONS,
  home_task_project_ids: null,
};

const CACHE_KEY = "keikaku.userSettings.v1";
const EVENT = "keikaku:userSettings";
const SELECT_COLUMNS = "auto_prayer_times,location_permission,country,city,latitude,longitude,calculation_method,module_labels,startup_page,default_pomodoro_project_id,home_focus_options,home_task_project_ids";
const CACHE_FRESH_MS = 60_000;

type StoredUserSettings = UserSettings & { __user_id?: string; __fetched_at?: number };
type UserSettingsRow = Pick<
  Database["public"]["Tables"]["user_settings"]["Row"],
  | "auto_prayer_times"
  | "location_permission"
  | "country"
  | "city"
  | "latitude"
  | "longitude"
  | "calculation_method"
  | "module_labels"
  | "startup_page"
  | "default_pomodoro_project_id"
  | "home_focus_options"
  | "home_task_project_ids"
>;

const memoryCache = new Map<string, UserSettings>();
const fetchedAtByUser = new Map<string, number>();
const inFlightFetches = new Map<string, Promise<UserSettings | null>>();

const normalizeSettingsRow = (data: UserSettingsRow): UserSettings => ({
  auto_prayer_times: data.auto_prayer_times,
  location_permission: data.location_permission,
  country: data.country,
  city: data.city,
  latitude: data.latitude,
  longitude: data.longitude,
  calculation_method: data.calculation_method,
  module_labels: isStringRecord(data.module_labels) ? data.module_labels : {},
  startup_page: isStartupPageSetting(data.startup_page) ? data.startup_page : { type: "default" },
  default_pomodoro_project_id: data.default_pomodoro_project_id,
  home_focus_options: normalizeFocusOptions(data.home_focus_options),
  home_task_project_ids: normalizeProjectIds(data.home_task_project_ids),
});

const readStoredCache = (): StoredUserSettings | null => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return null;
  }
};

const readCache = (userId?: string | null): UserSettings => {
  if (!userId) return DEFAULTS;
  const cached = memoryCache.get(userId);
  if (cached) return cached;
  const stored = readStoredCache();
  if (stored?.__user_id !== userId) return DEFAULTS;
  const { __user_id: _storedUserId, __fetched_at: storedFetchedAt, ...settings } = stored;
  const next = { ...DEFAULTS, ...settings };
  memoryCache.set(userId, next);
  if (typeof storedFetchedAt === "number") fetchedAtByUser.set(userId, storedFetchedAt);
  return next;
};

const hasCache = (userId: string) => {
  if (memoryCache.has(userId)) return true;
  return readStoredCache()?.__user_id === userId;
};

const isCacheFresh = (userId: string) => {
  const fetchedAt = fetchedAtByUser.get(userId) ?? readStoredCache()?.__fetched_at;
  return typeof fetchedAt === "number" && Date.now() - fetchedAt < CACHE_FRESH_MS;
};

const writeCache = (userId: string, s: UserSettings) => {
  memoryCache.set(userId, s);
  const fetchedAt = Date.now();
  fetchedAtByUser.set(userId, fetchedAt);
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ...s, __user_id: userId, __fetched_at: fetchedAt }));
  } catch {
    // localStorage can be unavailable in private browsing or restricted embeds.
  }
  window.dispatchEvent(new Event(EVENT));
};

const fetchSettings = (userId: string) => {
  if (hasCache(userId) && isCacheFresh(userId)) {
    return Promise.resolve(readCache(userId));
  }

  const existing = inFlightFetches.get(userId);
  if (existing) return existing;

  const promise = supabase
    .from("user_settings")
    .select(SELECT_COLUMNS)
    .eq("user_id", userId)
    .maybeSingle()
    .then(({ data }) => {
      if (!data) {
        writeCache(userId, readCache(userId));
        return null;
      }
      const next = normalizeSettingsRow(data);
      writeCache(userId, next);
      return next;
    })
    .finally(() => {
      inFlightFetches.delete(userId);
    });

  inFlightFetches.set(userId, promise);
  return promise;
};

const isStartupPageSetting = (value: unknown): value is StartupPageSetting => {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  if (candidate.type === "default") return true;
  if (candidate.type === "project") return typeof candidate.value === "string";
  if (candidate.type === "module") {
    return candidate.value === "backlog" ||
      candidate.value === "journal" ||
      candidate.value === "habits" ||
      candidate.value === "workHistory" ||
      candidate.value === "pomodoro";
  }
  return false;
};

const isStringRecord = (value: unknown): value is Record<string, string> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  return Object.values(value).every((entry) => typeof entry === "string");
};

const isDailyFocusOption = (value: unknown): value is DailyFocusOption => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.id === "string" &&
    typeof candidate.label === "string" &&
    (candidate.color === undefined || typeof candidate.color === "string") &&
    (candidate.allowsCustomText === undefined || typeof candidate.allowsCustomText === "boolean");
};

const normalizeFocusOptions = (value: unknown): DailyFocusOption[] => {
  if (!Array.isArray(value)) return DEFAULT_HOME_FOCUS_OPTIONS;
  const options = value.filter(isDailyFocusOption)
    .map((option) => ({
      id: option.id,
      label: option.label.trim(),
      color: option.color || "stone",
      allowsCustomText: option.allowsCustomText,
    }))
    .filter((option) => option.label.length > 0);
  return options.length > 0 ? options : DEFAULT_HOME_FOCUS_OPTIONS;
};

const normalizeProjectIds = (value: unknown): string[] | null => {
  if (!Array.isArray(value)) return null;
  const ids = value.filter((id): id is string => typeof id === "string" && id.length > 0);
  return ids.length > 0 ? Array.from(new Set(ids)) : null;
};

type UserSettingsContextValue = {
  settings: UserSettings;
  update: (patch: Partial<UserSettings>) => Promise<{ error: Error | null }>;
  loading: boolean;
};

const UserSettingsContext = createContext<UserSettingsContextValue | null>(null);

export const UserSettingsProvider = ({ children }: { children: ReactNode }) => {
  const { user, initialAuthResolved } = useAuth();
  const userId = user?.id ?? null;
  const [settings, setSettings] = useState<UserSettings>(() => readCache(userId));
  const [loading, setLoading] = useState(() => (!initialAuthResolved || (userId ? !hasCache(userId) : false)));

  useEffect(() => {
    const onChange = () => setSettings(readCache(userId));
    window.addEventListener(EVENT, onChange);
    return () => window.removeEventListener(EVENT, onChange);
  }, [userId]);

  useEffect(() => {
    if (!initialAuthResolved) {
      setLoading(true);
      return;
    }

    if (!userId) {
      setSettings(DEFAULTS);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const cached = readCache(userId);
    const cachedAvailable = hasCache(userId);
    setSettings(cached);
    setLoading(!cachedAvailable);

    void fetchSettings(userId).then((next) => {
      if (cancelled) return;
      if (next) setSettings(next);
      setLoading(false);
    }).catch(() => {
      if (!cancelled) setLoading(false);
    });

    return () => { cancelled = true; };
  }, [initialAuthResolved, userId]);

  const update = useCallback(async (patch: Partial<UserSettings>) => {
    const previous = readCache(userId);
    const next = { ...previous, ...patch };
    setSettings(next);
    if (!userId) return { error: null };
    writeCache(userId, next);
    const payload: Database["public"]["Tables"]["user_settings"]["Insert"] = { user_id: userId, ...next };
    const { error } = await supabase
      .from("user_settings")
      .upsert(payload, { onConflict: "user_id" });
    if (error) {
      setSettings(previous);
      writeCache(userId, previous);
    }
    return { error };
  }, [userId]);

  const value = useMemo<UserSettingsContextValue>(() => ({
    settings,
    update,
    loading,
  }), [loading, settings, update]);

  return <UserSettingsContext.Provider value={value}>{children}</UserSettingsContext.Provider>;
};

export const useUserSettings = () => {
  const context = useContext(UserSettingsContext);
  if (context) return context;

  return {
    settings: DEFAULTS,
    update: async () => ({ error: null }),
    loading: false,
  };
};
