import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database, Json } from "@/integrations/supabase/types";
import { useAuth } from "@/hooks/useAuth";
import {
  clampColumnWidth,
  createDefaultColumnWidths,
  sanitizeColumnWidths,
  type AdvancedTaskColumnWidthMap,
} from "./columnSizing";
import type { AdvancedTaskColumnId } from "./types";

const ADVANCED_TABLE_KEY = "advanced_tasks";

const toJsonColumnWidths = (widths: AdvancedTaskColumnWidthMap): Json =>
  Object.fromEntries(Object.entries(widths)) as Json;

export const useAdvancedTableColumnWidths = () => {
  const { user, initialAuthResolved } = useAuth();
  const userId = user?.id ?? null;
  const [columnWidths, setColumnWidths] = useState<AdvancedTaskColumnWidthMap>(() => createDefaultColumnWidths());
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!initialAuthResolved) {
      setIsLoading(true);
      return;
    }

    if (!userId) {
      setColumnWidths(createDefaultColumnWidths());
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    void supabase
      .from("user_table_preferences")
      .select("column_widths")
      .eq("user_id", userId)
      .eq("table_key", ADVANCED_TABLE_KEY)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        setColumnWidths(sanitizeColumnWidths(data?.column_widths));
      })
      .catch(() => {
        if (!cancelled) setColumnWidths(createDefaultColumnWidths());
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [initialAuthResolved, userId]);

  const setColumnWidth = useCallback((columnId: AdvancedTaskColumnId, width: number) => {
    setColumnWidths((current) => ({
      ...current,
      [columnId]: clampColumnWidth(columnId, width),
    }));
  }, []);

  const persistColumnWidths = useCallback(async (nextWidths?: AdvancedTaskColumnWidthMap) => {
    if (!userId) return { error: null };

    const sanitized = sanitizeColumnWidths(nextWidths ?? columnWidths);
    const payload: Database["public"]["Tables"]["user_table_preferences"]["Insert"] = {
      user_id: userId,
      table_key: ADVANCED_TABLE_KEY,
      column_widths: toJsonColumnWidths(sanitized),
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("user_table_preferences")
      .upsert(payload, { onConflict: "user_id,table_key" });

    return { error };
  }, [columnWidths, userId]);

  return {
    columnWidths,
    setColumnWidth,
    persistColumnWidths,
    isLoading,
  };
};
