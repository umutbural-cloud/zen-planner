import { useEffect } from "react";
import { useUiScale, UI_SCALE_FONT_SIZE } from "@/hooks/useUiScale";

/**
 * Applies the user's accessibility UI scale globally for THIS device.
 * Tailwind sizes (text-*, h-*, p-*, gap-*, [&_svg]:size-*) are in rem,
 * so adjusting the root font-size scales typography, spacing, button heights,
 * input sizes, paddings, icons and line-heights together.
 *
 * Stored in localStorage (per-device), not synced across devices.
 */
export const UiScaleSync = () => {
  const { scale } = useUiScale();

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.uiScale = scale;
    root.style.fontSize = UI_SCALE_FONT_SIZE[scale] ?? UI_SCALE_FONT_SIZE.normal;
  }, [scale]);

  return null;
};
