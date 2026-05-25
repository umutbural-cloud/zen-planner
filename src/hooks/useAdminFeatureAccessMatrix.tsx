import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AdminFeatureAccessMatrixItem = {
  feature_key: string;
  label: string;
  description: string | null;
  category: string;
  route_path: string | null;
  is_active: boolean;
  is_core: boolean;
  backend_enforcement_required: boolean;
  content_risk: "none" | "low" | "medium" | "high";
  display_order: number;
  beginner_enabled: boolean;
  plus_enabled: boolean;
};

type AdminFeatureAccessMatrixResponse = {
  items: AdminFeatureAccessMatrixItem[];
};

type SupabaseRpcClient = typeof supabase & {
  rpc(fn: "admin_get_feature_access_matrix"): Promise<{ data: unknown; error: Error | null }>;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isContentRisk = (value: unknown): value is AdminFeatureAccessMatrixItem["content_risk"] =>
  value === "none" || value === "low" || value === "medium" || value === "high";

const parseMatrixItem = (value: unknown): AdminFeatureAccessMatrixItem | null => {
  if (!isRecord(value)) return null;

  if (
    typeof value.feature_key !== "string" ||
    typeof value.label !== "string" ||
    typeof value.category !== "string"
  ) {
    return null;
  }

  return {
    feature_key: value.feature_key,
    label: value.label,
    description: typeof value.description === "string" || value.description === null ? value.description : null,
    category: value.category,
    route_path: typeof value.route_path === "string" || value.route_path === null ? value.route_path : null,
    is_active: typeof value.is_active === "boolean" ? value.is_active : false,
    is_core: typeof value.is_core === "boolean" ? value.is_core : false,
    backend_enforcement_required:
      typeof value.backend_enforcement_required === "boolean" ? value.backend_enforcement_required : false,
    content_risk: isContentRisk(value.content_risk) ? value.content_risk : "low",
    display_order: typeof value.display_order === "number" ? value.display_order : 0,
    beginner_enabled: typeof value.beginner_enabled === "boolean" ? value.beginner_enabled : false,
    plus_enabled: typeof value.plus_enabled === "boolean" ? value.plus_enabled : false,
  };
};

const parseMatrixResponse = (data: unknown): AdminFeatureAccessMatrixResponse => {
  if (!isRecord(data)) {
    return { items: [] };
  }

  const { items } = data;

  if (!Array.isArray(items)) {
    return { items: [] };
  }

  return {
    items: items.flatMap((item) => {
      const parsed = parseMatrixItem(item);
      return parsed ? [parsed] : [];
    }),
  };
};

const mapAdminFeatureAccessErrorMessage = (error: Error) => {
  const message = (error.message || "").toLowerCase();

  if (message.includes("not_authenticated")) {
    return "Erişim matrisi alınamadı.";
  }

  if (message.includes("insufficient_privilege")) {
    return "Bu alan için yetkiniz yok.";
  }

  return "Erişim matrisi alınamadı.";
};

export const useAdminFeatureAccessMatrix = (enabled: boolean) => {
  const mountedRef = useRef(true);
  const requestIdRef = useRef(0);
  const [items, setItems] = useState<AdminFeatureAccessMatrixItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  const refetch = useCallback(async () => {
    setRefreshTick((current) => current + 1);
  }, []);

  useEffect(() => {
    if (!enabled) {
      requestIdRef.current += 1;
      setItems([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    const loadMatrix = async () => {
      setIsLoading(true);
      setError(null);

      const { data, error: rpcError } = await (supabase as SupabaseRpcClient).rpc("admin_get_feature_access_matrix");

      if (!mountedRef.current || requestIdRef.current !== requestId) return;

      if (rpcError) {
        setItems([]);
        setError(mapAdminFeatureAccessErrorMessage(rpcError));
        setIsLoading(false);
        return;
      }

      const parsed = parseMatrixResponse(data);
      setItems(parsed.items);
      setError(null);
      setIsLoading(false);
    };

    void loadMatrix();
  }, [enabled, refreshTick]);

  return {
    items,
    isLoading,
    error,
    refetch,
  };
};
