import { useEffect, useMemo, useState } from "react";
import { DEFAULT_HOME_FOCUS_OPTIONS } from "@/features/home/types";
import { useUserSettings } from "@/hooks/useUserSettings";

const formatLocalDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const useDailyFocus = () => {
  const { settings } = useUserSettings();
  const focusOptions = settings.home_focus_options?.length ? settings.home_focus_options : DEFAULT_HOME_FOCUS_OPTIONS;
  const storageKey = useMemo(() => `home.dailyFocus.${formatLocalDateKey(new Date())}`, []);
  const [selectedFocus, setSelectedFocusState] = useState<string>(focusOptions[0]?.label || DEFAULT_HOME_FOCUS_OPTIONS[0].label);
  const selectedFocusOption = focusOptions.find((option) => option.label === selectedFocus);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem(storageKey);
    if (saved) setSelectedFocusState(saved);
  }, [storageKey]);

  useEffect(() => {
    if (focusOptions.some((option) => option.label === selectedFocus)) return;
    const fallback = focusOptions[0]?.label || DEFAULT_HOME_FOCUS_OPTIONS[0].label;
    setSelectedFocusState(fallback);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(storageKey, fallback);
    }
  }, [focusOptions, selectedFocus, storageKey]);

  const setSelectedFocus = (focus: string) => {
    setSelectedFocusState(focus);
    if (typeof window === "undefined") return;
    window.localStorage.setItem(storageKey, focus);
  };

  return {
    selectedFocus,
    selectedFocusOption,
    focusOptions,
    setSelectedFocus,
  };
};
