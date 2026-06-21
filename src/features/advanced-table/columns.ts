import type { Task, TaskImportance, TaskUrgency } from "@/hooks/useTasks";
import type { PomodoroCategory } from "@/hooks/usePomodoroCategories";
import type { AdvancedTaskColumn, AdvancedTaskColumnId } from "./types";

export const ADVANCED_TASK_COLUMNS: AdvancedTaskColumn[] = [
  { id: "title", label: "Başlık", type: "text", defaultVisible: true },
  { id: "status", label: "Durum", type: "status", defaultVisible: true },
  { id: "category", label: "Kategori", type: "category", defaultVisible: true },
  { id: "start", label: "Başlangıç", type: "date", defaultVisible: true },
  { id: "end", label: "Bitiş", type: "date", defaultVisible: true },
  { id: "urgency", label: "Aciliyet", type: "choice", defaultVisible: true },
  { id: "importance", label: "Önem", type: "choice", defaultVisible: true },
];

export const ADVANCED_TASK_COLUMN_IDS = ADVANCED_TASK_COLUMNS.map((column) => column.id);

export const DEFAULT_COLUMN_ORDER = ADVANCED_TASK_COLUMN_IDS;

export const REQUIRED_COLUMN_IDS: AdvancedTaskColumnId[] = ["title"];

export const GROUPABLE_COLUMN_IDS: AdvancedTaskColumnId[] = ["status", "category", "urgency", "importance"];

export const DEFAULT_HIDDEN_COLUMN_IDS = ADVANCED_TASK_COLUMNS
  .filter((column) => !column.defaultVisible)
  .map((column) => column.id);

export const getColumn = (columnId: AdvancedTaskColumnId) =>
  ADVANCED_TASK_COLUMNS.find((column) => column.id === columnId);

export const getColumnLabel = (columnId: AdvancedTaskColumnId) =>
  getColumn(columnId)?.label || columnId;

export const isAdvancedTaskColumnId = (value: unknown): value is AdvancedTaskColumnId =>
  typeof value === "string" && ADVANCED_TASK_COLUMN_IDS.includes(value as AdvancedTaskColumnId);

export const isGroupableColumnId = (value: AdvancedTaskColumnId) =>
  GROUPABLE_COLUMN_IDS.includes(value);

export const formatDateTimeParts = (date: string | null, time: string | null) => {
  if (date && time) return `${date} ${time}`;
  if (date) return date;
  if (time) return time;
  return "—";
};

export const formatTaskUrgency = (value: TaskUrgency) =>
  value === "urgent" ? "Acil" : value === "not_urgent" ? "Acil Değil" : "-";

export const formatTaskImportance = (value: TaskImportance) =>
  value === "important" ? "Önemli" : value === "not_important" ? "Önemli Değil" : "-";

export const getTaskColumnValue = (
  task: Task,
  columnId: AdvancedTaskColumnId,
  categories: PomodoroCategory[],
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
    case "urgency":
      return task.urgency;
    case "importance":
      return task.importance;
    default:
      return "";
  }
};
