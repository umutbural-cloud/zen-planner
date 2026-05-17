import { useEffect, useState } from "react";

export type HabitTodayDefault = "time" | "all";
const KEY = "habits-today-default";

const read = (): HabitTodayDefault => {
  try {
    const v = localStorage.getItem(KEY);
    return v === "all" ? "all" : "time";
  } catch { return "time"; }
};

export const useHabitTodayDefault = () => {
  const [value, setValue] = useState<HabitTodayDefault>(read);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) setValue(read());
    };
    const onCustom = () => setValue(read());
    window.addEventListener("storage", onStorage);
    window.addEventListener("habits-settings-changed", onCustom);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("habits-settings-changed", onCustom);
    };
  }, []);

  const update = (v: HabitTodayDefault) => {
    try { localStorage.setItem(KEY, v); } catch {}
    setValue(v);
    window.dispatchEvent(new Event("habits-settings-changed"));
  };

  return [value, update] as const;
};
