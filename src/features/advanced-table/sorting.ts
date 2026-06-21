import type { Task } from "@/hooks/useTasks";
import type { PomodoroCategory } from "@/hooks/usePomodoroCategories";
import { formatTaskImportance, formatTaskUrgency } from "./columns";
import { formatTaskStatus } from "./statusLabels";
import type { AdvancedTaskColumnId, TableSort } from "./types";

type SortValue = {
  empty: boolean;
  value: string | number;
};

const textValue = (value: string | null | undefined): SortValue => {
  const text = String(value || "").trim();
  return { empty: !text, value: text };
};

const dateValue = (date: string | null, time: string | null): SortValue => {
  if (!date) return { empty: true, value: 0 };
  const stamp = new Date(`${date}T${time || "00:00"}`).getTime();
  if (!Number.isFinite(stamp)) return { empty: true, value: 0 };
  return { empty: false, value: stamp };
};

const valueForColumn = (
  task: Task,
  columnId: AdvancedTaskColumnId,
  categories: PomodoroCategory[],
): SortValue => {
  switch (columnId) {
    case "title":
      return textValue(task.title);
    case "status":
      return textValue(formatTaskStatus(task.status));
    case "category":
      return textValue(categories.find((category) => category.id === task.category_id)?.name || "");
    case "start":
      return dateValue(task.start_date, task.start_time);
    case "end":
      return dateValue(task.end_date, task.end_time);
    case "urgency":
      if (!task.urgency) return { empty: true, value: "" };
      return textValue(formatTaskUrgency(task.urgency));
    case "importance":
      if (!task.importance) return { empty: true, value: "" };
      return textValue(formatTaskImportance(task.importance));
    default:
      return { empty: true, value: "" };
  }
};

export const applyTaskSort = (
  tasks: Task[],
  sort: TableSort | null,
  categories: PomodoroCategory[],
) => {
  if (!sort) return tasks;

  return [...tasks].sort((a, b) => {
    const aValue = valueForColumn(a, sort.columnId, categories);
    const bValue = valueForColumn(b, sort.columnId, categories);

    if (aValue.empty && bValue.empty) return 0;
    if (aValue.empty) return 1;
    if (bValue.empty) return -1;

    const direction = sort.direction === "asc" ? 1 : -1;
    if (typeof aValue.value === "number" && typeof bValue.value === "number") {
      return (aValue.value - bValue.value) * direction;
    }

    return String(aValue.value).localeCompare(String(bValue.value), "tr") * direction;
  });
};
