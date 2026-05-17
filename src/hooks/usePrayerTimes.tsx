import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useUserSettings } from "@/hooks/useUserSettings";
import { ALL_TIME_OF_DAY_KEYS, type TimeOfDayKey } from "@/lib/timeOfDay";

// Aladhan timing keys we care about, mapped to our day-slot keys.
// Sabah → Fajr, Öğle → Dhuhr, İkindi → Asr, Akşam → Maghrib, Gece(Yatsı) → Isha
export const PRAYER_TO_SLOT: Record<TimeOfDayKey, "Fajr" | "Dhuhr" | "Asr" | "Maghrib" | "Isha"> = {
  morning: "Fajr",
  noon: "Dhuhr",
  ikindi: "Asr",
  evening: "Maghrib",
  night: "Isha",
};

export type AladhanTimings = {
  Fajr: string; Dhuhr: string; Asr: string; Maghrib: string; Isha: string;
  [k: string]: string;
};

export type PrayerTimesResult = {
  date: string; // YYYY-MM-DD local
  source: "coords" | "city";
  starts: Record<TimeOfDayKey, string>;
  raw: AladhanTimings;
};

const STORAGE_KEY = "keikaku.prayerTimes.cache.v1";
const STORAGE_AUTO_STARTS = "habits-time-of-day-auto-starts";
const TIME_EVENT = "time-of-day-ranges-changed";

const todayKey = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const cleanTime = (t: string): string => {
  // "05:23 (+03)" → "05:23"
  const m = /^(\d{2}:\d{2})/.exec(t.trim());
  return m ? m[1] : t.trim();
};

const buildStarts = (timings: AladhanTimings): Record<TimeOfDayKey, string> => {
  const out = {} as Record<TimeOfDayKey, string>;
  ALL_TIME_OF_DAY_KEYS.forEach((k) => {
    out[k] = cleanTime(timings[PRAYER_TO_SLOT[k]] || "00:00");
  });
  return out;
};

type CacheShape = {
  date: string;
  key: string; // coords or city signature
  result: PrayerTimesResult;
};

const readCache = (): CacheShape | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const writeCache = (c: CacheShape) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(c));
  } catch {
    // Cache persistence is optional.
  }
};

const persistAutoStarts = (starts: Record<TimeOfDayKey, string>) => {
  try {
    localStorage.setItem(STORAGE_AUTO_STARTS, JSON.stringify(starts));
  } catch {
    // Cache persistence is optional.
  }
  window.dispatchEvent(new Event(TIME_EVENT));
};

const fetchTimings = async (params: {
  latitude?: number | null;
  longitude?: number | null;
  city?: string | null;
  country: string;
  method: number;
}): Promise<PrayerTimesResult> => {
  const date = todayKey();
  let url: string;
  let source: "coords" | "city";
  if (params.latitude != null && params.longitude != null) {
    source = "coords";
    url = `https://api.aladhan.com/v1/timings/${date}?latitude=${params.latitude}&longitude=${params.longitude}&method=${params.method}`;
  } else if (params.city) {
    source = "city";
    url = `https://api.aladhan.com/v1/timingsByCity/${date}?city=${encodeURIComponent(params.city)}&country=${encodeURIComponent(params.country)}&method=${params.method}`;
  } else {
    throw new Error("Konum veya şehir gerekli");
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error("Vakit verisi alınamadı");
  const json = await res.json();
  const timings = json?.data?.timings as AladhanTimings;
  if (!timings) throw new Error("Geçersiz vakit verisi");
  return { date, source, starts: buildStarts(timings), raw: timings };
};

export const usePrayerTimes = () => {
  const { settings } = useUserSettings();
  const enabled = settings.auto_prayer_times &&
    ((settings.latitude != null && settings.longitude != null) || !!settings.city);

  const sigKey = settings.latitude != null && settings.longitude != null
    ? `c:${settings.latitude.toFixed(3)},${settings.longitude.toFixed(3)}:${settings.calculation_method}`
    : `s:${settings.city || ""}:${settings.country}:${settings.calculation_method}`;

  const today = todayKey();

  const query = useQuery<PrayerTimesResult>({
    queryKey: ["prayer-times", sigKey, today],
    queryFn: async () => {
      const cached = readCache();
      if (cached && cached.date === today && cached.key === sigKey) {
        return cached.result;
      }
      try {
        const result = await fetchTimings({
          latitude: settings.latitude,
          longitude: settings.longitude,
          city: settings.city,
          country: settings.country || "Turkey",
          method: settings.calculation_method,
        });
        writeCache({ date: today, key: sigKey, result });
        return result;
      } catch (e) {
        if (cached) return cached.result; // soft fallback to last cache
        throw e;
      }
    },
    enabled,
    staleTime: 1000 * 60 * 60, // 1 hour
    gcTime: 1000 * 60 * 60 * 24,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  // Push the resolved starts into the time-of-day system whenever they change.
  useEffect(() => {
    if (!enabled) return;
    const result = query.data;
    if (result) {
      persistAutoStarts(result.starts);
    }
  }, [enabled, query.data]);

  // Auto-refresh at midnight.
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    const now = new Date();
    const next = new Date(now);
    next.setHours(24, 0, 30, 0);
    const ms = next.getTime() - now.getTime();
    const t = setTimeout(() => setTick((n) => n + 1), ms);
    return () => clearTimeout(t);
  }, [enabled, query.data?.date]);

  return query;
};
