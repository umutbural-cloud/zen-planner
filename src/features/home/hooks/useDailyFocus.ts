import { useEffect, useMemo, useState } from "react";
import type { DailyFocusOption } from "@/features/home/types";

const FOCUS_OPTIONS: DailyFocusOption[] = [
  { id: "deep-work", label: "Derin Çalışma" },
  { id: "publishing", label: "Yayın Yönetimi" },
  { id: "content", label: "İçerik Üretimi" },
  { id: "community", label: "Topluluk" },
  { id: "sessions", label: "Seanslar" },
  { id: "personal", label: "Kişisel İşler" },
  { id: "other", label: "Diğer", allowsCustomText: true },
];

const formatLocalDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const useDailyFocus = () => {
  const storageKey = useMemo(() => `home.dailyFocus.${formatLocalDateKey(new Date())}`, []);
  const [selectedFocus, setSelectedFocusState] = useState<string>(FOCUS_OPTIONS[0].label);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem(storageKey);
    if (saved) setSelectedFocusState(saved);
  }, [storageKey]);

  const setSelectedFocus = (focus: string) => {
    setSelectedFocusState(focus);
    if (typeof window === "undefined") return;
    window.localStorage.setItem(storageKey, focus);
  };

  return {
    selectedFocus,
    focusOptions: FOCUS_OPTIONS,
    setSelectedFocus,
  };
};
