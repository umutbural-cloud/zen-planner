import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

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
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(s)); } catch {}
  window.dispatchEvent(new Event(EVENT));
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
        .select("auto_prayer_times,location_permission,country,city,latitude,longitude,calculation_method,module_labels,startup_page")
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
          module_labels: (data as any).module_labels ?? {},
          startup_page: ((data as any).startup_page as StartupPageSetting) ?? { type: "default" },
          
        };
        setSettings(next);
        writeCache(next);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  const update = useCallback(async (patch: Partial<UserSettings>) => {
    const next = { ...readCache(), ...patch };
    setSettings(next);
    writeCache(next);
    if (!user) return;
    await supabase
      .from("user_settings")
      .upsert({ user_id: user.id, ...next } as any, { onConflict: "user_id" });
  }, [user?.id]);

  return { settings, update, loading };
};
