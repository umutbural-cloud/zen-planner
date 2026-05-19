import { useEffect, useState, useCallback } from "react";
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
};

const CACHE_KEY = "keikaku.userSettings.v1";
const EVENT = "keikaku:userSettings";

const readCache = (): UserSettings => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return DEFAULTS;
  }
};

const writeCache = (s: UserSettings) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(s));
  } catch {
    // localStorage can be unavailable in private browsing or restricted embeds.
  }
  window.dispatchEvent(new Event(EVENT));
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

export const useUserSettings = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<UserSettings>(readCache);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const onChange = () => setSettings(readCache());
    window.addEventListener(EVENT, onChange);
    return () => window.removeEventListener(EVENT, onChange);
  }, []);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("user_settings")
        .select("auto_prayer_times,location_permission,country,city,latitude,longitude,calculation_method,module_labels,startup_page,default_pomodoro_project_id,home_focus_options")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      if (data) {
        const next: UserSettings = {
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
        };
        setSettings(next);
        writeCache(next);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user]);

  const update = useCallback(async (patch: Partial<UserSettings>) => {
    const next = { ...readCache(), ...patch };
    setSettings(next);
    writeCache(next);
    if (!user) return;
    const payload: Database["public"]["Tables"]["user_settings"]["Insert"] = { user_id: user.id, ...next };
    await supabase
      .from("user_settings")
      .upsert(payload, { onConflict: "user_id" });
  }, [user]);

  return { settings, update, loading };
};
