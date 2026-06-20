import {
  DEFAULT_COLUMN_ORDER,
  DEFAULT_HIDDEN_COLUMN_IDS,
  isAdvancedTaskColumnId,
  REQUIRED_COLUMN_IDS,
} from "./columns";
import type { AdvancedTaskColumnId, CurrentTableConfig, TableFilter } from "./types";

const STORAGE_VERSION = 2;
const GROUPABLE_COLUMN_IDS: AdvancedTaskColumnId[] = ["status", "category"];

export const getAdvancedTaskTableKey = (projectId: string) => `zen:advanced-task-table:v1:${projectId}`;

export const createDefaultTableConfig = (): CurrentTableConfig => ({
  version: 2,
  columnOrder: [...DEFAULT_COLUMN_ORDER],
  hiddenColumnIds: [...DEFAULT_HIDDEN_COLUMN_IDS],
  groupBy: null,
  filters: [],
});

const normalizeColumnOrder = (value: unknown): AdvancedTaskColumnId[] => {
  if (!Array.isArray(value)) return [...DEFAULT_COLUMN_ORDER];
  const valid = value.filter(isAdvancedTaskColumnId);
  const missing = DEFAULT_COLUMN_ORDER.filter((columnId) => !valid.includes(columnId));
  return [...valid, ...missing];
};

const normalizeHiddenColumns = (value: unknown): AdvancedTaskColumnId[] => {
  if (!Array.isArray(value)) return [...DEFAULT_HIDDEN_COLUMN_IDS];
  return value
    .filter(isAdvancedTaskColumnId)
    .filter((columnId) => !REQUIRED_COLUMN_IDS.includes(columnId));
};

const normalizeFilters = (value: unknown): TableFilter[] => {
  if (!Array.isArray(value)) return createDefaultTableConfig().filters;
  return value.filter((filter): filter is TableFilter => {
    if (!filter || typeof filter !== "object") return false;
    const candidate = filter as Partial<TableFilter>;
    return (
      isAdvancedTaskColumnId(candidate.columnId) &&
      ["equals", "notEquals", "contains", "isEmpty", "isNotEmpty"].includes(candidate.operator || "")
    );
  });
};

export const normalizeTableConfig = (value: unknown): CurrentTableConfig => {
  if (!value || typeof value !== "object") return createDefaultTableConfig();
  const candidate = value as Partial<CurrentTableConfig>;
  if (candidate.version !== STORAGE_VERSION) return createDefaultTableConfig();
  return {
    version: STORAGE_VERSION,
    columnOrder: normalizeColumnOrder(candidate.columnOrder),
    hiddenColumnIds: normalizeHiddenColumns(candidate.hiddenColumnIds),
    groupBy: isAdvancedTaskColumnId(candidate.groupBy) && GROUPABLE_COLUMN_IDS.includes(candidate.groupBy) ? candidate.groupBy : null,
    filters: normalizeFilters(candidate.filters),
  };
};

export const loadTableConfig = (projectId: string): CurrentTableConfig => {
  if (typeof window === "undefined") return createDefaultTableConfig();
  try {
    const raw = window.localStorage.getItem(getAdvancedTaskTableKey(projectId));
    if (!raw) return createDefaultTableConfig();
    return normalizeTableConfig(JSON.parse(raw));
  } catch {
    return createDefaultTableConfig();
  }
};

export const saveTableConfig = (projectId: string, config: CurrentTableConfig) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(getAdvancedTaskTableKey(projectId), JSON.stringify(normalizeTableConfig(config)));
};

export const resetTableConfig = (projectId: string) => {
  saveTableConfig(projectId, createDefaultTableConfig());
};
