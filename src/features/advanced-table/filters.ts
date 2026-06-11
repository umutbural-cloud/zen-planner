import type { Task } from "@/hooks/useTasks";
import type { PomodoroCategory } from "@/hooks/usePomodoroCategories";
import { getTaskColumnValue } from "./columns";
import type { TableFilter } from "./types";

export const applyTaskFilters = (
  tasks: Task[],
  filters: TableFilter[],
  categories: PomodoroCategory[],
  subtaskCountOf: (taskId: string) => number,
) =>
  tasks.filter((task) =>
    filters.every((filter) => {
      const raw = getTaskColumnValue(task, filter.columnId, categories, subtaskCountOf(task.id));
      const value = String(raw ?? "");
      const expected = String(filter.value ?? "");

      switch (filter.operator) {
        case "equals":
          return value === expected;
        case "notEquals":
          return value !== expected;
        case "contains":
          return value.toLocaleLowerCase("tr").includes(expected.toLocaleLowerCase("tr"));
        case "isEmpty":
          return value.trim() === "";
        case "isNotEmpty":
          return value.trim() !== "";
        default:
          return true;
      }
    }),
  );
