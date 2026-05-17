export type TaskColor = "gray" | "yellow" | "red" | "blue" | "green";

export const TASK_COLORS: { value: TaskColor; label: string; jp: string }[] = [
  { value: "gray", label: "Gri", jp: "灰" },
  { value: "yellow", label: "Sarı", jp: "黄" },
  { value: "red", label: "Kırmızı", jp: "赤" },
  { value: "blue", label: "Mavi", jp: "青" },
  { value: "green", label: "Yeşil", jp: "緑" },
];

// Soft, washi-friendly palette. Returns Tailwind classes.
export const colorClasses = (
  color: TaskColor | string | null | undefined,
  variant: "block" | "dot" | "swatch" = "block"
) => {
  const c = (color || "gray") as TaskColor;
  if (variant === "dot") {
    const map: Record<TaskColor, string> = {
      gray: "bg-stone-400",
      yellow: "bg-amber-300",
      red: "bg-rose-400",
      blue: "bg-sky-400",
      green: "bg-emerald-400",
    };
    return map[c];
  }
  if (variant === "swatch") {
    const map: Record<TaskColor, string> = {
      gray: "bg-stone-300 border-stone-400",
      yellow: "bg-amber-200 border-amber-400",
      red: "bg-rose-300 border-rose-500",
      blue: "bg-sky-300 border-sky-500",
      green: "bg-emerald-300 border-emerald-500",
    };
    return map[c];
  }
  // block (calendar event)
  const map: Record<TaskColor, string> = {
    gray:   "bg-stone-200/70 hover:bg-stone-300/80 border-stone-400 text-stone-800 dark:bg-stone-700/60 dark:hover:bg-stone-700/80 dark:border-stone-500 dark:text-stone-100",
    yellow: "bg-amber-100 hover:bg-amber-200 border-amber-400 text-amber-900 dark:bg-amber-900/40 dark:hover:bg-amber-900/60 dark:border-amber-600 dark:text-amber-100",
    red:    "bg-rose-100 hover:bg-rose-200 border-rose-500 text-rose-900 dark:bg-rose-900/40 dark:hover:bg-rose-900/60 dark:border-rose-600 dark:text-rose-100",
    blue:   "bg-sky-100 hover:bg-sky-200 border-sky-500 text-sky-900 dark:bg-sky-900/40 dark:hover:bg-sky-900/60 dark:border-sky-600 dark:text-sky-100",
    green:  "bg-emerald-100 hover:bg-emerald-200 border-emerald-500 text-emerald-900 dark:bg-emerald-900/40 dark:hover:bg-emerald-900/60 dark:border-emerald-600 dark:text-emerald-100",
  };
  return map[c];
};
