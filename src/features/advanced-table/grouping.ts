import type { Task } from "@/hooks/useTasks";
import type { PomodoroCategory } from "@/hooks/usePomodoroCategories";
import { colorHex } from "@/hooks/useHabitCategories";
import { getColumn, getTaskColumnValue } from "./columns";
import { formatTaskStatus } from "./statusLabels";
import type { AdvancedTaskColumnId } from "./types";

export type AdvancedTaskGroup = {
  key: string;
  label: string;
  count: number;
  color?: string;
  rows: Task[];
};

const emptyLabelOf = (columnId: AdvancedTaskColumnId) => (columnId === "category" ? "Kategorisiz" : "Boş");

const labelOf = (key: string, groupBy: AdvancedTaskColumnId, categories: PomodoroCategory[]) => {
  if (key === "__empty__") return emptyLabelOf(groupBy);
  if (groupBy === "status") return formatTaskStatus(key);
  if (groupBy === "hidden") return key === "true" ? "Gizli" : "Görünür";
  if (groupBy === "kind") return key === "timebox" ? "Timebox" : "Görev";
  if (groupBy === "category") return categories.find((item) => item.name === key)?.name || key;
  return key;
};

export const groupTasks = (
  rows: Task[],
  groupBy: AdvancedTaskColumnId | null,
  categories: PomodoroCategory[],
  subtaskCountOf: (taskId: string) => number,
): AdvancedTaskGroup[] => {
  if (!groupBy) {
    return [{ key: "all", label: "Görevler", count: rows.length, rows }];
  }

  const groups = new Map<string, Task[]>();
  rows.forEach((row) => {
    const value = getTaskColumnValue(row, groupBy, categories, subtaskCountOf(row.id));
    const key = String(value || "__empty__");
    groups.set(key, [...(groups.get(key) || []), row]);
  });

  return [...groups.entries()].map(([key, groupRows]) => {
    const category = groupBy === "category" ? categories.find((item) => item.name === key) : undefined;
    const column = getColumn(groupBy);
    const label = labelOf(key, groupBy, categories);
    return {
      key,
      label: column ? `${column.label}: ${label}` : label,
      count: groupRows.length,
      color: category ? colorHex(category.color) : undefined,
      rows: groupRows,
    };
  });
};
