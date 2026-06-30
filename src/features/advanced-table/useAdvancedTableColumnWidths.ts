import { useCallback, useEffect, useState } from "react";
import {
  clampColumnWidth,
  createDefaultColumnWidths,
  sanitizeColumnWidths,
  type AdvancedTaskColumnWidthMap,
} from "./columnSizing";
import type { AdvancedTaskColumnId } from "./types";

const STORAGE_VERSION = 1;

const getStorageKey = (projectId: string) => `zen:advanced-task-table:column-widths:v${STORAGE_VERSION}:${projectId}`;

export const useAdvancedTableColumnWidths = (projectId: string) => {
  const [columnWidths, setColumnWidths] = useState<AdvancedTaskColumnWidthMap>(() => createDefaultColumnWidths());

  useEffect(() => {
    if (typeof window === "undefined") {
      setColumnWidths(createDefaultColumnWidths());
      return;
    }

    try {
      const raw = window.localStorage.getItem(getStorageKey(projectId));
      if (!raw) {
        setColumnWidths(createDefaultColumnWidths());
        return;
      }

      setColumnWidths(sanitizeColumnWidths(JSON.parse(raw)));
    } catch {
      setColumnWidths(createDefaultColumnWidths());
    }
  }, [projectId]);

  const setColumnWidth = useCallback((columnId: AdvancedTaskColumnId, width: number) => {
    setColumnWidths((current) => ({
      ...current,
      [columnId]: clampColumnWidth(columnId, width),
    }));
  }, []);

  const persistColumnWidths = useCallback((nextWidths?: AdvancedTaskColumnWidthMap) => {
    if (typeof window === "undefined") return;

    const sanitized = sanitizeColumnWidths(nextWidths ?? columnWidths);
    window.localStorage.setItem(getStorageKey(projectId), JSON.stringify(sanitized));
  }, [columnWidths, projectId]);

  return {
    columnWidths,
    setColumnWidth,
    persistColumnWidths,
    isLoading: false,
  };
};
