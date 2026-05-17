import { useEffect, useState, useCallback } from "react";

export type UiScale = "normal" | "large" | "xlarge";

const STORAGE_KEY = "keikaku.uiScale.v1";
const EVENT = "keikaku:uiScale";

export const UI_SCALE_FONT_SIZE: Record<UiScale, string> = {
  normal: "16px",
  large: "18.4px",   // ~+15%
  xlarge: "20.8px",  // ~+30%
};

const read = (): UiScale => {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "large" || v === "xlarge" || v === "normal") return v;
  } catch {
    // localStorage can be unavailable in private browsing or restricted embeds.
  }
  return "normal";
};

export const useUiScale = () => {
  const [scale, setScaleState] = useState<UiScale>(read);

  useEffect(() => {
    const onChange = () => setScaleState(read());
    window.addEventListener(EVENT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(EVENT, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  const setScale = useCallback((next: UiScale) => {
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Persistence is optional; keep the in-memory scale change.
    }
    window.dispatchEvent(new Event(EVENT));
    setScaleState(next);
  }, []);

  return { scale, setScale };
};
