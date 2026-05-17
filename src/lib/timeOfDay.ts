import { useEffect, useState } from "react";

export type TimeOfDay = "morning" | "noon" | "ikindi" | "evening" | "night" | "any";

export type TimeOfDayKey = Exclude<TimeOfDay, "any">;

export const ALL_TIME_OF_DAY_KEYS: TimeOfDayKey[] = ["morning", "noon", "ikindi", "evening", "night"];

// Legacy alias — kept for callers iterating over default keys.
export const TIME_OF_DAY_KEYS = ALL_TIME_OF_DAY_KEYS;

export const DEFAULT_TIME_OF_DAY_LABELS: Record<TimeOfDayKey, { label: string; jp: string }> = {
  morning: { label: "Sabah", jp: "朝" },
  noon: { label: "Öğle", jp: "昼" },
  ikindi: { label: "İkindi", jp: "申" },
  evening: { label: "Akşam", jp: "夕" },
  night: { label: "Gece", jp: "夜" },
};

// Legacy export (static) — components needing live labels should use the hook.
export const TIME_OF_DAY_LABELS = DEFAULT_TIME_OF_DAY_LABELS;

export const DEFAULT_TIME_OF_DAY_STARTS: Record<TimeOfDayKey, string> = {
  morning: "04:00",
  noon: "11:00",
  ikindi: "14:00",
  evening: "17:30",
  night: "21:00",
};

const STORAGE_STARTS = "habits-time-of-day-starts";
const STORAGE_LABELS = "habits-time-of-day-labels";
const STORAGE_DISABLED = "habits-time-of-day-disabled";
const STORAGE_AUTO = "habits-time-of-day-auto";
const STORAGE_AUTO_STARTS = "habits-time-of-day-auto-starts";
const EVENT = "time-of-day-ranges-changed";

export const readAutoMode = (): boolean => {
  try {
    return localStorage.getItem(STORAGE_AUTO) === "true";
  } catch {
    return false;
  }
};

export const writeAutoMode = (v: boolean) => {
  try {
    localStorage.setItem(STORAGE_AUTO, v ? "true" : "false");
  } catch {
    // Persistence is optional; listeners still receive the in-memory change event.
  }
  window.dispatchEvent(new Event(EVENT));
};

export const readAutoStarts = (): Record<TimeOfDayKey, string> | null => {
  try {
    const raw = localStorage.getItem(STORAGE_AUTO_STARTS);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const out = { ...DEFAULT_TIME_OF_DAY_STARTS };
    let any = false;
    ALL_TIME_OF_DAY_KEYS.forEach((k) => {
      if (isValidTime(parsed?.[k])) { out[k] = parsed[k]; any = true; }
    });
    return any ? out : null;
  } catch {
    return null;
  }
};

export const readEffectiveStarts = (): Record<TimeOfDayKey, string> => {
  if (readAutoMode()) {
    const auto = readAutoStarts();
    if (auto) return auto;
  }
  return readTimeOfDayStarts();
};

const isValidTime = (s: unknown): s is string =>
  typeof s === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(s);

export const readTimeOfDayStarts = (): Record<TimeOfDayKey, string> => {
  try {
    const raw = localStorage.getItem(STORAGE_STARTS);
    if (!raw) return { ...DEFAULT_TIME_OF_DAY_STARTS };
    const parsed = JSON.parse(raw);
    const out = { ...DEFAULT_TIME_OF_DAY_STARTS };
    ALL_TIME_OF_DAY_KEYS.forEach((k) => {
      if (isValidTime(parsed?.[k])) out[k] = parsed[k];
    });
    return out;
  } catch {
    return { ...DEFAULT_TIME_OF_DAY_STARTS };
  }
};

export const readTimeOfDayLabels = (): Record<TimeOfDayKey, string> => {
  const out: Record<TimeOfDayKey, string> = {
    morning: DEFAULT_TIME_OF_DAY_LABELS.morning.label,
    noon: DEFAULT_TIME_OF_DAY_LABELS.noon.label,
    ikindi: DEFAULT_TIME_OF_DAY_LABELS.ikindi.label,
    evening: DEFAULT_TIME_OF_DAY_LABELS.evening.label,
    night: DEFAULT_TIME_OF_DAY_LABELS.night.label,
  };
  try {
    const raw = localStorage.getItem(STORAGE_LABELS);
    if (!raw) return out;
    const parsed = JSON.parse(raw);
    ALL_TIME_OF_DAY_KEYS.forEach((k) => {
      if (typeof parsed?.[k] === "string" && parsed[k].trim()) out[k] = parsed[k].trim();
    });
  } catch {
    // Ignore invalid or unavailable stored labels and keep defaults.
  }
  return out;
};

export const readTimeOfDayDisabled = (): TimeOfDayKey[] => {
  try {
    const raw = localStorage.getItem(STORAGE_DISABLED);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((k): k is TimeOfDayKey => ALL_TIME_OF_DAY_KEYS.includes(k));
  } catch {
    return [];
  }
};

const persist = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Persistence is optional; listeners still receive the in-memory change event.
  }
  window.dispatchEvent(new Event(EVENT));
};

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map((n) => parseInt(n, 10));
  return h * 60 + m;
};

const fmtRange = (startMin: number, endMin: number) => {
  const fmt = (m: number) => {
    const h = Math.floor(m / 60) % 24;
    const mm = m % 60;
    return `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
  };
  return `${fmt(startMin)}–${fmt(endMin)}`;
};

export type TimeOfDayOption = {
  key: TimeOfDayKey;
  label: string;
  jp: string;
  range: string;
  startMin: number;
  endMin: number;
};

export const getTimeOfDayOptions = (
  starts: Record<TimeOfDayKey, string> = readEffectiveStarts(),
  labels: Record<TimeOfDayKey, string> = readTimeOfDayLabels(),
  disabled: TimeOfDayKey[] = readTimeOfDayDisabled(),
): TimeOfDayOption[] => {
  const enabled = ALL_TIME_OF_DAY_KEYS.filter((k) => !disabled.includes(k));
  if (enabled.length === 0) return [];
  // Sort enabled by start time so ranges are continuous in the day.
  const sorted = [...enabled].sort((a, b) => toMinutes(starts[a]) - toMinutes(starts[b]));
  return sorted.map((k, i) => {
    const startMin = toMinutes(starts[k]);
    const nextKey = sorted[(i + 1) % sorted.length];
    let endMin = toMinutes(starts[nextKey]);
    if (endMin <= startMin) endMin += 24 * 60;
    return {
      key: k,
      label: labels[k] || DEFAULT_TIME_OF_DAY_LABELS[k].label,
      jp: DEFAULT_TIME_OF_DAY_LABELS[k].jp,
      range: fmtRange(startMin, endMin),
      startMin,
      endMin,
    };
  });
};

export const TIME_OF_DAY_OPTIONS: TimeOfDayOption[] = getTimeOfDayOptions();

export const currentTimeOfDay = (d = new Date()): TimeOfDayKey => {
  const opts = getTimeOfDayOptions();
  if (opts.length === 0) return "morning";
  const nowMin = d.getHours() * 60 + d.getMinutes();
  for (const o of opts) {
    const s = o.startMin;
    const e = o.endMin;
    if (e <= 24 * 60) {
      if (nowMin >= s && nowMin < e) return o.key;
    } else {
      if (nowMin >= s || nowMin < e - 24 * 60) return o.key;
    }
  }
  return opts[0].key;
};

export const timeOfDayLabel = (t: TimeOfDay) => {
  if (t === "any") return "Herhangi";
  if ((t as string) === "afternoon") return readTimeOfDayLabels().noon;
  const labels = readTimeOfDayLabels();
  return labels[t as TimeOfDayKey] || DEFAULT_TIME_OF_DAY_LABELS[t as TimeOfDayKey]?.label || "";
};

export const useTimeOfDayRanges = () => {
  const [starts, setStarts] = useState<Record<TimeOfDayKey, string>>(readTimeOfDayStarts);
  const [labels, setLabels] = useState<Record<TimeOfDayKey, string>>(readTimeOfDayLabels);
  const [disabled, setDisabled] = useState<TimeOfDayKey[]>(readTimeOfDayDisabled);
  const [auto, setAuto] = useState<boolean>(readAutoMode);
  const [autoStarts, setAutoStarts] = useState<Record<TimeOfDayKey, string> | null>(readAutoStarts);

  useEffect(() => {
    const onChange = () => {
      setStarts(readTimeOfDayStarts());
      setLabels(readTimeOfDayLabels());
      setDisabled(readTimeOfDayDisabled());
      setAuto(readAutoMode());
      setAutoStarts(readAutoStarts());
    };
    const onStorage = (e: StorageEvent) => {
      if (
        e.key === STORAGE_STARTS || e.key === STORAGE_LABELS || e.key === STORAGE_DISABLED ||
        e.key === STORAGE_AUTO || e.key === STORAGE_AUTO_STARTS
      ) onChange();
    };
    window.addEventListener(EVENT, onChange);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(EVENT, onChange);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const update = (key: TimeOfDayKey, value: string) => {
    if (!isValidTime(value)) return;
    const next = { ...starts, [key]: value };
    setStarts(next);
    persist(STORAGE_STARTS, next);
  };

  const rename = (key: TimeOfDayKey, value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    const next = { ...labels, [key]: trimmed };
    setLabels(next);
    persist(STORAGE_LABELS, next);
  };

  const setEnabled = (key: TimeOfDayKey, enabled: boolean) => {
    const next = enabled ? disabled.filter((k) => k !== key) : Array.from(new Set([...disabled, key]));
    if (!enabled && ALL_TIME_OF_DAY_KEYS.length - next.length === 0) return;
    setDisabled(next);
    persist(STORAGE_DISABLED, next);
  };

  const reset = () => {
    setStarts({ ...DEFAULT_TIME_OF_DAY_STARTS });
    setLabels({
      morning: DEFAULT_TIME_OF_DAY_LABELS.morning.label,
      noon: DEFAULT_TIME_OF_DAY_LABELS.noon.label,
      ikindi: DEFAULT_TIME_OF_DAY_LABELS.ikindi.label,
      evening: DEFAULT_TIME_OF_DAY_LABELS.evening.label,
      night: DEFAULT_TIME_OF_DAY_LABELS.night.label,
    });
    setDisabled([]);
    persist(STORAGE_STARTS, { ...DEFAULT_TIME_OF_DAY_STARTS });
    persist(STORAGE_LABELS, DEFAULT_TIME_OF_DAY_LABELS);
    persist(STORAGE_DISABLED, []);
  };

  const setAutoMode = (v: boolean) => {
    setAuto(v);
    writeAutoMode(v);
  };

  const effectiveStarts = auto && autoStarts ? autoStarts : starts;
  const options = getTimeOfDayOptions(effectiveStarts, labels, disabled);
  return {
    starts, labels, disabled, options,
    auto, autoStarts, effectiveStarts,
    update, rename, setEnabled, reset, setAutoMode,
  };
};
