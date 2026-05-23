import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { AdminAccountStatusReasonCode, AdminAccountStatusTarget } from "@/components/admin/AdminAccountStatusActionModal";

type AdminSetUserStatusResponse = {
  success?: boolean;
  target_user_id?: string;
  account_status?: string;
  audit_id?: string;
  changed_at?: string;
};

type ChangeAccountStatusParams = {
  targetUserId: string;
  newStatus: AdminAccountStatusTarget;
  reasonCode: AdminAccountStatusReasonCode;
};

type SupabaseRpcClient = typeof supabase & {
  rpc(
    fn: "admin_set_user_status",
    args: {
      target_user_id: string;
      target_account_status: AdminAccountStatusTarget;
      reason_code: AdminAccountStatusReasonCode;
    },
  ): Promise<{ data: unknown; error: Error | null }>;
};

const mapAccountStatusError = (error: Error): string => {
  const message = error.message || "";
  const lowerMessage = message.toLowerCase();
  const code = (error as Error & { code?: string }).code;

  if (lowerMessage.includes("admin cannot change own account status")) {
    return "Kendi admin hesabınız için hesap durumu işlemi yapılamaz.";
  }

  if (lowerMessage.includes("admin accounts cannot be managed through member rpcs")) {
    return "Admin hesapları bu akıştan yönetilemez.";
  }

  if (lowerMessage.includes("unsupported account status")) {
    return "Seçilen hesap durumu geçerli değil.";
  }

  if (lowerMessage.includes("reason_code")) {
    return "Seçilen işlem nedeni geçerli değil.";
  }

  if (lowerMessage.includes("member profile or membership record not found") || lowerMessage.includes("member not found")) {
    return "Üye bilgisi güncel değil. Detayı yenileyip tekrar deneyin.";
  }

  if (code === "42501" || lowerMessage.includes("permission denied") || lowerMessage.includes("admin privileges required")) {
    return "Bu işlem için yetkiniz yok.";
  }

  if (
    lowerMessage.includes("failed to fetch") ||
    lowerMessage.includes("network") ||
    lowerMessage.includes("connection") ||
    lowerMessage.includes("fetch error")
  ) {
    return "Bağlantı sırasında hata oluştu. Tekrar deneyin.";
  }

  return "Hesap durumu güncellenemedi. Lütfen tekrar deneyin.";
};

const isSetUserStatusResponse = (value: unknown): value is AdminSetUserStatusResponse => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;

  const response = value as Record<string, unknown>;
  return typeof response.success === "boolean";
};

export const useAdminAccountStatusActions = () => {
  const mountedRef = useRef(true);
  const inFlightRef = useRef(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  const reset = useCallback(() => {
    if (!mountedRef.current) return;

    setError(null);
    setErrorMessage(null);
    setSuccess(false);
  }, []);

  const changeAccountStatus = useCallback(async ({ targetUserId, newStatus, reasonCode }: ChangeAccountStatusParams) => {
    if (inFlightRef.current) {
      return false;
    }

    inFlightRef.current = true;
    setLoading(true);
    setError(null);
    setErrorMessage(null);
    setSuccess(false);

    try {
      const { data, error: rpcError } = await (supabase as SupabaseRpcClient).rpc("admin_set_user_status", {
        target_user_id: targetUserId,
        target_account_status: newStatus,
        reason_code: reasonCode,
      });

      if (!mountedRef.current) return false;

      if (rpcError) {
        setError(rpcError);
        setErrorMessage(mapAccountStatusError(rpcError));
        setSuccess(false);
        return false;
      }

      if (!isSetUserStatusResponse(data) || data.success !== true) {
        const parseError = new Error("Account status response shape is invalid");
        setError(parseError);
        setErrorMessage("Hesap durumu güncellenemedi. Lütfen tekrar deneyin.");
        setSuccess(false);
        return false;
      }

      setSuccess(true);
      setError(null);
      setErrorMessage(null);
      return true;
    } catch (unknownError) {
      if (!mountedRef.current) return false;

      const normalizedError = unknownError instanceof Error ? unknownError : new Error("Account status change failed");
      setError(normalizedError);
      setErrorMessage(mapAccountStatusError(normalizedError));
      setSuccess(false);
      return false;
    } finally {
      inFlightRef.current = false;
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  return {
    changeAccountStatus,
    reset,
    loading,
    isChanging: loading,
    error,
    errorMessage,
    success,
  };
};
