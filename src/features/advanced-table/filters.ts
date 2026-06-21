import type { Task } from "@/hooks/useTasks";
import type { PomodoroCategory } from "@/hooks/usePomodoroCategories";
import { getTaskColumnValue } from "./columns";
import type { TableFilter } from "./types";

const isEmptyValue = (value: string) => value.trim() === "" || value === "—";

export const applyTaskFilters = (
  tasks: Task[],
  filters: TableFilter[],
  categories: PomodoroCategory[],
) =>
  tasks.filter((task) =>
    filters.every((filter) => {
      const raw = getTaskColumnValue(task, filter.columnId, categories);
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
          return isEmptyValue(value);
        case "isNotEmpty":
          return !isEmptyValue(value);
        default:
          return true;
      }
    }),
  );
