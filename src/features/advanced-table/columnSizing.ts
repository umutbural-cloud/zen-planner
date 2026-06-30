import { ADVANCED_TASK_COLUMNS, isAdvancedTaskColumnId } from "./columns";
import type { AdvancedTaskColumnId } from "./types";

export type AdvancedTaskColumnWidthMap = Record<AdvancedTaskColumnId, number>;

export type AdvancedTaskColumnSizing = {
  defaultWidth: number;
  minWidth: number;
  maxWidth: number;
};

export const ADVANCED_TASK_COLUMN_SIZING: Record<AdvancedTaskColumnId, AdvancedTaskColumnSizing> = {
  title: { defaultWidth: 360, minWidth: 240, maxWidth: 720 },
  status: { defaultWidth: 140, minWidth: 110, maxWidth: 220 },
  category: { defaultWidth: 180, minWidth: 130, maxWidth: 320 },
  start: { defaultWidth: 220, minWidth: 180, maxWidth: 320 },
  end: { defaultWidth: 220, minWidth: 180, maxWidth: 320 },
  urgency: { defaultWidth: 140, minWidth: 110, maxWidth: 220 },
  importance: { defaultWidth: 140, minWidth: 110, maxWidth: 220 },
};

export const createDefaultColumnWidths = (): AdvancedTaskColumnWidthMap =>
  ADVANCED_TASK_COLUMNS.reduce((acc, column) => {
    acc[column.id] = ADVANCED_TASK_COLUMN_SIZING[column.id].defaultWidth;
    return acc;
  }, {} as AdvancedTaskColumnWidthMap);

export const clampColumnWidth = (columnId: AdvancedTaskColumnId, width: number) => {
  const sizing = ADVANCED_TASK_COLUMN_SIZING[columnId];
  if (!Number.isFinite(width)) return sizing.defaultWidth;
  return Math.min(sizing.maxWidth, Math.max(sizing.minWidth, Math.round(width)));
};

export const sanitizeColumnWidths = (value: unknown): AdvancedTaskColumnWidthMap => {
  const next = createDefaultColumnWidths();
  if (!value || typeof value !== "object" || Array.isArray(value)) return next;

  Object.entries(value as Record<string, unknown>).forEach(([columnId, width]) => {
    if (!isAdvancedTaskColumnId(columnId) || typeof width !== "number") return;
    next[columnId] = clampColumnWidth(columnId, width);
  });

  return next;
};
