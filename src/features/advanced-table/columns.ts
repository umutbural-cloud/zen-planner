import type { Task } from "@/hooks/useTasks";
import type { PomodoroCategory } from "@/hooks/usePomodoroCategories";
import type { AdvancedTaskColumn, AdvancedTaskColumnId } from "./types";

export const ADVANCED_TASK_COLUMNS: AdvancedTaskColumn[] = [
  { id: "title", label: "Başlık", type: "text", defaultVisible: true },
  { id: "status", label: "Durum", type: "status", defaultVisible: true },
  { id: "category", label: "Kategori", type: "category", defaultVisible: true },
  { id: "start", label: "Başlangıç", type: "date", defaultVisible: true },
  { id: "end", label: "Bitiş", type: "date", defaultVisible: true },
  { id: "completed_at", label: "Tamamlandı", type: "date", defaultVisible: false },
  { id: "hidden", label: "Gizli", type: "boolean", defaultVisible: false },
  { id: "kind", label: "Tür", type: "kind", defaultVisible: false },
  { id: "color", label: "Renk", type: "color", defaultVisible: false },
  { id: "subtasks", label: "Alt görev", type: "count", defaultVisible: true },
];

export const ADVANCED_TASK_COLUMN_IDS = ADVANCED_TASK_COLUMNS.map((column) => column.id);

export const DEFAULT_COLUMN_ORDER = ADVANCED_TASK_COLUMN_IDS;

export const REQUIRED_COLUMN_IDS: AdvancedTaskColumnId[] = ["title"];

export const DEFAULT_HIDDEN_COLUMN_IDS = ADVANCED_TASK_COLUMNS
  .filter((column) => !column.defaultVisible)
  .map((column) => column.id);

export const getColumn = (columnId: AdvancedTaskColumnId) =>
  ADVANCED_TASK_COLUMNS.find((column) => column.id === columnId);

export const isAdvancedTaskColumnId = (value: unknown): value is AdvancedTaskColumnId =>
  typeof value === "string" && ADVANCED_TASK_COLUMN_IDS.includes(value as AdvancedTaskColumnId);

export const formatDateTimeParts = (date: string | null, time: string | null) => {
  if (date && time) return `${date} ${time}`;
  if (date) return date;
  if (time) return time;
  return "—";
};

export const getTaskColumnValue = (
  task: Task,
  columnId: AdvancedTaskColumnId,
  categories: PomodoroCategory[],
  subtaskCount: number,
) => {
  switch (columnId) {
    case "title":
      return task.title;
    case "status":
      return task.status;
    case "category":
      return categories.find((category) => category.id === task.category_id)?.name || task.category_id || "";
    case "start":
      return formatDateTimeParts(task.start_date, task.start_time);
    case "end":
      return formatDateTimeParts(task.end_date, task.end_time);
    case "completed_at":
      return task.completed_at || "";
    case "hidden":
      return String(task.hidden);
    case "kind":
      return task.kind;
    case "color":
      return task.color;
    case "subtasks":
      return String(subtaskCount);
    default:
      return "";
  }
};
